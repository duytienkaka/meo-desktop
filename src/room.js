(()=>{
 'use strict';
 const layout=window.ROOM_LAYOUT,scene=document.querySelector('#scene'),canvas=document.querySelector('#room-pet'),ctx=canvas.getContext('2d'),controller=window.ROOM_PET.create(),images={},reactions=window.ROOM_REACTIONS.create();let reactionState={},lifeState={},hitTargets=[];const life=window.ROOM_LIFE.create();
 document.documentElement.style.setProperty('--ratio',layout.width/layout.height);
 const dust=document.querySelector('.dust');for(let i=0;i<18;i++){const p=document.createElement('i');p.style.left=(27+(i*17)%49)+'%';p.style.top=(19+(i*11)%58)+'%';p.style.animationDelay=(-i*1.3)+'s';p.style.animationDuration=(13+i%7)+'s';dust.append(p);}
 let state={paused:true,showPet:false,destination:'bed',character:'classic',size:112},last=0,raf=0,ready=false,pose=null,playRemaining=0,teaseRemaining=0;
 let ballPosition=.56,ballRotation=0;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 // Draw the pet between independent scenery elements at the depth of its feet.
 function petLayer(pose){
  if(pose.y<.61)return 4;
  if(pose.y<.69)return 9;
  if(pose.y<.94&&pose.surface==='floor'&&pose.x>.55)return 10;
  return pose.y<.89?13:15;
 }
 function render(now){raf=0;const w=scene.clientWidth,h=scene.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
  if(ready&&state.showPet){
   const stepTime=state.paused?0:dt;
   playRemaining=Math.max(0,playRemaining-stepTime);
   teaseRemaining=Math.max(0,teaseRemaining-stepTime);lifeState=life.step(state.paused?0:dt,pose,{roam:state.roam,night:state.lighting?.phase==='night',quiet:reduced.matches});pose=controller.step(teaseRemaining?0:stepTime,playRemaining?'play':lifeState.destination||state.destination,reduced.matches);
   if(teaseRemaining)pose={...pose,phase:'touch',sx:1+(reduced.matches?0:Math.sin(teaseRemaining*15)*.045)};
   if(lifeState.routine==='chase'&&['idle','rest'].includes(pose.phase)){pose={...pose,x:pose.x+Math.sin(lifeState.progress*Math.PI*2)*.025,altitude:Math.sin(lifeState.progress*Math.PI)**2*.025,phase:'touch'};}const time=pose.elapsed,breath=state.paused||reduced.matches?0:Math.sin(time*1.7)*.008;
   reactionState=reactions.update(pose,state.paused?0:dt,reduced.matches);
   canvas.style.zIndex=String(petLayer(pose));
   let sheet='core',index=0;if(pose.phase==='walk'){sheet='walk';index=Math.floor(time*14)%8;}else if(pose.phase==='jump')index=9;else if(pose.phase==='look')index=3;else if(pose.phase==='touch'||pose.phase==='pounce')index=11;else if(pose.phase==='crouch')index=8;else if(pose.phase==='land')index=10;else if(pose.phase==='sleep'){sheet='moods';index=9;}else if(pose.phase==='settle')index=2;else if(state.music){sheet='moods';index=Math.floor(time*3.3)%4;}else index=time%4.8>4.5?2:0;
   if(['sleep','idle','rest'].includes(pose.phase)){if(lifeState.routine==='stretch'){sheet='core';index=lifeState.progress<.35?3:8;}else if(lifeState.routine==='groom'){sheet='actions';index=10;}else if(lifeState.routine==='watch'){sheet='core';index=3;}}
   if(lifeState.affection>0&&!teaseRemaining&&!playRemaining){sheet='core';index=2;}
   let p;if(sheet==='walk')p={sheet:state.character==='classic'?'walk':state.character+'-walk',index};else p=window.CAT_CHARACTERS.resolve({sheet,index},state.character);
   const source=window.CAT_SPRITES[p.sheet].frames[p.index],size=Math.max(70,Math.min(180,state.size))*w/1536*pose.depth,u=window.CAT_CHARACTERS.unit(p.sheet,size),sw=source.w*u,sh=source.h*u,x=pose.x*w,y=(pose.y+(pose.contact?reactionState.bed*.004:0))*h,altitude=pose.altitude*h;
   ctx.save();ctx.translate(x,y+2);ctx.scale(1,.24);ctx.filter='blur(5px)';ctx.fillStyle=`rgba(48,32,20,${.23*(1-Math.min(1,pose.altitude*6))})`;ctx.beginPath();ctx.ellipse(0,0,size*(.3+pose.altitude),size*.22,0,0,Math.PI*2);ctx.fill();ctx.restore();
   const sceneBox=scene.getBoundingClientRect(),bedBox=document.getElementById('object-nest').getBoundingClientRect();hitTargets=[{kind:'pet',x:sceneBox.left+x-sw/2,y:sceneBox.top+y-altitude-sh,width:sw,height:sh},{kind:'bed',x:bedBox.left,y:bedBox.top,width:bedBox.width,height:bedBox.height}];
   const cursor=state.cursor||{x:-1000,y:-1000},follow=pose.surface==='sill'&&Math.abs(cursor.x-(sceneBox.left+x))<w*.25&&['idle','rest'].includes(pose.phase),lean=follow?Math.max(-.055,Math.min(.055,(cursor.x-(sceneBox.left+x))/w*.3)):0;
   ctx.save();ctx.translate(x,y-altitude+(pose.phase==='sleep'?2:0));ctx.rotate(lean);if(lifeState.routine==='stretch')ctx.scale(1+Math.sin(lifeState.progress*Math.PI)*.06,1-Math.sin(lifeState.progress*Math.PI)*.06);ctx.scale(pose.direction*pose.sx,pose.sy+breath);ctx.drawImage(images[p.sheet],source.x,source.y,source.w,source.h,-sw/2,-sh,sw,sh);ctx.restore();

  }
  if(playRemaining&&state.showPet){
   const target=pose?.surface==='floor'?Math.max(.45,Math.min(.73,pose.x+pose.direction*.065)):.56;
   const r=Math.max(9,w*.012),motion=reduced.matches?0:1;
   const shift=(target-ballPosition)*(1-Math.exp(-dt*7))*Number(!state.paused);
   ballPosition+=shift;ballRotation+=motion*shift*w/r;
   const age=18-playRemaining;
   const bounce=motion*(Math.exp(-age*1.5)*Math.abs(Math.cos(age*5))*.055+Math.min(.012,Math.abs(shift)*3));
   drawYarn(ballPosition*w,.95*h,r,bounce*h,ballRotation);
  }
  if(pose&&state.showPet&&hitTargets.length&&!playRemaining&&(teaseRemaining||lifeState.affection)){
   const box=hitTargets[0],bounds=scene.getBoundingClientRect();
   const teasing=teaseRemaining>0,progress=teasing?1-teaseRemaining/2:1-lifeState.affection;
   drawReaction(box.x-bounds.left+box.width*.5,box.y-bounds.top,Math.max(7,box.width*.105),progress,teasing,pose.direction);
  }
  window.room.targets([...(state.showPet?hitTargets:[]),...Array.from(document.querySelectorAll('[data-play]'),button=>{const r=button.getBoundingClientRect();return{kind:button.dataset.play,x:r.x,y:r.y,width:r.width,height:r.height};})]);
  if(!state.showPet)reactions.reset();
  if(state.showPet&&!state.paused&&!reduced.matches)raf=requestAnimationFrame(render);
 }
 // Wind two bundles across a shaded ball, clipping the strands to its silhouette.
 function drawYarn(x,floor,r,lift,angle){
  ctx.save();ctx.translate(x,floor);
  ctx.fillStyle='rgba(64,40,38,.20)';ctx.beginPath();ctx.ellipse(0,1,r*1.15,r*.21,0,0,2*Math.PI);ctx.fill();
  ctx.scale(r,r);ctx.lineCap='round';ctx.lineWidth=.09;ctx.strokeStyle='#a54e53';
  ctx.beginPath();ctx.moveTo(-.32,-.25-lift/r);ctx.bezierCurveTo(-1.05,.30,-1.40,-.46,-1.72,-.13);ctx.bezierCurveTo(-1.95,.12,-2.18,.02,-2.35,-.11);ctx.stroke();
  ctx.translate(0,-1-lift/r);ctx.rotate(angle);
  ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fillStyle='#cf7472';ctx.fill();ctx.clip();
  const strands=()=>{for(let i=-4;i<=4;i++){
   const offset=i*.23;ctx.beginPath();ctx.moveTo(-1.4,offset+.32);ctx.quadraticCurveTo(-.05,offset-.61,1.4,offset+.14);
   ctx.strokeStyle='#a95758';ctx.lineWidth=.14;ctx.stroke();ctx.strokeStyle='#f4b39d';ctx.lineWidth=.055;ctx.stroke();
  }};
  ctx.rotate(-.58);strands();
  ctx.save();ctx.beginPath();ctx.ellipse(.57,.22,.79,1.22,-.58,0,Math.PI*2);ctx.clip();ctx.fillStyle='#cd706e';ctx.fillRect(-2,-2,4,4);ctx.rotate(1.45);strands();ctx.restore();
  ctx.restore();
  ctx.save();const cy=floor-r-lift,shade=ctx.createRadialGradient(x-r*.35,cy-r*.42,0,x,cy,r);
  shade.addColorStop(0,'rgba(255,231,196,.40)');shade.addColorStop(.60,'rgba(255,226,194,0)');shade.addColorStop(1,'rgba(91,41,51,.44)');
  ctx.fillStyle=shade;ctx.beginPath();ctx.arc(x,cy,r,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 function drawReaction(x,y,r,progress,teasing,direction){
  ctx.save();ctx.translate(x,y);ctx.scale(r,r);
  for(let i=0;i<3;i++){
   const t=reduced.matches ? .45 : (progress-i*.10)/.75;
   if(t<0||t>1)continue;
   ctx.save();ctx.globalAlpha=Math.min(1,(t+.04)*8,(1-t)*4);
   if(teasing){
    ctx.translate(direction*(2+i*.72+t*.45),-.18-i*.39-t*.44);
    ctx.rotate(direction*(.15+i*.20));ctx.scale(.7-i*.10,.7-i*.10);
    ctx.beginPath();ctx.moveTo(0,-1);ctx.quadraticCurveTo(.12,-.16,.74,0);ctx.quadraticCurveTo(.14,.13,0,1);ctx.quadraticCurveTo(-.14,.14,-.74,0);ctx.quadraticCurveTo(-.14,-.15,0,-1);
    ctx.fillStyle='#ffdb89';ctx.strokeStyle='#936541';
   }else{
    ctx.translate((i-1)*(1.25+t*.85),-.3-t*2.7+(i%2)*.48);
    ctx.rotate((i-1)*.22);ctx.scale(.75-i*.09,.75-i*.09);
    ctx.beginPath();ctx.moveTo(0,.85);ctx.bezierCurveTo(-1.65,-.19,-.71,-1.32,0,-.59);ctx.bezierCurveTo(.73,-1.31,1.62,-.18,0,.85);
    ctx.fillStyle=i===1?'#ffc9bb':'#ec9297';ctx.strokeStyle='#9d595d';
   }
   ctx.closePath();ctx.lineWidth=.14;ctx.stroke();ctx.fill();ctx.restore();
  }
  ctx.restore();
 }
 function draw(){if(!raf)raf=requestAnimationFrame(render);}
 window.room.onInteraction(kind=>{
  if(kind==='ball'){ballPosition=.56;ballRotation=0;controller.play();playRemaining=18;teaseRemaining=0;life.interact('release');}
  else if(kind==='tease'){playRemaining=0;teaseRemaining=2;}
  else {playRemaining=0;teaseRemaining=0;life.interact(kind);}
  draw();
 });
 window.room.onState(s=>{if(s.destination!==state.destination)life.interact('release');state={...state,...s};const toggle=document.querySelector('[data-play="room-toggle"]');toggle.title=state.roomInside?'Ra phòng':'Vào phòng';toggle.querySelector('.room-toggle-label').textContent=toggle.title;document.body.classList.toggle("controls-left",state.controlsSide==="left");if(s.lighting){const light=s.lighting;document.body.classList.toggle('night',light.phase==='night');for(const k of ['dark','warm','lamp','sun'])scene.style.setProperty('--time-'+k,light[k]);}document.body.classList.toggle('paused',s.paused);document.body.classList.toggle('music',s.music);document.body.classList.toggle('near-plant',s.nearPlant);if(!s.showPet||s.paused)last=0;draw();});
 addEventListener('resize',draw);reduced.addEventListener('change',draw);
 window.meoRoom={snapshot:()=>({ready,state,pose,reactionState,lifeState,hitTargets,playRemaining,teaseRemaining})};
 Promise.all([...Array.from(document.querySelectorAll('.room-object'),object=>object.decode()),...['actions','core','moods','walk','mit','may','muc','mit-walk','may-walk','muc-walk'].map(name=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images[name]=image;resolve();};image.onerror=reject;image.src='../assets/'+name+'.png';}))]).then(()=>{ready=true;window.room.ready();draw();});
})();
