import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("assistantApi", {
  listNotes: (query?: string) => ipcRenderer.invoke("notes:list", query),
  createNote: (payload: { title: string; content: string; tags: string[]; pinned: boolean }) =>
    ipcRenderer.invoke("notes:create", payload),
  deleteNote: (id: string) => ipcRenderer.invoke("notes:delete", id),
  listReminders: () => ipcRenderer.invoke("reminders:list"),
  createReminder: (payload: { text: string; dueAt: string; recurrence: "none" | "daily" }) =>
    ipcRenderer.invoke("reminders:create", payload),
  completeReminder: (id: string) => ipcRenderer.invoke("reminders:complete", id),
  deleteReminder: (id: string) => ipcRenderer.invoke("reminders:delete", id),
  snoozeReminder: (id: string, minutes: number) => ipcRenderer.invoke("reminders:snooze", id, minutes),
  configureHomeAssistant: (payload: { url: string; token: string }) => ipcRenderer.invoke("ha:configure", payload),
  getHomeAssistantConfig: () => ipcRenderer.invoke("ha:getConfig"),
  testHomeAssistant: () => ipcRenderer.invoke("ha:test"),
  refreshHomeAssistantEntities: () => ipcRenderer.invoke("ha:refresh"),
  listDevices: () => ipcRenderer.invoke("ha:listDevices"),
  toggleDevice: (entityId: string) => ipcRenderer.invoke("ha:toggle", entityId),
  getAssistantSettings: () => ipcRenderer.invoke("settings:getAssistant"),
  setAssistantName: (name: string) => ipcRenderer.invoke("settings:setAssistantName", name),
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
  },
  onCommand: (cb: (_: unknown, command: string) => void) => {
    ipcRenderer.on("command", cb);
    return () => ipcRenderer.removeListener("command", cb);
  }
});
