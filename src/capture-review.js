(() => {
 'use strict';
 const get=id=>document.getElementById(id);
 const text=get('review-text'),image=get('review-image'),photos=get('review-photos'),snippets=get('review-snippets');
 function findSnippets(value){
  const links=[...value.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi)]
   .map(match=>match[0].replace(/[.,;!?\])}]+$/u,''));
  const lines=value.split(/\r?\n/).map(line=>line.trim()).filter(line=>
   /^(?:[$>]\s+|(?:git|npm|pnpm|yarn|pip\d*|python\d*|node|curl|docker|kubectl|ssh|winget|brew|sudo|Get-[\w-]+|Set-[\w-]+)\s+)|\b(?:0x[\da-f]{3,}|ERR_[A-Z0-9_]+|(?:HTTP|error|lỗi)\s*[:#-]?\s*\d{3,})\b/i.test(line));
  return [...new Map([...links.map(link=>[link,'Link']),...lines.map(line=>[line,'Dòng'])]).entries()].slice(0,10);
 }
 window.createCaptureReview=({api,act,tab,error})=>{
  let state,kind,id,revision=0,loaded=false,ocrStatus,photoKey='';
  const drafts=new Map();
  const copy=get('review-copy'),paste=get('review-paste'),pair=get('review-pair'),save=get('review-save');
  const selectedText=()=>text.selectionStart!==text.selectionEnd?text.value.slice(text.selectionStart,text.selectionEnd):text.value;
  function refreshButtons(){
   const hasText=loaded&&Boolean(text.value.trim()),capture=kind==='capture';
   copy.disabled=!hasText;
   paste.hidden=pair.hidden=save.hidden=get('review-attachment').hidden=!capture;
   paste.disabled=pair.disabled=!hasText||!state?.photoTarget||state?.photosBusy;
   save.disabled=!hasText;
   const destination=state?.photoTarget?.name;
   paste.title=pair.title=destination?'Dán vào '+destination:'Bấm vào ô cần dán trước.';
  }
  function renderSnippets(){
   snippets.replaceChildren();
   for(const [value,label] of findSnippets(text.value)){
    const line=document.createElement('button');line.type='button';line.textContent='Sao chép '+label.toLowerCase()+' · '+value;
    line.title=value;line.onclick=()=>act({action:'copy-capture-text',text:value},'Đã sao chép.');
    snippets.append(line);
   }
   snippets.hidden=!snippets.childElementCount;
  }
  function renderPhotos(){
   const values=kind==='capture'?state?.photos||[]:[];
   const key=JSON.stringify([id,values.map(photo=>photo.id)]);
   if(key===photoKey)return;
   photoKey=key;
   photos.replaceChildren(...values.map((photo,index)=>{
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','Chọn ảnh '+(index+1));button.setAttribute('aria-pressed',String(id===photo.id));
    const thumb=new Image();thumb.src=photo.thumb;thumb.alt='';button.append(thumb);
    button.onclick=()=>open('capture',photo.id);return button;
   }));
   photos.hidden=values.length<2;
  }
  async function read(){
   const token=++revision;
   try{
    const value=await api.review({kind,id});
    if(token!==revision)return;
    if(value.image){image.src=value.image;image.hidden=false;}
    if(!drafts.has(id))text.value=value.text;
    loaded=true;
    get('review-status').textContent=kind!=='capture'?'':ocrStatus==='pending'?'Đang nhận diện chữ…':ocrStatus==='unavailable'?'Chưa đọc được chữ. Bạn có thể nhập thủ công.':ocrStatus==='empty'?'Chưa tìm thấy chữ trong ảnh.':'';
    renderSnippets();refreshButtons();
   }catch(e){if(token===revision)error(e);}
  }
  function open(nextKind,nextId){
   kind=nextKind;id=nextId;loaded=false;
   tab('capture-review');
   get('review-status').textContent='Đang mở…';
   text.value=drafts.get(id)||'';text.readOnly=kind==='note';image.hidden=true;
   get('capture-review-title').textContent=kind==='capture'?'Ảnh và chữ':'Chữ đã cất';
   get('review-attach').checked=false;
   renderSnippets();renderPhotos();refreshButtons();
   ocrStatus=state?.photos.find(photo=>photo.id===id)?.ocr;
   read();
  }
  function close(){revision++;kind=null;id=null;drafts.clear();image.removeAttribute('src');text.value='';}
  get('review-back').onclick=()=>tab('shelf');
  text.oninput=()=>{drafts.set(id,text.value);renderSnippets();refreshButtons();};
  copy.onclick=()=>act({action:'copy-capture-text',text:selectedText()},'Đã sao chép chữ.');
  paste.onclick=()=>act({action:'paste-capture-text',text:selectedText()},'Đã dán chữ vào ô đã chọn.');
  pair.onclick=()=>act({action:'paste-capture-pair',id,text:selectedText()},'Đã dán ảnh và chữ vào ô đã chọn.');
  save.onclick=()=>act({action:'save-capture-text',id,text:selectedText(),withImage:get('review-attach').checked},'Đã cất chữ vào túi.');
  return {open,close,update(value){
   state=value;
   if(kind!=='capture')return;
   const photo=value.photos.find(photo=>photo.id===id);
   if(!photo){const next=value.photos.at(-1);if(next)open('capture',next.id);else tab('shelf');return;}
   renderPhotos();refreshButtons();
   if(photo.ocr!==ocrStatus){ocrStatus=photo.ocr;read();}
  }};
 };
})();
