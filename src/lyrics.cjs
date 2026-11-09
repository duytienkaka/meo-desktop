'use strict';
function parseLyrics(record){
 if(record?.instrumental)return{status:'instrumental',lines:[],synced:false};
 const raw=typeof record?.syncedLyrics==='string'?record.syncedLyrics.slice(0,160000):'',lines=[];
 for(const line of raw.split(/\r?\n/)){const tags=[...line.matchAll(/\[(\d{1,3}):(\d{2}(?:\.\d+)?)\]/g)],text=line.replace(/\[[^\]]*\]/g,'').trim().slice(0,400);for(const tag of tags){const time=Number(tag[1])*60+Number(tag[2]);if(Number.isFinite(time)&&Number(tag[2])<60&&text)lines.push({time,text});if(lines.length>=1500)break;}if(lines.length>=1500)break;}
 if(lines.length)return{status:'ready',synced:true,lines:lines.sort((a,b)=>a.time-b.time)};
 const plain=typeof record?.plainLyrics==='string'?record.plainLyrics.slice(0,160000).split(/\r?\n/).map(text=>({time:null,text:text.slice(0,400)})).filter(l=>l.text.trim()).slice(0,1500):[];
 return {status:plain.length?'ready':'missing',synced:false,lines:plain};
}
function createLyrics({fetcher=global.fetch,version='1.0.1',now=Date.now}={}){
 const cache=new Map(),pending=new Map();let blockedUntil=0,chain=Promise.resolve();
 function get(track){const key=JSON.stringify([track.sourceAppId,track.title,track.artist]),cacheKey=JSON.stringify([track.title,track.artist,Math.round(track.duration||0)]);
  if(!track.hasSession||!track.title||!track.artist)return Promise.resolve({trackKey:key,status:'missing',lines:[],message:'Trình phát chưa cung cấp đủ tên bài và nghệ sĩ.'});
  const old=cache.get(cacheKey);if(old&&old.expires>now())return Promise.resolve({...old.value,trackKey:key});if(pending.has(cacheKey))return pending.get(cacheKey).then(r=>({...r,trackKey:key}));
  const task=chain.then(async()=>{if(now()<blockedUntil)return{status:'error',lines:[],message:'Dịch vụ đang giới hạn yêu cầu. Hãy thử lại sau.'};const url=new URL('https://lrclib.net/api/get');url.searchParams.set('track_name',track.title);url.searchParams.set('artist_name',track.artist);if(track.duration>=1&&track.duration<=3600)url.searchParams.set('duration',Math.round(track.duration));
   try{const r=await fetcher(url.toString(),{headers:{'User-Agent':'MeoDesktop/'+version+' (https://github.com/duytienkaka/meo-desktop)'},signal:AbortSignal.timeout(12000)});if(r.status===429||r.status===503){const retry=r.headers.get('retry-after'),seconds=Number(retry),delay=Number.isFinite(seconds)&&seconds>0?seconds*1000:Math.max(60000,Date.parse(retry)-now()||0);blockedUntil=now()+delay*1.1;throw new Error('RateLimited');}if(r.status===404)return{status:'missing',lines:[],message:'Chưa tìm thấy lời bài hát này trên LRCLIB.'};if(!r.ok)throw new Error('Network');const text=await r.text();if(text.length>400000)throw new Error('TooLarge');const result=parseLyrics(JSON.parse(text));return {...result,source:'LRCLIB',message:result.status==='instrumental'?'Bản nhạc không lời.':result.synced?'Lời đồng bộ · LRCLIB':'Lời bài hát · LRCLIB'};}catch{return{status:'error',lines:[],message:'Chưa tải được lời bài hát. Hãy thử lại sau.'};}
  }).then(value=>{cache.set(cacheKey,{value,expires:now()+(value.status==='error'?30000:900000)});if(cache.size>50)cache.delete(cache.keys().next().value);return value;}).finally(()=>pending.delete(cacheKey));chain=task.catch(()=>{});pending.set(cacheKey,task);return task.then(r=>({...r,trackKey:key}));
 }
 return {get};
}
module.exports={parseLyrics,createLyrics};
