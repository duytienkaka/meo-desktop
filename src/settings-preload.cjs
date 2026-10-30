const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('settings',{
  get:()=>ipcRenderer.invoke('meo:settings:get'),
  update:patch=>ipcRenderer.invoke('meo:settings:update',patch),
  library:(action,id)=>ipcRenderer.invoke('meo:settings:library',{action,id}),
  pins:(action,id)=>ipcRenderer.invoke('meo:settings:pins',{action,id}),
  updates:action=>ipcRenderer.invoke('meo:settings:updates',action),
  game:()=>ipcRenderer.invoke('meo:settings:game'),
  onNavigate:callback=>ipcRenderer.on('meo:settings:navigate',(_event,tab)=>callback(tab)),
  action:value=>ipcRenderer.invoke('meo:settings:action',value),
  onChange:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('meo:settings:state',listener);return()=>ipcRenderer.removeListener('meo:settings:state',listener);}
});
