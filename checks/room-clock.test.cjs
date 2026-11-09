const {test}=require('node:test'),assert=require('node:assert/strict'),{sample}=require('../src/room-clock.js');
test('local day phases select suitable light and favorite place',()=>{
 assert.equal(sample(8).preferred,'sill');assert.equal(sample(15).preferred,'desk');assert.equal(sample(23).preferred,'bed');assert.ok(sample(23).lamp>sample(8).lamp);assert.ok(sample(23).dark>sample(15).dark);
 assert.deepEqual(sample(0),sample(24));assert.equal(sample(12,'night').phase,'night');
});
test('lighting is continuous at key times and stays finite across the day',()=>{
 for(const hour of [5,7,11,16,19,21])for(const key of ['dark','warm','lamp','sun'])assert.ok(Math.abs(sample(hour-.0001)[key]-sample(hour+.0001)[key])<.001);
 for(let h=0;h<24;h+=.1)for(const key of ['dark','warm','lamp','sun'])assert.ok(Number.isFinite(sample(h)[key])&&sample(h)[key]>=0&&sample(h)[key]<=1);
});
