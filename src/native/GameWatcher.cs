using System;
using System.Diagnostics;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

internal static class GameWatcher
{
    [StructLayout(LayoutKind.Sequential)] private struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct MonitorInfo { public int Size; public Rect Monitor; public Rect Work; public uint Flags; }
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out Rect rect);
    [DllImport("dwmapi.dll")] private static extern int DwmGetWindowAttribute(IntPtr window, int attribute, out Rect value, int size);
    [DllImport("user32.dll")] private static extern IntPtr MonitorFromWindow(IntPtr window, uint flags);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [DllImport("user32.dll", EntryPoint="GetWindowLongW")] private static extern int GetWindowLong(IntPtr window, int index);
    [DllImport("user32.dll")] private static extern bool SetProcessDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] private static extern bool SetProcessDPIAware();
    [DllImport("shell32.dll")] private static extern int SHQueryUserNotificationState(out int state);
    [DllImport("kernel32.dll")] private static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] private static extern bool QueryFullProcessImageName(IntPtr process, uint flags, StringBuilder value, ref int size);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr handle);
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
    private static string Describe(uint pid, out bool installed)
    {
        installed = false;
        IntPtr handle = OpenProcess(0x1000, false, pid);
        if (handle == IntPtr.Zero) return "";
        try
        {
            var text = new StringBuilder(2048); int length = text.Capacity;
            if (!QueryFullProcessImageName(handle, 0, text, ref length)) return "";
            string value = text.ToString().ToLowerInvariant();
            installed = value.Contains("\\steamapps\\common\\") || value.Contains("\\epic games\\") || value.Contains("\\riot games\\") || value.Contains("\\gog galaxy\\games\\");
            try { var version = FileVersionInfo.GetVersionInfo(text.ToString()); return string.IsNullOrWhiteSpace(version.FileDescription) ? version.ProductName : version.FileDescription; } catch { return ""; }
        }
        finally { CloseHandle(handle); }
    }
    public static int Main(string[] args)
    {
        int parentId; if (args.Length != 1 || !int.TryParse(args[0], out parentId)) return 2;
        try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch { SetProcessDPIAware(); }
        try
        {
            int cycle = 0; int[] pids = new int[0]; uint lastPid = 0; string displayName = ""; bool installedGame = false;
            while (true)
            {
                try { using (var parent = Process.GetProcessById(parentId)) { if (parent.HasExited) return 0; } } catch (ArgumentException) { return 0; }
                if (cycle++ % 3 == 0)
                {
                    var ids = new List<int>();
                    foreach (var process in Process.GetProcesses()) { using (process) { ids.Add(process.Id); } }
                    ids.Sort(); pids = ids.ToArray();
                }
                var window = GetForegroundWindow(); uint pid = 0; GetWindowThreadProcessId(window, out pid);
                string exe = "";
                try { using (var process = Process.GetProcessById((int)pid)) { exe = process.ProcessName + ".exe"; } } catch { }
                if (pid != lastPid) { lastPid = pid; displayName = Describe(pid, out installedGame); }
                Rect bounds; bool hasBounds = GetWindowRect(window, out bounds);
                if (hasBounds) { Rect extended; if (DwmGetWindowAttribute(window, 9, out extended, Marshal.SizeOf(typeof(Rect))) == 0) bounds = extended; }
                var info = new MonitorInfo(); info.Size = Marshal.SizeOf(typeof(MonitorInfo));
                bool hasMonitor = GetMonitorInfo(MonitorFromWindow(window, 2), ref info);
                bool fullScreen = hasBounds && hasMonitor && Math.Abs(bounds.Left-info.Monitor.Left)<=6 && Math.Abs(bounds.Top-info.Monitor.Top)<=6 && Math.Abs(bounds.Right-info.Monitor.Right)<=6 && Math.Abs(bounds.Bottom-info.Monitor.Bottom)<=6;
                bool borderless = (GetWindowLong(window, -16) & 0x00C00000) == 0;
                int notificationState; if (SHQueryUserNotificationState(out notificationState) != 0) notificationState = 0;
                Console.WriteLine(Json.Serialize(new { available=true, foreground=new { pid=(int)pid, exe=exe, displayName=displayName, fullScreen=fullScreen, borderless=borderless, installedGame=installedGame }, runningPids=pids, notificationState=notificationState }));
                Console.Out.Flush(); Thread.Sleep(750);
            }
        }
        catch (Exception error) { Console.WriteLine(Json.Serialize(new { available=false, error=error.GetType().Name })); return 1; }
    }
}
