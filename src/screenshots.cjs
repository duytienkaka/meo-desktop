'use strict';
const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');
const {createPhotoStore,selectionRect}=require('./screenshot-core.cjs');
const {createScreenshotBridge}=require('./screenshot-bridge.cjs');
function createScreenshotFeature({electron,getPet,getPlacement,getWindows,canUse,onStatus=()=>{},onCapture=()=>{},testMode=false}){
 const {app,BrowserWindow,ipcMain,screen,desktopCapturer,nativeImage}=electron;
 const supported=process.platform==='win32',temporary=path.join(app.getPath('temp'),'MeoDesktop-photos-'+crypto.randomUUID());
 const leasedFiles=new Set();
 const store=createPhotoStore({onRemove:photo=>{if(photo.file&&!leasedFiles.has(photo.file))try{fs.unlinkSync(photo.file);}catch{}}});
 let overlays=[],capturing=false,captureRevision=0,captureRestore=[],target=null,busy=false,lastState='',flightWindows=[],lastAction='';
 function receiveTarget(value){if(value?.own)return;target=value;publish();}
 const bridge=createScreenshotBridge({onTarget:receiveTarget});
 function targetValid(){return target&&Date.now()-target.seenAt<120000;}
 function snapshot(){return {supported,photos:store.list(),selected:store.selected(),capturing,busy,target:targetValid()?{name:target.name,title:target.title}:null,message:lastAction};}
 function publish(){const value=snapshot(),key=JSON.stringify(value);if(key===lastState)return;lastState=key;for(const window of [getPet()])if(window&&!window.isDestroyed())window.webContents.send('meo:shots:state',value);}
 function status(text){lastAction=text;onStatus(text);publish();}
 function requirePet(event){if(!getPet()||event.sender.id!==getPet().webContents.id)throw new Error('Cửa sổ mèo không hợp lệ.');}
 function addImage(image){const full=store.list().length===3,photo=store.add(image);if(!testMode)bridge.start();lastState='';status(full?'Mèo giữ 3 ảnh gần nhất.':'Mèo đang giữ ảnh cho bạn.');return photo;}
 function restoreCapture(){for(const item of captureRestore)if(item.visible&&!item.window.isDestroyed()&&canUse())item.window.showInactive();captureRestore=[];capturing=false;publish();}
 function closeOverlays(){for(const overlay of overlays)if(!overlay.window.isDestroyed())overlay.window.destroy();overlays=[];}
 function cancelCapture(){captureRevision++;closeOverlays();restoreCapture();}
 async function capture(){
  if(!supported)throw new Error('Chụp và đưa ảnh nhanh hiện hỗ trợ Windows.');if(!canUse()||capturing||busy)return;
  capturing=true;const revision=++captureRevision;onCapture();captureRestore=getWindows().filter(Boolean).filter(w=>!w.isDestroyed()).map(window=>({window,visible:window.isVisible()}));for(const item of captureRestore)item.window.hide();publish();
  try{
   await delay(180);if(revision!==captureRevision)return;
   const displays=screen.getAllDisplays(),maxWidth=Math.max(...displays.map(d=>Math.ceil(d.bounds.width*d.scaleFactor))),maxHeight=Math.max(...displays.map(d=>Math.ceil(d.bounds.height*d.scaleFactor)));
   const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:maxWidth,height:maxHeight},fetchWindowIcons:false});if(revision!==captureRevision)return;
   for(const display of displays){
    const source=sources.find(s=>s.display_id===String(display.id));if(!source||source.thumbnail.isEmpty())continue;
    const window=new BrowserWindow({...display.bounds,show:false,frame:false,transparent:false,backgroundColor:'#111814',hasShadow:false,resizable:false,movable:false,skipTaskbar:true,alwaysOnTop:true,enableLargerThanScreen:true,title:'Mèo · Chọn vùng chụp',webPreferences:{preload:path.join(__dirname,'capture-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
    const entry={window,display,image:source.thumbnail};overlays.push(entry);window.setMenu(null);window.setBounds(display.bounds,false);window.setAlwaysOnTop(true,'screen-saver');window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());window.on('closed',()=>{if(capturing&&revision===captureRevision)cancelCapture();});window.once('ready-to-show',()=>{if(revision!==captureRevision)return;window.show();if(display.id===screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id)window.focus();});window.loadFile(path.join(__dirname,'capture.html'));
   }
   if(!overlays.length)throw new Error('Chưa chụp được màn hình. Hãy thử lại.');
  }catch(error){if(revision===captureRevision){cancelCapture();status(error.message);}throw error;}
 }
 function validCapture(event){const entry=overlays.find(o=>!o.window.isDestroyed()&&o.window.webContents.id===event.sender.id);if(!entry||!capturing)throw new Error('Phiên chụp đã kết thúc.');return entry;}
 ipcMain.handle('meo:capture:get',event=>{const entry=validCapture(event);return {image:entry.image.toDataURL(),width:entry.display.bounds.width,height:entry.display.bounds.height};});
 ipcMain.handle('meo:capture:select',(event,rect)=>{const entry=validCapture(event),crop=selectionRect(rect,entry.display.bounds,entry.image.getSize()),image=nativeImage.createFromBuffer(entry.image.crop(crop).toPNG());captureRevision++;closeOverlays();restoreCapture();addImage(image);return true;});
 ipcMain.on('meo:capture:cancel',event=>{try{validCapture(event);cancelCapture();}catch{}});
 function ensureFile(photo){if(photo.file&&fs.existsSync(photo.file))return photo.file;fs.mkdirSync(temporary,{recursive:true});photo.file=path.join(temporary,photo.id+'.png');fs.writeFileSync(photo.file,photo.image.toPNG());return photo.file;}
 async function fly(photos,destination){
  const placement=getPlacement(),from={x:placement.x+placement.anchorX,y:placement.y+placement.anchorY-65},to=screen.screenToDipPoint({x:Math.round(destination.x),y:Math.round(destination.y)});
  const displays=screen.getAllDisplays(),left=Math.min(...displays.map(d=>d.bounds.x)),top=Math.min(...displays.map(d=>d.bounds.y)),right=Math.max(...displays.map(d=>d.bounds.x+d.bounds.width)),bottom=Math.max(...displays.map(d=>d.bounds.y+d.bounds.height));
  const window=new BrowserWindow({x:left,y:top,width:right-left,height:bottom-top,show:false,frame:false,transparent:true,backgroundColor:'#00000000',hasShadow:false,focusable:false,resizable:false,skipTaskbar:true,alwaysOnTop:true,enableLargerThanScreen:true,webPreferences:{preload:path.join(__dirname,'flight-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});flightWindows.push(window);window.setIgnoreMouseEvents(true);window.setAlwaysOnTop(true,'screen-saver');window.setMenu(null);window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  await window.loadFile(path.join(__dirname,'flight.html'));if(window.isDestroyed())return;
  window.showInactive();window.webContents.send('meo:shots:flight',{images:photos.map(photo=>photo.thumb),from:{x:from.x-left,y:from.y-top},to:{x:to.x-left,y:to.y-top}});await delay(620);if(!window.isDestroyed())window.destroy();flightWindows=flightWindows.filter(w=>w!==window);
 }
 async function sendAll(){
  if(busy||!canUse())throw new Error('Hãy chờ thao tác hiện tại hoàn tất.');const photos=store.list().map(photo=>store.get(photo.id));if(!photos.length)throw new Error('Mèo chưa giữ ảnh nào.');if(!targetValid())throw new Error('Bấm vào ô nhận ảnh trong ứng dụng trước, rồi quay lại nút đưa ảnh.');
  const destination={...target};busy=true;publish();
  try{
   const files=photos.map(ensureFile);await bridge.files(files);for(const file of files)leasedFiles.add(file);
   await fly(photos,destination);if(!canUse()||target?.hwnd!==destination.hwnd||target?.focus!==destination.focus)throw new Error('Ô nhập đã thay đổi. Bạn có thể dán lại bằng Ctrl + V.');
   await bridge.paste(destination);status('Đã đưa '+photos.length+' ảnh tới '+destination.name+'. Kiểm tra bản nháp và bỏ ảnh không muốn trước khi gửi.');
  }finally{busy=false;publish();}
 }
 function clear(){if(busy)return;store.clear();bridge.stop();target=null;status('Mèo đã bỏ các ảnh đang giữ.');}
 ipcMain.handle('meo:shots:get',event=>{requirePet(event);return snapshot();});
 ipcMain.handle('meo:shots:pet',async(event,value)=>{requirePet(event);try{if(value?.action==='capture')return await capture();if(value?.action==='send-all'){await sendAll();return snapshot();}throw new Error('Thao tác ảnh không hợp lệ.');}catch(error){status(error.message);throw error;}});
 function hide(){if(capturing)cancelCapture();for(const window of flightWindows)if(!window.isDestroyed())window.destroy();flightWindows=[];}
 function dispose(){captureRevision++;closeOverlays();bridge.stop();store.clear();for(const window of flightWindows)if(window&&!window.isDestroyed())window.destroy();for(const file of leasedFiles)try{fs.unlinkSync(file);}catch{}leasedFiles.clear();try{fs.rmdirSync(temporary);}catch{}}
 return {capture,clear,sendAll,hide,dispose,snapshot,addImage,receiveTarget,bridge,store,isBusy:()=>capturing||busy,isCapturing:()=>capturing,captureWindows:()=>overlays.map(o=>o.window)};
}
module.exports={createScreenshotFeature};
