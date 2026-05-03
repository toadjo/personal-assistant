import electronLog from "electron-log";

/**
 * Log levels for the main process. Set `ASSISTANT_LOG_LEVEL` to one of these values
 * (`debug`, `info`, `warn`, `error`); invalid or unset values default to `info`.
 */
export type MainLogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: readonly MainLogLevel[] = ["debug", "info", "warn", "error"];

function parseLogLevel(raw: string | undefined): MainLogLevel {
  const v = raw?.trim().toLowerCase();
  if (v && (LEVELS as readonly string[]).includes(v)) {
    return v as MainLogLevel;
  }
  return "info";
}

const resolvedLevel = parseLogLevel(process.env.ASSISTANT_LOG_LEVEL);

electronLog.transports.file.level = resolvedLevel;
electronLog.transports.console.level = resolvedLevel;

export const mainLog = electronLog;

/** Effective main-process log level after reading `ASSISTANT_LOG_LEVEL`. */
export const mainLogLevel: MainLogLevel = resolvedLevel;
