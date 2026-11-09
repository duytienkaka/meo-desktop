const {_electron}=require('playwright'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;let app;
(async()=>{
 app=await _electron.launch({executablePath:path.join(root,'.cache/electron-dist-45.0.0-win32-x64/electron.exe'),args:[root,'--meo-test'],env});
 const pet=await app.firstWindow();await pet.waitForFunction(()=>window.meoPet?.snapshot().frame);
 await app.evaluate(()=>{global.__meo.setMode('play');global.__meo.setPaused(false);global.__meo.setVisible(true);global.__meo.screenshots.clear();global.__meo.utilities.badge=()=>({count:0,due:0});Object.defineProperty(global.__meo.wallpaper,'desktop',{get:()=>true});});
 const opened=app.waitForEvent('window');await app.evaluate(()=>global.__meo.openSettings());const settings=await opened;await settings.waitForSelector('#wallpaper');
 await settings.evaluate(()=>window.settings.update({roomLighting:'afternoon'}));await settings.evaluate(()=>window.settings.update({roomSpot:'bed'}));await settings.evaluate(()=>window.settings.update({wallpaper:true}));
 const room=app.windows().find(w=>w.url().endsWith('/room.html')),errors=[];room.on('pageerror',e=>errors.push(e.message));
 await room.waitForFunction(()=>window.meoRoom?.snapshot().ready&&window.meoRoom.snapshot().state.showPet);
 assert.equal(await app.evaluate(()=>global.__meo.window().isVisible()),false,'floating cat hidden while scene owns cat');
 await settings.locator('[data-room-play="ball"]').click();
 await room.waitForFunction(()=>window.meoRoom.snapshot().playRemaining>0);
 await room.waitForFunction(()=>window.meoRoom.snapshot().pose?.phase==='pounce',null,{timeout:20000});
 await room.screenshot({path:path.join(root,'.cache/room-playing-ball.png')});
 const input=app.windows().find(w=>w.url().endsWith('/room-input.html'));
 await room.waitForFunction(()=>document.querySelectorAll('[data-play]').length===4);
 const box=await room.locator('[data-play="tease"]').boundingBox();
 await input.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await room.waitForFunction(()=>window.meoRoom.snapshot().teaseRemaining>0);
 const petButton=await room.locator('[data-play="pet"]').boundingBox();
 await input.mouse.click(petButton.x+petButton.width/2,petButton.y+petButton.height/2);
 await room.waitForFunction(()=>window.meoRoom.snapshot().lifeState.affection>0);
 for(const side of ['left','right']){
 await settings.selectOption('#room-controls-side',side);
 await room.waitForFunction(side=>window.meoRoom.snapshot().state.controlsSide===side,side);
 const position=await room.locator('.room-controls').boundingBox(),viewport=room.viewportSize()||await room.evaluate(()=>({width:innerWidth,height:innerHeight}));
 assert.ok(Math.abs(position.y+position.height/2-viewport.height/2)<2);
 assert.ok(side==='left'?position.x<25:position.x>viewport.width-position.width-25);
 }
 const toggle=room.locator('[data-play="room-toggle"]');
 for(const inside of [false,true]){
 await input.waitForTimeout(300);const button=await toggle.boundingBox();await input.mouse.click(button.x+button.width/2,button.y+button.height/2);
 await room.waitForFunction(inside=>window.meoRoom.snapshot().state.showPet===inside,inside);
 assert.equal(await toggle.innerText(),inside?'↗\nRa phòng':'↗\nVào phòng');
 }
 assert.equal(await settings.locator('[data-room]').count(),0);
 assert.equal(await settings.locator('[data-room-play]').count(),3);
 assert.deepEqual(errors,[]);
 console.log('PASS: Settings ball, visible pounce, tease, affection, automatic room entry and no renderer errors.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await app?.close();});
