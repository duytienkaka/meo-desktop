const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {createOutputMeter}=require('../src/output-meter.cjs');
test('output meter parses split levels, ignores invalid values and releases the helper',()=>{
 let child,killed=0;const levels=[];
 const meter=createOutputMeter({onLevel:value=>levels.push(value),onError:()=>{},createProcess:()=>{child=new EventEmitter();child.stdout=new EventEmitter();child.kill=()=>killed++;return child;}});
 meter.setActive(true);child.stdout.emit('data',Buffer.from('0.1\n0.'));
 child.stdout.emit('data',Buffer.from('7\n2\ninvalid\n'));
 assert.deepEqual(levels,[.1,.7]);meter.setActive(true);assert.equal(killed,0);
 meter.setActive(false);assert.equal(killed,1);assert.equal(levels.at(-1),0);
 child.stdout.emit('data',Buffer.from('0.8\n'));assert.equal(levels.at(-1),0);
 meter.dispose();assert.equal(killed,1);
});
