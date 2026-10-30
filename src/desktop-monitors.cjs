'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile);
function parseBattery(output,platform){
 if(platform==='win32'){const values=JSON.parse(output||'[]'),batteries=(Array.isArray(values)?values:[values]).filter(b=>b&&Number.isFinite(b.EstimatedChargeRemaining)&&b.EstimatedChargeRemaining>=0&&b.EstimatedChargeRemaining<=100);if(!batteries.length)return {available:false};return {available:true,percent:Math.min(...batteries.map(b=>b.EstimatedChargeRemaining)),charging:batteries.every(b=>[2,3,6,7,8,9,11].includes(b.BatteryStatus))};}
 const match=/(\d+)%;\s*(discharging|charging|charged|finishing charge|AC attached)/i.exec(output||'');return match?{available:true,percent:Math.min(100,Number(match[1])),charging:!/discharging/i.test(match[2])}:{available:false};
}
function createBatteryMonitor({onSample,onError=()=>{},platform=process.platform,reader}={}){
 let timer,stopped=true,inflight=false,generation=0;
 async function sample(){if(stopped||inflight)return;inflight=true;const revision=generation;try{const result=reader?await reader():await run(platform==='darwin'?'/usr/bin/pmset':'powershell.exe',platform==='darwin'?['-g','batt']:['-NoProfile','-NonInteractive','-Command','Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining,BatteryStatus | ConvertTo-Json -Compress'],{windowsHide:true,timeout:12000,maxBuffer:65536});if(!stopped&&revision===generation)onSample(parseBattery(result.stdout,platform));}catch{if(!stopped&&revision===generation)onError('Chưa đọc được pin.');}finally{inflight=false;}}
 return {sample,start(){if(!stopped)return;stopped=false;generation++;sample();timer=setInterval(sample,60000);timer.unref?.();},stop(){stopped=true;generation++;clearInterval(timer);}};
}
const temporary=name=>/^(\.|~)|\.(crdownload|part|partial|download|tmp|temp|opdownload)$/i.test(name);
function createDownloadMonitor({onFile,onStatus=()=>{},now=()=>Date.now(),settleMs=4000,watchFactory=fs.watch}={}){
 let directory=null,timer,watcher,inflight=null,revision=0,nextFull=0,known=new Map(),pending=new Map(),dirty=new Set();
 async function scan(baseline=false){if(inflight)return inflight;if(!directory)return;const current=directory,version=revision;const work=async()=>{try{
  const full=baseline||!watcher||now()>=nextFull;if(!full&&!pending.size&&!dirty.size)return;if(full)nextFull=now()+60000;
  const entries=await fs.promises.readdir(current,{withFileTypes:true});if(version!==revision)return;const names=new Set(entries.map(entry=>entry.name));
  for(const entry of entries){if(!entry.isFile()||temporary(entry.name)||['.part','.crdownload','.download'].some(suffix=>names.has(entry.name+suffix)))continue;const location=path.join(current,entry.name);if(!full&&!pending.has(location)&&!dirty.has(entry.name))continue;dirty.delete(entry.name);let stat;try{stat=await fs.promises.stat(location);}catch{continue;}if(version!==revision)return;const signature=stat.size+':'+stat.mtimeMs;
   if(baseline){known.set(location,signature);continue;}if(known.get(location)===signature){pending.delete(location);continue;}
   const candidate=pending.get(location);if(!candidate||candidate.signature!==signature){pending.set(location,{signature,since:now()});continue;}
   if(now()-candidate.since>=settleMs){try{const handle=await fs.promises.open(location,'r');await handle.close();if(version!==revision)return;await onFile(location);known.set(location,signature);pending.delete(location);}catch(error){known.set(location,signature);pending.delete(location);onStatus(error.message||'Chưa giữ được file mới.');}}
  }
  for(const location of [...pending.keys()])if(!names.has(path.basename(location)))pending.delete(location);
 }catch{if(version===revision)onStatus('Chưa đọc được thư mục tải xuống. Chọn lại thư mục trong Tiện ích.');}};inflight=work();try{await inflight;}finally{inflight=null;}}
 function stop(){revision++;directory=null;clearInterval(timer);watcher?.close();watcher=null;known.clear();pending.clear();dirty.clear();nextFull=0;}
 async function start(folder){stop();const version=revision;await inflight;if(version!==revision)return;directory=folder;try{await fs.promises.readdir(folder);}catch{onStatus('Chưa đọc được thư mục tải xuống. Chọn lại thư mục trong Tiện ích.');return;}await scan(true);if(version!==revision)return;try{watcher=watchFactory(folder,(_type,name)=>{if(name)dirty.add(String(name));else nextFull=0;});watcher.on('error',()=>{watcher?.close();watcher=null;onStatus('Theo dõi thư mục bằng kiểm tra định kỳ.');});}catch{}timer=setInterval(()=>scan(),2000);timer.unref?.();onStatus('Chỉ nhận file mới, ổn định trong ít nhất 4 giây.');}
 return {start,stop,scan};
}
module.exports={parseBattery,createBatteryMonitor,createDownloadMonitor,temporary};
