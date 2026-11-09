'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
// Prime official tool archives with fresh URLs; builder still verifies each checksum.
async function prepareBuildTools(){
 const {getCacheDirectory}=require('app-builder-lib/out/util/electronGet');
 const cache=getCacheDirectory({allowEnvVarOverride:true});
 const tools=process.platform==='win32'?
 [['7zip@1.0.0','7zip-win-x64.tar.gz','be071f15bd6da2f78fe81c6ddef2009b0c4d8a51f36b780cb806c7e6df95e1b3'],['nsis-3.0.4.1','nsis-3.0.4.1.7z','9877df902530f96357d13a7a31ae2b9df67f48b11ffc9a1700a7c961574ec5fa'],['nsis-resources-3.4.1','nsis-resources-3.4.1.7z','593a9a92ef958321293ac6a2ee61e64bf1bd543142a5bd6b3d310709cc924103']]:
 [['7zip@1.0.0',process.arch==='arm64'?'7zip-darwin-arm64.tar.gz':'7zip-darwin-x86_64.tar.gz','496a341abe210aae1a25bc202ee97f6de6c76a3dc80f91d96616be05502d72c1'],['icons@1.2.3','icons-bundle.tar.gz','4e5bb546c9d3ab0c2bbacc22857467bf415f742a34c2be9dd138779d2fc066f9']];
 for(const [release,file,expected]of tools){const folder=path.join(cache,release),target=path.join(folder,file),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');if(fs.existsSync(target)&&hash(fs.readFileSync(target))===expected)continue;
  let error;for(let attempt=0;attempt<3;attempt++){try{const response=await fetch('https://github.com/electron-userland/electron-builder-binaries/releases/download/'+release+'/'+file+'?download=1&attempt='+attempt,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error('Tool download HTTP '+response.status);const data=Buffer.from(await response.arrayBuffer());if(hash(data)!==expected)throw new Error('Build tool checksum mismatch: '+file);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(target+'.partial',data);fs.renameSync(target+'.partial',target);console.log('Verified build tool '+file);error=null;break;}catch(e){error=e;}}if(error)throw error;
 }
}
module.exports={prepareBuildTools};
