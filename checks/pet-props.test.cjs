const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function fixture(){const context={window:{},matchMedia:()=>({matches:false}),Math};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/pet-props.js'),'utf8'),context);return context.window.CAT_PROPS;}
test('accessories react once to new items, repeated downloads, photos and reminder completion',()=>{
 const props=fixture(),f={time:1,mode:'play',utilityBadge:{count:1,due:0,pulseId:0}},photos={photos:[],busy:false};
 assert.equal(props.update(f,photos).event,'');f.time=2;f.utilityBadge.count=2;assert.equal(props.update(f,photos).event,'store');
 f.time=5;assert.equal(props.update(f,photos).event,'');f.utilityBadge.kind='download';f.utilityBadge.pulse=true;f.utilityBadge.pulseId=8;assert.equal(props.update(f,photos).event,'catch');
 f.time=8;f.utilityBadge.pulseId=9;assert.equal(props.update(f,photos).event,'catch');photos.photos=[{}];assert.equal(props.update(f,photos).event,'photos');photos.busy=true;assert.equal(props.update(f,photos).event,'throw');
 f.utilityBadge.due=1;assert.equal(props.update(f,photos).event,'remind');f.utilityBadge.due=0;assert.equal(props.update(f,photos).event,'done');
 f.paused=true;assert.equal(props.update(f,photos).quiet,true);
});
test('timelines settle, reduced movement cancels events, and carrying uses whole-body sprites',()=>{
 const props=fixture();
 for(const event of ['store','catch','photos','throw','remind','done','charge','low','change','groom','strap','yawn']){
  assert.equal(props.motion(event,0).beat,0);assert.equal(props.motion(event,4).event,'');
  assert.equal(props.motion(event,.5,true).beat,0);
 }
 const base={sheet:'core',index:0,altitude:0,rotation:0,sx:1,sy:1},still={action:'idle',jumpPhase:null,utilityBadge:{}};
 assert.equal(props.pose({...base},props.motion('throw',.2),still).index,0);
 assert.equal(props.pose({...base},props.motion('throw',.8),still).index,1);
 assert.equal(props.pose({...base},{...props.motion('',0),photos:2},still).sheet,'actions');
 assert.equal(props.pose({...base},props.motion('store',.8),{...still,utilityBadge:{due:1}}).index,5);
 assert.equal(props.draw,undefined,'No additive limb/prop renderer remains');
 const f={time:1,mode:'play',utilityBadge:{count:0}},photos={photos:[]};props.update(f,photos);f.time=2;f.utilityBadge.count=1;assert.equal(props.update(f,photos).event,'store');f.paused=true;assert.equal(props.update(f,photos).event,'');f.paused=false;assert.equal(props.update(f,photos).event,'');
});
test('idle motion cannot interrupt an active receive animation',()=>{
 const props=fixture(),f={time:1,mode:'play',action:'idle',utilityBadge:{count:0}},photos={photos:[]};props.update(f,photos);f.time=100;f.utilityBadge.count=1;assert.equal(props.update(f,photos).event,'store');
 const original={sheet:'core',index:0,altitude:0,rotation:0,sx:1,sy:1};assert.deepEqual(props.pose({...original},props.motion('store',.6),{action:'walk'}),original);
});
