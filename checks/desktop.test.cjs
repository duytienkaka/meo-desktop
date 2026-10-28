const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {_electron}=require('playwright');
let desktop;
(async()=>{
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const testData=path.resolve(__dirname,'../../outputs/Meo-Desktop-0.4-win-x64/resources/app/checks/user-data');fs.mkdirSync(testData,{recursive:true});
  const prefsFile=path.join(testData,'settings.json');let prefs={};try{prefs=JSON.parse(fs.readFileSync(prefsFile,'utf8'));}catch{}fs.writeFileSync(prefsFile,JSON.stringify({...prefs,roam:true,follow:true,visible:true,paused:false}));
  desktop=await _electron.launch({executablePath:path.resolve(__dirname,'../../outputs/Meo-Desktop-0.4-win-x64/Meo.exe'),args:['--meo-test'],env,timeout:30000});
  const page=await desktop.firstWindow();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.waitForFunction(()=>window.meoPet?.snapshot().frame);
  await desktop.evaluate(()=>{global.__meo.setPaused(false);global.__meo.setVisible(true);});
  await desktop.evaluate(()=>{global.__meo.cursor={x:-10000,y:-10000};});
  const native=()=>desktop.evaluate(()=>global.__meo.state());
  const get=()=>page.evaluate(()=>window.meoPet.snapshot());
  const out=path.join(__dirname,'screenshots');fs.mkdirSync(out,{recursive:true});
  const capture=async name=>{const png=await desktop.evaluate(async()=>{const im=await global.__meo.window().webContents.capturePage();return im.toPNG().toString('base64');});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(png,'base64'));};
  const first=await native();assert.equal(first.visible,true);assert.equal(first.alwaysOnTop,true);assert.equal(first.focusable,false);assert.equal(first.interactive,false);
  for(const mode of ['play','music','game','focus','sleep']){
    await desktop.evaluate((_e,value)=>global.__meo.setMode(value),mode);
    await page.waitForFunction(value=>window.meoPet.snapshot().frame.mode===value,mode);
    await page.waitForTimeout(900);
    const f=await get();assert.equal(f.frame.mode,mode);
    if(mode==='game'){
      assert.ok(f.displaySize<74,'Game cat should be small');const s=await native();
      assert.equal(s.action,'idle');const before=s.distance;
      await desktop.evaluate(()=>{const p=global.__meo.route().point(0);global.__meo.cursor={x:p.x,y:p.y};});
      await page.waitForTimeout(300);assert.equal((await native()).distance,before,'Game cat must ignore cursor');
      await desktop.evaluate(()=>{global.__meo.cursor={x:-10000,y:-10000};});
    }
    await capture(mode);
  }
  // Transparent pixels must pass through; opaque character pixels must become interactive.
  await desktop.evaluate(()=>{global.__meo.setMode('focus');global.__meo.move(global.__meo.route().bottomLength*.5);});
  await page.waitForTimeout(500);
  const point=await page.evaluate(()=>{const s=window.meoPet.snapshot(),center={x:s.frame.anchorX,y:s.frame.anchorY-s.displaySize*.35};if(window.meoPet.hitAt(center))return center;for(let y=0;y<innerHeight;y+=2)for(let x=0;x<innerWidth;x+=2)if([[0,0],[-12,-12],[12,-12],[-12,12],[12,12]].every(([dx,dy])=>window.meoPet.hitAt({x:x+dx,y:y+dy})))return{x,y};return null;});
  assert.ok(point,'The character must have an alpha hit area');assert.equal(await page.evaluate(()=>window.meoPet.hitAt({x:0,y:0})),false);
  await desktop.evaluate((_e,p)=>{const b=global.__meo.window().getBounds();global.__meo.cursor={x:b.x+p.x,y:b.y+p.y};},point);
  await page.waitForTimeout(200);assert.equal((await native()).interactive,true);
  await page.mouse.click(point.x,point.y);await page.waitForTimeout(150);assert.equal((await get()).frame.pet,true);
  // Hold the character, then drag along the edge using the app's own controlled pointer feed.
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+18,point.y-8);
  await page.waitForTimeout(150);assert.equal((await native()).dragging,true);
  const distanceBeforeDrag=(await native()).distance;
  await desktop.evaluate(()=>{const r=global.__meo.route(),p=r.point(r.bottomLength*.65);global.__meo.cursor={x:p.x,y:p.y};});
  await page.waitForTimeout(150);assert.ok(Math.abs((await native()).distance-distanceBeforeDrag)>10,'Drag should reposition the cat');
  await page.mouse.up();await page.waitForTimeout(100);assert.equal((await native()).dragging,false);
  await desktop.evaluate(()=>{global.__meo.cursor={x:-10000,y:-10000};});await page.waitForTimeout(200);assert.equal((await native()).interactive,false);
  // Frozen simulation must resume successfully.
  await desktop.evaluate(()=>global.__meo.setPaused(true));const paused=(await native()).time;
  await page.waitForTimeout(250);assert.equal((await native()).time,paused);
  await desktop.evaluate(()=>global.__meo.setPaused(false));await page.waitForTimeout(250);assert.ok((await native()).time>paused);
  // Trigger a native, cursor-directed pounce and ensure it lands inside the route.
  await desktop.evaluate(()=>{global.__meo.setMode('play');const r=global.__meo.route();global.__meo.move(r.bottomLength*.5);const p=r.point(r.bottomLength*.5+90);global.__meo.cursor={x:p.x,y:p.y};});
  await page.waitForFunction(()=>window.meoPet.snapshot().frame.action==='stalk',{},{timeout:2000});await capture('stalk');
  await page.waitForFunction(()=>window.meoPet.snapshot().frame.jumpPhase!==null,{},{timeout:5000});
  await desktop.evaluate(()=>{global.__meo.cursor={x:-10000,y:-10000};});
  await page.waitForTimeout(300);await capture('pounce');await page.waitForTimeout(1100);
  assert.equal((await native()).jump,null);assert.equal((await native()).action,'look-away');await capture('look-away');
  await desktop.evaluate(()=>global.__meo.advancePlay(43));assert.equal((await native()).action,'rest');await capture('rest');
  // Check rendering through all eight straight/rounded edge sections at the largest size.
  await desktop.evaluate(()=>{global.__meo.setMode('focus');global.__meo.setSize(148);});await page.waitForTimeout(700);
  await desktop.evaluate(()=>global.__meo.setPaused(true));
  for(let segment=0;segment<8;segment++){
    await desktop.evaluate((_e,index)=>{const r=global.__meo.route();const d=r.lengths.slice(0,index).reduce((a,b)=>a+b,0)+r.lengths[index]/2;global.__meo.move(d);},segment);
    await page.waitForTimeout(120);
    const bounds=await page.evaluate(()=>{
      const canvas=document.querySelector('canvas'),c=canvas.getContext('2d'),im=c.getImageData(0,0,canvas.width,canvas.height);
      let minX=im.width,maxX=-1,minY=im.height,maxY=-1;
      for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]>128){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
      return{minX,maxX,minY,maxY,width:im.width,height:im.height};
    });
    assert.ok(bounds.maxX>bounds.minX&&bounds.maxY>bounds.minY,'Character must render');
    assert.ok(bounds.minX>0&&bounds.minY>0&&bounds.maxX<bounds.width-1&&bounds.maxY<bounds.height-1,`Clipping on edge ${segment}: ${JSON.stringify(bounds)}`);
    await capture('edge-'+segment);
  }
  await desktop.evaluate(()=>global.__meo.setVisible(false));assert.equal((await native()).visible,false);
  await desktop.evaluate(()=>global.__meo.setVisible(true));assert.equal((await native()).visible,true);
  const labels=await desktop.evaluate(()=>global.__meo.menu());assert.ok(labels.includes('Thoát mèo'));assert.ok(labels.includes('Cài đặt…'));assert.ok(!labels.includes('Tâm trạng'));assert.ok(labels.filter(Boolean).length<=4);
  assert.deepEqual(errors,[]);
  const result={passed:true,checks:['native transparent window','always on top without focus','five states','game stays small and ignores pointer','alpha hit test and transparent pass-through state','pet interaction','drag and release along edge','pause/resume','cursor pounce','eight screen edges/corners without clipping at large size','hide/show','Vietnamese native menu','no renderer errors']};
  fs.writeFileSync(path.join(__dirname,'desktop-report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  await desktop.close();
})().catch(async error=>{console.error(error);if(desktop)await desktop.close().catch(()=>{});process.exit(1);});
