'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process'),readline=require('node:readline'),{_electron}=require('playwright');
const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;let app,fixture;
(async()=>{
 if(process.platform!=='win32'){console.log('Windows native overlay check skipped');return;}
 const exe=path.join(root,'.checks/OverlayFixture.exe');fs.mkdirSync(path.dirname(exe),{recursive:true});
 const framework=path.join(process.env.WINDIR,'Microsoft.NET/Framework64/v4.0.30319');
 execFileSync(path.join(framework,'csc.exe'),['/nologo','/target:exe','/out:'+exe,'/reference:'+path.join(framework,'System.Windows.Forms.dll'),'/reference:'+path.join(framework,'System.Drawing.dll'),path.join(__dirname,'OverlayFixture.cs')],{windowsHide:true});
 app=await _electron.launch({executablePath:path.join(root,'.cache/electron-dist-45.0.0-win32-x64/electron.exe'),args:[root,'--meo-test','--meo-overlay-test'],env});const pet=await app.firstWindow();await pet.waitForFunction(()=>window.meoPet?.snapshot().frame);
 const handle=await app.evaluate(({screen})=>{const m=global.__meo,a=screen.getPrimaryDisplay().workArea;m.setMode('focus');m.setVisible(true);m.setPaused(true);m.placeFree({x:a.x+a.width/2,y:a.y+a.height-30});global.repairs=0;const w=m.window(),original=w.moveTop.bind(w);w.moveTop=()=>{global.repairs++;return original();};return w.getNativeWindowHandle().readBigUInt64LE().toString();});
 fixture=spawn(exe,[handle],{windowsHide:true,stdio:['pipe','pipe','pipe']});const lines=readline.createInterface({input:fixture.stdout});
 const next=()=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Fixture timeout')),5000);lines.once('line',line=>{clearTimeout(timeout);resolve(line);});});await next();
 const query=async()=>{const result=next();fixture.stdin.write('query\n');return JSON.parse(await result);};
 await pet.waitForTimeout(400);assert.deepEqual(await query(),{above:true,focused:true});
 fixture.stdin.write('cover\n');await pet.waitForTimeout(800);assert.deepEqual(await query(),{above:true,focused:true},'pet must recover over a fullscreen topmost app without stealing focus');
 const count=await app.evaluate(()=>global.repairs);assert.ok(count>=1);await pet.waitForTimeout(1200);assert.equal(await app.evaluate(()=>global.repairs),count,'No repeated raising while the foreground is unchanged');
 await app.evaluate(()=>global.__meo.setVisible(false));fixture.stdin.write('resize\n');await pet.waitForTimeout(500);assert.equal(await app.evaluate(()=>global.repairs),count);assert.equal(await app.evaluate(()=>global.__meo.window().isVisible()),false);
 await app.evaluate(()=>global.__meo.setVisible(true));fixture.stdin.write('cover\n');await pet.waitForTimeout(700);assert.deepEqual(await query(),{above:true,focused:true});
 console.log('PASS: normal fullscreen, competing topmost fullscreen, foreground focus preserved, idle has no raises, hidden pet stays hidden, restore works');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{fixture?.kill();await app?.close();});
