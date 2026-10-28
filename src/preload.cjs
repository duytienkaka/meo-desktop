const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('meo',{
  onFrame:callback=>ipcRenderer.on('meo:frame',(_event,frame)=>callback(frame)),
  ready:()=>ipcRenderer.send('meo:ready'),
  hit:value=>{if(typeof value==='boolean')ipcRenderer.send('meo:hit',value);},
  action:value=>{if(['menu','press','pet','drag-start','drag-end','error'].includes(value))ipcRenderer.send('meo:action',value);}
});
