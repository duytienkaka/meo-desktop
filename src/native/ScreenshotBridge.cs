using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.IO;
using System.Collections.Specialized;
using System.Windows.Forms;
using System.Web.Script.Serialization;
internal static class ScreenshotBridge {
 [StructLayout(LayoutKind.Sequential)] struct RECT {public int Left,Top,Right,Bottom;}
 [StructLayout(LayoutKind.Sequential)] struct POINT {public int X,Y;}
 [StructLayout(LayoutKind.Sequential)] struct GUITHREADINFO {public int Size;public uint Flags;public IntPtr Active,Focus,Capture,MenuOwner,MoveSize,Caret;public RECT CaretRect;}
 [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT {public ushort Key,Scan;public uint Flags,Time;public UIntPtr Extra;}
 [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT {public int X,Y;public uint Data,Flags,Time;public UIntPtr Extra;}
 [StructLayout(LayoutKind.Explicit)] struct INPUTUNION {[FieldOffset(0)] public KEYBDINPUT Keyboard;[FieldOffset(0)] public MOUSEINPUT Mouse;}
 [StructLayout(LayoutKind.Sequential)] struct INPUT {public uint Type;public INPUTUNION Value;}
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
 [DllImport("user32.dll")] static extern bool GetGUIThreadInfo(uint thread,ref GUITHREADINFO info);
 [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr window,ref POINT point);
 [DllImport("user32.dll")] static extern bool GetCursorPos(out POINT point);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr window,out RECT rect);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr window,StringBuilder text,int capacity);
 [DllImport("user32.dll")] static extern bool IsWindow(IntPtr window);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
 [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
 [DllImport("user32.dll")] static extern bool ShowWindowAsync(IntPtr window,int command);
 [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr window);
 [DllImport("user32.dll")] static extern uint SendInput(uint count,INPUT[] inputs,int size);
 [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
 [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
 static readonly JavaScriptSerializer Json=new JavaScriptSerializer();
 static GUITHREADINFO Info(){var info=new GUITHREADINFO();info.Size=Marshal.SizeOf(info);GetGUIThreadInfo(0,ref info);return info;}
 static object Target(int parent){
  IntPtr window=GetForegroundWindow();uint pid;GetWindowThreadProcessId(window,out pid);
  if(pid==parent)return new {own=true};
  if(window==IntPtr.Zero||pid==0||!IsWindowVisible(window))return new {available=false};
  try{using(var process=Process.GetProcessById((int)pid)){
   string name=process.ProcessName;if(name.Equals("explorer",StringComparison.OrdinalIgnoreCase)||name.Equals("dwm",StringComparison.OrdinalIgnoreCase)||name.Equals("SearchHost",StringComparison.OrdinalIgnoreCase)||name.Equals("StartMenuExperienceHost",StringComparison.OrdinalIgnoreCase)||name.Equals("LockApp",StringComparison.OrdinalIgnoreCase))return new {available=false};
   var text=new StringBuilder(512);GetWindowText(window,text,text.Capacity);if(text.Length==0)return new {available=false};
   var info=Info();POINT point;GetCursorPos(out point);bool caret=info.Caret!=IntPtr.Zero;
   if(caret){point.X=info.CaretRect.Left;point.Y=info.CaretRect.Bottom;ClientToScreen(info.Caret,ref point);}
   RECT bounds;GetWindowRect(window,out bounds);
   if(point.X<bounds.Left||point.X>bounds.Right||point.Y<bounds.Top||point.Y>bounds.Bottom){point.X=(bounds.Left+bounds.Right)/2;point.Y=(bounds.Top+bounds.Bottom)/2;}
   return new {available=true,own=false,hwnd=window.ToInt64().ToString(),pid=(int)pid,focus=info.Focus.ToInt64().ToString(),name=name,title=text.ToString(),x=point.X,y=point.Y,caret=caret};
  }}catch{return new {available=false};}
 }
 static INPUT Key(ushort key,bool up){var input=new INPUT();input.Type=1;input.Value.Keyboard=new KEYBDINPUT{Key=key,Flags=up?2u:0u};return input;}
 static int Paste(string[] args){
  long handle,focus;int expectedPid,parent;if(args.Length!=5||!long.TryParse(args[1],out handle)||!int.TryParse(args[2],out expectedPid)||!long.TryParse(args[3],out focus)||!int.TryParse(args[4],out parent))return 2;
  var window=new IntPtr(handle);uint pid;GetWindowThreadProcessId(window,out pid);if(pid!=expectedPid||pid==parent||!IsWindow(window)||!IsWindowVisible(window))throw new InvalidOperationException("TargetClosed");
  var current=GetForegroundWindow();uint currentPid;GetWindowThreadProcessId(current,out currentPid);
  // Only return to the explicitly selected app from Mèo. Never steal a newer app selection.
  if(current!=window&&currentPid!=parent)throw new InvalidOperationException("TargetChanged");
  if(IsIconic(window))ShowWindowAsync(window,9);if(current!=window)SetForegroundWindow(window);
  for(int i=0;i<15&&GetForegroundWindow()!=window;i++)Thread.Sleep(20);
  if(GetForegroundWindow()!=window)throw new InvalidOperationException("CannotActivateTarget");
  var info=Info();if(focus!=0&&info.Focus.ToInt64()!=focus)throw new InvalidOperationException("InputChanged");
  if((GetAsyncKeyState(0x11)&0x8000)!=0||(GetAsyncKeyState(0x10)&0x8000)!=0||(GetAsyncKeyState(0x12)&0x8000)!=0||(GetAsyncKeyState(0x5B)&0x8000)!=0||(GetAsyncKeyState(0x5C)&0x8000)!=0)throw new InvalidOperationException("ReleaseModifierKeys");
  var inputs=new[]{Key(0x11,false),Key(0x56,false),Key(0x56,true),Key(0x11,true)};
  uint sent=SendInput((uint)inputs.Length,inputs,Marshal.SizeOf(typeof(INPUT)));if(sent!=4){SendInput(2,new[]{Key(0x56,true),Key(0x11,true)},Marshal.SizeOf(typeof(INPUT)));throw new InvalidOperationException("PasteBlocked");}
  Console.WriteLine(Json.Serialize(new {success=true}));return 0;
 }
 static int Files(string[] args){if(args.Length<2||args.Length>4)return 2;var files=new StringCollection();for(int i=1;i<args.Length;i++){string file=Path.GetFullPath(args[i]);if(!Path.IsPathRooted(args[i])||!File.Exists(file)||!file.EndsWith(".png",StringComparison.OrdinalIgnoreCase))throw new ArgumentException("InvalidImageFile");files.Add(file);}Clipboard.SetFileDropList(files);Console.WriteLine(Json.Serialize(new {success=true,count=files.Count}));return 0;}
 [STAThread] public static int Main(string[] args){Console.OutputEncoding=new UTF8Encoding(false);try{SetProcessDpiAwarenessContext(new IntPtr(-4));}catch{}
  try{
   if(args.Length==0)return 2;if(args[0]=="paste")return Paste(args);if(args[0]=="files")return Files(args);
   int parent;if(args.Length!=2||args[0]!="watch"||!int.TryParse(args[1],out parent))return 2;
   while(true){try{using(var process=Process.GetProcessById(parent)){if(process.HasExited)return 0;}}catch{return 0;}Console.WriteLine(Json.Serialize(Target(parent)));Console.Out.Flush();Thread.Sleep(450);}
  }catch(Exception error){Console.WriteLine(Json.Serialize(new {success=false,error=error.Message}));return 1;}
 }
}
