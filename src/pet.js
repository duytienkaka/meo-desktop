(() => {
  'use strict';
  const canvas=document.querySelector('#pet'),ctx=canvas.getContext('2d');
  const images={},pixels={},atlas=window.CAT_SPRITES;
  let width=320,height=320,dpr=1,frame=null,previousTime=null,displaySize=112,previousMode=null,lastPounce=false,held=null,hit=false,transform=null;
  const particles=[],seen=new Set();
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
    else if(f.mode==='game'){sheet='moods';index=4+blink(f.time*.76);sy=1+Math.sin(f.time*1.5)*.004;}
    else if(f.mode==='sleep'){sheet='moods';index=f.time%12>10.6&&f.time%12<11.6?10:9;sy=1+Math.sin(f.time*1.7)*.018;sx=1-Math.sin(f.time*1.7)*.006;}
    else {index=blink(f.time);sy=1+Math.sin(f.time*2)*.008;if(f.mode==='play'&&index===0&&f.time%13>11.3)index=3;}
    return {sheet,index,altitude,rotation,sx,sy};
  }
  function emit(x,y,kind,count=5){for(let i=0;i<count;i++)particles.push({x,y,age:0,life:.7+Math.random()*.5,vx:(Math.random()-.5)*28,vy:-20-Math.random()*30,kind,size:2+Math.random()*3});}
  function drawParticles(dt){
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>p.life){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=Math.sin(p.age/p.life*Math.PI)*.9;
      if(p.kind==='heart'){ctx.scale(p.size/6,p.size/6);ctx.fillStyle='#d18e87';ctx.beginPath();ctx.moveTo(0,3);ctx.bezierCurveTo(-12,-4,-5,-11,0,-5);ctx.bezierCurveTo(5,-11,12,-4,0,3);ctx.fill();}
      else {ctx.strokeStyle='#d1b077';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-p.size,0);ctx.lineTo(p.size,0);ctx.moveTo(0,-p.size);ctx.lineTo(0,p.size);ctx.stroke();}ctx.restore();
    }
  }
  function textBubble(text){
    ctx.save();ctx.font='11px "Segoe UI", system-ui, sans-serif';
    const words=text.split(' '),lines=[];let line='';
    for(const word of words){const candidate=line?line+' '+word:word;if(ctx.measureText(candidate).width>245&&line){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);
    const bw=Math.min(width-12,Math.max(...lines.map(l=>ctx.measureText(l).width))+22),bh=lines.length*15+16;
    const bx=clamp(frame.anchorX-bw/2,6,width-bw-6),by=clamp(frame.anchorY-displaySize-52,8,height-bh-8);
    ctx.fillStyle='#fffdf4ed';ctx.strokeStyle='#d5c9ad';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(bx,by,bw,bh,10);ctx.fill();ctx.stroke();ctx.fillStyle='#746651';
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
  function render(f){
    const dt=previousTime===null?0:clamp(f.time-previousTime,0,.12);previousTime=f.time;
    displaySize+= (f.size-displaySize)*(1-Math.exp(-Math.max(dt,.016)*6));
    frame=f;if(f.mode==='game'&&held){const id=held.id;held=null;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}const p=pose(f),source=atlas[p.sheet].frames[p.index];seen.add(p.sheet+':'+p.index);
    const unit=displaySize/292*(p.sheet==='moods'?.93:1),drawWidth=source.w*unit,drawHeight=source.h*unit;
    const angle=f.rotation+p.rotation,c=Math.cos(f.rotation),s=Math.sin(f.rotation);
    const x=f.anchorX+s*p.altitude,y=f.anchorY-c*p.altitude;
    transform={x,y,angle,sx:f.direction*p.sx,sy:p.sy,drawWidth,drawHeight,unit,source,sheet:p.sheet};
    ctx.clearRect(0,0,width,height);
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(transform.sx,transform.sy);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(images[p.sheet],source.x,source.y,source.w,source.h,-drawWidth/2,-drawHeight,drawWidth,drawHeight);ctx.restore();
    if(f.pet&&!window.__wasPet&&f.mode!=='game')emit(clamp(x,25,width-25),clamp(y-displaySize*.8,25,height-25),'heart');window.__wasPet=f.pet;
    if(previousMode!==null&&previousMode!==f.mode)emit(clamp(x,25,width-25),clamp(y-displaySize*.6,25,height-25),'spark',4);previousMode=f.mode;
    if(lastPounce&&f.jumpPhase===null)emit(clamp(x,25,width-25),clamp(y-5,25,height-25),'spark',3);lastPounce=f.jumpPhase!==null;
    drawParticles(dt);
    if(f.toast)textBubble(f.toast);
    hit=f.mode!=='game'&&sampleHit(f.cursor);canvas.style.cursor=f.dragging?'grabbing':hit?'grab':'default';window.meo.hit(hit||!!held);
  }
  canvas.addEventListener('contextmenu',event=>{event.preventDefault();if(hit)window.meo.action('menu');});
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||frame?.mode==='game'||!sampleHit({x:event.clientX,y:event.clientY}))return;event.preventDefault();
    hit=true;window.meo.hit(true);
    window.meo.action('press');
    held={x:event.screenX,y:event.screenY,drag:false,id:event.pointerId};canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!frame||frame.mode==='game')return;
    hit=sampleHit({x:event.clientX,y:event.clientY});window.meo.hit(hit||!!held);
    if(held&&!held.drag&&Math.hypot(event.screenX-held.x,event.screenY-held.y)>7){held.drag=true;window.meo.action('drag-start');}
  });
  function release(){if(!held)return;window.meo.action(held.drag?'drag-end':'pet');held=null;}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',()=>{if(held){window.meo.action('drag-end');held=null;}});
  canvas.addEventListener('lostpointercapture',()=>{if(held){window.meo.action('drag-end');held=null;}});
  addEventListener('resize',resize);resize();
  window.meoPet={snapshot:()=>({frame,displaySize,hit,seen:[...seen],width,height}),hitAt:point=>sampleHit(point)};
  Promise.all(['core','moods'].map(name=>new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>{
      images[name]=img;const buffer=document.createElement('canvas');buffer.width=img.naturalWidth;buffer.height=img.naturalHeight;
      const context=buffer.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0);pixels[name]=context.getImageData(0,0,buffer.width,buffer.height);resolve();
    };img.onerror=reject;img.src=`../assets/${name}.png`;
  }))).then(()=>{window.meo.onFrame(render);window.meo.ready();}).catch(()=>window.meo.action('error'));
})();
