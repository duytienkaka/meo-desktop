'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createGameSession,duration}=require('../src/game-session.cjs'),{createGameDecision}=require('../src/game.cjs');
const tick=(session,now,active=true,key='game',name='Game thử')=>session.tick({now,active,key,name});
test('session clock counts foreground play, pauses away and resumes without counting the gap',()=>{
 const s=createGameSession();tick(s,0);tick(s,1000);tick(s,2000,false);tick(s,62000,false);assert.equal(s.snapshot().seconds,2);tick(s,63000);tick(s,64000);assert.equal(s.snapshot().seconds,3);assert.equal(s.snapshot().status,'playing');
});
test('rest reminder uses actual play time, snoozes and five-minute rest does not add play time',()=>{
 const s=createGameSession({breakMinutes:30});tick(s,0);tick(s,30*60000);assert.equal(s.snapshot().breakDue,true);s.action('snooze');assert.equal(s.snapshot().breakDue,false);assert.equal(s.snapshot().nextBreakSeconds,600);tick(s,40*60000);assert.equal(s.snapshot().breakDue,true);s.action('break');tick(s,44*60000);assert.equal(s.snapshot().seconds,2400);assert.equal(s.snapshot().breakRemaining,60);tick(s,45*60000);assert.equal(s.snapshot().onBreak,false);assert.equal(s.snapshot().nextBreakSeconds,1800);tick(s,45*60000+1000);assert.equal(s.snapshot().seconds,2401);
});
test('manual timer pause, reset and game changes retain a last-session summary',()=>{
 const s=createGameSession();tick(s,0);s.action('pause',1000);tick(s,60000);assert.equal(s.snapshot().seconds,1);assert.equal(s.snapshot().paused,true);s.action('resume',60000);tick(s,61000);assert.equal(s.snapshot().seconds,2);s.action('reset',61000);assert.equal(s.snapshot().seconds,0);assert.equal(s.snapshot().lastSession.seconds,2);tick(s,62000);tick(s,63000,true,'other','Game khác');assert.equal(s.snapshot().name,'Game khác');assert.equal(s.snapshot().lastSession.seconds,2);tick(s,64000,false,null);assert.equal(s.snapshot().hasSession,false);assert.equal(s.snapshot().lastSession.name,'Game khác');
});
test('sleep/lock gaps do not count after the active context was paused',()=>{
 const s=createGameSession();tick(s,0);tick(s,1000,false);tick(s,3600000,false);tick(s,3600001);tick(s,3601001);assert.equal(s.snapshot().seconds,2);
});
test('reminder settings are validated and disabling reminders leaves the clock running',()=>{
 const s=createGameSession();tick(s,0);s.configure(0);tick(s,7200000);assert.equal(s.snapshot().seconds,7200);assert.equal(s.snapshot().breakDue,false);assert.equal(s.snapshot().nextBreakSeconds,null);assert.throws(()=>s.configure(-1));assert.throws(()=>s.action('send-key'));assert.equal(duration(65),'01:05');assert.equal(duration(3605),'1:00:05');assert.equal(duration(Infinity),'00:00');
});
test('foreground switches to another recognized game even while the previous game is running',()=>{
 let queue=[],current;const d=createGameDecision({onChange:v=>{current=v;},setTimer:fn=>{queue.push(fn);return fn;},clearTimer:fn=>{queue=queue.filter(v=>v!==fn);}});const sample=(exe,pid)=>({available:true,foreground:{exe,pid},runningPids:[100,200]});d.update(sample('cs2.exe',100),{});queue.shift()();assert.equal(current.pid,100);d.update(sample('league of legends.exe',200),{});assert.equal(queue.length,1);queue.shift()();assert.equal(current.pid,200);
});
