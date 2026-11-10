let ballStart=null,targets=[],stroking=false,lastStroke=0;
window.roomInput.onTargets(value=>{targets=value;});
const hitAt=e=>targets.find(t=>e.clientX>=t.x&&e.clientX<=t.x+t.width&&e.clientY>=t.y&&e.clientY<=t.y+t.height);
addEventListener('pointerdown',e=>{if(e.button!==0)return;const hit=hitAt(e);if(hit){e.preventDefault();
 if(hit.kind==='ball'){ballStart={x:e.clientX,y:e.clientY};document.body.setPointerCapture(e.pointerId);window.roomInput.action('ball-start');return;}
 stroking=hit.kind==='pet'&&targets.indexOf(hit)<2;lastStroke=performance.now();window.roomInput.action(hit.kind);}});
addEventListener('pointermove',e=>{const hit=hitAt(e);document.body.title=hit?.kind==='pet'?'Bấm hoặc giữ chuột và vuốt ve mèo':hit?({bed:'Gọi mèo về ổ ngủ',ball:'Bấm để thả, hoặc kéo tới sàn phòng',tease:'Chọc mèo',pet:'Vuốt ve','room-toggle':'Vào / ra phòng'}[hit.kind]):'';if(stroking&&e.buttons===1&&hit?.kind==='pet'&&performance.now()-lastStroke>350){lastStroke=performance.now();window.roomInput.action('pet');}});
addEventListener('pointerup',e=>{
 if(ballStart){
  const dragged=Math.hypot(e.clientX-ballStart.x,e.clientY-ballStart.y)>7;
  window.roomInput.action(dragged?{kind:'ball',x:e.clientX,y:e.clientY}:'ball');
  ballStart=null;
 }
 stroking=false;
});
function cancelDrag(){if(ballStart)window.roomInput.action('ball-cancel');ballStart=null;stroking=false;}
addEventListener('pointercancel',cancelDrag);addEventListener('lostpointercapture',cancelDrag);

