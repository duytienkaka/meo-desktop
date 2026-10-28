const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createMacBridge,createMacMonitor,createMacAudio,createMacTransport,scanMacLibrary}=require('../src/macos.cjs');
const {candidate}=require('../src/game.cjs'),{validLibrary}=require('../src/library.cjs');
test('mac bridge passes JSON as a separate argument, never interpolates script text',async()=>{
 let call;const bridge=createMacBridge({exec:(file,args,options,callback)=>{call={file,args,options};queueMicrotask(()=>callback(null,'{"success":true}'));return {kill(){}};}});
 await bridge.request({kind:'media',action:'open',source:'com.spotify.client',value:'"; do shell script "x'});
 assert.equal(call.file,'/usr/bin/osascript');assert.equal(call.options.shell,false);assert.equal(JSON.parse(call.args.at(-1)).value,'"; do shell script "x');assert.ok(call.args[2].endsWith('bridge.jxa.js'));
});
test('mac transport validates targets/positions and does not send a second concurrent command',async()=>{
 let resolve;const calls=[],bridge={request:value=>{calls.push(value);return new Promise(r=>{resolve=r;});},stop(){}};const transport=createMacTransport({bridge});
 const pending=transport.command('seek','com.apple.Music',22.5);await assert.rejects(transport.command('play','com.apple.Music'));resolve({success:true});await pending;assert.equal(calls[0].value,22.5);
 await assert.rejects(transport.command('open','evil.app'));await assert.rejects(transport.command('seek','com.spotify.client',Infinity));assert.equal(calls.length,1);
});
test('mac audio serializes changes and validates device responses',async()=>{
 const calls=[],states=[],audio=createMacAudio({bridge:{request:async value=>{calls.push(value);return {available:true,level:42,muted:true};},stop(){}},onSample:s=>states.push(s)});
 const result=await audio.command('step',2);assert.equal(result.level,42);assert.equal(result.muted,true);await assert.rejects(audio.command('step',100));assert.equal(calls.length,1);audio.stop();
 const unavailable=createMacAudio({bridge:{request:async()=>({available:false,level:0,muted:false}),stop(){}}});await assert.rejects(unavailable.command('read'));unavailable.stop();
});
test('mac monitor stops without emitting stale samples after a pending call finishes',async()=>{
 let resolve;const samples=[],monitor=createMacMonitor({kind:'game',onSample:s=>samples.push(s),bridge:{request:()=>new Promise(r=>resolve=r),stop(){}}});monitor.start();monitor.stop();resolve({available:true});await new Promise(r=>setImmediate(r));assert.deepEqual(samples,[]);assert.equal(monitor.isRunning(),false);
});
test('mac Steam scanning finds app bundles and game detection retains explicit app identities',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'meo-mac-library-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'steamapps/common/Cozy/Cozy.app/Contents'),{recursive:true});fs.writeFileSync(path.join(root,'steamapps/appmanifest_1.acf'),'"name" "Cozy" "installdir" "Cozy"');
 const result=await scanMacLibrary({roots:[root]});assert.equal(result.games.length,1);assert.deepEqual(result.games[0].exes,['cozy.app']);assert.deepEqual(validLibrary(result.games)[0].exes,['cozy.app']);
 const sample={available:true,foreground:{pid:3,exe:'Cozy.app'}};assert.equal(candidate(sample,{games:['cozy.app']}).exe,'cozy.app');assert.equal(candidate(sample,{games:['cozy.app'],ignored:['cozy.app']}),null);assert.equal(candidate({available:true,foreground:{pid:5,exe:'Safari.app'}}),null);
});
