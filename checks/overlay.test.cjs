const test=require('node:test'),assert=require('node:assert/strict');
const {configureOverlay,createOverlayGuard}=require('../src/overlay.cjs');
test('overlay repair is gated and never shows or focuses windows',()=>{
 const calls=[];let allowed=true,visible=true,top=true;
 const w={isDestroyed:()=>false,isVisible:()=>visible,isAlwaysOnTop:()=>top,setAlwaysOnTop:(...a)=>calls.push(['top',...a]),moveTop:()=>calls.push(['raise'])};
 const guard=createOverlayGuard({getWindow:()=>w,canRaise:()=>allowed,platform:'win32'});
 allowed=false;assert.equal(guard.repair(),false);allowed=true;visible=false;assert.equal(guard.repair(),false);assert.deepEqual(calls,[]);
 visible=true;guard.repair();assert.deepEqual(calls,[['raise']]);calls.length=0;top=false;guard.repair();assert.deepEqual(calls,[['top',true,'screen-saver'],['raise']]);
});
test('Mac overlays join fullscreen spaces and share a consistent window level',()=>{
 const calls=[];configureOverlay({setAlwaysOnTop:(...a)=>calls.push(a),setVisibleOnAllWorkspaces:(...a)=>calls.push(a)},'darwin');
 assert.deepEqual(calls,[[true,'screen-saver'],[true,{visibleOnFullScreen:true}]]);
});
