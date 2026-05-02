import electronLog from "electron-log";

/** Main-process structured logging (rotating file + console). */
electronLog.transports.file.level = "info";
electronLog.transports.console.level = "silly";

export const mainLog = electronLog;
