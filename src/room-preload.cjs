const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('room',{onState:callback=>ipcRenderer.on('room:state',(_,value)=>callback(value))});
