(()=>{
'use strict';
const api=window.player,$=s=>document.querySelector(s),seek=$('#seek'),title=$('#title'),titleText=$('#title-text');
let state=null,busy=false,feedbackTimer,receivedAt=0,art='',motionRevision=0,scrub=null,pendingSeek=null,gestureTrack=null,titleAnimation=null;
const trackKey=value=>JSON.stringify([value?.sourceAppId,value?.title,value?.artist]);
const format=seconds=>{const s=Math.floor(Math.max(0,seconds));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
const canSeek=()=>!!state?.hasSession&&state.canSeek&&state.duration>0;
function timeline(){
  if(!state)return;
  const now=performance.now(),duration=state.duration||0;
  if(pendingSeek&&(pendingSeek.track!==trackKey(state)||now>pendingSeek.expires))pendingSeek=null;
  const live=(state.position||0)+(state.playing?(now-receivedAt)/1000:0);
  const preview=scrub?.position??(pendingSeek?pendingSeek.position+(state.playing?(now-pendingSeek.at)/1000:0):live);
  const position=Math.min(duration||0,Math.max(0,preview)),percent=duration?position/duration:0;
  $('#elapsed').textContent=duration?format(position):'0:00';
  $('#remaining').textContent=duration?'-'+format(duration-position):'--:--';
  $('#progress-fill').style.transform='scaleX('+percent+')';$('#progress').style.setProperty('--progress',percent*100+'%');
  seek.max=String(duration||1);if(!scrub)seek.value=String(position);
  seek.setAttribute('aria-valuetext',duration?format(position)+' / '+format(duration):'Trình phát chưa cung cấp thời lượng');
}
function scrollTitle(){
  titleAnimation?.cancel();titleAnimation=null;title.classList.remove('scrolling');
  const distance=titleText.scrollWidth-title.clientWidth;title.tabIndex=distance>1?0:-1;
  if(distance<=1||(!title.matches(':hover')&&document.activeElement!==title)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  title.classList.add('scrolling');
  titleAnimation=titleText.animate([{transform:'translateX(0)',offset:0},{transform:'translateX(0)',offset:.1},{transform:'translateX(-'+distance+'px)',offset:.8},{transform:'translateX(-'+distance+'px)',offset:.95},{transform:'translateX(0)',offset:1}],{duration:Math.max(6000,distance/30*1000+1800),iterations:Infinity,easing:'linear'});
}
function render(value){
  if(value!==state){
    receivedAt=performance.now();
    if(scrub&&(scrub.track!==trackKey(value)||!value.canSeek||!value.duration))scrub=null;
    if(pendingSeek&&(pendingSeek.track!==trackKey(value)||Math.abs(value.position-pendingSeek.position)<2))pendingSeek=null;
  }
  state=value;
  document.body.classList.toggle('playing',value.playing);
  $('#status').textContent=value.playing?'ĐANG PHÁT':value.hasSession?'TẠM DỪNG':'NHẠC CÙNG MÈO';
  const label=value.hasSession?(value.title||'Bản nhạc đang mở'):value.available?'Chọn một giai điệu cho hôm nay.':'Đang kết nối với trình phát…';
  if(titleText.textContent!==label){titleText.textContent=label;requestAnimationFrame(scrollTitle);}
  title.title=value.title||'';
  $('#artist').textContent=value.hasSession?(value.artist||(value.playing?'Đang phát':'Đang tạm dừng')):'Mở nhạc trong ứng dụng bạn thường dùng.';
  $('#source').textContent=value.sourceName||'';
  for(const id of ['#open-source','#open-cover']){$(id).disabled=busy||!value.hasSession;$(id).title=value.hasSession?'Mở '+(value.sourceName||'ứng dụng phát nhạc'):'Mở ứng dụng phát nhạc';}
  $('#previous').disabled=busy||!value.hasSession||!value.canPrevious;$('#next').disabled=busy||!value.hasSession||!value.canNext;
  $('#toggle').disabled=busy||!value.hasSession||!(value.playing?value.canPause:value.canPlay);
  $('#toggle').setAttribute('aria-label',value.playing?'Tạm dừng nhạc':'Phát nhạc');
  $('#play-icon').toggleAttribute('hidden',!!value.playing);$('#pause-icon').toggleAttribute('hidden',!value.playing);
  seek.disabled=busy||!canSeek();seek.title=canSeek()?'Kéo để tua nhạc':'Trình phát chưa hỗ trợ tua nhạc';$('#progress').classList.toggle('seekable',canSeek());
  if(!scrub)$('#progress').classList.remove('scrubbing');
  if(art!==(value.artwork||'')){art=value.artwork||'';const img=$('#artwork');img.classList.remove('loaded');img.hidden=!art;if(art)img.src=art;else img.removeAttribute('src');}
  timeline();
}
$('#artwork').addEventListener('load',()=>$('#artwork').classList.add('loaded'));
$('#artwork').addEventListener('error',()=>{$('#artwork').hidden=true;});
async function command(action,position,expectedTrack){
  if(busy||!state?.hasSession)return false;
  const source=state.sourceAppId;busy=true;clearTimeout(feedbackTimer);$('#feedback').className='';$('#feedback').textContent='Đang gửi…';render(state);
  try{await api.command(action,source,position,expectedTrack);$('#feedback').textContent='';return true;}
  catch(error){$('#feedback').textContent=error.message?.replace(/^Error invoking remote method '[^']+': Error: /,'')||'Chưa điều khiển được trình phát.';$('#feedback').className='error';return false;}
  finally{busy=false;render(state);feedbackTimer=setTimeout(()=>{if(!busy){$('#feedback').className='';$('#feedback').textContent='';}},5000);}
}
seek.addEventListener('pointerdown',event=>{gestureTrack=trackKey(state);seek.setPointerCapture(event.pointerId);api.scrubbing(true);});
seek.addEventListener('keydown',()=>{gestureTrack=null;});
addEventListener('pointerup',()=>api.scrubbing(false));
addEventListener('pointercancel',()=>api.scrubbing(false));
seek.addEventListener('input',()=>{
  if(busy||!canSeek()||(gestureTrack&&gestureTrack!==trackKey(state)))return;
  scrub={track:trackKey(state),position:Number(seek.value)};$('#progress').classList.add('scrubbing');timeline();
});
seek.addEventListener('change',async()=>{
  const request=scrub;gestureTrack=null;
  if(!request||request.track!==trackKey(state)||!canSeek()){scrub=null;timeline();return;}
  const success=await command('seek',request.position,request.track);
  scrub=null;$('#progress').classList.remove('scrubbing');
  if(success&&request.track===trackKey(state)){const now=performance.now();pendingSeek={...request,at:now,expires:now+1800};}
  timeline();
});
seek.addEventListener('pointercancel',()=>{scrub=null;gestureTrack='cancelled';$('#progress').classList.remove('scrubbing');timeline();});
for(const event of ['mouseenter','mouseleave','focus','blur'])title.addEventListener(event,scrollTitle);
new ResizeObserver(scrollTitle).observe(title);
document.fonts.ready.then(scrollTitle);
document.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('click',()=>command(button.dataset.command)));
$('#toggle').addEventListener('click',()=>command(state.playing?'pause':'play'));
$('#close').addEventListener('click',()=>api.close());
document.addEventListener('keydown',event=>{if(event.key==='Escape')api.close();});
let motionAnimation=null;
api.onMotion(({open,reset,presentation})=>{
  const card=$('#card'),revision=++motionRevision;
  if(!open){scrub=null;gestureTrack=null;pendingSeek=null;}
  if(presentation){const p=presentation.card;card.style.left=p.x+'px';card.style.top=p.y+'px';card.style.width=p.width+'px';card.style.height=p.height+'px';card.style.transformOrigin=presentation.origin.x+'px '+presentation.origin.y+'px';}
  const style=getComputedStyle(card),from=reset?{transform:'scale(.055)',opacity:'0',filter:'blur(2px)'}:{transform:style.transform,opacity:style.opacity,filter:style.filter};motionAnimation?.cancel();
  const to={transform:open?'scale(1)':'scale(.055)',opacity:open?'1':'0',filter:open?'blur(0px)':'blur(2px)'};
  card.classList.toggle('is-open',open);Object.assign(card.style,to);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){motionAnimation=card.animate([from,to],{duration:open?380:260,easing:open?'cubic-bezier(.16,1,.3,1)':'cubic-bezier(.4,0,.7,.2)',fill:'both'});motionAnimation.finished.then(()=>{if(revision===motionRevision){motionAnimation.cancel();motionAnimation=null;}}).catch(()=>{});}
});
const clock=()=>{$('#clock').textContent=new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});};clock();setInterval(clock,10000);setInterval(()=>{if(!document.hidden)timeline();},250);
api.onChange(render);api.get().then(render).catch(()=>{$('#feedback').textContent='Chưa kết nối được. Hãy mở lại bảng nhạc.';});
})();
