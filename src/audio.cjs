'use strict';
const {spawn}=require('node:child_process'),readline=require('node:readline'),path=require('node:path');
function decodeAudio(value){
 if(!value||typeof value.available!=='boolean'||typeof value.muted!=='boolean'||!Number.isFinite(value.level)||value.level<0||value.level>100)throw new Error('Invalid audio state');
 return {available:value.available,level:value.level,muted:value.muted};
}
function createAudioControl({platform=process.platform,launch=spawn,helper=path.join(__dirname,'native/MeoAudioControl.exe'),onSample=()=>{},timeout=4000}={}){
 let child=null,sequence=0;const pending=new Map();
 function fail(){for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error('Chưa kết nối được với thiết bị âm thanh.'));}pending.clear();}
 function start(){
  if(child||platform!=='win32')return;
  const process=launch(helper,[String(global.process.pid)],{windowsHide:true,shell:false,stdio:['pipe','pipe','ignore']});child=process;
  const lines=readline.createInterface({input:process.stdout});
  lines.on('line',line=>{if(child!==process||line.length>4096)return;try{const value=JSON.parse(line),state=decodeAudio(value);onSample(state);const item=pending.get(value.requestId);if(item){pending.delete(value.requestId);clearTimeout(item.timer);if(value.success===true&&state.available)item.resolve(state);else item.reject(new Error('Chưa kết nối được với thiết bị âm thanh.'));}}catch{}});
  const unavailable=()=>{if(child!==process)return;child=null;process.kill();fail();onSample({available:false,level:0,muted:false});};
  process.on('error',unavailable);process.once('close',()=>{lines.close();unavailable();});process.stdin.on('error',unavailable);
 }
 function command(action,value){
  if(platform!=='win32'||!['read','step','toggle','set'].includes(action)||(action==='step'&&(!Number.isInteger(value)||!value||Math.abs(value)>10))||(action==='set'&&(!Number.isFinite(value)||value<0||value>100)))return Promise.reject(new Error('Lệnh âm lượng không hợp lệ.'));
  start();if(!child||pending.size>=32)return Promise.reject(new Error('Hãy chờ lệnh âm lượng trước.'));
  return new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('Thiết bị âm thanh chưa phản hồi.'));},timeout);pending.set(id,{resolve,reject,timer});try{child.stdin.write(JSON.stringify({id,action,...(value!==undefined?{value}: {})})+'\n');}catch{clearTimeout(timer);pending.delete(id);reject(new Error('Chưa kết nối được với thiết bị âm thanh.'));}});
 }
 function stop(){const process=child;child=null;fail();process?.kill();}
 return {start,command,stop};
}
module.exports={createAudioControl,decodeAudio};
