'use strict';
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const wrap = (n,total) => ((n%total)+total)%total;

function makeRoute(area, windowSize=320) {
  const inset=12, left=area.x+inset, top=area.y+inset;
  const right=area.x+area.width-inset, bottom=area.y+area.height-inset;
  const radius=Math.max(8,Math.min(windowSize/2-inset,(right-left)/2-1,(bottom-top)/2-1));
  const horizontal=right-left-2*radius, vertical=bottom-top-2*radius, arc=Math.PI*radius/2;
  const lengths=[horizontal,arc,vertical,arc,horizontal,arc,vertical,arc];
  const total=lengths.reduce((a,b)=>a+b,0);
  function point(distance) {
    let s=wrap(distance,total),segment=0;
    while(segment<7&&s>lengths[segment]) {s-=lengths[segment];segment++;}
    let x,y,angle;
    if(segment===0) {x=left+radius+s;y=bottom;angle=Math.PI/2;}
    else if(segment===2) {x=right;y=bottom-radius-s;angle=0;}
    else if(segment===4) {x=right-radius-s;y=top;angle=-Math.PI/2;}
    else if(segment===6) {x=left;y=top+radius+s;angle=-Math.PI;}
    else {
      angle=Math.PI/2-(segment-1)/2*Math.PI/2-s/radius;
      const cx=segment<4?right-radius:left+radius;
      const cy=segment===1||segment===7?bottom-radius:top+radius;
      x=cx+radius*Math.cos(angle);y=cy+radius*Math.sin(angle);
    }
    return {x,y,nx:Math.cos(angle),ny:Math.sin(angle),rotation:angle-Math.PI/2,segment};
  }
  function nearest(p) {
    let best=0,bestD=Infinity;
    for(let i=0;i<96;i++) {
      const s=i/96*total,q=point(s),d=(q.x-p.x)**2+(q.y-p.y)**2;
      if(d<bestD){best=s;bestD=d;}
    }
    let step=total/96;
    for(let i=0;i<9;i++) {
      for(const s of [best-step,best+step]) {
        const q=point(s),d=(q.x-p.x)**2+(q.y-p.y)**2;
        if(d<bestD){best=s;bestD=d;}
      }
      step/=2;
    }
    return {distance:wrap(best,total),separation:Math.sqrt(bestD),point:point(best)};
  }
  function delta(from,to) {return wrap(to-from+total/2,total)-total/2;}
  function windowAt(distance) {
    const p=point(distance);
    const x=clamp(Math.round(p.x-p.nx*radius-windowSize/2),area.x,area.x+Math.max(0,area.width-windowSize));
    const y=clamp(Math.round(p.y-p.ny*radius-windowSize/2),area.y,area.y+Math.max(0,area.height-windowSize));
    return {x,y,width:Math.min(windowSize,area.width),height:Math.min(windowSize,area.height),anchorX:p.x-x,anchorY:p.y-y,rotation:p.rotation,segment:p.segment};
  }
  return {area:{...area},radius,lengths,total,point,nearest,delta,windowAt,bottomLength:horizontal};
}
module.exports={makeRoute,wrap,clamp};
