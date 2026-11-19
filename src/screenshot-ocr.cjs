'use strict';
const path=require('node:path');
const langPath=path.join(__dirname,'../assets/ocr');

async function recognizeScreenshot(image){
 const {width,height}=image.getSize();
 const maxSide=3000;
 const input=Math.max(width,height)>maxSide
  ?image.resize(width>=height?{width:maxSide,quality:'best'}:{height:maxSide,quality:'best'})
  :image;
 const {createWorker}=require('tesseract.js');
 const worker=await createWorker(['vie','eng'],1,{langPath,gzip:false,cacheMethod:'none'});
 try{
  const {data}=await worker.recognize(input.toPNG());
  // Discard low-confidence guesses from textures, icons and other non-text areas.
  return data.confidence>=55?data.text.trim().slice(0,40000):'';
 }finally{
  await worker.terminate();
 }
}
module.exports={recognizeScreenshot};
