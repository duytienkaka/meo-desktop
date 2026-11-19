const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{EventEmitter}=require('events');
let attachErrors=[],attachCalls=0;
let displays=[{id:1,bounds:{x:0,y:0,width:1536,height:864}},{id:2,bounds:{x:-1280,y:0,width:1280,height:800}},{id:3,bounds:{x:1536,y:0,width:1920,height:1080}}],windows=[];
class Window{
 constructor(options){this.options=options;this.messages=[];this.dead=false;this.webContents={id:windows.length+1,send:(channel,value)=>this.messages.push({channel,value})};windows.push(this);}
 setIgnoreMouseEvents(){} async loadFile(){}getNativeWindowHandle(){return Buffer.alloc(8);}setBounds(b){this.bounds=b;}setContentSize(){}showInactive(){}setAlwaysOnTop(){}isDestroyed(){return this.dead;}isVisible(){return false;}hide(){}destroy(){this.dead=true;}
}
const ipcMain=new EventEmitter(),electron={BrowserWindow:Window,screen:{getPrimaryDisplay:()=>displays[0],getAllDisplays:()=>displays,dipToScreenRect:(_,b)=>b},ipcMain};
const context={process:{platform:"win32"},module:{exports:{}},Buffer,require:n=>n==='electron'?electron:n==='node:child_process'?{execFile:(file,args,options,callback)=>{attachCalls++;callback(attachErrors.shift(),'', 'SetParent Win32 error 127');},spawn:()=>({stdout:new EventEmitter(),on(){},kill(){}})}:require(n),__dirname:require('path').resolve('src')};
vm.runInNewContext(fs.readFileSync('src/wallpaper.cjs','utf8'),context);
(async()=>{const wall=context.module.exports.createWallpaper();await wall.open();assert.equal(windows.filter(w=>!w.dead).length,4);
wall.update({showPet:true,paused:false});assert.ok(windows.slice(2).every(w=>w.messages.at(-1).value.controlsVisible===false));
displays.pop();await wall.refresh();assert.equal(windows.filter(w=>!w.dead).length,3);
displays[1].bounds={x:-1000,y:-100,width:1000,height:700};await wall.refresh();assert.equal(windows.filter(w=>!w.dead).length,3);
displays=[displays[1],displays[0]];await wall.refresh();assert.equal(windows.filter(w=>!w.dead).length,3);
wall.close();assert.ok(windows.every(w=>w.dead));
const attachError={code:3,message:'SetParent failed'};
attachErrors=[attachError,undefined,attachError,attachError];
const before=attachCalls,logged=[];
const retrying=context.module.exports.createWallpaper({onError:error=>logged.push(error.detail)});
await retrying.open();
assert.equal(attachCalls-before,4,'retry each temporarily unavailable desktop host once');
assert.equal(retrying.displayCount,1,'a secondary desktop failure leaves the primary room active');
assert.equal(logged[0],'SetParent Win32 error 127');
retrying.close();
assert.ok(windows.every(w=>w.dead));console.log('PASS: per-display windows, negative coordinates, resize, unplug, primary switch and cleanup');})().catch(e=>{console.error(e);process.exitCode=1});
