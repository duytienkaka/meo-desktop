const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const {_electron}=require('playwright');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;let desktop;
(async()=>{
 desktop=await _electron.launch({executablePath:path.resolve(__dirname,'../../outputs/Meo-Desktop-0.4-win-x64/Meo.exe'),args:['--meo-test'],env});
 const page=await desktop.firstWindow();await page.waitForFunction(()=>window.meoPet?.snapshot().frame);
 await desktop.evaluate(()=>{global.__meo.setVisible(true);global.__meo.setPaused(false);global.__meo.setMode('game');});
 const handles=await desktop.evaluate(async({BrowserWindow,screen})=>{
   const mock=new BrowserWindow({...screen.getPrimaryDisplay().bounds,frame:false,fullscreen:true,alwaysOnTop:true,show:false,backgroundColor:'#202c29',title:'Mèo Desktop — kiểm tra toàn màn hình',webPreferences:{sandbox:true,contextIsolation:true}});
   global.__mockGame=mock;await mock.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<body style="background:#202c29;color:#eee9da;font:24px Segoe UI;display:grid;place-items:center"><p>Mèo Desktop · Kiểm tra hiển thị trên cửa sổ toàn màn hình</p></body>'));
   mock.setAlwaysOnTop(true,'screen-saver');mock.show();mock.focus();mock.moveTop();
   const handle=window=>window.getNativeWindowHandle().readBigUInt64LE().toString();
   return{pet:handle(global.__meo.window()),game:handle(mock)};
 });
 await page.waitForTimeout(2300);
 const result=JSON.parse((await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(__dirname,'window-order.ps1'),'-PetWindow',handles.pet,'-GameWindow',handles.game],{windowsHide:true,timeout:15000})).stdout);
 assert.ok(result.petRank>=0&&result.petRank<result.gameRank,JSON.stringify(result));assert.equal(result.foreground,handles.game,'Pet must not steal keyboard focus');
 const state=await desktop.evaluate(()=>global.__meo.state());assert.equal(state.focusable,false);assert.equal(state.interactive,false);assert.equal(state.visible,true);assert.equal(state.dragging,false);
 assert.ok((await desktop.evaluate(()=>global.__meo.overlay())).raises>=2);
 assert.equal((await page.evaluate(()=>window.meoPet.snapshot())).frame.toast,'');
 await page.evaluate(()=>window.meo.action('drag-start'));assert.equal((await desktop.evaluate(()=>global.__meo.state())).dragging,false);
 await desktop.evaluate(()=>global.__meo.setVisible(false));const raises=(await desktop.evaluate(()=>global.__meo.overlay())).raises;
 await page.waitForTimeout(1700);assert.equal((await desktop.evaluate(()=>global.__meo.overlay())).raises,raises);assert.equal(await desktop.evaluate(()=>global.__meo.window().isVisible()),false);
 await desktop.evaluate(()=>{global.__mockGame.destroy();global.__meo.setVisible(true);});await desktop.close();desktop=null;
 const report={passed:true,realGameTested:false,exclusiveFullscreenTested:false,zOrder:result,checks:['pet above a topmost fullscreen test window','test window keeps keyboard focus','game cat ignores mouse and drag','overlay maintained without renderer toast','hidden cat stays hidden']};fs.writeFileSync(path.join(__dirname,'overlay-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(async error=>{console.error(error);if(desktop)await desktop.close().catch(()=>{});process.exit(1);});
