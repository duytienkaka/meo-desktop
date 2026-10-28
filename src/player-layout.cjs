'use strict';
const {clamp}=require('./route.cjs');
function playerLayout(area,head){
  const width=Math.min(460,area.width-16),height=Math.min(204,area.height-16),gap=18;
  const x=clamp(Math.round(head.x-width/2),area.x+8,area.x+area.width-width-8);
  const preferredY=head.y-area.y>=height+gap+8?head.y-height-gap:head.y+gap;
  const y=clamp(Math.round(preferredY),area.y+8,area.y+area.height-height-8);
  const left=Math.max(area.x,Math.min(x,Math.floor(head.x-12))),top=Math.max(area.y,Math.min(y,Math.floor(head.y-12)));
  const right=Math.min(area.x+area.width,Math.max(x+width,Math.ceil(head.x+12))),bottom=Math.min(area.y+area.height,Math.max(y+height,Math.ceil(head.y+12)));
  const card={x:x-left+10,y:y-top+10,width:width-20,height:height-20};
  return{window:{x:left,y:top,width:right-left,height:bottom-top},card,origin:{x:head.x-left-card.x,y:head.y-top-card.y}};
}
module.exports={playerLayout};
