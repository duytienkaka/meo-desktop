'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto');
const {NsisUpdater}=require('electron-updater'),{ElectronHttpExecutor}=require('electron-updater/out/electronHttpExecutor'),{NodeHttpExecutor}=require('builder-util/out/nodeHttpExecutor');
const {createUpdates}=require('../src/updates.cjs');
// Exercise the actual updater's downloader and SHA-512 verification against a
// local fixture. Fixture bytes are never executable and no installer is started.
test('real Windows updater downloads verified bytes and rejects checksum mismatch',{skip:process.platform!=='win32'},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'meo-update-download-')),bytes=Buffer.from('MEO CHECKSUM FIXTURE '.repeat(12000)),name='Meo-Desktop-Setup-0.8.0-x64.exe',hash=crypto.createHash('sha512').update(bytes).digest('base64');let server,controller,quits=0;
 try{
  for(const corrupt of [false,true]){
   const dir=path.join(root,corrupt?'corrupt':'valid');fs.mkdirSync(dir,{recursive:true});const config=path.join(dir,'app-update.yml');fs.writeFileSync(config,'publisherName: null\nupdaterCacheDirName: meo-updater-fixture\n');
   const manifest=`version: 0.8.0\nfiles:\n  - url: ${name}\n    sha512: ${hash}\n    size: ${bytes.length}\npath: ${name}\nsha512: ${hash}\n`;
   server=http.createServer((req,res)=>{if(req.url.split('?')[0]==='/latest.yml'){res.writeHead(200,{'Content-Type':'text/yaml'});res.end(manifest);}else if(req.url===('/'+name)){const data=corrupt?Buffer.alloc(bytes.length,5):bytes;res.writeHead(200,{'Content-Length':data.length});res.end(data);}else{res.writeHead(404);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const feed='http://127.0.0.1:'+server.address().port+'/';
   const adapter={version:'0.7.2',name:'MeoUpdaterFixture',isPackaged:true,appUpdateConfigPath:config,userDataPath:dir,baseCachePath:dir,whenReady:async()=>{},quit:()=>{quits++;},relaunch:()=>{quits++;},onQuit:()=>{throw new Error('Automatic install on quit must be disabled');}};
   const native=new NodeHttpExecutor();class FixtureExecutor extends ElectronHttpExecutor{createRequest(options,callback){return native.createRequest(options,callback);}}
   const sdkErrors=[],sdk=new NsisUpdater(null,adapter);sdk.on('error',error=>sdkErrors.push(error.stack||error.message));sdk.httpExecutor=new FixtureExecutor();sdk.setFeedURL({provider:"generic",url:feed,useMultipleRangeRequest:false});sdk.disableDifferentialDownload=true;sdk.disableWebInstaller=true;
   const repo='https://github.com/duytienkaka/meo-desktop',release={tag_name:'v0.8.0',html_url:repo+'/releases/tag/v0.8.0',draft:false,assets:[name,'latest.yml'].map(name=>({name,size:bytes.length,browser_download_url:repo+'/releases/download/v0.8.0/'+name}))};
   controller=createUpdates({app:{isPackaged:true,getVersion:()=> '0.7.2'},platform:'win32',arch:'x64',fetcher:async()=>({ok:true,text:async()=>JSON.stringify([release])}),openExternal:async()=>{},createEngine:()=>sdk});
   assert.equal((await controller.action('check')).status,'available',sdkErrors.join('\n'));const result=await controller.action('download');assert.equal(result.status,corrupt?'error':'downloaded',sdkErrors.join('\n'));assert.equal(quits,0);
   if(corrupt)await assert.rejects(controller.action('install'));else{assert.ok(sdk.installerPath);assert.equal(crypto.createHash('sha512').update(fs.readFileSync(sdk.installerPath)).digest('base64'),hash);}
   controller.dispose();controller=null;await new Promise(resolve=>server.close(resolve));server=null;
  }
 }finally{controller?.dispose();if(server)await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true});}
});
