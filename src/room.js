(()=>{
 'use strict';
 const layout=window.ROOM_LAYOUT,scene=document.querySelector('#scene'),canvas=document.querySelector('#room-pet'),ctx=canvas.getContext('2d'),controller=window.ROOM_PET.create(),images={},reactions=window.ROOM_REACTIONS.create();let reactionState={},lifeState={},hitTargets=[];const life=window.ROOM_LIFE.create();
 document.documentElement.style.setProperty('--ratio',layout.width/layout.height);
 const dust=document.querySelector('.dust');for(let i=0;i<18;i++){const p=document.createElement('i');p.style.left=(27+(i*17)%49)+'%';p.style.top=(19+(i*11)%58)+'%';p.style.animationDelay=(-i*1.3)+'s';p.style.animationDuration=(13+i%7)+'s';dust.append(p);}
 let state={paused:true,showPet:false,destination:'bed',character:'classic',size:112},last=0,raf=0,ready=false,pose=null;
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
  if(ready&&state.showPet){lifeState=life.step(state.paused?0:dt,pose,{roam:state.roam,night:state.lighting?.phase==='night',quiet:reduced.matches});pose=controller.step(state.paused?0:dt,lifeState.destination||state.destination,reduced.matches);
   if(lifeState.routine==='chase'&&['idle','rest'].includes(pose.phase)){pose={...pose,x:pose.x+Math.sin(lifeState.progress*Math.PI*2)*.025,altitude:Math.sin(lifeState.progress*Math.PI)**2*.025,phase:'touch'};}const time=pose.elapsed,breath=state.paused||reduced.matches?0:Math.sin(time*1.7)*.008;
   reactionState=reactions.update(pose,state.paused?0:dt,reduced.matches);
   canvas.style.zIndex=String(petLayer(pose));
   let sheet='core',index=0;if(pose.phase==='walk'){sheet='walk';index=Math.floor(time*14)%8;}else if(pose.phase==='jump')index=9;else if(pose.phase==='look')index=3;else if(pose.phase==='touch')index=11;else if(pose.phase==='crouch')index=8;else if(pose.phase==='land')index=10;else if(pose.phase==='sleep'){sheet='moods';index=9;}else if(pose.phase==='settle')index=2;else if(state.music){sheet='moods';index=Math.floor(time*3.3)%4;}else index=time%4.8>4.5?2:0;
   if(['sleep','idle','rest'].includes(pose.phase)){if(lifeState.routine==='stretch'){sheet='core';index=lifeState.progress<.35?3:8;}else if(lifeState.routine==='groom'){sheet='actions';index=10;}else if(lifeState.routine==='watch'){sheet='core';index=3;}}
   if(lifeState.affection>0){sheet='core';index=2;}
   let p;if(sheet==='walk')p={sheet:state.character==='classic'?'walk':state.character+'-walk',index};else p=window.CAT_CHARACTERS.resolve({sheet,index},state.character);
   const source=window.CAT_SPRITES[p.sheet].frames[p.index],size=Math.max(70,Math.min(180,state.size))*w/1536*pose.depth,u=window.CAT_CHARACTERS.unit(p.sheet,size),sw=source.w*u,sh=source.h*u,x=pose.x*w,y=(pose.y+(pose.contact?reactionState.bed*.004:0))*h,altitude=pose.altitude*h;
   ctx.save();ctx.translate(x,y+2);ctx.scale(1,.24);ctx.filter='blur(5px)';ctx.fillStyle=`rgba(48,32,20,${.23*(1-Math.min(1,pose.altitude*6))})`;ctx.beginPath();ctx.ellipse(0,0,size*(.3+pose.altitude),size*.22,0,0,Math.PI*2);ctx.fill();ctx.restore();
   const sceneBox=scene.getBoundingClientRect(),bedBox=document.getElementById('object-nest').getBoundingClientRect();hitTargets=[{kind:'pet',x:sceneBox.left+x-sw/2,y:sceneBox.top+y-altitude-sh,width:sw,height:sh},{kind:'bed',x:bedBox.left,y:bedBox.top,width:bedBox.width,height:bedBox.height}];window.room.targets(hitTargets);
   const cursor=state.cursor||{x:-1000,y:-1000},follow=pose.surface==='sill'&&Math.abs(cursor.x-(sceneBox.left+x))<w*.25&&['idle','rest'].includes(pose.phase),lean=follow?Math.max(-.055,Math.min(.055,(cursor.x-(sceneBox.left+x))/w*.3)):0;
   ctx.save();ctx.translate(x,y-altitude+(pose.phase==='sleep'?2:0));ctx.rotate(lean);if(lifeState.routine==='stretch')ctx.scale(1+Math.sin(lifeState.progress*Math.PI)*.06,1-Math.sin(lifeState.progress*Math.PI)*.06);ctx.scale(pose.direction*pose.sx,pose.sy+breath);ctx.drawImage(images[p.sheet],source.x,source.y,source.w,source.h,-sw/2,-sh,sw,sh);ctx.restore();

  }
  if(lifeState.affection>0&&state.showPet){ctx.save();ctx.globalAlpha=Math.sin(lifeState.affection*Math.PI);ctx.fillStyle='#c58c7e';ctx.font=Math.max(12,w*.012)+'px Segoe UI';const p=hitTargets[0];if(p)ctx.fillText('♥',p.x-scene.getBoundingClientRect().left+p.width*.7,p.y-scene.getBoundingClientRect().top-12-(1-lifeState.affection)*20);ctx.restore();}
  if(!state.showPet)reactions.reset();
  if(state.showPet&&!state.paused&&!reduced.matches)raf=requestAnimationFrame(render);
 }
 function draw(){if(!raf)raf=requestAnimationFrame(render);}
 window.room.onInteraction(kind=>{life.interact(kind);draw();});
 window.room.onState(s=>{if(s.destination!==state.destination)life.interact('release');state={...state,...s};if(s.lighting){const light=s.lighting;document.body.classList.toggle('night',light.phase==='night');for(const k of ['dark','warm','lamp','sun'])scene.style.setProperty('--time-'+k,light[k]);}document.body.classList.toggle('paused',s.paused);document.body.classList.toggle('music',s.music);document.body.classList.toggle('near-plant',s.nearPlant);if(!s.showPet||s.paused)last=0;draw();});
 addEventListener('resize',draw);reduced.addEventListener('change',draw);
 window.meoRoom={snapshot:()=>({ready,state,pose,reactionState,lifeState,hitTargets})};
 Promise.all([...Array.from(document.querySelectorAll('.room-object'),object=>object.decode()),...['actions','core','moods','walk','mit','may','muc','mit-walk','may-walk','muc-walk'].map(name=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images[name]=image;resolve();};image.onerror=reject;image.src='../assets/'+name+'.png';}))]).then(()=>{ready=true;window.room.ready();draw();});
})();
