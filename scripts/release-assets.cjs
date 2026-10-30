'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),semver=require('semver');
const {parseUpdateInfo}=require('electron-updater/out/providers/Provider'),{validateManifest}=require('../src/updates.cjs');
async function hashes(file){const sha256=crypto.createHash('sha256'),sha512=crypto.createHash('sha512');for await(const chunk of fs.createReadStream(file)){sha256.update(chunk);sha512.update(chunk);}return {sha256:sha256.digest('hex'),sha512:sha512.digest('base64')};}
async function verifyChecksum(file){const expected=fs.readFileSync(file+'.sha256','utf8').trim().split(/\s+/);if(expected.length!==2||expected[1]!==path.basename(file)||!/^[a-f0-9]{64}$/i.test(expected[0]))throw new Error('Invalid SHA-256 file: '+path.basename(file));const result=await hashes(file);if(result.sha256!==expected[0].toLowerCase())throw new Error('Checksum mismatch: '+path.basename(file));return result;}
async function validateWindows(directory,version){
 if(!semver.valid(version))throw new Error('Invalid version');
 const name='Meo-Desktop-Setup-'+version+'-x64.exe',file=path.join(directory,name),result=await verifyChecksum(file);
 const manifest=parseUpdateInfo(fs.readFileSync(path.join(directory,'latest.yml'),'utf8'),'latest.yml',new URL('https://github.com/duytienkaka/meo-desktop/'));
 if(!validateManifest(manifest,{name,version})||manifest.files[0].sha512!==result.sha512||manifest.files[0].size!==fs.statSync(file).size)throw new Error('Windows update manifest does not match installer');
 if(fs.statSync(file+'.blockmap').size<1)throw new Error('Missing blockmap');
 return [file,file+'.sha256',file+'.blockmap',path.join(directory,'latest.yml')];
}
async function collectReleaseAssets(root,version){
 const files=[];function walk(dir,depth=0){if(depth>6)throw new Error('Artifact tree too deep');for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file,depth+1);else if(entry.isFile())files.push(file);if(files.length>1000)throw new Error('Too many artifact files');}}walk(root);
 const find=name=>{const matches=files.filter(file=>path.basename(file)===name);if(matches.length!==1)throw new Error('Expected exactly one artifact: '+name);return matches[0];};
 const installer=find('Meo-Desktop-Setup-'+version+'-x64.exe'),result=await validateWindows(path.dirname(installer),version);
 for(const arch of ['arm64','x64']){const file=find('Meo-Desktop-'+version+'-mac-'+arch+'.dmg');await verifyChecksum(file);result.push(file,file+'.sha256');}
 return result;
}
module.exports={hashes,verifyChecksum,validateWindows,collectReleaseAssets};
