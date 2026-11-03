'use strict';
const crypto=require('node:crypto');
function createClipboardPhotos({clipboard,enabled,canUse,isBusy=()=>false,nativeImage,onImage}){
 let active=false,previous='',timer,reading=false;
 function accept(image){
  if(!enabled()||!canUse())return;
  const hash=image.isEmpty()?'':crypto.createHash('sha256').update(image.toPNG()).digest('hex');
  if(!active){active=true;previous=hash;return;}
  if(hash===previous)return;
  if(hash){const s=image.getSize();if(s.width*s.height<=32000000)onImage(image);}
  previous=hash;
 }
 function sample(){
  if(!enabled()||!canUse()){active=false;return;}
  if(isBusy())return;
  try{
   // Never inspect text or files. Ignore what was already copied when enabled.
   if(typeof clipboard.readImage==='function'){accept(clipboard.readImage());return;}
   if(reading)return;reading=true;
   return (async()=>{try{
    const items=await clipboard.read();let image=nativeImage.createEmpty();
    for(const item of items){const type=item.types.find(t=>t==='image/png')||item.types.find(t=>t.startsWith('image/'));if(!type)continue;
     const blob=await item.getType(type);image=nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()));break;
    }
    accept(image);
   }catch{}finally{reading=false;}})();
  }catch{} // A busy/locked clipboard can be read on the next sample.
 }
 function start(){if(timer)return;sample();timer=setInterval(sample,900);timer.unref?.();}
 function stop(){clearInterval(timer);timer=null;active=false;}
 return {start,stop,sample};
}
module.exports={createClipboardPhotos};
