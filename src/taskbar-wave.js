'use strict';
const canvas=document.querySelector('#spectrum'),ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
const preview=new URLSearchParams(location.search).has('preview');
let previewTimer;
const previewEvents={};
const bridge=preview?{
 onBehind:f=>previewEvents.behind=f,onProtection(){},onLevel:f=>previewEvents.level=f,
 onMotion:f=>previewEvents.motion=f,onTrack:f=>previewEvents.track=f,onOptions(){},ready(){},
 previewStart(){
  previewEvents.behind(true);previewEvents.track({playing:true});
  let t=0;
  previewTimer=setInterval(()=>{
   if(!visible)return;t+=.04;
   previewEvents.level({level:.3,bands:Array.from({length:32},(_,i)=>.025*(.35+.65*Math.max(0,Math.sin(t*(3+i%5)-i*.45))**6))});
  },40);
 }
}:window.taskbarMusic;
let protection=[],behind=false;
let visible=false,playing=false,raf=0,last=0,peak=0,received=0,gradient=null;
const history=new Float32Array(96),heights=new Float32Array(600);
let averageLevel=0,beat=0,lastLevelAt=0;
let options={style:'bars',height:70,sensitivity:100,decay:65,colors:'rainbow',peaks:true};
const bands=new Float32Array(32),averages=new Float32Array(32),tops=new Float32Array(600);
const rainbow=['#ff5476','#ffad53','#f1e860','#64e3a2','#67cbff','#9d89ff','#f08de4'];
let hasBands=false,palette=rainbow,artwork='',artRevision=0;
function setOptions(value){options={...options,...value};gradient=null;}
function loadPalette(source){
 if(source===artwork)return;artwork=source;const revision=++artRevision;
 palette=rainbow;gradient=null;
 if(!source||!source.startsWith('data:image/'))return;
 const image=new Image();
 image.onload=()=>{
  if(revision!==artRevision)return;
  const sample=document.createElement('canvas');sample.width=sample.height=24;
  const brush=sample.getContext('2d',{willReadFrequently:true});brush.drawImage(image,0,0,24,24);
  const pixels=brush.getImageData(0,0,24,24).data,buckets=new Map();
  for(let i=0;i<pixels.length;i+=4){
   const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
   if(pixels[i+3]<128||Math.max(r,g,b)<45||Math.min(r,g,b)>235)continue;
   const key=[r>>5,g>>5,b>>5].join(',');
   const bin=buckets.get(key)||{count:0,r:0,g:0,b:0};bin.count++;bin.r+=r;bin.g+=g;bin.b+=b;buckets.set(key,bin);
  }
  const colors=[...buckets.values()].sort((a,b)=>b.count-a.count).slice(0,4).map(bin=>{
   const color=[bin.r,bin.g,bin.b].map(n=>n/bin.count),boost=Math.max(1,160/Math.max(...color));
   return 'rgb('+color.map(n=>Math.min(255,Math.round(n*boost))).join(',')+')';
  });
  if(colors.length){palette=colors.length===1?[colors[0],colors[0]]:colors;gradient=null;}
 };
 image.src=source;
}
function draw(now){
 raf=0;if(!visible||!playing)return;
 if(now-last<33){raf=requestAnimationFrame(draw);return;}
 const dt=last?Math.min(.1,(now-last)/1000):.04;last=now;
 const vertical=innerHeight>innerWidth,scale=Math.min(devicePixelRatio,1.25);
 const width=vertical?innerHeight:innerWidth,height=vertical?innerWidth:innerHeight;
 if(canvas.width!==Math.round(innerWidth*scale)||canvas.height!==Math.round(innerHeight*scale)){
  canvas.width=Math.round(innerWidth*scale);canvas.height=Math.round(innerHeight*scale);gradient=null;
 }
 if(vertical)ctx.setTransform(0,scale,-scale,0,canvas.width,0);
 else ctx.setTransform(scale,0,0,scale,0,0);
 if(!gradient){
  gradient=ctx.createLinearGradient(0,0,width,0);
  const colors=options.colors==='cover'?palette:rainbow;
  colors.forEach((color,index)=>gradient.addColorStop(index/(colors.length-1),color));
 }
 ctx.clearRect(0,0,width,height);ctx.fillStyle=gradient;ctx.strokeStyle=gradient;
 const count=Math.min(heights.length,Math.ceil(width/8)),barWidth=width/count;
 const fresh=now-received<350,live=fresh?peak:0;
 const cap=height*options.height/100;
 for(let i=0;i<count;i++){
  const position=options.style==='mirror'?Math.abs(i/Math.max(1,count-1)*2-1):i/Math.max(1,count-1);
  const source=hasBands?bands:history;
  const at=position*(source.length-1),index=Math.floor(at),fraction=at-index;
  const old=source[index]*(1-fraction)+source[Math.min(source.length-1,index+1)]*fraction;
  const target=fresh?(hasBands?old:old*.25+live*.75):0;
  const speed=target>heights[i]?45:5+options.decay*.2;
  heights[i]+=(target-heights[i])*(1-Math.exp(-dt*speed));
  tops[i]=Math.max(heights[i],tops[i]-dt*(.08+options.decay*.002));
  const bar=cap*heights[i];
  const trayFade=Math.max(0,Math.min(1,(i/count-.77)/.17));
  ctx.globalAlpha=.96-trayFade*.53;
  if(options.style==='line'){
   if(i===0){ctx.beginPath();ctx.moveTo(0,height-bar-1);}
   else ctx.lineTo(i*barWidth,height-bar-1);
  }else if(bar>=.5){
   ctx.beginPath();ctx.roundRect(i*barWidth+2,height-bar-1,Math.max(2,barWidth-3),bar,2);ctx.fill();
  }
  if(options.style!=='line'&&options.peaks&&tops[i]>.02){
   ctx.fillStyle='#ffffffcc';ctx.fillRect(i*barWidth+2,height-cap*tops[i]-2,Math.max(2,barWidth-3),1.5);ctx.fillStyle=gradient;
  }
 }
 if(options.style==='line'){
  ctx.globalAlpha=.92;ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
  if(options.peaks){
   ctx.beginPath();ctx.strokeStyle='#ffffff88';ctx.lineWidth=1;
   for(let i=0;i<count;i++){
    const x=i*barWidth,y=height-cap*tops[i]-2;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
   }
   ctx.stroke();
  }
 }
 if(!reduced.matches)raf=requestAnimationFrame(draw);
}
function update(){
 cancelAnimationFrame(raf);raf=0;last=0;
 if(visible&&playing)raf=requestAnimationFrame(draw);
 else{ctx.clearRect(0,0,canvas.width,canvas.height);history.fill(0);heights.fill(0);tops.fill(0);bands.fill(0);averages.fill(0);hasBands=false;peak=0;averageLevel=0;beat=0;lastLevelAt=0;}
}
function protectIcons(){
 if(behind){document.body.style.clipPath='none';return;}
 const width=innerWidth,height=innerHeight,vertical=height>width,merged=[];
 document.body.classList.toggle('vertical',vertical);
 const length=vertical?height:width;
 const intervals=protection.filter(rect=>rect.x<width&&rect.y<height&&rect.x+rect.width>0&&rect.y+rect.height>0).map(rect=>{
  const start=vertical?rect.y:rect.x,span=vertical?rect.height:rect.width;
  return [Math.max(0,Math.floor(start-12)),Math.min(length,Math.ceil(start+span+12))];
 }).filter(([left,right])=>right>left).sort((a,b)=>a[0]-b[0]);
 for(const interval of intervals){
  const previous=merged[merged.length-1];
  if(previous&&interval[0]<=previous[1]+2)previous[1]=Math.max(previous[1],interval[1]);
  else merged.push(interval);
 }
 let path='M0 0H'+width+'V'+height+'H0Z';
 for(const [start,end] of merged)path+=vertical?'M0 '+start+'H'+width+'V'+end+'H0Z':'M'+start+' 0H'+end+'V'+height+'H'+start+'Z';
 document.body.style.clipPath='path(evenodd, "'+path+'")';
 document.body.classList.toggle('protected',merged.length>0);
}
bridge.onBehind(value=>{behind=value;document.body.classList.toggle('behind',behind);protectIcons();});
bridge.onProtection(regions=>{protection=regions;protectIcons();});
bridge.onLevel(level=>{
 const packet=level;
 level=typeof packet==='object'&&packet!==null?packet.level:packet;
 if(!Number.isFinite(level))return;
 const now=performance.now(),value=Math.max(0,Math.min(1,level));
 const dt=lastLevelAt?Math.min(.35,(now-lastLevelAt)/1000):.04;
 if(!lastLevelAt||now-lastLevelAt>350){averageLevel=value;beat=0;}
 // Measure accents against the recent loudness instead of amplifying every sample to the ceiling.
 const accent=Math.max(0,(value-averageLevel)/Math.max(.08,averageLevel));
 beat=Math.max(beat*Math.exp(-dt*12),Math.min(.78,accent*.9*options.sensitivity/100));
 averageLevel+=(value-averageLevel)*(1-Math.exp(-dt*2));
 peak=value>.001?Math.min(.96,.16*Math.sqrt(value)+beat):0;
 if(packet&&Array.isArray(packet.bands)&&packet.bands.length===32){
  hasBands=true;
  for(let i=0;i<32;i++){
   const amplitude=Math.max(0,Math.min(1,packet.bands[i]));
   if(!lastLevelAt||now-lastLevelAt>350)averages[i]=amplitude;
   const rise=Math.max(0,(amplitude-averages[i])/Math.max(.002,averages[i]));
   const hit=Math.min(.83,rise*.55*options.sensitivity/100);
   bands[i]=value>.001?Math.min(.96,.14*Math.pow(amplitude,.25)+Math.max(hit,bands[i]*Math.exp(-dt*12))):0;
   averages[i]+=(amplitude-averages[i])*(1-Math.exp(-dt*2));
  }
 }else hasBands=false;
 received=now;lastLevelAt=now;
 history.copyWithin(0,1);history[history.length-1]=peak;
 if(reduced.matches&&visible&&playing&&performance.now()-last>250)raf=requestAnimationFrame(draw);
});
bridge.onOptions?.(setOptions);
bridge.onTrack(track=>{loadPalette(track.artwork||'');if(playing!==track.playing){playing=track.playing;update();}});
bridge.onMotion(value=>{
 visible=value;
 if(visible)canvas.getBoundingClientRect();
 document.body.classList.toggle('shown',visible);
 if(visible)update();
 else{cancelAnimationFrame(raf);raf=0;last=0;}
});
addEventListener('resize',()=>{protectIcons();gradient=null;canvas.width=0;update();});reduced.addEventListener('change',update);
bridge.ready();
if(preview){
 document.body.classList.add('wave-preview');bridge.previewStart();
 addEventListener('message',event=>{
  if(event.source!==parent||event.data?.type!=='wave-preview')return;
  setOptions(event.data.options);loadPalette(event.data.artwork||'');
  const active=event.data.active===true;
  document.body.classList.toggle('shown',active);
  if(visible!==active){visible=active;update();}
 });
 addEventListener('pagehide',()=>clearInterval(previewTimer));
}
