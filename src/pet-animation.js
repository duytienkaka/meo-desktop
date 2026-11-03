/* Single-silhouette transitions: never overlay two cats (or extra paws). */
(() => {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function createTransition(){
    let displayed=null,group='',pending=null,start=0,last=0;
    return {
      sample(target,key,now,quiet=false){
        if(!displayed||quiet){displayed={...target};group=key;pending=null;last=now;return {...displayed,opacity:1};}
        const dt=clamp(now-last,0,50);last=now;
        if(key!==group){group=key;pending={...target};start=now;}
        else if(pending)pending={...target};
        const progress=pending?clamp((now-start)/180,0,1):1;
        const next=pending?(progress<.5?displayed:pending):target;
        const k=1-Math.exp(-dt/55),pose={...next};
        for(const field of ['altitude','rotation','sx','sy']){
          // A direction flip must not pass through a zero-width hit target.
          pose[field]=field==='sx'&&Math.sign(displayed[field])!==Math.sign(next[field])?next[field]:displayed[field]+(next[field]-displayed[field])*k;
        }
        displayed={...pose};
        if(progress===1)pending=null;
        const dip=pending?Math.sin(progress*Math.PI):0;
        return {...pose,sx:pose.sx*(1-.035*dip),sy:pose.sy*(1-.045*dip),opacity:1-.22*dip};
      },
      get active(){return !!pending;}
    };
  }
  window.CAT_ANIMATION={createTransition};
})();
