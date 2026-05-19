import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCommandExecution } from "./useCommandExecution";

describe("useCommandExecution", () => {
  it("shows generic command error when AI is not configured", async () => {
    const mockSetError = vi.fn();
    const mockSetStatus = vi.fn();
    const mockSetQuery = vi.fn();
    const mockSetReminderFilter = vi.fn();
    const mockSetTaskFilter = vi.fn();
    const mockRefreshAll = vi.fn().mockResolvedValue(undefined);
    const mockRunDeviceToggle = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useCommandExecution({
        devices: [],
        haReady: false,
        setQuery: mockSetQuery,
        setReminderFilter: mockSetReminderFilter,
        setTaskFilter: mockSetTaskFilter,
        setStatus: mockSetStatus,
        setError: mockSetError,
        refreshAll: mockRefreshAll,
        runDeviceToggle: mockRunDeviceToggle,
        notesCount: 0,
        tasksCount: 0,
        remindersCount: 0,
        aiConfigured: false
      })
    );

    // Simulate unknown command that would trigger AI fallback
    await result.current.runCommandInternal("unknown command xyz");

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith("I do not recognize that yet. Type help for ideas, or rephrase.");
    });
  });

  it("shows AI error when AI is configured and chat fails", async () => {
    const mockSetError = vi.fn();
    const mockSetStatus = vi.fn();
    const mockSetQuery = vi.fn();
    const mockSetReminderFilter = vi.fn();
    const mockSetTaskFilter = vi.fn();
    const mockRefreshAll = vi.fn().mockResolvedValue(undefined);
    const mockRunDeviceToggle = vi.fn().mockResolvedValue(undefined);

    // Mock aiChat to throw an error
    (window.assistantApi as unknown) = {
      aiChat: vi.fn().mockRejectedValue(new Error("Insufficient quota"))
    };

    const { result } = renderHook(() =>
      useCommandExecution({
        devices: [],
        haReady: false,
        setQuery: mockSetQuery,
        setReminderFilter: mockSetReminderFilter,
        setTaskFilter: mockSetTaskFilter,
        setStatus: mockSetStatus,
        setError: mockSetError,
        refreshAll: mockRefreshAll,
        runDeviceToggle: mockRunDeviceToggle,
        notesCount: 0,
        tasksCount: 0,
        remindersCount: 0,
        aiConfigured: true
      })
    );

    await result.current.runCommandInternal("unknown command xyz");

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith("Insufficient quota");
    });
  });

  it("calls AI chat when configured for unknown commands", async () => {
    const mockSetError = vi.fn();
    const mockSetStatus = vi.fn();
    const mockSetQuery = vi.fn();
    const mockSetReminderFilter = vi.fn();
    const mockSetTaskFilter = vi.fn();
    const mockRefreshAll = vi.fn().mockResolvedValue(undefined);
    const mockRunDeviceToggle = vi.fn().mockResolvedValue(undefined);

    // Mock aiChat to succeed
    (window.assistantApi as unknown) = {
      aiChat: vi.fn().mockResolvedValue({
        reply: "Here's what you can focus on today..."
      })
    };

    const { result } = renderHook(() =>
      useCommandExecution({
        devices: [],
        haReady: false,
        setQuery: mockSetQuery,
        setReminderFilter: mockSetReminderFilter,
        setTaskFilter: mockSetTaskFilter,
        setStatus: mockSetStatus,
        setError: mockSetError,
        refreshAll: mockRefreshAll,
        runDeviceToggle: mockRunDeviceToggle,
        notesCount: 0,
        tasksCount: 0,
        remindersCount: 0,
        aiConfigured: true
      })
    );

    await result.current.runCommandInternal("what should I focus on today?");

    await waitFor(() => {
      expect((window.assistantApi as unknown as { aiChat: ReturnType<typeof vi.fn> }).aiChat).toHaveBeenCalledWith({
        message: "what should I focus on today?",
        context: {
          notesCount: 0,
          tasksCount: 0,
          remindersCount: 0,
          devicesCount: 0
        }
      });
    });
  });
});
