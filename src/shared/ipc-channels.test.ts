import { describe, expect, it } from "vitest";
import { IpcInvoke, IpcInvokeMethodNames } from "./ipc-channels";

describe("IpcInvokeMethodNames", () => {
  it("has one method name per invoke channel", () => {
    expect(Object.keys(IpcInvokeMethodNames).length).toBe(Object.keys(IpcInvoke).length);
    for (const key of Object.keys(IpcInvoke) as Array<keyof typeof IpcInvoke>) {
      expect(IpcInvokeMethodNames[key]).toBeTypeOf("string");
      expect(IpcInvokeMethodNames[key].length).toBeGreaterThan(0);
    }
  });
});
