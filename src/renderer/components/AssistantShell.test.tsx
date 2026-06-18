import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { AssistantShell } from "./AssistantShell";
describe("AssistantShell module", () => {
  it("exports a component function", () => {
    expect(typeof AssistantShell).toBe("function");
  });
});
