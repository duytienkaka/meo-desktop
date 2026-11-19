const {BrowserWindow,screen,ipcMain}=require('electron'),{execFile,spawn}=require('node:child_process'),path=require('node:path');
function createWallpaper({onMusicTable=()=>{},onFeature=()=>{},onError=()=>{}}={}){
 const targetKinds=new Set(['pet','bed','ball','tease','room-toggle','music-table','lamp','break-done','break-snooze','souvenirs','feed','food','food-start','food-end']);
 const backgrounds=new Map();let generation=0,refreshQueue=Promise.resolve(),primaryKey='';
let window=null,watcher=null,desktop=false,petReady=false,input=null,targets=[],lastTargets='',pendingInteraction=null,draggingBall=false,onRoomToggle=()=>{};ipcMain.on('meo:room:ready',event=>{if(window&&event.sender.id===window.webContents.id){petReady=true;if(pendingInteraction){window.webContents.send('room:interaction',pendingInteraction);pendingInteraction=null;}}});ipcMain.on('room:targets',(event,value)=>{if(!window||event.sender.id!==window.webContents.id||!Array.isArray(value))return;targets=value.filter(t=>targetKinds.has(t.kind)&&['x','y','width','height'].every(k=>Number.isFinite(t[k]))&&t.width>0&&t.height>0).slice(0,12);});
 ipcMain.on('room:care',(event,kind)=>{if(window&&event.sender.id===window.webContents.id&&kind==='food-eaten')onFeature(kind);});
 ipcMain.on('room:input',(event,action)=>{
  if(!input||event.sender.id!==input.webContents.id||!input.isVisible())return;
  if(action==='ball-start'){draggingBall=true;return;}
  if(action==='ball-cancel'){draggingBall=false;return;}
  const kind=typeof action==='string'?action:action?.kind;
  if(!targetKinds.has(kind))return;
  if(['lamp','break-done','break-snooze'].includes(kind)){onFeature(kind);return;}
  onFeature(kind);
  if(kind==='feed'){window?.webContents.send('room:interaction','food');return;}
  if(['food','food-start','food-end'].includes(kind)){draggingBall=kind==='food-start'||action.dragging===true;window?.webContents.send('room:interaction',action);return;}
  if(kind==='music-table'){onMusicTable();return;}
  if(kind==='ball')draggingBall=false;
  if(['room-toggle','ball','tease'].includes(kind))onRoomToggle(kind);
  if(kind==='room-toggle')return;
  const drop=kind==='ball'&&Number.isFinite(action.x)&&Number.isFinite(action.y);
  window?.webContents.send('room:interaction',drop?{kind,x:action.x,y:action.y}:kind);
 });

 async function attach(scene,bounds){
  const pixels=screen.dipToScreenRect(null,bounds);
  const handle=scene.getNativeWindowHandle().readBigUInt64LE().toString();
  const args=[handle,String(pixels.x),String(pixels.y),String(pixels.width),String(pixels.height)];
  const run=()=>new Promise((resolve,reject)=>{
   execFile(path.join(__dirname,'native/MeoWallpaperHost.exe'),args,{windowsHide:true,timeout:8000},(error,_stdout,stderr)=>{
    if(error){error.detail=stderr?.trim();reject(error);}
    else resolve();
   });
  });
  try{await run();}catch(error){
   if(![2,3].includes(error.code)||scene.isDestroyed())throw error;
   // Explorer can recreate its desktop host during launch or display changes.
   await run();
  }
 }

 async function syncBackgrounds(){
  const token=generation,primary=screen.getPrimaryDisplay(),displays=screen.getAllDisplays();
  for(const [id,entry] of backgrounds){
   if(id===primary.id||!displays.some(display=>display.id===id)){
    entry.window.destroy();backgrounds.delete(id);
   }
  }
  for(const display of displays){
   if(!window||token!==generation)return;
   if(display.id===primary.id)continue;
   const key=JSON.stringify(display);
   const existing=backgrounds.get(display.id);
   if(existing?.key===key)continue;
   if(existing){existing.window.destroy();backgrounds.delete(display.id);}
   const scene=new BrowserWindow({...display.bounds,frame:false,show:false,skipTaskbar:true,focusable:false,resizable:false,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'room-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
   backgrounds.set(display.id,{window:scene,key});
   scene.setIgnoreMouseEvents(true);
   try{
    await scene.loadFile(path.join(__dirname,'room.html'));
    if(token!==generation||scene.isDestroyed())return;
    await attach(scene,display.bounds);
    if(token!==generation||scene.isDestroyed())return;
    scene.webContents.send('room:state',{paused:true,showPet:false,controlsVisible:false});
    scene.showInactive();
   }catch(error){
    if(!scene.isDestroyed())scene.destroy();
    backgrounds.delete(display.id);
    if(token===generation)onError(error);
   }
  }
 }
 function queueRefresh(){
  const pending=refreshQueue.catch(()=>{}).then(async()=>{
   if(!window||window.isDestroyed())return;
   const primary=screen.getPrimaryDisplay(),key=JSON.stringify(primary);
   if(key!==primaryKey){
    await attach(window,primary.bounds);
    if(input&&!input.isDestroyed()){input.setBounds(primary.bounds,false);lastTargets='';}
    primaryKey=key;
   }
   await syncBackgrounds();
  });
  refreshQueue=pending;
  return pending;
 }
 return{get displayCount(){return backgrounds.size+(window?1:0);},refresh:queueRefresh,setRoomToggle(callback){onRoomToggle=callback;},async open(){if(window){window.showInactive();return;}const b=screen.getPrimaryDisplay().bounds;primaryKey=JSON.stringify(screen.getPrimaryDisplay());window=new BrowserWindow({...b,frame:false,show:false,skipTaskbar:true,focusable:false,resizable:false,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'room-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});window.setIgnoreMouseEvents(true);await window.loadFile(path.join(__dirname,'room.html'));if(process.platform!=='win32')throw new Error('Bản thử hình nền hiện hỗ trợ Windows.');await attach(window,b);window.showInactive();input=new BrowserWindow({...b,frame:false,transparent:true,backgroundColor:'#00000000',show:false,focusable:false,skipTaskbar:true,resizable:false,hasShadow:false,webPreferences:{preload:path.join(__dirname,'room-input-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});input.setIgnoreMouseEvents(true,{forward:true});input.setAlwaysOnTop(true,'screen-saver');await input.loadFile(path.join(__dirname,'room-input.html'));watcher=spawn(path.join(__dirname,'native/MeoWallpaperHost.exe'),['watch'],{windowsHide:true});watcher.stdout.on('data',data=>{desktop=data.toString().trim().endsWith('desktop');});watcher.on('error',()=>{});await queueRefresh();},update(state){for(const entry of backgrounds.values()){if(!entry.window.isDestroyed())entry.window.webContents.send('room:state',{...state,paused:true,showPet:false,controlsVisible:false,canOpenMusic:false});}if(window&&!window.isDestroyed())window.webContents.send('room:state',state);if(input&&!input.isDestroyed()){const active=state.interactive===true&&(!state.paused||state.canOpenMusic);
 const enabledTargets=targets.filter(target=>target.kind==='music-table'?state.canOpenMusic:!state.paused);
 if(active){if(!input.isVisible())input.showInactive();const cursor=state.cursor||{x:-1,y:-1},hit=enabledTargets.some(t=>cursor.x>=t.x&&cursor.x<=t.x+t.width&&cursor.y>=t.y&&cursor.y<=t.y+t.height);if(hit||draggingBall)input.setIgnoreMouseEvents(false);else input.setIgnoreMouseEvents(true,{forward:true});const key=JSON.stringify(enabledTargets);if(key!==lastTargets){lastTargets=key;input.webContents.send('room:targets',enabledTargets);}}else{draggingBall=false;input.hide();}}},food(){if(petReady)window?.webContents.send('room:interaction','food');else pendingInteraction='food';},interact(kind){if(!['ball','tease','pet'].includes(kind))return;if(petReady)window?.webContents.send('room:interaction',kind);else pendingInteraction=kind;},get desktop(){return desktop;},get petReady(){return petReady;},close(){generation++;for(const entry of backgrounds.values())entry.window.destroy();backgrounds.clear();primaryKey='';draggingBall=false;input?.destroy();input=null;targets=[];lastTargets='';watcher?.kill();watcher=null;desktop=false;petReady=false;pendingInteraction=null;window?.destroy();window=null;},get active(){return !!window;}};}
module.exports={createWallpaper};


