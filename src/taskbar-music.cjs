'use strict';
const {BrowserWindow,screen,ipcMain}=require('electron');
const {spawn}=require('node:child_process');
const path=require('node:path');
function createTaskbarMusic({supported,onOpen,onError,onWindowsChanged=()=>{},createMeter=options=>require('./output-meter.cjs').createOutputMeter(options),createWatcher=()=>spawn(path.join(__dirname,'native/MeoWallpaperHost.exe'),['taskbar'],{windowsHide:true})}){
 let enabled=false,watcher=null,window=null,geometry=null,track=null,loaded=false,lastKey='',buffer='',suspended=false;
 let waveWindow=null,waveLoaded=false,waveBoundsKey='',waveTrackKey='',waveShown=false;
 let protectedRegions=[],protectionKey='',behind=false,layered=false;
 let shown=false,hideTimer=null,retryTimer=null;
 const meter=createMeter({onLevel:level=>{
  if(waveLoaded&&waveWindow&&!waveWindow.isDestroyed())waveWindow.webContents.send('taskbar:level',level);
 },onError});
 const valid=event=>window&&!window.isDestroyed()&&event.sender.id===window.webContents.id;
 ipcMain.on('meo:taskbar:open',event=>{if(valid(event)&&shown)onOpen();});
 ipcMain.on('meo:taskbar:ready',event=>{if(valid(event)){loaded=true;lastKey='';sync();}else if(waveWindow&&event.sender.id===waveWindow.webContents.id){waveLoaded=true;sync();}});
 function show(value,immediate=false){
  if(!window||!loaded)return;
  if(value===shown&&!immediate)return;
  shown=value;clearTimeout(hideTimer);hideTimer=null;
  window.setIgnoreMouseEvents(!value);
  window.webContents.send('taskbar:motion',value);
  if(value&&behind&&!layered)waveWindow?.hide();
  if(waveLoaded&&waveWindow){waveShown=value;waveWindow.webContents.send('taskbar:motion',value);if(!value&&immediate)waveWindow.hide();}
  if(value){window.showInactive();}
  else if(immediate){window.hide();}
  else hideTimer=setTimeout(()=>{hideTimer=null;if(!shown&&window&&!window.isDestroyed())window.hide();if(!shown&&waveWindow&&!waveWindow.isDestroyed())waveWindow.hide();},110);
 }
 function destroyWindow(){
  clearTimeout(hideTimer);hideTimer=null;
  waveWindow?.destroy();layered=false;waveWindow=null;waveLoaded=false;waveBoundsKey='';waveTrackKey='';waveShown=false;protectionKey='';
  window?.destroy();window=null;loaded=false;shown=false;lastKey='';onWindowsChanged({wave:null,disc:null});
 }
 function prepareWindow(){
  if(window)return;
  window=new BrowserWindow({width:52,height:48,frame:false,transparent:true,backgroundColor:'#00000000',show:false,hasShadow:false,resizable:false,focusable:false,skipTaskbar:true,title:'Mèo · Nhạc trên taskbar',webPreferences:{preload:path.join(__dirname,'taskbar-music-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
  window.setAlwaysOnTop(true,'screen-saver');
  window.setIgnoreMouseEvents(true);
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  onWindowsChanged({wave:waveWindow,disc:window});
  window.loadFile(path.join(__dirname,'taskbar-music.html')).catch(error=>{onError(error.message);destroyWindow();});
 }

 function syncWave(){
  if(!enabled||!loaded||!waveLoaded||!waveWindow||!geometry?.visible||!track?.hasSession||suspended)return;

  const bar=screen.screenToDipRect(null,geometry);
  const regions=protectedRegions.map(rect=>{const dip=screen.screenToDipRect(null,rect);return {x:dip.x-bar.x,width:dip.width};});
  const protection=JSON.stringify(regions);
  if(waveLoaded)waveWindow.webContents.send('taskbar:behind',behind);
  if(protection!==protectionKey){protectionKey=protection;waveWindow.webContents.send('taskbar:protection',regions);}
  const key=JSON.stringify(bar);
  if(key!==waveBoundsKey){waveBoundsKey=key;waveWindow.setBounds(bar,false);}
  const keyTrack=JSON.stringify({playing:track.playing});
  if(keyTrack!==waveTrackKey){waveTrackKey=keyTrack;waveWindow.webContents.send('taskbar:track',{playing:track.playing});}
  if(waveShown!==shown){waveShown=shown;waveWindow.webContents.send('taskbar:motion',shown);}
  if(behind&&!layered){waveWindow.hide();return;}
  if(!behind&&!regions.length){waveWindow.hide();return;}
  if(shown&&!waveWindow.isVisible()){waveWindow.showInactive();if(!behind)window.moveTop();}
 }
 function sync(){
  if(!enabled)return;
  meter.setActive(!!(track?.playing&&geometry?.visible&&(behind||protectedRegions.length)&&!suspended));
  prepareWindow();
  if(!waveWindow){
   waveWindow=new BrowserWindow({width:320,height:48,frame:false,transparent:!behind,backgroundMaterial:behind?'acrylic':'none',backgroundColor:'#00000000',show:false,focusable:false,skipTaskbar:true,hasShadow:false,resizable:false,title:'Mèo · Sóng nhạc',webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'taskbar-music-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
   const currentWave=waveWindow;
   currentWave.on('closed',()=>{
    if(waveWindow!==currentWave)return;
    waveWindow=null;waveLoaded=false;waveBoundsKey='';waveTrackKey='';waveShown=false;layered=false;onWindowsChanged({wave:null,disc:window});
   });
   onWindowsChanged({wave:waveWindow,disc:window});
   waveWindow.setAlwaysOnTop(true,'screen-saver');
   waveWindow.setIgnoreMouseEvents(true);
   waveWindow.loadFile(path.join(__dirname,'taskbar-wave.html')).catch(error=>onError(error.message));
  }
  if(!loaded)return;
  if(!suspended&&track?.hasSession){
   const value={title:track.title,artist:track.artist,artwork:track.artwork,playing:track.playing};
   const key=JSON.stringify(value);
   if(key!==lastKey){lastKey=key;window.webContents.send('taskbar:track',value);}
  }
  if(suspended||!track?.hasSession||!geometry?.visible){show(false,suspended);return;}
  const bar=screen.screenToDipRect(null,geometry);
  const height=Math.min(48,bar.height-2),width=52;
  if(height<24){show(false);return;}
  const bounds={x:bar.x+Math.min(160,Math.round(bar.width*.085)),y:bar.y+Math.round((bar.height-height)/2),width,height};
  const current=window.getBounds();
  if(Object.keys(bounds).some(key=>bounds[key]!==current[key]))window.setBounds(bounds,false);
  show(true);syncWave();
 }
 function launchWatcher(){
  if(!enabled||watcher)return;
  buffer='';
  const process=createWatcher();watcher=process;
  let failed=false;
  function recover(){
   if(failed||watcher!==process)return;
   failed=true;watcher=null;geometry=null;waveBoundsKey='';show(false,true);process.kill();
   if(enabled)retryTimer=setTimeout(()=>{retryTimer=null;launchWatcher();},1000);
  }
  process.stdout.on('data',chunk=>{
   if(watcher!==process||!enabled)return;
   buffer+=chunk.toString();const lines=buffer.split(/\r?\n/);buffer=lines.pop();

   for(const line of lines){
    if(line==='raise'){if(shown&&window)window.moveTop();continue;}
    if(line.startsWith('mask ')){
     protectedRegions=line.slice(5).split('|').map(rect=>rect.split(',').map(Number)).filter(rect=>rect.length===4&&rect.every(Number.isFinite)&&rect[2]>0&&rect[3]>0).map(([x,y,width,height])=>({x,y,width,height}));
     continue;
    }
    const values=line.trim().split(' ').map(Number);
    if(values.length!==5||!values.every(Number.isFinite))continue;
    const [x,y,width,height,visible]=values;geometry={x,y,width,height,visible:visible===1};
   }
   sync();
  });
  process.on('error',error=>{onError(error.message);recover();});
  process.on('exit',recover);
 }
 function stop(){
  meter.dispose();
  clearTimeout(retryTimer);retryTimer=null;
  const old=watcher;watcher=null;old?.kill();geometry=null;buffer='';destroyWindow();
 }
 return{
  setEnabled(value){
   const next=supported&&value===true;
   if(next===enabled)return;
   enabled=next;if(!enabled){stop();return;}
   prepareWindow();launchWatcher();
  },
  setBehind(value){
   if(behind===value)return;
   behind=value;layered=false;protectionKey='';
   if(waveWindow){const old=waveWindow;waveWindow=null;old.destroy();waveLoaded=false;waveBoundsKey='';waveTrackKey='';waveShown=false;}
   onWindowsChanged({wave:waveWindow,disc:window});sync();
  },
  setLayered(handle){
   if(!behind||!waveWindow||waveWindow.isDestroyed())return;
   if(waveWindow.getNativeWindowHandle().readBigUInt64LE().toString()!==handle)return;
   layered=true;sync();
  },
  update(value){track=value;sync();},
  suspend(value){suspended=value;sync();},
  dispose(){enabled=false;stop();},
  get window(){return window;},
  get waveWindow(){return waveWindow;},
  get enabled(){return enabled;}
 };
}
module.exports={createTaskbarMusic};
