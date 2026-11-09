const {test}=require('node:test'),assert=require('node:assert/strict'),{create}=require('../src/room-life.js');
test('petting is brief, bed call takes priority, pause preserves timers',()=>{
 const life=create(()=>0),pose={phase:'sleep',target:'bed'};
 life.interact('pet');assert.equal(life.step(0,pose).affection,1);assert.equal(life.step(0,pose).affection,1);assert.equal(life.step(2,pose).affection,0);
 life.interact('bed');assert.equal(life.step(1,pose).destination,'bed');assert.equal(life.step(90,pose).destination,null);
});
test('surprises require rest and cooldown; reduced motion suppresses routines',()=>{
 const life=create(()=>0);assert.equal(life.step(30,{phase:'walk'},{roam:true}).routine,'');
 const pose={phase:'sleep',target:'bed'};assert.equal(life.step(23,pose,{roam:true}).routine,'stretch');
 life.step(4,pose,{roam:true});assert.equal(life.step(1,pose,{roam:true}).routine,'');
 assert.equal(create(()=>0).step(60,pose,{quiet:true,roam:true}).routine,'');
});
