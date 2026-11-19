(()=>{
 const scene=document.querySelector('#scene'),shelf=document.createElement('div'),weather=document.createElement('div'),reminder=document.createElement('div'),card=document.createElement('div');
 shelf.id='souvenir-shelf';weather.id='window-weather';reminder.id='water-reminder';card.id='souvenir-card';
 const heldCup=document.createElement('img');heldCup.id='held-water-cup';heldCup.src='../assets/room/cup.webp';scene.append(weather,shelf,reminder,card,heldCup);
 reminder.innerHTML='<span>☕ Nghỉ tay, uống chút nước nhé</span><button data-feature="break-done">Đã nghỉ</button><button data-feature="break-snooze">5 phút nữa</button>';
 let current={},inspection=false,musicStart=0,wasMusic=false,nightVisit=false,autoLamp=false,nightRestUntil=0;
 const {rare,common}=window.ROOM_KEEPSAKES;
 const title=document.createElement('strong');
 const hint=document.createElement('p');
 hint.textContent='Chơi bóng, vuốt ve hoặc chọc mèo để có cơ hội nhận quà hiếm.';
 card.append(title);
 card.hidden=true;
 const figures=[];
 for(const items of [rare,common]){
  const group=document.createElement('section');
  const heading=document.createElement('strong');
  heading.textContent=items===rare?'Bộ ba hiếm':'Quà lên cấp';
  group.append(heading);
  card.append(group);
  const tier=document.createElement('div');
  tier.className='keepsake-tier';
  const rail=document.createElement('img');
  rail.className='keepsake-rail';
  rail.src='../assets/room/keepsake-shelf.webp';
  rail.alt='';
  tier.append(rail);
  shelf.append(tier);
  for(const item of items){
   const key=item.id;
   const slot=document.createElement('span');
   slot.className='keepsake-slot '+key;
   const image=document.createElement('img');
   image.src='../assets/room/keepsake-'+key+'.webp';
   image.alt=item.name;
   slot.append(image);
   tier.append(slot);
   const row=document.createElement('div');
   row.className='keepsake-row';
   const thumbnail=image.cloneNode();
   thumbnail.alt='';
   const name=document.createElement('span');
   name.textContent=item.name;
   const status=document.createElement('small');
   row.append(thumbnail,name,status);
   group.append(row);
   figures.push({key,item,slot,row,status});
  }
 }
 card.append(hint);
 const decoration=document.createElement('img');decoration.id='room-keepsake';decoration.alt='';decoration.hidden=true;scene.append(decoration);
 const notice=document.createElement('div');notice.id='room-care-notice';notice.hidden=true;scene.append(notice);
 let lastOwnership='';
 function renderShelf(unlocked=[],newGifts=[]){
  const ownership=figures.map(({key})=>unlocked.includes(key));
  const signature=JSON.stringify([ownership,newGifts]);
  if(signature!==lastOwnership){
   lastOwnership=signature;
   title.textContent='Kệ kỷ niệm · '+ownership.filter(Boolean).length+'/'+figures.length;
   shelf.title=title.textContent;
   figures.forEach(({item,slot,row,status},index)=>{
    const locked=!ownership[index];
    slot.classList.toggle('locked',locked);
    slot.classList.toggle('new-gift',newGifts.includes(item.id));
    row.classList.toggle('locked',locked);
    status.textContent=locked?(item.level?'Cấp '+item.level:'Hiếm · 2% mỗi lượt thưởng'):(newGifts.includes(item.id)?'Mới':'Đã sở hữu');
    slot.title=item.name+' · '+status.textContent;
   });
   hint.hidden=rare.every(item=>unlocked.includes(item.id));
  }
  card.hidden=!inspection;
 }
 let bowlVisible=false,bowlDragging=false,eating=null,lastPose=null,foodPosition={x:.45,y:.94};
 const bowl=document.createElement('img');
 bowl.id='food-bowl';
 bowl.src='../assets/room/food-bowl.webp';
 bowl.alt='Bát gốm đựng thức ăn';
 bowl.draggable=false;
 bowl.hidden=true;
 scene.append(bowl);
 const hunger=document.createElement('button');hunger.type='button';hunger.id='cat-hunger';hunger.addEventListener('click',()=>food('food'));scene.append(hunger);
 function food(action){
  const kind=typeof action==='string'?action:action.kind;
  if(eating!==null)return;
  if(kind==='food'){
   if(!bowlVisible&&lastPose&&Math.hypot(lastPose.x-foodPosition.x,lastPose.y-foodPosition.y)<.16){
    foodPosition={x:lastPose.x<.5?Math.min(.9,lastPose.x+.22):Math.max(.1,lastPose.x-.22),y:.94};
   }
   bowlVisible=true;bowlDragging=false;
  }
  if(kind==='food-start'){bowlDragging=true;}
  if(kind==='food-end'){
   bowlDragging=action.dragging===true;
   if(Number.isFinite(action.x)&&Number.isFinite(action.y)){
    const box=scene.getBoundingClientRect();
    foodPosition={x:Math.max(.1,Math.min(.9,(action.x-box.left)/box.width)),y:Math.max(.92,Math.min(.97,(action.y-box.top)/box.height))};
   }
  }
 }
 function stepMeal(pose,dt){
  if(!bowlVisible||bowlDragging||pose?.target!=='food')return false;
  if(eating===null){
   if(!['idle','settle','rest'].includes(pose.phase))return false;
   eating=0;
  }
  eating+=dt;
  if(eating<5)return true;
  bowlVisible=false;eating=null;
  window.room.care('food-eaten');
  return false;
 }
 function destination(s,pose){
  const f=s.features||{},now=performance.now();
  if(bowlVisible)return 'food';
  if(s.musicPlaying&&!wasMusic)musicStart=now;
  wasMusic=!!s.musicPlaying;
  if(f.due)return 'desk';
  if(f.lamp==='auto'&&s.lighting?.phase==='night'&&!nightVisit){
   if(pose?.target==='desk'&&pose.phase==='touch'){nightVisit=true;autoLamp=true;nightRestUntil=now+25000;}
   return 'desk';
  }
  if(nightRestUntil>now)return 'desk';
  if(s.lighting?.phase!=='night'){nightVisit=false;autoLamp=false;}
  if(s.musicPlaying&&(now-musicStart)%90000<35000)return 'record';
  if(f.weather?.kind==='rain'&&now%120000<35000)return 'sill';
  return null;
 }
 function render(s,pose,pet,dt){
  lastPose=pose;
  current=s.features||{};const f=current;
  document.body.classList.toggle('rose-room',f.roomTheme==='rose'&&(f.care?.highest||1)>=5);
  bowl.hidden=!bowlVisible||eating!==null;
  bowl.style.left=(foodPosition.x*100)+'%';bowl.style.top=(foodPosition.y*100)+'%';
  hunger.hidden=!f.care||!s.showPet||!s.interactive||s.paused||bowlVisible||eating!==null;
  hunger.textContent=f.care?.hungry?'Cho ăn':'Cho ăn thêm';
  if(pet){hunger.style.left=(pet.x+pet.width*.5)+'px';hunger.style.top=(pet.y-30)+'px';}
  const on=f.lamp==='on'||(f.lamp==='auto'&&autoLamp);
  document.body.classList.toggle('room-lamp-on',on);
  document.body.classList.toggle('room-lamp-off',!on);
  weather.className=f.weather?(f.weather.night?'weather-night ':'')+'weather-'+f.weather.kind:'';
  renderShelf(f.unlocked,f.newGifts);
  const item=[...common,...rare].find(gift=>gift.id===f.decoration&&f.unlocked?.includes(gift.id));
  if(item&&decoration.dataset.item!==item.id){decoration.dataset.item=item.id;decoration.src='../assets/room/keepsake-'+item.id+'.webp';}
  decoration.hidden=!item;
  notice.hidden=!f.notice||!s.showPet;
  notice.textContent=f.notice?.message||'';
  reminder.hidden=!f.due;heldCup.hidden=!(f.due&&pose?.target==='desk'&&['idle','rest','settle'].includes(pose.phase));
  if(pet){heldCup.style.left=(pet.x+pet.width*.6)+'px';heldCup.style.top=(pet.y+pet.height*.55)+'px';}
  if(f.due&&pose?.target==='desk'&&pet){reminder.style.left=Math.min(innerWidth-300,Math.max(10,pet.x-60))+'px';reminder.style.top=Math.max(20,pet.y-70)+'px';}

 }
 function targets(s){
  if(!s.roomInside||!s.showPet||!s.interactive||s.paused)return [];
  const entries=[['lamp',document.querySelector('#object-lamp')],['souvenirs',shelf]];
  if(!hunger.hidden)entries.unshift(['feed',hunger]);
  if(bowlVisible&&eating===null)entries.unshift(['food',bowl]);
  if(current.due)for(const button of reminder.querySelectorAll('button'))entries.push([button.dataset.feature,button]);
  return entries.map(([kind,el])=>{const {x,y,width,height}=el.getBoundingClientRect();return{kind,x,y,width,height};});
 }
 window.ROOM_FEATURES={food,bowl,stepMeal,get mealAge(){return eating;},foodPoint:()=>foodPosition,destination,render,targets,inspect(){inspection=!inspection;}};
})();
