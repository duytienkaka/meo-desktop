/* Complete character frames: never paint extra limbs over the original cat. */
(() => {
 'use strict';
 const durations={store:1.6,catch:1.8,photos:1.3,throw:1.4,remind:1.3,done:1.6,charge:1.8,low:1.3,groom:2.2,yawn:2.2};
 let previous=null,event='',started=0,nextIdle=0,idleIndex=0;
 const ease=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
 function motion(name,age,quiet=false){const duration=durations[name]||1,active=age>=0&&age<duration,progress=Math.max(0,Math.min(1,age/duration));return {event:active&&!quiet?name:'',age,quiet,progress,beat:active&&!quiet?Math.sin(Math.PI*progress):0};}
 function update(f,photos){
  const b=f.utilityBadge||{},current={count:b.count||0,due:b.due||0,pulse:b.pulseId,photos:photos.photos.length,busy:!!photos.busy};let next='';
  if(previous){if(current.count>previous.count)next='store';if(current.pulse!==previous.pulse&&b.pulse)next=({download:'catch',bag:'store',charging:'charge',battery:'low',reminder:'remind'})[b.kind]||'';if(current.photos>previous.photos)next='photos';if(current.busy&&!previous.busy)next='throw';if(current.due>previous.due)next='remind';if(current.due<previous.due)next='done';}
  previous=current;
  if(!nextIdle)nextIdle=f.time+40+Math.random()*30;
  if(f.time>=nextIdle){nextIdle=f.time+45+Math.random()*40;if(!next&&f.time-started>3&&!current.count&&!current.photos&&!current.due&&f.mode==='play'&&!f.pet&&!f.dragging&&f.action==='idle')next=idleIndex++%2?'yawn':'groom';}
  if(next){event=next;started=f.time;}
  const quiet=matchMedia('(prefers-reduced-motion:reduce)').matches||f.paused||f.dragging;if(quiet)event='';
  return {...motion(event,Math.max(0,f.time-started),quiet),photos:current.photos};
 }
 function pose(base,a,f){
  if(f.dragging||f.pet||f.jumpPhase!=null||['walk','stalk','look-away'].includes(f.action))return base;
  const b=f.utilityBadge||{};let index=null;
  if(b.due)index=5;else if(b.kind==='charging')index=9;else if(b.kind==='battery')index=8;else if(a.photos)index=0;else if(b.count)index=2;
  if(!a.quiet){
   if(a.event==='remind')index=a.age<.45?4:5;
   else if(a.event==='done')index=a.age<.65?6:7;
   else if(!b.due){if(a.event==='throw')index=a.age<.3?0:1;else if(a.event==='photos')index=0;else if(a.event==='store'||a.event==='catch')index=a.progress<.75?3:2;else if(a.event==='charge')index=a.age<.35?8:9;else if(a.event==='low')index=8;else if(a.event==='groom')index=10;else if(a.event==='yawn')index=11;}
  }
  if(index===null)return base;
  // All four limbs belong to this single full-body drawing.
  const pose={...base,sheet:'actions',index,altitude:0,rotation:0,sx:1,sy:1};
  if(!a.quiet){pose.rotation=a.beat*(a.event==='done'?Math.sin(a.age*7)*.035:a.event==='throw'?-.045:a.event==='store'?.025:0);pose.sy=1-a.beat*.012;}
  return pose;
 }
 function drawDetails(c,p,source,unit,drawWidth,drawHeight,a,photos){
  if(p.sheet!=='actions')return;
  // Only the photograph interior is dynamic; the original illustrated forepaws stay intact.
  if(p.index===0&&photos[0]){
   c.save();c.translate(-drawWidth/2-source.x*unit,-drawHeight-source.y*unit);c.scale(unit,unit);
   c.beginPath();c.moveTo(270,205);c.lineTo(298,211);c.lineTo(290,246);c.lineTo(262,240);c.closePath();c.clip();c.drawImage(photos[0],260,203,40,45);c.restore();
  }
  if([4,5,6].includes(p.index)){
   const centers={4:[254,590],5:[642,568],6:[1024,568]},point=centers[p.index];c.save();c.fillStyle='#6e5030';c.textAlign='center';c.font=Math.max(7,unit*17)+'px "Segoe UI",sans-serif';c.fillText(p.index===6?'✓':'Đến giờ',-drawWidth/2+(point[0]-source.x)*unit,-drawHeight+(point[1]-source.y)*unit);c.restore();
  }
  if(p.index===1&&a.event==='throw'&&photos[0]&&!a.quiet){const t=ease((a.age-.3)/.9);c.save();c.translate((20+42*t)*unit,-drawHeight*.5-70*t*unit);c.rotate(t*.4);c.globalAlpha=1-t;c.fillStyle='#fff7e5';c.fillRect(-19*unit,-14*unit,38*unit,30*unit);c.drawImage(photos[0],-17*unit,-12*unit,34*unit,23*unit);c.restore();}
 }
 window.CAT_PROPS={update,pose,motion,drawDetails};
})();
