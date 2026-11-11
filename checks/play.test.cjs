const test=require('node:test'),assert=require('node:assert/strict');
const {createPlayBehavior}=require('../src/play.cjs');
const input=(now,patch={})=>({now,near:true,difference:90,interactive:false,follow:true,roam:true,...patch});
test('cursor play stalks before overshooting and looks away after landing with a cooldown',()=>{
  const play=createPlayBehavior();play.reset(0);
  assert.equal(play.update(input(0)).kind,'stalk');assert.equal(play.update(input(.6)).kind,'stalk');
  assert.deepEqual(play.update(input(.71)),{kind:'jump',overshoot:24});
  play.landed(1.9);assert.equal(play.update(input(2)).kind,'look-away');
  assert.equal(play.update(input(3.4)),null);assert.equal(play.update(input(8.8)),null);assert.equal(play.update(input(9)).kind,'stalk');
});
test('withdrawn cursor cancels a pounce; disabling following also cancels',()=>{
  const play=createPlayBehavior();play.reset(0);play.update(input(0));
  assert.equal(play.update(input(.2,{near:false})).kind,'look-away');
  assert.equal(play.update(input(2,{near:false})),null);
  play.reset(3);play.update(input(3));assert.equal(play.update(input(3.8,{follow:false})).kind,'look-away');
});
test('quiet rest wakes for cursor and respects roam, interaction and affection',()=>{
  const play=createPlayBehavior();play.reset(0);
  assert.equal(play.update(input(46,{near:false})).kind,'rest');
  assert.equal(play.update(input(47,{difference:20})),null);
  play.reset(0);assert.equal(play.update(input(46,{near:false,roam:false})),null);
  play.affection(50);assert.equal(play.update(input(51)),null);
  assert.equal(play.update(input(90,{interactive:true})),null);assert.equal(play.update(input(91,{near:false})),null);
});

test('cursor chase waits two continuous seconds, stops far away and rearms on return',()=>{
 const chase=require('../src/play.cjs').createCursorFollow();
 const sample=(now,distance,enabled=true)=>chase.update({now,distance,size:112,enabled});
 assert.equal(sample(0,130),'watch');
 assert.equal(sample(1.9,130),'watch');
 assert.equal(sample(2,130),'chase');
 assert.equal(sample(3,280),'chase');
 assert.equal(sample(4,500),'stopped');
 assert.equal(sample(5,130),'watch');
 assert.equal(sample(6,250),null);
 assert.equal(sample(7,130),'watch');
 assert.equal(sample(8.9,130),'watch');
 assert.equal(sample(9,130),'chase');
 assert.equal(sample(10,130,false),'stopped');
});

test('play mode landing continues pursuit without another pounce until the chase ends',()=>{
 const play=createPlayBehavior();
 play.landed(3,{continueChase:true});
 assert.equal(play.update(input(3.1,{hasPounced:true})),null);
 assert.equal(play.update(input(30,{hasPounced:true})),null);
 play.reset(31);
 assert.equal(play.update(input(31)).kind,'stalk');
});

test('pounce flag survives hovering and behavior resets until cursor leaves chase radius',()=>{
 const follow=require('../src/play.cjs').createCursorFollow(),play=createPlayBehavior();
 const sample=(now,distance,enabled=true)=>follow.update({now,distance,size:112,enabled});
 sample(0,100);sample(2,100);follow.markPounced();
 assert.equal(follow.hasPounced,true);
 sample(3,100,false);play.reset(3);
 assert.equal(sample(4,100),'chase');
 assert.equal(play.update(input(4,{hasPounced:follow.hasPounced})),null);
 assert.equal(sample(5,500),'stopped');
 assert.equal(follow.hasPounced,false);
 assert.equal(sample(6,100),'watch');
 assert.equal(sample(8,100),'chase');
 assert.equal(play.update(input(8,{hasPounced:follow.hasPounced})).kind,'stalk');
});

test('catch rests briefly and resumes pursuit when the cursor moves within range',()=>{
 const follow=require('../src/play.cjs').createCursorFollow();
 const update=(now,distance)=>follow.update({now,distance,size:112,enabled:true});
 update(0,100);update(2,100);follow.markPounced();follow.complete();
 assert.equal(follow.active,false);
 assert.equal(update(4,60),null);
 assert.equal(update(8,130),'chase');
 assert.equal(follow.hasPounced,true);
 update(9,500);
 assert.equal(update(10,130),'watch');
 assert.equal(update(12,130),'chase');
});
