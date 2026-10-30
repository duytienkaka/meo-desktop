'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{_electron}=require('playwright');
const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;let app;
(async()=>{
 app=await _electron.launch({executablePath:process.env.MEO_EXECUTABLE||require('electron'),args:[...(!process.env.MEO_EXECUTABLE||process.env.MEO_APP_ROOT?[root]:[]),'--meo-test'],env});
 const pet=await app.firstWindow();await pet.waitForFunction(()=>window.meoPet?.snapshot().frame);
 await app.evaluate(()=>{const meo=global.__meo;meo.setVisible(true);meo.setPaused(false);meo.setMode('focus');meo.cursor={x:-10000,y:-10000};const win=meo.window();global.overlayTopBefore=win.isAlwaysOnTop();global.overlayCalls=[];for(const method of ['setAlwaysOnTop','moveTop','show','showInactive']){const original=win[method].bind(win);win[method]=(...args)=>{global.overlayCalls.push(method);return original(...args);};}});
 // Exercise the live frame loop, mode changes, input repairs and focus events.
 await pet.waitForTimeout(1800);
 await app.evaluate(()=>{const meo=global.__meo;meo.window().emit('focus');meo.setMode('music');meo.setMode('focus');});
 const point=await pet.evaluate(()=>{const f=window.meoPet.snapshot().frame;return{x:f.anchorX,y:f.anchorY-45};});
 await app.evaluate((_,p)=>{const b=global.__meo.window().getBounds();global.__meo.cursor={x:b.x+p.x,y:b.y+p.y};},point);
 await pet.waitForTimeout(900);
 await pet.evaluate(()=>window.meo.hit(true));await pet.waitForTimeout(100);assert.equal(await app.evaluate(()=>global.__meo.state().interactive),true);
 assert.equal(await app.evaluate(()=>global.__meo.window().isAlwaysOnTop()),await app.evaluate(()=>global.overlayTopBefore),'Z-order flag must remain stable');
 assert.deepEqual(await app.evaluate(()=>global.overlayCalls),[],'Frame/input/focus updates must not repeatedly raise or show the pet');
 await app.evaluate(()=>{global.__meo.setVisible(false);global.__meo.setVisible(true);});
 assert.equal(await app.evaluate(()=>global.__meo.window().isVisible()),true);
 console.log('PASS: no repeated z-order writes; input and explicit hide/show remain available');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>app?.close());
