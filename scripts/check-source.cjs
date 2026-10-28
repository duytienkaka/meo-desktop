'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');let failed=false,checked=0;
function walk(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(folder,entry.name)):[path.join(folder,entry.name)]);}
const files=['src','scripts','checks'].flatMap(folder=>walk(path.join(root,folder))).filter(file=>/\.(?:js|cjs|cs|ps1|html|css)$/.test(file));
for(const file of files){
  const relative=path.relative(root,file);
  if(/^(?:<{7} |={7}$|>{7} )/m.test(fs.readFileSync(file,'utf8'))){console.error('Unresolved merge marker: '+relative);failed=true;}
  if(/\.(?:js|cjs)$/.test(file)){
    const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});
    if(result.status!==0){console.error(relative+'\n'+(result.stderr||result.error?.message||'Syntax check failed'));failed=true;}checked++;
  }
}
if(failed)process.exitCode=1;else console.log(`Source checks passed (${checked} JavaScript files).`);
