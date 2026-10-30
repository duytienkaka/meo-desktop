'use strict';
const path=require('node:path');
function createGamePanel({electron,getSnapshot,getAnchor,onAction,onVisibility=()=>{}}){
 const {BrowserWindow,ipcMain,screen}=electron;let window=null,open=false,loaded=false,hideTimer,last='',nextRaise=0;
 function publish(){if(!open||!loaded||!window||window.isDestroyed())return;const value=getSnapshot(),key=JSON.stringify(value);if(key!==last){last=key;window.webContents.send('meo:game:state',value);}}
 function position(){const anchor=getAnchor(),area=screen.getDisplayNearestPoint({x:Math.round(anchor.x),y:Math.round(anchor.y)}).workArea,width=Math.min(350,area.width),height=Math.min(450,area.height);window.setBounds({width,height,x:Math.round(Math.max(area.x,Math.min(area.x+area.width-width,anchor.x-width/2))),y:Math.round(Math.max(area.y,Math.min(area.y+area.height-height,anchor.y-height-95)))},false);}
 async function show(){
  clearTimeout(hideTimer);open=true;
  if(!window||window.isDestroyed()){
   loaded=false;window=new BrowserWindow({width:350,height:450,show:false,frame:false,transparent:true,backgroundColor:'#00000000',hasShadow:false,focusable:false,acceptFirstMouse:true,resizable:false,skipTaskbar:true,alwaysOnTop:true,title:'Mèo Desktop — Bảng Game',webPreferences:{preload:path.join(__dirname,'game-panel-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
   window.setMenu(null);window.setAlwaysOnTop(true,'screen-saver');if(process.platform==='darwin')window.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());window.on('closed',()=>{window=null;loaded=false;open=false;onVisibility(false);});
   await window.loadFile(path.join(__dirname,'game-panel.html'));loaded=true;
  }
  if(!open||!window||window.isDestroyed())return;position();window.showInactive();last='';publish();window.webContents.send('meo:game:motion',true);onVisibility(true);
 }
 function hide(immediate=false){open=false;onVisibility(false);if(!window||window.isDestroyed())return;window.webContents.send('meo:game:motion',false);clearTimeout(hideTimer);if(immediate)window.hide();else hideTimer=setTimeout(()=>{if(!open&&!window?.isDestroyed())window?.hide();},180);}
 const valid=event=>window&&!window.isDestroyed()&&event.sender.id===window.webContents.id;
 ipcMain.handle('meo:game:get',event=>{if(!valid(event))throw new Error('Cửa sổ không hợp lệ.');return getSnapshot();});
 ipcMain.handle('meo:game:action',async(event,value)=>{if(!valid(event)||!open)throw new Error('Bảng Game chưa mở.');if(value?.action==='close')hide();else await onAction(value);publish();return getSnapshot();});
 function maintain(){if(!open||!window||window.isDestroyed()||!window.isVisible()||Date.now()<nextRaise)return;nextRaise=Date.now()+1500;window.setAlwaysOnTop(true,'screen-saver');window.moveTop();}
 return {show,hide,publish,maintain,toggle:()=>open?hide():show(),isOpen:()=>open,window:()=>window,dispose:()=>{clearTimeout(hideTimer);open=false;window?.destroy();}};
}
module.exports={createGamePanel};
