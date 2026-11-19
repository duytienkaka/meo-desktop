using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

internal static partial class AudioControl {
 [ComImport,Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface Enumerator {
  [PreserveSig] int EnumAudioEndpoints(int flow,uint state,out IntPtr devices);
  [PreserveSig] int GetDefaultAudioEndpoint(int flow,int role,out Device device);
 }
 [ComImport,Guid("D666063F-1587-4E43-81F1-B948E807363F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface Device {
  [PreserveSig] int Activate(ref Guid iid,uint context,IntPtr parameters,[MarshalAs(UnmanagedType.IUnknown)] out object value);
  [PreserveSig] int OpenPropertyStore(uint mode,out IntPtr store);
  [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
 }
 [ComImport,Guid("5CDF2C82-841E-4546-9722-0CF74078229A"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface Volume {
  [PreserveSig] int RegisterControlChangeNotify(IntPtr notify);
  [PreserveSig] int UnregisterControlChangeNotify(IntPtr notify);
  [PreserveSig] int GetChannelCount(out uint count);
  [PreserveSig] int SetMasterVolumeLevel(float value,ref Guid context);
  [PreserveSig] int SetMasterVolumeLevelScalar(float value,ref Guid context);
  [PreserveSig] int GetMasterVolumeLevel(out float value);
  [PreserveSig] int GetMasterVolumeLevelScalar(out float value);
  [PreserveSig] int SetChannelVolumeLevel(uint channel,float value,ref Guid context);
  [PreserveSig] int SetChannelVolumeLevelScalar(uint channel,float value,ref Guid context);
  [PreserveSig] int GetChannelVolumeLevel(uint channel,out float value);
  [PreserveSig] int GetChannelVolumeLevelScalar(uint channel,out float value);
  [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute,ref Guid context);
  [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
 }

 [ComImport,Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface Meter {
  [PreserveSig] int GetPeakValue(out float value);
  [PreserveSig] int GetMeteringChannelCount(out uint count);
  [PreserveSig] int GetChannelsPeakValues(uint count,[Out,MarshalAs(UnmanagedType.LPArray,SizeParamIndex=0)] float[] values);
  [PreserveSig] int QueryHardwareSupport(out uint mask);
 }
 static int WatchMeter(int parentId){
  object enumerator=null,meterObject=null,volumeObject=null;
  Device device=null;
  try{
   using(var parent=Process.GetProcessById(parentId)){
    DateTime bindAt=DateTime.MinValue,parentAt=DateTime.MinValue;
    Meter meter=null;Volume volume=null;
    while(true){
     if(DateTime.UtcNow>=parentAt){if(parent.HasExited)return 0;parentAt=DateTime.UtcNow.AddSeconds(1);}
     try{
      if(meter==null||DateTime.UtcNow>=bindAt){
       if(meterObject!=null){Marshal.ReleaseComObject(meterObject);meterObject=null;}
       if(volumeObject!=null){Marshal.ReleaseComObject(volumeObject);volumeObject=null;}
       if(device!=null){Marshal.ReleaseComObject(device);device=null;}
       if(enumerator==null)enumerator=Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")));
       Marshal.ThrowExceptionForHR(((Enumerator)enumerator).GetDefaultAudioEndpoint(0,1,out device));
       Guid meterId=typeof(Meter).GUID,volumeId=typeof(Volume).GUID;
       Marshal.ThrowExceptionForHR(device.Activate(ref meterId,23,IntPtr.Zero,out meterObject));
       Marshal.ThrowExceptionForHR(device.Activate(ref volumeId,23,IntPtr.Zero,out volumeObject));
       meter=(Meter)meterObject;volume=(Volume)volumeObject;bindAt=DateTime.UtcNow.AddSeconds(2);
      }
      float peak;bool muted;
      Marshal.ThrowExceptionForHR(meter.GetPeakValue(out peak));
      Marshal.ThrowExceptionForHR(volume.GetMute(out muted));
      Console.WriteLine((muted?0:Math.Max(0,Math.Min(1,peak))).ToString("0.0000",CultureInfo.InvariantCulture));
     }catch{meter=null;volume=null;Console.WriteLine("0.0000");Thread.Sleep(500);}
     Thread.Sleep(40);
    }
   }
  }catch{return 0;}
  finally{
   if(meterObject!=null)Marshal.ReleaseComObject(meterObject);
   if(volumeObject!=null)Marshal.ReleaseComObject(volumeObject);
   if(device!=null)Marshal.ReleaseComObject(device);
   if(enumerator!=null)Marshal.ReleaseComObject(enumerator);
  }
 }
 static readonly JavaScriptSerializer Json=new JavaScriptSerializer();
 static object Sample(string action,double amount,int requestId) {
  object enumerator=null,endpoint=null;Device device=null;
  try {
   enumerator=Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")));
   Marshal.ThrowExceptionForHR(((Enumerator)enumerator).GetDefaultAudioEndpoint(0,1,out device));
   Guid iid=typeof(Volume).GUID;Marshal.ThrowExceptionForHR(device.Activate(ref iid,23,IntPtr.Zero,out endpoint));var volume=(Volume)endpoint;
   float level;bool muted;Marshal.ThrowExceptionForHR(volume.GetMasterVolumeLevelScalar(out level));Marshal.ThrowExceptionForHR(volume.GetMute(out muted));Guid context=Guid.Empty;float? expectedLevel=null;bool? expectedMute=null;
   if(action=="step"||action=="set") {
    if(double.IsNaN(amount)||double.IsInfinity(amount)||(action=="step"&&Math.Abs(amount)>10)||(action=="set"&&(amount<0||amount>100)))throw new ArgumentException();
    float target=(float)Math.Max(0,Math.Min(1,action=="set"?amount/100:level+amount/100));Marshal.ThrowExceptionForHR(volume.SetMasterVolumeLevelScalar(target,ref context));expectedLevel=target;expectedMute=muted;Marshal.ThrowExceptionForHR(volume.SetMute(muted,ref context));
   }else if(action=="toggle"){expectedMute=!muted;Marshal.ThrowExceptionForHR(volume.SetMute(!muted,ref context));}
   else if(action!="read")throw new ArgumentException();
   for(int attempt=0;attempt<12;attempt++){Marshal.ThrowExceptionForHR(volume.GetMasterVolumeLevelScalar(out level));Marshal.ThrowExceptionForHR(volume.GetMute(out muted));if((!expectedLevel.HasValue||Math.Abs(level-expectedLevel.Value)<.002)&&(!expectedMute.HasValue||muted==expectedMute.Value))break;if(attempt==11)throw new InvalidOperationException("VolumeNotApplied");Thread.Sleep(15);}
   return new {available=true,level=Math.Round(level*100,2),muted=muted,requestId=requestId,success=true};
  }catch(Exception error){return new {available=false,level=0,muted=false,requestId=requestId,success=false,error=error.GetType().Name};}
  finally{if(endpoint!=null)Marshal.ReleaseComObject(endpoint);if(device!=null)Marshal.ReleaseComObject(device);if(enumerator!=null)Marshal.ReleaseComObject(enumerator);}
 }
 public static int Main(string[] args) {
  int spectrumParent;if(args.Length==2&&args[0]=="spectrum"&&int.TryParse(args[1],out spectrumParent))return WatchSpectrum(spectrumParent);
  int meterParent;if(args.Length==2&&args[0]=="meter"&&int.TryParse(args[1],out meterParent))return WatchMeter(meterParent);
  int parentId;if(args.Length!=1||!int.TryParse(args[0],out parentId))return 2;Console.OutputEncoding=new UTF8Encoding(false);
  var queue=new BlockingCollection<string>(64);bool closed=false;
  var reader=new Thread(()=>{try{string line;while((line=Console.ReadLine())!=null){if(line.Length<2048)queue.TryAdd(line);}}catch{}finally{closed=true;}});reader.IsBackground=true;reader.Start();
  string previous="";
  while(!closed){
   try{using(var parent=Process.GetProcessById(parentId)){if(parent.HasExited)return 0;}}catch{return 0;}
   string line,action="read";double amount=0;int id=0;
   if(queue.TryTake(out line,600))try{var command=Json.Deserialize<Dictionary<string,object>>(line);id=Convert.ToInt32(command["id"],CultureInfo.InvariantCulture);action=Convert.ToString(command["action"],CultureInfo.InvariantCulture);if(command.ContainsKey("value"))amount=Convert.ToDouble(command["value"],CultureInfo.InvariantCulture);}catch{continue;}
   string result=Json.Serialize(Sample(action,amount,id));if(id>0||result!=previous){Console.WriteLine(result);Console.Out.Flush();previous=id>0?"":result;}
  }
  return 0;
 }
}
