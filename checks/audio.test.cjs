const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const {createAudioControl,decodeAudio}=require('../src/audio.cjs');
function fixture(t,options={}){
 const proc=new EventEmitter();proc.stdout=new PassThrough();proc.stdin=new PassThrough();let killed=false;proc.kill=()=>{killed=true;};const commands=[],samples=[];
 proc.stdin.on('data',data=>commands.push(JSON.parse(data.toString())));
 const control=createAudioControl({platform:'win32',launch:(_exe,_args,opts)=>{assert.equal(opts.windowsHide,true);assert.equal(opts.shell,false);return proc;},onSample:s=>samples.push(s),...options});t.after(()=>control.stop());
 const reply=(command,state={available:true,level:20,muted:false},success=true)=>proc.stdout.write(JSON.stringify({...state,requestId:command.id,success})+'\n');
 return {control,commands,samples,proc,reply,killed:()=>killed};
}
test('audio levels and commands are bounded and only the expected protocol is accepted',async t=>{
 assert.deepEqual(decodeAudio({available:true,level:20,muted:false}),{available:true,level:20,muted:false});
 for(const level of [-1,101,NaN,'20'])assert.throws(()=>decodeAudio({available:true,level,muted:false}));
 const f=fixture(t);for(const [action,value] of [['run'],['step',0],['step',20],['step',1.5],['set',101],['set',NaN]])await assert.rejects(f.control.command(action,value));assert.equal(f.commands.length,0);
});
test('overlapping wheel requests are correlated and unavailable devices never report success',async t=>{
 const f=fixture(t),up=f.control.command('step',2),down=f.control.command('step',-2);assert.deepEqual(f.commands.map(c=>[c.action,c.value]),[['step',2],['step',-2]]);
 f.reply(f.commands[1],{available:true,level:18,muted:false});f.reply(f.commands[0]);assert.equal((await up).level,20);assert.equal((await down).level,18);
 const toggle=f.control.command('toggle');f.reply(f.commands.at(-1),{available:false,level:0,muted:false},false);await assert.rejects(toggle);
 const pending=f.control.command('read');f.control.stop();await assert.rejects(pending);assert.equal(f.killed(),true);
});
test('helper exit and command timeouts reject pending callers',async t=>{
 const f=fixture(t),request=f.control.command('read');f.proc.emit('close');await assert.rejects(request);assert.equal(f.samples.at(-1).available,false);
 const timed=fixture(t,{timeout:20});await assert.rejects(timed.control.command('read'),/chưa phản hồi/);
 const unsupported=createAudioControl({platform:'darwin',launch:()=>{throw new Error('must not launch');}});await assert.rejects(unsupported.command('toggle'));
});
