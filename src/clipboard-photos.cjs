'use strict';
const crypto=require('node:crypto');
function createClipboardPhotos({clipboard,enabled,canUse,onImage}){
 let active=false,previous='',timer;
 function sample(){
  if(!enabled()||!canUse()){active=false;return;}
  try{
   // Never inspect text or files. Ignore what was already copied when enabled.
   const image=clipboard.readImage();
   const hash=image.isEmpty()?'':crypto.createHash('sha256').update(image.toPNG()).digest('hex');
   if(!active){active=true;previous=hash;return;}
   if(hash===previous)return;previous=hash;
   if(hash){const s=image.getSize();if(s.width*s.height<=32000000)onImage(image);}
  }catch{} // A busy/locked clipboard can be read on the next sample.
 }
 function start(){if(timer)return;sample();timer=setInterval(sample,900);timer.unref?.();}
 function stop(){clearInterval(timer);timer=null;active=false;}
 return {start,stop,sample};
}
module.exports={createClipboardPhotos};
