const test=require('node:test'),assert=require('node:assert/strict');
const {constrainPosition,freePlacement}=require('../src/placement.cjs');
const {fitPlacement}=require('../src/placement.cjs'),{makeRoute}=require('../src/route.cjs');
test('rotated pet envelope stays inside every edge and corner in DIP coordinates',()=>{
 for(const area of [{x:0,y:0,width:1536,height:824},{x:-1280,y:-180,width:1280,height:720},{x:1536,y:0,width:1707,height:960}])for(const size of [80,112,148]){
  const route=makeRoute(area);
  for(let i=0;i<160;i++){
   const p=fitPlacement(area,route.windowAt(route.total*i/160),size),c=Math.cos(p.rotation),s=Math.sin(p.rotation);
   for(const dx of [-.75,.75])for(const dy of [.08,-1.3]){
    const x=p.x+p.anchorX+(dx*c-dy*s)*size,y=p.y+p.anchorY+(dx*s+dy*c)*size;
    assert.ok(x>=area.x&&x<=area.x+area.width&&y>=area.y&&y<=area.y+area.height);
    assert.ok(x>=p.x&&x<=p.x+p.width&&y>=p.y&&y<=p.y+p.height,'sprite must fit the native window as well as the monitor');
   }
  }
 }
});
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
