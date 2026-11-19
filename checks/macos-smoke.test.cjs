const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');const {_electron}=require('playwright');const {createMacBridge}=require('../src/macos.cjs');let app;
(async()=>{
 if(process.platform!=='darwin')throw new Error('Run this check on macOS.');
 const bridge=createMacBridge();try{const audio=await bridge.request({kind:'audio',action:'read'});assert.equal(audio.available,true);assert.ok(audio.level>=0&&audio.level<=100);}finally{bridge.stop();}
 app=await _electron.launch({executablePath:process.env.MEO_EXECUTABLE,args:['--meo-test']});const pet=await app.firstWindow(),errors=[];pet.on('pageerror',e=>errors.push(e.message));await pet.waitForFunction(()=>window.meoPet?.snapshot().frame);assert.equal(await pet.evaluate(()=>typeof require),'undefined');
 const state=await app.evaluate(()=>global.__meo.state());assert.ok(state.visible);assert.ok(state.bounds.width>0);assert.equal(state.focusable,true);
 await app.evaluate(()=>{global.__meo.setAutoMedia(false);global.__meo.setMode('play');global.__meo.setPaused(true);const area=global.__meo.state().display.workArea;global.__meo.placeFree({x:area.x+area.width/2,y:area.y+area.height/2});});
 const point=await pet.evaluate(()=>window.meoPet.snapshot().frame);assert.equal(point.rotation,0);
 const opened=app.waitForEvent('window');await app.evaluate(()=>global.__meo.openSettings('apps'));const settings=await opened;settings.on('pageerror',e=>errors.push(e.message));await settings.waitForFunction(()=>document.querySelector('#page-apps').classList.contains('active'));assert.equal(await settings.locator('#add-pin').isEnabled(),true);assert.equal(await settings.locator('#add-game').count(),0);
 await settings.locator('[data-tab="auto"]').click();assert.equal(await settings.locator('#autoMedia').isEnabled(),true);assert.equal(await settings.locator('#autoGame').count(),0);
 const playerOpened=app.waitForEvent('window');await app.evaluate(()=>{global.__meo.receiveMedia({available:true,hasSession:true,playing:true,sourceAppId:'com.apple.Music',title:'Bản thử macOS',canPause:true,canPlay:true,duration:120,canSeek:true});global.__meo.openPlayer();});const player=await playerOpened;player.on('pageerror',e=>errors.push(e.message));await player.waitForFunction(()=>document.querySelector('#title').textContent==='Bản thử macOS');assert.equal(await player.locator('#pause-icon').isVisible(),true);
 await app.evaluate(({app,nativeImage})=>{const shots=global.__meo.screenshots,image=nativeImage.createFromPath(app.getAppPath()+'/assets/meo-mac.png');for(let i=0;i<4;i++)shots.addImage(image);if(shots.snapshot().photos.length!==3||!shots.snapshot().supported)throw new Error('Mac photo store unavailable');global.__meo.setMode('play');});
 await pet.waitForFunction(()=>!document.querySelector('#photo-pocket').hidden&&document.querySelector('#send-photos').textContent==='Đưa 3 ảnh ↗');assert.equal(await pet.locator('#send-photos').count(),1);
 const dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'meo-mac-smoke-')),file=path.join(dir,'photo.png');fs.copyFileSync(path.join(__dirname,'../assets/meo-mac.png'),file);try{await app.evaluate(async(_,file)=>global.__meo.screenshots.bridge.files([file]),file);}finally{fs.unlinkSync(file);fs.rmdirSync(dir);}
 const pocketBounds=await pet.locator('#photo-pocket').boundingBox();assert.ok(pocketBounds.width<=90&&pocketBounds.height<=58);assert.equal(await pet.locator('#inspect-photos button').count(),3);assert.deepEqual(errors,[]);
 const fixture=await pet.evaluate(()=>{
  const c=document.createElement('canvas');c.width=1050;c.height=180;
  const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle='black';ctx.font='52px Arial';ctx.fillText('Chụp màn hình và nhận diện chữ',24,82);
  return c.toDataURL();
 });
 const recognized=await app.evaluate(({app,nativeImage},url)=>{
  const localRequire=process.getBuiltinModule('module').createRequire(app.getAppPath()+'/package.json');
  return localRequire('./src/screenshot-ocr.cjs').recognizeScreenshot(nativeImage.createFromDataURL(url));
 },fixture);
 assert.equal(recognized,'Chụp màn hình và nhận diện chữ');
 await app.evaluate(()=>global.__meo.screenshots.clear());
 await app.close();app=null;console.log(JSON.stringify({passed:true,platform:process.platform,arch:process.arch,checks:['system volume read without mutation','packaged app launches','isolated renderer','free placement','settings and pinned app picker enabled','music card renders','no renderer errors','compact three-photo UI','Vietnamese OCR from the packaged app','native PNG file clipboard preparation']}));
})().catch(async error=>{console.error(error);if(app)await app.close().catch(()=>{});process.exitCode=1;});
