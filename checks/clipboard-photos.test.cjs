const test=require('node:test'),assert=require('node:assert/strict');
const {createClipboardPhotos}=require('../src/clipboard-photos.cjs');
test('Electron 45 async clipboard imports image blobs, retries errors and skips text payloads',async()=>{
 let value='old',fail=false,busy=false;const received=[];
 const image=text=>({isEmpty:()=>!text,toPNG:()=>Buffer.from(text),getSize:()=>({width:100,height:80})});
 const watcher=createClipboardPhotos({enabled:()=>true,canUse:()=>true,isBusy:()=>busy,nativeImage:{createEmpty:()=>image(''),createFromBuffer:b=>image(b.toString())},clipboard:{read:async()=>{if(fail)throw new Error('locked');return [{types:['text/plain'],getType:()=>{throw new Error('Text must not be read');}},{types:['image/png'],getType:async()=>new Blob([value])}];}},onImage:i=>received.push(i.toPNG().toString())});
 await watcher.sample();assert.deepEqual(received,[]);
 fail=true;value='new';await watcher.sample();assert.deepEqual(received,[]);
 fail=false;await watcher.sample();await watcher.sample();assert.deepEqual(received,['new']);
 busy=true;value='next';await watcher.sample();busy=false;await watcher.sample();assert.deepEqual(received,['new','next']);
});
test('clipboard photo import is opt-in, ignores old/duplicate images and respects hidden state',()=>{
 let enabled=false,usable=true,value='old',reads=0;const received=[];
 const watcher=createClipboardPhotos({enabled:()=>enabled,canUse:()=>usable,clipboard:{readImage:()=>{reads++;return{isEmpty:()=>!value,toPNG:()=>Buffer.from(value),getSize:()=>({width:100,height:100})};}},onImage:i=>received.push(i.toPNG().toString())});
 watcher.sample();assert.equal(reads,0);enabled=true;watcher.sample();assert.deepEqual(received,[]);
 value='new';watcher.sample();watcher.sample();assert.deepEqual(received,['new']);
 usable=false;value='private';watcher.sample();usable=true;watcher.sample();assert.deepEqual(received,['new']);
 value='next';watcher.sample();assert.deepEqual(received,['new','next']);
 enabled=false;value='off';watcher.sample();enabled=true;watcher.sample();assert.deepEqual(received,['new','next']);
});
