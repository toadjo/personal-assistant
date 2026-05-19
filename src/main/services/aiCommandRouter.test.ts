import { describe, expect, it, vi } from "vitest";
import { routeCommandThroughAi } from "./aiCommandRouter";
import { getAiConfig } from "./aiConfig";
import { getAiApiKey } from "./aiSecrets";
import { createAdapter } from "./aiProvider";

// Mock dependencies
vi.mock("./aiConfig");
vi.mock("./aiSecrets");
vi.mock("./aiProvider");

describe("routeCommandThroughAi", () => {
  it("returns handled: false when AI is not configured", async () => {
    vi.mocked(getAiConfig).mockResolvedValue({ provider: null, configured: false, lastTestedAt: null });
    const result = await routeCommandThroughAi("create a note");
    expect(result.handled).toBe(false);
  });

  it("returns handled: false when API key is missing", async () => {
    vi.mocked(getAiConfig).mockResolvedValue({ provider: "openai", configured: true, lastTestedAt: "2024-01-01" });
    vi.mocked(getAiApiKey).mockResolvedValue(null);
    const result = await routeCommandThroughAi("create a note");
    expect(result.handled).toBe(false);
  });

  it("returns handled: false when AI chat fails", async () => {
    vi.mocked(getAiConfig).mockResolvedValue({ provider: "openai", configured: true, lastTestedAt: "2024-01-01" });
    vi.mocked(getAiApiKey).mockResolvedValue("sk-test");
    const mockAdapter = {
      chat: vi.fn().mockRejectedValue(new Error("Network error"))
    };
    vi.mocked(createAdapter).mockReturnValue(mockAdapter as never);
    const result = await routeCommandThroughAi("create a note");
    expect(result.handled).toBe(false);
  });

  it("returns handled: true with reply when AI succeeds", async () => {
    vi.mocked(getAiConfig).mockResolvedValue({ provider: "openai", configured: true, lastTestedAt: "2024-01-01" });
    vi.mocked(getAiApiKey).mockResolvedValue("sk-test");
    const mockAdapter = {
      chat: vi.fn().mockResolvedValue({ reply: "I suggest using create_note tool" })
    };
    vi.mocked(createAdapter).mockReturnValue(mockAdapter as never);
    const result = await routeCommandThroughAi("create a note");
    expect(result.handled).toBe(true);
    expect(result.reply).toBe("I suggest using create_note tool");
  });

  it("includes context in chat request when provided", async () => {
    vi.mocked(getAiConfig).mockResolvedValue({ provider: "openai", configured: true, lastTestedAt: "2024-01-01" });
    vi.mocked(getAiApiKey).mockResolvedValue("sk-test");
    const mockAdapter = {
      chat: vi.fn().mockResolvedValue({ reply: "Response" })
    };
    vi.mocked(createAdapter).mockReturnValue(mockAdapter as never);
    await routeCommandThroughAi("create a note", { notesCount: 5, tasksCount: 3 });
    expect(mockAdapter.chat).toHaveBeenCalledWith(
      "sk-test",
      expect.objectContaining({
        context: expect.objectContaining({ notesCount: 5, tasksCount: 3 })
      })
    );
  });
});
