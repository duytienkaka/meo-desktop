const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('meo',{
  audio:{get:()=>ipcRenderer.invoke('meo:audio:get'),command:(action,value)=>ipcRenderer.invoke('meo:audio:command',{action,value}),onChange:callback=>ipcRenderer.on('meo:audio:state',(_event,state)=>callback(state))},
  onFrame:callback=>ipcRenderer.on('meo:frame',(_event,frame)=>callback(frame)),
  ready:()=>ipcRenderer.send('meo:ready'),
  hit:value=>{if(typeof value==='boolean')ipcRenderer.send('meo:hit',value);},
  fileHover:value=>ipcRenderer.send('meo:files:hover',value===true),
  dropFiles:files=>ipcRenderer.invoke('meo:files:drop',Array.from(files).map(file=>webUtils.getPathForFile(file))),
  action:value=>{if(['menu','press','pet','drag-start','drag-end','error'].includes(value))ipcRenderer.send('meo:action',value);}
});
