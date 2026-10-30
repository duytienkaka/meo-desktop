'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCompanionStore}=require('./companion-store.cjs');
const {createBatteryMonitor,createDownloadMonitor}=require('./desktop-monitors.cjs');
function createCompanion({electron,getAnchor,getPetState,applyPet,controlAudio,getAudio,getPins,launchPin,getShots,getIcon,canUse,onChange=()=>{},onNotice=()=>{},testMode=false}){
 const {app,BrowserWindow,ipcMain,screen,clipboard,shell,nativeImage,dialog,powerMonitor}=electron;
 let window=null,loaded=false,open=false,last='',hideTimer,pulseUntil=0,pulseKind='',battery={available:false},lowDismissed=false,downloadStatus='Đang chuẩn bị…',batteryStatus='Đang đọc pin…',applying=false;
 const thumbs=new Map(),importDirectory=path.join(app.getPath('userData'),'shelf-images');
 const store=createCompanionStore({directory:app.getPath('userData'),downloads:app.getPath('downloads'),onChange:changed});
 function changed(){publish();onChange();}
 function pulse(kind,message){pulseKind=kind;pulseUntil=Date.now()+6500;onNotice(message);changed();}
 function receiveBattery(value){const previous=battery;battery=value;batteryStatus=value.available?(value.charging?'Đang cắm sạc · ':'Đang dùng pin · ')+value.percent+'%':'Không có pin hoặc máy chưa cung cấp thông tin.';if(value.available&&value.percent>=25)lowDismissed=false;if(value.available&&value.charging){lowDismissed=false;if(previous.available&&!previous.charging)pulse('charging','Đã cắm sạc rồi!');}else if(value.available&&value.percent<=20&&!lowDismissed){lowDismissed=true;pulse('battery','Pin còn '+value.percent+'% · cắm sạc nhé.');}changed();}
 const batteryMonitor=createBatteryMonitor({onSample:value=>receiveBattery({...value,...(value.available?{charging:!powerMonitor.isOnBatteryPower()}: {})}),onError:message=>{batteryStatus=message;changed();}});
 const downloadMonitor=createDownloadMonitor({onFile:location=>{const count=store.addFiles([location],'download');if(count)pulse('download','Mèo giữ file mới: '+path.basename(location));},onStatus:message=>{downloadStatus=message;changed();}});
 function summary(){return {...store.overview(),battery,batteryStatus,downloadStatus};}
 function badge(){const state=store.overview(),low=state.settings.battery&&battery.available&&!battery.charging&&battery.percent<=20;return {count:state.count,due:state.due,text:state.text,kind:state.due?'reminder':Date.now()<pulseUntil?pulseKind:low?'battery':state.count?'bag':'',pulse:Date.now()<pulseUntil,percent:battery.percent};}
 function snapshot(){const state=store.snapshot();return {...state,items:state.items.map(i=>({...i,thumb:thumbs.get(i.id)||'',missing:i.kind==='file'&&!fs.existsSync(i.location)})),photos:getShots()?.snapshot().photos||[],pins:getPins(),battery,batteryStatus,downloadStatus,applying};}
 async function refreshThumbs(){for(const item of store.snapshot().items){if(item.kind!=='file'||thumbs.has(item.id))continue;thumbs.set(item.id,'');try{const stat=await fs.promises.stat(item.location);let image;if(stat.isFile()&&stat.size<8*1024*1024&&/\.(png|jpe?g|webp|gif)$/i.test(item.location))image=await nativeImage.createThumbnailFromPath(item.location,{width:84,height:64});else image=await app.getFileIcon(item.location,{size:'normal'});thumbs.set(item.id,image.isEmpty()?'':image.toDataURL());}catch{}}changed();}
 function importImage(bytes){const buffer=Buffer.from(bytes||[]);if(!buffer.length||buffer.length>8*1024*1024)throw new Error('Ảnh tối đa 8 MB.');const image=nativeImage.createFromBuffer(buffer),size=image.getSize();if(image.isEmpty()||size.width>12000||size.height>12000)throw new Error('Ảnh không hợp lệ hoặc quá lớn.');fs.mkdirSync(importDirectory,{recursive:true});const location=path.join(importDirectory,'Meo-anh-'+Date.now()+'-'+crypto.randomUUID().slice(0,8)+'.png');fs.writeFileSync(location,image.toPNG());try{store.addFiles([location],'image');}catch(error){fs.unlinkSync(location);throw error;}return location;}
 async function drop(value){if(!canUse()&&!(open&&canUse(true)))throw new Error('Thả đồ khi mèo ở desktop.');if(!value||!Array.isArray(value.paths)||!Array.isArray(value.images)||value.images.length>3)throw new Error('Đồ thả vào không hợp lệ.');if(value.paths.length)store.addFiles(value.paths);else if(value.images.length){if(value.images.length+store.snapshot().items.length>20)throw new Error('Túi đầy. Bỏ bớt món trước khi thêm ảnh.');for(const bytes of value.images)importImage(bytes);}else store.addText(value.text);await refreshThumbs();pulse('bag','Mèo đã cất đồ vào túi.');return snapshot();}
 async function applyProfile(id){
  if(applying)throw new Error('Đang chuyển chế độ.');const p=store.snapshot().profiles.find(p=>p.id===id);if(!p)throw new Error('Chế độ không tồn tại.');if(!canUse(true))throw new Error('Hãy mở khóa máy trước.');applying=true;changed();const errors=[];
  try{await applyPet(p);if(p.volume!==null)try{await controlAudio(p.volume);}catch{errors.push('Chưa chỉnh được âm lượng.');}for(const appId of p.appIds)try{await launchPin(appId);}catch{errors.push('Chưa mở được một ứng dụng đã ghim.');}store.activate(id);pulse('profile','Đã chuyển sang '+p.name+(errors.length?' · '+errors.join(' '):''));return {errors};}finally{applying=false;changed();}
 }
 function valid(event){return window&&!window.isDestroyed()&&event.sender.id===window.webContents.id;}
 async function action(value){
  const state=store.snapshot();switch(value?.action){
   case 'close':hide();break;
   case 'add-reminder':store.addReminder(value.input);break;
   case 'done':case 'snooze':store.reminder(value.action,value.id);break;
   case 'remove':store.remove(value.id);thumbs.delete(value.id);break;
   case 'open':{const item=store.item(value.id);if(item.kind!=='file')throw new Error('Hãy sao chép đoạn chữ.');const error=await shell.openPath(item.location);if(error)throw new Error('Chưa mở được file.');break;}
   case 'reveal':{const item=store.item(value.id);if(item.kind!=='file')throw new Error('Đây là đoạn chữ.');shell.showItemInFolder(item.location);break;}
   case 'copy':{const item=store.item(value.id);if(item.kind==='text')clipboard.writeText(item.text);else if(/\.(png|jpe?g|webp)$/i.test(item.location)&&fs.statSync(item.location).size<8*1024*1024){const image=nativeImage.createFromPath(item.location);if(image.isEmpty())throw new Error('Chưa đọc được ảnh.');clipboard.writeImage(image);}else clipboard.writeText(item.location);break;}
   case 'apply-profile':await applyProfile(value.id);break;
   case 'save-profile':{const p=value.profile;if(p?.appIds?.some(id=>!getPins().some(pin=>pin.id===id)))throw new Error('Hãy chọn ứng dụng còn trong danh sách ghim.');store.saveProfile(p);break;}
   case 'remember-profile':{const p=state.profiles.find(p=>p.id===value.id);if(!p)throw new Error('Chế độ không tồn tại.');const audio=getAudio();store.saveProfile({...p,...getPetState(),volume:audio.available?audio.level:p.volume});break;}
   case 'configure':{store.configure(value.patch);await restartMonitors();break;}
   case 'choose-downloads':{const options={title:'Chọn thư mục nhận file mới',properties:['openDirectory']};const choice=await (window?dialog.showOpenDialog(window,options):dialog.showOpenDialog(options));if(!choice.canceled&&choice.filePaths[0]){store.configure({downloadDirectory:choice.filePaths[0]});await restartMonitors();}break;}
   case 'capture':hide(true);await getShots().capture();break;
   case 'keep-photo':{const photo=getShots().store.get(value.id);if(!photo)throw new Error('Ảnh không còn trong túi chụp.');importImage(photo.image.toPNG());await refreshThumbs();break;}
   default:throw new Error('Thao tác tiện ích không hợp lệ.');
  }
  changed();return snapshot();
 }
 ipcMain.handle('meo:utils:get',event=>{if(!valid(event))throw new Error('Cửa sổ không hợp lệ.');return snapshot();});
 ipcMain.handle('meo:utils:action',(event,value)=>{if(!valid(event)||!open)throw new Error('Túi chưa mở.');return action(value);});
 ipcMain.handle('meo:utils:drop',(event,value)=>{if(!valid(event)||!open)throw new Error('Túi chưa mở.');return drop(value);});
 ipcMain.on('meo:utils:drag',(event,id)=>{if(!valid(event)||!open)return;try{const item=store.item(id);if(item.kind!=='file')return;event.sender.startDrag({file:item.location,icon:getIcon()});}catch(error){window.webContents.send('meo:utils:error',error.message);}});
 function publish(){if(!open||!loaded||!window||window.isDestroyed())return;const value=snapshot(),key=JSON.stringify(value);if(key!==last){last=key;window.webContents.send('meo:utils:state',value);}}
 async function show(tab='shelf'){
  if(!canUse(true))throw new Error('Hãy mở khóa máy trước.');clearTimeout(hideTimer);open=true;
  if(!window||window.isDestroyed()){loaded=false;window=new BrowserWindow({width:380,height:510,show:false,frame:false,transparent:true,backgroundColor:'#00000000',hasShadow:false,resizable:false,skipTaskbar:true,alwaysOnTop:true,acceptFirstMouse:true,title:'Mèo Desktop — Túi & việc',webPreferences:{preload:path.join(__dirname,'companion-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});window.setMenu(null);window.setAlwaysOnTop(true,'floating');if(process.platform==='darwin')window.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());window.on('closed',()=>{window=null;open=false;loaded=false;});await window.loadFile(path.join(__dirname,'companion.html'));loaded=true;}
  if(!open||!window||window.isDestroyed())return;const anchor=getAnchor(),area=screen.getDisplayNearestPoint(anchor).workArea,width=Math.min(380,area.width),height=Math.min(510,area.height);window.setBounds({width,height,x:Math.round(Math.max(area.x,Math.min(area.x+area.width-width,anchor.x-width/2))),y:Math.round(Math.max(area.y,Math.min(area.y+area.height-height,anchor.y-height-65)))},false);window.show();last='';publish();window.webContents.send('meo:utils:show',tab);refreshThumbs();
 }
 function hide(immediate=false){open=false;if(!window||window.isDestroyed())return;window.webContents.send('meo:utils:show',false);clearTimeout(hideTimer);if(immediate)window.hide();else hideTimer=setTimeout(()=>{if(!open&&!window?.isDestroyed())window?.hide();},180);}
 let configured='',tickTimer;
 async function restartMonitors(){const settings=store.overview().settings;if(settings.battery){if(!testMode)batteryMonitor.start();}else{batteryMonitor.stop();battery={available:false};batteryStatus='Đã tắt nhắc pin.';if(['battery','charging'].includes(pulseKind))pulseUntil=0;}const key=JSON.stringify([settings.downloads,settings.downloadDirectory]);if(key!==configured){configured=key;if(settings.downloads){if(!testMode)await downloadMonitor.start(settings.downloadDirectory);}else{downloadMonitor.stop();downloadStatus='Đã tắt theo dõi file mới.';}}changed();}
 function tick(){const due=store.tick();if(due.length)pulse('reminder','Đến giờ: '+due[0].text);publish();}
 function start(){tick();tickTimer=setInterval(tick,1000);tickTimer.unref?.();powerMonitor.on('on-ac',batteryMonitor.sample);powerMonitor.on('on-battery',batteryMonitor.sample);restartMonitors();refreshThumbs();try{const retained=new Set(store.snapshot().items.filter(i=>i.kind==='file').map(i=>i.location));for(const entry of fs.readdirSync(importDirectory,{withFileTypes:true})){if(!entry.isFile()||!/^Meo-anh-\d+-[a-f0-9]{8}\.png$/.test(entry.name))continue;const location=path.join(importDirectory,entry.name);if(!retained.has(location))fs.unlinkSync(location);}}catch{}}
 function dispose(){clearInterval(tickTimer);clearTimeout(hideTimer);powerMonitor.removeListener('on-ac',batteryMonitor.sample);powerMonitor.removeListener('on-battery',batteryMonitor.sample);batteryMonitor.stop();downloadMonitor.stop();window?.destroy();}
 return {start,dispose,show,hide,toggle:()=>open?hide():show(),isOpen:()=>open,window:()=>window,summary,badge,snapshot,drop,action,store,tick,receiveBattery,downloadMonitor,applyProfile};
}
module.exports={createCompanion};
