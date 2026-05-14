/**
 * Tests for the team realtime manager.
 *
 * The manager subscribes to Supabase Postgres Changes for the active workspace and
 * forwards a coalesced `team:dataUpdated` event to trusted windows.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const safeSendMock = vi.fn();
const getTeamConfigMock = vi.fn();
const getAuthClientMock = vi.fn();

vi.mock("../ipc-safe-send", () => ({
  safeWebContentsSend: (...args: unknown[]) => safeSendMock(...args)
}));

vi.mock("./config", () => ({
  getTeamConfig: () => getTeamConfigMock()
}));

vi.mock("./supabaseClient", () => ({
  getAuthenticatedSupabaseClient: () => getAuthClientMock()
}));

import {
  configureTeamRealtime,
  startTeamRealtime,
  stopTeamRealtime,
  removeTeamRealtimeRequester,
  refreshTeamRealtime,
  __resetTeamRealtimeForTests
} from "./realtime";

type Handler = (payload: unknown) => void;

type FakeChannel = {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  __handlers: Record<string, Handler>;
  __filters: Array<{ table: string; filter: string }>;
};

function makeFakeClient() {
  const channels: FakeChannel[] = [];
  const channel = (_name: string): FakeChannel => {
    const handlersByTable: Record<string, Handler> = {};
    const filters: Array<{ table: string; filter: string }> = [];
    const ch: FakeChannel = {
      on: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn().mockResolvedValue("ok"),
      __handlers: handlersByTable,
      __filters: filters
    };
    ch.on.mockImplementation((_event: string, opts: { table: string; filter: string }, cb: Handler) => {
      handlersByTable[opts.table] = cb;
      filters.push({ table: opts.table, filter: opts.filter });
      return ch;
    });
    ch.subscribe.mockReturnValue(ch);
    channels.push(ch);
    return ch;
  };
  const removeChannel = vi.fn().mockResolvedValue("ok");
  return {
    client: { channel: vi.fn(channel), removeChannel } as unknown as {
      channel: ReturnType<typeof vi.fn>;
      removeChannel: ReturnType<typeof vi.fn>;
    },
    channels,
    removeChannel
  };
}

const makeFakeWindow = () => ({
  isDestroyed: () => false,
  webContents: { isDestroyed: () => false }
});

describe("team realtime manager", () => {
  let originalSetTimeout: typeof setTimeout;

  beforeEach(() => {
    __resetTeamRealtimeForTests();
    safeSendMock.mockReset();
    getTeamConfigMock.mockReset();
    getAuthClientMock.mockReset();
    originalSetTimeout = global.setTimeout;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.setTimeout = originalSetTimeout;
    __resetTeamRealtimeForTests();
  });

  it("starts a subscription only when team config and active workspace exist", async () => {
    getTeamConfigMock.mockReturnValue({ configured: false, displayName: "", activeWorkspaceId: null });
    await expect(startTeamRealtime(1)).rejects.toThrow("Team mode is not configured");

    getTeamConfigMock.mockReturnValue({ configured: true, displayName: "Alice", activeWorkspaceId: null });
    await expect(startTeamRealtime(1)).rejects.toThrow("No active workspace selected");

    expect(getAuthClientMock).not.toHaveBeenCalled();
  });

  it("uses one channel per active workspace and filters both tables by workspace ID", async () => {
    const { client, channels } = makeFakeClient();
    getAuthClientMock.mockResolvedValue({ client, userId: "user-1" });
    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-1"
    });

    await startTeamRealtime(1);

    expect(client.channel).toHaveBeenCalledTimes(1);
    expect(client.channel).toHaveBeenCalledWith("team-workspace-ws-1");
    expect(channels[0]!.__filters).toEqual(
      expect.arrayContaining([
        { table: "team_projects", filter: "workspace_id=eq.ws-1" },
        { table: "team_project_tasks", filter: "workspace_id=eq.ws-1" }
      ])
    );
    expect(channels[0]!.subscribe).toHaveBeenCalled();
  });

  it("sends one debounced team:dataUpdated to trusted windows for project and task changes", async () => {
    const { client, channels } = makeFakeClient();
    getAuthClientMock.mockResolvedValue({ client, userId: "user-1" });
    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-1"
    });

    const win = makeFakeWindow();
    configureTeamRealtime(() => [win as unknown as Electron.BrowserWindow]);

    await startTeamRealtime(1);

    // Simulate two changes within the debounce window.
    channels[0]!.__handlers["team_projects"]!({});
    channels[0]!.__handlers["team_project_tasks"]!({});

    expect(safeSendMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(safeSendMock).toHaveBeenCalledTimes(1);
    expect(safeSendMock).toHaveBeenCalledWith(
      win.webContents,
      "team:dataUpdated",
      expect.objectContaining({
        workspaceId: "ws-1",
        tables: expect.arrayContaining(["projects", "tasks"])
      })
    );
  });

  it("calls removeChannel when stopped", async () => {
    const { client, channels, removeChannel } = makeFakeClient();
    getAuthClientMock.mockResolvedValue({ client, userId: "user-1" });
    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-1"
    });

    await startTeamRealtime(1);
    await stopTeamRealtime(1);

    expect(removeChannel).toHaveBeenCalledWith(channels[0]);
  });

  it("replaces the channel when switching workspaces", async () => {
    const { client, channels, removeChannel } = makeFakeClient();
    getAuthClientMock.mockResolvedValue({ client, userId: "user-1" });

    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-1"
    });
    await startTeamRealtime(1);

    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-2"
    });
    await refreshTeamRealtime();

    expect(removeChannel).toHaveBeenCalledWith(channels[0]);
    expect(client.channel).toHaveBeenCalledWith("team-workspace-ws-2");
    expect(channels.length).toBe(2);
  });

  it("stops on refresh when active workspace is cleared", async () => {
    const { client, channels, removeChannel } = makeFakeClient();
    getAuthClientMock.mockResolvedValue({ client, userId: "user-1" });

    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-1"
    });
    await startTeamRealtime(1);

    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: null
    });
    await refreshTeamRealtime();

    expect(removeChannel).toHaveBeenCalledWith(channels[0]);
  });

  it("ignores events for a previous workspace after switching", async () => {
    const { client, channels } = makeFakeClient();
    getAuthClientMock.mockResolvedValue({ client, userId: "user-1" });

    const win = makeFakeWindow();
    configureTeamRealtime(() => [win as unknown as Electron.BrowserWindow]);

    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-1"
    });
    await startTeamRealtime(1);

    const oldHandler = channels[0]!.__handlers["team_projects"]!;

    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-2"
    });
    await refreshTeamRealtime();

    // A late event from the old channel must not produce a push for ws-2.
    oldHandler!({});
    vi.advanceTimersByTime(300);

    expect(safeSendMock).not.toHaveBeenCalled();
  });

  it("two senders can start realtime, one stop does not remove the channel", async () => {
    const { client, channels, removeChannel } = makeFakeClient();
    getAuthClientMock.mockResolvedValue({ client, userId: "user-1" });
    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-1"
    });

    await startTeamRealtime(1);
    await startTeamRealtime(2);
    await stopTeamRealtime(1);

    // Channel should still be active since sender 2 is still requesting
    expect(removeChannel).not.toHaveBeenCalled();
    expect(channels.length).toBe(1);
  });

  it("stopping the last sender removes the channel", async () => {
    const { client, channels, removeChannel } = makeFakeClient();
    getAuthClientMock.mockResolvedValue({ client, userId: "user-1" });
    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-1"
    });

    await startTeamRealtime(1);
    await startTeamRealtime(2);
    await stopTeamRealtime(1);
    await stopTeamRealtime(2);

    // Channel should be removed when last requester stops
    expect(removeChannel).toHaveBeenCalledWith(channels[0]);
  });

  it("removing a sender when destroyed removes it from requester set", async () => {
    const { client, removeChannel } = makeFakeClient();
    getAuthClientMock.mockResolvedValue({ client, userId: "user-1" });
    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-1"
    });

    await startTeamRealtime(1);
    await startTeamRealtime(2);
    removeTeamRealtimeRequester(1);

    // Channel should still be active since sender 2 is still requesting
    expect(removeChannel).not.toHaveBeenCalled();
  });

  it("removing the last requester when destroyed removes the channel", async () => {
    const { client, channels, removeChannel } = makeFakeClient();
    getAuthClientMock.mockResolvedValue({ client, userId: "user-1" });
    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-1"
    });

    await startTeamRealtime(1);
    removeTeamRealtimeRequester(1);

    // Channel should be removed when last requester is destroyed
    expect(removeChannel).toHaveBeenCalledWith(channels[0]);
  });

  it("clearing config stops the channel and clears requesters", async () => {
    const { client, channels, removeChannel } = makeFakeClient();
    getAuthClientMock.mockResolvedValue({ client, userId: "user-1" });
    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-1"
    });

    await startTeamRealtime(1);
    await startTeamRealtime(2);

    getTeamConfigMock.mockReturnValue({
      configured: false,
      displayName: "",
      activeWorkspaceId: null
    });
    await refreshTeamRealtime();

    // Channel should be removed and requesters cleared
    expect(removeChannel).toHaveBeenCalledWith(channels[0]);
  });

  it("workspace switch replaces the channel while requesters exist", async () => {
    const { client, channels, removeChannel } = makeFakeClient();
    getAuthClientMock.mockResolvedValue({ client, userId: "user-1" });

    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-1"
    });
    await startTeamRealtime(1);
    await startTeamRealtime(2);

    getTeamConfigMock.mockReturnValue({
      configured: true,
      displayName: "Alice",
      activeWorkspaceId: "ws-2"
    });
    await refreshTeamRealtime();

    // Channel should be replaced and requesters should be cleared (will re-add on next start)
    expect(removeChannel).toHaveBeenCalledWith(channels[0]);
    expect(client.channel).toHaveBeenCalledWith("team-workspace-ws-2");
  });
});
