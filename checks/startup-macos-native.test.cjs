'use strict';
// Runs only on a disposable GitHub macOS runner; never changes a user's login items.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises'),{createStartup}=require('../src/startup.cjs');
(async()=>{
 if(process.platform!=='darwin'||process.env.CI!=='true')throw new Error('Run only on a disposable macOS CI runner.');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'meo-startup-native-')),bundle=path.join(root,'Mèo & Bạn.app'),contents=path.join(bundle,'Contents'),executable=path.join(contents,'MacOS/Meo'),marker=path.join(root,'launch-args.txt');let startup;
 try{
  fs.mkdirSync(path.dirname(executable),{recursive:true});
  fs.writeFileSync(path.join(contents,'Info.plist'),'<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>vn.meo.startup-fixture</string><key>CFBundleExecutable</key><string>Meo</string><key>CFBundlePackageType</key><string>APPL</string><key>LSUIElement</key><true/></dict></plist>');
  const source=path.join(root,'fixture.c');fs.writeFileSync(source,'#include <stdio.h>\nint main(int argc,char **argv){FILE *f=fopen('+JSON.stringify(marker)+',"w");if(!f)return 1;for(int i=1;i<argc;i++)fprintf(f,"%s\\n",argv[i]);fclose(f);return 0;}');
  execFileSync('/usr/bin/clang',[source,'-o',executable]);execFileSync('/usr/bin/codesign',['--force','--sign','-',bundle]);
  startup=createStartup({app:{isPackaged:true},platform:'darwin',home:root,executable});
  assert.equal(startup.refresh().enabled,false);assert.equal((await startup.set(true)).enabled,true);
  for(let i=0;i<100&&!fs.existsSync(marker);i++)await delay(100);
  assert.ok(fs.existsSync(marker),'LaunchAgent should open the dedicated fixture app');assert.match(fs.readFileSync(marker,'utf8'),/^--background$/m);
  execFileSync('/bin/launchctl',['print','gui/'+process.getuid()+'/vn.meo.desktop']);
  assert.equal((await startup.set(false)).enabled,false);assert.ok(!fs.existsSync(path.join(root,'Library/LaunchAgents/vn.meo.desktop.plist')));
  console.log(JSON.stringify({passed:true,platform:process.platform,arch:process.arch,checks:['native launchctl bootstrap','Unicode/spaced app bundle path','LaunchServices delivers --background','job removed and plist deleted']}));
 }finally{if(startup)await startup.set(false).catch(()=>{});fs.rmSync(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
