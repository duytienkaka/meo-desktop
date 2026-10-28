'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const exec=promisify(execFile);
const SKIP=/^(?:__.*|_commonredist|redist|redistributables|directx|dotnet|vcredist|crash.*|unins.*|uninstall.*|installer|installers|support|webcache|node_modules|easyanticheat.*|battleye)$/i;
const UTILITY=/(?:unins|uninstall|setup|installscript|crash|reporter|anticheat|easyanticheat|battleye|vc_redist|vcredist|dxsetup|cefsubprocess|webhelper|updater|unitycrash|ue4prereq|^(?:steam|epicgameslauncher|riotclientservices|galaxyclient|wallpaper32|wallpaper64|blender|obs64)\.exe$)/i;
function clean(value){return typeof value==='string'?value.replace(/[\x00-\x1f]/g,'').trim().slice(0,160):'';}
function idFor(location){return crypto.createHash('sha256').update(path.resolve(location).toLowerCase()).digest('hex').slice(0,20);}
function parseVdf(text){return [...text.matchAll(/"(appid|name|installdir|path)"\s*"((?:\\.|[^"\\])*)"/g)].map(m=>[m[1],m[2].replace(/\\\\/g,'\\').replace(/\\"/g,'"')]);}
async function jsonFile(file){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return null;}}
async function entries(folder){try{return await fs.readdir(folder,{withFileTypes:true});}catch{return [];}}
async function executables(root,{maxDirs=450,maxDepth=6}={}){
  const queue=[{dir:root,depth:0}],found=[];let visited=0,truncated=false;
  while(queue.length&&visited++<maxDirs){
    const {dir,depth}=queue.shift();
    for(const item of await entries(dir)){
      if(item.isSymbolicLink())continue;
      if(item.isDirectory()&&!SKIP.test(item.name)){if(depth<maxDepth)queue.push({dir:path.join(dir,item.name),depth:depth+1});else truncated=true;}
      else if(item.isFile()&&/\.exe$/i.test(item.name)&&!UTILITY.test(item.name))found.push(item.name.toLowerCase());
    }
  }
  return {exes:[...new Set(found)].slice(0,40),truncated:truncated||queue.length>0||found.length>40};
}
async function installedSources({env=process.env,inventory}={}){
  if(!inventory){
    const result=await exec('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'native/FindGameInstalls.ps1')],{windowsHide:true,timeout:25000,maxBuffer:2*1024*1024,encoding:'utf8'});
    inventory=JSON.parse(result.stdout.replace(/^\uFEFF/,'').trim());
  }
  const candidates=[],roots=new Set(inventory.steamRoots||[]);
  roots.add(path.join(env['ProgramFiles(x86)']||'C:/Program Files (x86)','Steam'));
  for(const root of [...roots]){
    try{for(const [key,value] of parseVdf(await fs.readFile(path.join(root,'steamapps/libraryfolders.vdf'),'utf8')))if(key==='path')roots.add(value);}catch{}
  }
  for(const root of roots){for(const item of await entries(path.join(root,'steamapps'))){
    if(!item.isFile()||!/^appmanifest_\d+\.acf$/i.test(item.name))continue;
    try{const fields=Object.fromEntries(parseVdf(await fs.readFile(path.join(root,'steamapps',item.name),'utf8')));if(fields.name&&fields.installdir&&!/[\\/]|^\.{1,2}$/.test(fields.installdir))candidates.push({name:fields.name,location:path.join(root,'steamapps/common',fields.installdir),source:'Steam'});}catch{}
  }}
  const epic=path.join(env.ProgramData||'C:/ProgramData','Epic/EpicGamesLauncher/Data/Manifests');
  for(const item of await entries(epic)){
    if(!item.isFile()||!item.name.endsWith('.item'))continue;
    const data=await jsonFile(path.join(epic,item.name));
    if(data?.DisplayName&&data.InstallLocation&&!data.bIsIncompleteInstall)candidates.push({name:data.DisplayName,location:data.InstallLocation,source:'Epic Games'});
  }
  candidates.push(...(inventory.games||[]));return candidates;
}
async function scanLibrary(options={}){
  const candidates=await installedSources(options),games=[],seen=new Set(),started=Date.now();let partial=false;
  for(const candidate of candidates.slice(0,300)){
    if(Date.now()-started>45000){partial=true;break;}
    if(!clean(candidate.name)||typeof candidate.location!=='string')continue;
    const location=path.resolve(candidate.location),id=idFor(location);if(seen.has(id))continue;seen.add(id);
    try{if(!(await fs.stat(location)).isDirectory())continue;}catch{continue;}
    const result=await executables(location);partial ||= result.truncated;
    if(result.exes.length)games.push({id,name:clean(candidate.name),source:clean(candidate.source)||'Windows',exes:result.exes,location,manual:false});
  }
  return {games:games.sort((a,b)=>a.name.localeCompare(b.name,'vi')),partial:partial||candidates.length>300};
}
function validLibrary(value){return (Array.isArray(value)?value:[]).filter(g=>g&&/^[a-f0-9]{20}$/.test(g.id)&&clean(g.name)&&Array.isArray(g.exes)).slice(0,300).map(g=>({...g,name:clean(g.name),source:clean(g.source),exes:[...new Set(g.exes.filter(e=>typeof e==='string'&&/^[^\\/\x00-\x1f]+\.exe$/i.test(e)).map(e=>e.toLowerCase()))].slice(0,40),manual:g.manual===true}));}
module.exports={scanLibrary,executables,parseVdf,idFor,validLibrary,clean};
