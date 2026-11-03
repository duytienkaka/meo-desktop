using System;using System.Runtime.InteropServices;
class WallpaperHost{
 delegate bool EnumProc(IntPtr h,IntPtr p);
 [DllImport("user32.dll",CharSet=CharSet.Auto)] static extern IntPtr FindWindow(string c,string n);
 [DllImport("user32.dll",CharSet=CharSet.Auto)] static extern IntPtr FindWindowEx(IntPtr p,IntPtr a,string c,string n);
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
 static int Main(string[] a){SetProcessDpiAwarenessContext(new IntPtr(-4));if(a[0]=="watch"){while(true){var b=new System.Text.StringBuilder(256);GetClassName(GetForegroundWindow(),b,256);Console.WriteLine(b.ToString()=="WorkerW"||b.ToString()=="Progman"?"desktop":"app");System.Threading.Thread.Sleep(500);}}IntPtr p=FindWindow("Progman",null),r,host=IntPtr.Zero;SendMessageTimeout(p,0x052C,new IntPtr(13),IntPtr.Zero,2,1000,out r);SendMessageTimeout(p,0x052C,new IntPtr(13),new IntPtr(1),2,1000,out r);EnumWindows((h,l)=>{if(FindWindowEx(h,IntPtr.Zero,"SHELLDLL_DefView",null)!=IntPtr.Zero)host=FindWindowEx(IntPtr.Zero,h,"WorkerW",null);return true;},IntPtr.Zero);if(host==IntPtr.Zero)host=FindWindowEx(p,IntPtr.Zero,"WorkerW",null);if(host==IntPtr.Zero)host=p;if(host==IntPtr.Zero)return 2;IntPtr child=new IntPtr(long.Parse(a[0]));SetWindowLong(child,-16,0x52000000);SetWindowLong(child,-20,GetWindowLong(child,-20)&~0x20301);SetParent(child,host);if(GetParent(child)!=host){Console.Error.WriteLine(Marshal.GetLastWin32Error());return 3;}MoveWindow(child,int.Parse(a[1]),int.Parse(a[2]),int.Parse(a[3]),int.Parse(a[4]),true);SetWindowPos(child,new IntPtr(1),0,0,0,0,0x33);Console.WriteLine("attached");return 0;}
}
