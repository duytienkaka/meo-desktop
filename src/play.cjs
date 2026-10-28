'use strict';
// All timers use simulation time, so hiding/pausing the pet also pauses its antics.
function createPlayBehavior(){
  let stage=null,cooldown=0,restAt=45;
  function reset(now=0){stage=null;cooldown=now;restAt=now+45;}
  function landed(now){stage={kind:'look-away',start:now,until:now+1.4};cooldown=now+7;}
  function affection(now){stage=null;cooldown=now+3;restAt=now+35;}
  function update({now,near,difference,interactive,follow,roam}){
    if(interactive){stage=null;restAt=now+35;return null;}
    if(stage?.kind==='stalk'){
      if(!follow||!near||Math.abs(difference)>190){stage={kind:'look-away',start:now,until:now+.9};cooldown=now+3;}
      else if(now-stage.start>=.7){stage=null;cooldown=now+7;return{kind:'jump',overshoot:24};}
    }
    if(stage){
      if(now>=stage.until){stage=null;restAt=now+40;}
      else if(stage.kind==='rest'&&follow&&near){stage=null;restAt=now+35;}
      else return{kind:stage.kind,elapsed:now-stage.start};
    }
    if(follow&&near&&Math.abs(difference)>34&&Math.abs(difference)<130&&now>=cooldown){stage={kind:'stalk',start:now,until:now+.7};return{kind:'stalk',elapsed:0};}
    if(roam&&!near&&now>=restAt){stage={kind:'rest',start:now,until:now+8};return{kind:'rest',elapsed:0};}
    return null;
  }
  return{update,reset,landed,affection};
}
module.exports={createPlayBehavior};
