import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => {
  const mockNotificationInstance = {
    on: vi.fn(),
    show: vi.fn()
  };
  const mockConstructor = vi.fn(() => mockNotificationInstance);
  return {
    Notification: Object.assign(mockConstructor, {
      isSupported: vi.fn(() => true)
    })
  };
});

const warnMock = vi.fn();

vi.mock("./log", () => ({
  mainLog: {
    info: vi.fn(),
    warn: (...args: unknown[]) => warnMock(...args),
    error: vi.fn()
  }
}));

import { showNotificationSafe } from "./notification";
import { Notification } from "electron";

describe("showNotificationSafe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    warnMock.mockClear();
  });

  it("returns 'unsupported' when notifications are not supported", () => {
    vi.mocked(Notification.isSupported).mockReturnValue(false);
    const result = showNotificationSafe({ title: "Test", body: "Test body" });
    expect(result).toBe("unsupported");
    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(warnMock).toHaveBeenCalledWith(
      'Desktop notifications not supported. Notification suppressed: "Test"'
    );
  });

  it("returns 'shown' when notification is created and shown successfully", () => {
    vi.mocked(Notification.isSupported).mockReturnValue(true);
    const result = showNotificationSafe({ title: "Test", body: "Test body" });
    expect(result).toBe("shown");
    expect(vi.mocked(Notification)).toHaveBeenCalledWith({ title: "Test", body: "Test body" });
  });

  it("calls onClick handler when provided and notification is shown", () => {
    vi.mocked(Notification.isSupported).mockReturnValue(true);
    const onClick = vi.fn();
    const result = showNotificationSafe({ title: "Test", body: "Test body" }, onClick);
    expect(result).toBe("shown");
    const mockInstance = vi.mocked(Notification).mock.results[0]?.value;
    expect(mockInstance?.on).toHaveBeenCalledWith("click", onClick);
  });

  it("returns 'failed' when notification constructor throws", () => {
    vi.mocked(Notification.isSupported).mockReturnValue(true);
    vi.mocked(Notification).mockImplementationOnce(() => {
      throw new Error("Notification constructor failed");
    });
    const result = showNotificationSafe({ title: "Test", body: "Test body" });
    expect(result).toBe("failed");
    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(warnMock).toHaveBeenCalledWith(
      'Failed to show desktop notification "Test": Notification constructor failed'
    );
  });

  it("returns 'failed' when notification.show() throws", () => {
    vi.mocked(Notification.isSupported).mockReturnValue(true);
    const mockInstance = {
      on: vi.fn(),
      show: vi.fn(() => {
        throw new Error("Show failed");
      })
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    vi.mocked(Notification).mockImplementationOnce(() => mockInstance);
    const result = showNotificationSafe({ title: "Test", body: "Test body" });
    expect(result).toBe("failed");
    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(warnMock).toHaveBeenCalledWith('Failed to show desktop notification "Test": Show failed');
  });
});
