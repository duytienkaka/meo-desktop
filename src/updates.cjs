'use strict';
const semver=require('semver');
const REPO='https://github.com/duytienkaka/meo-desktop',API='https://api.github.com/repos/duytienkaka/meo-desktop/releases?per_page=30';
function trustedURL(value,pathname){try{const url=new URL(value);return url.origin==='https://github.com'&&!url.username&&!url.password&&!url.search&&!url.hash&&decodeURIComponent(url.pathname)===pathname;}catch{return false;}}
function selectRelease(releases,current,platform,arch){
 if(!Array.isArray(releases)||!semver.valid(current))throw new Error('InvalidReleaseData');
 const candidates=[];
 for(const release of releases){
  const version=typeof release.tag_name==='string'&&release.tag_name.startsWith('v')?release.tag_name.slice(1):'';
  if(release.draft||!semver.valid(version)||!semver.gt(version,current)||!Array.isArray(release.assets))continue;
  const prefix='/duytienkaka/meo-desktop/releases/download/'+release.tag_name+'/',name=platform==='win32'?'Meo-Desktop-Setup-'+version+'-'+arch+'.exe':'Meo-Desktop-'+version+'-mac-'+arch+'.dmg';
  const asset=release.assets.find(a=>a.name===name&&trustedURL(a.browser_download_url,prefix+name)&&Number.isFinite(a.size)&&a.size>0);
  if(!asset||!trustedURL(release.html_url,'/duytienkaka/meo-desktop/releases/tag/'+release.tag_name))continue;
  const manifest=release.assets.some(a=>a.name==='latest.yml'&&trustedURL(a.browser_download_url,prefix+'latest.yml'));
  candidates.push({version,name,releaseURL:release.html_url,assetURL:asset.browser_download_url,feedURL:REPO+'/releases/download/'+encodeURIComponent(release.tag_name)+'/',notes:typeof release.body==='string'?release.body.slice(0,12000):'',canDownload:platform==='win32'&&arch==='x64'&&manifest});
 }
 return candidates.sort((a,b)=>semver.rcompare(a.version,b.version))[0]||null;
}
function validateManifest(info,candidate){
 return info?.version===candidate.version&&Array.isArray(info.files)&&info.files.length===1&&info.files.every(file=>file.url===candidate.name&&typeof file.sha512==='string'&&file.sha512.length<=128&&/^[A-Za-z0-9+/]+={0,2}$/.test(file.sha512)&&Buffer.from(file.sha512,'base64').length===64&&Number.isFinite(file.size)&&file.size>0);
}
function createUpdates({app,platform=process.platform,arch=process.arch,fetcher=global.fetch,openExternal,onChange=()=>{},onAvailable=()=>{},beforeInstall=()=>{},testMode=false,createEngine=feed=>new(require('electron-updater').NsisUpdater)({provider:'generic',url:feed,useMultipleRangeRequest:false})}={}){
 const supported=app.isPackaged&&!testMode&&['win32','darwin'].includes(platform),current=app.getVersion();
 let state={supported,status:supported?'idle':'unavailable',current,latest:'',notes:'',progress:0,canDownload:false,message:supported?'Ứng dụng tự kiểm tra bản mới sau khi mở và mỗi 6 giờ.':'Kiểm tra cập nhật dùng trong bản ứng dụng đã cài.'};
 let candidate=null,engine=null,cancellation=null,controller=null,checking=null,closed=false,initialTimer,repeatTimer,notified='';
 const snapshot=()=>({...state});
 function change(patch){if(closed)return;state={...state,...patch};onChange(snapshot());}
 const busy=()=>['checking','downloading','downloaded','installing'].includes(state.status);
 function fail(){change({status:'error',message:'Chưa cập nhật được. Kiểm tra kết nối mạng rồi thử lại; bạn cũng có thể tải bộ cài từ trang phát hành.'});}
 async function check(){
  if(!supported)return snapshot();if(checking)return checking;if(busy())return snapshot();
  checking=(async()=>{
   await Promise.resolve();
   change({status:'checking',message:'Đang kiểm tra GitHub Releases…',progress:0,canDownload:false});
   controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),15000);
   try{
    const response=await fetcher(API,{headers:{Accept:'application/vnd.github+json','User-Agent':'Meo-Desktop-Updater'},signal:controller.signal});
    if(!response.ok)throw new Error('ReleaseUnavailable');
    // Bound the response before parsing: release bodies can be very large.
    const text=await response.text();if(text.length>2000000)throw new Error('ReleaseDataTooLarge');
    const found=selectRelease(JSON.parse(text),current,platform,arch);if(closed)return snapshot();
    candidate=found;engine=null;cancellation=null;
    if(!found){change({status:'up-to-date',latest:'',notes:'',message:'Bạn đang dùng phiên bản mới nhất dành cho máy này.'});return snapshot();}
    change({latest:found.version,notes:found.notes});
    if(found.canDownload){
     engine=createEngine(found.feedURL);engine.autoDownload=false;engine.autoInstallOnAppQuit=false;engine.allowPrerelease=true;engine.allowDowngrade=false;engine.logger=null;
     engine.on('error',()=>{if(closed)return;if(state.status==='installing')change({status:'downloaded',message:'Chưa khởi động được trình cài. Hãy thử lại hoặc tải bộ cài từ trang phát hành.'});else if(['checking','downloading'].includes(state.status))fail();});
     engine.on('download-progress',value=>{if(state.status==='downloading'&&Number.isFinite(value.percent))change({progress:Math.max(0,Math.min(100,value.percent)),message:'Đang tải bản cập nhật…'});});
     const result=await engine.checkForUpdates();
     if(closed)return snapshot();
     if(!result?.isUpdateAvailable||!validateManifest(result.updateInfo,found))throw new Error('InvalidUpdateManifest');
     cancellation=result.cancellationToken;
    }
    change({status:'available',latest:found.version,notes:found.notes,canDownload:found.canDownload,message:found.canDownload?'Có bản mới. Bạn có thể tải ngay và chọn thời điểm cài.':platform==='darwin'?'Có bản mới cho Mac. Tải DMG rồi cài đè trong Applications để cập nhật.':'Có bản mới. Bản này cần tải bộ cài từ trang phát hành.'});
    if(notified!==found.version){notified=found.version;try{onAvailable(snapshot());}catch{}}
   }catch{fail();}finally{clearTimeout(timeout);controller=null;checking=null;}
   return snapshot();
  })();return checking;
 }
 async function download(){
  if(!supported||state.status!=='available'||!candidate?.canDownload||!engine)throw new Error('Hãy kiểm tra phiên bản trước khi tải.');
  change({status:'downloading',progress:0,message:'Đang tải bản cập nhật…'});
  try{const files=await engine.downloadUpdate(cancellation);if(!Array.isArray(files)||!files.length)throw new Error('MissingDownloadedUpdate');change({status:'downloaded',progress:100,message:'Đã tải xong. Lưu công việc và ảnh mèo đang giữ trước khi khởi động lại để cài.'});}catch{fail();}
  return snapshot();
 }
 function install(){
  if(!supported||state.status!=='downloaded'||!engine)throw new Error('Bản cập nhật chưa tải xong.');
  beforeInstall();change({status:'installing',message:'Đang đóng Mèo để cài bản mới…'});
  try{engine.quitAndInstall(true,true);}catch{change({status:'downloaded',message:'Chưa khởi động được trình cài. Hãy thử lại hoặc tải bộ cài từ trang phát hành.'});}
  return snapshot();
 }
 async function action(value){
  if(value==='check')return check();if(value==='download')return download();if(value==='install')return install();
  if(value==='release'){await openExternal(candidate?.releaseURL||REPO+'/releases');return snapshot();}
  if(value==='manual'){if(!candidate||!['available','error'].includes(state.status))throw new Error('Chưa có bộ cài mới cho máy này.');await openExternal(candidate.assetURL);return snapshot();}
  throw new Error('Thao tác cập nhật không hợp lệ.');
 }
 function start(){if(!supported||initialTimer||closed)return;initialTimer=setTimeout(()=>{void check();},15000);repeatTimer=setInterval(()=>{void check();},6*60*60*1000);initialTimer.unref?.();repeatTimer.unref?.();}
 function dispose(){closed=true;clearTimeout(initialTimer);clearInterval(repeatTimer);controller?.abort();cancellation?.cancel();}
 return {start,dispose,snapshot,action};
}
module.exports={createUpdates,selectRelease,validateManifest};
