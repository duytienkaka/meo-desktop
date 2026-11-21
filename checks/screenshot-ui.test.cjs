const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');const {_electron}=require('playwright');let desktop,receiver,temp;const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const devExecutable=path.join(root,'.cache/electron-dist-45.0.0-win32-x64/electron.exe'),executablePath=process.env.MEO_EXECUTABLE||devExecutable;
(async()=>{
 temp=fs.mkdtempSync(path.join(os.tmpdir(),'meo-photo-batch-test-'));
 desktop=await _electron.launch({executablePath,args:[...(process.env.MEO_EXECUTABLE?[]:[root]),'--meo-test','--meo-ocr-test'],env});const pet=await desktop.firstWindow(),errors=[];pet.on('pageerror',e=>errors.push(e.message));await pet.waitForFunction(()=>window.meoPet?.snapshot().frame);
 await desktop.evaluate(async({clipboard,ClipboardItem,nativeImage,app,screen,desktopCapturer})=>{
  global.__oldClipboard=await Promise.all((await clipboard.read()).filter(item=>item.types.length).map(async item=>{const data={};for(const type of item.types)data[type]=await item.getType(type);return new ClipboardItem(data);}));global.__oldClipboardReady=true;
  global.__baseImage=nativeImage.createFromPath(app.getAppPath()+'/assets/core.png').crop({x:53,y:50,width:280,height:292});
  desktopCapturer.getSources=async()=>screen.getAllDisplays().map(d=>({display_id:String(d.id),thumbnail:global.__baseImage.resize({width:Math.round(d.bounds.width*d.scaleFactor),height:Math.round(d.bounds.height*d.scaleFactor)})}));
  global.__meo.setVisible(true);global.__meo.setMode('play');global.__meo.setPaused(true);const area=global.__meo.state().display.workArea;global.__meo.placeFree({x:area.x+area.width/2,y:area.y+area.height*.7});
 });
 // A failed capture renderer must restore the pet and leave a subsequent capture usable.
 await desktop.evaluate(async({BrowserWindow})=>{
  const load=BrowserWindow.prototype.loadFile;
  BrowserWindow.prototype.loadFile=function(file,...args){
   if(file.endsWith('capture.html'))return Promise.reject(new Error('Capture renderer could not load'));
   return load.call(this,file,...args);
  };
  try{await global.__meo.screenshots.capture();}
  finally{BrowserWindow.prototype.loadFile=load;}
 });
 await pet.waitForFunction(async()=>{const value=await window.meo.shots.get();return !value.capturing&&value.message.includes('cửa sổ chọn vùng');});
 assert.equal(await desktop.evaluate(()=>global.__meo.window().isVisible()),true);
 const opened=desktop.waitForEvent('window');await desktop.evaluate(()=>global.__meo.screenshots.capture());const overlay=await opened;await overlay.waitForFunction(()=>document.querySelector('#screen').naturalWidth>0);await overlay.waitForTimeout(150);await overlay.mouse.move(40,120);await overlay.mouse.down();await overlay.mouse.move(240,220,{steps:8});await overlay.mouse.up();await pet.waitForFunction(()=>document.querySelector('#send-photos').textContent==='Đưa 1 ảnh ↗');
 assert.equal(desktop.windows().length,1);await desktop.evaluate(()=>{for(let i=0;i<3;i++)global.__meo.screenshots.addImage(global.__baseImage.resize({width:160+i*20,height:120+i*10}));});await pet.waitForFunction(()=>document.querySelector('#send-photos').textContent==='Đưa 3 ảnh ↗');assert.equal(desktop.windows().length,1);await pet.locator('#photo-pocket').waitFor({state:'visible'});assert.equal(await pet.locator('#photo-pocket > button:visible').count(),1);assert.equal(await pet.locator('#pocket-photos').count(),0);const bounds=await pet.locator('#photo-pocket').boundingBox();assert.ok(bounds.width<=90&&bounds.height<=58);assert.equal((await desktop.evaluate(()=>global.__meo.screenshots.snapshot())).photos.length,3);
 await pet.screenshot({path:path.join(__dirname,'screenshots/pet-compact-photo-stack.png')});
 // A separate Chromium receiver verifies actual paste events carry all PNG files together.
 fs.writeFileSync(path.join(temp,'package.json'),JSON.stringify({name:'meo-photo-paste-receiver',main:'main.cjs'}));
 fs.writeFileSync(path.join(temp,'main.cjs'),`const {app,BrowserWindow}=require('electron');app.setPath('userData',__dirname+'/data');app.whenReady().then(()=>{global.receiverWindow=new BrowserWindow({width:600,height:400,title:'Meo Batch Photo Receiver',webPreferences:{contextIsolation:true,nodeIntegration:false}});global.receiverWindow.loadFile(__dirname+'/index.html');});app.on('window-all-closed',()=>app.quit());`);
 fs.writeFileSync(path.join(temp,'index.html'),`<!doctype html><meta charset="utf-8"><title>Meo Batch Photo Receiver</title><div contenteditable="true" role="textbox" style="padding:30px;min-height:200px">Ô nhận ảnh thử</div><script>window.received=[];window.pastedText='';window.textEvents=[];window.enters=0;document.addEventListener('keydown',e=>{if(e.key==='Enter')window.enters++;});document.addEventListener('paste',e=>{e.preventDefault();window.pastedText=e.clipboardData.getData('text/plain');if(window.pastedText)window.textEvents.push(window.pastedText);window.received=[...e.clipboardData.files].map(file=>({name:file.name,type:file.type,size:file.size}));});</script>`);
 receiver=await _electron.launch({executablePath:devExecutable,args:[temp],env});const input=await receiver.firstWindow();await input.getByRole('textbox').click();await receiver.evaluate(()=>global.receiverWindow.focus());
 await desktop.evaluate(()=>global.__meo.screenshots.bridge.start());for(let attempt=0;attempt<25;attempt++){
  const target=await desktop.evaluate(()=>global.__meo.screenshots.snapshot().target);
  if(target?.title==='Meo Batch Photo Receiver')break;
  await input.waitForTimeout(150);
 }
 assert.equal(await desktop.evaluate(()=>global.__meo.screenshots.snapshot().target?.title),'Meo Batch Photo Receiver');await pet.locator('#send-photos').click();await input.waitForFunction(()=>window.received.length===3,null,{timeout:7000}).catch(async error=>{console.error(await desktop.evaluate(()=>{const s=global.__meo.screenshots.snapshot();return {message:s.message,target:s.target,busy:s.busy};}));throw error;});
 const files=await input.evaluate(()=>window.received);assert.ok(files.every(file=>file.type==='image/png'&&file.size>0));assert.equal(await input.evaluate(()=>window.enters),0);assert.equal((await desktop.evaluate(()=>global.__meo.screenshots.snapshot())).photos.length,3);
 await pet.waitForFunction(()=>!document.querySelector('#send-photos').disabled);assert.equal(desktop.windows().length,1);
 const invalid=await pet.evaluate(async()=>{try{await window.meo.shots.action('select','fake');return false;}catch{return true;}});assert.equal(invalid,true);
 const pngPaths=await desktop.evaluate(()=>global.__meo.screenshots.store.list().map(photo=>global.__meo.screenshots.store.get(photo.id).file));assert.ok(pngPaths.every(file=>fs.existsSync(file)));
 const textImage=await pet.evaluate(()=>{
  const c=document.createElement('canvas');c.width=1050;c.height=180;
  const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle='black';ctx.font='52px Segoe UI';ctx.fillText('Chụp màn hình và nhận diện chữ',24,82);return c.toDataURL();
 });
 await desktop.evaluate(({nativeImage},url)=>global.__meo.screenshots.addImage(nativeImage.createFromDataURL(url)),textImage);
 await pet.locator('#send-photo-text').waitFor({state:'visible',timeout:30000});
 assert.equal(await desktop.evaluate(()=>{const s=global.__meo.screenshots.store;
  return s.list().map(({id})=>s.get(id).text).filter(Boolean).join('\n\n');
 }),'Chụp màn hình và nhận diện chữ');
 assert.equal(await pet.locator('#send-photo-text').innerText(),'Dán chữ ↗');
 await pet.locator('#send-photo-text').click();
 await input.waitForFunction(()=>window.pastedText.length>0,null,{timeout:5000}).catch(async error=>{console.error(await desktop.evaluate(({clipboard})=>({text:clipboard.readText(),message:global.__meo.screenshots.snapshot().message})));throw error;});
 assert.equal((await input.evaluate(()=>window.pastedText)).trim(),'Chụp màn hình và nhận diện chữ');
 assert.equal(await input.evaluate(()=>window.enters),0);
 assert.deepEqual(await input.evaluate(()=>window.received),[]);
 const openedReview=desktop.waitForEvent('window');
 await pet.getByRole('button',{name:'Xem ảnh 3'}).click();
 const card=await openedReview;
 await card.locator('#review-text').waitFor({state:'visible'});
 await card.waitForFunction(()=>document.querySelector('#review-text').value.includes('nhận diện chữ'));
 assert.equal(await card.locator('#review-image').isVisible(),true);
 await card.locator('#review-text').fill('ERR_TEST_123\nhttps://example.org/help\ngit status');
 assert.equal(await card.locator('#review-snippets button').count(),3);
 await card.locator('#review-snippets button').first().click();
 assert.equal(await desktop.evaluate(({clipboard})=>clipboard.readText()),'https://example.org/help');
 await card.locator('#review-text').evaluate(el=>el.setSelectionRange(0,12));
 await card.locator('#review-pair').click();
 await input.waitForFunction(()=>window.received.length===1&&window.textEvents.includes('ERR_TEST_123'),null,{timeout:10000}).catch(async error=>{
  console.error(await card.locator('#error').textContent(),await input.evaluate(()=>({files:window.received,texts:window.textEvents})));
  throw error;
 });
 assert.equal(await input.evaluate(()=>window.enters),0);
 await card.locator('#review-attach').check();
 await card.locator('#review-save').click();
 await card.locator('#review-back').click();
 await card.getByRole('button',{name:'Xem chữ và ảnh'}).first().click();
 await card.waitForFunction(()=>!document.querySelector('#review-image').hidden);
 assert.equal(await card.locator('#review-text').inputValue(),'ERR_TEST_123');
 const noteId=await desktop.evaluate(()=>global.__meo.utilities.store.snapshot().items.find(item=>item.source==='ocr').id);
 await desktop.evaluate((_,id)=>global.__meo.utilities.store.remove(id),noteId);
 await card.locator('#close').click();
 await receiver.close();receiver=null;
 await desktop.evaluate(()=>{global.__meo.screenshots.bridge.stop();global.__meo.screenshots.receiveTarget(null);});
 await pet.getByRole('button',{name:'Sao chép chữ'}).click();
 assert.equal(await desktop.evaluate(({clipboard})=>clipboard.readText()),'Chụp màn hình và nhận diện chữ');
 await desktop.evaluate(()=>{global.__meo.screenshots.bridge.stop();global.__meo.screenshots.receiveTarget({hwnd:'123',focus:'0',pid:123,name:'Closed fixture',title:'',x:10,y:10,seenAt:Date.now()});});await pet.locator('#send-photos').click();await pet.waitForFunction(()=>!document.querySelector('#send-photos').disabled);assert.equal((await desktop.evaluate(()=>global.__meo.screenshots.snapshot())).photos.length,3);

 await desktop.evaluate(()=>global.__meo.screenshots.clear());await pet.waitForFunction(()=>document.querySelector('#photo-pocket').hidden);assert.ok(pngPaths.every(file=>fs.existsSync(file)));assert.deepEqual(errors,[]);
 await desktop.evaluate(async({clipboard})=>{if(global.__oldClipboardReady){if(global.__oldClipboard.length)await clipboard.write(global.__oldClipboard);else clipboard.clear();}});await desktop.close();desktop=null;assert.ok(pngPaths.every(file=>!fs.existsSync(file)));fs.rmSync(temp,{recursive:true,force:true});temp=null;
 console.log(JSON.stringify({passed:true,checks:['region capture without opening a photo panel','latest three photos held in a compact stack','compact photo thumbnails and image action','one native paste carries all 3 PNG files into Chromium','Vietnamese OCR pasted as plain text','review edits and selected text','URL and line copy actions','paired paste of selected capture and text','saved note with source image','no Enter or automatic send','closed target preserves photos','temporary PNG cleanup','no renderer errors']}));
})().catch(async error=>{console.error(error);if(receiver)await receiver.close().catch(()=>{});if(desktop){await desktop.evaluate(async({clipboard})=>{if(global.__oldClipboardReady){if(global.__oldClipboard.length)await clipboard.write(global.__oldClipboard);else clipboard.clear();}}).catch(()=>{});await desktop.close().catch(()=>{});}if(temp)fs.rmSync(temp,{recursive:true,force:true});process.exitCode=1;});
