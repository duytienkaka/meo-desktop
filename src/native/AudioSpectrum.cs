using System;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Threading;

internal static partial class AudioControl {
 [ComImport,Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
 interface AudioClient {
  [PreserveSig] int Initialize(int mode,uint flags,long duration,long period,IntPtr format,IntPtr session);
  [PreserveSig] int GetBufferSize(out uint size);
  [PreserveSig] int GetStreamLatency(out long latency);
  [PreserveSig] int GetCurrentPadding(out uint padding);
  [PreserveSig] int IsFormatSupported(int mode,IntPtr format,out IntPtr closest);
  [PreserveSig] int GetMixFormat(out IntPtr format);
  [PreserveSig] int GetDevicePeriod(out long normal,out long minimum);
  [PreserveSig] int Start();
  [PreserveSig] int Stop();
  [PreserveSig] int Reset();
  [PreserveSig] int SetEventHandle(IntPtr handle);
  [PreserveSig] int GetService(ref Guid id,[MarshalAs(UnmanagedType.IUnknown)] out object service);
 }
 [ComImport,Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
 interface CaptureClient {
  [PreserveSig] int GetBuffer(out IntPtr data,out uint frames,out uint flags,out ulong position,out ulong clock);
  [PreserveSig] int ReleaseBuffer(uint frames);
  [PreserveSig] int GetNextPacketSize(out uint frames);
 }
 static double[] Spectrum(double[] ring,int head,int rate){
  const int n=2048;
  var real=new double[n];var imag=new double[n];
  for(int i=0;i<n;i++)real[i]=ring[(head+i)%n]*(.5-.5*Math.Cos(2*Math.PI*i/(n-1)));
  for(int i=1,j=0;i<n;i++){
   int bit=n>>1;for(; (j&bit)!=0;bit>>=1)j^=bit;j^=bit;
   if(i<j){double v=real[i];real[i]=real[j];real[j]=v;}
  }
  for(int len=2;len<=n;len<<=1){
   double angle=-2*Math.PI/len;
   for(int start=0;start<n;start+=len)for(int k=0;k<len/2;k++){
    double c=Math.Cos(angle*k),s=Math.Sin(angle*k);
    int a=start+k,b=a+len/2;
    double r=real[b]*c-imag[b]*s,t=real[b]*s+imag[b]*c;
    real[b]=real[a]-r;imag[b]=imag[a]-t;real[a]+=r;imag[a]+=t;
   }
  }
  var bands=new double[32];
  for(int b=0;b<bands.Length;b++){
   double low=40*Math.Pow(400,b/32.0),high=40*Math.Pow(400,(b+1)/32.0);
   int first=Math.Max(1,(int)(low*n/rate)),last=Math.Min(n/2-1,Math.Max(first,(int)(high*n/rate)));
   double energy=0;
   for(int k=first;k<=last;k++)energy+=real[k]*real[k]+imag[k]*imag[k];
   bands[b]=Math.Min(1,Math.Sqrt(energy)*4/n);
  }
  return bands;
 }
 static int WatchSpectrum(int parentId){
  using(var parent=Process.GetProcessById(parentId)){
   while(!parent.HasExited){
    object enumerator=null,clientObject=null,captureObject=null,volumeObject=null;
    Device device=null;IntPtr format=IntPtr.Zero;AudioClient client=null;
    try{
     enumerator=Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")));
     Marshal.ThrowExceptionForHR(((Enumerator)enumerator).GetDefaultAudioEndpoint(0,1,out device));
     Guid id=typeof(AudioClient).GUID;Marshal.ThrowExceptionForHR(device.Activate(ref id,23,IntPtr.Zero,out clientObject));
     client=(AudioClient)clientObject;Marshal.ThrowExceptionForHR(client.GetMixFormat(out format));
     int tag=(ushort)Marshal.ReadInt16(format),channels=(ushort)Marshal.ReadInt16(format,2);
     int rate=Marshal.ReadInt32(format,4),align=(ushort)Marshal.ReadInt16(format,12),bits=(ushort)Marshal.ReadInt16(format,14);
     if(tag==65534)tag=(ushort)Marshal.ReadInt16(format,24);
     if(channels<1||rate<8000||!(tag==3&&bits==32||tag==1&&(bits==16||bits==24||bits==32)))throw new Exception("Unsupported audio format");
     Marshal.ThrowExceptionForHR(client.Initialize(0,0x20000,1000000,0,format,IntPtr.Zero));
     id=typeof(CaptureClient).GUID;Marshal.ThrowExceptionForHR(client.GetService(ref id,out captureObject));
     var capture=(CaptureClient)captureObject;
     id=typeof(Volume).GUID;Marshal.ThrowExceptionForHR(device.Activate(ref id,23,IntPtr.Zero,out volumeObject));
     var volume=(Volume)volumeObject;
     Marshal.ThrowExceptionForHR(client.Start());
     var ring=new double[2048];int head=0;var last=DateTime.UtcNow;
     string deviceId;Marshal.ThrowExceptionForHR(device.GetId(out deviceId));var checkAt=DateTime.UtcNow.AddSeconds(2);
     double peak=0;bool hasData=false;
     while(!parent.HasExited){
      if(DateTime.UtcNow>=checkAt){
       Device current=null;
       try{Marshal.ThrowExceptionForHR(((Enumerator)enumerator).GetDefaultAudioEndpoint(0,1,out current));string next;Marshal.ThrowExceptionForHR(current.GetId(out next));if(next!=deviceId)break;}
       finally{if(current!=null)Marshal.ReleaseComObject(current);}
       checkAt=DateTime.UtcNow.AddSeconds(2);
      }
      uint size;Marshal.ThrowExceptionForHR(capture.GetNextPacketSize(out size));
      while(size>0){
       IntPtr data;uint frames,flags;ulong position,clock;
       Marshal.ThrowExceptionForHR(capture.GetBuffer(out data,out frames,out flags,out position,out clock));
       try{
        var bytes=new byte[checked((int)frames*align)];if((flags&2)==0)Marshal.Copy(data,bytes,0,bytes.Length);
        for(int f=0;f<frames;f++){
         double mono=0;
         for(int c=0;c<channels;c++){
          int o=f*align+c*bits/8;double v;
          if(tag==3)v=BitConverter.ToSingle(bytes,o);
          else if(bits==16)v=BitConverter.ToInt16(bytes,o)/32768.0;
          else if(bits==24){int v24=bytes[o]|bytes[o+1]<<8|bytes[o+2]<<16;v=(v24<<8)/2147483648.0;}
          else v=BitConverter.ToInt32(bytes,o)/2147483648.0;
          if(double.IsNaN(v)||double.IsInfinity(v))v=0;
          mono+=v/channels;peak=Math.Max(peak,Math.Abs(v));
         }
         ring[head]=mono;head=(head+1)%ring.Length;
        }
        hasData=true;
       }finally{Marshal.ThrowExceptionForHR(capture.ReleaseBuffer(frames));}
       Marshal.ThrowExceptionForHR(capture.GetNextPacketSize(out size));
      }
      if((DateTime.UtcNow-last).TotalMilliseconds>=40){
       bool muted;Marshal.ThrowExceptionForHR(volume.GetMute(out muted));
       var bands=hasData&&!muted?Spectrum(ring,head,rate):new double[32];
       Console.WriteLine(Json.Serialize(new {level=muted?0:Math.Min(1,peak),bands=bands}));
       last=DateTime.UtcNow;peak=0;hasData=false;
      }
      Thread.Sleep(8);
     }
    }catch{Console.WriteLine("{\"level\":0,\"bands\":[]}");Thread.Sleep(500);}
    finally{
     if(client!=null)try{client.Stop();}catch{}
     if(format!=IntPtr.Zero)Marshal.FreeCoTaskMem(format);
     foreach(var obj in new object[]{captureObject,clientObject,volumeObject,device,enumerator})if(obj!=null)Marshal.ReleaseComObject(obj);
    }
   }
  }
  return 0;
 }
}
