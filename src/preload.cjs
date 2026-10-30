const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('meo',{
  utilities:{error:message=>ipcRenderer.send('meo:utilities:error',String(message).slice(0,300)),open:tab=>ipcRenderer.invoke('meo:utilities:open',tab),drop:async(files,text='')=>{const paths=[],images=[];for(const file of Array.from(files)){const location=webUtils.getPathForFile(file);if(location)paths.push(location);else if(/^image\/(png|jpeg|webp)$/.test(file.type)){if(file.size>8*1024*1024)throw new Error('Ảnh tối đa 8 MB.');images.push(new Uint8Array(await file.arrayBuffer()));}}return ipcRenderer.invoke('meo:utilities:pet-drop',{paths,images,text});}},
  audio:{get:()=>ipcRenderer.invoke('meo:audio:get'),command:(action,value)=>ipcRenderer.invoke('meo:audio:command',{action,value}),onChange:callback=>ipcRenderer.on('meo:audio:state',(_event,state)=>callback(state))},
  shots:{get:()=>ipcRenderer.invoke('meo:shots:get'),action:(action,id)=>ipcRenderer.invoke('meo:shots:pet',{action,id}),onChange:callback=>ipcRenderer.on('meo:shots:state',(_event,state)=>callback(state))},
  onFrame:callback=>ipcRenderer.on('meo:frame',(_event,frame)=>callback(frame)),
  ready:()=>ipcRenderer.send('meo:ready'),
  hit:value=>{if(typeof value==='boolean')ipcRenderer.send('meo:hit',value);},
  fileHover:value=>ipcRenderer.send('meo:files:hover',value===true),
  dropFiles:files=>ipcRenderer.invoke('meo:files:drop',Array.from(files).map(file=>webUtils.getPathForFile(file))),
  action:value=>{if(['menu','press','pet','drag-start','drag-end','error'].includes(value))ipcRenderer.send('meo:action',value);}
});
