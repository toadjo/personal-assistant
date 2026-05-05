/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { useAssistantWorkspace } from "../useAssistantWorkspace";

describe("useAssistantWorkspace after refactor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    // Mock assistantApi
    (window as any).assistantApi = {
      hideDeskWindow: vi.fn(),
      getAssistantSettings: vi.fn().mockResolvedValue({
        name: "Assistant",
        isConfigured: false,
        userPreferredName: "",
        userPreferredNameIsSet: false
      }),
      setUserPreferredName: vi.fn().mockResolvedValue({
        name: "Assistant",
        isConfigured: false,
        userPreferredName: "",
        userPreferredNameIsSet: false
      })
    };
  });

  it("returns the same public sections as before refactor", () => {
    const { result } = renderHook(() => useAssistantWorkspace());

    expect(result.current).toHaveProperty("ui");
    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("ha");
    expect(result.current).toHaveProperty("command");
    expect(result.current).toHaveProperty("calendar");
    expect(result.current).toHaveProperty("reminders");
    expect(result.current).toHaveProperty("automation");
    expect(result.current).toHaveProperty("memos");
    expect(result.current).toHaveProperty("profile");
    expect(result.current).toHaveProperty("onboarding");
    expect(result.current).toHaveProperty("desk");
  });

  it("ui section has theme, status, error setters", () => {
    const { result } = renderHook(() => useAssistantWorkspace());

    expect(result.current.ui).toHaveProperty("theme");
    expect(result.current.ui).toHaveProperty("setTheme");
    expect(result.current.ui).toHaveProperty("status");
    expect(result.current.ui).toHaveProperty("setStatus");
    expect(result.current.ui).toHaveProperty("error");
    expect(result.current.ui).toHaveProperty("reportError");
  });

  it("data section has query, entities, and refresh functions", () => {
    const { result } = renderHook(() => useAssistantWorkspace());

    expect(result.current.data).toHaveProperty("query");
    expect(result.current.data).toHaveProperty("setQuery");
    expect(result.current.data).toHaveProperty("notes");
    expect(result.current.data).toHaveProperty("reminders");
    expect(result.current.data).toHaveProperty("devices");
    expect(result.current.data).toHaveProperty("logs");
    expect(result.current.data).toHaveProperty("rules");
    expect(result.current.data).toHaveProperty("isRefreshing");
    expect(result.current.data).toHaveProperty("refreshAll");
    expect(result.current.data).toHaveProperty("fetchNotesOnly");
    expect(result.current.data).toHaveProperty("fetchRemindersOnly");
  });

  it("ha section has credentials, readiness, and device toggle", () => {
    const { result } = renderHook(() => useAssistantWorkspace());

    expect(result.current.ha).toHaveProperty("haUrl");
    expect(result.current.ha).toHaveProperty("setHaUrl");
    expect(result.current.ha).toHaveProperty("haToken");
    expect(result.current.ha).toHaveProperty("setHaToken");
    expect(result.current.ha).toHaveProperty("hasHaToken");
    expect(result.current.ha).toHaveProperty("isRefreshingHa");
    expect(result.current.ha).toHaveProperty("isSavingHa");
    expect(result.current.ha).toHaveProperty("saveHomeAssistantConfig");
    expect(result.current.ha).toHaveProperty("testHomeAssistant");
    expect(result.current.ha).toHaveProperty("refreshHomeAssistantEntities");
    expect(result.current.ha).toHaveProperty("haReady");
    expect(result.current.ha).toHaveProperty("hasHaUrl");
    expect(result.current.ha).toHaveProperty("canSaveHa");
    expect(result.current.ha).toHaveProperty("haStatusText");
    expect(result.current.ha).toHaveProperty("isEntityTogglePending");
    expect(result.current.ha).toHaveProperty("runDeviceToggle");
  });

  it("command section has input, history, hints, and execution", () => {
    const { result } = renderHook(() => useAssistantWorkspace());

    expect(result.current.command).toHaveProperty("commandInput");
    expect(result.current.command).toHaveProperty("setCommandInput");
    expect(result.current.command).toHaveProperty("commandHistory");
    expect(result.current.command).toHaveProperty("setCommandHistory");
    expect(result.current.command).toHaveProperty("historyCursor");
    expect(result.current.command).toHaveProperty("setHistoryCursor");
    expect(result.current.command).toHaveProperty("commandHints");
    expect(result.current.command).toHaveProperty("isRunningCommand");
    expect(result.current.command).toHaveProperty("commandInputRef");
    expect(result.current.command).toHaveProperty("runPresetCommand");
    expect(result.current.command).toHaveProperty("runCommandInternal");
    expect(result.current.command).toHaveProperty("clearCommandHistory");
  });

  it("calendar section has cursor, cells, and agenda", () => {
    const { result } = renderHook(() => useAssistantWorkspace());

    expect(result.current.calendar).toHaveProperty("calendarCursor");
    expect(result.current.calendar).toHaveProperty("setCalendarCursor");
    expect(result.current.calendar).toHaveProperty("monthCells");
    expect(result.current.calendar).toHaveProperty("todayKey");
    expect(result.current.calendar).toHaveProperty("calendarSelectedKey");
    expect(result.current.calendar).toHaveProperty("setCalendarSelectedKey");
    expect(result.current.calendar).toHaveProperty("selectedDayAgenda");
  });

  it("reminders section has filter, derived views, and actions", () => {
    const { result } = renderHook(() => useAssistantWorkspace());

    expect(result.current.reminders).toHaveProperty("filter");
    expect(result.current.reminders).toHaveProperty("setFilter");
    expect(result.current.reminders).toHaveProperty("pending");
    expect(result.current.reminders).toHaveProperty("overdue");
    expect(result.current.reminders).toHaveProperty("visible");
    expect(result.current.reminders).toHaveProperty("snoozeMinutes");
    expect(result.current.reminders).toHaveProperty("completeById");
    expect(result.current.reminders).toHaveProperty("deleteById");
  });

  it("automation section has rule actions", () => {
    const { result } = renderHook(() => useAssistantWorkspace());

    expect(result.current.automation).toHaveProperty("deleteRuleById");
    expect(result.current.automation).toHaveProperty("setRuleEnabledById");
  });

  it("memos section has note actions", () => {
    const { result } = renderHook(() => useAssistantWorkspace());

    expect(result.current.memos).toHaveProperty("deleteNote");
    expect(result.current.memos).toHaveProperty("updateNote");
  });

  it("profile section has user preferred name actions", () => {
    const { result } = renderHook(() => useAssistantWorkspace());

    expect(result.current.profile).toHaveProperty("userPreferredName");
    expect(result.current.profile).toHaveProperty("userPreferredNameIsSet");
    expect(result.current.profile).toHaveProperty("persistUserPreferredName");
  });

  it("onboarding section has show and setShow", () => {
    const { result } = renderHook(() => useAssistantWorkspace());

    expect(result.current.onboarding).toHaveProperty("show");
    expect(result.current.onboarding).toHaveProperty("setShow");
  });

  it("desk section has hideWindow action", () => {
    const { result } = renderHook(() => useAssistantWorkspace());

    expect(result.current.desk).toHaveProperty("hideWindow");
  });
});
