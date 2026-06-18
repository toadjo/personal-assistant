import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertHomeAssistantBaseUrl } from "./haUrlPolicy";

vi.mock("../log", () => ({
  mainLog: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assertHomeAssistantBaseUrl", () => {
  it("allows http for localhost", () => {
    expect(() => assertHomeAssistantBaseUrl(new URL("http://localhost:8123"))).not.toThrow();
  });

  it("allows http for RFC1918 host", () => {
    expect(() => assertHomeAssistantBaseUrl(new URL("http://192.168.1.10:8123"))).not.toThrow();
  });

  it("rejects http for public hostname", () => {
    expect(() => assertHomeAssistantBaseUrl(new URL("http://homeassistant.example.com"))).toThrow(/https/i);
  });

  it("allows https for public hostname", () => {
    expect(() => assertHomeAssistantBaseUrl(new URL("https://homeassistant.example.com"))).not.toThrow();
  });
});
