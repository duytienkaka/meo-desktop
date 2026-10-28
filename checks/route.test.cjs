const {test}=require('node:test');
const assert=require('node:assert/strict');
const {makeRoute}=require('../src/route.cjs');
for(const area of [{x:0,y:0,width:1920,height:1040},{x:-2560,y:-300,width:2560,height:1400},{x:1920,y:100,width:1280,height:960},{x:0,y:0,width:640,height:480}]){
  test('screen-safe continuous route '+JSON.stringify(area),()=>{
    const route=makeRoute(area);
    for(let i=0;i<800;i++){
      const s=i/800*route.total,p=route.point(s),w=route.windowAt(s),next=route.point(s+.1);
      assert.ok(p.x>=area.x&&p.x<=area.x+area.width&&p.y>=area.y&&p.y<=area.y+area.height);
      assert.ok(w.x>=area.x&&w.y>=area.y&&w.x+w.width<=area.x+area.width&&w.y+w.height<=area.y+area.height);
      assert.ok(Math.hypot(next.x-p.x,next.y-p.y)<.102,'Route should be continuous through corners');
      assert.ok(Math.abs(p.x-w.x-w.anchorX)<.001&&Math.abs(p.y-w.y-w.anchorY)<.001);
      assert.ok(Math.abs(Math.hypot(p.nx,p.ny)-1)<.001);
    }
    const near=route.nearest(route.point(route.total*.643));assert.ok(near.separation<1);
    assert.ok(Math.abs(route.delta(route.total-3,2)-5)<.001);
  });
}
