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
 const body="## Mèo Desktop 1.3.0\n- Mèo đói sau một giờ app hoạt động. Bữa khi đói nhận 45 XP, bữa khi no nhận 0 XP.\n- Bảng Chăm sóc mèo hiển thị độ no, thời gian đến lúc đói, XP còn thiếu và hình phần thưởng ở mốc kế tiếp.\n- Kỷ niệm giải thích điều kiện nhận, đánh dấu quà mới đến khi xem và cho đặt đồ đã sở hữu trên bàn trong phòng.\n- Vuốt ve và chơi len ngoài desktop được tính thưởng chung với các tương tác trong phòng. Sửa thao tác kéo bát.\n- Sóng nhạc Windows 11 có 32 dải tần, đỉnh sáng, ba kiểu hiển thị, màu theo ảnh bìa và các thanh chỉnh có bản xem trước.\n\n## Tải và cập nhật\nWindows tải và cài qua Cài đặt → Cập nhật, hoặc dùng bộ cài x64. Mac dùng DMG arm64 cho Apple Silicon hoặc x64 cho Intel. Phòng tương tác và đồ trang trí hỗ trợ Windows.\n\nMã nguồn: "+commit;
 let release=(await api(base+'/releases?per_page=100')).find(item=>item.tag_name===tag);
 if(!release)release=await api(base+'/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,target_commitish:commit,name:'Mèo Desktop '+version+' — Windows & macOS',body,draft:true,prerelease:false,generate_release_notes:true})});
 for(const file of files){
  const name=path.basename(file),digest=await hashes(file),existing=release.assets.find(asset=>asset.name===name);
  if(existing){if(existing.digest==='sha256:'+digest.sha256&&existing.size===fs.statSync(file).size)continue;if(!release.draft)throw new Error('Published asset differs; publish a new version: '+name);await api(base+'/releases/assets/'+existing.id,{method:'DELETE'});}
  await api(release.upload_url.replace(/\{.*$/,'')+'?name='+encodeURIComponent(name),{method:'POST',headers:{'Content-Type':'application/octet-stream','Content-Length':String(fs.statSync(file).size)},body:fs.createReadStream(file),duplex:'half'});console.log('Uploaded '+name);
 }
 const result=await api(base+'/releases/'+release.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:false,prerelease:false,make_latest:"true"})});console.log(JSON.stringify({published:result.html_url,assets:result.assets.map(a=>a.name)}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
