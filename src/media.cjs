'use strict';
const {spawn,execFile}=require('node:child_process');
const readline=require('node:readline');
const path=require('node:path');

function decodeMedia(value){
  if(typeof value.available!=='boolean'||typeof value.playing!=='boolean')throw new Error('InvalidPayload');
  const text=value=>typeof value==='string'?value.replace(/[\x00-\x1f]/g,'').slice(0,200):'';
  const artwork=typeof value.artwork==='string'&&value.artwork.length<=350000&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value.artwork)?value.artwork:'';
  const duration=Number.isFinite(value.duration)&&value.duration>0?Math.min(604800,value.duration):0,position=Number.isFinite(value.position)?Math.min(duration||604800,Math.max(0,value.position)):0;
  return{available:value.available,playing:value.available&&value.playing,sourceAppId:typeof value.sourceAppId==='string'?value.sourceAppId.slice(0,512):'',hasSession:value.available&&value.hasSession===true,title:text(value.title),artist:text(value.artist),artwork,position,duration,canPlay:value.canPlay===true,canPause:value.canPause===true,canNext:value.canNext===true,canPrevious:value.canPrevious===true,sessionCount:Number.isInteger(value.sessionCount)?value.sessionCount:0,error:typeof value.error==='string'?value.error:''};
}
function createMediaMonitor({onSample,onError=()=>{},platform=process.platform,helper=path.join(__dirname,'native/MeoMediaWatcher.exe'),parentId=process.pid,decode=decodeMedia,label='Media',maxLength=400000}){
  let child=null,retry=null,watchdog=null,stopped=true,generation=0,lastSample=0,failures=0;
  function clear(){clearTimeout(retry);clearInterval(watchdog);retry=null;watchdog=null;}
  function stop(){stopped=true;generation++;clear();if(child){child.kill();child=null;}}
  function start(){
    if(!stopped)return;
    stopped=false;const current=++generation;
    if(platform!=='win32'){onSample({available:false,playing:false,error:'UnsupportedPlatform'});return;}
    function launch(){
      if(stopped||generation!==current)return;
      lastSample=Date.now();let reported=false;
      const proc=spawn(helper,[String(parentId)],{windowsHide:true,shell:false,stdio:['ignore','pipe','ignore']});child=proc;
      const lines=readline.createInterface({input:proc.stdout});
      lines.on('line',line=>{
        if(stopped||generation!==current||line.length>maxLength)return;
        try{
          const value=JSON.parse(line);
          const sample=decode(value);
          lastSample=Date.now();failures=0;
          onSample(sample);
        }catch{onError('Invalid '+label.toLowerCase()+' sample');}
      });
      function unavailable(reason){
        if(reported||stopped||generation!==current)return;reported=true;
        onError(label+' detection unavailable: '+reason);onSample({available:false,playing:false,error:reason});
      }
      proc.on('error',error=>unavailable(error.code||'StartFailed'));
      proc.once('close',code=>{
        lines.close();if(child===proc)child=null;clearInterval(watchdog);watchdog=null;
        if(stopped||generation!==current)return;
        unavailable('ProcessExit'+code);failures++;
        retry=setTimeout(launch,Math.min(30000,1000*2**Math.min(failures,5)));
      });
      watchdog=setInterval(()=>{if(Date.now()-lastSample>13000){unavailable('HeartbeatTimeout');proc.kill();}},3000);
    }
    launch();
  }
  return{start,stop,isRunning:()=>!stopped,pid:()=>child?.pid||null};
}

// Music may briefly report paused while switching tracks. Wait before returning to the base mood.
function createMediaDecision({onChange,stopDelay=2200,setTimer=setTimeout,clearTimer=clearTimeout}){
  let playing=false,timer=null;
  function cancel(){if(timer!==null)clearTimer(timer);timer=null;}
  function update(sample){
    if(sample.available&&sample.playing){cancel();if(!playing){playing=true;onChange(true);}return;}
    if(playing&&timer===null)timer=setTimer(()=>{timer=null;playing=false;onChange(false);},stopDelay);
  }
  function reset(){cancel();playing=false;}
  return{update,reset,isPlaying:()=>playing};
}
function createMediaTransport({platform=process.platform,exec=execFile,helper=path.join(__dirname,'native/MeoMediaWatcher.exe')}={}){
  let pending=null;
  function command(action,source){
    if(platform!=='win32'||!['play','pause','previous','next'].includes(action)||typeof source!=='string'||!source||source.length>512||/[\x00-\x1f]/.test(source))return Promise.reject(new Error('Lệnh nhạc không hợp lệ.'));
    if(pending)return Promise.reject(new Error('Đang gửi lệnh trước. Hãy chờ một chút.'));
    return new Promise((resolve,reject)=>{
      pending=exec(helper,[String(process.pid),action,source],{windowsHide:true,shell:false,timeout:12000,maxBuffer:32768,encoding:'utf8'},(error,stdout)=>{
        pending=null;if(error){reject(new Error('Chưa kết nối được với trình phát.'));return;}
        try{const result=JSON.parse(stdout.replace(/^\uFEFF/,'').trim());if(result.success!==true)throw new Error();resolve();}catch{reject(new Error('Trình phát chưa hỗ trợ thao tác này hoặc đã đóng.'));}
      });
    });
  }
  return{command,stop:()=>{pending?.kill();}};
}
module.exports={createMediaMonitor,createMediaDecision,createMediaTransport,decodeMedia};
