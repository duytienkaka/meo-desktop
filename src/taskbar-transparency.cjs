'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
function createTaskbarTransparency({directory,opacity=40,onChange,onLayered,onError,createProcess=(file,args)=>spawn(file,args,{windowsHide:true,stdio:['pipe','pipe','ignore']})}){
 let enabled=false,child=null,retry=null,deadline=null,generation=0,windows={wave:null,disc:null};
 let state={enabled:false,ready:false,opacity,message:'Nền taskbar mặc định.'};
 function publish(message,ready=false){state={enabled,ready,message,opacity};onChange(state);}
 function sendWindows(){
  if(!child||!state.ready)return;
  for(const [kind,window] of Object.entries(windows)){
   const handle=window&&!window.isDestroyed()?window.getNativeWindowHandle().readBigUInt64LE().toString():'0';
   child.stdin.write(kind+' '+handle+'\n',()=>{});
  }
 }
 async function launch(token){
  try{
   const bundled=path.join(__dirname,'native/taskbar-engine/2026.2/ExplorerTAP.dll');
   const bytes=await fs.readFile(bundled),hash=crypto.createHash('sha256').update(bytes).digest('hex');
   const cache=path.join(directory,'taskbar-engine','2026.2-'+hash.slice(0,16)),dll=path.join(cache,'ExplorerTAP.dll');
   await fs.mkdir(cache,{recursive:true});
   try{await fs.writeFile(dll,bytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
   if(crypto.createHash('sha256').update(await fs.readFile(dll)).digest('hex')!==hash)throw Error('Bộ xử lý nền taskbar cần được cài lại.');
   if(!enabled||token!==generation)return;
   const proc=createProcess(path.join(__dirname,'native/MeoTaskbarTransparency.exe'),[String(process.pid),dll,String(opacity)]);child=proc;
   let buffer='',reported=false;
   proc.stdin.on('error',()=>{});
   deadline=setTimeout(()=>{if(child===proc&&!state.ready)proc.kill();},42000);
   proc.stdout.on('data',chunk=>{
    if(child!==proc||token!==generation)return;
    buffer+=chunk;const lines=buffer.split(/\r?\n/);buffer=lines.pop();
    for(const line of lines){
     if(line==='ready'){clearTimeout(deadline);deadline=null;publish('Taskbar kính mờ đang bật.',true);sendWindows();}
     else if(line.startsWith('layered '))onLayered(line.slice(8));
     else if(line.startsWith('error ')){reported=true;onError(line);publish('Chưa bật được nền trong suốt. Đang thử lại…');}
    }
   });
   function ended(){
    if(child!==proc)return;
    child=null;clearTimeout(deadline);deadline=null;
    if(!enabled||token!==generation)return;
    if(!reported)publish('Đang kết nối lại nền taskbar…');
    retry=setTimeout(()=>{retry=null;launch(token);},2000);
   }
   proc.on('error',error=>{onError(error.message);publish('Chưa mở được bộ xử lý nền taskbar.');ended();});
   proc.on('exit',ended);
  }catch(error){
   if(token!==generation)return;
   onError(error.message);publish('Chưa bật được nền trong suốt. Hãy tắt rồi bật lại để thử.');
  }
 }
 return{
  setEnabled(value){
   if(enabled===value)return;
   enabled=value;generation++;clearTimeout(retry);clearTimeout(deadline);retry=null;deadline=null;
   if(!enabled){const previous=child;child=null;publish('Nền taskbar mặc định.');if(previous){previous.stdin.end('stop\n');const timer=setTimeout(()=>previous.kill(),2500);previous.once('exit',()=>clearTimeout(timer));}return;}
   publish('Đang bật nền taskbar trong suốt…');launch(generation);
  },
  setOpacity(value){
   opacity=Math.max(20,Math.min(80,Math.round(value)));
   if(child&&state.ready)child.stdin.write('glass '+opacity+'\n',()=>{});
   state={...state,opacity};onChange(state);
  },
  setWindows(value){windows=value;sendWindows();},
  snapshot:()=>({...state}),
  dispose(){this.setEnabled(false);}
 };
}
module.exports={createTaskbarTransparency};
