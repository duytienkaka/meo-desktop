const assert=require('node:assert/strict');const {createAudioControl}=require('../src/audio.cjs');
(async()=>{
 const audio=createAudioControl();let original;
 try{
  original=await audio.command('read');assert.equal(original.available,true);
  if(!original.muted){const muted=await audio.command('toggle');assert.equal(muted.muted,true);}
  const lower=await audio.command('step',-2);assert.equal(lower.muted,true);assert.ok(Math.abs(lower.level-Math.max(0,original.level-2))<.2);
  const restored=await audio.command('set',original.level);assert.ok(Math.abs(restored.level-original.level)<.2);
 }finally{
  if(original){await audio.command('set',original.level);const current=await audio.command('read');if(current.muted!==original.muted)await audio.command('toggle');}
  audio.stop();
 }
 console.log(JSON.stringify({passed:true,checks:['Windows default output read','system mute','relative volume change preserves mute','original volume and mute restored']}));
})().catch(error=>{console.error(error);process.exitCode=1;});
