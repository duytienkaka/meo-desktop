'use strict';
const button=document.querySelector('#music'),art=document.querySelector('#art');
let artwork='';
window.taskbarMusic.onTrack(track=>{
 document.body.classList.toggle('playing',track.playing);
 button.title=[track.title,track.artist].filter(Boolean).join(' — ')+' · Bấm để mở card nhạc';
 button.setAttribute('aria-label',button.title);
 if(artwork!==track.artwork){artwork=track.artwork||'';art.hidden=!artwork;if(artwork)art.src=artwork;else art.removeAttribute('src');}
});
art.hidden=true;
button.addEventListener('click',()=>window.taskbarMusic.open());

window.taskbarMusic.onMotion(shown=>{
 document.body.classList.toggle('shown',shown);
 document.body.classList.toggle('hidden',!shown);
});
window.taskbarMusic.ready();
