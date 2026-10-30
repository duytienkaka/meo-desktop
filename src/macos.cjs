'use strict';
const {execFile}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),os=require('node:os');
function createMacBridge({exec=execFile,timeout=7000}={}){
 const active=new Set();
 function request(value){return new Promise((resolve,reject)=>{
  let child;child=exec('/usr/bin/osascript',['-l','JavaScript',path.join(__dirname,'native/mac/bridge.jxa.js'),JSON.stringify(value)],{shell:false,timeout,maxBuffer:400000,encoding:'utf8'},(error,stdout)=>{active.delete(child);if(error){reject(new Error('macOS chưa phản hồi. Kiểm tra quyền Automation trong System Settings.'));return;}try{const result=JSON.parse(stdout.trim());if(result.error)throw new Error(result.error.includes('AutomationPermissionDenied')?'Hãy cho phép Mèo điều khiển Music/Spotify tại System Settings → Privacy & Security → Automation.':'macOS chưa hỗ trợ thao tác này trên ứng dụng hoặc thiết bị đang dùng.');resolve(result);}catch(error){reject(error);}});active.add(child);
 });}
 return {request,stop:()=>{for(const child of active)child.kill();active.clear();}};
}
function createMacMonitor({kind,onSample,onError=()=>{},bridge=createMacBridge(),interval=2000}){
 let stopped=true,timer,generation=0,lastError='';
 const unavailable=()=>({available:false,playing:false,hasSession:false});
 function start(){if(!stopped)return;stopped=false;const current=++generation;
  async function poll(){try{const sample=await bridge.request({kind,action:'read'});if(current===generation&&!stopped){lastError='';onSample(sample);}}catch(error){if(current===generation&&!stopped){if(lastError!==error.message){lastError=error.message;onError(error.message);}onSample(unavailable());}}finally{if(current===generation&&!stopped)timer=setTimeout(poll,interval);}}
  poll();
 }
 return {start,stop:()=>{stopped=true;generation++;clearTimeout(timer);bridge.stop();},isRunning:()=>!stopped,pid:()=>null};
}
function createMacAudio({onSample=()=>{},bridge=createMacBridge(),interval=3000}={}){
 let stopped=true,timer,generation=0,queue=Promise.resolve();
 function execute(action,value){const work=queue.then(()=>bridge.request({kind:'audio',action,value})).then(result=>{if(result.available!==true||!Number.isFinite(result.level)||result.level<0||result.level>100||typeof result.muted!=='boolean')throw new Error('Thiết bị không hỗ trợ đổi âm lượng.');const state={available:true,level:result.level,muted:result.muted};onSample(state);return state;});queue=work.catch(()=>{});return work;}
 function start(){if(!stopped)return;stopped=false;const current=++generation;async function poll(){try{await execute('read');}catch{if(current===generation)onSample({available:false,level:0,muted:false});}finally{if(!stopped&&current===generation)timer=setTimeout(poll,interval);}}poll();}
 function command(action,value){if(!['read','step','set','toggle'].includes(action)||(action==='step'&&(!Number.isInteger(value)||!value||Math.abs(value)>10))||(action==='set'&&(!Number.isFinite(value)||value<0||value>100)))return Promise.reject(new Error('Lệnh âm lượng không hợp lệ.'));return execute(action,value);}
 return {start,command,stop:()=>{stopped=true;generation++;clearTimeout(timer);bridge.stop();}};
}
function createMacTransport({bridge=createMacBridge()}={}){
 let pending=false;
 async function command(action,source,position){
  if(!['com.spotify.client','com.apple.Music'].includes(source)||!['play','pause','next','previous','open','seek'].includes(action)||(action==='seek'&&(!Number.isFinite(position)||position<0||position>604800)))throw new Error('Lệnh nhạc không hợp lệ.');
  if(pending)throw new Error('Đang gửi lệnh trước. Hãy chờ một chút.');pending=true;
  try{const result=await bridge.request({kind:'media',action,source,value:position});if(result.success!==true)throw new Error('Trình phát chưa hỗ trợ thao tác này.');}finally{pending=false;}
 }
 return {command,stop:()=>bridge.stop()};
}
module.exports={createMacBridge,createMacMonitor,createMacAudio,createMacTransport};
