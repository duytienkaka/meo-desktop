'use strict';
const {exeName}=require('./game.cjs');
const aliases={'gpt.exe':'ChatGPT','chatgpt.exe':'ChatGPT','codex.exe':'Codex','chrome.exe':'Google Chrome','msedge.exe':'Microsoft Edge','firefox.exe':'Firefox','brave.exe':'Brave','cs2.exe':'Counter-Strike 2','dota2.exe':'Dota 2','valorant-win64-shipping.exe':'VALORANT','league of legends.exe':'League of Legends','genshinimpact.exe':'Genshin Impact','r5apex.exe':'Apex Legends','fortniteclient-win64-shipping.exe':'Fortnite','robloxplayerbeta.exe':'Roblox','steam.exe':'Steam','epicgameslauncher.exe':'Epic Games','powerpnt.exe':'PowerPoint','code.exe':'Visual Studio Code'};
function appName(exe,description=''){
  const id=exeName(exe),clean=typeof description==='string'?description.replace(/[\x00-\x1f]/g,'').trim().slice(0,100):'';
  if(clean&&!/\.(exe|app)$/i.test(clean)&&!/^electron$/i.test(clean))return clean;
  return aliases[id]||id.replace(/\.(exe|app)$/i,'').replace(/[-_]+/g,' ')||'Ứng dụng';
}
module.exports={appName};
