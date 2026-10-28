const test=require('node:test'),assert=require('node:assert/strict');
const {playerLayout}=require('../src/player-layout.cjs');
test('music card opens above the head, or below when near the top',()=>{
 const area={x:0,y:0,width:1536,height:864};
 const above=playerLayout(area,{x:700,y:650});assert.ok(above.window.y+above.card.y+above.card.height<650);
 const below=playerLayout(area,{x:700,y:90});assert.ok(below.window.y+below.card.y>90);
});
test('animation origin meets the head and card stays on screen at every corner',()=>{
 for(const area of [{x:0,y:0,width:1536,height:864},{x:-1920,y:-240,width:1920,height:1080},{x:0,y:0,width:400,height:300}]){
  for(const dx of [20,area.width-20])for(const dy of [20,area.height-20]){
   const head={x:area.x+dx,y:area.y+dy},{window:w,card:c,origin:o}=playerLayout(area,head);
   assert.equal(w.x+c.x+o.x,head.x);assert.equal(w.y+c.y+o.y,head.y);
   assert.ok(w.x>=area.x&&w.y>=area.y&&w.x+w.width<=area.x+area.width&&w.y+w.height<=area.y+area.height);
   assert.ok(c.x>=0&&c.y>=0&&c.x+c.width<=w.width&&c.y+c.height<=w.height);
   assert.ok(head.x>=w.x&&head.x<=w.x+w.width&&head.y>=w.y&&head.y<=w.y+w.height);
  }
 }
});
