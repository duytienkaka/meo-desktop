'use strict';
const fs=require('node:fs'),path=require('node:path');
const {common}=require('./keepsakes.js');
function createRoomFeatures(directory){
 const file=path.join(directory,'room-features.json');let saved={};try{saved=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 const data={lamp:'auto',city:null,breakMinutes:0,interactions:0,unlocked:[],...saved};
 const care=require('./care.cjs').createCare(data.care);
 let careClock=performance.now(),lastCareSave=0;
 let dueAt=0,weather=null,nextWeather=0,busy=false,revision=0,lastReward=0;
 function save(){fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify({...data,care:care.snapshot()}));fs.renameSync(file+'.tmp',file);}
 async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('Chưa kết nối được thời tiết.');return r.json();}
 async function configure(p){
  if(!p||typeof p!=='object')throw new Error('Thiết lập không hợp lệ.');
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
  if(k==='food-eaten'){care.feed();save();return;}
  if(k==='break-done'||k==='break-snooze'){dueAt=data.breakMinutes?Date.now()+(k==='break-snooze'?5:data.breakMinutes)*60000:0;return;}
  if(k==='lamp'){data.lamp=data.lamp==='off'?'on':'off';save();return;}
  if(['pet','tease','ball'].includes(k)&&Date.now()-lastReward>10000){lastReward=Date.now();data.interactions++;const gift=care.reward(data.unlocked);if(gift)data.unlocked.push(gift);save();}
 }
 function snapshot(){
  const progress=care.snapshot();
  const earned=common.filter(item=>progress.highest>=item.level).map(item=>item.id);
  return {...data,care:progress,unlocked:[...new Set([...data.unlocked,...earned])],weather,due:!!(dueAt&&Date.now()>=dueAt)};
 }
 return {configure,interact,tick,flush:save,snapshot};
}
module.exports={createRoomFeatures};
