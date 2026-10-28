'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function createDesktopActions({directory,shell,clipboard,platform=process.platform}){
  const store=path.join(directory,'pinned-apps.json'),limit=20;
  const key=location=>platform==='win32'?location.toLowerCase():location;
  const id=location=>crypto.createHash('sha256').update(key(location)).digest('hex').slice(0,20);
  const label=location=>path.basename(location).replace(/\.(exe|lnk|app)$/i,'').replace(/[\x00-\x1f]/g,'').slice(0,100)||'Ứng dụng';
  function absolute(value){if(typeof value!=='string'||!path.isAbsolute(value)||/[\x00-\x1f]/.test(value)||value.length>32767)throw new Error('Đường dẫn file không hợp lệ.');return path.normalize(value);}
  function existing(value){const location=absolute(value);try{const stat=fs.statSync(location);if(!stat.isFile()&&!stat.isDirectory())throw new Error();return {location,stat};}catch{throw new Error('File đã bị di chuyển hoặc không còn truy cập được.');}}
  function canPin(value){try{const {location,stat}=existing(value);return platform==='win32'?stat.isFile()&&/\.(exe|lnk)$/i.test(location):platform==='darwin'&&stat.isDirectory()&&/\.app$/i.test(location);}catch{return false;}}
  let pins=[];
  try{const saved=JSON.parse(fs.readFileSync(store,'utf8'));if(Array.isArray(saved)){const seen=new Set();pins=saved.slice(0,100).flatMap(value=>{try{const location=absolute(value.location),unique=key(location);if(seen.has(unique))return [];seen.add(unique);return [{id:id(location),location,name:label(location)}];}catch{return [];}}).slice(0,limit);}}catch{}
  function save(next){fs.mkdirSync(directory,{recursive:true});const temp=store+'.tmp';fs.writeFileSync(temp,JSON.stringify(next,null,2),'utf8');fs.renameSync(temp,store);pins=next;}
  function pin(value){const {location}=existing(value);if(!canPin(location))throw new Error(platform==='darwin'?'Hãy chọn ứng dụng .app.':'Hãy chọn file .exe hoặc lối tắt .lnk của ứng dụng.');if(pins.some(p=>key(p.location)===key(location)))return pins.find(p=>key(p.location)===key(location));if(pins.length>=limit)throw new Error('Bạn đã ghim 20 ứng dụng. Hãy gỡ bớt trước khi thêm.');const item={id:id(location),location,name:label(location)};save([...pins,item]);return item;}
  function remove(pinId){if(!pins.some(p=>p.id===pinId))throw new Error('Ứng dụng không còn trong danh sách ghim.');save(pins.filter(p=>p.id!==pinId));}
  async function open(value){const {location}=existing(value);const error=await shell.openPath(location);if(error)throw new Error('Chưa mở được file hoặc ứng dụng này.');}
  async function launch(pinId){const item=pins.find(p=>p.id===pinId);if(!item)throw new Error('Ứng dụng không còn trong danh sách ghim.');if(!canPin(item.location))throw new Error('Ứng dụng đã bị di chuyển hoặc không còn truy cập được.');await open(item.location);}
  function dropped(values){if(!Array.isArray(values)||!values.length||values.length>20)throw new Error('Mỗi lần hãy thả từ 1 đến 20 file hoặc thư mục.');const found=new Map();for(const value of values){const {location}=existing(value);found.set(key(location),location);}return [...found.values()];}
  function reveal(value){const {location}=existing(value);shell.showItemInFolder(location);}
  function copy(values){const locations=dropped(values);clipboard.writeText(locations.join('\r\n'));}
  return {pins:()=>pins.map(p=>({...p})),pin,remove,launch,open,reveal,copy,dropped,canPin};
}
module.exports={createDesktopActions};
