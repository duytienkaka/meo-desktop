const {test}=require('node:test');
const assert=require('node:assert/strict');
const {candidate,createGameDecision,resolveMood,ruleList}=require('../src/game.cjs');
function clock(){let now=0,id=0;const jobs=new Map();return{set:(fn,ms)=>{jobs.set(++id,{fn,at:now+ms});return id;},clear:key=>jobs.delete(key),advance:ms=>{now+=ms;for(const [key,job]of jobs)if(job.at<=now){jobs.delete(key);job.fn();}}};}
const sample=(exe,pid=10,pids=[10],more={})=>({available:true,foreground:{exe,pid,...more},runningPids:pids});
test('Known and marked games work windowed; ignored rules win',()=>{
  assert.equal(candidate(sample('CS2.EXE')).sticky,true);
  assert.equal(candidate(sample('my-game.exe'),{games:['my-game.exe']}).sticky,true);
  assert.equal(candidate(sample('cs2.exe'),{games:['cs2.exe'],ignored:['CS2.EXE']}),null);
  assert.deepEqual(ruleList(['C:\\Games\\MY.EXE','my.exe','invalid','meo.exe']),['my.exe']);
});
test('Fullscreen desktop, browsers, media players and launchers are not games',()=>{
  for(const exe of ['explorer.exe','chrome.exe','msedge.exe','vlc.exe','steam.exe','meo.exe'])assert.equal(candidate({...sample(exe,10,[10],{fullScreen:true,borderless:true,installedGame:true}),notificationState:3}),null,exe);
  assert.equal(candidate(sample('unknown.exe',10,[10],{fullScreen:true,borderless:true})),null);
  assert.equal(candidate(sample('unknown.exe',10,[10],{fullScreen:true,borderless:true,installedGame:true})).sticky,false);
});
test('Stable entry, Alt+Tab retention, delayed exit when game closes',()=>{
  const c=clock(),changes=[],d=createGameDecision({onChange:v=>changes.push(v),setTimer:c.set,clearTimer:c.clear});
  d.update(sample('cs2.exe'),{});c.advance(799);assert.deepEqual(changes,[]);c.advance(2);assert.equal(changes[0].exe,'cs2.exe');
  d.update(sample('chrome.exe',20,[10,20]),{});c.advance(4000);assert.equal(changes.length,1);
  d.update(sample('chrome.exe',20,[20]),{});c.advance(2499);assert.equal(changes.length,1);c.advance(2);assert.equal(changes[1],null);
});
test('Brief candidates cancel; explicit ignore and removed custom rule release active game',()=>{
  const c=clock(),changes=[],d=createGameDecision({onChange:v=>changes.push(v),setTimer:c.set,clearTimer:c.clear});
  d.update(sample('cs2.exe'),{});c.advance(300);d.update(sample('chrome.exe'),{});c.advance(1000);assert.equal(changes.length,0);
  d.update(sample('custom.exe'),{games:['custom.exe']});c.advance(801);assert.equal(d.current().exe,'custom.exe');
  d.update(sample('chrome.exe',20,[10,20]),{games:[]});c.advance(2501);assert.equal(d.current(),null);
  d.update(sample('cs2.exe'),{});c.advance(801);d.update(sample('cs2.exe'),{ignored:['cs2.exe']});c.advance(2501);assert.equal(d.current(),null);
});
test('Transient loss cancels on return; detector failure and reset cannot leave stale game mode',()=>{
  const c=clock(),changes=[],d=createGameDecision({onChange:v=>changes.push(v),setTimer:c.set,clearTimer:c.clear});
  d.update(sample('cs2.exe'),{});c.advance(801);d.update({available:false},{});c.advance(1000);d.update(sample('cs2.exe'),{});c.advance(2000);assert.equal(changes.length,1);
  d.update({available:false},{});c.advance(2501);assert.equal(changes[1],null);
  d.update(sample('cs2.exe'),{});d.reset();c.advance(5000);assert.equal(changes.length,2);assert.equal(d.current(),null);
});
test('Game takes priority over music; leaving restores music or manual base',()=>{
  const s={baseMode:'focus',autoGame:true,gameActive:true,autoMedia:true,mediaPlaying:true};
  assert.equal(resolveMood(s),'game');assert.equal(resolveMood({...s,gameActive:false}),'music');
  assert.equal(resolveMood({...s,gameActive:false,mediaPlaying:false}),'focus');
  assert.equal(resolveMood({...s,autoGame:false,autoMedia:false}),'focus');
});
