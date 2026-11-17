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
 const body="## Mèo Desktop 1.2.2\n- Nuôi mèo với thức ăn miễn phí, trạng thái đói, kinh nghiệm và cấp độ. Nút Cho ăn xuất hiện ngay cạnh mèo khi đói, giúp đặt bát nhanh.\n- Kéo bát cho mèo đuổi theo. Khi tới bát, chuyển sang hoạt ảnh ăn của cả bốn nhân vật với đúng hình chiếc bát.\n- Kệ kỷ niệm nhiều tầng, quà thường mở theo cấp và bộ ba hiếm. Các món chưa có hiện trạng thái khóa, mèo giơ quà khi lên cấp.\n- Bàn nhạc có nốt nhạc bay khi phát, mèo tới nghe nhạc, đèn phòng ấm, cửa sổ theo thời tiết thành phố và nhắc uống nước.\n- Chỉnh giao diện phòng và cài đặt, thiết kế lại kệ và bát ăn. Sửa nốt nhạc dừng khi chuyển ứng dụng và lớp màu ban đêm tràn ra ngoài cửa sổ.\n\n## Tải và cập nhật\nWindows x64 dùng Setup .exe. Mac Apple Silicon dùng arm64.dmg, Mac Intel dùng x64.dmg, yêu cầu macOS 13 trở lên.\nWindows tải và cài trong app khi chọn Cài đặt → Cập nhật. Mac tải DMG đúng chip và thay app trong Applications.\nPhòng tương tác và nuôi mèo hỗ trợ Windows. Kính và sóng taskbar hỗ trợ Windows 11.\nWindows chưa ký số. Mac ký ad-hoc, chưa notarization. Có SHA-256 kèm bộ cài.\n\nThành phần kính dùng ExplorerTAP 2026.2 từ TranslucentTB (GPL-3.0), kèm mã nguồn helper và giấy phép.\n\nMã nguồn: "+commit;
 let release=(await api(base+'/releases?per_page=100')).find(item=>item.tag_name===tag);
 if(!release)release=await api(base+'/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,target_commitish:commit,name:'Mèo Desktop '+version+' — Windows & macOS',body,draft:true,prerelease:false,generate_release_notes:true})});
 for(const file of files){
  const name=path.basename(file),digest=await hashes(file),existing=release.assets.find(asset=>asset.name===name);
  if(existing){if(existing.digest==='sha256:'+digest.sha256&&existing.size===fs.statSync(file).size)continue;if(!release.draft)throw new Error('Published asset differs; publish a new version: '+name);await api(base+'/releases/assets/'+existing.id,{method:'DELETE'});}
  await api(release.upload_url.replace(/\{.*$/,'')+'?name='+encodeURIComponent(name),{method:'POST',headers:{'Content-Type':'application/octet-stream','Content-Length':String(fs.statSync(file).size)},body:fs.createReadStream(file),duplex:'half'});console.log('Uploaded '+name);
 }
 const result=await api(base+'/releases/'+release.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:false,prerelease:false,make_latest:"true"})});console.log(JSON.stringify({published:result.html_url,assets:result.assets.map(a=>a.name)}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
