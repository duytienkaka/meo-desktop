(() => {
  'use strict';
  const canvas=document.querySelector('#pet'),ctx=canvas.getContext('2d');
  const images={},pixels={},atlas=window.CAT_SPRITES;
  let width=320,height=320,dpr=1,frame=null,previousTime=null,displaySize=112,previousMode=null,lastPounce=false,held=null,hit=false,transform=null;
  const particles=[],seen=new Set();let fileHover=false,fileHoverTimer;
  const utilityButton=document.querySelector('#utility-bag');
  function onUtility(point){if(utilityButton.hidden)return false;const r=utilityButton.getBoundingClientRect();return point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom;}
  utilityButton.addEventListener('click',()=>window.meo.utilities.open(frame?.utilityBadge?.due?'reminders':'shelf').catch(()=>{}));
  utilityButton.addEventListener('pointerenter',()=>window.meo.hit(true));
  const pocket=document.querySelector('#photo-pocket'),sendPhotos=document.querySelector('#send-photos');let photoState={photos:[]},carried=[],flightPhotos=[],lastActivity=null,pocketKey='';
  function onPocket(point){if(pocket.hidden)return false;const r=pocket.getBoundingClientRect();return point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom;}
  function receivePhotos(value){if(value.busy&&!photoState.busy)flightPhotos=carried.slice();photoState=value;sendPhotos.disabled=value.busy||!value.target;sendPhotos.textContent=value.busy?'Đang đưa…':'Đưa '+value.photos.length+' ảnh ↗';sendPhotos.title=value.target?'Đưa toàn bộ ảnh vào ô vừa chọn trong '+value.target.name+'; bạn tự bấm gửi.':'Bấm vào ô nhận ảnh trong ứng dụng trước.';const key=JSON.stringify(value.photos.map(p=>p.id));if(key===pocketKey)return;pocketKey=key;carried=[];value.photos.forEach((photo,index)=>{const image=new Image();image.onload=()=>{if(pocketKey===key)carried[index]=image;};image.src=photo.thumb;});}
  window.meo.shots.onChange(receivePhotos);window.meo.shots.get().then(receivePhotos).catch(()=>{});
  sendPhotos.addEventListener('click',()=>window.meo.shots.action('send-all').catch(()=>{}));
  const audioHud=document.querySelector('#audio-hud'),muteButton=document.querySelector('#pet-mute');let audioHover=false,wheelRemainder=0,wheelSteps=0,wheelTimer,audioBusy=false;
  function onAudioHud(point){if(audioHud.hidden)return false;const r=audioHud.getBoundingClientRect();return point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom;}
  function renderAudio(f){
    const audio=f.audio||{available:false,level:0,muted:false};audioHud.hidden=f.fileHover||!(f.audioFeedback||audioHover);
    const angle=f.rotation,cx=f.anchorX+Math.sin(angle)*displaySize*.9,cy=f.anchorY-Math.cos(angle)*displaySize*.9;
    audioHud.style.left=clamp(cx-65,6,width-136)+'px';audioHud.style.top=clamp(cy-62,6,height-42)+'px';
    document.querySelector('#audio-level').textContent=Math.round(audio.level)+'%';
    muteButton.disabled=audioBusy||!audio.available;muteButton.setAttribute('aria-label',audio.muted?'Bật tiếng hệ thống':'Tắt tiếng hệ thống');muteButton.title=audio.muted?'Bật tiếng hệ thống':'Tắt tiếng hệ thống';muteButton.classList.toggle('muted',audio.muted);audioHud.classList.toggle('muted',audio.muted);
  }
  audioHud.addEventListener('pointerenter',()=>{audioHover=true;});audioHud.addEventListener('pointerleave',()=>{audioHover=false;});
  muteButton.addEventListener('click',async event=>{event.stopPropagation();if(audioBusy)return;audioBusy=true;try{await window.meo.audio.command('toggle');}catch{}finally{audioBusy=false;}});
  async function flushWheel(){
    wheelTimer=null;if(!wheelSteps){wheelSteps=0;return;}
    const steps=clamp(wheelSteps,-5,5);wheelSteps-=steps;
    try{await window.meo.audio.command('step',steps*2);}catch{wheelSteps=0;}
    if(wheelSteps)wheelTimer=setTimeout(flushWheel,60);
  }
  addEventListener('wheel',event=>{
    if(!frame||held||fileHover||event.ctrlKey||event.metaKey||!Number.isFinite(event.deltaY)||!(sampleHit({x:event.clientX,y:event.clientY})||onAudioHud({x:event.clientX,y:event.clientY})))return;
    event.preventDefault();const delta=event.deltaY*(event.deltaMode===1?40:event.deltaMode===2?100:1);wheelRemainder+=clamp(-delta,-1000,1000);
    const steps=Math.trunc(wheelRemainder/100);if(steps){wheelRemainder-=steps*100;wheelSteps=clamp(wheelSteps+steps,-20,20);if(!wheelTimer)wheelTimer=setTimeout(flushWheel,60);}
  },{passive:false});
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  function blink(t){const p=t%4.8;return p>4.33&&p<4.42?1:p>=4.42&&p<4.55?2:p>=4.55&&p<4.64?1:0;}
  function pose(f){
    let sheet='core',index=0,altitude=0,rotation=0,sx=1,sy=1;
    if(f.jumpPhase!==null){const p=f.jumpPhase;if(p<.18){index=8;sy=.97;sx=1.02;}else if(p<.65){index=9;altitude=Math.sin((p-.18)/.47*Math.PI)*Math.min(64,displaySize*.45);}else if(p<.81){index=10;sx=1.02;sy=.97;}else index=11;}
    else if(f.pet){sheet=f.mode==='music'||f.mode==='sleep'?'moods':'core';index=f.mode==='music'?0:f.mode==='sleep'?10:2;const affection=Math.min(1,f.actionElapsed/.35);rotation=Math.sin(f.actionElapsed*3.4)*.075*affection;sx=1+Math.sin(f.actionElapsed*3.4)*.025;sy=1-Math.sin(f.actionElapsed*3.4)*.018;altitude=(Math.sin(f.actionElapsed*3.4)+1)*1.2;}
    else if(f.action==='stalk'){index=8;sx=1.04+Math.sin(f.actionElapsed*22)*.012;sy=.94;rotation=Math.sin(f.actionElapsed*22)*.018;}
    else if(f.action==='look-away'){index=f.actionElapsed<.45?11:3;rotation=-.07;sx=f.actionElapsed>.4?-1:1;}
    else if(f.action==='rest'){sheet='moods';index=9;sy=1+Math.sin(f.time*1.7)*.015;}
    else if(f.action==='walk'){index=4+Math.floor(f.actionElapsed*7)%4;altitude=Math.abs(Math.sin(f.actionElapsed*Math.PI*7))*1.1;}
    else if(f.mode==='music'){sheet='moods';index=Math.floor(f.time*3.3)%4;rotation=Math.sin(f.time*5.2)*.035;sy=1+Math.sin(f.time*5.2)*.012;altitude=(Math.sin(f.time*5.2)+1)*.8;}
    else if(f.mode==='sleep'){sheet='moods';index=f.time%12>10.6&&f.time%12<11.6?10:9;sy=1+Math.sin(f.time*1.7)*.018;sx=1-Math.sin(f.time*1.7)*.006;}
    else {index=blink(f.time);sy=1+Math.sin(f.time*2)*.008;if(f.mode==='play'&&index===0&&f.time%13>11.3)index=3;}
    if(f.musicReactionElapsed!==null&&f.musicReactionElapsed!==undefined&&f.mode==='music'&&!f.paused&&!f.dragging){
      const phase=clamp(f.musicReactionElapsed/1.15,0,1),envelope=Math.sin(Math.PI*phase),beat=Math.sin(phase*Math.PI*4);
      rotation+=beat*.11*envelope;sy-=Math.max(0,beat)*.05*envelope;sx+=Math.max(0,beat)*.025*envelope;altitude+=Math.max(0,-beat)*3*envelope;
    }
    return {sheet,index,altitude,rotation,sx,sy};
  }
  function emit(x,y,kind,count=5){for(let i=0;i<count;i++)particles.push({x,y,age:0,life:.7+Math.random()*.5,vx:(Math.random()-.5)*28,vy:-20-Math.random()*30,kind,size:2+Math.random()*3});}
  function drawParticles(dt){
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>p.life){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=Math.sin(p.age/p.life*Math.PI)*.9;
      if(p.kind==='heart'){ctx.scale(p.size/6,p.size/6);ctx.fillStyle='#d18e87';ctx.beginPath();ctx.moveTo(0,3);ctx.bezierCurveTo(-12,-4,-5,-11,0,-5);ctx.bezierCurveTo(5,-11,12,-4,0,3);ctx.fill();}
      else if(p.kind==='note'){ctx.fillStyle='#b6a0d3';ctx.font=(p.size+9)+'px "Segoe UI",sans-serif';ctx.fillText('♪',0,0);}
      else {ctx.strokeStyle='#d1b077';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-p.size,0);ctx.lineTo(p.size,0);ctx.moveTo(0,-p.size);ctx.lineTo(0,p.size);ctx.stroke();}ctx.restore();
    }
  }
  function textBubble(text){
    ctx.save();ctx.font='11px "Segoe UI", system-ui, sans-serif';
    const words=text.split(' '),lines=[];let line='';
    for(const word of words){const candidate=line?line+' '+word:word;if(ctx.measureText(candidate).width>245&&line){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);
    const bw=Math.min(width-12,Math.max(...lines.map(l=>ctx.measureText(l).width))+22),bh=lines.length*15+16;
    const bx=clamp(frame.anchorX-bw/2,6,width-bw-6),by=clamp(frame.anchorY-displaySize-52,8,height-bh-8);
    ctx.fillStyle='#101014f5';ctx.strokeStyle='#ffffff26';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(bx,by,bw,bh,10);ctx.fill();ctx.stroke();ctx.fillStyle='#eeeef4';
    for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],bx+11,by+19+i*15);ctx.restore();
  }
  function sampleHit(point){
    if(!transform)return false;
    const t=transform,dx=point.x-t.x,dy=point.y-t.y,c=Math.cos(t.angle),s=Math.sin(t.angle);
    const localX=(dx*c+dy*s)/t.sx,localY=(-dx*s+dy*c)/t.sy;
    const u=(localX+t.drawWidth/2)/t.unit,v=(localY+t.drawHeight)/t.unit;
    if(u<0||v<0||u>=t.source.w||v>=t.source.h)return false;
    const data=pixels[t.sheet],px=Math.floor(t.source.x+u),py=Math.floor(t.source.y+v);
    return data.data[(py*data.width+px)*4+3]>48;
  }
  function drawUtility(f){
    const badge=f.utilityBadge||{};utilityButton.hidden=f.fileHover||f.audioFeedback;
    utilityButton.textContent=badge.due?'Nhắc '+badge.due:badge.count?'Túi '+badge.count:'Túi';utilityButton.classList.toggle('due',!!badge.due);utilityButton.title=badge.due?badge.text:'Túi đồ, nhắc việc & chế độ máy';
    utilityButton.style.left=clamp(f.anchorX+displaySize*.37,4,width-60)+'px';utilityButton.style.top=clamp(f.anchorY-displaySize-27,4,height-30)+'px';
  }

  function render(f){
    const dt=previousTime===null?0:clamp(f.time-previousTime,0,.12);previousTime=f.time;
    displaySize+= (f.size-displaySize)*(1-Math.exp(-Math.max(dt,.016)*6));
    frame=f;const activity=window.CAT_PROPS.update(f,photoState),p=window.CAT_PROPS.pose(pose(f),activity,f),source=atlas[p.sheet].frames[p.index];lastActivity=activity;if(activity.event!=='throw'&&!photoState.busy)flightPhotos=[];seen.add(p.sheet+':'+p.index);
    const unit=p.sheet==='actions'?displaySize/314:displaySize/292*(p.sheet==='moods'?.93:1),drawWidth=source.w*unit,drawHeight=source.h*unit;
    const angle=f.rotation+p.rotation,c=Math.cos(f.rotation),s=Math.sin(f.rotation);
    const x=f.anchorX+s*p.altitude,y=f.anchorY-c*p.altitude;
    transform={x,y,angle,sx:f.direction*p.sx,sy:p.sy,drawWidth,drawHeight,unit,source,sheet:p.sheet};
    ctx.clearRect(0,0,width,height);
    if(f.fileHover){ctx.save();ctx.translate(f.anchorX,f.anchorY);ctx.rotate(f.rotation);ctx.fillStyle='#b8dba02b';ctx.strokeStyle='#a2c18a';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.beginPath();ctx.roundRect(-displaySize*.65,-displaySize*1.1,displaySize*1.3,displaySize*1.2,18);ctx.fill();ctx.stroke();ctx.restore();}
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(transform.sx,transform.sy);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(images[p.sheet],source.x,source.y,source.w,source.h,-drawWidth/2,-drawHeight,drawWidth,drawHeight);
    window.CAT_PROPS.drawDetails(ctx,p,source,unit,drawWidth,drawHeight,activity,activity.event==='throw'&&flightPhotos.length?flightPhotos:carried);ctx.restore();
    pocket.hidden=!photoState.photos.length||f.fileHover||f.audioFeedback||audioHover;const px=f.anchorX+Math.cos(f.rotation)*displaySize*.54,py=f.anchorY+Math.sin(f.rotation)*displaySize*.54-displaySize*.40;pocket.style.left=clamp(px+88>width?f.anchorX-displaySize*.54-88:px,5,width-93)+'px';pocket.style.top=clamp(py,5,height-30)+'px';
    if(f.pet&&!window.__wasPet)emit(clamp(x,25,width-25),clamp(y-displaySize*.8,25,height-25),'heart');window.__wasPet=f.pet;
    if(previousMode!==null&&previousMode!==f.mode)emit(clamp(x,25,width-25),clamp(y-displaySize*.6,25,height-25),'spark',4);previousMode=f.mode;
    const reaction=f.musicReactionElapsed!==null&&f.musicReactionElapsed!==undefined;
    if(reaction&&(!window.__wasMusicReaction||f.musicReactionElapsed<window.__lastMusicReaction))emit(clamp(x+displaySize*.25,25,width-25),clamp(y-displaySize*.85,25,height-25),'note',3);
    window.__wasMusicReaction=reaction;window.__lastMusicReaction=f.musicReactionElapsed;
    if(lastPounce&&f.jumpPhase===null)emit(clamp(x,25,width-25),clamp(y-5,25,height-25),'spark',3);lastPounce=f.jumpPhase!==null;
    drawParticles(dt);
    drawUtility(f);
    renderAudio(f);
    if(f.fileHover)textBubble('Thả file ở đây');else if(f.toast&&!f.audioFeedback&&!photoState.photos.length)textBubble(f.toast);
    hit=(sampleHit(f.cursor)||onAudioHud(f.cursor)||onPocket(f.cursor)||onUtility(f.cursor));canvas.style.cursor=f.dragging?'grabbing':hit?'grab':'default';window.meo.hit(hit||!!held||fileHover);
  }
  function nearPet(event){if(!frame||!transform)return false;const angle=frame.rotation,cx=transform.x+Math.sin(angle)*displaySize*.55,cy=transform.y-Math.cos(angle)*displaySize*.55;return sampleHit({x:event.clientX,y:event.clientY})||Math.hypot(event.clientX-cx,event.clientY-cy)<displaySize*.8;}
  function setFileHover(active){clearTimeout(fileHoverTimer);fileHover=active;window.meo.fileHover(active);if(active)fileHoverTimer=setTimeout(()=>setFileHover(false),1100);}
  for(const type of ['dragenter','dragover'])canvas.addEventListener(type,event=>{if(!Array.from(event.dataTransfer?.types||[]).some(t=>t==='Files'||t==='text/plain'||t==='text/uri-list'))return;event.preventDefault();const near=nearPet(event);event.dataTransfer.dropEffect=near?'copy':'none';setFileHover(near);});
  canvas.addEventListener('dragleave',()=>setFileHover(false));
  addEventListener('dragend',()=>setFileHover(false));
  canvas.addEventListener('drop',event=>{event.preventDefault();const accept=nearPet(event);setFileHover(false);if(accept)window.meo.utilities.drop([...event.dataTransfer.files],(event.dataTransfer.getData('text/plain')||event.dataTransfer.getData('text/uri-list'))).catch(error=>window.meo.utilities.error(error.message));});
  canvas.addEventListener('contextmenu',event=>{event.preventDefault();if(hit)window.meo.action('menu');});
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||!sampleHit({x:event.clientX,y:event.clientY}))return;event.preventDefault();
    hit=true;window.meo.hit(true);
    window.meo.action('press');
    held={x:event.screenX,y:event.screenY,drag:false,id:event.pointerId};canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!frame)return;
    hit=sampleHit({x:event.clientX,y:event.clientY});window.meo.hit(hit||!!held);
    if(held&&!held.drag&&Math.hypot(event.screenX-held.x,event.screenY-held.y)>7){held.drag=true;window.meo.action('drag-start');}
  });
  function release(){if(!held)return;window.meo.action(held.drag?'drag-end':'pet');held=null;}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',()=>{if(held){window.meo.action('drag-end');held=null;}});
  canvas.addEventListener('lostpointercapture',()=>{if(held){window.meo.action('drag-end');held=null;}});
  addEventListener('resize',resize);resize();
  window.meoPet={snapshot:()=>({frame,activity:lastActivity,pose:frame?pose(frame):null,displaySize,hit,seen:[...seen],width,height}),hitAt:point=>sampleHit(point)};
  Promise.all(['core','moods','actions'].map(name=>new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>{
      images[name]=img;const buffer=document.createElement('canvas');buffer.width=img.naturalWidth;buffer.height=img.naturalHeight;
      const context=buffer.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0);pixels[name]=context.getImageData(0,0,buffer.width,buffer.height);resolve();
    };img.onerror=reject;img.src=`../assets/${name}.png`;
  }))).then(()=>{window.meo.onFrame(render);window.meo.ready();}).catch(()=>window.meo.action('error'));
})();
