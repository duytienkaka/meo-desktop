const {test}=require('node:test'),assert=require('node:assert/strict'),{create,spots}=require('../src/room-pet.js');
test('floor approach, jump, landing and sleep form a continuous sequence',()=>{
 const pet=create(),phases=new Set();let previous=pet.step(0,'bed'),jumped=false,last;
 for(let t=0;t<12;t+=1/60){last=pet.step(1/60,'bed');phases.add(last.phase);assert.ok(Math.hypot(last.x-previous.x,last.y-previous.y)<.02);assert.ok(last.altitude>=0);jumped||=last.altitude>.05;previous=last;}
 for(const phase of ['walk','crouch','jump','land','settle','sleep'])assert.ok(phases.has(phase),phase);
 assert.equal(jumped,true);assert.equal(last.x,spots.bed.x);assert.equal(last.y,spots.bed.y);
});
test('table route uses chair support and touches the plant before returning; walking stays on support planes',()=>{
 const pet=create(),surfaces=new Set(),phases=new Set();let touched=false;
 for(let i=0;i<60*35;i++){const p=pet.step(1/60,'desk');surfaces.add(p.surface);phases.add(p.phase);if(p.touch>.5){assert.ok(p.x>.85);touched=true;}if(p.phase==='walk'&&p.surface==='floor')assert.ok(p.y>=.94);}
 assert.ok(surfaces.has('chair'));assert.ok(surfaces.has('desk'));assert.ok(phases.has('look'));assert.ok(touched);
});
test('pause freezes movement; reduced motion settles directly; destination changes keep position continuous',()=>{
 const pet=create();pet.step(2,'bed');const before=pet.step(0,'bed'),paused=pet.step(0,'bed');assert.deepEqual(paused,before);
 const changed=pet.step(0,'desk');assert.equal(changed.x,before.x);assert.equal(changed.y,before.y);
 const quiet=pet.step(0,'sill',true);assert.equal(quiet.altitude,0);assert.equal(quiet.x,spots.sill.x);
});

test('ball play returns from furniture, plays at the yarn landing point and restarts on another throw',()=>{
 const pet=create();pet.step(0,'desk',true);pet.play();
 let pounces=0,previous=pet.step(0,'play');
 for(let i=0;i<1200;i++){const current=pet.step(1/60,'play');assert.ok(Math.hypot(current.x-previous.x,current.y-previous.y)<.03);if(current.phase==='yarn'){pounces++;assert.equal(current.y,.95);assert.equal(current.altitude,0);assert.ok(Math.abs(current.x+current.direction*.026-.56)<1e-8);}previous=current;}
 assert.ok(pounces>0);pet.play();let replay=false;for(let i=0;i<600;i++)replay ||= pet.step(1/60,'play').phase==='yarn';assert.ok(replay);
});
