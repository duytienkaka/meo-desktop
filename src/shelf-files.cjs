'use strict';
const fs=require('node:fs'),path=require('node:path');
function createShelfFiles(directory,{maxItemBytes=250*1024*1024,maxTotalBytes=1024*1024*1024,maxEntries=5000}={}){
 const root=path.resolve(directory,'shelf-files');
 const inside=(base,target)=>{const r=path.relative(base,target);return r!==''&&!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r);};
 function folder(item){if(!item?.owned||!/^[a-f0-9-]{36}$/.test(item.id))return null;const dir=path.resolve(root,item.id);return inside(root,dir)&&path.dirname(path.resolve(item.location))===dir?dir:null;}
 async function remove(item){const dir=folder(item);if(!dir)return;await fs.promises.rm(dir,{recursive:true,force:true});}
 async function copy(location,id,used=0){
  const source=await fs.promises.realpath(location),name=path.basename(source),dir=path.resolve(root,id);
  await fs.promises.mkdir(root,{recursive:true});const canonicalRoot=await fs.promises.realpath(root);
  if(!name||!inside(root,dir)||path.dirname(dir)!==root||source===canonicalRoot||inside(source,canonicalRoot))throw new Error('Không thể cất thư mục chứa kho túi của mèo.');
  const original=await fs.promises.lstat(location);if(original.isSymbolicLink())throw new Error('Hãy thả file thật thay vì liên kết tượng trưng.');
  const destination=path.join(dir,name);let bytes=0,entries=0;
  try{
   await fs.promises.mkdir(dir,{recursive:true});
   await fs.promises.cp(source,destination,{recursive:true,errorOnExist:true,force:false,mode:fs.constants.COPYFILE_FICLONE,filter:async file=>{
    const stat=await fs.promises.lstat(file);if(stat.isSymbolicLink()||(!stat.isDirectory()&&!stat.isFile()))throw new Error('Túi chưa hỗ trợ liên kết tượng trưng hoặc file đặc biệt.');
    if(++entries>maxEntries)throw new Error('Một món đồ chỉ giữ tối đa '+maxEntries+' file và thư mục.');
    if(stat.isFile())bytes+=stat.size;
    if(bytes>maxItemBytes)throw new Error('Mỗi món đồ tối đa '+Math.round(maxItemBytes/1024/1024)+' MB.');
    if(used+bytes>maxTotalBytes)throw new Error('Kho túi đã đầy. Bỏ bớt món trước khi thêm.');return true;
   }});
   return {location:destination,name,owned:true,bytes,originalLocation:path.normalize(location)};
  }catch(error){await remove({id,owned:true,location:destination}).catch(()=>{});if(error.code==='ENOENT')throw new Error('File không còn tồn tại. Hãy thả lại file mới.');if(error.code==='ENOSPC')throw new Error('Ổ đĩa không đủ chỗ để mèo giữ file.');throw error;}
 }
 async function cleanup(items){
  const retained=new Set(items.filter(i=>i.kind==='file').map(i=>path.dirname(path.resolve(i.location))));
  let entries;try{entries=await fs.promises.readdir(root,{withFileTypes:true});}catch{return;}
  for(const entry of entries){const dir=path.resolve(root,entry.name);if(!/^[a-f0-9-]{36}$/.test(entry.name)||retained.has(dir))continue;await remove({id:entry.name,owned:true,location:path.join(dir,'orphan')});}
 }
 return {copy,remove,cleanup,owns:item=>!!folder(item),maxTotalBytes};
}
module.exports={createShelfFiles};
