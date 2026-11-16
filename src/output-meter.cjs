'use strict';
const {spawn}=require('node:child_process'),path=require('node:path');
function createOutputMeter({onLevel,onError,createProcess=()=>spawn(path.join(__dirname,'native/MeoAudioControl.exe'),['meter',String(process.pid)],{windowsHide:true,stdio:['ignore','pipe','ignore']})}){
 let child=null,retry=null,active=false;
 function stop(){active=false;clearTimeout(retry);retry=null;const previous=child;child=null;previous?.kill();onLevel(0);}
 function launch(){
  if(!active||child)return;
  const current=createProcess();child=current;let buffer='';
  function ended(){
   if(child!==current)return;
   child=null;onLevel(0);current.kill();
   if(active)retry=setTimeout(()=>{retry=null;launch();},1000);
  }
  current.stdout.on('data',chunk=>{
   if(child!==current)return;
   buffer+=chunk.toString();const lines=buffer.split(/\r?\n/);buffer=lines.pop();
   for(const line of lines){const value=Number(line.trim());if(Number.isFinite(value)&&value>=0&&value<=1)onLevel(value);}
  });
  current.on('error',error=>{onError(error.message);ended();});current.on('exit',ended);
 }
 return{setActive(value){if(value===active)return;if(!value){stop();return;}active=true;launch();},dispose:stop};
}
module.exports={createOutputMeter};
