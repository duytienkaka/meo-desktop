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

// Reads Windows media sessions; transport commands run only on an explicit user request.
internal static class MediaWatcher
{
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
    private static int Command(GlobalSystemMediaTransportControlsSessionManager manager, string action, string source)
    {
        if(action!="play" && action!="pause" && action!="previous" && action!="next") throw new ArgumentException();
        GlobalSystemMediaTransportControlsSession target=null;
        var current=manager.GetCurrentSession();
        if(current!=null && current.SourceAppUserModelId==source) target=current;
        if(target==null) foreach(var session in manager.GetSessions()) if(session.SourceAppUserModelId==source) { target=session; break; }
        if(target==null) { Console.WriteLine(Json.Serialize(new { success=false, error="SessionClosed" })); return 0; }
        var controls=target.GetPlaybackInfo().Controls;
        bool allowed=action=="play"?controls.IsPlayEnabled:action=="pause"?controls.IsPauseEnabled:action=="next"?controls.IsNextEnabled:controls.IsPreviousEnabled;
        bool success=allowed && Wait(action=="play"?target.TryPlayAsync():action=="pause"?target.TryPauseAsync():action=="next"?target.TrySkipNextAsync():target.TrySkipPreviousAsync(),4);
        Console.WriteLine(Json.Serialize(new { success=success, error=success?"":"NotSupported" }));return 0;
    }
    public static int Main(string[] args)
    {
        Console.OutputEncoding=new UTF8Encoding(false);
        int parentId; if ((args.Length!=1 && args.Length!=3) || !int.TryParse(args[0],out parentId)) return 2;
        try
        {
            var manager=Wait(GlobalSystemMediaTransportControlsSessionManager.RequestAsync(),7);
            if(args.Length==3) return Command(manager,args[1],args[2]);
            string previous=null,lastSource="",artKey="",art="";DateTime artRefresh=DateTime.MinValue;int heartbeat=0;
            while(true)
            {
                try { using(var parent=Process.GetProcessById(parentId)) { if(parent.HasExited) return 0; } } catch(ArgumentException) { return 0; }
                var active=Select(manager,lastSource);string source="",title="",artist="",artwork="";double position=0,duration=0;bool playing=false,canPlay=false,canPause=false,canNext=false,canPrevious=false;
                if(active!=null) try {
                    source=active.SourceAppUserModelId;var info=active.GetPlaybackInfo();playing=info.PlaybackStatus==GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing;
                    canPlay=info.Controls.IsPlayEnabled;canPause=info.Controls.IsPauseEnabled;canNext=info.Controls.IsNextEnabled;canPrevious=info.Controls.IsPreviousEnabled;
                    try {var properties=Wait(active.TryGetMediaPropertiesAsync(),2);title=Text(properties.Title);artist=Text(properties.Artist);
                        string key=source+"\n"+title+"\n"+artist;
                        if(key!=artKey||DateTime.UtcNow>=artRefresh){artKey=key;art=Artwork(properties);artRefresh=DateTime.UtcNow.AddSeconds(20);}artwork=art;
                    } catch {}
                    try {var timeline=active.GetTimelineProperties();duration=Math.Max(0,(timeline.EndTime-timeline.StartTime).TotalSeconds);position=Math.Max(0,(timeline.Position-timeline.StartTime).TotalSeconds);if(playing)position+=Math.Max(0,(DateTimeOffset.UtcNow-timeline.LastUpdatedTime).TotalSeconds);if(duration>0)position=Math.Min(duration,position);} catch {}
                } catch {active=null;source="";}
                lastSource=source;
                var line=Json.Serialize(new { available=true, playing=playing, hasSession=active!=null, sourceAppId=source, title=title, artist=artist, artwork=artwork, position=position, duration=duration, canPlay=canPlay, canPause=canPause, canNext=canNext, canPrevious=canPrevious, sessionCount=manager.GetSessions().Count });
                if(line!=previous || heartbeat>=5) {Console.WriteLine(line);Console.Out.Flush();previous=line;heartbeat=0;}
                heartbeat++;Thread.Sleep(700);
            }
        }
        catch(Exception error) {Console.WriteLine(Json.Serialize(new { available=false, playing=false, success=false, error=error.GetType().Name }));return 1;}
    }
}
