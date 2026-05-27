import { useState } from "react";

export type ShellModals = {
  showAbout: boolean;
  openAbout: () => void;
  closeAbout: () => void;
  showAppearance: boolean;
  openAppearance: () => void;
  toggleAppearance: () => void;
  closeAppearance: () => void;
  showData: boolean;
  toggleData: () => void;
  showAi: boolean;
  toggleAi: () => void;
  closeAi: () => void;
  showConnectedAccounts: boolean;
  toggleConnectedAccounts: () => void;
  closeConnectedAccounts: () => void;
  showPalette: boolean;
  togglePalette: () => void;
  closePalette: () => void;
  showReleaseNotes: boolean;
  openReleaseNotes: () => void;
  closeReleaseNotes: () => void;
  showEndOfDayReview: boolean;
  openEndOfDayReview: () => void;
};

export function useShellModals(): ShellModals {
  const [showAbout, setShowAbout] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showData, setShowData] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showConnectedAccounts, setShowConnectedAccounts] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showEndOfDayReview, setShowEndOfDayReview] = useState(false);

  return {
    showAbout,
    openAbout: () => setShowAbout(true),
    closeAbout: () => setShowAbout(false),
    showAppearance,
    openAppearance: () => setShowAppearance(true),
    toggleAppearance: () => setShowAppearance((s) => !s),
    closeAppearance: () => setShowAppearance(false),
    showData,
    toggleData: () => setShowData((s) => !s),
    showAi,
    toggleAi: () => setShowAi((s) => !s),
    closeAi: () => setShowAi(false),
    showConnectedAccounts,
    toggleConnectedAccounts: () => setShowConnectedAccounts((s) => !s),
    closeConnectedAccounts: () => setShowConnectedAccounts(false),
    showPalette,
    togglePalette: () => setShowPalette((s) => !s),
    closePalette: () => setShowPalette(false),
    showReleaseNotes,
    openReleaseNotes: () => setShowReleaseNotes(true),
    closeReleaseNotes: () => setShowReleaseNotes(false),
    showEndOfDayReview,
    openEndOfDayReview: () => setShowEndOfDayReview(true)
  };
}
