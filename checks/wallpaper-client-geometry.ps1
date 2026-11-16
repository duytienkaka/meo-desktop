param([string]$HandleFile)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class RoomGeometry {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left,Top,Right,Bottom; }
 [StructLayout(LayoutKind.Sequential)] public struct Point {public int X,Y;}
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr w,out Rect r);
 [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr w,out Rect r);
 [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr w,ref Point p);
 [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr w,int index);
 [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr w);
 [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr context);
}
"@
[RoomGeometry]::SetProcessDpiAwarenessContext([IntPtr](-4)) | Out-Null
@(foreach($handle in (Get-Content -LiteralPath $HandleFile -Raw | ConvertFrom-Json)){
 $w=[IntPtr]([long]$handle)
 $r=New-Object RoomGeometry+Rect
 $c=New-Object RoomGeometry+Rect
 $p=New-Object RoomGeometry+Point
 [RoomGeometry]::GetWindowRect($w,[ref]$r)|Out-Null
 [RoomGeometry]::GetClientRect($w,[ref]$c)|Out-Null
 [RoomGeometry]::ClientToScreen($w,[ref]$p)|Out-Null
 [pscustomobject]@{handle=$handle;window=$r;client=$c;origin=$p;style=('{0:X}' -f [RoomGeometry]::GetWindowLong($w,-16));dpi=[RoomGeometry]::GetDpiForWindow($w)}
}) | ConvertTo-Json -Depth 4
