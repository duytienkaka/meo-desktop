const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('player',{
  get:()=>ipcRenderer.invoke('meo:player:get'),
  command:(action,sourceAppId,position,trackKey)=>ipcRenderer.invoke('meo:player:command',{action,sourceAppId,position,trackKey}),
  close:()=>ipcRenderer.invoke('meo:player:close'),
  scrubbing:active=>ipcRenderer.send('meo:player:scrubbing',active===true),
  onChange:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('meo:player:state',listener);return()=>ipcRenderer.removeListener('meo:player:state',listener);},
  onMotion:callback=>{const listener=(_event,open)=>callback(open);ipcRenderer.on('meo:player:motion',listener);return()=>ipcRenderer.removeListener('meo:player:motion',listener);}
});
