const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createMediaDecision}=require('../src/media.cjs');
function clock(){let now=0,id=0;const jobs=new Map();return{set:(fn,ms)=>{jobs.set(++id,{fn,at:now+ms});return id;},clear:key=>jobs.delete(key),advance:ms=>{now+=ms;for(const [key,job]of jobs)if(job.at<=now){jobs.delete(key);job.fn();}}};}
const playing={available:true,playing:true},paused={available:true,playing:false};
test('Playing triggers once; paused returns after grace period',()=>{
  const c=clock(),changes=[],d=createMediaDecision({onChange:v=>changes.push(v),setTimer:c.set,clearTimer:c.clear});
  d.update(playing);d.update(playing);assert.deepEqual(changes,[true]);
  d.update(paused);c.advance(2100);assert.deepEqual(changes,[true]);c.advance(101);assert.deepEqual(changes,[true,false]);
});
test('Track switch cancels pending stop, repeated paused samples do not extend delay',()=>{
  const c=clock(),changes=[],d=createMediaDecision({onChange:v=>changes.push(v),setTimer:c.set,clearTimer:c.clear});
  d.update(playing);d.update(paused);c.advance(1000);d.update(playing);c.advance(3000);assert.deepEqual(changes,[true]);
  d.update(paused);c.advance(1000);d.update(paused);c.advance(1201);assert.deepEqual(changes,[true,false]);
});
test('Watcher failure releases music; reset cancels pending callbacks',()=>{
  const c=clock(),changes=[],d=createMediaDecision({onChange:v=>changes.push(v),setTimer:c.set,clearTimer:c.clear});
  d.update(playing);d.update({available:false,playing:true});c.advance(2201);assert.deepEqual(changes,[true,false]);
  d.update(playing);d.update(paused);d.reset();c.advance(3000);assert.deepEqual(changes,[true,false,true]);assert.equal(d.isPlaying(),false);
});
