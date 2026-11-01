using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
internal static class OverlayFixture {
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h,uint cmd);
 [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int w,int height,uint flags);
 static bool Above(IntPtr front,IntPtr back){for(IntPtr h=GetWindow(back,3);h!=IntPtr.Zero;h=GetWindow(h,3))if(h==front)return true;return false;}
 [STAThread] static void Main(string[] args){
  var target=new IntPtr(long.Parse(args[0]));var form=new Form{Text="Mèo overlay test",FormBorderStyle=FormBorderStyle.None,BackColor=Color.FromArgb(32,36,44),StartPosition=FormStartPosition.Manual,Bounds=Screen.PrimaryScreen.Bounds};
  form.Shown+=(s,e)=>{
   Console.WriteLine("ready");Console.Out.Flush();
   var reader=new Thread(()=>{try{string line;while((line=Console.ReadLine())!=null){string command=line;form.BeginInvoke(new Action(()=>{
    if(command=="cover"){form.Bounds=Screen.PrimaryScreen.Bounds;SetWindowPos(form.Handle,new IntPtr(-1),0,0,0,0,3);form.Activate();}
    if(command=="resize"){form.Width-=20;}
    if(command=="query"){Console.WriteLine("{\"above\":"+Above(target,form.Handle).ToString().ToLower()+",\"focused\":"+(GetForegroundWindow()==form.Handle).ToString().ToLower()+"}");Console.Out.Flush();}
    if(command=="quit")form.Close();
   }));}}catch{}});reader.IsBackground=true;reader.Start();
  };Application.Run(form);
 }
}
