'use strict';
const {rare}=require('./keepsakes.js');
function createCare(saved={},random=Math.random){
 const hour=3600;
 const data={age:0,penalties:0,level:1,xp:0,highest:1,...saved};
 for(const key of ['age','penalties','level','xp','highest'])if(!Number.isFinite(data[key]))data[key]=key==='level'||key==='highest'?1:0;
 data.level=Math.max(1,Math.floor(data.level));data.highest=Math.max(data.level,data.highest);
 function experience(amount){
  data.xp+=amount;
  while(data.xp>=data.level*100){data.xp-=data.level*100;data.level++;data.highest=Math.max(data.highest,data.level);}
 }
 function tick(seconds){
  data.age+=Math.max(0,seconds);
  const penalties=Math.floor(Math.max(0,data.age-4*hour)/(24*hour));
  if(penalties>data.penalties){data.level=Math.max(1,data.level-(penalties-data.penalties));data.xp=0;data.penalties=penalties;}
 }
 function feed(){const hungry=data.age>=4*hour;data.age=0;data.penalties=0;if(hungry)experience(45);return hungry;}
 function reward(unlocked){
  experience(5);
  const pool=rare.map(item=>item.id).filter(k=>!unlocked.includes(k));
  return pool.length&&random()<.02?pool[Math.floor(random()*pool.length)]:null;
 }
 return {tick,feed,reward,snapshot:()=>({...data,hungry:data.age>=4*hour,nextLevel:data.level*100})};
}
module.exports={createCare};
