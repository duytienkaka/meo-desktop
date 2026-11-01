using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

// Observe window transitions outside other processes; never inject or activate a window.
internal static class OverlayWatcher {
 [StructLayout(LayoutKind.Sequential)] struct RECT { public int Left,Top,Right,Bottom; }
 delegate void WinEvent(IntPtr hook,uint type,IntPtr window,int obj,int child,uint thread,uint time);
 [DllImport("user32.dll")] static extern IntPtr SetWinEventHook(uint min,uint max,IntPtr module,WinEvent callback,uint process,uint thread,uint flags);
 [DllImport("user32.dll")] static extern bool UnhookWinEvent(IntPtr hook);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr window,uint command);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr window,out RECT rect);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
 [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window,out uint process);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr window,StringBuilder text,int length);
 static IntPtr target;static uint parent;static string previous="";static Timer pending;
 static bool Above(IntPtr front,IntPtr back){for(IntPtr h=GetWindow(back,3);h!=IntPtr.Zero;h=GetWindow(h,3))if(h==front)return true;return false;}
 static void Check(){
  pending.Stop();IntPtr foreground=GetForegroundWindow();uint pid;
  GetWindowThreadProcessId(foreground,out pid);
  if(pid==parent||foreground==IntPtr.Zero||!IsWindowVisible(target)||IsIconic(target)||!IsWindowVisible(foreground)||IsIconic(foreground))return;
  var name=new StringBuilder(128);GetClassName(foreground,name,name.Capacity);
  if(name.ToString()=="Progman"||name.ToString()=="WorkerW"||name.ToString().StartsWith("Shell_"))return;
  RECT a,b;if(!GetWindowRect(target,out a)||!GetWindowRect(foreground,out b))return;
  string key=foreground+":"+b.Left+":"+b.Top+":"+b.Right+":"+b.Bottom;
  if(key==previous)return;
  if(a.Left<b.Right&&a.Right>b.Left&&a.Top<b.Bottom&&a.Bottom>b.Top&&Above(foreground,target)){previous=key;Console.WriteLine("raise");Console.Out.Flush();}
 }
 static void Changed(IntPtr hook,uint type,IntPtr window,int obj,int child,uint thread,uint time){
  if(type==3||(type==0x8002&&window==target&&obj==0)){previous="";}
  else if(type==0x8004){} // Desktop stacking changes may use OBJID_CLIENT.
  else if((type!=0x800B&&type!=0x8002)||obj!=0||child!=0||window!=GetForegroundWindow())return;
  if(!pending.Enabled)pending.Start(); // Coalesce bursts without starving a repair.
 }
 [STAThread] public static int Main(string[] args){
  long handle;if(args.Length!=2||!uint.TryParse(args[0],out parent)||!long.TryParse(args[1],out handle))return 2;
  target=new IntPtr(handle);uint owner;GetWindowThreadProcessId(target,out owner);if(owner!=parent)return 3;
  Console.OutputEncoding=new UTF8Encoding(false);pending=new Timer{Interval=180};pending.Tick+=(s,e)=>Check();
  WinEvent callback=Changed;
  IntPtr foregroundHook=SetWinEventHook(3,3,IntPtr.Zero,callback,0,0,0);
  IntPtr locationHook=SetWinEventHook(0x8002,0x800B,IntPtr.Zero,callback,0,0,0);
  if(foregroundHook==IntPtr.Zero||locationHook==IntPtr.Zero){if(foregroundHook!=IntPtr.Zero)UnhookWinEvent(foregroundHook);if(locationHook!=IntPtr.Zero)UnhookWinEvent(locationHook);return 4;}
  var lifetime=new Timer{Interval=1000};lifetime.Tick+=(s,e)=>{try{using(var process=Process.GetProcessById((int)parent)){if(process.HasExited)Application.Exit();}}catch{Application.Exit();}};
  lifetime.Start();pending.Start();
  try{Application.Run();}finally{UnhookWinEvent(foregroundHook);UnhookWinEvent(locationHook);pending.Dispose();lifetime.Dispose();GC.KeepAlive(callback);}
  return 0;
 }
}
