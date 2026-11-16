const {_electron}=require('playwright'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
(async()=>{let app;
try{
 app=await _electron.launch({executablePath:path.join(root,'.cache/electron-dist-45.0.0-win32-x64/electron.exe'),args:[root,'--meo-test'],env});
 const pet=await app.firstWindow();await pet.waitForFunction(()=>window.meoPet?.snapshot().frame);
 const ids=await app.evaluate(({nativeImage,app})=>{
  global.__meo.setPaused(false);global.__meo.screenshots.clear();
  const image=nativeImage.createFromPath(app.getAppPath()+'/assets/meo-mac.png').resize({width:100});
  return [1,2,3].map(()=>global.__meo.screenshots.addImage(image).id);
 });
 await app.evaluate(()=>global.__meo.utilities.show('shelf'));
 const panel=app.windows().find(page=>page.url().endsWith('/companion.html'));
 await panel.locator('.photo-remove').first().waitFor();
 assert.equal(await panel.locator('.photo-remove').count(),3);
 await panel.locator('.photo-remove').first().click();
 await panel.waitForFunction(()=>document.querySelectorAll('.photo-remove').length===2);
 assert.equal(await app.evaluate((_,id)=>global.__meo.screenshots.store.list().some(photo=>photo.id===id),ids[0]),false);
 await panel.getByText('Giữ vào túi',{exact:true}).first().click();
 const kept=await app.evaluate(()=>global.__meo.utilities.store.snapshot().items.filter(item=>item.source==='image').map(item=>item.id));
 await panel.locator('#clear-photos').click();
 await panel.waitForFunction(()=>document.querySelector('#photos').hidden);
 await pet.waitForFunction(()=>window.meoPet.snapshot().activity.photos===0&&!(window.meoPet.snapshot().renderedPose.logicalSheet==='actions'&&window.meoPet.snapshot().renderedPose.logicalIndex===0));
 assert.equal(await app.evaluate(()=>global.__meo.screenshots.snapshot().photos.length),0);
 const remaining=await app.evaluate(()=>global.__meo.utilities.store.snapshot().items.map(item=>item.id));
 assert.ok(kept.every(id=>remaining.includes(id)));
 assert.equal(await pet.locator('#photo-pocket').isHidden(),true);
 console.log('PASS: remove one, clear all, keep saved bag copies and release photo-holding pose.');
}finally{await app?.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
