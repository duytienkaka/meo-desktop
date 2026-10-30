'use strict';
const path=require('node:path');
const {createMediaMonitor}=require('./media.cjs');
const KNOWN=new Set(['cs2.exe','dota2.exe','valorant-win64-shipping.exe','league of legends.exe','genshinimpact.exe','starrail.exe','zenlesszonezero.exe','r5apex.exe','fortniteclient-win64-shipping.exe','robloxplayerbeta.exe','overwatch.exe','destiny2.exe','eldenring.exe','sekiro.exe','dark souls iii.exe','baldursgate3.exe','bg3.exe','bg3_dx11.exe','stardew valley.exe','terraria.exe','hades.exe','hades2.exe','cyberpunk2077.exe','witcher3.exe','rdr2.exe','gta5.exe','gta5_enhanced.exe','forzahorizon5.exe','tslgame.exe','narakabladepoint.exe','palworld-win64-shipping.exe','minecraft.windows.exe']);
const SHELL=new Set(['meo.exe','electron.exe','explorer.exe','dwm.exe','searchhost.exe','startmenuexperiencehost.exe','shellexperiencehost.exe','textinputhost.exe','lockapp.exe','applicationframehost.exe','gamebar.exe','gamebarftserver.exe']);
const NON_GAME=new Set(['chrome.exe','msedge.exe','firefox.exe','brave.exe','opera.exe','vivaldi.exe','vlc.exe','mpv.exe','potplayermini64.exe','wmplayer.exe','powerpnt.exe','acrord32.exe','code.exe','obs64.exe','wallpaper32.exe','wallpaper64.exe','blender.exe','steam.exe','epicgameslauncher.exe','riotclientservices.exe']);
function exeName(value){if(typeof value!=='string')return'';const name=path.win32.basename(value).trim().toLowerCase();return /\.(exe|app)$/.test(name)&&name.length<=180&&!/[\x00-\x1f]/.test(name)?name:'';}
function ruleList(value){return [...new Set(Array.isArray(value)?value.map(exeName).filter(n=>n&&!SHELL.has(n)):[])].slice(0,12000);}
function candidate(sample,rules={}){
  const f=sample?.foreground,exe=exeName(f?.exe);
  if(!sample?.available||!exe||!Number.isInteger(f.pid)||f.pid<=0||SHELL.has(exe)||ruleList(rules.ignored).includes(exe))return null;
  if(ruleList(rules.games).includes(exe)||KNOWN.has(exe))return{pid:f.pid,exe,sticky:true};
  if(!NON_GAME.has(exe)&&f.fullScreen&&(sample.notificationState===3||(f.borderless&&f.installedGame)))return{pid:f.pid,exe,sticky:false};
  return null;
}
function resolveMood(state){return state.autoGame&&state.gameActive?'game':state.autoMedia&&state.mediaPlaying?'music':state.baseMode;}
function createGameDecision({onChange,enterDelay=800,exitDelay=2500,setTimer=setTimeout,clearTimer=clearTimeout}){
  let active=null,pending=null,entry=null,exit=null;
  const cancelEntry=()=>{if(entry!==null)clearTimer(entry);entry=null;pending=null;};
  const cancelExit=()=>{if(exit!==null)clearTimer(exit);exit=null;};
  function update(sample,rules){
    const next=candidate(sample,rules);
    const ignored=ruleList(rules?.ignored);
    if(active&&(!next||(next.pid===active.pid&&next.exe===active.exe))&&sample.available&&!ignored.includes(active.exe)&&active.sticky&&(KNOWN.has(active.exe)||ruleList(rules?.games).includes(active.exe))&&Array.isArray(sample.runningPids)&&sample.runningPids.includes(active.pid)){
      cancelEntry();cancelExit();return;
    }
    if(active&&next&&next.pid===active.pid&&next.exe===active.exe){cancelEntry();cancelExit();return;}
    if(next){
      cancelExit();
      if(pending?.pid===next.pid&&pending.exe===next.exe)return;
      cancelEntry();pending=next;
      entry=setTimer(()=>{entry=null;active=pending;pending=null;onChange(active);},enterDelay);return;
    }
    cancelEntry();
    if(active&&exit===null)exit=setTimer(()=>{exit=null;active=null;onChange(null);},exitDelay);
  }
  function reset(){cancelEntry();cancelExit();active=null;}
  return{update,reset,current:()=>active};
}
function createGameMonitor(options){return createMediaMonitor({...options,helper:path.join(__dirname,'native/MeoGameWatcher.exe'),label:'Game',maxLength:32768,decode:value=>{
  if(typeof value.available!=='boolean')throw new Error('InvalidPayload');
  const foreground=value.foreground||{};
  return{available:value.available,foreground:{pid:Number.isInteger(foreground.pid)?foreground.pid:0,exe:exeName(foreground.exe),displayName:typeof foreground.displayName==='string'?foreground.displayName.slice(0,100):'',fullScreen:foreground.fullScreen===true,borderless:foreground.borderless===true,installedGame:foreground.installedGame===true},runningPids:Array.isArray(value.runningPids)?value.runningPids.filter(p=>Number.isInteger(p)&&p>0).slice(0,10000):[],notificationState:Number.isInteger(value.notificationState)?value.notificationState:0};
}});}
module.exports={candidate,createGameDecision,createGameMonitor,resolveMood,ruleList,exeName,isApp:exe=>{const n=exeName(exe);return !!n&&!SHELL.has(n);}};
