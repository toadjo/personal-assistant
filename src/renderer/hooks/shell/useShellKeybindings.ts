import { useEffect } from "react";
import { getAssistantApi } from "../../lib/assistantApi";

export function useShellKeybindings(opts: {
  onShowAbout: () => void;
  onTogglePalette: () => void;
}): void {
  const { onShowAbout, onTogglePalette } = opts;

  useEffect(() => {
    const handleShowAbout = () => onShowAbout();
    const api = getAssistantApi();
    const unsubscribe = api?.onShowAbout?.(handleShowAbout) ?? (() => {});
    return () => {
      unsubscribe();
    };
  }, [onShowAbout]);

  // Command palette shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onTogglePalette();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTogglePalette]);
}
