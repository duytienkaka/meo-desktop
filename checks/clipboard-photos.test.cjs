const test=require('node:test'),assert=require('node:assert/strict');
const {createClipboardPhotos}=require('../src/clipboard-photos.cjs');
test('clipboard photo import is opt-in, ignores old/duplicate images and respects hidden state',()=>{
 let enabled=false,usable=true,value='old',reads=0;const received=[];
 const watcher=createClipboardPhotos({enabled:()=>enabled,canUse:()=>usable,clipboard:{readImage:()=>{reads++;return{isEmpty:()=>!value,toPNG:()=>Buffer.from(value),getSize:()=>({width:100,height:100})};}},onImage:i=>received.push(i.toPNG().toString())});
 watcher.sample();assert.equal(reads,0);enabled=true;watcher.sample();assert.deepEqual(received,[]);
 value='new';watcher.sample();watcher.sample();assert.deepEqual(received,['new']);
 usable=false;value='private';watcher.sample();usable=true;watcher.sample();assert.deepEqual(received,['new']);
 value='next';watcher.sample();assert.deepEqual(received,['new','next']);
 enabled=false;value='off';watcher.sample();enabled=true;watcher.sample();assert.deepEqual(received,['new','next']);
});
