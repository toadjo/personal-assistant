import { describe, expect, it, vi } from "vitest";

const { handleMap } = vi.hoisted(() => {
  const handleMap = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
  return { handleMap };
});

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, fn: (event: unknown, ...args: unknown[]) => unknown) => {
      handleMap.set(channel, fn);
    })
  }
}));

vi.mock("../log", () => ({
  mainLog: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

import { decodeAssistantInvokeFailure } from "../../shared/invokeErrors";
import { registerInvoke } from "./invoke-handle";
import { noteCreateSchema } from "./schemas";

describe("registerInvoke", () => {
  it("converts ZodError into ipc_validation structured errors", async () => {
    registerInvoke(
      "notes:create:test",
      () => {},
      () => {
        noteCreateSchema.parse({ title: "", content: "", tags: [], pinned: false });
      }
    );
    const fn = handleMap.get("notes:create:test");
    expect(fn).toBeDefined();
    let caught: unknown;
    try {
      await fn!({}, {});
    } catch (e) {
      caught = e;
    }
    const decoded = decodeAssistantInvokeFailure(caught);
    expect(decoded).toMatchObject({
      domain: "ipc_validation",
      code: "INVALID_PAYLOAD",
      retryable: false
    });
    expect(decoded?.message).toMatch(/^That request had invalid data\./);
    expect(decoded?.message).toBeTruthy();
    expect(decoded?.message).not.toMatch(/Expected/);
  });

  it("runs assertSender before the handler body", async () => {
    const assertSender = vi.fn(() => {
      throw new Error("untrusted");
    });
    registerInvoke("app:test", assertSender, () => "ok");
    const fn = handleMap.get("app:test");
    await expect(fn!({}, {})).rejects.toThrow("untrusted");
    expect(assertSender).toHaveBeenCalledTimes(1);
  });
});
