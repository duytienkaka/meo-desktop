'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {pipeline}=require('node:stream/promises');
const {Readable}=require('node:stream');
const root=path.resolve(__dirname,'..');
const version=require('../package.json').devDependencies.electron;
const platform=process.argv[2]||process.platform,arch=process.argv[3]||process.arch;
if(!['win32','darwin'].includes(platform))throw new Error('Supported packages: win32 or darwin');
if(platform==='darwin'&&process.platform!=='darwin')throw new Error('Build the Mac package on a Mac to preserve the app bundle and file permissions.');
const appVersion=require('../package.json').version.split('.').slice(0,2).join('.');
const cache=path.join(root,'.cache'),output=path.resolve(root,'../outputs',`Meo-Desktop-${appVersion}-${platform==='win32'?'win':platform}-${arch}`);
fs.mkdirSync(cache,{recursive:true});
async function download(url,target) {
  if(fs.existsSync(target))return;
  console.log('Downloading '+path.basename(target));
  const response=await fetch(url);if(!response.ok)throw new Error(`Download failed: ${response.status} ${url}`);
  const partial=target+'.partial';
  await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(partial));fs.renameSync(partial,target);
}
(async()=>{
  const filename=`electron-v${version}-${platform}-${arch}.zip`;
  const base=`https://github.com/electron/electron/releases/download/v${version}`;
  const zip=path.join(cache,filename),sums=path.join(cache,`SHASUMS256-v${version}.txt`);
  await download(`${base}/${filename}`,zip);await download(`${base}/SHASUMS256.txt`,sums);
  const expected=fs.readFileSync(sums,'utf8').split(/\r?\n/).find(line=>line.trim().endsWith(filename))?.split(/\s+/)[0];
  const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(zip))hash.update(chunk);
  if(!expected||hash.digest('hex')!==expected)throw new Error('Electron archive checksum mismatch');
  console.log('Official release checksum verified.');
  fs.mkdirSync(output,{recursive:true});
  if(platform==='win32')execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath '${zip.replaceAll("'","''")}' -DestinationPath '${output.replaceAll("'","''")}' -Force`],{stdio:'inherit',windowsHide:true});
  else execFileSync('/usr/bin/ditto',['-xk',zip,output],{stdio:'inherit'});
  let appRoot;
  if(platform==='win32'){
    const original=path.join(output,'electron.exe'),renamed=path.join(output,'Meo.exe');
    if(fs.existsSync(renamed))throw new Error('Meo.exe already exists. Close the existing app and choose a new output version before repackaging.');
    fs.renameSync(original,renamed);appRoot=path.join(output,'resources','app');
    const editor=path.join(cache,'rcedit-x64.exe');
    await download('https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe',editor);
    execFileSync(editor,[renamed,'--set-version-string','ProductName','Mèo Desktop','--set-version-string','FileDescription','Mèo Desktop','--set-version-string','OriginalFilename','Meo.exe','--set-product-version',require('../package.json').version,'--set-file-version',require('../package.json').version,'--set-icon',path.join(root,'assets/meo.ico')],{stdio:'inherit',windowsHide:true});
  }else{
    const bundle=path.join(output,'Meo.app');fs.renameSync(path.join(output,'Electron.app'),bundle);
    appRoot=path.join(bundle,'Contents','Resources','app');
    const plist=path.join(bundle,'Contents','Info.plist');let text=fs.readFileSync(plist,'utf8');
    text=text.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]+/,'$1Mèo Desktop').replace(/(<key>CFBundleName<\/key>\s*<string>)[^<]+/,'$1Mèo Desktop').replace(/(<key>CFBundleIdentifier<\/key>\s*<string>)[^<]+/,'$1vn.meo.desktop');
    fs.writeFileSync(plist,text);
  }
  fs.mkdirSync(appRoot,{recursive:true});
  for(const item of ['src','assets'])fs.cpSync(path.join(root,item),path.join(appRoot,item),{recursive:true});
  const pkg=require('../package.json');delete pkg.devDependencies;delete pkg.scripts;
  fs.writeFileSync(path.join(appRoot,'package.json'),JSON.stringify(pkg,null,2));
  if(fs.existsSync(path.join(root,'README.md')))fs.copyFileSync(path.join(root,'README.md'),path.join(output,'README.md'));
  console.log('Packaged: '+output);
})().catch(error=>{console.error(error);process.exit(1);});
