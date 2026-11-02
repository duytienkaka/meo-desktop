const { _electron }=require('playwright'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;let app;
(async()=>{
 app=await _electron.launch({executablePath:path.join(root,'.cache/electron-dist-45.0.0-win32-x64/electron.exe'),args:[root,'--meo-test','--force-device-scale-factor=1.5'],env});
 const pet=await app.firstWindow();await pet.waitForFunction(()=>window.meoPet?.snapshot().frame);
 await app.evaluate(()=>{global.__meo.setVisible(true);global.__meo.setMode('play');global.__meo.setPaused(true);global.__meo.setSize(148);});await pet.waitForTimeout(900);
 await pet.evaluate(()=>{const ctx=document.querySelector('canvas').getContext('2d'),original=ctx.drawImage.bind(ctx);ctx.drawImage=(...args)=>{if(args.length===9&&/\/(core|moods|actions)\.png$/.test(args[0]?.src||'')){const m=ctx.getTransform(),[x,y,w,h]=args.slice(5),d=devicePixelRatio;window.spriteCorners=[{x,y},{x:x+w,y},{x,y:y+h},{x:x+w,y:y+h}].map(p=>({x:(m.a*p.x+m.c*p.y+m.e)/d,y:(m.b*p.x+m.d*p.y+m.f)/d}));}return original(...args);};});
 for(let i=0;i<32;i++){
  await app.evaluate((_,fraction)=>{global.__meo.move(global.__meo.route().total*fraction);},i/32);await pet.waitForTimeout(50);
  assert.equal(await pet.evaluate(()=>spriteCorners.every(p=>p.x>=0&&p.y>=0&&p.x<=innerWidth&&p.y<=innerHeight)),true,'rotated sprite must fit canvas');
 }
 const opened=app.waitForEvent('window');await app.evaluate(()=>global.__meo.openSettings('utilities'));const settings=await opened;
 await settings.waitForSelector('#utility-clipboard-photos');
 await app.evaluate(({clipboard,nativeImage})=>{global.clipboardValue='old';clipboard.readImage=()=>global.clipboardValue?nativeImage.createFromBuffer(Buffer.from(global.clipboardValue,'base64')):nativeImage.createEmpty();global.clipboardValue='';global.__meo.screenshots.clear();});
 await settings.locator('#utility-clipboard-photos').check();
 await app.evaluate(({nativeImage,app})=>{global.__meo.clipboardPhotos.sample();global.clipboardValue=nativeImage.createFromPath(app.getAppPath()+'/assets/meo-mac.png').toPNG().toString('base64');global.__meo.clipboardPhotos.sample();global.__meo.clipboardPhotos.sample();});
 assert.equal(await app.evaluate(()=>global.__meo.screenshots.snapshot().photos.length),1);
 await settings.locator('#utility-clipboard-photos').uncheck();
 console.log('PASS: rendered cat bounds at 150% scale across 32 edge/corner positions; opt-in UI; mocked clipboard image enters photo pocket exactly once. No real clipboard read or modified.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();});
