import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConnectedAccountsPanel } from "./ConnectedAccountsPanel";

const listConnectedCalendarAccounts = vi.fn();
const getConnectedCalendarAccountsSummary = vi.fn();
const getConnectedCalendarOAuthSetup = vi.fn();
const startConnectedCalendarOAuth = vi.fn();
const completeConnectedCalendarOAuth = vi.fn();
const syncConnectedCalendarAccount = vi.fn();
const syncAllConnectedCalendarAccounts = vi.fn();
const disconnectConnectedCalendarAccount = vi.fn();

vi.mock("../../lib/assistantApi", () => ({
  requireAssistantApi: () => ({
    listConnectedCalendarAccounts,
    getConnectedCalendarAccountsSummary,
    getConnectedCalendarOAuthSetup,
    startConnectedCalendarOAuth,
    completeConnectedCalendarOAuth,
    syncConnectedCalendarAccount,
    syncAllConnectedCalendarAccounts,
    disconnectConnectedCalendarAccount
  })
}));

describe("ConnectedAccountsPanel", () => {
  const onClose = vi.fn();
  const onError = vi.fn();
  const onSuccess = vi.fn();
  const onAccountsChanged = vi.fn(async () => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    listConnectedCalendarAccounts.mockResolvedValue([]);
    getConnectedCalendarAccountsSummary.mockResolvedValue({ total: 0, synced: 0, error: 0 });
    getConnectedCalendarOAuthSetup.mockResolvedValue({ googleConfigured: true, microsoftConfigured: true });
    startConnectedCalendarOAuth.mockResolvedValue(undefined);
    completeConnectedCalendarOAuth.mockResolvedValue({
      id: "acc-1",
      provider: "google",
      accountLabel: "test@gmail.com",
      email: "test@gmail.com",
      enabledFeatures: '["calendar"]',
      syncState: "synced",
      lastSyncAt: null,
      syncError: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z"
    });
    syncConnectedCalendarAccount.mockResolvedValue({
      id: "acc-1",
      provider: "google",
      accountLabel: "test@gmail.com",
      email: "test@gmail.com",
      enabledFeatures: '["calendar"]',
      syncState: "synced",
      lastSyncAt: "2026-06-01T00:00:00Z",
      syncError: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z"
    });
    syncAllConnectedCalendarAccounts.mockResolvedValue([]);
    disconnectConnectedCalendarAccount.mockResolvedValue(undefined);
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("renders empty state connect buttons", async () => {
    render(
      <ConnectedAccountsPanel onClose={onClose} onError={onError} onSuccess={onSuccess} onAccountsChanged={onAccountsChanged} />
    );
    expect(await screen.findByText(/No connected calendars yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connect Google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connect Outlook \/ Microsoft 365/i })).toBeInTheDocument();
    expect(screen.getByText(/Teams meetings from your Microsoft account/i)).toBeInTheDocument();
  });

  it("renders existing accounts with provider and sync state", async () => {
    listConnectedCalendarAccounts.mockResolvedValue([
      {
        id: "acc-1",
        provider: "google",
        accountLabel: "Test",
        email: "test@gmail.com",
        enabledFeatures: '["calendar"]',
        syncState: "synced",
        lastSyncAt: "2026-05-01T12:00:00Z",
        syncError: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z"
      }
    ]);
    getConnectedCalendarAccountsSummary.mockResolvedValue({ total: 1, synced: 1, error: 0 });

    render(
      <ConnectedAccountsPanel onClose={onClose} onError={onError} onSuccess={onSuccess} onAccountsChanged={onAccountsChanged} />
    );

    expect(await screen.findByText("test@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
    expect(screen.getByText("Synced")).toBeInTheDocument();
  });

  it("starts and completes OAuth flow", async () => {
    const user = userEvent.setup();
    render(
      <ConnectedAccountsPanel onClose={onClose} onError={onError} onSuccess={onSuccess} onAccountsChanged={onAccountsChanged} />
    );

    await user.click(await screen.findByRole("button", { name: /Connect Google/i }));
    expect(startConnectedCalendarOAuth).toHaveBeenCalledWith({ provider: "google" });
    await user.click(screen.getByRole("button", { name: /Complete sign-in/i }));
    await waitFor(() => {
      expect(completeConnectedCalendarOAuth).toHaveBeenCalledWith({ provider: "google" });
    });
    expect(onAccountsChanged).toHaveBeenCalled();
  });

  it("syncs one account and sync all", async () => {
    const user = userEvent.setup();
    listConnectedCalendarAccounts.mockResolvedValue([
      {
        id: "acc-1",
        provider: "microsoft",
        accountLabel: "Test",
        email: "test@contoso.com",
        enabledFeatures: '["calendar"]',
        syncState: "error",
        lastSyncAt: null,
        syncError: "401",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z"
      }
    ]);
    getConnectedCalendarAccountsSummary.mockResolvedValue({ total: 1, synced: 0, error: 1 });

    render(
      <ConnectedAccountsPanel onClose={onClose} onError={onError} onSuccess={onSuccess} onAccountsChanged={onAccountsChanged} />
    );

    await user.click(await screen.findByRole("button", { name: /^Sync$/i }));
    expect(syncConnectedCalendarAccount).toHaveBeenCalledWith({ accountId: "acc-1" });

    await user.click(screen.getByRole("button", { name: /Sync all/i }));
    expect(syncAllConnectedCalendarAccounts).toHaveBeenCalled();
  });

  it("disconnect confirms and refreshes list", async () => {
    const user = userEvent.setup();
    listConnectedCalendarAccounts.mockResolvedValue([
      {
        id: "acc-1",
        provider: "google",
        accountLabel: "Test",
        email: "test@gmail.com",
        enabledFeatures: '["calendar"]',
        syncState: "synced",
        lastSyncAt: null,
        syncError: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z"
      }
    ]);
    getConnectedCalendarAccountsSummary.mockResolvedValue({ total: 1, synced: 1, error: 0 });

    render(
      <ConnectedAccountsPanel onClose={onClose} onError={onError} onSuccess={onSuccess} onAccountsChanged={onAccountsChanged} />
    );

    await user.click(await screen.findByRole("button", { name: /Disconnect/i }));
    expect(disconnectConnectedCalendarAccount).toHaveBeenCalledWith("acc-1");
    expect(onAccountsChanged).toHaveBeenCalled();
  });

  it("shows setup warning and disables connect when OAuth is not configured", async () => {
    getConnectedCalendarOAuthSetup.mockResolvedValue({ googleConfigured: false, microsoftConfigured: false });
    render(
      <ConnectedAccountsPanel onClose={onClose} onError={onError} onSuccess={onSuccess} onAccountsChanged={onAccountsChanged} />
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/Connected calendar sign-in is not available/i);
    expect(screen.getByRole("button", { name: /Connect Google/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Connect Outlook \/ Microsoft 365/i })).toBeDisabled();
  });

  it("reports API errors via onError", async () => {
    startConnectedCalendarOAuth.mockRejectedValue(new Error("connected_calendar_oauth_not_configured:google"));
    const user = userEvent.setup();
    render(
      <ConnectedAccountsPanel onClose={onClose} onError={onError} onSuccess={onSuccess} onAccountsChanged={onAccountsChanged} />
    );
    await user.click(await screen.findByRole("button", { name: /Connect Google/i }));
    expect(onError).toHaveBeenCalledWith(
      "Connected calendar sign-in is not configured for this provider in this build."
    );
  });
});
