using System;
using System.Diagnostics;
using System.Threading;
using Windows.Media;
using Windows.Media.Core;
using Windows.Media.Playback;
using System.Windows.Forms;
class MeoMediaFixture {
 static int Main(string[] args) {
  try {
   using(var player=new MediaPlayer()) {
    player.IsMuted=true;player.IsLoopingEnabled=true;player.CommandManager.IsEnabled=false;
    var controls=player.SystemMediaTransportControls;controls.IsEnabled=true;controls.IsPlayEnabled=true;controls.IsPauseEnabled=true;controls.IsNextEnabled=true;controls.IsPreviousEnabled=true;
    if(args.Length>2) { using(var bitmap=new System.Drawing.Bitmap(64,64)) {using(var graphics=System.Drawing.Graphics.FromImage(bitmap)) {graphics.Clear(System.Drawing.Color.MediumPurple);graphics.FillEllipse(System.Drawing.Brushes.MidnightBlue,8,8,48,48);}bitmap.Save(args[2],System.Drawing.Imaging.ImageFormat.Png);} var file=Windows.Storage.StorageFile.GetFileFromPathAsync(args[2]);while(file.Status==Windows.Foundation.AsyncStatus.Started)Thread.Sleep(10);controls.DisplayUpdater.Thumbnail=Windows.Storage.Streams.RandomAccessStreamReference.CreateFromFile(file.GetResults()); }
    var timeline=new SystemMediaTransportControlsTimelineProperties();timeline.StartTime=TimeSpan.Zero;timeline.EndTime=TimeSpan.FromSeconds(10);timeline.Position=TimeSpan.FromSeconds(2);controls.UpdateTimelineProperties(timeline);
    int track=1;
    Action metadata=()=>{controls.DisplayUpdater.Type=MediaPlaybackType.Music;controls.DisplayUpdater.MusicProperties.Title="Meo native fixture "+track;controls.DisplayUpdater.MusicProperties.Artist="Silent test";controls.DisplayUpdater.Update();};metadata();
    Windows.Foundation.TypedEventHandler<SystemMediaTransportControls,SystemMediaTransportControlsButtonPressedEventArgs> handler=(s,e)=>{
      if(e.Button==SystemMediaTransportControlsButton.Pause){player.Pause();controls.PlaybackStatus=MediaPlaybackStatus.Paused;Console.WriteLine("pause");}
      else if(e.Button==SystemMediaTransportControlsButton.Play){player.Play();controls.PlaybackStatus=MediaPlaybackStatus.Playing;Console.WriteLine("play");}
      else if(e.Button==SystemMediaTransportControlsButton.Next){track++;metadata();Console.WriteLine("next");}
      else if(e.Button==SystemMediaTransportControlsButton.Previous){track--;metadata();Console.WriteLine("previous");}
      Console.Out.Flush();
    };
    typeof(SystemMediaTransportControls).GetMethod("add_ButtonPressed").Invoke(controls,new object[]{handler});
    Windows.Foundation.TypedEventHandler<SystemMediaTransportControls,PlaybackPositionChangeRequestedEventArgs> seekHandler=(s,e)=>{
      player.PlaybackSession.Position=e.RequestedPlaybackPosition;timeline.Position=e.RequestedPlaybackPosition;controls.UpdateTimelineProperties(timeline);
      Console.WriteLine("seek:"+e.RequestedPlaybackPosition.TotalSeconds.ToString(System.Globalization.CultureInfo.InvariantCulture));Console.Out.Flush();
    };
    typeof(SystemMediaTransportControls).GetMethod("add_PlaybackPositionChangeRequested").Invoke(controls,new object[]{seekHandler});
    player.Source=MediaSource.CreateFromUri(new Uri(args[0]));player.Play();controls.PlaybackStatus=MediaPlaybackStatus.Playing;
    using(var window=new Form()) {
     window.Text="Meo native fixture "+track;window.Width=320;window.Height=160;window.WindowState=FormWindowState.Minimized;
     window.Resize+=(s,e)=>{if(window.WindowState==FormWindowState.Normal){Console.WriteLine("restored");Console.Out.Flush();}};
     window.Show();Console.WriteLine("ready");Console.Out.Flush();
     int parentId=int.Parse(args[1]);while(true){try{using(var parent=Process.GetProcessById(parentId)){if(parent.HasExited)return 0;}}catch{return 0;}Application.DoEvents();Thread.Sleep(50);}
    }
   }
  }catch(Exception e){Console.Error.WriteLine(e);return 1;}
 }
}
