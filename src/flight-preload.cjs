const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('flight',{onStart:callback=>ipcRenderer.on('meo:shots:flight',(_event,value)=>callback(value))});
