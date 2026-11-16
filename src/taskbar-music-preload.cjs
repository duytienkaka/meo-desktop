const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('taskbarMusic',{
 ready:()=>ipcRenderer.send('meo:taskbar:ready'),
 onBehind:callback=>ipcRenderer.on('taskbar:behind',(_,behind)=>callback(behind)),
 onProtection:callback=>ipcRenderer.on('taskbar:protection',(_,regions)=>callback(regions)),
 onLevel:callback=>ipcRenderer.on('taskbar:level',(_,level)=>callback(level)),
 onMotion:callback=>ipcRenderer.on('taskbar:motion',(_,shown)=>callback(shown)),
 onTrack:callback=>ipcRenderer.on('taskbar:track',(_,track)=>callback(track)),
 open:()=>ipcRenderer.send('meo:taskbar:open')
});
