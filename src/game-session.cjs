'use strict';
const BREAK_MINUTES=[0,30,45,60,90];
function duration(seconds){seconds=Math.max(0,Math.floor(Number.isFinite(seconds)?seconds:0));const h=Math.floor(seconds/3600),m=Math.floor(seconds/60)%60,s=seconds%60;return(h?h+':'+String(m).padStart(2,'0'):String(m).padStart(2,'0'))+':'+String(s).padStart(2,'0');}
function createGameSession({breakMinutes=45}={}){
 let interval=BREAK_MINUTES.includes(breakMinutes)?breakMinutes:45,key=null,name='',played=0,lastAt=null,inputActive=false,lastActive=false,paused=false,breakUntil=0,nextBreak=interval*60,lastSession=null,now=0;
 const onBreak=()=>breakUntil>now;
 function tick(value){
  if(!Number.isFinite(value.now)||value.now<0)return snapshot();
  now=Math.max(now,value.now);if(lastAt!==null&&lastActive&&key)played+=(now-lastAt)/1000;
  const nextKey=typeof value.key==='string'&&value.key?value.key.slice(0,220):null;
  if(nextKey!==key){if(key)lastSession={name,seconds:Math.floor(played),elapsed:duration(played)};key=nextKey;name=key?String(value.name||'Chế độ game').slice(0,100):'';played=0;paused=false;breakUntil=0;nextBreak=interval*60;}
  if(breakUntil&&now>=breakUntil){breakUntil=0;nextBreak=played+interval*60;}
  inputActive=!!value.active&&!!key;lastActive=inputActive&&!paused&&!onBreak();lastAt=now;return snapshot();
 }
 function configure(minutes){if(!BREAK_MINUTES.includes(minutes))throw new Error('Khoảng nhắc nghỉ không hợp lệ.');interval=minutes;nextBreak=played+minutes*60;return snapshot();}
 function action(action,at=now){
  if(!key)throw new Error('Chưa có phiên chơi.');tick({key,name,active:inputActive,now:at});
  if(action==='pause')paused=true;
  else if(action==='resume'){paused=false;if(onBreak()){breakUntil=0;nextBreak=played+interval*60;}}
  else if(action==='break'){breakUntil=now+5*60*1000;paused=false;}
  else if(action==='snooze')nextBreak=played+10*60;
  else if(action==='reset'){lastSession={name,seconds:Math.floor(played),elapsed:duration(played)};played=0;paused=false;breakUntil=0;nextBreak=interval*60;}
  else throw new Error('Thao tác phiên chơi không hợp lệ.');
  lastActive=inputActive&&!paused&&!onBreak();return snapshot();
 }
 function snapshot(){const rest=onBreak(),due=!!key&&!!interval&&!rest&&played>=nextBreak,remaining=rest?Math.ceil((breakUntil-now)/1000):0;return {hasSession:!!key,name,seconds:Math.floor(played),elapsed:duration(played),active:lastActive,paused,onBreak:rest,breakRemaining:remaining,breakLabel:duration(remaining),breakDue:due,nextBreakSeconds:interval?Math.max(0,Math.ceil(nextBreak-played)):null,nextBreakLabel:interval?duration(Math.max(0,nextBreak-played)):'Tắt',breakMinutes:interval,status:!key?'idle':rest?'break':paused?'paused':lastActive?'playing':'away',lastSession};}
 return {tick,configure,action,snapshot};
}
module.exports={createGameSession,duration,BREAK_MINUTES};
