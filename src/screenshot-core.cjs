'use strict';
const crypto=require('node:crypto');
function selectionRect(value,bounds,imageSize){
 if(!value||!['x','y','width','height'].every(k=>Number.isFinite(value[k])))throw new Error('Vùng chụp không hợp lệ.');
 const x=Math.max(0,Math.min(bounds.width,value.x)),y=Math.max(0,Math.min(bounds.height,value.y));
 const width=Math.min(bounds.width,value.x+value.width)-x,height=Math.min(bounds.height,value.y+value.height)-y;
 if(width<8||height<8)throw new Error('Kéo chọn vùng lớn hơn một chút nhé.');
 const sx=imageSize.width/bounds.width,sy=imageSize.height/bounds.height;
 const left=Math.floor(x*sx),top=Math.floor(y*sy),right=Math.min(imageSize.width,Math.ceil((x+width)*sx)),bottom=Math.min(imageSize.height,Math.ceil((y+height)*sy));
 if((right-left)*(bottom-top)>32000000)throw new Error('Vùng chụp quá lớn. Hãy chọn vùng nhỏ hơn.');
 return {x:left,y:top,width:right-left,height:bottom-top};
}
function createPhotoStore({onRemove=()=>{}}={}){
 let photos=[],selected=null;
 function add(image){if(!image||image.isEmpty())throw new Error('Chưa đọc được ảnh chụp.');const size=image.getSize();if(size.width*size.height>32000000)throw new Error('Ảnh quá lớn.');const photo={id:crypto.randomUUID(),image,createdAt:Date.now(),width:size.width,height:size.height,thumb:image.resize({width:112,height:84,quality:'good'}).toDataURL()};photos.push(photo);selected=photo.id;if(photos.length>3)onRemove(photos.shift());return photo;}
 function get(id=selected){const photo=photos.find(p=>p.id===id);if(!photo)throw new Error('Ảnh không còn trong túi của mèo.');return photo;}
 function select(id){get(id);selected=id;}
 function remove(id){const photo=get(id);photos=photos.filter(p=>p.id!==id);if(selected===id)selected=photos.at(-1)?.id||null;onRemove(photo);}
 function clear(){for(const photo of photos)onRemove(photo);photos=[];selected=null;}
 return {add,get,select,remove,clear,list:()=>photos.map(({id,createdAt,width,height,thumb})=>({id,createdAt,width,height,thumb})),selected:()=>selected};
}
function decodeTarget(value){
 if(value?.own===true)return {own:true};
 if(value?.available!==true)return null;
 if(!/^\d{1,20}$/.test(value.hwnd)||!/^\d{1,20}$/.test(value.focus)||!Number.isInteger(value.pid)||value.pid<=0||!Number.isFinite(value.x)||!Number.isFinite(value.y))return null;
 const clean=text=>typeof text==='string'?text.replace(/[\x00-\x1f]/g,'').slice(0,100):'';
 return {hwnd:value.hwnd,focus:value.focus,pid:value.pid,name:clean(value.name)||'Ứng dụng',title:clean(value.title),x:value.x,y:value.y,seenAt:Date.now()};
}
module.exports={selectionRect,createPhotoStore,decodeTarget};
