let targets=[],stroking=false,lastStroke=0;
window.roomInput.onTargets(value=>{targets=value;});
const hitAt=e=>targets.find(t=>e.clientX>=t.x&&e.clientX<=t.x+t.width&&e.clientY>=t.y&&e.clientY<=t.y+t.height);
addEventListener('pointerdown',e=>{if(e.button!==0)return;const hit=hitAt(e);if(hit){e.preventDefault();stroking=hit.kind==='pet'&&targets.indexOf(hit)<2;lastStroke=performance.now();window.roomInput.action(hit.kind);}});
addEventListener('pointermove',e=>{const hit=hitAt(e);document.body.title=hit?.kind==='pet'?'Bấm hoặc giữ chuột và vuốt ve mèo':hit?({bed:'Gọi mèo về ổ ngủ',ball:'Thả bóng',tease:'Chọc mèo',pet:'Vuốt ve','room-toggle':'Vào / ra phòng'}[hit.kind]):'';if(stroking&&e.buttons===1&&hit?.kind==='pet'&&performance.now()-lastStroke>350){lastStroke=performance.now();window.roomInput.action('pet');}});
addEventListener('pointerup',()=>{stroking=false;});addEventListener('pointercancel',()=>{stroking=false;});
