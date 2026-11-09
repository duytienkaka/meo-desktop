(function(root){
 function create(random=Math.random){let pet=0,manual='',hold=0,routine='',routineLeft=0,wait=22,cycle=0,route='',routeLeft=0;
  return{interact(kind){if(kind==='release'){hold=0;return;}if(kind==='pet'){pet=1.8;return;}if(kind==='bed'){manual='bed';hold=90;routine='';routineLeft=0;route='';routeLeft=0;}},step(dt,pose,options={}){
   pet=Math.max(0,pet-dt);hold=Math.max(0,hold-dt);routeLeft=Math.max(0,routeLeft-dt);routineLeft=Math.max(0,routineLeft-dt);
   if(!routineLeft)routine='';const resting=pose&&['sleep','idle','rest'].includes(pose.phase);
   if(resting&&!pet&&!options.quiet){wait-=dt;if(wait<=0){wait=35+random()*30;cycle++;if(cycle%3===1){routine='stretch';routineLeft=3;}else if(options.roam&&!options.night&&cycle%3===2){route='sill';routeLeft=65;routine='watch';routineLeft=65;}else if(pose.target==='sill'&&!options.night){routine='chase';routineLeft=4;}else{routine='groom';routineLeft=2.5;}}}
   if(routine==='watch'&&!options.night&&pose?.target==='sill'&&resting&&routeLeft<40){routine='chase';routineLeft=4;}
   return{destination:hold?manual:routeLeft?route:null,affection:pet/1.8,routine:options.quiet?'':routine,progress:routine==='stretch'?1-routineLeft/3:routine==='chase'?1-routineLeft/4:0,wait};
  }};
 }
 const api={create};if(typeof module!=='undefined')module.exports=api;else root.ROOM_LIFE=api;
})(typeof window==='undefined'?globalThis:window);
