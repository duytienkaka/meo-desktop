const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createCare}=require('../src/care.cjs');
const {createRoomFeatures}=require('../src/room-features.cjs');

test('hunger begins after one hour and only a hungry meal grants XP',()=>{
 const care=createCare();
 care.tick(3599);
 assert.equal(care.snapshot().hungry,false);
 assert.equal(care.snapshot().secondsUntilHungry,1);
 assert.equal(care.feed(),false);
 assert.equal(care.snapshot().xp,0);
 care.tick(3600);
 assert.equal(care.snapshot().hungry,true);
 assert.equal(care.feed(),true);
 assert.equal(care.snapshot().xp,45);
 assert.equal(care.snapshot().secondsUntilHungry,3600);
});

test('new keepsakes persist until viewed and only owned items can be placed',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'meo-care-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 fs.writeFileSync(path.join(directory,'room-features.json'),JSON.stringify({care:{hungerAfter:3600,age:3600,xp:65}}));
 let features=createRoomFeatures(directory);
 assert.match(features.interact('food-eaten'),/45 XP.*Cuộn len/);
 assert.equal(features.snapshot().care.level,2);
 assert.deepEqual(features.snapshot().newGifts,['yarn']);
 assert.equal(features.interact('food-eaten'),'Đã no · 0 XP');
 assert.equal(features.snapshot().care.xp,10);
 await assert.rejects(features.configure({decoration:'star'}));
 await features.configure({decoration:'yarn'});
 features=createRoomFeatures(directory);
 assert.deepEqual(features.snapshot().newGifts,['yarn']);
 assert.equal(features.snapshot().decoration,'yarn');
 await features.configure({seenGift:'yarn'});
 assert.deepEqual(createRoomFeatures(directory).snapshot().newGifts,[]);
});
test('care remains usable when its data directory is temporarily unwritable',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'meo-care-storage-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const location=path.join(directory,'blocked');
 fs.writeFileSync(location,'regular file');
 const errors=[];
 const features=createRoomFeatures(location,{onError:error=>errors.push(error.code)});
 assert.doesNotThrow(()=>features.flush());
 assert.equal(features.interact('food-eaten'),'Đã no · 0 XP');
 assert.equal(features.snapshot().care.hungry,false);
 assert.equal(errors.length,2);
 fs.unlinkSync(location);
 features.flush();
 assert.ok(fs.existsSync(path.join(location,'room-features.json')));
});
