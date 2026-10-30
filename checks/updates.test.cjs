'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {createUpdates,selectRelease,validateManifest}=require('../src/updates.cjs');
const REPO='https://github.com/duytienkaka/meo-desktop',hash=Buffer.alloc(64,7).toString('base64');
function release(version='0.8.0',platform='win32',arch='x64',manifest=true){const tag='v'+version,name=platform==='win32'?`Meo-Desktop-Setup-${version}-${arch}.exe`:`Meo-Desktop-${version}-mac-${arch}.dmg`,asset=name=>({name,size:100,browser_download_url:`${REPO}/releases/download/${tag}/${name}`});return {tag_name:tag,html_url:`${REPO}/releases/tag/${tag}`,draft:false,prerelease:true,body:'Bản mới\n<script>untrusted notes</script>',assets:[asset(name),...(manifest?[asset('latest.yml')]:[])]};}
function fixture(options={}){
 const events=[],opened=[],notifications=[],installs=[];let checks=0,downloads=0,feeds=[];
 const engine=new EventEmitter();engine.checkForUpdates=async()=>({isUpdateAvailable:true,updateInfo:{version:'0.8.0',files:[{url:'Meo-Desktop-Setup-0.8.0-x64.exe',sha512:hash,size:100}]},cancellationToken:{cancel(){events.push('cancel');}}});engine.downloadUpdate=async()=>{downloads++;engine.emit('download-progress',{percent:30});return ['fixture.exe'];};engine.quitAndInstall=(...args)=>installs.push(args);
 const updater=createUpdates({app:{isPackaged:true,getVersion:()=> '0.7.2'},platform:'win32',arch:'x64',fetcher:async()=>{checks++;return {ok:true,text:async()=>JSON.stringify([release()])};},createEngine:feed=>{feeds.push(feed);return engine;},openExternal:async url=>opened.push(url),onChange:value=>events.push(value),onAvailable:value=>notifications.push(value),...options});
 return {updater,engine,events,opened,notifications,installs,counts:()=>({checks,downloads}),feeds};
}
test('release selection uses semver, includes preview releases and rejects drafts/foreign installers',()=>{
 const foreign=release('9.0.0');foreign.assets[0].browser_download_url='https://example.com/setup.exe';const draft={...release('8.0.0'),draft:true};
 assert.equal(selectRelease([release('0.9.0'),foreign,draft,release('0.10.0')],'0.7.2','win32','x64').version,'0.10.0');
 assert.equal(selectRelease([release('0.7.2'),release('0.7.1')],'0.7.2','win32','x64'),null);
 const wrongPage=release();wrongPage.html_url='https://github.com/another/repo/releases/tag/v0.8.0';assert.equal(selectRelease([wrongPage],'0.7.2','win32','x64'),null);
});
test('Mac selects correct DMG architecture and never creates Windows installer engine',async()=>{
 const f=fixture({platform:'darwin',arch:'arm64',fetcher:async()=>({ok:true,text:async()=>JSON.stringify([release('0.8.0','darwin','x64'),release('0.8.0','darwin','arm64')])}),createEngine:()=>{throw new Error('Must not use Windows updater');}});
 assert.equal((await f.updater.action('check')).status,'available');assert.equal(f.updater.snapshot().canDownload,false);await f.updater.action('manual');assert.match(f.opened[0],/mac-arm64\.dmg$/);await assert.rejects(f.updater.action('download'));await assert.rejects(f.updater.action('install'));assert.equal(f.installs.length,0);
});
test('Windows check does not download or install; download and install require separate user actions',async()=>{
 const f=fixture();await assert.rejects(f.updater.action('install'));assert.equal((await f.updater.action('check')).status,'available');assert.equal(f.engine.autoDownload,false);assert.equal(f.engine.autoInstallOnAppQuit,false);assert.equal(f.engine.allowDowngrade,false);assert.equal(f.counts().downloads,0);assert.equal(f.installs.length,0);
 assert.equal(f.feeds[0],REPO+'/releases/download/v0.8.0/');assert.equal((await f.updater.action('download')).status,'downloaded');assert.ok(f.events.some(e=>e.progress===30));assert.equal(f.installs.length,0);await f.updater.action('install');assert.deepEqual(f.installs,[[true,true]]);
});
test('unverified or mismatched manifests cannot be downloaded or installed',async()=>{
 const f=fixture();f.engine.checkForUpdates=async()=>({isUpdateAvailable:true,updateInfo:{version:'0.8.0',files:[{url:'https://evil.example/setup.exe',sha512:hash,size:100}]}});assert.equal((await f.updater.action('check')).status,'error');await assert.rejects(f.updater.action('download'));await assert.rejects(f.updater.action('install'));assert.equal(f.counts().downloads,0);assert.equal(f.installs.length,0);
 const candidate={version:'0.8.0',name:'setup.exe'};assert.equal(validateManifest({version:'0.9.0',files:[{url:'setup.exe',sha512:hash,size:100}]},candidate),false);assert.equal(validateManifest({version:'0.8.0',files:[{url:'../setup.exe',sha512:hash,size:100}]},candidate),false);
});
test('failed download cannot transition to ready or invoke installer',async()=>{
 const f=fixture();f.engine.downloadUpdate=async()=>{throw new Error('Checksum mismatch');};await f.updater.action('check');assert.equal((await f.updater.action('download')).status,'error');await assert.rejects(f.updater.action('install'));assert.equal(f.installs.length,0);
});
test('checks serialize, notifications deduplicate and offline checks can be retried',async()=>{
 let unblock;const gate=new Promise(resolve=>{unblock=resolve;});let requests=0;const f=fixture({fetcher:async()=>{requests++;await gate;return {ok:true,text:async()=>JSON.stringify([release()])};}});const first=f.updater.action('check'),second=f.updater.action('check');unblock();await Promise.all([first,second]);assert.equal(requests,1);assert.equal(f.notifications.length,1);await f.updater.action('check');assert.equal(f.notifications.length,1);
 let fail=true;const offline=fixture({fetcher:()=>{if(fail)throw new Error('Offline');return Promise.resolve({ok:true,text:async()=>JSON.stringify([])});}});assert.equal((await offline.updater.action('check')).status,'error');fail=false;assert.equal((await offline.updater.action('check')).status,'up-to-date');
});
test('missing update metadata falls back to the exact installer, without running it',async()=>{
 const f=fixture({fetcher:async()=>({ok:true,text:async()=>JSON.stringify([release('0.8.0','win32','x64',false)])})});const result=await f.updater.action('check');assert.equal(result.status,'available');assert.equal(result.canDownload,false);assert.equal(f.feeds.length,0);await f.updater.action('manual');assert.match(f.opened[0],/Meo-Desktop-Setup-0\.8\.0-x64\.exe$/);await assert.rejects(f.updater.action({action:'install',url:'https://evil.example'}));
});
test('development/test sessions do not access the network and disposing cancels pending work',async()=>{
 const f=fixture({testMode:true,fetcher:()=>{throw new Error('Must not fetch');}});assert.equal((await f.updater.action('check')).status,'unavailable');f.updater.start();f.updater.dispose();
 const active=fixture();await active.updater.action('check');active.updater.dispose();assert.ok(active.events.includes('cancel'));
});
