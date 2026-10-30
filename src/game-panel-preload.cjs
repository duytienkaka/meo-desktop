const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('gamePanel',{get:()=>ipcRenderer.invoke('meo:game:get'),action:(action,value)=>ipcRenderer.invoke('meo:game:action',{action,value}),onState:callback=>ipcRenderer.on('meo:game:state',(_event,value)=>callback(value)),onMotion:callback=>ipcRenderer.on('meo:game:motion',(_event,open)=>callback(open))});
