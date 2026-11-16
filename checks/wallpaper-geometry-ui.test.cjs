const {_electron}=require('playwright'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
(async()=>{let app;
try{
 app=await _electron.launch({executablePath:path.join(root,'.cache/electron-dist-45.0.0-win32-x64/electron.exe'),args:[root,'--meo-test'],env});
 await app.firstWindow();
 await app.evaluate(()=>global.__meo.wallpaper.open());
 const info=await app.evaluate(({BrowserWindow,screen})=>({
  expected:screen.getAllDisplays().map(display=>screen.dipToScreenRect(null,display.bounds)),
  handles:BrowserWindow.getAllWindows().filter(window=>window.webContents.getURL().endsWith('/room.html')).map(window=>window.getNativeWindowHandle().readBigUInt64LE().toString())
 }));
 assert.equal(info.handles.length,info.expected.length);
 const handlesFile=path.join(root,'.cache/geometry-handles.json');
 fs.writeFileSync(handlesFile,JSON.stringify(info.handles));
 const result=execFileSync('powershell',['-NoProfile','-File',path.join(root,'checks/wallpaper-client-geometry.ps1'),handlesFile],{encoding:'utf8',windowsHide:true});
 const actual=[JSON.parse(result)].flat();
 for(const bounds of info.expected){
  assert.ok(actual.some(entry=>entry.origin.X===bounds.x&&entry.origin.Y===bounds.y&&entry.client.Right===bounds.width&&entry.client.Bottom===bounds.height),JSON.stringify({bounds,actual}));
 }
 console.log('PASS: native painted client areas exactly cover all '+info.expected.length+' displays in physical pixels.');
}finally{await app?.evaluate(()=>global.__meo.wallpaper.close()).catch(()=>{});await app?.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
