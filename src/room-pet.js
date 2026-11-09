(function(root){
 'use strict';
 const spots={bed:{x:.315,y:.855,depth:.93,surface:'bed'},desk:{x:.71,y:.658,depth:.82,surface:'desk'},sill:{x:.555,y:.522,depth:.76,surface:'sill'}},chair={x:.73,y:.851,depth:.94,surface:'chair'},floor=x=>({x,y:.95,depth:1,surface:'floor'});
 const mix=(a,b,t)=>a+(b-a)*t;
 function create(){let position={...floor(.49)},target='',queue=[],age=0,elapsed=0,phase='idle',surface='floor',facing=1;
  function travel(key){const to=key==='play'?floor(.50):spots[key]||spots.bed;queue=[];age=0;
   const add=(name,duration,to,extra={})=>queue.push({name,duration,to:{...to},...extra});
   const jump=(to)=>{add('look',.55,queue.at(-1)?.to||position);add('crouch',.32,queue.at(-1)?.to||position);add('jump',.85,to,{arc:.07});add('land',.38,to);};
   // Elevated routes always return through known support points, never through furniture.
   if(surface==='desk'){add('walk',.9,{...spots.desk,x:.73});jump(chair);jump(floor(.82));}
   else if(surface==='chair')jump(floor(.82));
   else if(surface==='sill'){add('walk',.7,{...spots.sill,x:.51});jump({...spots.desk,x:.65});jump(chair);jump(floor(.82));}
   else if(surface==='bed')jump(floor(.315));
   else if(position.y<.91)jump(floor(position.x));
   const from=()=>queue.at(-1)?.to||position;
   const walk=(point)=>add('walk',Math.max(.5,Math.hypot(from().x-point.x,from().y-point.y)*17),point);
   if(key==='play'){
    walk(floor(.50));
    for(const x of [.61,.49,.63,.52]){add('crouch',.2,from());add('pounce',.65,floor(x),{arc:.028});walk(floor(x-.025));}
   }else if(key==='bed'){// Approach the opening from the front of the bed.
    walk(floor(.47));walk(floor(.315));jump(to);
   }else{ // The open aisle in front of the chair avoids its feet and backrest.
    walk(floor(.50));walk({...floor(.82),y:.965});jump(chair);
    if(key==='desk'){jump({...to,x:.73});walk(to);}else{jump({...spots.desk,x:.65});jump({...to,x:.51});walk(to);}
   }
   add('settle',1.1,to);if(key==='desk'){walk({...to,x:.865});add('touch',1.8,{...to,x:.865});walk(to);}else if(key==='sill')add('touch',1.8,to);add('rest',3,to);
   for(let i=0;i<queue.length;i++)queue[i].from=i?queue[i-1].to:{...position};target=key;
  }
  return {play(){travel('play');},step(dt,key='bed',quiet=false){if(!spots[key]&&key!=='play')key='bed';if(key!==target)travel(key);
   if(quiet){position={...(key==='play'?floor(.5):spots[key])};surface=key;queue=[];phase=key==='bed'?'sleep':'idle';return {...position,phase,altitude:0,sy:1,sx:1,direction:facing,elapsed,target:key,progress:1,surface,contact:key==='bed'?1:0,touch:0};}
   elapsed+=dt;age+=dt;while(queue.length&&age>=queue[0].duration){age-=queue[0].duration;position={...queue.shift().to};surface=position.surface;}
   let altitude=0,sy=1,sx=1,progress=1,touch=0;
   if(queue.length){const leg=queue[0],t=Math.min(1,age/leg.duration),ease=t*t*(3-2*t);phase=leg.name;progress=t;
    if(Math.abs(leg.to.x-leg.from.x)>.002)facing=leg.to.x<leg.from.x?-1:1;
    position={x:mix(leg.from.x,leg.to.x,phase==='walk'?t:ease),y:mix(leg.from.y,leg.to.y,ease),depth:mix(leg.from.depth,leg.to.depth,ease),surface:leg.from.surface};
    if(phase==='jump'||phase==='pounce')altitude=Math.sin(t*Math.PI)*leg.arc;
    if(phase==='crouch'||phase==='land'){const squash=Math.sin(t*Math.PI);sy=1-squash*.12;sx=1+squash*.06;}
    if(phase==='touch')touch=Math.sin(t*Math.PI);
   }else phase=target==='bed'?'sleep':'idle';
   const contact=surface==='bed'&&phase!=='jump'?1:0;
   return {...position,phase,altitude,sy,sx,direction:facing,elapsed,progress,target,surface,contact,touch};
  }};
 }
 const api={spots,create};if(typeof module!=='undefined')module.exports=api;else root.ROOM_PET=api;
})(typeof window==='undefined'?globalThis:window);
