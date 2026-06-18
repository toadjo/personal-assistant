/**
 * Focus Stack Manager
 * 
 * Manages focus restoration for modals, drawers, and overlays.
 * When a modal opens, the previously focused element is pushed to the stack.
 * When the modal closes, focus is restored to the previous element.
 * 
 * This ensures keyboard users can return to where they were after closing overlays.
 */

import React from "react";

type FocusStackEntry = {
  element: HTMLElement | null;
  timestamp: number;
};

class FocusStackManager {
  private stack: FocusStackEntry[] = [];
  private maxStackSize = 10;

  /**
   * Push the currently focused element onto the stack
   */
  push(): void {
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement && activeElement !== document.body) {
      this.stack.push({
        element: activeElement,
        timestamp: Date.now()
      });
      
      // Limit stack size to prevent memory issues
      if (this.stack.length > this.maxStackSize) {
        this.stack.shift();
      }
    }
  }

  /**
   * Pop the last element from the stack and restore focus to it
   */
  pop(): void {
    const entry = this.stack.pop();
    if (entry?.element) {
      // Check if the element is still in the DOM
      if (document.contains(entry.element)) {
        entry.element.focus();
      }
    }
  }

  /**
   * Clear the entire stack (useful for full page navigation)
   */
  clear(): void {
    this.stack = [];
  }

  /**
   * Get the current stack size
   */
  get size(): number {
    return this.stack.length;
  }

  /**
   * Trap focus within a container element
   * This keeps keyboard navigation inside the modal when Tab/Shift+Tab is used
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift+Tab: if on first element, move to last
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          // Tab: if on last element, move to first
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
}

// Singleton instance
export const focusStack = new FocusStackManager();

/**
 * React hook for managing focus restoration in modals/overlays
 */
export function useFocusRestoration(isOpen: boolean) {
  const previousRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Store the previously focused element when opening
      previousRef.current = document.activeElement as HTMLElement | null;
    } else {
      // Restore focus when closing
      if (previousRef.current && document.contains(previousRef.current)) {
        previousRef.current.focus();
      }
    }
  }, [isOpen]);

  return previousRef;
}