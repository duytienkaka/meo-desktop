'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {collectReleaseAssets,hashes}=require('./release-assets.cjs');
(async()=>{
 const version=require('../package.json').version,tag=process.env.RELEASE_TAG||'v'+version,root=process.argv[2]||'release-artifacts';if(tag!=='v'+version)throw new Error('Release tag must match package.json');
 const files=await collectReleaseAssets(root,version);if(process.argv.includes('--dry-run')){console.log(JSON.stringify({validated:true,tag,assets:files.map(file=>path.basename(file))}));return;}
 const token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;if(!token)throw new Error('Set GH_TOKEN or GITHUB_TOKEN with release write access');
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','User-Agent':'Meo-Release-Publisher'},base='https://api.github.com/repos/duytienkaka/meo-desktop';
 async function api(url,options={}){const response=await fetch(url,{...options,headers:{...headers,...options.headers}});if(!response.ok)throw new Error('GitHub release request failed: '+response.status);return response.status===204?null:response.json();}
 const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();if(!/^[a-f0-9]{40}$/.test(commit))throw new Error('Invalid source commit');
 const body='## Có gì mới trong '+version+'\n- Thêm ba mèo Mít, Mây, Mực để chọn trong Cài đặt; lưu lựa chọn trên máy.\n- Chu trình đi 8 tư thế, chuyển trạng thái mềm và hỗ trợ giảm chuyển động.\n- Hình nền minh họa “Chiều bên cửa sổ”: ánh nắng, hơi trà, bướm và ba vị trí cho mèo. Bật/tắt trong Cài đặt → Người bạn.\n- Sửa nhận ảnh chụp Win + Shift + S với API clipboard Electron 45. Bật nhận ảnh trong Tiện ích; giữ tối đa 3 ảnh.\n- Mèo đứng thẳng ở góc dưới và cải thiện giới hạn hiển thị.\n\n## Giới hạn bản Preview\nHình nền đang thử nghiệm trên Windows, trên màn hình chính; chưa hỗ trợ macOS. Tương tác và di chuyển trong cảnh còn được hoàn thiện. Bật lại hình nền sau khi mở app. Windows và Mac đều có nhân vật mới, hoạt ảnh và sửa nhận ảnh.\n\n## Bộ cài\nWindows x64: Setup .exe. Mac Apple Silicon: arm64.dmg. Mac Intel: x64.dmg. Mac cần macOS 13 trở lên. Có SHA-256 kèm bộ cài.\n\n## Cập nhật\nMở Cài đặt → Cập nhật. Windows tải/cài khi người dùng chọn; Mac tải DMG theo chip. Cấu hình được giữ. Windows chưa ký số; Mac ký ad-hoc, chưa notarization.\n\nMã nguồn: '+commit;
 let release=(await api(base+'/releases?per_page=100')).find(item=>item.tag_name===tag);
 if(!release)release=await api(base+'/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,target_commitish:commit,name:'Mèo Desktop '+version+' — Windows & macOS',body,draft:true,prerelease:true,generate_release_notes:true})});
 for(const file of files){
  const name=path.basename(file),digest=await hashes(file),existing=release.assets.find(asset=>asset.name===name);
  if(existing){if(existing.digest==='sha256:'+digest.sha256&&existing.size===fs.statSync(file).size)continue;if(!release.draft)throw new Error('Published asset differs; publish a new version: '+name);await api(base+'/releases/assets/'+existing.id,{method:'DELETE'});}
  await api(release.upload_url.replace(/\{.*$/,'')+'?name='+encodeURIComponent(name),{method:'POST',headers:{'Content-Type':'application/octet-stream','Content-Length':String(fs.statSync(file).size)},body:fs.createReadStream(file),duplex:'half'});console.log('Uploaded '+name);
 }
 const result=await api(base+'/releases/'+release.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:false,prerelease:true})});console.log(JSON.stringify({published:result.html_url,assets:result.assets.map(a=>a.name)}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
