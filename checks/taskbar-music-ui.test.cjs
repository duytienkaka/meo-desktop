const {_electron}=require('playwright'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
(async()=>{let app;
try{
 app=await _electron.launch({executablePath:path.join(root,'.cache/electron-dist-45.0.0-win32-x64/electron.exe'),args:[root,'--meo-test'],env});
 await app.firstWindow();
 await app.evaluate(({screen,nativeImage})=>{
  const require=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json');
  const {EventEmitter}=require('events');
  const createWatcher=()=>{const watcher=new EventEmitter();watcher.stdout=new EventEmitter();watcher.kill=()=>global.__watcherKilled=true;global.__testWatcher=watcher;return watcher;};
  let timer=null;global.__meterActive=false;global.__testAudio=.4;
  const createMeter=({onLevel})=>({
   setActive(value){global.__meterActive=value;if(value&&!timer)timer=setInterval(()=>onLevel(global.__testAudio),40);if(!value){clearInterval(timer);timer=null;onLevel(0);}},
   dispose(){global.__meterActive=false;clearInterval(timer);timer=null;onLevel(0);}
  });
  const service=require(process.cwd()+'/src/taskbar-music.cjs').createTaskbarMusic({supported:true,onOpen:()=>global.__meo.togglePlayer(),onError:message=>{throw Error(message)},createWatcher,createMeter});
  global.__taskbarTest=service;
  service.setEnabled(true);
  const bounds=screen.getPrimaryDisplay().bounds,bar=screen.dipToScreenRect(null,{x:bounds.x,y:bounds.y+bounds.height-48,width:bounds.width,height:48});
  global.__testWatcher.stdout.emit('data',Buffer.from('mask '+(bar.x+600)+','+bar.y+',500,'+bar.height+'|'+(bar.x+1650)+','+bar.y+',260,'+bar.height+'\n'));
  global.__testWatcher.stdout.emit('data',Buffer.from([bar.x,bar.y,bar.width,bar.height,1].join(' ')+'\n'));
  const artwork=nativeImage.createFromPath(process.cwd()+'/assets/core.png').crop({x:53,y:50,width:280,height:292}).resize({width:96,height:96}).toDataURL();
  service.update({available:true,hasSession:true,title:'Bản xem thử',artist:'Mèo Desktop',playing:true,artwork});
 });
 await new Promise(resolve=>setTimeout(resolve,500));
 const widget=app.windows().find(window=>window.url().endsWith('/taskbar-music.html'));
 assert.ok(widget);
 await widget.waitForFunction(()=>document.body.classList.contains('playing')&&document.querySelector('#art').complete);

 assert.equal(await widget.locator('#music').evaluate(node=>getComputedStyle(node).backgroundColor),'rgba(0, 0, 0, 0)');
 const wave=app.windows().find(window=>window.url().endsWith('/taskbar-wave.html'));
 assert.ok(wave);
 await wave.waitForFunction(()=>innerWidth>=1800);
 await wave.waitForFunction(()=>document.body.classList.contains('shown')&&document.body.classList.contains('protected'));
 assert.equal(await wave.evaluate(()=>getComputedStyle(document.body).clipPath.startsWith('path(')),true);

 await wave.waitForFunction(()=>{
  const c=document.querySelector('canvas'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const counts=[0,0,0];for(let i=0;i<data.length;i+=4){if(data[i+3]>10)counts[Math.min(2,Math.floor((i/4%c.width)/c.width*3))]++;}
  return counts.every(count=>count>30);
 });

 const alpha=await app.evaluate(async()=>{
  const image=await global.__taskbarTest.waveWindow.capturePage();
  const {width,height}=image.getSize(),bytes=image.toBitmap(),y=Math.floor(height*.9);
  return {icon:bytes[(y*width+Math.floor(width*.4))*4+3],free:bytes[(y*width+(Math.floor(width*.1)+4))*4+3]};
 });
 assert.equal(alpha.icon,0,'taskbar icons have no waveform or background painted above them');
 assert.ok(alpha.free>0,'waveform remains visible in free space');
 await wave.screenshot({path:path.join(root,'.cache/taskbar-rainbow-wave.png')});

 await app.evaluate(()=>global.__testAudio=0);
 await wave.waitForFunction(()=>{
  const c=document.querySelector('canvas'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  for(let i=3;i<data.length;i+=4)if(data[i])return false;return true;
 });
 await app.evaluate(()=>global.__testAudio=.75);
 await wave.waitForFunction(()=>{
  const c=document.querySelector('canvas'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  return data.some((value,index)=>index%4===3&&value>10);
 });
 await widget.screenshot({path:path.join(root,'.cache/taskbar-music-preview.png')});
 assert.equal(await widget.locator('.disc').evaluate(node=>getComputedStyle(node).animationPlayState),'running');
 await app.evaluate(()=>global.__taskbarTest.update({hasSession:true,title:'Bản xem thử',artist:'Mèo Desktop',playing:false}));
 await widget.waitForFunction(()=>!document.body.classList.contains('playing'));
 assert.equal(await widget.locator('.disc').evaluate(node=>getComputedStyle(node).animationPlayState),'paused');
 await widget.locator('#music').click();
 await app.evaluate(()=>{if(!global.__meo.playerWindow())throw Error('Player did not open');global.__testWatcher.stdout.emit('data',Buffer.from('0 0 1920 48 0\n'));});

 await widget.waitForFunction(()=>!document.body.classList.contains('shown'));
 await app.evaluate(()=>new Promise((resolve,reject)=>{const w=global.__taskbarTest.window;if(!w.isVisible())return resolve();const timer=setTimeout(()=>reject(Error('Hide did not complete')),1500);w.once('hide',()=>{clearTimeout(timer);resolve();});}));
 assert.equal(await app.evaluate(()=>global.__taskbarTest.window.isVisible()),false);
 // Rapid taskbar reversals must cancel the pending native hide.
 await app.evaluate(()=>global.__testWatcher.stdout.emit('data',Buffer.from('0 1032 1920 48 1\n')));
 await widget.waitForFunction(()=>document.body.classList.contains('shown'));
 await widget.locator('#music').click();
 await widget.waitForTimeout(350);
 assert.equal(await app.evaluate(()=>global.__meo.playerWindow().isVisible()),false);
 await app.evaluate(()=>{
  global.__testWatcher.stdout.emit('data',Buffer.from('0 1032 1920 48 0\n'));
  global.__testWatcher.stdout.emit('data',Buffer.from('0 1032 1920 48 1\n'));
 });
 await widget.waitForTimeout(160);
 assert.equal(await app.evaluate(()=>global.__taskbarTest.window.isVisible()),true);
 assert.equal(await widget.locator('.disc').evaluate(node=>node.getBoundingClientRect().height>=38),true);


 const watcherCount=await app.evaluate(()=>{global.__testWatcher.emit('exit',1);return true;});
 await widget.waitForTimeout(1200);
 await app.evaluate(()=>global.__testWatcher.stdout.emit('data',Buffer.from('0 1032 1920 48 1\n')));
 await widget.waitForFunction(()=>document.body.classList.contains('shown'));
 assert.equal(await app.evaluate(()=>global.__taskbarTest.window.isVisible()),true);
 await app.evaluate(()=>global.__taskbarTest.setEnabled(false));
 assert.equal(await app.evaluate(()=>global.__taskbarTest.window),null);

 assert.equal(await app.evaluate(()=>global.__watcherKilled),true);
 assert.equal(await app.evaluate(()=>global.__taskbarTest.waveWindow),null);
 assert.equal(await app.evaluate(()=>global.__meterActive),false);

 console.log('PASS: artwork, rotating disc, paused animations, player click, hidden taskbar and teardown.');
}finally{await app?.evaluate(()=>global.__taskbarTest?.dispose()).catch(()=>{});await app?.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
