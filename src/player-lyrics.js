(()=>{
 'use strict';const $=s=>document.querySelector(s),keys=s=>JSON.stringify([s?.sourceAppId,s?.title,s?.artist]);let track=null,key='',active=false,revision=0,result=null,loading=false,highlight=-1,userUntil=0;
 const list=$('#lyrics-lines'),status=$('#lyrics-status');
 function clear(){revision++;result=null;loading=false;highlight=-1;list.replaceChildren();status.textContent='Mở tab để tìm lời từ LRCLIB. Tên bài và nghệ sĩ sẽ được gửi để tra cứu.';$('#lyrics-retry').hidden=true;}
 async function load(){if(!active||loading||result||!track?.hasSession)return;const request=++revision,expected=key;loading=true;status.textContent='Đang tìm lời trên LRCLIB…';$('#lyrics-retry').hidden=true;
  try{const value=await window.player.lyrics(expected);if(request!==revision||expected!==key)return;result=value;list.replaceChildren();for(const line of value.lines||[]){const p=document.createElement('p');p.textContent=line.text;list.append(p);}status.textContent=value.message||'Chưa có lời bài hát.';$('#lyrics-retry').hidden=value.status!=='error';if(!value.lines?.length){const p=document.createElement('p');p.className='lyric-empty';p.textContent=value.status==='instrumental'?'Một giai điệu không cần lời.':value.status==='error'?'Chưa kết nối được với dịch vụ lời bài hát.':'Chưa có lời cho bài hát này.';list.append(p);}}
  catch{if(request===revision){status.textContent='Chưa tải được lời bài hát.';$('#lyrics-retry').hidden=false;}}
  finally{if(request===revision)loading=false;}
 }
 function choose(lyrics){active=lyrics;$('#card').classList.toggle('lyrics-open',active);for(const [id,on]of [['tab-music',!active],['tab-lyrics',active]]){$('#'+id).setAttribute('aria-selected',String(on));$('#'+id).tabIndex=on?0:-1;}$('#music-pane').inert=active;$('#lyrics-pane').inert=!active;if(active)load();}
 $('#tab-music').onclick=()=>choose(false);$('#tab-lyrics').onclick=()=>choose(true);$('#lyrics-retry').onclick=()=>{result=null;load();};
 $('.player-tabs').onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();choose(e.key==='ArrowRight'||e.key==='End');$(active?'#tab-lyrics':'#tab-music').focus();}};
 let start=null;$('.player-viewport').addEventListener('pointerdown',e=>{if(e.pointerType==='touch')start=e.clientX;});$('.player-viewport').addEventListener('pointerup',e=>{if(start!==null&&Math.abs(e.clientX-start)>45)choose(e.clientX<start);start=null;});
 list.addEventListener('wheel',()=>{userUntil=performance.now()+5000;},{passive:true});
 function receive(value){track=value;const next=keys(value);if(next!==key){key=next;clear();if(active)load();}}
 addEventListener('player-track',e=>receive(e.detail));window.player.get().then(receive).catch(()=>{});
 addEventListener('player-position',e=>{if(!active||!result?.synced||!result.lines.length)return;let index=-1;for(let i=0;i<result.lines.length&&result.lines[i].time<=e.detail.position;i++)index=i;if(index===highlight)return;if(highlight>=0)list.children[highlight]?.classList.remove('current');highlight=index;if(index>=0){const p=list.children[index];p.classList.add('current');if(performance.now()>userUntil)list.scrollTo({top:p.offsetTop-list.offsetTop-list.clientHeight/2+p.clientHeight/2,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}});
})();
