'use strict';
const {BrowserWindow,screen,ipcMain}=require('electron');
const {spawn}=require('node:child_process');
const path=require('node:path');

function createTaskbarMusic({supported,onError,onWindowsChanged=()=>{},
 createMeter=options=>require('./output-meter.cjs').createOutputMeter(options),
 createWatcher=()=>spawn(path.join(__dirname,'native/MeoWallpaperHost.exe'),['taskbar'],{windowsHide:true})
}){
 let options={};
 let enabled=false,watcher=null,waveWindow=null,loaded=false,geometry=null,track=null;
 let behind=false,layered=false,suspended=false,shown=false,buffer='';
 let regions=[],boundsKey='',protectionKey='',trackKey='';
 let hideTimer=null,disableTimer=null,retryTimer=null;
 const meter=createMeter({onLevel:level=>{
  if(loaded&&waveWindow&&!waveWindow.isDestroyed())waveWindow.webContents.send('taskbar:level',level);
 },onError});
 ipcMain.on('meo:taskbar:ready',event=>{
  if(waveWindow&&event.sender.id===waveWindow.webContents.id){loaded=true;waveWindow.webContents.send('taskbar:options',options);sync();}
 });
 function destroyWindow(){
  clearTimeout(hideTimer);hideTimer=null;
  const old=waveWindow;waveWindow=null;loaded=false;layered=false;shown=false;
  boundsKey='';protectionKey='';trackKey='';
  old?.destroy();onWindowsChanged({wave:null,disc:null});
 }
 function show(value,immediate=false,delay=110){
  if(!loaded||!waveWindow)return;
  if(shown===value&&!immediate)return;
  shown=value;clearTimeout(hideTimer);hideTimer=null;
  waveWindow.webContents.send('taskbar:motion',value);
  if(value)waveWindow.showInactive();
  else if(immediate)waveWindow.hide();
  else hideTimer=setTimeout(()=>{
   hideTimer=null;
   if(!shown&&waveWindow&&!waveWindow.isDestroyed())waveWindow.hide();
  },delay);
 }
 function prepareWindow(){
  if(waveWindow)return;
  waveWindow=new BrowserWindow({
   width:320,height:48,frame:false,transparent:!behind,
   backgroundMaterial:behind?'acrylic':'none',backgroundColor:'#00000000',
   show:false,focusable:false,skipTaskbar:true,hasShadow:false,resizable:false,title:'Mèo · Sóng nhạc',
   webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'taskbar-music-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}
  });
  waveWindow.setAlwaysOnTop(true,'screen-saver');waveWindow.setIgnoreMouseEvents(true);
  waveWindow.setMenu(null);
  waveWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  waveWindow.webContents.on('will-navigate',event=>event.preventDefault());
  onWindowsChanged({wave:waveWindow,disc:null});
  waveWindow.loadFile(path.join(__dirname,'taskbar-wave.html')).catch(error=>{onError(error.message);destroyWindow();});
 }
 function sync(){
  if(!enabled)return;
  const active=!!(track?.hasSession&&geometry?.visible&&!suspended&&(behind||regions.length));
  meter.setActive(active&&!!track?.playing);
  prepareWindow();
  if(!loaded)return;
  if(!active||(behind&&!layered)){show(false,suspended);return;}
  const bar=screen.screenToDipRect(null,geometry),key=JSON.stringify(bar);
  if(key!==boundsKey){boundsKey=key;waveWindow.setBounds(bar,false);}
  const protection=regions.map(rect=>{
   const dip=screen.screenToDipRect(null,rect);return {x:dip.x-bar.x,width:dip.width};
  });
  const nextProtection=JSON.stringify(protection);
  waveWindow.webContents.send('taskbar:behind',behind);
  if(nextProtection!==protectionKey){
   protectionKey=nextProtection;waveWindow.webContents.send('taskbar:protection',protection);
  }
  const nextTrack=JSON.stringify({playing:!!track.playing,artwork:track.artwork||''});
  if(nextTrack!==trackKey){trackKey=nextTrack;waveWindow.webContents.send('taskbar:track',{playing:!!track.playing,artwork:track.artwork||''});}
  show(true);
 }
 function launchWatcher(){
  if(!enabled||watcher)return;
  buffer='';
  const child=createWatcher();watcher=child;
  function recover(){
   if(watcher!==child)return;
   watcher=null;geometry=null;meter.setActive(false);show(false,true);child.kill();
   if(enabled)retryTimer=setTimeout(()=>{retryTimer=null;launchWatcher();},1000);
  }
  child.stdout.on('data',chunk=>{
   if(watcher!==child||!enabled)return;
   buffer+=chunk.toString();
   const lines=buffer.split(/\r?\n/);buffer=lines.pop();
   let raise=false;
   for(const line of lines){
    if(line==='raise'){raise=true;continue;}
    if(line.startsWith('mask ')){
     regions=line.slice(5).split('|').map(rect=>rect.split(',').map(Number))
      .filter(rect=>rect.length===4&&rect.every(Number.isFinite)&&rect[2]>0&&rect[3]>0)
      .map(([x,y,width,height])=>({x,y,width,height}));
     continue;
    }
    const values=line.trim().split(' ').map(Number);
    if(values.length===5&&values.every(Number.isFinite)){
     const [x,y,width,height,visible]=values;geometry={x,y,width,height,visible:visible===1};
    }
   }
   sync();
   if(raise&&shown&&!behind&&waveWindow?.isVisible())waveWindow.moveTop();
  });
  child.on('error',error=>{onError(error.message);recover();});child.on('exit',recover);
 }
 function stop(){
  meter.dispose();clearTimeout(retryTimer);retryTimer=null;
  const old=watcher;watcher=null;old?.kill();
  geometry=null;regions=[];buffer='';destroyWindow();
 }
 return{
  configure(value){options={...value};if(loaded)waveWindow?.webContents.send('taskbar:options',options);},
  setEnabled(value){
   const next=supported&&value===true;
   if(next===enabled)return;
   enabled=next;clearTimeout(disableTimer);disableTimer=null;
   if(enabled){prepareWindow();launchWatcher();sync();return;}
   meter.setActive(false);
   if(shown){
    show(false,false,360);disableTimer=setTimeout(()=>{disableTimer=null;if(!enabled)stop();},380);
   }else stop();
  },
  setBehind(value){if(behind===value)return;behind=value;destroyWindow();sync();},
  setLayered(handle){
   if(!behind||!waveWindow||waveWindow.isDestroyed())return;
   if(waveWindow.getNativeWindowHandle().readBigUInt64LE().toString()!==handle)return;
   layered=true;sync();
  },
  update(value){track=value;sync();},
  suspend(value){suspended=value;sync();},
  dispose(){enabled=false;clearTimeout(disableTimer);disableTimer=null;stop();},
  get waveWindow(){return waveWindow;},
  get enabled(){return enabled;}
 };
}
module.exports={createTaskbarMusic};
