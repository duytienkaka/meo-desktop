'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {build}=require('electron-builder');
if(process.platform!=='win32')throw new Error('Build the Windows installer on Windows.');
const root=path.resolve(__dirname,'..'),config=require('../electron-builder.json');
const local=process.env.MEO_ELECTRON_DIST||path.join(root,'.cache','electron-dist-'+config.electronVersion+'-win32-x64');
if(fs.existsSync(path.join(local,'electron.exe')))config.electronDist=local;
(async()=>{
 await require('./prepare-build-tools.cjs').prepareBuildTools();
 config.electronDownload={...(config.electronDownload||{}),checksums:require('electron/checksums.json')};
 const artifacts=await build({config,publish:'never'});
 for(const relative of ['TaskbarTransparency.cs','taskbar-engine/2026.2/ExplorerTAP.dll','taskbar-engine/2026.2/LICENSE.md','taskbar-engine/2026.2/SOURCE.txt']){
  const source=path.join(root,'src/native',relative),packaged=path.join(root,config.directories.output,'win-unpacked/resources/app/src/native',relative);
  if(!fs.existsSync(packaged)||!fs.readFileSync(source).equals(fs.readFileSync(packaged)))throw new Error('Taskbar engine source/license missing or changed in package: '+relative);
 }
 const installer=artifacts.find(file=>file.endsWith('.exe'));if(!installer)throw new Error('Installer was not produced.');
 const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(installer))hash.update(chunk);
 const digest=hash.digest('hex');fs.writeFileSync(installer+'.sha256',digest+'  '+path.basename(installer)+'\n');
 await require('./release-assets.cjs').validateWindows(path.dirname(installer),require('../package.json').version);
 console.log(JSON.stringify({installer,sha256:digest,bytes:fs.statSync(installer).size}));
})().catch(error=>{console.error(error);process.exit(1);});
