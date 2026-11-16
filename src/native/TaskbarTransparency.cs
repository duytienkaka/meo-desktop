// SPDX-License-Identifier: GPL-3.0-or-later
// Separate Windows helper using TranslucentTB ExplorerTAP 2026.2.
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.IO;
class TaskbarTransparency {
 [ComImport,Guid("5bcf9150-c28a-4ef2-913c-4c3ea2f5ead0"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
 interface Appearance {
  [PreserveSig]int SetTaskbarAppearance(IntPtr bar,int brush,uint color);
  [PreserveSig]int SetTaskbarBlur(IntPtr bar,uint color,float amount);
  [PreserveSig]int ReturnTaskbarToDefaultAppearance(IntPtr bar);
  [PreserveSig]int SetTaskbarBorderVisibility(IntPtr bar,[MarshalAs(UnmanagedType.Bool)]bool visible);
  [PreserveSig]int RestoreAllTaskbarsToDefault();
  [PreserveSig]int RestoreAllTaskbarsToDefaultWhenProcessDies(uint pid);
  [PreserveSig]int KillExplorerWhenPackageUninstalls([MarshalAs(UnmanagedType.LPWStr)]string package);
 }
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)]delegate int Inject(IntPtr bar,ref Guid iid,[MarshalAs(UnmanagedType.Interface)]out Appearance service);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr LoadLibraryEx(string path,IntPtr file,uint flags);
 [DllImport("kernel32.dll",CharSet=CharSet.Ansi)]static extern IntPtr GetProcAddress(IntPtr module,string name);
 [DllImport("user32.dll",CharSet=CharSet.Auto)]static extern IntPtr FindWindow(string cls,string name);
 [DllImport("user32.dll")]static extern bool IsWindow(IntPtr window);
 [DllImport("user32.dll")]static extern bool IsWindowVisible(IntPtr window);
 [DllImport("user32.dll")]static extern bool SetWindowPos(IntPtr window,IntPtr after,int x,int y,int width,int height,uint flags);
 [DllImport("user32.dll")]static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
 [DllImport("user32.dll")]static extern IntPtr GetWindow(IntPtr window,uint command);
 static volatile bool stopping=false;
 static long wave=0,disc=0;static int layerRequest=0,glassOpacity=40,glassVersion=0;static bool lightTheme=true;
 static void ReadCommands(){
  try{
   string line;while((line=Console.ReadLine())!=null){
    if(line=="stop")break;
    var parts=line.Split(' ');long handle;
    if(parts.Length==2&&long.TryParse(parts[1],out handle)){
     if(parts[0]=="wave"){Interlocked.Exchange(ref wave,handle);Interlocked.Increment(ref layerRequest);}
     if(parts[0]=="glass"){Interlocked.Exchange(ref glassOpacity,(int)Math.Max(20,Math.Min(80,handle)));Interlocked.Increment(ref glassVersion);}
     if(parts[0]=="disc")Interlocked.Exchange(ref disc,handle);
    }
   }
  }finally{stopping=true;}
 }
 static bool Owned(IntPtr window,int pid){
  uint owner;GetWindowThreadProcessId(window,out owner);return IsWindow(window)&&owner==(uint)pid;
 }

 static void ApplyGlass(Appearance service,IntPtr window,bool waveVisible){
  bool light=Convert.ToInt32(Microsoft.Win32.Registry.GetValue(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize","SystemUsesLightTheme",1))!=0;
  lightTheme=light;
  uint alpha=(uint)(Interlocked.CompareExchange(ref glassOpacity,0,0)*255/100);
  uint tint=(alpha<<24)|(light?0x00fff8f5u:0x00251b16u);
  Marshal.ThrowExceptionForHR(service.SetTaskbarAppearance(window,waveVisible?1:0,tint));
  Marshal.ThrowExceptionForHR(service.SetTaskbarBorderVisibility(window,true));
 }
 [STAThread]static int Main(string[] args){
  if(args.Length<2)return 2;
  Appearance service=null;
  try{
   var module=LoadLibraryEx(Path.GetFullPath(args[1]),IntPtr.Zero,0x1100);
   if(module==IntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
   var address=GetProcAddress(module,"InjectExplorerTAP");
   if(address==IntPtr.Zero)throw new Exception("ExplorerTAP export unavailable");
   if(args[0]=="probe"){Console.WriteLine("probe-ok");return 0;}
   int pid=int.Parse(args[0]);if(args.Length>2)glassOpacity=Math.Max(20,Math.Min(80,int.Parse(args[2])));
   var inject=(Inject)Marshal.GetDelegateForFunctionPointer(address,typeof(Inject));
   var iid=typeof(Appearance).GUID;
   var bar=FindWindow("Shell_TrayWnd",null);
   Marshal.ThrowExceptionForHR(inject(bar,ref iid,out service));
   Marshal.ThrowExceptionForHR(service.RestoreAllTaskbarsToDefaultWhenProcessDies((uint)Process.GetCurrentProcess().Id));
   ApplyGlass(service,bar,false);
   Console.WriteLine("ready");Console.Out.Flush();
   var reader=new Thread(ReadCommands);reader.IsBackground=true;reader.Start();
   bool lastWaveVisible=false;IntPtr themedWindow=IntPtr.Zero;int previousDark=-1;int placedRequest=-1,appliedGlass=-1;DateTime nextApply=DateTime.MinValue;
   using(var parent=Process.GetProcessById(pid)){
    while(!stopping&&!parent.HasExited){
     var currentBar=FindWindow("Shell_TrayWnd",null);
     if(currentBar!=bar)throw new Exception("Explorer restarted");
     var waveHandle=new IntPtr(Interlocked.Read(ref wave));
     bool waveVisible=Owned(waveHandle,pid)&&IsWindowVisible(waveHandle);
     if(waveVisible!=lastWaveVisible||DateTime.UtcNow>=nextApply||appliedGlass!=Interlocked.CompareExchange(ref glassVersion,0,0)){
      EnumWindows((window,param)=>{
       var name=new System.Text.StringBuilder(64);GetClassName(window,name,64);
       if(name.ToString()=="Shell_TrayWnd"||name.ToString()=="Shell_SecondaryTrayWnd"){
        ApplyGlass(service,window,window==bar&&waveVisible);
       }
       return true;
      },IntPtr.Zero);
      lastWaveVisible=waveVisible;appliedGlass=Interlocked.CompareExchange(ref glassVersion,0,0);nextApply=DateTime.UtcNow.AddSeconds(1);
     }
     var w=new IntPtr(Interlocked.Read(ref wave));
     var d=new IntPtr(Interlocked.Read(ref disc));
     if(Owned(w,pid)){
      int dark=lightTheme?0:1;
      if(w!=themedWindow||dark!=previousDark){DwmSetWindowAttribute(w,20,ref dark,4);themedWindow=w;previousDark=dark;}
      if(GetWindow(w,3)!=bar&&!SetWindowPos(w,bar,0,0,0,0,0x13))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
      int request=Interlocked.CompareExchange(ref layerRequest,0,0);
      if(placedRequest!=request){Console.WriteLine("layered "+w.ToInt64());Console.Out.Flush();placedRequest=request;}
     }
     if(Owned(d,pid)&&IsWindowVisible(d)&&GetWindow(d,3)!=IntPtr.Zero)SetWindowPos(d,new IntPtr(-1),0,0,0,0,0x13);
     Thread.Sleep(80);
    }
   }
   return 0;
  }catch(Exception error){Console.WriteLine("error "+error.GetType().Name+" "+error.Message.Replace("\n"," "));return 1;}
  finally{if(service!=null){try{service.RestoreAllTaskbarsToDefault();Marshal.ReleaseComObject(service);}catch{}}}
 }
 [DllImport("dwmapi.dll")]static extern int DwmSetWindowAttribute(IntPtr window,int attribute,ref int value,int size);
 delegate bool EnumCallback(IntPtr window,IntPtr param);
 [DllImport("user32.dll")]static extern bool EnumWindows(EnumCallback callback,IntPtr param);
 [DllImport("user32.dll",CharSet=CharSet.Auto)]static extern int GetClassName(IntPtr window,System.Text.StringBuilder text,int length);
}
