'use strict';
const {clamp}=require('./route.cjs');
function constrainPosition(area,point,petSize=112){
  const margin=petSize*.7;
  return{x:clamp(point.x,area.x+margin,area.x+area.width-margin),y:clamp(point.y,area.y+petSize*1.15,area.y+area.height-12)};
}
function freePlacement(area,point,petSize=112){
  const p=constrainPosition(area,point,petSize),width=Math.min(320,area.width),height=Math.min(320,area.height);
  const x=clamp(Math.round(p.x-width/2),area.x,area.x+area.width-width),y=clamp(Math.round(p.y-height+12),area.y,area.y+area.height-height);
  return{x,y,width,height,anchorX:p.x-x,anchorY:p.y-y,rotation:0,segment:-1};
}
function fitPlacement(area,p,size){
 // All coordinates are Electron DIP, including mixed-DPI monitor origins.
 // Reserve the rotated character's envelope instead of just its foot point.
 const c=Math.cos(p.rotation),s=Math.sin(p.rotation),corners=[-.75,.75].flatMap(x=>[.08,-1.3].map(y=>({x:(x*c-y*s)*size,y:(x*s+y*c)*size})));
 const minX=Math.min(...corners.map(q=>q.x)),maxX=Math.max(...corners.map(q=>q.x)),minY=Math.min(...corners.map(q=>q.y)),maxY=Math.max(...corners.map(q=>q.y));
 const ax=clamp(p.x+p.anchorX,area.x+3-minX,area.x+area.width-3-maxX),ay=clamp(p.y+p.anchorY,area.y+3-minY,area.y+area.height-3-maxY);
 return {...p,anchorX:ax-p.x,anchorY:ay-p.y};
}
module.exports={constrainPosition,freePlacement,fitPlacement};
