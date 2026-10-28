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
