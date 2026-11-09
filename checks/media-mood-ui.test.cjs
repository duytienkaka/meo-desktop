'use strict';
const {_electron}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),prefs=path.join(process.env.MEO_APP_ROOT||(process.env.MEO_EXECUTABLE?process.platform==='darwin'?path.resolve(path.dirname(process.env.MEO_EXECUTABLE),'../Resources/app'):path.join(path.dirname(process.env.MEO_EXECUTABLE),'resources/app'):root),'checks/user-data/settings.json'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;let app;
const previous=fs.existsSync(prefs)?fs.readFileSync(prefs):null;
async function launch(){app=await _electron.launch({executablePath:process.env.MEO_EXECUTABLE||path.join(root,'.cache/electron-dist-45.0.0-win32-x64/electron.exe'),args:[...(process.env.MEO_APP_ROOT?[process.env.MEO_APP_ROOT]:process.env.MEO_EXECUTABLE?[]:[root]),'--meo-test'],env});const page=await app.firstWindow();await page.waitForFunction(()=>window.meoPet?.snapshot().frame);return page;}
async function mode(){return app.evaluate(()=>global.__meo.state().mode);}
async function feed(playing,hasSession=true){await app.evaluate((_,s)=>global.__meo.receiveMedia(s),{available:true,playing,hasSession,title:hasSession?'Fixture song':'',artist:hasSession?'Fixture artist':'',sourceAppId:hasSession?'Spotify.exe':''});}
(async()=>{
 fs.mkdirSync(path.dirname(prefs),{recursive:true});fs.writeFileSync(prefs,JSON.stringify({mode:'music',autoMedia:true}));
 let page=await launch();assert.equal(await mode(),'play','legacy automatic music preference must not stick on startup');
 await app.evaluate(()=>{global.__meo.setMode('music');global.__meo.setAutoMedia(true);});assert.equal(await mode(),'play','enabling auto from manual music must restore a non-music base');
 await feed(true);await page.waitForFunction(()=>window.meoPet.snapshot().frame.mode==='music');
 await feed(false);await page.waitForTimeout(500);assert.equal(await mode(),'music','brief track-change gap keeps listening pose');
 await feed(false);await page.waitForFunction(()=>window.meoPet.snapshot().frame.mode==='play',null,{timeout:4000});
 await feed(true);await page.waitForFunction(()=>window.meoPet.snapshot().frame.mode==='music');await feed(false,false);await page.waitForFunction(()=>window.meoPet.snapshot().frame.mode==='play',null,{timeout:4000});
 await app.evaluate(()=>{global.__meo.setMode('focus');global.__meo.setAutoMedia(true);});await feed(true);await feed(false);await page.waitForFunction(()=>window.meoPet.snapshot().frame.mode==='focus',null,{timeout:4000});
 await app.close();app=null;page=await launch();assert.equal(await mode(),'focus','automatic listening must not overwrite saved base mood');
 await app.evaluate(()=>global.__meo.setMode('music'));await feed(false);await page.waitForTimeout(2400);assert.equal(await mode(),'music','explicit manual listening remains supported');
 console.log('PASS: legacy preference, enabling auto from music, pause, closed session, focus restore, restart and manual music.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();if(previous)fs.writeFileSync(prefs,previous);else if(fs.existsSync(prefs))fs.unlinkSync(prefs);});
