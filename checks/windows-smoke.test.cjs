'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {_electron}=require('playwright');

(async()=>{
 const executablePath=process.env.MEO_EXECUTABLE||path.resolve('outputs/setup/win-unpacked/Meo.exe');
 const app=await _electron.launch({executablePath,args:['--meo-test']});
 try{
  const pet=await app.firstWindow();
  await pet.waitForFunction(()=>window.meoPet?.snapshot().frame);
  assert.equal(await pet.evaluate(()=>typeof require),'undefined');
  const installed=await app.evaluate(({app})=>({version:app.getVersion(),supported:global.__meo.settingsSnapshot().taskbarMusicSupported}));
  assert.equal(installed.version,require('../package.json').version);
  assert.equal(installed.supported,true);

  const bmp=await pet.evaluate(()=>{
   const canvas=document.createElement('canvas');
   canvas.width=1050;canvas.height=180;
   const ctx=canvas.getContext('2d');
   ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.fillStyle='black';ctx.font='52px Segoe UI';ctx.fillText('Chụp màn hình và nhận diện chữ',24,82);
   return canvas.toDataURL();
  });
  const data=await app.evaluate(({app,nativeImage},url)=>{
   const localRequire=process.getBuiltinModule('module').createRequire(app.getAppPath()+'/package.json');
   return localRequire('./src/screenshot-ocr.cjs').recognizeScreenshot(nativeImage.createFromDataURL(url));
  },bmp);
  assert.match(data,/nhận diện chữ/u);
  assert.match(data.normalize('NFD').replace(/\p{M}/gu,''),/^Chup man hinh va nhan dien chu$/iu);
  console.log('PASS Windows packaged launch, release version, secure renderer and Vietnamese OCR');
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
