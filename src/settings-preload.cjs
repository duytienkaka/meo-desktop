const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('settings',{
  get:()=>ipcRenderer.invoke('meo:settings:get'),
  update:patch=>ipcRenderer.invoke('meo:settings:update',patch),
  library:(action,id)=>ipcRenderer.invoke('meo:settings:library',{action,id}),
  action:value=>ipcRenderer.invoke('meo:settings:action',value),
  onChange:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('meo:settings:state',listener);return()=>ipcRenderer.removeListener('meo:settings:state',listener);}
});
