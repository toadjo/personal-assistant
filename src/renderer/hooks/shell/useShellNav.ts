import { useState } from "react";

export type PersonalModule =
  | "home"
  | "today"
  | "inbox"
  | "memos"
  | "reminders"
  | "tasks"
  | "automations"
  | "lifeAreas"
  | "finance"
  | "car"
  | "family"
  | "health"
  | "hobbies";

export type QuickCaptureType = "note" | "task" | "reminder" | "inbox";

export type ShellNav = {
  activePersonalModule: PersonalModule;
  setActivePersonalModule: (m: PersonalModule) => void;
  quickCapture: {
    isOpen: boolean;
    type: QuickCaptureType;
    text: string;
    open: (type: QuickCaptureType, text: string) => void;
    close: () => void;
  };
};

export function useShellNav(): ShellNav {
  const [activePersonalModule, setActivePersonalModule] = useState<PersonalModule>("home");
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [quickCaptureType, setQuickCaptureType] = useState<QuickCaptureType>("inbox");
  const [quickCaptureText, setQuickCaptureText] = useState("");

  const openQuickCapture = (type: QuickCaptureType, text: string) => {
    setQuickCaptureType(type);
    setQuickCaptureText(text);
    setShowQuickCapture(true);
  };

  const closeQuickCapture = () => {
    setShowQuickCapture(false);
  };

  return {
    activePersonalModule,
    setActivePersonalModule,
    quickCapture: {
      isOpen: showQuickCapture,
      type: quickCaptureType,
      text: quickCaptureText,
      open: openQuickCapture,
      close: closeQuickCapture
    }
  };
}
