(() => {
  'use strict';
  const list=[{id:'classic',name:'Bông',description:'Mèo tam thể quen thuộc'},{id:'mit',name:'Mít',description:'Mèo vàng tinh nghịch'},{id:'may',name:'Mây',description:'Mèo xám dịu dàng'},{id:'muc',name:'Mực',description:'Mèo tuxedo tò mò'}];
  const actions=[16,17,18,19,20,20,20,18,21,21,22,23];
  function resolve(p,character='classic',f={}){
    const logicalSheet=p.sheet,logicalIndex=p.index;
    if(character==='classic'||!list.some(item=>item.id===character)){
      if(p.sheet==='core'&&f.action==='walk')return {...p,sheet:'walk',index:Math.floor((f.actionElapsed||0)*14)%8,logicalSheet,logicalIndex};
      return {...p,logicalSheet,logicalIndex};
    }
    if(p.sheet==='core'&&f.action==='walk')return {...p,sheet:character+'-walk',index:Math.floor((f.actionElapsed||0)*14)%8,logicalSheet,logicalIndex};
    const index=p.sheet==='actions'?actions[p.index]:p.sheet==='moods'?(p.index<4?12+p.index%2:p.index===10?15:14):p.index;
    return {...p,sheet:character,index,logicalSheet,logicalIndex};
  }
  function unit(sheet,size){return size/(window.CAT_SPRITES[sheet].baseHeight||(sheet==='actions'?314:sheet==='moods'?292/.93:292));}
  function details(c,p,source,u,w,h,activity,photos){
    if(!['mit','may','muc'].includes(p.sheet))return false;
    if(p.index===20){c.save();c.textAlign='center';c.fillStyle='#5b381f';c.font=Math.max(7,u*19)+'px "Segoe UI",sans-serif';c.fillText(activity.event==='done'?'✓':'Đến giờ',0,-h*.22);c.restore();}
    // Sprite includes all paws. Only the photo's interior is composited here.
    const rect=window.CAT_SPRITES[p.sheet].photo;
    if(p.index===16&&photos[0]&&rect){c.save();c.drawImage(photos[0],-w/2+(rect.x-source.x)*u,-h+(rect.y-source.y)*u,rect.w*u,rect.h*u);c.restore();}
    if(p.index===17&&activity.event==='throw'&&photos[0]&&!activity.quiet){const t=Math.min(1,Math.max(0,(activity.age-.3)/.9));c.save();c.translate(w*.3+t*w*.4,-h*.55-t*h*.4);c.rotate(t*.5);c.globalAlpha=1-t;c.fillStyle='#fff8ed';c.fillRect(-13,-10,26,23);c.drawImage(photos[0],-11,-8,22,16);c.restore();}
    return true;
  }
  window.CAT_CHARACTERS={list,resolve,unit,details};
})();
