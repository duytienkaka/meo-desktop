'use strict';
const canvas=document.querySelector('#spectrum'),ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
let protection=[],behind=false;
let visible=false,playing=false,raf=0,last=0,peak=0,received=0,gradient=null;
const history=new Float32Array(96),heights=new Float32Array(600);
function draw(now){
 raf=0;
 if(!visible||!playing)return;
 if(now-last<40){raf=requestAnimationFrame(draw);return;}
 const dt=last?Math.min(.1,(now-last)/1000):.04;last=now;
 const width=innerWidth,height=innerHeight,scale=Math.min(devicePixelRatio,1.25);
 if(canvas.width!==Math.round(width*scale)||canvas.height!==Math.round(height*scale)){
  canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  ctx.setTransform(scale,0,0,scale,0,0);gradient=ctx.createLinearGradient(0,0,width,0);
  ['#ff5476','#ffad53','#f1e860','#64e3a2','#67cbff','#9d89ff','#f08de4'].forEach((color,index)=>gradient.addColorStop(index/6,color));
 }
 ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle=gradient;
 const count=Math.min(heights.length,Math.ceil(width/8)),barWidth=width/count;
 const live=now-received<350?peak:0;
 for(let i=0;i<count;i++){
  const position=i/(count-1)*(history.length-1),index=Math.floor(position),fraction=position-index;
  const old=history[index]*(1-fraction)+history[Math.min(history.length-1,index+1)]*fraction;
  const target=live>0?Math.min(1,old*.65+live*.35):0;
  const speed=target>heights[i]?30:9;
  heights[i]+=(target-heights[i])*(1-Math.exp(-dt*speed));
  const bar=height*.72*heights[i];
  if(bar<.5)continue;
  const trayFade=Math.max(0,Math.min(1,(i/count-.77)/.17));
  ctx.globalAlpha=.96-trayFade*.53;ctx.beginPath();ctx.roundRect(i*barWidth+2,height-bar-1,Math.max(2,barWidth-3),bar,2);ctx.fill();
 }
 if(!reduced.matches)raf=requestAnimationFrame(draw);
}
function update(){
 cancelAnimationFrame(raf);raf=0;last=0;
 if(visible&&playing)raf=requestAnimationFrame(draw);
 else{ctx.clearRect(0,0,canvas.width,canvas.height);history.fill(0);heights.fill(0);peak=0;}
}
function protectIcons(){
 if(behind){document.body.style.clipPath='none';return;}
 const width=innerWidth,height=innerHeight,merged=[];
 const intervals=protection.map(rect=>[Math.max(0,Math.floor(rect.x-24)),Math.min(width,Math.ceil(rect.x+rect.width+24))]).filter(([left,right])=>right>left).sort((a,b)=>a[0]-b[0]);
 for(const interval of intervals){
  const previous=merged[merged.length-1];
  if(previous&&interval[0]<=previous[1]+2)previous[1]=Math.max(previous[1],interval[1]);
  else merged.push(interval);
 }
 let path='M0 0H'+width+'V'+height+'H0Z';
 for(const [left,right] of merged)path+='M'+left+' 0H'+right+'V'+height+'H'+left+'Z';
 document.body.style.clipPath='path(evenodd, "'+path+'")';
 document.body.classList.toggle('protected',merged.length>0);
}
window.taskbarMusic.onBehind(value=>{behind=value;document.body.classList.toggle('behind',behind);protectIcons();});
window.taskbarMusic.onProtection(regions=>{protection=regions;protectIcons();});
window.taskbarMusic.onLevel(level=>{
 peak=Math.min(1,Math.sqrt(Math.max(0,level)));received=performance.now();
 history.copyWithin(0,1);history[history.length-1]=peak;
 if(reduced.matches&&visible&&playing&&performance.now()-last>250)raf=requestAnimationFrame(draw);
});
window.taskbarMusic.onTrack(track=>{playing=track.playing;update();});
window.taskbarMusic.onMotion(value=>{visible=value;document.body.classList.toggle('shown',visible);update();});
addEventListener('resize',()=>{protectIcons();gradient=null;canvas.width=0;update();});reduced.addEventListener('change',update);
window.taskbarMusic.ready();
