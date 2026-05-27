import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import {
  disconnectConnectedCalendarAccount,
  getConnectedCalendarAccountsSummary,
  listConnectedCalendarAccounts,
  listExternalCalendarEvents
} from "../../services/connectedCalendar";
import {
  completeConnectedCalendarOAuth,
  startConnectedCalendarOAuth
} from "../../services/connectedCalendarOAuth";
import { syncAllConnectedCalendarAccounts, syncConnectedCalendarAccount } from "../../services/connectedCalendarSync";
import { registerInvoke } from "../invoke-handle";
import {
  connectedCalendarEventsListSchema,
  connectedCalendarOAuthProviderSchema,
  connectedCalendarSyncAccountSchema,
  uuidSchema
} from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerConnectedCalendarHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.connectedCalendarAccountsList, assertSender, () => {
    return listConnectedCalendarAccounts();
  });
  registerInvoke(IpcInvoke.connectedCalendarAccountsSummary, assertSender, () => {
    return getConnectedCalendarAccountsSummary();
  });
  registerInvoke(IpcInvoke.connectedCalendarAccountDisconnect, assertSender, (_event, accountId) => {
    disconnectConnectedCalendarAccount(uuidSchema.parse(accountId));
  });
  registerInvoke(IpcInvoke.connectedCalendarEventsList, assertSender, (_event, payload) => {
    return listExternalCalendarEvents(connectedCalendarEventsListSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.connectedCalendarOAuthStart, assertSender, async (_event, payload) => {
    const parsed = connectedCalendarOAuthProviderSchema.parse(payload);
    await startConnectedCalendarOAuth(parsed.provider);
  });
  registerInvoke(IpcInvoke.connectedCalendarOAuthComplete, assertSender, async (_event, payload) => {
    const parsed = connectedCalendarOAuthProviderSchema.parse(payload);
    return completeConnectedCalendarOAuth(parsed.provider);
  });
  registerInvoke(IpcInvoke.connectedCalendarAccountSync, assertSender, async (_event, payload) => {
    const parsed = connectedCalendarSyncAccountSchema.parse(payload);
    return syncConnectedCalendarAccount(parsed.accountId);
  });
  registerInvoke(IpcInvoke.connectedCalendarAccountsSyncAll, assertSender, async () => {
    return syncAllConnectedCalendarAccounts();
  });
}
