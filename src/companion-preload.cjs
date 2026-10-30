const {contextBridge,ipcRenderer,webUtils}=require('electron');
async function drop(files,text=''){
 const paths=[],images=[];for(const file of Array.from(files)){const location=webUtils.getPathForFile(file);if(location)paths.push(location);else if(/^image\/(png|jpeg|webp)$/.test(file.type)){if(file.size>8*1024*1024)throw new Error('Ảnh tối đa 8 MB.');images.push(new Uint8Array(await file.arrayBuffer()));}}
 return ipcRenderer.invoke('meo:utils:drop',{paths,images,text});
}
contextBridge.exposeInMainWorld('companion',{get:()=>ipcRenderer.invoke('meo:utils:get'),action:value=>ipcRenderer.invoke('meo:utils:action',value),drop,drag:id=>ipcRenderer.send('meo:utils:drag',id),onState:callback=>ipcRenderer.on('meo:utils:state',(_e,v)=>callback(v)),onShow:callback=>ipcRenderer.on('meo:utils:show',(_e,v)=>callback(v)),onError:callback=>ipcRenderer.on('meo:utils:error',(_e,v)=>callback(v))});
