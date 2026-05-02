/** Renderer-side diagnostic logging (visible in DevTools). */
export function logRendererWarning(scope: string, message: string, error?: unknown): void {
  if (error !== undefined) {
    console.warn(`[assistant:${scope}] ${message}`, error);
  } else {
    console.warn(`[assistant:${scope}] ${message}`);
  }
}
