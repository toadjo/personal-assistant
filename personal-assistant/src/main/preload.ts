import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("assistantApi", {
  listNotes: (query?: string) => ipcRenderer.invoke("notes:list", query),
  createNote: (payload: { title: string; content: string; tags: string[]; pinned: boolean }) =>
    ipcRenderer.invoke("notes:create", payload),
  listReminders: () => ipcRenderer.invoke("reminders:list"),
  createReminder: (payload: { text: string; dueAt: string; recurrence: "none" | "daily" }) =>
    ipcRenderer.invoke("reminders:create", payload),
  completeReminder: (id: string) => ipcRenderer.invoke("reminders:complete", id),
  configureHomeAssistant: (payload: { url: string; token: string }) => ipcRenderer.invoke("ha:configure", payload),
  testHomeAssistant: () => ipcRenderer.invoke("ha:test"),
  refreshHomeAssistantEntities: () => ipcRenderer.invoke("ha:refresh"),
  listDevices: () => ipcRenderer.invoke("ha:listDevices"),
  toggleDevice: (entityId: string) => ipcRenderer.invoke("ha:toggle", entityId),
  listExecutionLogs: () => ipcRenderer.invoke("automation:logs"),
  listRules: () => ipcRenderer.invoke("automation:rules:list"),
  createRule: (payload: {
    name: string;
    triggerConfig: { at: string };
    actionType: "localReminder" | "haToggle";
    actionConfig: Record<string, string>;
    enabled: boolean;
  }) => ipcRenderer.invoke("automation:rules:create", payload),
  onRemindersUpdated: (cb: () => void) => {
    ipcRenderer.on("reminders:updated", cb);
    return () => ipcRenderer.removeListener("reminders:updated", cb);
  }
});
