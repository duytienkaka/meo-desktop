(()=>{
 const columns={classic:0,mit:1,may:2,muc:3};
 const gifts=[...ROOM_KEEPSAKES.common,...ROOM_KEEPSAKES.rare];
 function create(){
  const sheet=new Image();
  sheet.src='../assets/room/level-up.webp';
  const images=new Map();
  const assets=[sheet];
  for(const gift of gifts){
   const image=new Image();
   image.src='../assets/room/keepsake-'+gift.id+'.webp';
   images.set(gift.id,image);
   assets.push(image);
  }
  const ready=Promise.all(assets.map(image=>image.decode()));
  const queue=[];
  let previous=null,active=null,age=0;
  function observe(features){
   if(!Number.isInteger(features?.care?.level))return;
   const next=features.care,owned=features.unlocked||[];
   if(previous&&next.level>previous.level){
    const gift=gifts.find(item=>owned.includes(item.id)&&!previous.owned.includes(item.id));
    queue.push({level:next.level,gift});
   }
   previous={level:next.level,owned};
  }
  function step(dt,canStart){
   if(!active&&canStart&&queue.length){active=queue.shift();age=0;}
   if(active){age+=dt;if(age>=4.2)active=null;}
   return !!active;
  }
  function draw(ctx,size,character,quiet){
   const t=quiet?2:age;
   const row=t<.55?0:t<1.12||t>3.8?1:2;
   const floor=[.91,.93,.995][row];
   const hop=quiet?0:Math.sin(Math.PI*Math.min(1,Math.max(0,(t-1.12)/.42)))*size*.09;
   ctx.save();
   ctx.translate(0,-hop);ctx.scale(size/256,size/256);
   ctx.drawImage(sheet,(columns[character]||0)*256,row*256,256,256,-135,-256*floor,256,256);
   const x=[15,13,62][row],y=[-8,-68,-182][row];
   const scale=Math.min(1,Math.max(0,(t-.15)/.36));
   if(scale>0){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    const image=images.get(active.gift?.id);
    if(image){const width=Math.min(85,78*image.width/image.height);ctx.drawImage(image,-width/2,-width*image.height/image.width,width,width*image.height/image.width);}
    else{ctx.fillStyle='#f4ce79';ctx.strokeStyle='#996124';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-22,24,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#70482f';ctx.font='bold 23px sans-serif';ctx.textAlign='center';ctx.fillText(String(active.level),0,-14);}
    ctx.restore();
   }
   if(row===2){
    ctx.font='600 25px "Segoe UI",sans-serif';ctx.textAlign='center';
    const label='Cấp '+active.level+(active.gift?' · '+active.gift.name:'');
    const width=ctx.measureText(label).width+28;
    ctx.fillStyle='#302620ed';ctx.beginPath();ctx.roundRect(-width/2,-307,width,38,16);ctx.fill();
    ctx.fillStyle='#ffe4ac';ctx.fillText(label,0,-280);
   }
   ctx.restore();
  }
  return{ready,observe,step,draw,get active(){return active;}};
 }
 window.ROOM_LEVEL_UP={create};
})();
