import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnthropicAdapter, OpenAiAdapter, createAdapter } from "./aiProvider";

describe("aiProvider", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("OpenAiAdapter", () => {
    it("throws NOT_CONFIGURED when API key is empty", async () => {
      const adapter = new OpenAiAdapter();
      await expect(adapter.testConnection("")).rejects.toThrow("not configured");
    });

    it("throws INVALID_KEY on 401 response", async () => {
      const adapter = new OpenAiAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized"
      } as Response);
      await expect(adapter.testConnection("sk-bad")).rejects.toThrow("invalid or expired");
    });

    it("throws RATE_LIMITED on 429 response", async () => {
      const adapter = new OpenAiAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests"
      } as Response);
      await expect(adapter.testConnection("sk-test")).rejects.toThrow("rate limit exceeded");
    });

    it("throws PROVIDER_UNAVAILABLE on non-401/429 error status", async () => {
      const adapter = new OpenAiAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      } as Response);
      await expect(adapter.testConnection("sk-test")).rejects.toThrow("500");
    });

    it("throws MALFORMED_RESPONSE on invalid JSON", async () => {
      const adapter = new OpenAiAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "not json"
      } as Response);
      await expect(adapter.testConnection("sk-test")).rejects.toThrow("invalid JSON");
    });

    it("throws MALFORMED_RESPONSE on non-object JSON", async () => {
      const adapter = new OpenAiAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "[]"
      } as Response);
      await expect(adapter.testConnection("sk-test")).rejects.toThrow("not an object");
    });

    it("throws NETWORK_FAILURE on timeout", async () => {
      const adapter = new OpenAiAdapter();
      const abortError = new Error("The operation was aborted.");
      abortError.name = "AbortError";
      globalThis.fetch = vi.fn().mockImplementation(() => {
        throw abortError;
      });
      await expect(adapter.testConnection("sk-test")).rejects.toThrow("timed out");
    });

    it("returns success result on 200 OK with valid JSON object", async () => {
      const adapter = new OpenAiAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ object: "list", data: [] })
      } as Response);
      const result = await adapter.testConnection("sk-valid");
      expect(result.success).toBe(true);
      expect(result.model).toBe("gpt-4o-mini");
    });
  });

  describe("AnthropicAdapter", () => {
    it("throws NOT_CONFIGURED when API key is empty", async () => {
      const adapter = new AnthropicAdapter();
      await expect(adapter.testConnection("")).rejects.toThrow("not configured");
    });

    it("throws INVALID_KEY on 401 response", async () => {
      const adapter = new AnthropicAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized"
      } as Response);
      await expect(adapter.testConnection("sk-ant-bad")).rejects.toThrow("invalid or expired");
    });

    it("throws RATE_LIMITED on 429 response", async () => {
      const adapter = new AnthropicAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests"
      } as Response);
      await expect(adapter.testConnection("sk-ant-test")).rejects.toThrow("rate limit exceeded");
    });

    it("throws INVALID_MODEL on 400 with invalid model text", async () => {
      const adapter = new AnthropicAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => JSON.stringify({ error: { message: "invalid model" } })
      } as Response);
      await expect(adapter.testConnection("sk-ant-test")).rejects.toThrow("not available");
    });

    it("throws PROVIDER_UNAVAILABLE on non-401/429/400 error status", async () => {
      const adapter = new AnthropicAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      } as Response);
      await expect(adapter.testConnection("sk-ant-test")).rejects.toThrow("500");
    });

    it("throws MALFORMED_RESPONSE on invalid JSON", async () => {
      const adapter = new AnthropicAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "not json"
      } as Response);
      await expect(adapter.testConnection("sk-ant-test")).rejects.toThrow("invalid JSON");
    });

    it("throws MALFORMED_RESPONSE on non-object JSON", async () => {
      const adapter = new AnthropicAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "[]"
      } as Response);
      await expect(adapter.testConnection("sk-ant-test")).rejects.toThrow("not an object");
    });

    it("throws NETWORK_FAILURE on timeout", async () => {
      const adapter = new AnthropicAdapter();
      const abortError = new Error("The operation was aborted.");
      abortError.name = "AbortError";
      globalThis.fetch = vi.fn().mockImplementation(() => {
        throw abortError;
      });
      await expect(adapter.testConnection("sk-ant-test")).rejects.toThrow("timed out");
    });

    it("returns success result on 200 OK with valid JSON object", async () => {
      const adapter = new AnthropicAdapter();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ content: [{ text: "pong" }] })
      } as Response);
      const result = await adapter.testConnection("sk-ant-valid");
      expect(result.success).toBe(true);
      expect(result.model).toBe("claude-3-5-sonnet-20241022");
    });
  });

  describe("createAdapter", () => {
    it("returns OpenAiAdapter for openai provider", () => {
      const adapter = createAdapter("openai");
      expect(adapter).toBeInstanceOf(OpenAiAdapter);
      expect(adapter.provider).toBe("openai");
    });

    it("returns AnthropicAdapter for anthropic provider", () => {
      const adapter = createAdapter("anthropic");
      expect(adapter).toBeInstanceOf(AnthropicAdapter);
      expect(adapter.provider).toBe("anthropic");
    });
  });
});
