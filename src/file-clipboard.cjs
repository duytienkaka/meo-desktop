'use strict';
const {execFile}=require('node:child_process'),path=require('node:path');
function copyFile(location,{platform=process.platform,exec=execFile}={}){
 if(!['win32','darwin'].includes(platform)||typeof location!=='string'||!path.isAbsolute(location)||/[\x00-\x1f]/.test(location))return Promise.reject(new Error('File không hợp lệ.'));
 const helper=path.join(__dirname,'native',platform==='win32'?'MeoScreenshotBridge.exe':'mac/MeoScreenshotBridge');
 return new Promise((resolve,reject)=>exec(helper,['copy-file',location],{windowsHide:true,shell:false,timeout:10000,maxBuffer:32768,encoding:'utf8'},(error,stdout)=>{try{if(error||JSON.parse(stdout.replace(/^\uFEFF/,'').trim()).success!==true)throw new Error();resolve();}catch{reject(new Error('Chưa sao chép được file. Hãy thử lại hoặc kéo file từ túi.'));}}));
}
module.exports={copyFile};
