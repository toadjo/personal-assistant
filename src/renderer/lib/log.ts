import { devConsoleWarn } from "./devConsole";

/** Renderer-side diagnostics; no-op in production unless debug env is set (see devConsole.ts). */
export function logRendererWarning(scope: string, message: string, error?: unknown): void {
  devConsoleWarn(scope, message, error);
}
