const test=require('node:test'),assert=require('node:assert/strict');
const {constrainPosition,freePlacement}=require('../src/placement.cjs');
test('free dragging keeps the chosen point and no longer projects to the screen edge',()=>{
 const area={x:0,y:0,width:1536,height:824},point={x:640,y:420},p=freePlacement(area,point,112);
 assert.equal(p.x+p.anchorX,point.x);assert.equal(p.y+p.anchorY,point.y);assert.equal(p.rotation,0);assert.equal(p.segment,-1);
});
test('placement stays visible across small, negative-coordinate and mixed monitor bounds',()=>{
 for(const area of [{x:0,y:0,width:640,height:480},{x:-1920,y:-240,width:1920,height:1080},{x:1536,y:0,width:2560,height:1440}]){
  for(const point of [{x:-10000,y:-10000},{x:10000,y:10000}]){
   const p=freePlacement(area,point,148),safe=constrainPosition(area,point,148);
   assert.ok(p.x>=area.x&&p.x+p.width<=area.x+area.width);assert.ok(p.y>=area.y&&p.y+p.height<=area.y+area.height);
   assert.equal(p.x+p.anchorX,safe.x);assert.equal(p.y+p.anchorY,safe.y);
  }
 }
});
