const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {createOutputMeter}=require('../src/output-meter.cjs');
test('output meter parses split levels, ignores invalid values and releases the helper',()=>{
 let child,killed=0;const levels=[];
 const meter=createOutputMeter({onLevel:value=>levels.push(value),onError:()=>{},createProcess:()=>{child=new EventEmitter();child.stdout=new EventEmitter();child.kill=()=>killed++;return child;}});
 meter.setActive(true);child.stdout.emit('data',Buffer.from('0.1\n0.'));
 child.stdout.emit('data',Buffer.from('7\n2\ninvalid\n'));
 assert.deepEqual(levels,[.1,.7]);
 const packet={level:.4,bands:Array.from({length:32},(_,i)=>i/32)};
 child.stdout.emit('data',Buffer.from(JSON.stringify(packet)+'\n'));
 assert.deepEqual(levels.at(-1),packet);
 for(const bands of [[],[.5],Array(32).fill(2)]){
  child.stdout.emit('data',Buffer.from(JSON.stringify({level:.4,bands})+'\n'));
  assert.deepEqual(levels.at(-1),packet);
 }
 meter.setActive(true);assert.equal(killed,0);
 meter.setActive(false);assert.equal(killed,1);assert.equal(levels.at(-1),0);
 child.stdout.emit('data',Buffer.from('0.8\n'));assert.equal(levels.at(-1),0);
 meter.dispose();assert.equal(killed,1);
});
