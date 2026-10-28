const test=require('node:test'),assert=require('node:assert/strict');
const {decodeMedia,createMediaTransport}=require('../src/media.cjs');
test('media metadata and capability flags are sanitized and bounded',()=>{
 const sample=decodeMedia({available:true,playing:false,hasSession:true,title:'Mèo\u0000'.repeat(100),artist:'Artist',canPlay:true,canPause:1,canNext:false,sourceAppId:'fixture'});
 assert.equal(sample.hasSession,true);assert.equal(sample.canPause,false);assert.equal(sample.canPlay,true);assert.equal(sample.title.length,200);assert.equal(sample.title.includes('\u0000'),false);
 const media=decodeMedia({available:true,playing:true,artwork:'https://remote.example/cover.png',position:999,duration:210});assert.equal(media.artwork,'');assert.equal(media.position,210);
 assert.equal(decodeMedia({available:true,playing:false,artwork:'data:image/svg+xml;base64,PHN2Zz4=',position:-10}).artwork,'');
});
test('transport targets the displayed app with argument arrays, prevents concurrent commands and validates input',async()=>{
 let complete,called,killed=false;
 const transport=createMediaTransport({platform:'win32',exec:(file,args,options,callback)=>{called={args,options};complete=callback;return{kill:()=>{killed=true;callback(new Error('Stopped'));}};}});
 const request=transport.command('pause','fixture-player');assert.deepEqual(called.args.slice(1),['pause','fixture-player']);assert.equal(called.options.shell,false);
 await assert.rejects(transport.command('next','fixture-player'));complete(null,'{"success":true}');await request;
 await assert.rejects(transport.command('launch','fixture-player'));await assert.rejects(transport.command('play','bad\nsource'));
 const pending=transport.command('next','fixture-player');transport.stop();await assert.rejects(pending);assert.equal(killed,true);
});
test('unsupported player response is an error, not a successful UI command',async()=>{
 const transport=createMediaTransport({platform:'win32',exec:(_f,_a,_o,callback)=>{queueMicrotask(()=>callback(null,'{"success":false,"error":"NotSupported"}'));return{kill(){}};}});
 await assert.rejects(transport.command('next','fixture'));
});
