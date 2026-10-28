'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {build}=require('electron-builder');
if(process.platform!=='win32')throw new Error('Build the Windows installer on Windows.');
const root=path.resolve(__dirname,'..'),config=require('../electron-builder.json');
const local=process.env.MEO_ELECTRON_DIST||path.join(root,'.cache','electron-dist-'+config.electronVersion+'-win32-x64');
if(fs.existsSync(path.join(local,'electron.exe')))config.electronDist=local;
(async()=>{
 const artifacts=await build({config,publish:'never'});
 const installer=artifacts.find(file=>file.endsWith('.exe'));if(!installer)throw new Error('Installer was not produced.');
 const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(installer))hash.update(chunk);
 const digest=hash.digest('hex');fs.writeFileSync(installer+'.sha256',digest+'  '+path.basename(installer)+'\n');
 console.log(JSON.stringify({installer,sha256:digest,bytes:fs.statSync(installer).size}));
})().catch(error=>{console.error(error);process.exitCode=1;});
