/* Executed by the system JXA runtime. All arguments are JSON data, never script text. */
ObjC.import('AppKit');
function run(args){
  var request=JSON.parse(args[0]||'{}'),workspace=$.NSWorkspace.sharedWorkspace;
  function applications(){return ObjC.unwrap(workspace.runningApplications).map(function(app){return {id:ObjC.unwrap(app.bundleIdentifier)||'',name:ObjC.unwrap(app.localizedName)||'',pid:Number(app.processIdentifier),file:app.bundleURL?ObjC.unwrap(app.bundleURL.lastPathComponent):''};});}
  function audio(){
    var system=Application.currentApplication();system.includeStandardAdditions=true;
    var current=system.getVolumeSettings(),level=Number(current.outputVolume),muted=!!current.outputMuted;
    if(request.action==='step'||request.action==='set'){
      var amount=Number(request.value);if(!isFinite(amount)||(request.action==='step'&&(!amount||Math.abs(amount)>10))||(request.action==='set'&&(amount<0||amount>100)))throw new Error('InvalidVolume');
      system.setVolume({outputVolume:Math.max(0,Math.min(100,request.action==='step'?level+amount:amount)),outputMuted:muted});
    }else if(request.action==='toggle')system.setVolume({outputMuted:!muted});
    else if(request.action!=='read')throw new Error('InvalidAudioCommand');
    current=system.getVolumeSettings();return {available:true,level:Number(current.outputVolume),muted:!!current.outputMuted};
  }
  function media(){
    var allowed=['com.spotify.client','com.apple.Music'],running=applications(),candidates=[];
    running.forEach(function(app){if(allowed.indexOf(app.id)<0||(request.source&&request.source!==app.id))return;
      try{var player=Application(app.id),status=String(player.playerState());if(status!=='playing'&&status!=='paused')return;var track=player.currentTrack();
        candidates.push({available:true,hasSession:true,playing:status==='playing',sourceAppId:app.id,sourceName:app.name,title:String(track.name()||''),artist:String(track.artist()||''),duration:Number(track.duration())/(app.id==='com.spotify.client'?1000:1),position:Number(player.playerPosition()),canPlay:true,canPause:true,canNext:true,canPrevious:true,canSeek:true});
      }catch(error){if(String(error).indexOf('-1743')>=0||String(error).toLowerCase().indexOf('not authorized')>=0)throw new Error('AutomationPermissionDenied');}
    });
    if(request.action==='read')return candidates.filter(function(c){return c.playing;})[0]||candidates[0]||{available:true,hasSession:false,playing:false};
    var target=candidates[0];if(!target||target.sourceAppId!==request.source)throw new Error('SessionClosed');
    var player=Application(request.source);
    if(request.action==='play')player.play();else if(request.action==='pause')player.pause();else if(request.action==='next')player.nextTrack();else if(request.action==='previous')player.previousTrack();else if(request.action==='open')player.activate();
    else if(request.action==='seek'){var position=Number(request.value);if(!isFinite(position)||position<0||position>target.duration)throw new Error('InvalidPosition');player.playerPosition=position;}
    else throw new Error('InvalidMediaCommand');return {success:true};
  }
  try{
    if(request.kind==='audio')return JSON.stringify(audio());
    if(request.kind==='media')return JSON.stringify(media());

    throw new Error('InvalidRequest');
  }catch(error){return JSON.stringify({available:false,playing:false,hasSession:false,level:0,muted:false,success:false,error:String(error).slice(0,200)});}
}
