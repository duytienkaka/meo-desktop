!macro customUnInstall
  ; Keep the user's startup choice during upgrades; clean only a real uninstall.
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Meo Desktop"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "Meo Desktop"
  ${endif}
!macroend
