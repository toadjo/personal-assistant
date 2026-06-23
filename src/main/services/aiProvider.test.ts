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

    describe("chat method", () => {
      it("extracts real text from OpenAI chat response", async () => {
        const adapter = new OpenAiAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () =>
            JSON.stringify({
              choices: [{ message: { content: "Hello, how can I help you?" } }]
            })
        } as Response);
        const result = await adapter.chat("sk-test", { message: "test" });
        expect(result.reply).toBe("Hello, how can I help you?");
        expect(result.actionDraft).toBeUndefined();
      });

      it("throws MALFORMED_RESPONSE when choices array is empty", async () => {
        const adapter = new OpenAiAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () => JSON.stringify({ choices: [] })
        } as Response);
        await expect(adapter.chat("sk-test", { message: "test" })).rejects.toThrow("no choices");
      });

      it("returns empty reply when content is null but tool_calls present", async () => {
        const adapter = new OpenAiAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () =>
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: null,
                    tool_calls: [
                      {
                        id: "call_abc",
                        type: "function",
                        function: {
                          name: "create_reminder",
                          arguments: JSON.stringify({
                            text: "Buy milk",
                            dueAt: "2024-12-31T09:00:00Z"
                          })
                        }
                      }
                    ]
                  }
                }
              ]
            })
        } as Response);
        const result = await adapter.chat("sk-test", { message: "remind me to buy milk tomorrow" });
        expect(result.reply).toBe("");
        expect(result.actionDraft).toEqual({
          type: "create_reminder",
          text: "Buy milk",
          dueAt: "2024-12-31T09:00:00Z"
        });
      });

      it("parses OpenAI tool_calls into actionDraft", async () => {
        const adapter = new OpenAiAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () =>
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: "I'll create a note for you.",
                    tool_calls: [
                      {
                        id: "call_123",
                        type: "function",
                        function: {
                          name: "create_note",
                          arguments: JSON.stringify({ title: "Meeting notes", content: "Discussed roadmap" })
                        }
                      }
                    ]
                  }
                }
              ]
            })
        } as Response);
        const result = await adapter.chat("sk-test", { message: "make a note about the meeting" });
        expect(result.reply).toBe("I'll create a note for you.");
        expect(result.actionDraft).toEqual({
          type: "create_note",
          title: "Meeting notes",
          content: "Discussed roadmap"
        });
      });

      it("parses create_task tool call with priority enum", async () => {
        const adapter = new OpenAiAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () =>
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: null,
                    tool_calls: [
                      {
                        id: "call_task",
                        type: "function",
                        function: {
                          name: "create_task",
                          arguments: JSON.stringify({
                            title: "Finish report",
                            priority: "high",
                            dueAt: "2024-12-31T17:00:00Z"
                          })
                        }
                      }
                    ]
                  }
                }
              ]
            })
        } as Response);
        const result = await adapter.chat("sk-test", { message: "add a high priority task to finish the report" });
        expect(result.actionDraft).toEqual({
          type: "create_task",
          title: "Finish report",
          notes: undefined,
          dueAt: "2024-12-31T17:00:00Z",
          priority: "high"
        });
      });

      it("ignores invalid tool_calls JSON arguments and returns text only", async () => {
        const adapter = new OpenAiAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () =>
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: "I couldn't parse that.",
                    tool_calls: [
                      {
                        id: "call_bad",
                        type: "function",
                        function: {
                          name: "create_note",
                          arguments: "{invalid json"
                        }
                      }
                    ]
                  }
                }
              ]
            })
        } as Response);
        const result = await adapter.chat("sk-test", { message: "test" });
        expect(result.reply).toBe("I couldn't parse that.");
        expect(result.actionDraft).toBeUndefined();
      });
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

    describe("chat method", () => {
      it("extracts real text from Anthropic chat response", async () => {
        const adapter = new AnthropicAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () =>
            JSON.stringify({
              content: [{ type: "text", text: "Hello, how can I help you?" }]
            })
        } as Response);
        const result = await adapter.chat("sk-test", { message: "test" });
        expect(result.reply).toBe("Hello, how can I help you?");
        expect(result.actionDraft).toBeUndefined();
      });

      it("throws MALFORMED_RESPONSE when content array is empty", async () => {
        const adapter = new AnthropicAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () => JSON.stringify({ content: [] })
        } as Response);
        await expect(adapter.chat("sk-test", { message: "test" })).rejects.toThrow("no content");
      });

      it("returns empty reply when only tool_use block is present", async () => {
        const adapter = new AnthropicAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () =>
            JSON.stringify({
              content: [
                {
                  type: "tool_use",
                  id: "toolu_abc",
                  name: "create_reminder",
                  input: { text: "Call mom", dueAt: "2024-12-25T10:00:00Z" }
                }
              ]
            })
        } as Response);
        const result = await adapter.chat("sk-test", { message: "remind me to call mom on christmas" });
        expect(result.reply).toBe("");
        expect(result.actionDraft).toEqual({
          type: "create_reminder",
          text: "Call mom",
          dueAt: "2024-12-25T10:00:00Z"
        });
      });

      it("parses Anthropic tool_use block into actionDraft", async () => {
        const adapter = new AnthropicAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () =>
            JSON.stringify({
              content: [
                { type: "text", text: "I'll create that note for you." },
                {
                  type: "tool_use",
                  id: "toolu_123",
                  name: "create_note",
                  input: { title: "Ideas", content: "New feature ideas" }
                }
              ]
            })
        } as Response);
        const result = await adapter.chat("sk-test", { message: "make a note of my ideas" });
        expect(result.reply).toBe("I'll create that note for you.");
        expect(result.actionDraft).toEqual({
          type: "create_note",
          title: "Ideas",
          content: "New feature ideas"
        });
      });

      it("parses toggle_device tool_use block", async () => {
        const adapter = new AnthropicAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () =>
            JSON.stringify({
              content: [
                { type: "text", text: "Toggling the living room light." },
                {
                  type: "tool_use",
                  id: "toolu_toggle",
                  name: "toggle_device",
                  input: { entityId: "light.living_room", friendlyName: "Living Room Light" }
                }
              ]
            })
        } as Response);
        const result = await adapter.chat("sk-test", { message: "toggle the living room light" });
        expect(result.actionDraft).toEqual({
          type: "toggle_device",
          entityId: "light.living_room",
          friendlyName: "Living Room Light"
        });
      });

      it("ignores tool_use block with unknown tool name", async () => {
        const adapter = new AnthropicAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () =>
            JSON.stringify({
              content: [
                { type: "text", text: "I don't know how to do that." },
                {
                  type: "tool_use",
                  id: "toolu_unknown",
                  name: "unknown_action",
                  input: { foo: "bar" }
                }
              ]
            })
        } as Response);
        const result = await adapter.chat("sk-test", { message: "test" });
        expect(result.reply).toBe("I don't know how to do that.");
        expect(result.actionDraft).toBeUndefined();
      });

      it("returns empty reply when text block has no text field but tool_use present", async () => {
        const adapter = new AnthropicAdapter();
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () =>
            JSON.stringify({
              content: [
                { type: "text" },
                {
                  type: "tool_use",
                  id: "toolu_note",
                  name: "create_note",
                  input: { title: "Test" }
                }
              ]
            })
        } as Response);
        const result = await adapter.chat("sk-test", { message: "test" });
        expect(result.reply).toBe("");
        expect(result.actionDraft).toEqual({
          type: "create_note",
          title: "Test",
          content: undefined
        });
      });
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
