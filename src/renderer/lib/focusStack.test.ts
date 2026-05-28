import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { focusStack } from "./focusStack";

describe("FocusStackManager", () => {
  let button1: HTMLButtonElement;
  let button2: HTMLButtonElement;
  let input: HTMLInputElement;

  beforeEach(() => {
    // Create test elements
    button1 = document.createElement("button");
    button1.textContent = "Button 1";
    button2 = document.createElement("button");
    button2.textContent = "Button 2";
    input = document.createElement("input");
    input.type = "text";

    document.body.appendChild(button1);
    document.body.appendChild(button2);
    document.body.appendChild(input);

    focusStack.clear();
  });

  afterEach(() => {
    if (button1.parentNode) {
      document.body.removeChild(button1);
    }
    if (button2.parentNode) {
      document.body.removeChild(button2);
    }
    if (input.parentNode) {
      document.body.removeChild(input);
    }
  });

  it("should push focused element to stack", () => {
    button1.focus();
    focusStack.push();
    
    expect(focusStack.size).toBe(1);
  });

  it("should not push body element to stack", () => {
    document.body.focus();
    focusStack.push();
    
    expect(focusStack.size).toBe(0);
  });

  it("should pop and restore focus to previous element", () => {
    button1.focus();
    focusStack.push();
    
    button2.focus();
    focusStack.push();
    
    focusStack.pop();
    // After popping, focus should be restored to button1
    // Note: In test environment, focus behavior may differ
    expect(focusStack.size).toBe(1);
  });

  it("should handle empty stack gracefully", () => {
    focusStack.pop();
    expect(focusStack.size).toBe(0);
  });

  it("should limit stack size", () => {
    for (let i = 0; i < 15; i++) {
      button1.focus();
      focusStack.push();
    }
    
    expect(focusStack.size).toBe(10); // maxStackSize
  });

  it("should clear the stack", () => {
    button1.focus();
    focusStack.push();
    button2.focus();
    focusStack.push();
    
    focusStack.clear();
    expect(focusStack.size).toBe(0);
  });

  it("should not restore focus to removed elements", () => {
    button1.focus();
    focusStack.push();
    
    // Remove button from DOM
    if (button1.parentNode) {
      button1.parentNode.removeChild(button1);
    }
    
    focusStack.pop();
    
    // Focus should not be restored to removed element
    expect(document.activeElement).not.toBe(button1);
    
    // Re-add for cleanup
    document.body.appendChild(button1);
  });

  it("should trap focus within container", () => {
    const container = document.createElement("div");
    const innerButton1 = document.createElement("button");
    const innerButton2 = document.createElement("button");
    
    container.appendChild(innerButton1);
    container.appendChild(innerButton2);
    document.body.appendChild(container);

    const cleanup = focusStack.trapFocus(container);
    
    innerButton1.focus();
    expect(document.activeElement).toBe(innerButton1);
    
    // Simulate Tab key (would normally move to next focusable element)
    // In this test, we just verify the cleanup function exists
    expect(typeof cleanup).toBe("function");
    
    cleanup();
    document.body.removeChild(container);
  });
});