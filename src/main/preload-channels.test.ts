import { describe, expect, it } from "vitest";
import { invokeChannelMap, pushChannelMap } from "./preload-ipc-literals.generated";
import { IpcInvoke, IpcRendererEvent } from "../shared/ipc-channels";

describe("preload IPC channel names", () => {
  it("generated invoke map matches src/shared/ipc-channels.ts", () => {
    expect(invokeChannelMap).toEqual(IpcInvoke);
  });

  it("generated push map matches src/shared/ipc-channels.ts", () => {
    expect(pushChannelMap).toEqual(IpcRendererEvent);
  });
});
