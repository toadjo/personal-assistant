!macro applyShortcutIcon SHORTCUT_PATH
  ${if} ${FileExists} "${SHORTCUT_PATH}"
    CreateShortCut "${SHORTCUT_PATH}" "$appExe" "" "$INSTDIR\resources\app-icon.ico" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "${SHORTCUT_PATH}" "${APP_ID}"
  ${endif}
!macroend

!macro customInstall
  !insertmacro applyShortcutIcon "$newStartMenuLink"

  !ifndef DO_NOT_CREATE_DESKTOP_SHORTCUT
    ${ifNot} ${isNoDesktopShortcut}
      !insertmacro applyShortcutIcon "$newDesktopLink"
    ${endif}
  !endif

  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend
