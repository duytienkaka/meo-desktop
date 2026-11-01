'use strict';
const {clamp}=require('./route.cjs');
// Keep the panel clear of the whole cat, while its animation starts at the head.
function companionLayout(area,anchor){
 const margin=8,gap=16,width=Math.min(380,area.width-margin*2);
 const above=Math.max(0,anchor.top-area.y-margin-gap),below=Math.max(0,area.y+area.height-margin-anchor.bottom-gap);
 const onTop=above>=300||above>=below,height=Math.min(510,onTop?above:below);
 const x=clamp(Math.round(anchor.x-width/2),area.x+margin,area.x+area.width-width-margin);
 const y=Math.round(onTop?anchor.top-gap-height:anchor.bottom+gap);
 const left=Math.min(x,Math.floor(anchor.x)),top=Math.min(y,Math.floor(anchor.y));
 const right=Math.max(x+width,Math.ceil(anchor.x)),bottom=Math.max(y+height,Math.ceil(anchor.y));
 const card={x:x-left+7,y:y-top+7,width:width-14,height:height-14};
 return {window:{x:left,y:top,width:right-left,height:bottom-top},card,origin:{x:anchor.x-left-card.x,y:anchor.y-top-card.y}};
}
module.exports={companionLayout};
