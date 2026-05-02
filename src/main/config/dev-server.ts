export const DEFAULT_DEV_SERVER_URL = "http://localhost:5173";

export function safeGetOrigin(targetUrl: string): string | null {
  try {
    return new URL(targetUrl).origin;
  } catch {
    return null;
  }
}

export function getConfiguredDevServerUrl(): string {
  const configured = process.env.VITE_DEV_SERVER_URL?.trim();
  return configured && safeGetOrigin(configured) ? configured : DEFAULT_DEV_SERVER_URL;
}

export function getTrustedDevOrigins(): Set<string> {
  const configuredOrigin = safeGetOrigin(getConfiguredDevServerUrl());
  const trustedOrigins = new Set<string>();
  if (configuredOrigin) trustedOrigins.add(configuredOrigin);
  trustedOrigins.add("http://localhost:5173");
  trustedOrigins.add("http://127.0.0.1:5173");
  return trustedOrigins;
}

export function isDevServerUrl(targetUrl: string): boolean {
  const trustedOrigins = getTrustedDevOrigins();
  const targetOrigin = safeGetOrigin(targetUrl);
  return !!targetOrigin && trustedOrigins.has(targetOrigin);
}
