let foodDrag=false;
let ballStart=null,targets=[],stroking=false,lastStroke=0;
window.roomInput.onTargets(value=>{targets=value;});
const hitAt=e=>{
 const contains=t=>e.clientX>=t.x&&e.clientX<=t.x+t.width&&e.clientY>=t.y&&e.clientY<=t.y+t.height;
 // The bowl is drawn in front of the cat and must receive the drag first.
 return targets.find(t=>['food','feed'].includes(t.kind)&&contains(t))||targets.find(contains);
};
addEventListener('pointerdown',e=>{if(e.button!==0)return;const hit=hitAt(e);if(hit){e.preventDefault();
 if(hit.kind==='food'){foodDrag=true;document.body.setPointerCapture(e.pointerId);window.roomInput.action('food-start');return;}
 if(hit.kind==='ball'){ballStart={x:e.clientX,y:e.clientY};document.body.setPointerCapture(e.pointerId);window.roomInput.action('ball-start');return;}
 stroking=hit.kind==='pet'&&targets.indexOf(hit)<2;lastStroke=performance.now();window.roomInput.action(hit.kind);}});
addEventListener('pointermove',e=>{if(foodDrag)window.roomInput.action({kind:'food-end',x:e.clientX,y:e.clientY,dragging:true});const hit=hitAt(e);document.body.style.cursor=foodDrag?'grabbing':hit?.kind==='food'?'grab':hit?'pointer':'';document.body.title=hit?.kind==='pet'?'Bấm hoặc giữ chuột và vuốt ve mèo':hit?({food:'Kéo bát để mèo đuổi theo',feed:'Cho mèo ăn','music-table':'Mở ứng dụng đang phát nhạc',bed:'Gọi mèo về ổ ngủ',ball:'Bấm để thả, hoặc kéo tới sàn phòng',tease:'Chọc mèo',pet:'Vuốt ve','room-toggle':'Vào / ra phòng'}[hit.kind]):'';if(stroking&&e.buttons===1&&hit?.kind==='pet'&&performance.now()-lastStroke>350){lastStroke=performance.now();window.roomInput.action('pet');}});
addEventListener('pointerup',e=>{
 if(foodDrag){foodDrag=false;window.roomInput.action({kind:'food-end',x:e.clientX,y:e.clientY});}
 if(ballStart){
  const dragged=Math.hypot(e.clientX-ballStart.x,e.clientY-ballStart.y)>7;
  window.roomInput.action(dragged?{kind:'ball',x:e.clientX,y:e.clientY}:'ball');
  ballStart=null;
 }
 stroking=false;
});
function cancelDrag(){if(foodDrag)window.roomInput.action('food-end');foodDrag=false;if(ballStart)window.roomInput.action('ball-cancel');ballStart=null;stroking=false;}
addEventListener('pointercancel',cancelDrag);addEventListener('lostpointercapture',cancelDrag);

