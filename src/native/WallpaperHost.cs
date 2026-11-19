using System;using System.Runtime.InteropServices;
class WallpaperHost{
 delegate bool EnumProc(IntPtr h,IntPtr p);
 [DllImport("user32.dll",CharSet=CharSet.Auto)] static extern IntPtr FindWindow(string c,string n);
 [DllImport("user32.dll",CharSet=CharSet.Auto)] static extern IntPtr FindWindowEx(IntPtr p,IntPtr a,string c,string n);
 [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr parent,EnumProc callback,IntPtr param);
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p,IntPtr l);
 [DllImport("user32.dll")] static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint f,uint t,out IntPtr r);
 [DllImport("user32.dll",SetLastError=true)] static extern IntPtr SetParent(IntPtr h,IntPtr p);
 [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr h);
 [DllImport("user32.dll")] static extern bool MoveWindow(IntPtr h,int x,int y,int w,int t,bool r);
 [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int w,int hgt,uint f);
 [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h,int i);
 [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr h,int i,int v);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll",CharSet=CharSet.Auto)] static extern int GetClassName(IntPtr h,System.Text.StringBuilder s,int n);
 [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
 [StructLayout(LayoutKind.Sequential)] struct Point { public int X; public int Y; }
 [DllImport("user32.dll")] static extern bool ScreenToClient(IntPtr window,ref Point point);

 [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left,Top,Right,Bottom; }
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr window,out Rect rect);
 [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr window,out Rect rect);
 [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr window,ref Point point);
 // Chromium retains an invisible non-client inset after reparenting a frameless window.
 // Fit its painted client area, measuring again after each DPI-sensitive resize.
 static bool FitClient(IntPtr child,IntPtr host,int x,int y,int width,int height){
  for(int attempt=0;attempt<4;attempt++){
   Rect outer,client;
   var origin=new Point();
   if(!GetWindowRect(child,out outer)||!GetClientRect(child,out client)||!ClientToScreen(child,ref origin))return false;
   int clientWidth=client.Right-client.Left,clientHeight=client.Bottom-client.Top;
   if(origin.X==x&&origin.Y==y&&clientWidth==width&&clientHeight==height)return true;
   var adjusted=new Point { X=outer.Left+x-origin.X,Y=outer.Top+y-origin.Y };
   if(!ScreenToClient(host,ref adjusted))return false;
   if(!MoveWindow(child,adjusted.X,adjusted.Y,outer.Right-outer.Left+width-clientWidth,outer.Bottom-outer.Top+height-clientHeight,true))return false;
  }
  Rect finalClient;var finalOrigin=new Point();
  return GetClientRect(child,out finalClient)&&ClientToScreen(child,ref finalOrigin)&&finalOrigin.X==x&&finalOrigin.Y==y&&finalClient.Right==width&&finalClient.Bottom==height;
 }

 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
 [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr window);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
 [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr window,uint flags);
 [StructLayout(LayoutKind.Sequential)] struct MonitorInfo { public int Size; public Rect Monitor; public Rect Work; public uint Flags; }
 [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr monitor,ref MonitorInfo info);

 static volatile string protectedRegions="";
 static bool Intersects(Rect a,Rect b){return a.Left<b.Right&&a.Right>b.Left&&a.Top<b.Bottom&&a.Bottom>b.Top;}
 static string ReadProtectedRegions(IntPtr bar){
  Rect barBounds;
  if(bar==IntPtr.Zero||!GetWindowRect(bar,out barBounds))return "";
  var areas=new System.Collections.Generic.List<Rect>();
  var taskLists=new System.Collections.Generic.List<Rect>();
  var shellControl=new System.Text.StringBuilder(128);
  // These controls still have separate child windows in the classic Windows 10 taskbar.
  EnumChildWindows(bar,(child,param)=>{
   if(!IsWindowVisible(child))return true;
   shellControl.Clear();GetClassName(child,shellControl,shellControl.Capacity);
   string kind=shellControl.ToString();
   Rect bounds;
   if(!GetWindowRect(child,out bounds)||!Intersects(bounds,barBounds))return true;
   if(kind=="MSTaskListWClass")taskLists.Add(bounds);
   else if(kind=="TrayNotifyWnd"||kind=="Start"||kind=="TrayButton"||kind=="TrayDummySearchControl"||kind=="SearchBox"||kind=="TrayShowDesktopButton")areas.Add(bounds);
   return true;
  },IntPtr.Zero);
  var accessible=new System.Collections.Generic.List<Rect>();
  try{
   var root=System.Windows.Automation.AutomationElement.FromHandle(bar);
   var types=new System.Collections.Generic.List<System.Windows.Automation.Condition>();
   foreach(var type in new[]{System.Windows.Automation.ControlType.Button,System.Windows.Automation.ControlType.Text,System.Windows.Automation.ControlType.ListItem,System.Windows.Automation.ControlType.TabItem})
    types.Add(new System.Windows.Automation.PropertyCondition(System.Windows.Automation.AutomationElement.ControlTypeProperty,type));
   if(taskLists.Count==0)types.Add(new System.Windows.Automation.PropertyCondition(System.Windows.Automation.AutomationElement.ControlTypeProperty,System.Windows.Automation.ControlType.Group));
   var elements=root.FindAll(System.Windows.Automation.TreeScope.Descendants,new System.Windows.Automation.OrCondition(types.ToArray()));
   foreach(System.Windows.Automation.AutomationElement element in elements){
    try{
     var current=element.Current;
     var bounds=current.BoundingRectangle;
     if(current.IsOffscreen||bounds.IsEmpty||bounds.Width<=0||bounds.Height<=0)continue;
     var rect=new Rect{Left=(int)Math.Floor(bounds.Left),Top=(int)Math.Floor(bounds.Top),Right=(int)Math.Ceiling(bounds.Right),Bottom=(int)Math.Ceiling(bounds.Bottom)};
     if(Intersects(rect,barBounds))accessible.Add(rect);
    }catch(System.Windows.Automation.ElementNotAvailableException){}
   }
  }catch{}
  foreach(Rect taskList in taskLists)
   if(!accessible.Exists(rect=>Intersects(rect,taskList)))areas.Add(taskList);
  areas.AddRange(accessible);
  return string.Join("|",areas.ConvertAll(r=>string.Format("{0},{1},{2},{3}",r.Left,r.Top,r.Right-r.Left,r.Bottom-r.Top)).ToArray());
 }
 static void WatchProtectedRegions(){
  while(true){
   try{protectedRegions=ReadProtectedRegions(FindWindow("Shell_TrayWnd",null));}
   catch{protectedRegions="";}
   System.Threading.Thread.Sleep(400);
  }
 }
 static void WatchTaskbar(){
  string previous="",previousRegions=null;IntPtr lastForeground=IntPtr.Zero;bool shellForeground=false;
  var regionThread=new System.Threading.Thread(WatchProtectedRegions);regionThread.IsBackground=true;regionThread.SetApartmentState(System.Threading.ApartmentState.MTA);regionThread.Start();
  while(true){
   string sample="0 0 0 0 0";
   var bar=FindWindow("Shell_TrayWnd",null);Rect bounds;
   var info=new MonitorInfo { Size=Marshal.SizeOf(typeof(MonitorInfo)) };
   bool visible=bar!=IntPtr.Zero&&IsWindowVisible(bar);
   if(bar!=IntPtr.Zero&&GetWindowRect(bar,out bounds)&&GetMonitorInfo(MonitorFromWindow(bar,2),ref info)){
    int visibleHeight=Math.Min(bounds.Bottom,info.Monitor.Bottom)-Math.Max(bounds.Top,info.Monitor.Top);
    int visibleWidth=Math.Min(bounds.Right,info.Monitor.Right)-Math.Max(bounds.Left,info.Monitor.Left);
    visible=visible&&visibleHeight>=bounds.Bottom-bounds.Top-2&&visibleWidth>=bounds.Right-bounds.Left-2;
    var foreground=GetForegroundWindow();Rect front;var frontOrigin=new Point();
    if(foreground!=lastForeground){
     lastForeground=foreground;shellForeground=false;
     try{uint pid;GetWindowThreadProcessId(foreground,out pid);using(var process=System.Diagnostics.Process.GetProcessById((int)pid)){var processName=process.ProcessName.ToLowerInvariant();shellForeground=processName=="explorer"||processName=="startmenuexperiencehost"||processName=="searchhost"||processName=="shellexperiencehost";}}catch{}
     Console.WriteLine("raise");
    }
    var name=new System.Text.StringBuilder(256);GetClassName(foreground,name,256);
    if(name.ToString()!="Progman"&&name.ToString()!="WorkerW"&&foreground!=bar&&!shellForeground&&!IsZoomed(foreground)&&GetClientRect(foreground,out front)&&ClientToScreen(foreground,ref frontOrigin)&&frontOrigin.X<=info.Monitor.Left&&frontOrigin.Y<=info.Monitor.Top&&frontOrigin.X+front.Right>=info.Monitor.Right&&frontOrigin.Y+front.Bottom>=info.Monitor.Bottom)visible=false;
    sample=String.Format("{0} {1} {2} {3} {4}",bounds.Left,bounds.Top,bounds.Right-bounds.Left,bounds.Bottom-bounds.Top,visible?1:0);
   }
   var regions=protectedRegions;if(regions!=previousRegions){Console.WriteLine("mask "+regions);previousRegions=regions;}
   if(sample!=previous){Console.WriteLine(sample);previous=sample;}
   System.Threading.Thread.Sleep(33);
  }
 }

 static int Main(string[] a){try{SetProcessDpiAwarenessContext(new IntPtr(-4));}catch(EntryPointNotFoundException){}if(a[0]=="taskbar"){WatchTaskbar();return 0;}if(a[0]=="watch"){while(true){var b=new System.Text.StringBuilder(256);GetClassName(GetForegroundWindow(),b,256);Console.WriteLine(b.ToString()=="WorkerW"||b.ToString()=="Progman"?"desktop":"app");System.Threading.Thread.Sleep(500);}}IntPtr p=FindWindow("Progman",null),r,host=IntPtr.Zero;EnumWindows((h,l)=>{if(FindWindowEx(h,IntPtr.Zero,"SHELLDLL_DefView",null)!=IntPtr.Zero)host=FindWindowEx(IntPtr.Zero,h,"WorkerW",null);return true;},IntPtr.Zero);if(host==IntPtr.Zero)host=FindWindowEx(p,IntPtr.Zero,"WorkerW",null);if(host==IntPtr.Zero){SendMessageTimeout(p,0x052C,new IntPtr(13),IntPtr.Zero,2,1000,out r);SendMessageTimeout(p,0x052C,new IntPtr(13),new IntPtr(1),2,1000,out r);EnumWindows((h,l)=>{if(FindWindowEx(h,IntPtr.Zero,"SHELLDLL_DefView",null)!=IntPtr.Zero)host=FindWindowEx(IntPtr.Zero,h,"WorkerW",null);return true;},IntPtr.Zero);}if(host==IntPtr.Zero)host=FindWindowEx(p,IntPtr.Zero,"WorkerW",null);if(host==IntPtr.Zero)host=p;if(host==IntPtr.Zero)return 2;IntPtr child=new IntPtr(long.Parse(a[0]));SetWindowLong(child,-16,0x52000000);SetWindowLong(child,-20,GetWindowLong(child,-20)&~0x20301);SetParent(child,host);if(GetParent(child)!=host){Console.Error.WriteLine(Marshal.GetLastWin32Error());return 3;}var origin=new Point { X=int.Parse(a[1]),Y=int.Parse(a[2]) };ScreenToClient(host,ref origin);MoveWindow(child,origin.X,origin.Y,int.Parse(a[3]),int.Parse(a[4]),true);SetWindowPos(child,new IntPtr(1),0,0,0,0,0x33);if(!FitClient(child,host,int.Parse(a[1]),int.Parse(a[2]),int.Parse(a[3]),int.Parse(a[4]))){Console.Error.WriteLine("Wallpaper client area did not match the monitor bounds.");return 4;}Console.WriteLine("attached");return 0;}
}
