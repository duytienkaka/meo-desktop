const {_electron}=require('playwright'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),env={...process.env};
delete env.ELECTRON_RUN_AS_NODE;
(async()=>{
 const app=await _electron.launch({executablePath:path.join(root,'.cache/electron-dist-45.0.0-win32-x64/electron.exe'),args:[root,'--meo-test'],env});
 try{
  await app.firstWindow();
  const created=app.waitForEvent('window');
  await app.evaluate(({screen})=>{
   const require=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json');
   const {EventEmitter}=require('events');
   const createWatcher=()=>{
    const child=new EventEmitter();child.stdout=new EventEmitter();child.kill=()=>{};
    global.__watcher=child;return child;
   };
   let timer;
   const createMeter=({onLevel})=>({
    setActive(active){clearInterval(timer);global.__meterActive=active;if(active)timer=setInterval(()=>onLevel(.6),40);else onLevel(0);},
    dispose(){clearInterval(timer);global.__meterActive=false;}
   });
   const service=require(process.cwd()+'/src/taskbar-music.cjs').createTaskbarMusic({
    supported:true,createWatcher,createMeter,onError:message=>{throw Error(message)},
    onWindowsChanged:windows=>global.__glass?.setWindows(windows)
   });
   global.__wave=service;
   global.__glass=require(process.cwd()+'/src/taskbar-transparency.cjs').createTaskbarTransparency({
    directory:process.cwd()+'/checks/user-data/transparency-test',
    onChange:state=>{global.__glassState=state;service.setBehind(state.ready);},
    onLayered:handle=>service.setLayered(handle),onError:message=>{global.__glassError=message;}
   });
   service.setEnabled(true);
   const b=screen.dipToScreenRect(null,screen.getPrimaryDisplay().bounds);
   global.__visibleSample=[b.x,b.y+b.height-48,b.width,48,1].join(' ')+'\n';
   global.__watcher.stdout.emit('data',Buffer.from('mask '+(b.x+600)+','+(b.y+b.height-48)+',500,48\n'+global.__visibleSample));
   service.update({hasSession:true,playing:true});
  });
  const wave=await created;
  await wave.waitForURL('**/taskbar-wave.html');
  await wave.waitForFunction(()=>document.body.classList.contains('shown'));
  assert.equal(app.windows().some(page=>page.url().endsWith('/taskbar-music.html')),false);
  await wave.waitForFunction(()=>{
   const c=document.querySelector('canvas'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   return data.some((v,i)=>i%4===3&&v>10);
  });
  const raised=await app.evaluate(()=>{
   const w=global.__wave.waveWindow,original=w.moveTop.bind(w);let count=0;
   w.moveTop=()=>{count++;original();};
   global.__watcher.stdout.emit('data',Buffer.from('raise\n'));
   return {count,visible:w.isVisible(),focus:w.isFocused()};
  });
  assert.deepEqual(raised,{count:1,visible:true,focus:false});
  if(process.argv.includes('--glass')){
   await app.evaluate(()=>global.__glass.setEnabled(true));
   const deadline=Date.now()+40000;
   while(Date.now()<deadline){
    if(await app.evaluate(()=>global.__glassState?.ready&&global.__wave.waveWindow?.isVisible()))break;
    await new Promise(resolve=>setTimeout(resolve,100));
   }
   assert.equal(await app.evaluate(()=>global.__glassState?.ready),true);
   const behind=app.windows().find(page=>page.url().endsWith('/taskbar-wave.html'));
   await behind.waitForFunction(()=>document.body.classList.contains('behind'));
   await app.evaluate(()=>global.__glass.setEnabled(false));
   await new Promise(resolve=>setTimeout(resolve,300));
   const front=app.windows().find(page=>page.url().endsWith('/taskbar-wave.html'));
   await front.waitForFunction(()=>document.body.classList.contains('shown')&&!document.body.classList.contains('behind'));
  }
  await app.evaluate(()=>global.__wave.setEnabled(false));
  assert.equal(await app.evaluate(()=>global.__wave.waveWindow.isVisible()),true);
  await app.evaluate(()=>global.__wave.setEnabled(true));
  await new Promise(resolve=>setTimeout(resolve,420));
  assert.equal(await app.evaluate(()=>global.__wave.waveWindow.isVisible()),true);
  await app.evaluate(()=>global.__watcher.stdout.emit('data',Buffer.from('0 0 1920 48 0\n')));
  await new Promise(resolve=>setTimeout(resolve,160));
  assert.equal(await app.evaluate(()=>global.__wave.waveWindow.isVisible()),false);
  await app.evaluate(()=>global.__watcher.stdout.emit('data',Buffer.from(global.__visibleSample)));
  assert.equal(await app.evaluate(()=>global.__wave.waveWindow.isVisible()),true);
  await app.evaluate(()=>global.__wave.setEnabled(false));
  await new Promise(resolve=>setTimeout(resolve,420));
  assert.equal(await app.evaluate(()=>global.__wave.waveWindow),null);
  assert.equal(await app.evaluate(()=>global.__meterActive),false);
  console.log('PASS: waveform only, real audio drawing, taskbar activation, reveal/exit, rapid toggles, auto-hide and cleanup'+(process.argv.includes('--glass')?', native glass layering and restore':''));
 }finally{
  await app.evaluate(()=>{global.__glass?.dispose();global.__wave?.dispose();}).catch(()=>{});
  await app.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
