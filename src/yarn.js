'use strict';
window.DRAW_YARN=function(ctx,x,floor,r,lift,angle){
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
 };
