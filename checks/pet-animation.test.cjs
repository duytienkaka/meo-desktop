const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function fixture(){const window={CAT_SPRITES:{}};for(const file of ['character-sprites.js','characters.js','pet-animation.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{window});return window;}
const idle={sheet:'core',index:0,altitude:0,rotation:0,sx:1,sy:1},music={...idle,sheet:'moods',index:1,rotation:.08};
test('action transition uses one silhouette, settles and can be interrupted',()=>{
 const animation=fixture().CAT_ANIMATION.createTransition();animation.sample(idle,'idle',0);
 assert.equal(animation.sample(music,'music',10).sheet,'core');
 const middle=animation.sample(music,'music',110);assert.equal(middle.sheet,'moods');assert.ok(middle.opacity<1&&middle.opacity>.7);assert.ok(middle.sx>.9);
 assert.equal(animation.sample(music,'music',200).opacity,1);assert.equal(animation.active,false);
 animation.sample(idle,'idle',210);animation.sample(music,'music',240);assert.equal(animation.sample(music,'music',430).sheet,'moods');assert.equal(animation.active,false);
});
test('reduced motion/paused changes immediately; mirrored pose never collapses to zero width',()=>{
 const animation=fixture().CAT_ANIMATION.createTransition();animation.sample(idle,'idle',0);animation.sample(music,'music',5);
 const result=animation.sample(music,'music',8,true);assert.equal(result.opacity,1);assert.equal(result.sheet,'moods');assert.equal(animation.active,false);
 assert.equal(animation.sample({...music,sx:-1},'music',24).sx,-1);
});
test('every character keeps identity for all core, music, sleep and utility states',()=>{
 const w=fixture();for(const id of ['mit','may','muc'])for(const [sheet,count] of [['core',12],['moods',12],['actions',12]])for(let index=0;index<count;index++){
  const p=w.CAT_CHARACTERS.resolve({...idle,sheet,index},id);assert.equal(p.sheet,id);assert.ok(w.CAT_SPRITES[id].frames[p.index]);
 }
 const walk=new Set();for(let i=0;i<8;i++)walk.add(w.CAT_CHARACTERS.resolve(idle,'classic',{action:'walk',actionElapsed:i/14+.001}).index);assert.equal(walk.size,8);
 for(const id of ['mit','may','muc']){const frames=new Set();for(let i=0;i<8;i++){const p=w.CAT_CHARACTERS.resolve(idle,id,{action:'walk',actionElapsed:i/14+.001});assert.equal(p.sheet,id+'-walk');frames.add(p.index);}assert.equal(frames.size,8);}
 for(const sheet of Object.values(w.CAT_SPRITES))for(const frame of sheet.frames){assert.ok(frame.w>0&&frame.h>0&&frame.x>=0&&frame.y>=0&&frame.x+frame.w<=sheet.width&&frame.y+frame.h<=sheet.height);}
 assert.equal(w.CAT_CHARACTERS.resolve(idle,'invalid').sheet,'core');
});
