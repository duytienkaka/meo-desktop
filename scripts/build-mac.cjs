'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const {build,Platform,Arch}=require('electron-builder');
if(process.platform!=='darwin')throw new Error('Build the Mac package on a Mac (or the macOS GitHub Actions workflow).');
const arch=process.argv[2]||process.arch;if(!['arm64','x64'].includes(arch))throw new Error('Expected arm64 or x64');
(async()=>{
 const artifacts=await build({targets:Platform.MAC.createTarget(['dmg','zip'],arch==='arm64'?Arch.arm64:Arch.x64),config:require('../electron-builder.mac.json'),publish:'never'});
 for(const file of artifacts.filter(file=>/\.(dmg|zip)$/.test(file))){const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);fs.writeFileSync(file+'.sha256',hash.digest('hex')+'  '+path.basename(file)+'\n');}
 console.log(JSON.stringify({artifacts}));
})().catch(error=>{console.error(error);process.exitCode=1;});
