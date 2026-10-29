'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFile}=require('node:child_process');
const LABEL='vn.meo.desktop',NAME='Meo Desktop';
const xml=value=>String(value).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function agentPlist(bundle){return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>'+LABEL+'</string><key>ProgramArguments</key><array>'+['/usr/bin/open','-g','-a',bundle,'--args','--background'].map(s=>'<string>'+xml(s)+'</string>').join('')+'</array><key>RunAtLoad</key><true/></dict></plist>\n';}
function createStartup({app,platform=process.platform,executable=process.execPath,home=os.homedir(),uid=process.getuid?.(),exec=execFile,testMode=false}={}){
 const supported=['win32','darwin'].includes(platform)&&app.isPackaged&&!testMode;
 const options={path:executable,args:['--background']},file=path.join(home,'Library/LaunchAgents',LABEL+'.plist');
 const bundle=path.posix.dirname(path.posix.dirname(path.posix.dirname(executable))),content=agentPlist(bundle);
 let state={supported,enabled:false,status:supported?'off':'unavailable',message:supported?'Mèo sẽ chỉ mở khi bạn tự bật ứng dụng.':'Tùy chọn này dùng trong bản ứng dụng đã đóng gói.'},busy=false;
 function refresh(){
  if(!supported)return {...state};
  try{
   if(platform==='win32'){
    // openAtLogin checks only AppUserModelID, even when setLoginItemSettings used
    // a custom display name. launchItems contains the matching executable's keys.
    const settings=app.getLoginItemSettings(options),own=settings.launchItems?.find(item=>item.name===NAME&&item.scope!=='machine'),registered=!!own;
    const blocked=registered&&(own?own.enabled===false:settings.executableWillLaunchAtLogin===false);
    state={supported:true,enabled:registered&&!blocked,status:blocked?'blocked':registered?'on':'off',message:blocked?'Windows đã tắt mục này. Bật lại tại Task Manager → Startup apps hoặc bật công tắc tại đây.':registered?'Mèo sẽ chạy nền khi bạn đăng nhập Windows.':'Mèo sẽ chỉ mở khi bạn tự bật ứng dụng.'};
   }else{
    const exists=fs.existsSync(file),matches=exists&&fs.readFileSync(file,'utf8')===content;
    state={supported:true,enabled:matches,status:matches?'on':exists?'moved':'off',message:matches?'Mèo sẽ chạy nền khi bạn đăng nhập Mac.':exists?'Ứng dụng đã đổi vị trí. Bật lại để cập nhật đường dẫn mở mèo.':'Mèo sẽ chỉ mở khi bạn tự bật ứng dụng.'};
   }
  }catch{state={...state,enabled:false,status:'error',message:'Chưa đọc được thiết lập khởi động của hệ điều hành. Hãy mở lại Cài đặt.'};}
  return {...state};
 }
 const launchctl=args=>new Promise((resolve,reject)=>exec('/bin/launchctl',args,{shell:false,timeout:5000,maxBuffer:16000,encoding:'utf8'},(error,stdout,stderr)=>error?reject(Object.assign(new Error('macOS chưa áp dụng được thiết lập mở cùng máy. Kiểm tra System Settings → General → Login Items & Extensions.'),{nativeCode:error.code,nativeText:String(stderr)})):resolve(stdout)));
 async function set(enabled){
  if(typeof enabled!=='boolean')throw new Error('Giá trị mở cùng máy không hợp lệ.');
  if(!supported)throw new Error('Hãy cài bản ứng dụng để dùng tính năng mở cùng máy.');
  if(busy)throw new Error('Đang cập nhật thiết lập mở cùng máy.');busy=true;
  try{
   if(platform==='win32'){
    app.setLoginItemSettings({...options,name:NAME,openAtLogin:enabled,enabled});
    const result=refresh();if(result.enabled!==enabled||result.status==='error')throw new Error('Windows chưa áp dụng được thiết lập. Kiểm tra Startup apps trong Task Manager.');
   }else{
    if(!Number.isInteger(uid)||!bundle.endsWith('.app'))throw new Error('Chưa tìm được ứng dụng Mac đã cài.');
    if(enabled&&bundle.startsWith('/Volumes/'))throw new Error('Kéo Meo.app vào Applications rồi mở từ đó trước khi bật tính năng này.');
    const domain='gui/'+uid,target=domain+'/'+LABEL,previous=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
    // bootout is idempotent: an unloaded job is expected after a fresh login or manual removal.
    async function unload(){try{await launchctl(['bootout',target]);}catch(error){if(error.nativeCode!==3&&!/no such process|could not find service/i.test(error.nativeText))throw error;}}
    if(enabled){
     fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=file+'.tmp';
     try{fs.writeFileSync(temporary,content,{mode:0o600});await unload();fs.renameSync(temporary,file);await launchctl(['bootstrap',domain,file]);}
     catch(error){try{fs.unlinkSync(temporary);}catch{}if(previous!==null){fs.writeFileSync(file,previous,{mode:0o600});try{await launchctl(['bootstrap',domain,file]);}catch{}}else try{fs.unlinkSync(file);}catch{}throw error;}
    }else{await unload();if(fs.existsSync(file))fs.unlinkSync(file);}
    refresh();
   }
   return {...state};
  }finally{busy=false;}
 }
 return {refresh,set,snapshot:()=>({...state})};
}
function startsInBackground(argv){return argv.includes('--background');}
module.exports={createStartup,agentPlist,startsInBackground};
