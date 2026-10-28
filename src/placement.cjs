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
module.exports={constrainPosition,freePlacement};
