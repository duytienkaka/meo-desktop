param([long]$PetWindow,[long]$GameWindow)
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class MeoWindowOrder {
  [DllImport("user32.dll")] public static extern IntPtr GetTopWindow(IntPtr parent);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr window,uint next);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  public static int Rank(long target) { int rank=0;var window=GetTopWindow(IntPtr.Zero);while(window!=IntPtr.Zero&&rank<10000){if(window.ToInt64()==target)return rank;window=GetWindow(window,2);rank++;}return -1; }
}
'@
@{petRank=[MeoWindowOrder]::Rank($PetWindow);gameRank=[MeoWindowOrder]::Rank($GameWindow);foreground=[MeoWindowOrder]::GetForegroundWindow().ToInt64().ToString()} | ConvertTo-Json -Compress
