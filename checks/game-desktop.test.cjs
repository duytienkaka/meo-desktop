const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {_electron}=require('playwright');
const executable=path.resolve(__dirname,'../../outputs/Meo-Desktop-0.4-win-x64/Meo.exe');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;let app;
const makeSample=(exe,pid=100,runningPids=[100],more={})=>({available:true,foreground:{exe,pid,...more},runningPids});
async function launch(extra=[]){app=await _electron.launch({executablePath:executable,args:['--meo-test',...extra],env,timeout:30000});const p=await app.firstWindow();await p.waitForFunction(()=>window.meoPet?.snapshot().frame);return p;}
const state=()=>app.evaluate(()=>global.__meo.state());
const feed=sample=>app.evaluate((_e,s)=>global.__meo.receiveGame(s),sample);
(async()=>{
  let page=await launch();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await app.evaluate(()=>{global.__meo.setMode('focus');global.__meo.setAutoMedia(true);global.__meo.setAutoGame(true);global.__meo.receiveMedia({available:true,playing:true});});
  assert.equal((await state()).mode,'music');
  await feed(makeSample('cs2.exe'));await page.waitForTimeout(1000);assert.equal((await state()).mode,'game');
  await app.evaluate(()=>global.__meo.receiveMedia({available:true,playing:false}));await page.waitForTimeout(2400);assert.equal((await state()).mode,'game');
  await feed(makeSample('chrome.exe',200,[100,200]));await page.waitForTimeout(2700);assert.equal((await state()).mode,'game');
  await feed(makeSample('chrome.exe',200,[200]));await page.waitForTimeout(2700);assert.equal((await state()).mode,'focus');
  await app.evaluate(()=>global.__meo.receiveMedia({available:true,playing:true}));
  await feed(makeSample('meo-test-indie.exe',300,[300]));await page.waitForTimeout(900);assert.equal((await state()).mode,'music');
  await feed(makeSample('chrome.exe',200,[200,300]));assert.equal((await state()).lastApp.exe,'chrome.exe');
  await app.evaluate(()=>global.__meo.setGameRule('meo-test-indie.exe','game'));
  await feed(makeSample('meo-test-indie.exe',300,[200,300]));await page.waitForTimeout(1000);assert.equal((await state()).mode,'game');
  await app.evaluate(()=>global.__meo.setGameRule('meo-test-indie.exe','ignore'));await page.waitForTimeout(2700);assert.equal((await state()).mode,'music');
  await app.evaluate(()=>{global.__meo.setMode('sleep');global.__meo.receiveMedia({available:true,playing:true});});
  await feed(makeSample('cs2.exe'));await page.waitForTimeout(1000);assert.equal((await state()).mode,'sleep');assert.equal((await state()).autoGame,false);
  const settingsFile=path.join(await app.evaluate(({app})=>app.getPath('userData')),'settings.json');
  assert.ok((await app.evaluate(()=>global.__meo.menu())).includes('Cài đặt…'));
  await app.close();app=null;const prefs=JSON.parse(fs.readFileSync(settingsFile,'utf8'));assert.ok(prefs.ignoredGames.includes('meo-test-indie.exe'));assert.equal(prefs.mode,'sleep');
  // Native smoke check reads Windows foreground/process state without controlling a real game.
  page=await launch(['--meo-live-game-test']);
  await page.waitForTimeout(1000);assert.equal((await state()).gameStatus,'ready');
  const helperPid=await app.evaluate(()=>global.__meo.gamePid());assert.ok(helperPid>0);
  await app.close();app=null;await new Promise(r=>setTimeout(r,400));
  let alive=true;try{process.kill(helperPid,0);}catch(e){if(e.code==='ESRCH')alive=false;else throw e;}assert.equal(alive,false);
  assert.deepEqual(errors,[]);
  const result={passed:true,realGameLaunched:false,checks:['native Windows foreground/process reader','game wins over music','music stopping does not interrupt game','Alt+Tab retains recognized game','exit restores previous mood','manual app marking','ignored app restores music','manual mood override','rules persist','helper exits with app','no renderer errors']};
  fs.writeFileSync(path.join(__dirname,'game-report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(async e=>{console.error(e);if(app)await app.close().catch(()=>{});process.exit(1);});
