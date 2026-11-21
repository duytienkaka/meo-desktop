'use strict';
const path=require('node:path');
const {Worker,parentPort,workerData}=require('node:worker_threads');
const langPath=path.join(__dirname,'../assets/ocr');

async function readText(png){
 const {createWorker}=require('tesseract.js');
 const worker=await createWorker(['vie','eng'],1,{
  langPath,gzip:false,cacheMethod:'none',
  // Tesseract can fail before its initialization promise settles.
  errorHandler:()=>parentPort.postMessage({failed:true})
 });
 try{
  const {data}=await worker.recognize(png);
  // Discard low-confidence guesses from textures, icons and other non-text areas.
  return data.confidence>=55?data.text.trim().slice(0,40000):'';
 }finally{await worker.terminate();}
}

function recognizeScreenshot(image){
 const {width,height}=image.getSize();
 const maxSide=3000;
 const input=Math.max(width,height)>maxSide
  ?image.resize(width>=height?{width:maxSide,quality:'best'}:{height:maxSide,quality:'best'})
  :image;
 // Terminating this worker also stops the Tesseract worker it owns.
 return new Promise((resolve,reject)=>{
  const job=new Worker(__filename,{workerData:{ocr:true,png:input.toPNG()}});
  let settled=false;
  const timeout=setTimeout(()=>finish(new Error('OCR timed out')),20000);
  function finish(error,text){
   if(settled)return;
   settled=true;
   clearTimeout(timeout);
   void job.terminate().catch(()=>{});
   if(error)reject(error);
   else resolve(text);
  }
  job.once('message',result=>finish(result.failed?new Error('OCR failed'):null,result.text));
  job.once('error',finish);
  job.once('exit',()=>finish(new Error('OCR worker exited')));
 });
}

if(parentPort&&workerData?.ocr){
 readText(Buffer.from(workerData.png)).then(text=>parentPort.postMessage({text}),()=>parentPort.postMessage({failed:true}));
}
module.exports={recognizeScreenshot};
