const test=require('node:test'),assert=require('node:assert/strict');
const {companionLayout}=require('../src/companion-layout.cjs');
test('bag clears the pet at different sizes and work-area edges',()=>{
 for(const area of [{x:0,y:0,width:1536,height:864},{x:-1920,y:-240,width:1920,height:1080},{x:0,y:0,width:760,height:570}]){
  for(const size of [80,112,148])for(const x of [area.x+size,area.x+area.width-size])for(const foot of [area.y+size*1.2,area.y+area.height-12]){
   const a={x,y:foot-size*.8,top:foot-size*1.2,bottom:foot},p=companionLayout(area,a),w=p.window,c=p.card;
   assert.ok(c.height>200);
   assert.ok(w.y+c.y+c.height<a.top||w.y+c.y>a.bottom,'panel must not overlap the cat');
   assert.ok(w.x>=area.x&&w.y>=area.y&&w.x+w.width<=area.x+area.width&&w.y+w.height<=area.y+area.height);
   assert.equal(w.x+c.x+p.origin.x,a.x);assert.equal(w.y+c.y+p.origin.y,a.y);
  }
 }
});
