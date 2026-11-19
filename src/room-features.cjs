'use strict';
const fs=require('node:fs'),path=require('node:path');
const {common,rare}=require('./keepsakes.js');
function createRoomFeatures(directory){
 const file=path.join(directory,'room-features.json');let saved={};try{saved=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 const data={lamp:'auto',city:null,breakMinutes:0,interactions:0,unlocked:[],seenGifts:null,decoration:null,...saved};
 const care=require('./care.cjs').createCare(data.care);
 const catalogue=[...common,...rare];
 function owned(){
  return [...new Set([...data.unlocked,...common.filter(item=>care.snapshot().highest>=item.level).map(item=>item.id)])];
 }
 if(!Array.isArray(data.seenGifts))data.seenGifts=owned();
 let notice=null;
 let careClock=performance.now(),lastCareSave=0;
 let dueAt=0,weather=null,nextWeather=0,busy=false,revision=0,lastReward=0;
 function save(){fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify({...data,care:care.snapshot()}));fs.renameSync(file+'.tmp',file);}
 async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('Chưa kết nối được thời tiết.');return r.json();}
 async function configure(p){
  if(!p||typeof p!=='object')throw new Error('Thiết lập không hợp lệ.');
  if('seenGift' in p&&owned().includes(p.seenGift)&&!data.seenGifts.includes(p.seenGift))data.seenGifts.push(p.seenGift);
  if('decoration' in p){
   if(p.decoration!==null&&(!catalogue.some(item=>item.id===p.decoration)||!owned().includes(p.decoration)))throw new Error('Món này chưa mở khóa.');
   data.decoration=p.decoration;
  }
  if('roomTheme' in p){if(!['classic','rose'].includes(p.roomTheme)||p.roomTheme==='rose'&&care.snapshot().highest<5)throw new Error('Phòng chiều hồng mở ở cấp 5.');data.roomTheme=p.roomTheme;}
  if('city' in p){
   const name=String(p.city).trim().slice(0,100);let city=null;
   if(name){const r=await json('https://geocoding-api.open-meteo.com/v1/search?count=1&language=vi&name='+encodeURIComponent(name));const c=r.results?.[0];if(!c)throw new Error('Không tìm thấy thành phố.');city={name:[c.name,c.admin1,c.country].filter(Boolean).join(', '),latitude:c.latitude,longitude:c.longitude};}
   data.city=city;weather=null;revision++;nextWeather=0;
  }
  if('breakMinutes' in p){const n=Number(p.breakMinutes);if(![0,20,30,45,60,90].includes(n))throw new Error('Khoảng nghỉ không hợp lệ.');data.breakMinutes=n;dueAt=n?Date.now()+n*60000:0;}
  if('lamp' in p){if(!['auto','on','off'].includes(p.lamp))throw new Error('Đèn không hợp lệ.');data.lamp=p.lamp;}
  save();
 }
 function tick(active,running=true){
  const now=performance.now(),elapsed=(now-careClock)/1000;careClock=now;
  if(running&&elapsed<5)care.tick(elapsed);
  if(now-lastCareSave>60000){lastCareSave=now;save();}
  if(data.breakMinutes&&!dueAt)dueAt=Date.now()+data.breakMinutes*60000;
  if(active&&data.city&&!busy&&Date.now()>nextWeather){
   busy=true;nextWeather=Date.now()+900000;const token=revision,c=data.city;
   json('https://api.open-meteo.com/v1/forecast?latitude='+c.latitude+'&longitude='+c.longitude+'&current=weather_code,is_day').then(r=>{if(token!==revision)return;const c=r.current;if(!c||!Number.isFinite(c.weather_code))throw Error();weather={kind:c.weather_code>=51?'rain':c.weather_code>1?'cloud':'sun',night:c.is_day===0};}).catch(()=>{if(token===revision)nextWeather=Date.now()+60000;}).finally(()=>{busy=false;});
  }
 }
 function interact(k){

  if(k==='break-done'||k==='break-snooze'){dueAt=data.breakMinutes?Date.now()+(k==='break-snooze'?5:data.breakMinutes)*60000:0;return;}
  if(k==='lamp'){data.lamp=data.lamp==='off'?'on':'off';save();return;}
  const feeding=k==='food-eaten',now=Date.now();
  if(!feeding&&(!['pet','tease','ball'].includes(k)||now-lastReward<10000))return;
  const before=owned(),previous=care.snapshot();
  let message;
  if(feeding)message=care.feed()?'Đã no · +45 XP':'Đã no · 0 XP';
  else{
   lastReward=now;data.interactions++;
   const gift=care.reward(data.unlocked);if(gift)data.unlocked.push(gift);
  }
  const received=catalogue.filter(item=>owned().includes(item.id)&&!before.includes(item.id));
  const progress=care.snapshot();
  message=[message,progress.level>previous.level?'Lên cấp '+progress.level:null,
   ...received.map(item=>'Nhận '+item.name),
   previous.highest<5&&progress.highest>=5?'Mở Phòng chiều hồng':null].filter(Boolean).join(' · ');
  if(message)notice={message,until:now+4500};
  save();
  return message;
 }
 function snapshot(){
  const progress=care.snapshot();
  const unlocked=owned();
  return {...data,care:progress,unlocked,newGifts:unlocked.filter(id=>!data.seenGifts.includes(id)),notice:notice?.until>Date.now()?notice:null,weather,due:!!(dueAt&&Date.now()>=dueAt)};
 }
 return {configure,interact,tick,flush:save,snapshot};
}
module.exports={createRoomFeatures};
