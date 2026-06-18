/**
 * Tests for teamRealtimeSubscription pure helper.
 * Tests the subscription logic without React to avoid concurrent work issues.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startTeamRealtimeSubscription } from "./teamRealtimeSubscription";

describe("teamRealtimeSubscription", () => {
  let mockRefreshProjects: ReturnType<typeof vi.fn>;
  let mockRefreshTasks: ReturnType<typeof vi.fn>;
  let mockStartRealtime: ReturnType<typeof vi.fn>;
  let mockStopRealtime: ReturnType<typeof vi.fn>;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;
  let capturedListener: ((event: unknown, payload: { workspaceId: string; tables: string[] }) => void) | null = null;
  let mockOnTeamDataUpdated: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshProjects = vi.fn().mockResolvedValue(undefined);
    mockRefreshTasks = vi.fn().mockResolvedValue(undefined);
    mockStartRealtime = vi.fn().mockResolvedValue(undefined);
    mockStopRealtime = vi.fn().mockResolvedValue(undefined);
    mockUnsubscribe = vi.fn();
    capturedListener = null;
    mockOnTeamDataUpdated = vi.fn(
      (cb: (event: unknown, payload: { workspaceId: string; tables: string[] }) => void) => {
        capturedListener = cb;
        return mockUnsubscribe;
      }
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("no active workspace returns a no-op cleanup and does not start realtime", () => {
    const cleanup = startTeamRealtimeSubscription({
      activeWorkspaceId: null,
      refreshProjects: mockRefreshProjects,
      refreshTasks: mockRefreshTasks,
      startRealtime: mockStartRealtime,
      stopRealtime: mockStopRealtime,
      onTeamDataUpdated: mockOnTeamDataUpdated,
      refreshProjectsEnabled: true,
      refreshTasksEnabled: true
    });

    expect(mockStartRealtime).not.toHaveBeenCalled();
    expect(mockOnTeamDataUpdated).not.toHaveBeenCalled();

    cleanup();

    expect(mockStopRealtime).not.toHaveBeenCalled();
  });

  it("active workspace starts realtime and registers one listener", () => {
    const _cleanup = startTeamRealtimeSubscription({
      activeWorkspaceId: "ws-1",
      refreshProjects: mockRefreshProjects,
      refreshTasks: mockRefreshTasks,
      startRealtime: mockStartRealtime,
      stopRealtime: mockStopRealtime,
      onTeamDataUpdated: mockOnTeamDataUpdated,
      refreshProjectsEnabled: true,
      refreshTasksEnabled: true
    });

    expect(mockStartRealtime).toHaveBeenCalled();
    expect(mockOnTeamDataUpdated).toHaveBeenCalled();
    expect(capturedListener).not.toBeNull();
  });

  it("other workspace events are ignored", () => {
    vi.useFakeTimers();
    try {
      startTeamRealtimeSubscription({
        activeWorkspaceId: "ws-1",
        refreshProjects: mockRefreshProjects,
        refreshTasks: mockRefreshTasks,
        startRealtime: mockStartRealtime,
        stopRealtime: mockStopRealtime,
        onTeamDataUpdated: mockOnTeamDataUpdated,
        refreshProjectsEnabled: true,
        refreshTasksEnabled: true
      });

      const initialRefreshProjects = mockRefreshProjects.mock.calls.length;
      const initialRefreshTasks = mockRefreshTasks.mock.calls.length;

      capturedListener?.(new Event("update"), { workspaceId: "ws-2", tables: ["projects", "tasks"] });
      vi.advanceTimersByTime(200);

      expect(mockRefreshProjects.mock.calls.length).toBe(initialRefreshProjects);
      expect(mockRefreshTasks.mock.calls.length).toBe(initialRefreshTasks);
    } finally {
      vi.useRealTimers();
    }
  });

  it("task events debounce and call only task refresh", () => {
    vi.useFakeTimers();
    try {
      startTeamRealtimeSubscription({
        activeWorkspaceId: "ws-1",
        refreshProjects: mockRefreshProjects,
        refreshTasks: mockRefreshTasks,
        startRealtime: mockStartRealtime,
        stopRealtime: mockStopRealtime,
        onTeamDataUpdated: mockOnTeamDataUpdated,
        refreshProjectsEnabled: false,
        refreshTasksEnabled: true
      });

      const initialRefreshTasks = mockRefreshTasks.mock.calls.length;

      capturedListener?.(new Event("update"), { workspaceId: "ws-1", tables: ["tasks"] });

      // Should not refresh immediately
      expect(mockRefreshTasks.mock.calls.length).toBe(initialRefreshTasks);

      vi.advanceTimersByTime(200);

      expect(mockRefreshTasks.mock.calls.length).toBe(initialRefreshTasks + 1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("project events debounce and call only project refresh", () => {
    vi.useFakeTimers();
    try {
      startTeamRealtimeSubscription({
        activeWorkspaceId: "ws-1",
        refreshProjects: mockRefreshProjects,
        refreshTasks: mockRefreshTasks,
        startRealtime: mockStartRealtime,
        stopRealtime: mockStopRealtime,
        onTeamDataUpdated: mockOnTeamDataUpdated,
        refreshProjectsEnabled: true,
        refreshTasksEnabled: false
      });

      const initialRefreshProjects = mockRefreshProjects.mock.calls.length;

      capturedListener?.(new Event("update"), { workspaceId: "ws-1", tables: ["projects"] });

      // Should not refresh immediately
      expect(mockRefreshProjects.mock.calls.length).toBe(initialRefreshProjects);

      vi.advanceTimersByTime(200);

      expect(mockRefreshProjects.mock.calls.length).toBe(initialRefreshProjects + 1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("combined events during the debounce window call both refresh functions once", () => {
    vi.useFakeTimers();
    try {
      startTeamRealtimeSubscription({
        activeWorkspaceId: "ws-1",
        refreshProjects: mockRefreshProjects,
        refreshTasks: mockRefreshTasks,
        startRealtime: mockStartRealtime,
        stopRealtime: mockStopRealtime,
        onTeamDataUpdated: mockOnTeamDataUpdated,
        refreshProjectsEnabled: true,
        refreshTasksEnabled: true
      });

      const initialRefreshProjects = mockRefreshProjects.mock.calls.length;
      const initialRefreshTasks = mockRefreshTasks.mock.calls.length;

      capturedListener?.(new Event("update"), { workspaceId: "ws-1", tables: ["projects"] });
      capturedListener?.(new Event("update"), { workspaceId: "ws-1", tables: ["tasks"] });
      vi.advanceTimersByTime(200);

      expect(mockRefreshProjects.mock.calls.length).toBe(initialRefreshProjects + 1);
      expect(mockRefreshTasks.mock.calls.length).toBe(initialRefreshTasks + 1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cleanup unsubscribes, clears timers, and stops realtime", () => {
    vi.useFakeTimers();
    try {
      const _cleanup = startTeamRealtimeSubscription({
        activeWorkspaceId: "ws-1",
        refreshProjects: mockRefreshProjects,
        refreshTasks: mockRefreshTasks,
        startRealtime: mockStartRealtime,
        stopRealtime: mockStopRealtime,
        onTeamDataUpdated: mockOnTeamDataUpdated,
        refreshProjectsEnabled: true,
        refreshTasksEnabled: true
      });

      _cleanup();

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockStopRealtime).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("start rejection stays best-effort and does not throw", () => {
    mockStartRealtime.mockRejectedValue(new Error("Start failed"));

    expect(() => {
      startTeamRealtimeSubscription({
        activeWorkspaceId: "ws-1",
        refreshProjects: mockRefreshProjects,
        refreshTasks: mockRefreshTasks,
        startRealtime: mockStartRealtime,
        stopRealtime: mockStopRealtime,
        onTeamDataUpdated: mockOnTeamDataUpdated,
        refreshProjectsEnabled: true,
        refreshTasksEnabled: true
      });
    }).not.toThrow();

    expect(mockStartRealtime).toHaveBeenCalled();
  });

  it("stop rejection stays best-effort and does not throw", () => {
    mockStopRealtime.mockRejectedValue(new Error("Stop failed"));

    const cleanup = startTeamRealtimeSubscription({
      activeWorkspaceId: "ws-1",
      refreshProjects: mockRefreshProjects,
      refreshTasks: mockRefreshTasks,
      startRealtime: mockStartRealtime,
      stopRealtime: mockStopRealtime,
      onTeamDataUpdated: mockOnTeamDataUpdated,
      refreshProjectsEnabled: true,
      refreshTasksEnabled: true
    });

    expect(() => {
      cleanup();
    }).not.toThrow();

    expect(mockStopRealtime).toHaveBeenCalled();
  });
});
