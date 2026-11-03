const {_electron}=require('playwright'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;let app;
(async()=>{
 app=await _electron.launch({executablePath:path.join(root,'.cache/electron-dist-45.0.0-win32-x64/electron.exe'),args:[root,'--meo-test'],env});
 const pet=await app.firstWindow(),errors=[];pet.on('pageerror',error=>errors.push(error.message));await pet.waitForFunction(()=>window.meoPet?.snapshot().frame);
 await app.evaluate(()=>{global.__meo.utilities.badge=()=>({count:0,due:0});global.__meo.screenshots.clear();global.__meo.setVisible(true);global.__meo.setMode('play');global.__meo.setPaused(true);});
 const opened=app.waitForEvent('window');await app.evaluate(()=>global.__meo.openSettings());const settings=await opened;settings.on('pageerror',error=>errors.push(error.message));
 await settings.waitForSelector('[data-character="muc"]');await settings.waitForTimeout(600);
 assert.equal(await settings.locator('[data-character]').count(),4);
 for(const id of ['mit','may','muc','classic']){
   await settings.locator(`[data-character="${id}"]`).click();
   await settings.waitForFunction(id=>document.querySelector(`[data-character="${id}"]`).getAttribute('aria-pressed')==='true',id);
   await pet.waitForFunction(id=>window.meoPet.snapshot().frame.character===id,id);
   const p=await pet.evaluate(()=>window.meoPet.snapshot().renderedPose);
   assert.equal(p.sheet,id==='classic'?'core':id);
   assert.equal(await pet.evaluate(()=>{const c=document.querySelector('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height);let filled=0,total=0;for(let y=0;y<c.height;y+=3)for(let x=0;x<c.width;x+=3){const a=d.data[(y*c.width+x)*4+3];filled+=a>48;total++;}return filled>30&&filled/total<.5;}),true,'visible transparent cat');
   assert.equal(await pet.evaluate(()=>{for(let y=0;y<innerHeight;y+=5)for(let x=0;x<innerWidth;x+=5)if(window.meoPet.hitAt({x,y}))return true;return false;}),true,'alpha hit test follows each cat');
 }
 await settings.locator('[data-character="may"]').click();await settings.waitForFunction(()=>document.querySelector('[data-character="may"]').getAttribute('aria-pressed')==='true');
 const userData=await app.evaluate(({app})=>app.getPath('userData')),stored=JSON.parse(fs.readFileSync(path.join(userData,'settings.json'),'utf8'));assert.equal(stored.character,'may');
 await assert.rejects(settings.evaluate(()=>window.settings.update({character:'../evil'})));
 await app.evaluate(()=>{global.__meo.setPaused(false);global.__meo.setMode('music');});
 await pet.waitForFunction(()=>window.meoPet.snapshot().renderedPose.sheet==='may'&&window.meoPet.snapshot().renderedPose.index>=12);
 await settings.waitForTimeout(400);await settings.screenshot({path:path.join(root,'.cache/characters-settings.png')});
 await pet.screenshot({path:path.join(root,'.cache/characters-pet.png')});
 const before=await pet.evaluate(()=>window.meoPet.snapshot().renderCount);await pet.waitForTimeout(500);const after=await pet.evaluate(()=>window.meoPet.snapshot().renderCount);assert.ok(after-before>=18,'animation renders above old 30 Hz on normal display');
 await pet.emulateMedia({reducedMotion:'reduce'});await pet.waitForTimeout(100);assert.equal(await pet.evaluate(()=>window.meoPet.snapshot().transitioning),false);
 await settings.locator('[data-character="classic"]').click();await pet.waitForFunction(()=>window.meoPet.snapshot().frame.character==='classic');
 assert.deepEqual(errors,[]);
 console.log('PASS: 4 character choices, live switching, alpha hit targets, local persistence, invalid ID rejection, music identity, smooth renderer and reduced motion.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await app?.close();});

