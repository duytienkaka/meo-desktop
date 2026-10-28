using System;
using System.Diagnostics;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using Windows.Foundation;
using Windows.Media.Control;
using Windows.Storage.Streams;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Globalization;

// Reads Windows media sessions; transport commands run only on an explicit user request.
internal static class MediaWatcher
{
    private delegate bool WindowVisitor(IntPtr window, IntPtr data);
    [DllImport("user32.dll")] private static extern bool EnumWindows(WindowVisitor visitor,IntPtr data);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] private static extern bool ShowWindowAsync(IntPtr window,int command);
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window,out uint process);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] private static extern int GetWindowText(IntPtr window,StringBuilder text,int length);
    [ComImport,Guid("2e941141-7f97-4756-ba1d-9decde894a3d"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IApplicationActivationManager {
        [PreserveSig] int ActivateApplication([MarshalAs(UnmanagedType.LPWStr)] string id,[MarshalAs(UnmanagedType.LPWStr)] string arguments,uint options,out uint process);
    }
    private static bool OpenSource(string source,string title)
    {
        // Store sessions expose an AUMID. Ask Windows to activate that exact app.
        if(source.Contains("!")) {
            object instance=null;
            try {instance=Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")));uint process;return ((IApplicationActivationManager)instance).ActivateApplication(source,null,2,out process)>=0;}
            catch{return false;}finally{if(instance!=null)Marshal.ReleaseComObject(instance);}
        }
        string executable=Path.GetFileNameWithoutExtension(source);IntPtr selected=IntPtr.Zero;int best=-1;
        EnumWindows(delegate(IntPtr window,IntPtr data){
            if(!IsWindowVisible(window))return true;
            try {uint pid;GetWindowThreadProcessId(window,out pid);using(var process=Process.GetProcessById((int)pid)) {
                if(!string.Equals(process.ProcessName,executable,StringComparison.OrdinalIgnoreCase))return true;
                var text=new StringBuilder(1024);GetWindowText(window,text,text.Capacity);if(text.Length==0)return true;
                int score=(!string.IsNullOrWhiteSpace(title)&&text.ToString().IndexOf(title,StringComparison.OrdinalIgnoreCase)>=0?10:0)+(IsIconic(window)?0:1);
                if(score>best){best=score;selected=window;}
            }}catch{}return true;
        },IntPtr.Zero);
        if(selected==IntPtr.Zero)return false;
        if(IsIconic(selected))ShowWindowAsync(selected,9);
        return SetForegroundWindow(selected);
    }
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
    private static T Wait<T>(IAsyncOperation<T> operation, int seconds)
    {
        var deadline = DateTime.UtcNow.AddSeconds(seconds);
        while (operation.Status == AsyncStatus.Started) { if (DateTime.UtcNow > deadline) { operation.Cancel(); throw new TimeoutException(); } Thread.Sleep(20); }
        return operation.GetResults();
    }
    private static string Text(string value) { if (value == null) return ""; return value.Length > 200 ? value.Substring(0,200) : value; }
    private static string Artwork(GlobalSystemMediaTransportControlsSessionMediaProperties properties)
    {
        if(properties.Thumbnail==null)return "";
        try {
            using(var stream=Wait(properties.Thumbnail.OpenReadAsync(),2)) {
                if(stream.Size==0||stream.Size>4*1024*1024)return "";
                using(var reader=new DataReader(stream)) {
                    uint count=Wait(reader.LoadAsync((uint)stream.Size),2);var bytes=new byte[count];reader.ReadBytes(bytes);
                    using(var input=new MemoryStream(bytes)) using(var image=Image.FromStream(input)) using(var bitmap=new Bitmap(192,192)) using(var graphics=Graphics.FromImage(bitmap)) using(var output=new MemoryStream()) {
                        graphics.Clear(Color.Black);graphics.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                        double scale=Math.Max(192.0/image.Width,192.0/image.Height);int width=(int)(image.Width*scale),height=(int)(image.Height*scale);
                        graphics.DrawImage(image,(192-width)/2,(192-height)/2,width,height);bitmap.Save(output,ImageFormat.Png);
                        return "data:image/png;base64,"+Convert.ToBase64String(output.ToArray());
                    }
                }
            }
        } catch {return "";}
    }
    private static GlobalSystemMediaTransportControlsSession Select(GlobalSystemMediaTransportControlsSessionManager manager, string previous)
    {
        var current=manager.GetCurrentSession();
        try { if(current!=null && current.GetPlaybackInfo().PlaybackStatus==GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing) return current; } catch {}
        foreach(var session in manager.GetSessions()) { try { if(session.GetPlaybackInfo().PlaybackStatus==GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing) return session; } catch {} }
        foreach(var session in manager.GetSessions()) { try { if(session.SourceAppUserModelId==previous) return session; } catch {} }
        if(current!=null) return current;
        foreach(var session in manager.GetSessions()) return session;
        return null;
    }
    private static int Command(GlobalSystemMediaTransportControlsSessionManager manager, string action, string source, string position)
    {
        if(action!="play" && action!="pause" && action!="previous" && action!="next" && action!="open" && action!="seek") throw new ArgumentException();
        GlobalSystemMediaTransportControlsSession target=null;
        var current=manager.GetCurrentSession();
        if(current!=null && current.SourceAppUserModelId==source) target=current;
        if(target==null) foreach(var session in manager.GetSessions()) if(session.SourceAppUserModelId==source) { target=session; break; }
        if(target==null) { Console.WriteLine(Json.Serialize(new { success=false, error="SessionClosed" })); return 0; }
        if(action=="open") {string title="";try{title=Wait(target.TryGetMediaPropertiesAsync(),2).Title;}catch{}bool opened=OpenSource(source,title);Console.WriteLine(Json.Serialize(new {success=opened,error=opened?"":"WindowUnavailable"}));return 0;}
        var controls=target.GetPlaybackInfo().Controls;
        if(action=="seek") {
            double seconds;bool sought=false;
            if(controls.IsPlaybackPositionEnabled&&double.TryParse(position,NumberStyles.Float,CultureInfo.InvariantCulture,out seconds)&&!double.IsNaN(seconds)&&!double.IsInfinity(seconds)&&seconds>=0&&seconds<=604800) {
                var timeline=target.GetTimelineProperties();double duration=(timeline.EndTime-timeline.StartTime).TotalSeconds;
                if(duration>0&&seconds<=duration)sought=Wait(target.TryChangePlaybackPositionAsync(timeline.StartTime.Ticks+(long)(seconds*TimeSpan.TicksPerSecond)),4);
            }
            Console.WriteLine(Json.Serialize(new {success=sought,error=sought?"":"SeekUnavailable"}));return 0;
        }
        bool allowed=action=="play"?controls.IsPlayEnabled:action=="pause"?controls.IsPauseEnabled:action=="next"?controls.IsNextEnabled:controls.IsPreviousEnabled;
        bool success=allowed && Wait(action=="play"?target.TryPlayAsync():action=="pause"?target.TryPauseAsync():action=="next"?target.TrySkipNextAsync():target.TrySkipPreviousAsync(),4);
        Console.WriteLine(Json.Serialize(new { success=success, error=success?"":"NotSupported" }));return 0;
    }
    public static int Main(string[] args)
    {
        Console.OutputEncoding=new UTF8Encoding(false);
        int parentId; if ((args.Length!=1 && args.Length!=3 && args.Length!=4) || !int.TryParse(args[0],out parentId)) return 2;
        try
        {
            var manager=Wait(GlobalSystemMediaTransportControlsSessionManager.RequestAsync(),7);
            if(args.Length>=3) {if((args[1]=="seek")!=(args.Length==4))return 2;return Command(manager,args[1],args[2],args.Length==4?args[3]:null);}
            string previous=null,lastSource="",artKey="",art="";DateTime artRefresh=DateTime.MinValue;int heartbeat=0;
            while(true)
            {
                try { using(var parent=Process.GetProcessById(parentId)) { if(parent.HasExited) return 0; } } catch(ArgumentException) { return 0; }
                var active=Select(manager,lastSource);string source="",title="",artist="",artwork="";double position=0,duration=0;bool playing=false,canPlay=false,canPause=false,canNext=false,canPrevious=false,canSeek=false;
                if(active!=null) try {
                    source=active.SourceAppUserModelId;var info=active.GetPlaybackInfo();playing=info.PlaybackStatus==GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing;
                    canPlay=info.Controls.IsPlayEnabled;canPause=info.Controls.IsPauseEnabled;canNext=info.Controls.IsNextEnabled;canPrevious=info.Controls.IsPreviousEnabled;canSeek=info.Controls.IsPlaybackPositionEnabled;
                    try {var properties=Wait(active.TryGetMediaPropertiesAsync(),2);title=Text(properties.Title);artist=Text(properties.Artist);
                        string key=source+"\n"+title+"\n"+artist;
                        if(key!=artKey||DateTime.UtcNow>=artRefresh){artKey=key;art=Artwork(properties);artRefresh=DateTime.UtcNow.AddSeconds(20);}artwork=art;
                    } catch {}
                    try {var timeline=active.GetTimelineProperties();duration=Math.Max(0,(timeline.EndTime-timeline.StartTime).TotalSeconds);position=Math.Max(0,(timeline.Position-timeline.StartTime).TotalSeconds);if(playing)position+=Math.Max(0,(DateTimeOffset.UtcNow-timeline.LastUpdatedTime).TotalSeconds);if(duration>0)position=Math.Min(duration,position);} catch {}
                } catch {active=null;source="";}
                lastSource=source;
                var line=Json.Serialize(new { available=true, playing=playing, hasSession=active!=null, sourceAppId=source, title=title, artist=artist, artwork=artwork, position=position, duration=duration, canPlay=canPlay, canPause=canPause, canNext=canNext, canPrevious=canPrevious, canSeek=canSeek, sessionCount=manager.GetSessions().Count });
                if(line!=previous || heartbeat>=5) {Console.WriteLine(line);Console.Out.Flush();previous=line;heartbeat=0;}
                heartbeat++;Thread.Sleep(700);
            }
        }
        catch(Exception error) {Console.WriteLine(Json.Serialize(new { available=false, playing=false, success=false, error=error.GetType().Name }));return 1;}
    }
}
