(() => {
  'use strict';
  const api=window.settings,labels={play:'Tinh nghịch',music:'Nghe nhạc',game:'Chơi game',focus:'Tập trung',sleep:'Buồn ngủ'};
  let snapshot=null,queue=Promise.resolve(),libraryKey='',displayKey='',pinsKey='';
  const error=document.querySelector('#error'),saved=document.querySelector('#saved');
  function showError(e){error.textContent=e?.message?.replace(/^Error invoking remote method '[^']+': Error: /,'')||'Chưa áp dụng được thay đổi. Hãy thử lại.';error.hidden=false;saved.textContent='Chưa lưu';if(snapshot)render(snapshot);}
  function request(work){saved.textContent='Đang lưu…';error.hidden=true;queue=queue.then(async()=>{const value=await work();render(value);saved.textContent='✓ Đã lưu';}).catch(showError);return queue;}
  function update(patch){return request(()=>api.update(patch));}
  function changeTab(name){
    const titles={friend:'Ở bên bạn, theo cách bạn thích.',auto:'Bạn làm gì, mèo làm nấy.',apps:'Mọi thứ quen thuộc, trong tầm tay.',updates:'Những điều mới, đến với mèo của bạn.'};
    const descriptions={friend:'Một góc nhỏ để chỉnh dáng vẻ và thói quen của mèo.',auto:'Những phản ứng nhỏ khiến mỗi ngày thú vị hơn.',apps:'Ghim ứng dụng để mở nhanh, quản lý game để mèo cùng chơi.',updates:'Kiểm tra, xem thay đổi và chọn lúc cập nhật ứng dụng.'};
    document.querySelector('#page-description').textContent=descriptions[name];
    document.querySelectorAll('.nav').forEach(button=>{const active=button.dataset.tab===name;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    document.querySelectorAll('.page').forEach(page=>page.classList.toggle('active',page.id==='page-'+name));document.querySelector('#page-title').textContent=titles[name];document.querySelector('main').scrollTo({top:0});
  }
  document.querySelectorAll('.nav').forEach(button=>button.addEventListener('click',()=>changeTab(button.dataset.tab)));
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();changeTab('friend');});
  document.querySelectorAll('[data-setting]').forEach(input=>input.addEventListener('change',()=>update({[input.dataset.setting]:input.checked})));
  document.querySelectorAll('[data-size]').forEach(button=>button.addEventListener('click',()=>update({size:Number(button.dataset.size)})));
  document.querySelectorAll('[data-mood]').forEach(button=>button.addEventListener('click',()=>update({mode:button.dataset.mood})));
  document.querySelector('#display').addEventListener('change',event=>update({displayId:event.target.value}));
  document.querySelector('#open-player').addEventListener('click',()=>request(()=>api.action('music')));
  document.querySelector('#home').addEventListener('click',()=>request(()=>api.action('home')));
  document.querySelector('#done').addEventListener('click',()=>request(()=>api.action('close')));
  for(const action of ['check','download','install','manual','release'])document.querySelector('#update-'+action).addEventListener('click',()=>request(()=>api.updates(action)));

  const make=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;};
  function renderLibrary(games){
    const list=document.querySelector('#game-library');list.replaceChildren();
    if(!games.length){const empty=make('div','library-empty');empty.append(make('span','empty-game-icon','▦'),make('strong','','Chưa có game trong thư viện'),make('p','','Mèo sẽ tìm ở các thư viện game phổ biến. Nếu game nằm ở vị trí khác, bạn có thể thêm bằng file .exe.'));list.append(empty);return;}
    for(const game of [...games].sort((a,b)=>a.name.localeCompare(b.name,'vi'))){
      const card=make('article','game-card'),avatar=make('span','game-avatar',game.name.charAt(0).toUpperCase()),info=make('div','game-info'),remove=make('button','remove-game','×');
      info.append(make('strong','',game.name),make('span','game-source',game.source));
      remove.setAttribute('aria-label','Gỡ khỏi thư viện: '+game.name);remove.title='Gỡ khỏi thư viện (không xóa game)';remove.dataset.game=game.id;
      remove.addEventListener('click',()=>request(()=>api.library('remove',game.id)));
      card.append(avatar,info,remove);list.append(card);
    }
  }
  document.querySelector('#scan-games').addEventListener('click',()=>request(()=>api.library('scan')));
  document.querySelector('#add-game').addEventListener('click',()=>request(()=>api.library('add')));
  document.querySelector('#add-pin').addEventListener('click',()=>request(()=>api.pins('add')));
  function renderPins(pins){
    const list=document.querySelector('#pinned-apps');list.replaceChildren();
    if(!pins.length){const empty=make('div','pins-empty');empty.append(make('strong','','Mèo chưa giữ ứng dụng nào'),make('p','','Chọn “Ghim ứng dụng” để thêm những app bạn mở mỗi ngày.'));list.append(empty);return;}
    for(const pin of pins){
      const card=make('div','pin-card'),open=make('button','pin-open'),remove=make('button','pin-remove','×');
      open.title=pin.location;open.setAttribute('aria-label','Mở ứng dụng: '+pin.name);
      const icon=make('span','pin-icon',pin.icon?'':pin.name.charAt(0).toUpperCase());
      if(pin.icon){const img=make('img');img.src=pin.icon;img.alt='';icon.append(img);}
      open.append(icon,make('span','pin-name',pin.name),make('span','pin-arrow','↗'));open.addEventListener('click',()=>request(()=>api.pins('open',pin.id)));
      remove.title='Bỏ ghim (không gỡ ứng dụng)';remove.setAttribute('aria-label','Bỏ ghim: '+pin.name);remove.addEventListener('click',()=>request(()=>api.pins('remove',pin.id)));
      card.append(open,remove);list.append(card);
    }
  }
  function render(value){
    const updates=value.updates||{status:'unavailable',supported:false,message:'Cập nhật chưa sẵn sàng.'},busy=['checking','downloading','installing'].includes(updates.status);
    document.querySelector('#update-versions').textContent='Đang dùng '+(updates.current||value.version)+(updates.latest?' · Bản mới '+updates.latest:'');
    document.querySelector('#update-status').textContent=updates.message;
    document.querySelector('#update-check').disabled=!updates.supported||busy||updates.status==='downloaded';
    document.querySelector('#update-download').hidden=updates.status!=='available'||!updates.canDownload;
    document.querySelector('#update-install').hidden=updates.status!=='downloaded';
    document.querySelector('#update-manual').hidden=!updates.latest||!['available','error'].includes(updates.status)||(updates.status==='available'&&updates.canDownload);
    document.querySelector('#update-manual').textContent=value.platform==='darwin'?'Tải bản Mac':'Tải bộ cài';
    document.querySelector('#update-progress').hidden=!['downloading','downloaded'].includes(updates.status);
    document.querySelector('#update-progress').value=updates.progress||0;
    document.querySelector('#update-notes-wrap').hidden=!updates.notes;
    document.querySelector('#update-notes').textContent=updates.notes||'';
    const startup=value.startup||{supported:false,enabled:false,message:'Tính năng mở cùng máy chưa sẵn sàng.'};
    document.querySelector('#startAtLogin').checked=startup.enabled;
    document.querySelector('#startAtLogin').disabled=!startup.supported;
    document.querySelector('#startup-status').textContent=startup.message;
    const mac=value.platform==='darwin';
    document.querySelector('kbd').textContent=value.shortcut||'Ctrl + Alt + M';
    document.querySelector('#platform-note').textContent=mac?'macOS: nhạc hỗ trợ Apple Music và Spotify. Cho phép Automation khi được hỏi; nhạc trong trình duyệt chưa hỗ trợ.':'Nhận diện nhạc và game tự động hiện hỗ trợ Windows và macOS.';
    document.querySelector('#platform-note').hidden=!mac&&value.autoSupported;
    document.querySelector('.library-help').textContent=mac?'Thiếu game? Chọn “Thêm game” và chọn ứng dụng .app. Mèo tự quét game từ thư viện Steam.':'Thiếu game? Chọn “Thêm game” và tìm file .exe dùng để mở game. Mèo chỉ nhận diện game, không khởi chạy hay can thiệp vào trò chơi.';
    document.querySelector('.pinned-section>.hint').textContent=mac?'Thả file hoặc thư mục vào mèo để mở, tìm vị trí hoặc sao chép đường dẫn. Có thể ghim ứng dụng bằng cách thả gói .app vào mèo.':'Thả file hoặc thư mục vào mèo để mở, tìm vị trí hoặc sao chép đường dẫn. Có thể ghim ứng dụng bằng cách thả file .exe / lối tắt .lnk vào mèo.';
    const pk=JSON.stringify(value.pinnedApps||[]);if(pk!==pinsKey){pinsKey=pk;renderPins(value.pinnedApps||[]);}
    document.querySelector('#pin-count').textContent=(value.pinnedApps||[]).length;document.querySelector('#add-pin').disabled=!value.pinSupported||(value.pinnedApps||[]).length>=20;
    snapshot=value;document.querySelector('#version').textContent='Mèo Desktop · '+value.version;document.querySelector('#current-mood').textContent=labels[value.mode]||'Mèo đang ở đây';
    document.querySelector('#preview-note').textContent=!value.visible?'Mèo đang ẩn. Bật hiển thị để gặp lại nhé.':value.paused?'Đang đứng yên một lát, vẫn ở bên bạn.':({play:'Một chút tinh nghịch, một chút đáng yêu.',music:'Giai điệu của bạn, niềm vui của mèo.',game:'Đồng đội nhỏ đã sẵn sàng!',focus:'Bạn cứ tập trung, mèo ngồi ngoan đây.',sleep:'Cuộn tròn và mơ một giấc mơ nhỏ.'}[value.mode]);
    for(const key of ['visible','paused','roam','follow','autoMedia','autoGame'])document.querySelector('#'+key).checked=value[key];
    for(const key of ['autoMedia','autoGame'])document.querySelector('#'+key).disabled=!value.autoSupported;
    document.querySelector('#open-player').disabled=!value.autoSupported||value.mode==='game';
    document.querySelectorAll('[data-size]').forEach(button=>{const active=Number(button.dataset.size)===value.size;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    document.querySelectorAll('[data-mood]').forEach(button=>{const active=button.dataset.mood===value.mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    const dk=JSON.stringify(value.displays);if(dk!==displayKey){displayKey=dk;const select=document.querySelector('#display');select.replaceChildren(...value.displays.map(item=>{const option=make('option','',item.name);option.value=item.id;return option;}));}document.querySelector('#display').value=value.displayId;
    document.querySelector('#media-status').textContent=!value.autoMedia?'Tự động nghe nhạc đang tắt':value.mediaStatus==='playing'?'Đang có media phát trên máy':value.mediaStatus==='paused'?'Đang chờ một giai điệu mới':value.mediaStatus==='connecting'?'Đang kết nối với trình phát':'Đang thử kết nối lại với trình phát';
    document.querySelector('#game-status').textContent=!value.autoGame?'Nhận diện game đang tắt':value.gameActive?'Đang chơi: '+value.gameName:value.gameStatus==='ready'?'Mèo đang chờ bạn mở game':value.gameStatus==='connecting'?'Đang kết nối':'Đang thử kết nối lại';
    for(const [id,enabled,status,active] of [['media-status',value.autoMedia,value.mediaStatus,value.mediaStatus==='playing'],['game-status',value.autoGame,value.gameStatus,value.gameActive]]){
      const line=document.querySelector('#'+id).parentElement;
      line.dataset.state=!value.autoSupported?'unsupported':!enabled?'off':active?'active':status==='unavailable'?'unavailable':status==='connecting'?'connecting':'ready';
      line.setAttribute('role','status');
    }
    document.querySelector('.companion-card').classList.toggle('pet-hidden',!value.visible);
    document.querySelector('#preview-size').textContent={80:'Nhỏ',112:'Vừa',148:'Lớn'}[value.size]+' · xem trước';
    const games=value.library||[],scanning=value.scanStatus==='scanning';
    document.querySelector('#game-count').textContent=games.length;
    const scanButton=document.querySelector('#scan-games');scanButton.disabled=scanning||!value.autoSupported;scanButton.textContent=scanning?'Đang quét…':'↻ Quét lại';
    document.querySelector('#add-game').disabled=!value.autoSupported;
    document.querySelector('.scan-summary').dataset.state=value.scanStatus;
    document.querySelector('#scan-title').textContent=({idle:'Sẵn sàng tìm game',scanning:'Mèo đang tìm game…',ready:'Thư viện đã cập nhật',error:'Chưa thể hoàn tất quét',unsupported:'Chưa hỗ trợ trên hệ điều hành này'}[value.scanStatus]||'Thư viện game');
    document.querySelector('#scan-message').textContent=value.scanMessage||(mac?'Tự tìm ứng dụng game macOS trong các thư viện Steam.':'Tự tìm trong Steam, Epic và thông tin cài đặt trên Windows.');
    document.querySelector('#scan-time').textContent=value.lastScan?'Quét gần nhất: '+new Date(value.lastScan).toLocaleString('vi-VN'):'';
    document.querySelector('#library-auto-note').hidden=value.autoGame;
    const lk=JSON.stringify(games);if(lk!==libraryKey){const focused=document.activeElement,focusId=focused?.dataset?.game;libraryKey=lk;renderLibrary(games);if(focusId&&!document.contains(focused))document.querySelector('#add-game').focus({preventScroll:true});}

  }
  api.onNavigate(tab=>{if(['apps','updates'].includes(tab))changeTab(tab);});
  api.onChange(render);api.get().then(render).catch(showError);

  const canvas=document.querySelector('#preview'),ctx=canvas.getContext('2d'),images={},reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');let ready=false,raf=0,last=0,time=0,previewSize=112,petAt=-Infinity;
  canvas.setAttribute('role','button');canvas.setAttribute('tabindex','0');canvas.setAttribute('aria-label','Vuốt ve mèo xem trước');
  function petPreview(){if(!ready)return;petAt=performance.now();document.querySelector('#preview-reaction').textContent='Mèo thích lắm!';}
  canvas.addEventListener('click',petPreview);
  canvas.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();petPreview();}});
  function preview(timestamp){
    raf=0;if(document.hidden)return;
    if(timestamp-last<1000/30){raf=requestAnimationFrame(preview);return;}const dt=last?Math.min(.06,(timestamp-last)/1000):0;last=timestamp;if(!snapshot?.paused&&!reducedMotion.matches)time+=dt;
    previewSize+=(Number(snapshot?.size||112)-previewSize)*(reducedMotion.matches?1:Math.min(1,dt*12));
    if(ready){
      const mode=snapshot?.mode||'play',p=time%4.8;let sheet='core',index=p>4.42&&p<4.56?2:0,rotation=0;
      if(mode==='music'){sheet='moods';index=Math.floor(time*3.3)%4;rotation=Math.sin(time*5.2)*.035;}else if(mode==='game'){sheet='moods';index=4+(index===2?2:0);}else if(mode==='sleep'){sheet='moods';index=time%12>10.6?10:9;}
      const source=window.CAT_SPRITES[sheet].frames[index],scale=220/292*(sheet==='moods'?.93:1)*(previewSize/148),w=source.w*scale,h=source.h*scale;
      const affection=(timestamp-petAt)/1300,petting=affection>=0&&affection<1;
      canvas.dataset.petting=String(petting);canvas.dataset.previewSize=String(Math.round(previewSize));
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(180,319);ctx.rotate(rotation);ctx.scale(1,1+Math.sin(time*1.9)*.007);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(images[sheet],source.x,source.y,source.w,source.h,-w/2,-h,w,h);ctx.restore();
      if(petting){ctx.save();ctx.fillStyle='#bb826d';ctx.font='24px "Segoe UI",sans-serif';ctx.textAlign='center';ctx.globalAlpha=reducedMotion.matches?1:Math.sin(Math.PI*affection);for(let i=0;i<3;i++)ctx.fillText('♥',180+(i-1)*43,Math.max(32,290-h)-(reducedMotion.matches?0:affection*35)+Math.abs(i-1)*15);ctx.restore();}
      else if(document.querySelector('#preview-reaction').textContent)document.querySelector('#preview-reaction').textContent='';
    }
    raf=requestAnimationFrame(preview);
  }
  function drawMoodCards(){
    document.querySelectorAll('[data-mood]').forEach(button=>{
      const mode=button.dataset.mood,c=button.querySelector('canvas'),context=c.getContext('2d');
      const sheet=['music','game','sleep'].includes(mode)?'moods':'core',index={play:8,music:0,game:4,focus:0,sleep:9}[mode];
      const frame=window.CAT_SPRITES[sheet].frames[index],scale=Math.min(135/frame.w,120/frame.h),w=frame.w*scale,h=frame.h*scale;
      context.clearRect(0,0,c.width,c.height);context.imageSmoothingQuality='high';context.drawImage(images[sheet],frame.x,frame.y,frame.w,frame.h,(c.width-w)/2,140-h,w,h);
    });
  }
  Promise.all(['core','moods'].map(name=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images[name]=image;resolve();};image.onerror=reject;image.src='../assets/'+name+'.png';}))).then(()=>{ready=true;drawMoodCards();if(!document.hidden&&!raf)raf=requestAnimationFrame(preview);}).catch(()=>{});
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);raf=0;last=0;if(!document.hidden)raf=requestAnimationFrame(preview);});
})();
