'use strict';
const {spawn}=require('node:child_process'),readline=require('node:readline'),path=require('node:path');
function configureOverlay(window,platform=process.platform){
 window.setAlwaysOnTop(true,'screen-saver');
 if(platform==='darwin')window.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
}
function createOverlayGuard({getWindow,canRaise,onRaise=()=>{},onError=()=>{},platform=process.platform,launch=spawn}={}){
 let child=null;
 function repair(){
  const w=getWindow();if(!canRaise()||!w||w.isDestroyed()||!w.isVisible())return false;
  if(!w.isAlwaysOnTop())configureOverlay(w,platform);
  // moveTop changes only stacking order, leaving the foreground application's focus intact.
  w.moveTop();onRaise();return true;
 }
 function start(){
  if(child||platform!=='win32')return;const w=getWindow();if(!w||w.isDestroyed())return;
  const handle=w.getNativeWindowHandle(),id=handle.length>=8?handle.readBigUInt64LE().toString():String(handle.readUInt32LE());
  const process=launch(path.join(__dirname,'native/MeoOverlayWatcher.exe'),[String(global.process.pid),id],{windowsHide:true,shell:false,stdio:['ignore','pipe','ignore']});child=process;
  const lines=readline.createInterface({input:process.stdout});lines.on('line',line=>{if(child===process&&line==='raise')repair();});
  process.on('error',()=>{if(child===process){child=null;onError('Chưa khởi động được bộ giữ mèo trên màn hình.');}});
  process.once('close',code=>{lines.close();if(child===process){child=null;if(code)onError('Bộ giữ mèo trên màn hình đã dừng: '+code);}});
 }
 function stop(){const old=child;child=null;old?.kill();}
 return {start,stop,repair};
}
module.exports={configureOverlay,createOverlayGuard};
