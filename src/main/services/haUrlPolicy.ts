import { mainLog } from "../log";

function isIpv4(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function isPrivateOrLocalIpv4(host: string): boolean {
  const parts = host.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === undefined || b === undefined) return false;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost") return true;
  if (h.endsWith(".local")) return true;
  if (h === "::1") return true;
  if (h.toLowerCase().startsWith("fe80:")) return true;
  if (h.toLowerCase().startsWith("fc") || h.toLowerCase().startsWith("fd")) return true;
  if (h.startsWith("[") && h.includes("]")) {
    const inner = h.slice(1, h.indexOf("]"));
    if (inner === "::1") return true;
    if (inner.toLowerCase().startsWith("fe80:")) return true;
    if (inner.toLowerCase().startsWith("fc") || inner.toLowerCase().startsWith("fd")) return true;
    return false;
  }
  if (isIpv4(h)) return isPrivateOrLocalIpv4(h);
  return false;
}

/**
 * Remote / public Home Assistant must use HTTPS. Private LAN or localhost may use HTTP
 * (common for `.local` / RFC1918 installs).
 */
export function assertHomeAssistantBaseUrl(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Home Assistant URL must use http:// or https://.");
  }
  const host = url.hostname;
  const local = isPrivateOrLocalHostname(host);
  if (url.protocol === "http:" && !local) {
    throw new Error("Use https:// for this Home Assistant host (HTTP is only allowed on localhost / private LAN).");
  }
  if (url.protocol === "http:" && local) {
    mainLog.warn(`Home Assistant is configured with http://${host}. Prefer https:// when your instance supports TLS.`);
  }
}
