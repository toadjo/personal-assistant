import { useState } from "react";
import { addBreadcrumb } from "../../lib/sentry";

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

  const navigateToModule = (m: PersonalModule) => {
    addBreadcrumb({ category: "navigation", message: `module:${m}`, level: "info" });
    setActivePersonalModule(m);
  };

  const openQuickCapture = (type: QuickCaptureType, text: string) => {
    addBreadcrumb({ category: "ui", message: `quick-capture:${type}`, level: "info" });
    setQuickCaptureType(type);
    setQuickCaptureText(text);
    setShowQuickCapture(true);
  };

  const closeQuickCapture = () => {
    setShowQuickCapture(false);
  };

  return {
    activePersonalModule,
    setActivePersonalModule: navigateToModule,
    quickCapture: {
      isOpen: showQuickCapture,
      type: quickCaptureType,
      text: quickCaptureText,
      open: openQuickCapture,
      close: closeQuickCapture
    }
  };
}
