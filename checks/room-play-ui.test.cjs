const {_electron}=require('playwright'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;let app;
(async()=>{
 app=await _electron.launch({executablePath:path.join(root,'.cache/electron-dist-45.0.0-win32-x64/electron.exe'),args:[root,'--meo-test'],env});
 const pet=await app.firstWindow();await pet.waitForFunction(()=>window.meoPet?.snapshot().frame);
 await app.evaluate(()=>{global.__meo.setMode('play');global.__meo.setPaused(false);global.__meo.setVisible(true);global.__meo.screenshots.clear();global.__meo.utilities.badge=()=>({count:0,due:0});Object.defineProperty(global.__meo.wallpaper,'desktop',{get:()=>global.__meo.desktopFocused!==false});});
 const opened=app.waitForEvent('window');await app.evaluate(()=>global.__meo.openSettings());const settings=await opened;await settings.waitForSelector('#wallpaper');
 await settings.locator('#care-fullness').waitFor();
 assert.match(await settings.locator('#care-xp-text').innerText(),/XP/);
 await settings.locator('#care-collection-title').click();
 await settings.locator('[data-gift="star"]').click();
 assert.match(await settings.locator('#care-gift-detail').innerText(),/2%.*10 giây/);
 await settings.locator('#care-collection-title').click();
 await settings.evaluate(()=>window.settings.update({roomLighting:'afternoon'}));await settings.evaluate(()=>window.settings.update({roomSpot:'bed'}));await settings.evaluate(()=>window.settings.update({wallpaper:true}));
 const candidates=app.windows().filter(w=>w.url().endsWith('/room.html'));
 let room;for(const candidate of candidates){if(await candidate.evaluate(()=>!document.querySelector('.room-controls').hidden)){room=candidate;break;}}
 const errors=[];room.on('pageerror',e=>errors.push(e.message));
 await room.waitForFunction(()=>window.meoRoom?.snapshot().ready&&window.meoRoom.snapshot().state.showPet);
 assert.equal(await app.evaluate(()=>global.__meo.window().isVisible()),false,'floating cat hidden while scene owns cat');
 await settings.locator('[data-room-play="ball"]').click();
 await room.waitForFunction(()=>window.meoRoom.snapshot().playRemaining>0);
 await room.waitForFunction(()=>window.meoRoom.snapshot().pose?.phase==='yarn',null,{timeout:20000});
 await room.screenshot({path:path.join(root,'.cache/room-playing-ball.png')});
 const input=app.windows().find(w=>w.url().endsWith('/room-input.html'));
 await room.waitForFunction(()=>document.querySelectorAll('[data-play]').length===4);
 const ball=await room.locator('[data-play="ball"]').boundingBox();
 const scene=await room.locator('#scene').boundingBox();
 await input.mouse.move(ball.x+12,ball.y+12);await input.mouse.down();
 await input.mouse.move(scene.x+scene.width*.42,scene.y+scene.height*.94,{steps:8});await input.mouse.up();
 await room.waitForFunction(()=>Math.abs(window.meoRoom.snapshot().landing.x-.42)<.002);
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
 // The wallpaper follows playback even when automatic cat moods are off.
 await app.evaluate(()=>{
  const app=global.__meo;
  app.setAutoMedia(false);
  app.roomOpenCalls=[];
  app.mediaTransport.command=async(action,source)=>app.roomOpenCalls.push([action,source]);
  app.receiveMedia({available:true,playing:true,hasSession:true,sourceAppId:'Spotify.exe'});
 });
 const notes=room.locator('.music-notes');
 await notes.waitFor({state:'visible'});
 await app.evaluate(()=>{global.__meo.desktopFocused=false;});
 await room.waitForFunction(()=>!window.meoRoom.snapshot().state.interactive);
 const firstNote=notes.locator('i').first();
 const readTime=()=>firstNote.evaluate(el=>el.getAnimations()[0]?.currentTime);
 const firstTime=await readTime();
 await room.waitForTimeout(220);
 assert.ok(await notes.isVisible()&&(await readTime())>firstTime,'notes keep moving while another app has focus');
 await app.evaluate(()=>{global.__meo.desktopFocused=true;});
 await room.waitForFunction(()=>window.meoRoom.snapshot().state.interactive);
 assert.ok(new Set(await notes.locator('i').allTextContents()).size>=3);
 const table=await room.locator('#music-table').boundingBox();
 const clickTable=()=>input.mouse.click(table.x+table.width/2,table.y+table.height/2);
 await input.waitForFunction(()=>targets.some(t=>t.kind==='music-table'));
 await clickTable();
 await room.waitForTimeout(150);
 assert.deepEqual(await app.evaluate(()=>global.__meo.roomOpenCalls),[['open','Spotify.exe']]);
 const toggle=room.locator('[data-play="room-toggle"]');
 for(const inside of [false,true]){
 await input.waitForTimeout(300);const button=await toggle.boundingBox();await input.mouse.click(button.x+button.width/2,button.y+button.height/2);
 await room.waitForFunction(inside=>window.meoRoom.snapshot().state.showPet===inside,inside);
 if(!inside){
  await clickTable();
  assert.equal(await app.evaluate(()=>global.__meo.roomOpenCalls.length),1);
  assert.equal(await notes.isVisible(),true);
 }
 assert.equal(await toggle.innerText(),inside?'↗\nRa phòng':'↗\nVào phòng');
 }
 await app.evaluate(({powerMonitor})=>{powerMonitor.isOnBatteryPower=()=>true;});
 await room.waitForFunction(()=>window.meoRoom.snapshot().state.paused);
 assert.equal(await notes.isVisible(),true);
 await input.waitForFunction(()=>targets.some(t=>t.kind==='music-table'));
 await clickTable();
 await room.waitForTimeout(150);
 assert.equal(await app.evaluate(()=>global.__meo.roomOpenCalls.length),2);
 await app.evaluate(()=>global.__meo.receiveMedia({available:true,playing:false,hasSession:true,sourceAppId:'Spotify.exe'}));
 await notes.waitFor({state:'hidden'});
 await clickTable();
 assert.equal(await app.evaluate(()=>global.__meo.roomOpenCalls.length),2);
 assert.equal(await settings.locator('[data-room]').count(),0);
 assert.equal(await settings.locator('[data-room-play]').count(),3);
 await app.evaluate(({powerMonitor})=>{powerMonitor.isOnBatteryPower=()=>false;});
 await settings.evaluate(()=>window.settings.update({roomFeed:true}));
 await room.waitForFunction(()=>!document.querySelector('#food-bowl').hidden&&window.meoRoom.snapshot().pose?.target==='food');
 await input.waitForFunction(()=>targets.some(t=>t.kind==='food'));
 const foodBox=await room.locator('#food-bowl').boundingBox();
 // A cat hit region can overlap the bowl as it approaches. The visible bowl wins.
 await input.evaluate(box=>targets.unshift({kind:'pet',x:box.x,y:box.y,width:box.width,height:box.height}),foodBox);
 await input.mouse.move(foodBox.x+foodBox.width/2,foodBox.y+foodBox.height/2);await input.mouse.down();
 await input.mouse.move(scene.x+scene.width*.7,scene.y+scene.height*.94,{steps:8});
 await room.waitForFunction(()=>Math.abs(window.ROOM_FEATURES.foodPoint().x-.7)<.01);
 assert.equal(await room.evaluate(()=>window.meoRoom.snapshot().mealAge),null,'held bowl cannot start a meal');
 await input.mouse.move(scene.x+scene.width*.4,scene.y+scene.height*.94,{steps:8});
 await input.mouse.up();
 await room.waitForFunction(()=>Math.abs(window.ROOM_FEATURES.foodPoint().x-.4)<.01);
 await room.waitForFunction(()=>window.meoRoom.snapshot().mealAge!==null&&document.querySelector('#food-bowl').hidden,null,{timeout:24000});
 await input.waitForFunction(()=>!targets.some(t=>t.kind==='food'));
 await room.screenshot({path:path.join(root,'.cache/room-eating.png')});
 await room.waitForFunction(()=>window.meoRoom.snapshot().mealAge===null&&document.querySelector('#food-bowl').hidden,null,{timeout:10000});
 // Feeding again must leave enough space to grab the bowl before the cat arrives.
 const fedPose=await room.evaluate(()=>window.meoRoom.snapshot().pose);
 await settings.evaluate(()=>window.settings.update({roomFeed:true}));
 await room.waitForFunction(()=>!document.querySelector('#food-bowl').hidden);
 const nextFood=await room.evaluate(()=>window.ROOM_FEATURES.foodPoint());
 assert.ok(Math.abs(nextFood.x-fedPose.x)>.16,'new bowl is placed away from the cat');
 await room.waitForFunction(()=>window.meoRoom.snapshot().mealAge!==null,null,{timeout:24000});
 await room.waitForFunction(()=>window.meoRoom.snapshot().mealAge===null,null,{timeout:10000});
 await room.emulateMedia({reducedMotion:'no-preference'});
 await app.evaluate(({powerMonitor})=>{
  powerMonitor.isOnBatteryPower=()=>false;
  const features=global.__meo.roomFeatures;
  features.snapshot=()=>({lamp:'on',due:true,unlocked:['bell','fish','star'],weather:{kind:'rain',night:true}});
 });
 await room.waitForFunction(()=>document.body.classList.contains('room-lamp-on')&&!document.querySelector('#water-reminder').hidden);
 await room.waitForFunction(()=>window.meoRoom.snapshot().pose?.target==='desk');
 assert.equal(await room.locator('#window-weather').getAttribute('class'),'weather-night weather-rain');
 await input.waitForFunction(()=>targets.some(t=>t.kind==='break-snooze'));
 const shelf=await room.locator('#souvenir-shelf').boundingBox();
 await input.mouse.click(shelf.x+shelf.width/2,shelf.y+shelf.height/2);
 await room.waitForFunction(()=>!document.querySelector('#souvenir-card').hidden);
 assert.match(await room.locator('#souvenir-card').innerText(),/Chuông nhỏ/);
 await room.screenshot({path:path.join(root,'.cache/room-features-preview.png')});
 assert.deepEqual(errors,[]);
 console.log('PASS: Settings ball, visible pounce, tease, affection, automatic room entry music table playback, room-only player opening, battery mode and no renderer errors.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await app?.close();});
