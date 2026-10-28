const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {_electron}=require('playwright');
const executable=process.env.MEO_EXECUTABLE||path.resolve(__dirname,'../../outputs/Meo-Desktop-0.4-win-x64/Meo.exe');
let app;
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
async function launch(extra=[]){app=await _electron.launch({executablePath:executable,args:['--meo-test',...extra],env,timeout:30000});const page=await app.firstWindow();await page.waitForFunction(()=>window.meoPet?.snapshot().frame);return page;}
async function state(){return app.evaluate(()=>global.__meo.state());}
async function feed(sample){return app.evaluate((_e,value)=>global.__meo.receiveMedia(value),sample);}
(async()=>{
  let page=await launch();
  await app.evaluate(()=>{global.__meo.setMode('focus');global.__meo.setAutoMedia(true);});
  assert.equal((await state()).mode,'focus');
  await feed({available:true,playing:true});await page.waitForFunction(()=>window.meoPet.snapshot().frame.mode==='music');
  assert.equal((await state()).baseMode,'focus');assert.equal((await state()).autoMedia,true);
  await feed({available:true,playing:false});await page.waitForTimeout(500);assert.equal((await state()).mode,'music');
  await feed({available:true,playing:true});await page.waitForTimeout(2400);assert.equal((await state()).mode,'music');
  await feed({available:true,playing:false});await page.waitForTimeout(2400);assert.equal((await state()).mode,'focus');
  await feed({available:true,playing:true});await app.evaluate(()=>global.__meo.setMode('game'));
  await feed({available:true,playing:true});assert.equal((await state()).mode,'game');assert.equal((await state()).autoMedia,false);
  await app.evaluate(()=>{global.__meo.setMode('play');global.__meo.setAutoMedia(true);});
  await feed({available:true,playing:true});await feed({available:false,playing:false});await page.waitForTimeout(2400);assert.equal((await state()).mode,'play');
  await feed({available:true,playing:true});assert.equal((await state()).mode,'music');
  const settingsPath=path.join(await app.evaluate(({app})=>app.getPath('userData')),'settings.json');
  await app.close();app=null;
  const settings=JSON.parse(fs.readFileSync(settingsPath,'utf8'));assert.equal(settings.mode,'play');assert.equal(settings.autoMedia,true);
  // Separate native run: real Windows sessions are observed without controlling any player.
  page=await launch(['--meo-live-media-test']);
  await app.evaluate(()=>{global.__meo.setMode('play');global.__meo.setAutoMedia(true);});
  await page.waitForFunction(()=>window.meoPet.snapshot().frame.mode,{},{timeout:10000});
  let nativeState;
  for(let i=0;i<30;i++){nativeState=await state();if(['playing','paused'].includes(nativeState.mediaStatus))break;await page.waitForTimeout(300);}
  assert.ok(['playing','paused'].includes(nativeState.mediaStatus),'Real Windows media API must be available');
  assert.equal(nativeState.mode,nativeState.mediaStatus==='playing'?'music':'play');
  const helperPid=await app.evaluate(()=>global.__meo.mediaPid());assert.ok(helperPid>0);
  await app.close();app=null;
  await new Promise(resolve=>setTimeout(resolve,400));
  let helperAlive=true;try{process.kill(helperPid,0);}catch(error){if(error.code==='ESRCH')helperAlive=false;else throw error;}
  assert.equal(helperAlive,false,'Native watcher should terminate with the app');
  const report={passed:true,nativeWindowsMediaStatus:nativeState.mediaStatus,checks:['real Windows media session reader','playing enters music','pause grace period','track change stays in music','restores previous mood','manual choice overrides automation','helper failure falls back','reconnect resumes music','automatic mood not persisted as manual','native helper exits on quit']};
  fs.writeFileSync(path.join(__dirname,'media-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(async error=>{console.error(error);if(app)await app.close().catch(()=>{});process.exit(1);});
