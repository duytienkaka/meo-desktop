'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createStartup,agentPlist,startsInBackground}=require('../src/startup.cjs');
test('Windows uses installed executable/background args, reflects OS disable and removes registration',async()=>{
 let settings={openAtLogin:false},writes=[];
 const app={isPackaged:true,getLoginItemSettings:options=>{assert.deepEqual(options,{path:'C:\\Program Files\\Mèo\\Meo.exe',args:['--background']});return settings;},setLoginItemSettings:value=>{writes.push(value);settings={openAtLogin:value.openAtLogin,executableWillLaunchAtLogin:value.enabled};}};
 const startup=createStartup({app,platform:'win32',executable:'C:\\Program Files\\Mèo\\Meo.exe'});
 assert.equal(startup.refresh().enabled,false);assert.equal(writes.length,0);
 assert.equal((await startup.set(true)).enabled,true);assert.equal(writes[0].name,'Meo Desktop');assert.equal(writes[0].enabled,true);
 settings={openAtLogin:true,executableWillLaunchAtLogin:true,launchItems:[{name:'Meo Desktop',enabled:false}]};assert.equal(startup.refresh().status,'blocked');assert.equal(startup.snapshot().enabled,false);
 assert.equal((await startup.set(false)).enabled,false);assert.equal(writes[1].openAtLogin,false);
 await assert.rejects(startup.set('true'),/không hợp lệ/);assert.equal(writes.length,2);
});
test('development/test/unsupported sessions cannot register any startup item',async()=>{
 for(const options of [{platform:'win32',app:{isPackaged:false}},{platform:'darwin',app:{isPackaged:true},testMode:true},{platform:'linux',app:{isPackaged:true}}]){
  const startup=createStartup(options);assert.equal(startup.refresh().supported,false);await assert.rejects(startup.set(true),/cài bản/);
 }
});
test('Windows readback failures are reported instead of falsely claiming startup enabled',async()=>{
 const startup=createStartup({platform:'win32',app:{isPackaged:true,setLoginItemSettings:()=>{},getLoginItemSettings:()=>({openAtLogin:false})}});await assert.rejects(startup.set(true),/chưa áp dụng/);
});
test('Mac LaunchAgent preserves Unicode/spaces, launches quietly and cleans up on disable',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'meo-startup-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));const calls=[];
 const startup=createStartup({app:{isPackaged:true},platform:'darwin',home,uid:501,executable:'/Applications/Mèo & Bạn.app/Contents/MacOS/Meo',exec:(file,args,options,done)=>{calls.push({file,args,options});done(null,'','');}});
 assert.equal(startup.refresh().enabled,false);assert.equal(calls.length,0);
 assert.equal((await startup.set(true)).enabled,true);const plist=fs.readFileSync(path.join(home,'Library/LaunchAgents/vn.meo.desktop.plist'),'utf8');assert.ok(plist.includes('Mèo &amp; Bạn.app'));assert.ok(plist.includes('<string>--background</string>'));assert.ok(plist.includes('<key>RunAtLoad</key><true/>'));assert.ok(!plist.includes('KeepAlive'));
 assert.deepEqual(calls[1].args,['bootstrap','gui/501',path.join(home,'Library/LaunchAgents/vn.meo.desktop.plist')]);assert.ok(calls.every(c=>c.file==='/bin/launchctl'&&c.options.shell===false));
 assert.equal((await startup.set(false)).enabled,false);assert.ok(!fs.existsSync(path.join(home,'Library/LaunchAgents/vn.meo.desktop.plist')));
});
test('Mac bootstrap failure restores previous registration and missing service is safe to disable',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'meo-startup-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));const file=path.join(home,'Library/LaunchAgents/vn.meo.desktop.plist');fs.mkdirSync(path.dirname(file),{recursive:true});const previous=agentPlist('/Applications/Old.app');fs.writeFileSync(file,previous);
 const startup=createStartup({app:{isPackaged:true},platform:'darwin',home,uid:501,executable:'/Applications/Meo.app/Contents/MacOS/Meo',exec:(_file,args,_options,done)=>done(Object.assign(new Error(),{code:args[0]==='bootout'?3:5}),'',args[0]==='bootout'?'No such process':'Blocked')});
 await assert.rejects(startup.set(true),/macOS/);assert.equal(fs.readFileSync(file,'utf8'),previous);assert.equal(startup.refresh().status,'moved');assert.equal((await startup.set(false)).enabled,false);
});
test('Mac refuses registration from a mounted installer and launch arguments do not open settings twice',async()=>{
 const startup=createStartup({app:{isPackaged:true},platform:'darwin',uid:501,executable:'/Volumes/Meo/Meo.app/Contents/MacOS/Meo'});await assert.rejects(startup.set(true),/Applications/);
 assert.equal(startsInBackground(['Meo','--background']),true);assert.equal(startsInBackground(['Meo']),false);assert.equal(startsInBackground(['Meo','--background-fake']),false);
});
