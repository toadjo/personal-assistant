import { describe, expect, it, vi } from "vitest";

vi.mock("./services/automation", () => ({
  runAutomationCycle: vi.fn(async () => {})
}));

vi.mock("./log", () => ({
  mainLog: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

import { startAutomationScheduler } from "./automation-scheduler";
import { mainLog } from "./log";

describe("startAutomationScheduler", () => {
  it("logs lifecycle on start and stop", () => {
    const stop = startAutomationScheduler();
    expect(mainLog.info).toHaveBeenCalledWith("[scheduler:automation] started");
    stop();
    expect(mainLog.info).toHaveBeenCalledWith("[scheduler:automation] stopped");
  });
});
