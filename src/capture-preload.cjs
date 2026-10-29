const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('capture',{get:()=>ipcRenderer.invoke('meo:capture:get'),select:rect=>ipcRenderer.invoke('meo:capture:select',rect),cancel:()=>ipcRenderer.send('meo:capture:cancel')});
