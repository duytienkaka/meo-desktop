'use strict';
const {app,BrowserWindow,ipcMain,screen,Tray,Menu,nativeImage,globalShortcut,powerMonitor,dialog,shell,clipboard,Notification}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {makeRoute,wrap,clamp}=require('./route.cjs');
const {createMediaMonitor,createMediaDecision,createMediaTransport,decodeMedia}=require('./media.cjs');
const {createGameMonitor,createGameDecision,resolveMood,ruleList,exeName,isApp}=require('./game.cjs');
const {appName}=require('./app-names.cjs');
const {scanLibrary,idFor,validLibrary}=require('./library.cjs');
const {createPlayBehavior}=require('./play.cjs');
const {constrainPosition,freePlacement}=require('./placement.cjs');
const {playerLayout}=require('./player-layout.cjs');
const {createDesktopActions}=require('./desktop-actions.cjs');
const {createAudioControl}=require('./audio.cjs');
const {createScreenshotFeature}=require('./screenshots.cjs');
const {createStartup,startsInBackground}=require('./startup.cjs');
const {createUpdates}=require('./updates.cjs');
const {createMacMonitor,createMacAudio,createMacTransport,scanMacLibrary}=require('./macos.cjs');
const mac=process.platform==='darwin',desktopSupported=['win32','darwin'].includes(process.platform);
const testMode=process.argv.includes('--meo-test');
app.setName('Meo Desktop');
app.setPath('userData',testMode?path.resolve(__dirname,'../checks/user-data'):path.join(app.getPath('appData'),'MeoDesktop'));
if(!app.requestSingleInstanceLock()){app.quit();}
else {
  const startup=createStartup({app,testMode});
  const updates=createUpdates({app,testMode,openExternal:url=>shell.openExternal(url),onChange:()=>publishSettings(),beforeInstall:()=>{if(screenshots?.isBusy())throw new Error('Hãy chờ thao tác ảnh hoàn tất trước khi cài.');if(!saveSettings())throw new Error('Chưa lưu được cài đặt. Hãy thử lại trước khi cập nhật.');},onAvailable:value=>{if(!Notification.isSupported())return;const notification=new Notification({title:'Mèo Desktop có bản mới '+value.latest,body:'Mở Cài đặt → Cập nhật để xem thay đổi và tải bản mới.',silent:true});notification.on('click',()=>openSettings('updates'));notification.show();}});
  const desktopActions=createDesktopActions({directory:app.getPath('userData'),shell,clipboard}),pinIcons=new Map();
  let fileHoverUntil=0,fileMenuOpen=false,screenshots;
  let audioState={available:false,level:0,muted:false},audioFeedbackUntil=0;
  function receiveAudio(value){const changed=audioState.muted!==value.muted;audioState=value;if(changed)refreshMenu();if(playerWindow&&!playerWindow.isDestroyed())playerWindow.webContents.send('meo:audio:state',value);}
  const audioControl=(mac?createMacAudio:createAudioControl)({onSample:receiveAudio});
  async function controlAudio(action,value){
    if(suspended||state.mode==='game')throw new Error('Âm lượng qua mèo đang tạm nghỉ khi chơi game.');
    if(!['step','toggle'].includes(action)||(action==='step'&&(!Number.isInteger(value)||!value||Math.abs(value)>10)))throw new Error('Lệnh âm lượng không hợp lệ.');
    const result=await audioControl.command(action,value);receiveAudio(result);audioFeedbackUntil=Date.now()+2400;return result;
  }
  function validAudio(event){return valid(event)||(playerWindow&&!playerWindow.isDestroyed()&&event.sender.id===playerWindow.webContents.id);}
  ipcMain.handle('meo:audio:get',event=>{if(!validAudio(event))throw new Error('Cửa sổ không hợp lệ.');return audioState;});
  ipcMain.handle('meo:audio:command',async(event,command)=>{if(!validAudio(event)||(valid(event)&&!state.visible)||suspended)throw new Error('Cửa sổ không hợp lệ.');try{return await controlAudio(command?.action,command?.value);}catch(error){note(error.message);throw error;}});
  const runDesktopAction=work=>Promise.resolve().then(work).catch(error=>{note(error.message);});
  async function refreshPinIcons(){
    await Promise.all(desktopActions.pins().map(async pin=>{if(pinIcons.has(pin.id))return;try{const icon=await app.getFileIcon(pin.location,{size:'normal'});pinIcons.set(pin.id,icon);}catch{}}));
    lastMenuKey='';refreshMenu();
  }
  function pinnedMenu(){
    return [...desktopActions.pins().map(pin=>({label:pin.name.replace(/&/g,'&&'),icon:pinIcons.get(pin.id)?.resize({width:16,height:16}),click:()=>runDesktopAction(()=>desktopActions.launch(pin.id))})),...(desktopActions.pins().length?[{type:'separator'}]:[]),{label:'Ghim / quản lý ứng dụng…',click:()=>openSettings('apps')}];
  }
  function fileMenuTemplate(paths){
    const actions=location=>[
      {label:'Mở',click:()=>runDesktopAction(()=>desktopActions.open(location))},
      {label:'Mở thư mục chứa',click:()=>runDesktopAction(()=>desktopActions.reveal(location))},
      {label:'Sao chép đường dẫn',click:()=>runDesktopAction(()=>{desktopActions.copy([location]);note('Đã sao chép đường dẫn.');})},
      ...(desktopActions.canPin(location)?[{type:'separator'},{label:'Ghim ứng dụng này',click:()=>runDesktopAction(async()=>{desktopActions.pin(location);await refreshPinIcons();note('Đã ghim ứng dụng.');})}]:[])
    ];
    if(paths.length===1)return [{label:path.basename(paths[0]).replace(/&/g,'&&'),enabled:false},{type:'separator'},...actions(paths[0])];
    return [{label:`Đã nhận ${paths.length} file / thư mục`,enabled:false},{label:'Sao chép tất cả đường dẫn',click:()=>runDesktopAction(()=>{desktopActions.copy(paths);note('Đã sao chép các đường dẫn.');})},{type:'separator'},...paths.map(location=>({label:path.basename(location).replace(/&/g,'&&'),submenu:actions(location)}))];
  }
  function acceptDroppedFiles(values){
    if(state.mode==='game'||!state.visible||suspended)throw new Error('Hãy thả file khi mèo đang hiện trên desktop.');
    const paths=desktopActions.dropped(values);hidePlayer(true);fileHoverUntil=0;fileMenuOpen=true;state.target=null;state.jump=null;state.action='idle';
    syncMouseInput(true,true);win.focus();
    Menu.buildFromTemplate(fileMenuTemplate(paths)).popup({window:win,callback:()=>{fileMenuOpen=false;syncMouseInput(false,true);}});
    tickFrame();return {count:paths.length};
  }
  let win,tray,settingsWindow,playerWindow,timer,display,route,quitting=false,suspended=false,ready=false,lastTick=0;
  let lastHitAt=0,lastBounds='',persistTimer,lastMenuKey='';
  const modes=['play','music','game','focus','sleep'];
  const modeLabels={play:'Tinh nghịch',music:'Nghe nhạc',game:'Chơi game',focus:'Tập trung',sleep:'Buồn ngủ'};
  const defaults={mode:'play',size:112,roam:true,follow:true,displayId:null,autoMedia:!mac,autoGame:true,customGames:[],ignoredGames:[],visible:true,paused:false};
  let preferences={...defaults};
  try {preferences={...defaults,...JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'settings.json'),'utf8'))};} catch {}
  if(!modes.includes(preferences.mode))preferences.mode='play';
  if(![80,112,148].includes(preferences.size))preferences.size=112;
  preferences.roam=preferences.roam!==false;preferences.follow=preferences.follow!==false;
  const state={...preferences,baseMode:preferences.mode,autoMedia:desktopSupported&&(mac?preferences.autoMedia===true:preferences.autoMedia!==false),autoGame:desktopSupported&&preferences.autoGame!==false,customGames:ruleList(preferences.customGames),ignoredGames:ruleList(preferences.ignoredGames),gameActive:false,gameExe:'',gameStatus:'connecting',lastApp:null,mediaStatus:'connecting',mediaPlaying:false,visible:preferences.visible!==false,paused:preferences.paused===true,time:0,distance:0,target:null,direction:1,action:'idle',actionStart:0,jump:null,petUntil:0,nextWander:3,nextPounce:2,interactive:false,dragging:false,dragAt:0,toast:'Chuột phải lên mèo để mở menu',toastUntil:5,closeEnough:false};
  const log=message=>{try{fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.appendFileSync(path.join(app.getPath('userData'),'app.log'),new Date().toISOString()+' '+message+'\n');}catch{}};
  const appLabels={};
  let nativeMouseState=null,nextMouseRepair=0,dragOffset={x:0,y:0};
  if(!state.freePosition||!Number.isFinite(state.freePosition.x)||!Number.isFinite(state.freePosition.y))state.freePosition=null;
  function syncMouseInput(hit,force=false){
    const enabled=!!hit&&state.visible&&!suspended&&state.mode!=='game';state.interactive=enabled;
    if(!win||win.isDestroyed())return;
    const focusable=state.mode!=='game';if(win.isFocusable()!==focusable)win.setFocusable(focusable);
    const now=Date.now();if(!force&&nativeMouseState===enabled&&(!enabled||now<nextMouseRepair))return;
    // Only request forwarding while passing through. Re-enabling real input must
    // remove the forwarding hook as well as WS_EX_TRANSPARENT on Windows.
    if(enabled)win.setIgnoreMouseEvents(false);else win.setIgnoreMouseEvents(true,{forward:true});
    win.setAlwaysOnTop(true,state.mode==='game'?'screen-saver':'floating');
    nativeMouseState=enabled;nextMouseRepair=now+400;
  }
  function currentPlacement(){return state.freePosition&&state.mode!=='game'?freePlacement(display.workArea,state.freePosition,state.size):route.windowAt(state.distance);}
  const playBehavior=createPlayBehavior();let nextOverlayAt=0,overlayRaises=0;
  function maintainOverlay(force=false){
    if(!win||win.isDestroyed()||!ready||!state.visible||suspended)return;
    const now=performance.now();
    if(!force&&(state.mode!=='game'||now<nextOverlayAt))return;
    nextOverlayAt=now+1500;
    win.setAlwaysOnTop(true,state.mode==='game'?'screen-saver':'floating');
    if(state.mode==='game'){
      // No focus()/show(): raising this nonfocusable window must not interrupt the game.
      syncMouseInput(false,true);
      if(!win.isVisible())win.showInactive();
      win.moveTop();overlayRaises++;
    }
  }
  const libraryFile=path.join(app.getPath('userData'),'games.json');
  let library=[],excludedGames=[],lastScan=null,scanStatus='idle',scanMessage='',scanTask=null;
  try{const saved=JSON.parse(fs.readFileSync(libraryFile,'utf8'));library=validLibrary(saved.games);excludedGames=Array.isArray(saved.excluded)?saved.excluded.filter(id=>typeof id==='string').slice(0,500):[];lastScan=saved.lastScan||null;}catch{}
  function saveLibrary(){fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.writeFileSync(libraryFile,JSON.stringify({games:library,excluded:excludedGames,lastScan},null,2));}
  function refreshLibraryDetection(){if(lastGameSample&&state.autoGame)gameDecision.update(lastGameSample,gameRules());refreshMenu();}
  function scanGames(){
    if(scanTask)return scanTask;
    if(!desktopSupported){scanStatus='unsupported';scanMessage='Quét game tự động hiện hỗ trợ Windows.';publishSettings();return Promise.resolve();}
    scanStatus='scanning';scanMessage='Đang tìm game trong thư viện và thông tin cài đặt…';publishSettings();
    scanTask=(async()=>{
      try{
        const result=await (mac?scanMacLibrary():scanLibrary()),manual=library.filter(g=>g.manual),old=library;
        const next=[...manual,...result.games.filter(g=>!excludedGames.includes(g.id)&&!manual.some(m=>m.exes.some(e=>g.exes.includes(e))))];
        library=next;const previousScan=lastScan;lastScan=new Date().toISOString();
        try{saveLibrary();}catch(error){library=old;lastScan=previousScan;throw error;}
        scanStatus='ready';scanMessage=result.partial?'Đã quét các vị trí cài đặt. Một số thư mục quá sâu; bạn có thể thêm game còn thiếu.':(mac?'Đã quét game macOS trong thư viện Steam.':'Đã quét Steam, Epic và các vị trí game được Windows ghi nhận.');
        refreshLibraryDetection();
      }catch(error){scanStatus='error';scanMessage='Chưa quét xong. Thử lại hoặc thêm game thủ công.';log('Game library: '+error.message);}
      finally{scanTask=null;publishSettings();}
    })();return scanTask;
  }
  for(const [id,label]of Object.entries(preferences.appLabels||{}).slice(0,400)){const exe=exeName(id);if(exe&&typeof label==='string')appLabels[exe]=appName(exe,label);}
  function saveSettings(){try{fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.writeFileSync(path.join(app.getPath('userData'),'settings.json'),JSON.stringify({mode:state.baseMode,size:state.size,roam:state.roam,follow:state.follow,visible:state.visible,paused:state.paused,freePosition:state.freePosition,displayId:display.id,autoMedia:state.autoMedia,autoGame:state.autoGame,customGames:state.customGames,ignoredGames:state.ignoredGames,appLabels:Object.fromEntries([...state.customGames,...state.ignoredGames].map(id=>[id,appName(id,appLabels[id])]))},null,2));return true;}catch(error){log(error.message);return false;}}
  function persist(){clearTimeout(persistTimer);persistTimer=setTimeout(saveSettings,300);}
  function applyAutomaticMode(){const mode=resolveMood(state);if(mode!==state.mode)setMode(mode,{automatic:true});}
  let mediaData=decodeMedia({available:false,playing:false}),lastPlayerKey='',playerOpen=false,playerLoaded=false,playerHideTimer,playerBlurTimer,petPressedAt=0,playerPresentation=null,playerMouseIgnored=null,playerScrubbing=false;
  const mediaTransport=mac?createMacTransport():createMediaTransport();
  function playerSnapshot(){return{...mediaData,sourceName:mac?({'com.spotify.client':'Spotify','com.apple.Music':'Apple Music'}[mediaData.sourceAppId]||'Trình phát macOS'):mediaData.sourceAppId?appName(exeName(mediaData.sourceAppId)||'player.exe',/spotify/i.test(mediaData.sourceAppId)?'Spotify':/chrome/i.test(mediaData.sourceAppId)?'Google Chrome':/msedge/i.test(mediaData.sourceAppId)?'Microsoft Edge':/firefox/i.test(mediaData.sourceAppId)?'Firefox':'Trình phát trên Windows'):''};}
  function publishPlayer(){if(!playerWindow||playerWindow.isDestroyed()||!playerWindow.isVisible())return;const value=playerSnapshot(),key=JSON.stringify(value);if(key!==lastPlayerKey){lastPlayerKey=key;playerWindow.webContents.send('meo:player:state',value);}}
  function hidePlayer(immediate=false){
    playerOpen=false;playerScrubbing=false;clearTimeout(playerHideTimer);clearTimeout(playerBlurTimer);
    const finish=()=>{if(playerOpen)return;if(playerWindow&&!playerWindow.isDestroyed())playerWindow.hide();if(!state.autoMedia){mediaMonitor.stop();mediaData=decodeMedia({available:false,playing:false});}};
    if(immediate||!playerLoaded||!playerWindow?.isVisible()){finish();return;}
    playerWindow.webContents.send('meo:player:motion',{open:false,presentation:playerPresentation});playerHideTimer=setTimeout(finish,300);
  }
  function revealPlayer(){
    if(!playerOpen||!playerLoaded||suspended||state.mode==='game')return;
    const reset=!playerWindow.isVisible();clearTimeout(playerHideTimer);positionPlayer();playerWindow.show();playerWindow.focus();lastPlayerKey='';publishPlayer();startMedia();playerWindow.webContents.send('meo:player:motion',{open:true,reset,presentation:playerPresentation});
  }
  function togglePlayer(){if(playerOpen)hidePlayer();else openPlayer();}
  function playerVisible(){return playerOpen&&playerWindow?.isVisible();}
  function openPlayer(){
    if(state.mode==='game'||suspended||!desktopSupported)return;
    playerOpen=true;clearTimeout(playerHideTimer);clearTimeout(playerBlurTimer);
    state.target=null;state.action='idle';state.jump=null;playBehavior.affection(state.time);
    if(!playerWindow||playerWindow.isDestroyed()){
      playerLoaded=false;
      playerWindow=new BrowserWindow({width:460,height:256,frame:false,transparent:true,hasShadow:false,resizable:false,show:false,skipTaskbar:true,alwaysOnTop:true,backgroundColor:'#00000000',title:'Mèo · Nhạc của bạn',webPreferences:{preload:path.join(__dirname,'player-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:false}});
      playerMouseIgnored=null;
      playerWindow.setMenu(null);playerWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));playerWindow.webContents.on('will-navigate',event=>event.preventDefault());
      playerWindow.on('close',event=>{if(!quitting){event.preventDefault();hidePlayer();}});
      // A click on the pet belongs to togglePlayer, not outside-click dismissal.
      playerWindow.on('blur',()=>{clearTimeout(playerBlurTimer);playerBlurTimer=setTimeout(()=>{if(!state.interactive&&!state.dragging&&Date.now()-petPressedAt>12000)hidePlayer();},80);});
      playerWindow.on('closed',()=>{playerWindow=null;playerLoaded=false;playerOpen=false;});
      playerWindow.once('ready-to-show',()=>{playerLoaded=true;if(!quitting)revealPlayer();});
      playerWindow.loadFile(path.join(__dirname,'player.html'));return;
    }
    revealPlayer();
  }
  function positionPlayer(){
    const p=currentPlacement(),angle=p.rotation,size=state.size;
    const head={x:p.x+p.anchorX+Math.sin(angle)*size*.8+Math.cos(angle)*state.direction*size*.1,y:p.y+p.anchorY-Math.cos(angle)*size*.8+Math.sin(angle)*state.direction*size*.1};
    playerPresentation=playerLayout(display.workArea,head);playerWindow.setBounds(playerPresentation.window,false);updatePlayerMouse();
  }
  function updatePlayerMouse(){
    if(!playerWindow||playerWindow.isDestroyed()||!playerPresentation)return;
    const cursor=testMode&&global.__meo?.cursor?global.__meo.cursor:screen.getCursorScreenPoint(),bounds=playerPresentation.window,card=playerPresentation.card;
    const x=cursor.x-bounds.x,y=cursor.y-bounds.y,ignored=!playerScrubbing&&!(x>=card.x&&x<=card.x+card.width&&y>=card.y&&y<=card.y+card.height);
    if(ignored!==playerMouseIgnored){if(ignored)playerWindow.setIgnoreMouseEvents(true,{forward:true});else playerWindow.setIgnoreMouseEvents(false);playerMouseIgnored=ignored;}
  }
  function requirePlayer(event){if(!playerWindow||playerWindow.isDestroyed()||!playerVisible()||event.sender.id!==playerWindow.webContents.id)throw new Error('Cửa sổ điều khiển không hợp lệ.');}
  ipcMain.handle('meo:player:get',event=>{if(!playerWindow||event.sender.id!==playerWindow.webContents.id)throw new Error('Cửa sổ không hợp lệ.');return playerSnapshot();});
  ipcMain.handle('meo:player:close',event=>{if(!playerWindow||event.sender.id!==playerWindow.webContents.id)throw new Error('Cửa sổ không hợp lệ.');if(playerOpen)hidePlayer();});
  ipcMain.on('meo:player:scrubbing',(event,active)=>{if(playerWindow&&!playerWindow.isDestroyed()&&event.sender.id===playerWindow.webContents.id){playerScrubbing=active===true&&playerOpen;updatePlayerMouse();}});
  ipcMain.handle('meo:player:command',async(event,value)=>{
    requirePlayer(event);
    const key={play:'canPlay',pause:'canPause',next:'canNext',previous:'canPrevious',seek:'canSeek'}[value?.action];
    const opening=value?.action==='open';
    if(suspended||state.mode==='game'||!mediaData.available||!mediaData.hasSession||(!opening&&(!key||!mediaData[key]))||value.sourceAppId!==mediaData.sourceAppId)throw new Error('Trình phát đã đổi hoặc chưa hỗ trợ thao tác này.');
    if(value.action==='seek'&&(!Number.isFinite(value.position)||value.position<0||value.position>mediaData.duration||!mediaData.duration||value.trackKey!==JSON.stringify([mediaData.sourceAppId,mediaData.title,mediaData.artist])))throw new Error('Bài hát đã đổi hoặc vị trí tua không hợp lệ.');
    await mediaTransport.command(value.action,value.sourceAppId,value.position);return true;
  });
  const mediaDecision=createMediaDecision({onChange:playing=>{state.mediaPlaying=playing;if(state.autoMedia)applyAutomaticMode();}});
  let lastTrackKey='',musicReactionAt=-10;
  function receiveMedia(sample){
    mediaData=decodeMedia(sample);publishPlayer();
    if(mediaData.hasSession&&mediaData.title){const key=JSON.stringify([mediaData.sourceAppId,mediaData.title,mediaData.artist]);if(lastTrackKey&&key!==lastTrackKey&&mediaData.playing&&state.mode==='music'&&!state.paused&&!state.dragging&&state.time-musicReactionAt>1.4)musicReactionAt=state.time;lastTrackKey=key;}
    if(!state.autoMedia)return;
    state.mediaStatus=sample.available?(sample.playing?'playing':'paused'):'unavailable';
    mediaDecision.update(sample);refreshMenu();
  }
  const mediaMonitor=mac?createMacMonitor({kind:'media',onSample:receiveMedia,onError:log}):createMediaMonitor({onSample:receiveMedia,onError:log});
  function startMedia(){if((!state.autoMedia&&!playerWindow?.isVisible())||suspended)return;if(state.autoMedia&&!mediaMonitor.isRunning())state.mediaStatus='connecting';if(!testMode||process.argv.includes('--meo-live-media-test'))mediaMonitor.start();}
  function setAutoMedia(enabled){
    state.autoMedia=!!enabled&&desktopSupported;mediaDecision.reset();state.mediaPlaying=false;
    mediaMonitor.stop();state.mediaStatus=state.autoMedia?'connecting':'off';
    applyAutomaticMode();startMedia();persist();refreshMenu();
  }
  let lastGameSample=null,recentApps=[];
  const gameRules=()=>({games:[...state.customGames,...library.flatMap(g=>g.exes)],ignored:state.ignoredGames});
  const gameDecision=createGameDecision({onChange:game=>{state.gameActive=!!game;state.gameExe=game?.exe||'';if(state.autoGame)applyAutomaticMode();refreshMenu();}});
  function receiveGame(sample){
    lastGameSample=sample;state.gameStatus=sample.available?'ready':'unavailable';
    if(sample.available){
      if(state.lastApp&&Array.isArray(sample.runningPids)&&!sample.runningPids.includes(state.lastApp.pid))state.lastApp=null;
      if(isApp(sample.foreground?.exe)){state.lastApp={exe:exeName(sample.foreground.exe),pid:sample.foreground.pid};appLabels[state.lastApp.exe]=appName(state.lastApp.exe,sample.foreground.displayName||appLabels[state.lastApp.exe]);}
      if(state.lastApp){recentApps=[state.lastApp,...recentApps.filter(a=>a.exe!==state.lastApp.exe)].slice(0,12);}
    }
    if(state.autoGame)gameDecision.update(sample,gameRules());refreshMenu();
  }
  const gameMonitor=mac?createMacMonitor({kind:'game',onSample:receiveGame,onError:log,interval:1500}):createGameMonitor({onSample:receiveGame,onError:log});
  function startGame(){if(suspended||!desktopSupported)return;state.gameStatus='connecting';if(!testMode||process.argv.includes('--meo-live-game-test'))gameMonitor.start();}
  function setAutoGame(enabled){
    state.autoGame=!!enabled&&desktopSupported;gameDecision.reset();state.gameActive=false;state.gameExe='';
    if(state.autoGame&&lastGameSample)gameDecision.update(lastGameSample,gameRules());applyAutomaticMode();persist();refreshMenu();
  }
  function setGameRule(value,kind){
    const exe=exeName(value);if(!isApp(exe)||!['game','ignore','default'].includes(kind))return;
    state.customGames=state.customGames.filter(n=>n!==exe);state.ignoredGames=state.ignoredGames.filter(n=>n!==exe);
    if(kind==='game')state.customGames.push(exe);else if(kind==='ignore')state.ignoredGames.push(exe);
    if(kind==='game')setAutoGame(true);else if(state.autoGame&&lastGameSample)gameDecision.update(lastGameSample,gameRules());
    persist();refreshMenu();
  }
  function note(text,seconds=3){state.toast=text;state.toastUntil=state.time+seconds;}
  function refreshRoute(id=state.displayId){
    const displays=screen.getAllDisplays();display=displays.find(d=>String(d.id)===String(id))||screen.getPrimaryDisplay();
    route=makeRoute(display.workArea);state.displayId=display.id;
    if(state.freePosition){if(String(state.freePosition.displayId)!==String(display.id))state.freePosition=null;else state.freePosition={...constrainPosition(display.workArea,state.freePosition,state.size),displayId:display.id};}
    state.distance=route.bottomLength*.76;state.target=null;state.jump=null;state.dragging=false;lastBounds='';
    if(state.mode==='game')state.distance=Math.max(0,route.bottomLength-24);
    refreshMenu();
  }
  function setMode(mode,{automatic=false}={}){
    if(!modes.includes(mode))return;
    if(!automatic){state.baseMode=mode;state.autoMedia=false;state.mediaStatus='off';state.mediaPlaying=false;mediaDecision.reset();mediaMonitor.stop();state.autoGame=false;state.gameActive=false;state.gameExe='';gameDecision.reset();if(playerWindow?.isVisible())startMedia();}
    const keepDragging=automatic&&state.dragging&&mode!=='game';state.mode=mode;state.jump=null;state.dragging=keepDragging;state.petUntil=0;state.target=null;state.action='idle';
    if(mode==='game'){hidePlayer(true);screenshots?.hide();}
    playBehavior.reset(state.time);
    // Quiet modes rest on the lower edge, with the same screen-safe routing.
    if(mode!=='play'){
      const p=route.point(state.distance);
      state.distance=mode==='game'?Math.max(0,route.bottomLength-24):clamp(p.x-(route.area.x+12+route.radius),0,route.bottomLength);
      state.direction=1;
    }
    state.nextWander=state.time+4;note(modeLabels[mode]);persist();refreshMenu();tickFrame();maintainOverlay(true);
  }
  function setVisible(visible){
    state.visible=!!visible;state.interactive=false;state.dragging=false;
    if(!visible){hidePlayer(true);screenshots?.hide();}
    if(win&&!win.isDestroyed()){syncMouseInput(false,true);if(state.visible&&!suspended&&ready){win.showInactive();}else win.hide();}
    lastTick=0;persist();refreshMenu();
  }
  function setSize(size){if(![80,112,148].includes(size))return;state.size=size;persist();refreshMenu();tickFrame();}
  function setPaused(paused){state.paused=!!paused;state.jump=null;state.dragging=false;state.target=null;state.action='idle';lastTick=0;persist();refreshMenu();tickFrame();}
  function buildMenu(){
    return Menu.buildFromTemplate([
      {label:'Cài đặt…',click:()=>openSettings()},
      {label:'Ứng dụng đã ghim',submenu:pinnedMenu()},
      {label:'Chụp vùng màn hình…',accelerator:'CommandOrControl+Alt+S',enabled:desktopSupported&&state.mode!=='game',click:()=>runDesktopAction(()=>screenshots.capture())},
      {label:'Bỏ ảnh mèo đang giữ',enabled:desktopSupported&&!!screenshots?.snapshot().photos.length,click:()=>screenshots?.clear()},
      {label:audioState.muted?'Bật tiếng hệ thống':'Tắt tiếng hệ thống',enabled:desktopSupported&&state.mode!=='game',click:()=>runDesktopAction(()=>controlAudio('toggle'))},
      {label:state.visible?'Ẩn mèo':'Hiện mèo',click:()=>setVisible(!state.visible)},
      {label:state.paused?'Tiếp tục hoạt ảnh':'Tạm dừng hoạt ảnh',click:()=>setPaused(!state.paused)},
      {type:'separator'},
      {label:'Thoát mèo',click:()=>{quitting=true;app.quit();}}
    ]);
  }
  function settingsSnapshot(){return{updates:updates.snapshot(),startup:startup.snapshot(),pinnedApps:desktopActions.pins().map(pin=>({...pin,icon:pinIcons.get(pin.id)?.toDataURL()||''})),pinSupported:['win32','darwin'].includes(process.platform),version:app.getVersion(),mode:state.mode,baseMode:state.baseMode,visible:state.visible,paused:state.paused,size:state.size,roam:state.roam,follow:state.follow,autoMedia:state.autoMedia,autoGame:state.autoGame,mediaStatus:state.mediaStatus,gameStatus:state.gameStatus,gameActive:state.gameActive,gameName:state.gameExe?(library.find(g=>g.exes.includes(state.gameExe))?.name||appName(state.gameExe,appLabels[state.gameExe])):'',platform:process.platform,shortcut:mac?'⌘ + ⌥ + M':'Ctrl + Alt + M',autoSupported:desktopSupported,displayId:String(display.id),displays:screen.getAllDisplays().map((d,i)=>({id:String(d.id),name:`Màn hình ${i+1} · ${d.size.width} × ${d.size.height}`})),library:library.map(g=>({id:g.id,name:g.name,source:g.source,manual:g.manual})),scanStatus,scanMessage,lastScan};}
  let lastSettingsKey='';
  function publishSettings(){
    if(!settingsWindow||settingsWindow.isDestroyed()||!settingsWindow.isVisible())return;
    const snapshot=settingsSnapshot(),key=JSON.stringify(snapshot);if(key===lastSettingsKey)return;lastSettingsKey=key;settingsWindow.webContents.send('meo:settings:state',snapshot);
  }
  function catIcon(size=64){return nativeImage.createFromPath(path.join(__dirname,'../assets/core.png')).crop({x:53,y:50,width:280,height:292}).resize({width:size,height:size});}
  function openSettings(tab){
    const navigate=()=>{if(['apps','updates'].includes(tab))settingsWindow.webContents.send('meo:settings:navigate',tab);};
    if(settingsWindow&&!settingsWindow.isDestroyed()){if(settingsWindow.isMinimized())settingsWindow.restore();settingsWindow.show();settingsWindow.focus();lastSettingsKey='';publishSettings();if(settingsWindow.webContents.isLoading())settingsWindow.webContents.once('did-finish-load',navigate);else navigate();return;}
    const area=screen.getPrimaryDisplay().workArea;
    settingsWindow=new BrowserWindow({width:Math.min(980,area.width-40),height:Math.min(760,area.height-40),minWidth:Math.min(760,area.width-40),minHeight:Math.min(570,area.height-40),show:false,autoHideMenuBar:true,title:'Mèo Desktop — Cài đặt',icon:catIcon(),backgroundColor:'#f7f5ef',webPreferences:{preload:path.join(__dirname,'settings-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:false}});
    settingsWindow.setMenu(null);settingsWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));settingsWindow.webContents.on('will-navigate',event=>event.preventDefault());
    settingsWindow.once('ready-to-show',()=>{settingsWindow.show();settingsWindow.focus();});settingsWindow.webContents.once('did-finish-load',navigate);
    settingsWindow.on('show',()=>{startup.refresh();lastSettingsKey='';publishSettings();});
    settingsWindow.on('focus',()=>{startup.refresh();publishSettings();});
    settingsWindow.on('close',event=>{if(!quitting){event.preventDefault();settingsWindow.hide();}});
    settingsWindow.on('closed',()=>{settingsWindow=null;});
    settingsWindow.loadFile(path.join(__dirname,'settings.html'));
  }
  function validSettings(event){return settingsWindow&&!settingsWindow.isDestroyed()&&event.sender.id===settingsWindow.webContents.id;}
  function requireSettings(event){if(!validSettings(event))throw new Error('Cửa sổ không hợp lệ.');}
  ipcMain.handle('meo:settings:get',event=>{requireSettings(event);startup.refresh();return settingsSnapshot();});
  ipcMain.handle('meo:settings:updates',(event,action)=>{requireSettings(event);return updates.action(action).then(()=>settingsSnapshot());});
  ipcMain.handle('meo:settings:update',async(event,patch)=>{
    requireSettings(event);if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).length!==1)throw new Error('Thiết lập không hợp lệ.');
    const [key,value]=Object.entries(patch)[0];
    if(key==='startAtLogin'){await startup.set(value);publishSettings();return settingsSnapshot();}
    if(['visible','paused','roam','follow','autoMedia','autoGame'].includes(key)){
      if(typeof value!=='boolean')throw new Error('Giá trị không hợp lệ.');
      if(key==='visible')setVisible(value);else if(key==='paused')setPaused(value);else if(key==='autoMedia')setAutoMedia(value);else if(key==='autoGame')setAutoGame(value);else{state[key]=value;state.target=null;}
    }else if(key==='size'&&[80,112,148].includes(value))setSize(value);
    else if(key==='mode'&&modes.includes(value))setMode(value);
    else if(key==='displayId'&&screen.getAllDisplays().some(d=>String(d.id)===String(value))){refreshRoute(value);tickFrame();}
    else throw new Error('Thiết lập không được hỗ trợ.');
    clearTimeout(persistTimer);if(!saveSettings())throw new Error('Chưa lưu được thiết lập.');refreshMenu();return settingsSnapshot();
  });
  ipcMain.handle('meo:settings:rule',(event,value)=>{requireSettings(event);if(!value||!isApp(value.id)||!['game','ignore','default'].includes(value.kind))throw new Error('Quy tắc không hợp lệ.');setGameRule(value.id,value.kind);clearTimeout(persistTimer);if(!saveSettings())throw new Error('Chưa lưu được quy tắc.');refreshMenu();return settingsSnapshot();});
  ipcMain.handle('meo:settings:library',async(event,value)=>{
    requireSettings(event);
    if(value?.action==='scan'){await scanGames();return settingsSnapshot();}
    if(value?.action==='add'){
      if(!desktopSupported)throw new Error('Chưa hỗ trợ trên hệ điều hành này.');
      const picked=await dialog.showOpenDialog(settingsWindow,{title:'Chọn file chạy của game',buttonLabel:'Thêm game',properties:['openFile'],filters:mac?[{name:'Game macOS',extensions:['app']}]:[{name:'Game Windows',extensions:['exe']}]});
      if(picked.canceled||!picked.filePaths[0])return settingsSnapshot();
      const location=picked.filePaths[0],exe=exeName(location);
      if(!exe||!isApp(exe)||!(mac?fs.statSync(location).isDirectory():fs.statSync(location).isFile()))throw new Error(mac?'Hãy chọn ứng dụng .app của game.':'Hãy chọn file .exe của game.');
      if(library.some(g=>g.exes.includes(exe)))return settingsSnapshot();
      if(library.length>=300)throw new Error('Thư viện đã có 300 game. Hãy gỡ bớt trước khi thêm.');
      const game={id:idFor(location),name:mac?path.basename(location,'.app'):appName(exe),source:'Thêm thủ công',manual:true,location,exes:[exe]};
      const previous=library;library=[...library,game];try{saveLibrary();}catch(error){library=previous;throw error;}
      state.ignoredGames=state.ignoredGames.filter(e=>e!==exe);persist();refreshLibraryDetection();return settingsSnapshot();
    }
    if(value?.action==='remove'&&typeof value.id==='string'){
      const game=library.find(g=>g.id===value.id);if(!game)throw new Error('Game không còn trong thư viện.');
      const previous=library,oldExcluded=excludedGames;
      library=library.filter(g=>g.id!==value.id);excludedGames=[...new Set([...excludedGames,game.id])].slice(-500);
      try{saveLibrary();}catch(error){library=previous;excludedGames=oldExcluded;throw error;}
      refreshLibraryDetection();return settingsSnapshot();
    }
    throw new Error('Thao tác thư viện không hợp lệ.');
  });
  ipcMain.handle('meo:settings:pins',async(event,value)=>{
    requireSettings(event);
    if(value?.action==='add'){
      if(!['win32','darwin'].includes(process.platform))throw new Error('Ghim ứng dụng hiện hỗ trợ Windows và macOS.');
      const picked=await dialog.showOpenDialog(settingsWindow,{title:'Chọn ứng dụng muốn ghim',buttonLabel:'Ghim ứng dụng',properties:['openFile'],filters:process.platform==='win32'?[{name:'Ứng dụng hoặc lối tắt',extensions:['exe','lnk']}]:[{name:'Ứng dụng macOS',extensions:['app']}]});
      if(!picked.canceled&&picked.filePaths[0])desktopActions.pin(picked.filePaths[0]);
    }else if(value?.action==='remove'&&typeof value.id==='string')desktopActions.remove(value.id);
    else if(value?.action==='open'&&typeof value.id==='string')await desktopActions.launch(value.id);
    else throw new Error('Thao tác ứng dụng ghim không hợp lệ.');
    lastMenuKey='';refreshMenu();await refreshPinIcons();return settingsSnapshot();
  });
  ipcMain.handle('meo:settings:action',(event,value)=>{
    requireSettings(event);if(value==='close')settingsWindow.hide();else if(value==='music')openPlayer();else if(value==='home'){state.freePosition=null;state.jump=null;state.dragging=false;state.target=null;state.distance=route.bottomLength*.76;setVisible(true);note('Mình ở đây!');tickFrame();}else throw new Error('Thao tác không hợp lệ.');return settingsSnapshot();
  });
  function refreshMenu(){
    publishSettings();
    if(!tray||tray.isDestroyed())return;
    const key=JSON.stringify([state.visible,state.paused,audioState.muted,screenshots?.snapshot().photos.length,desktopActions.pins()]);
    if(key===lastMenuKey)return;lastMenuKey=key;
    tray.setContextMenu(buildMenu());tray.setToolTip('Mèo Desktop');
  }
  function popup(){if(win&&!win.isDestroyed())buildMenu().popup({window:win,callback:()=>syncMouseInput(false,true)});}
  function pet(){if(state.paused||state.mode==='game')return;state.petUntil=state.time+2.3;state.target=null;state.jump=null;state.action='pet';state.actionStart=state.time;state.nextWander=state.time+5;playBehavior.affection(state.time);}
  function startJump(destination){state.jump={from:state.distance,to:destination,start:state.time,duration:1.12};state.action='pounce';state.actionStart=state.time;state.nextPounce=state.time+6;state.nextWander=state.time+5;}
  function moveToward(target,dt,speed){
    const difference=route.delta(state.distance,target);
    if(Math.abs(difference)<2){state.distance=wrap(target,route.total);state.target=null;state.action='idle';return;}
    state.direction=Math.sign(difference);
    state.distance=wrap(state.distance+state.direction*Math.min(Math.abs(difference),speed*dt),route.total);
    if(state.action!=='walk')state.actionStart=state.time;
    state.action='walk';
  }
  function advance(dt,cursor){
    if(suspended)return;
    if(!state.paused)state.time+=dt;
    if(screenshots?.isBusy()||fileMenuOpen||Date.now()<fileHoverUntil||playerVisible()||playerWindow?.isVisible()){state.target=null;state.action='idle';return;}
    if(state.dragging){
      if(Date.now()-state.dragAt>12000){state.dragging=false;return;}
      const nextDisplay=screen.getDisplayNearestPoint(cursor);
      if(nextDisplay.id!==display.id){refreshRoute(nextDisplay.id);state.dragging=true;state.dragAt=Date.now();}
      state.freePosition={...constrainPosition(display.workArea,{x:cursor.x-dragOffset.x,y:cursor.y-dragOffset.y},state.size),displayId:display.id};state.distance=route.nearest(state.freePosition).distance;state.action='idle';state.target=null;return;
    }
    if(state.paused)return;
    if(state.jump){
      const p=(state.time-state.jump.start)/state.jump.duration;
      if(p>.18){const f=clamp((p-.18)/.47,0,1),ease=f*f*(3-2*f);state.distance=wrap(state.jump.from+route.delta(state.jump.from,state.jump.to)*ease,route.total);}
      if(p>=1){state.jump=null;state.action='idle';state.target=null;playBehavior.landed(state.time);}
      return;
    }
    if(state.time<state.petUntil){state.action='pet';return;}
    if(state.freePosition){state.action='idle';return;}
    if(state.mode!=='play'){state.action='idle';return;}
    const projected=route.nearest(cursor),difference=route.delta(state.distance,projected.distance);
    const near=state.follow&&projected.separation<state.size*1.45&&Math.abs(difference)<420;
    const behavior=playBehavior.update({now:state.time,near,difference,interactive:state.interactive,follow:state.follow,roam:state.roam});
    if(behavior){
      state.target=null;
      if(behavior.kind==='jump'){state.direction=Math.sign(difference||state.direction);startJump(wrap(projected.distance+state.direction*behavior.overshoot,route.total));}
      else{state.action=behavior.kind;state.actionStart=state.time-behavior.elapsed;if(behavior.kind==='stalk')state.direction=Math.sign(difference||state.direction);}
      state.nextWander=state.time+3;return;
    }
    if(state.follow&&projected.separation<state.size*1.45&&Math.abs(difference)<420&&!state.interactive){
      const followDistance=wrap(projected.distance-Math.sign(difference||state.direction)*state.size*.28,route.total);
      state.nextWander=state.time+4;
      state.target=followDistance;
    }else if(state.interactive){state.target=null;state.action='idle';state.nextWander=state.time+2;return;}
    else if(state.time>state.nextWander&&state.roam){
      const distance=180+Math.random()*240;
      state.target=wrap(state.distance+(Math.random()>.35?state.direction:-state.direction)*distance,route.total);
      state.nextWander=state.time+8+Math.random()*5;
    }
    if(state.target!==null)moveToward(state.target,dt,state.follow&&projected.separation<140?100:58);
    else state.action='idle';
  }
  function frameData(cursor){
    const placement=currentPlacement();
    return {audio:audioState,audioFeedback:Date.now()<audioFeedbackUntil,fileHover:Date.now()<fileHoverUntil,musicReactionElapsed:state.mode==='music'&&!state.paused&&!state.dragging&&state.time-musicReactionAt<1.15?state.time-musicReactionAt:null,time:state.time,mode:state.mode,size:state.mode==='game'?70:state.size,direction:state.direction,action:state.action,actionElapsed:state.time-state.actionStart,jumpPhase:state.jump?(state.time-state.jump.start)/state.jump.duration:null,pet:state.time<state.petUntil,paused:state.paused,dragging:state.dragging,toast:state.mode!=='game'&&state.time<state.toastUntil?state.toast:'',...placement,cursor:{x:cursor.x-placement.x,y:cursor.y-placement.y}};
  }
  function tickFrame(){
    if(!win||win.isDestroyed()||!ready||!state.visible||suspended||screenshots?.isCapturing())return;
    const cursor=testMode&&global.__meo?.cursor?global.__meo.cursor:screen.getCursorScreenPoint();
    const f=frameData(cursor),bounds={x:f.x,y:f.y,width:f.width,height:f.height},key=JSON.stringify(bounds);
    if(key!==lastBounds){win.setBounds(bounds,false);lastBounds=key;}
    win.webContents.send('meo:frame',f);
  }
  function loop(){
    const now=performance.now()/1000,dt=lastTick?Math.min(.1,now-lastTick):0;lastTick=now;
    if(ready&&state.visible&&!suspended){
      const cursor=testMode&&global.__meo?.cursor?global.__meo.cursor:screen.getCursorScreenPoint();advance(dt,cursor);tickFrame();
      maintainOverlay();
      if(playerWindow?.isVisible())updatePlayerMouse();
      syncMouseInput(state.interactive||state.dragging);
      if(state.interactive&&!state.dragging&&Date.now()-lastHitAt>700)syncMouseInput(false,true);
    }
    timer=setTimeout(loop,!state.visible||suspended?250:state.mode==='game'||state.paused?80:33);
  }
  function createWindow(){
    ready=false;lastBounds='';nativeMouseState=null;state.interactive=false;
    win=new BrowserWindow({width:320,height:320,show:false,frame:false,transparent:true,backgroundColor:'#00000000',hasShadow:false,resizable:false,movable:false,minimizable:false,maximizable:false,fullscreenable:false,skipTaskbar:true,focusable:true,alwaysOnTop:true,title:'Mèo Desktop',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,spellcheck:false}});
    win.setMenu(null);syncMouseInput(false,true);win.setAlwaysOnTop(true,'floating');win.on('focus',()=>maintainOverlay(true));
    if(process.platform==='darwin')win.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    win.webContents.on('will-navigate',event=>event.preventDefault());
    win.webContents.on('render-process-gone',(_event,details)=>{log('Renderer stopped: '+details.reason);if(!quitting){win.destroy();setTimeout(createWindow,300);}});
    win.webContents.on('did-fail-load',(_e,code,description)=>log(`Load failure ${code}: ${description}`));
    win.on('closed',()=>{ready=false;});
    win.loadFile(path.join(__dirname,'pet.html'));
  }
  function valid(event){return win&&!win.isDestroyed()&&event.sender.id===win.webContents.id;}
  ipcMain.on('meo:files:hover',(event,active)=>{if(!valid(event))return;fileHoverUntil=active===true&&state.mode!=='game'?Date.now()+1200:0;if(fileHoverUntil){state.target=null;state.jump=null;syncMouseInput(true,true);}tickFrame();});
  ipcMain.handle('meo:files:drop',(event,paths)=>{if(!valid(event))throw new Error('Cửa sổ không hợp lệ.');try{return acceptDroppedFiles(paths);}catch(error){fileHoverUntil=0;note(error.message);throw error;}});
  ipcMain.on('meo:ready',event=>{if(!valid(event))return;ready=true;tickFrame();if(state.visible&&!suspended){win.showInactive();}maintainOverlay(true);});
  ipcMain.on('meo:hit',(event,hit)=>{
    if(!valid(event)||typeof hit!=='boolean')return;lastHitAt=Date.now();if(state.mode==='game')hit=false;
    syncMouseInput(hit||state.dragging);
  });
  ipcMain.on('meo:action',(event,value)=>{
    if(!valid(event))return;
    if(value==='press'){petPressedAt=Date.now();const cursor=testMode&&global.__meo?.cursor?global.__meo.cursor:screen.getCursorScreenPoint(),placement=currentPlacement();dragOffset={x:cursor.x-placement.x-placement.anchorX,y:cursor.y-placement.y-placement.anchorY};clearTimeout(playerBlurTimer);}
    else if(value==='menu')popup();else if(value==='pet'){petPressedAt=0;if(playerOpen||state.mode==='music'||(state.autoMedia&&mediaData.hasSession&&state.mode!=='game'))togglePlayer();else pet();}
    else if(value==='drag-start'){petPressedAt=0;if(state.mode==='game')return;if(playerOpen)hidePlayer(true);playBehavior.affection(state.time);state.dragging=true;state.dragAt=Date.now();state.jump=null;state.action='idle';syncMouseInput(true,true);}
    else if(value==='drag-end'){petPressedAt=0;state.dragging=false;if(state.freePosition){const nearest=route.nearest(state.freePosition);if(nearest.separation<24){state.distance=nearest.distance;state.freePosition=null;}}state.nextWander=state.time+4;persist();}
    else if(value==='error')log('Renderer could not load character assets');
  });
  app.whenReady().then(()=>{
    if(process.argv.includes('--meo-quit')){quitting=true;app.quit();return;}
    if(process.platform==='win32')app.setAppUserModelId('vn.meo.desktop');
    startup.refresh();
    if(mac){app.dock?.hide();Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Mèo Desktop',submenu:[{role:'about'},{type:'separator'},{label:'Cài đặt…',accelerator:'Command+,',click:()=>openSettings()},{type:'separator'},{role:'quit'}]},{role:'editMenu'}]));}
    refreshRoute();createWindow();
    screenshots=createScreenshotFeature({electron:require('electron'),getPet:()=>win,getPlacement:currentPlacement,getWindows:()=>[win,playerWindow,settingsWindow],canUse:()=>state.visible&&!suspended&&state.mode!=='game'&&!quitting,onStatus:text=>{note(text);lastMenuKey='';refreshMenu();},onCapture:()=>{hidePlayer(true);state.target=null;state.jump=null;state.action='idle';},testMode});
    const icon=nativeImage.createFromPath(path.join(__dirname,'../assets/core.png')).crop({x:53,y:50,width:280,height:292}).resize({height:24});
    tray=new Tray(icon);refreshMenu();refreshPinIcons();tray.on('double-click',()=>openSettings());
    globalShortcut.register('CommandOrControl+Alt+M',()=>setVisible(!state.visible));
    if(desktopSupported)globalShortcut.register('CommandOrControl+Alt+S',()=>runDesktopAction(()=>screenshots.capture()));
    for(const event of ['display-added','display-removed','display-metrics-changed'])screen.on(event,()=>{refreshRoute(display.id);tickFrame();});
    const sleep=()=>{suspended=true;screenshots?.hide();hidePlayer(true);audioControl.stop();mediaTransport.stop();mediaMonitor.stop();gameMonitor.stop();win?.hide();};
    const wake=()=>{suspended=false;if(!testMode)audioControl.start();lastTick=0;startMedia();startGame();if(state.visible&&ready)win.showInactive();};
    powerMonitor.on('suspend',sleep);powerMonitor.on('resume',wake);
    powerMonitor.on('lock-screen',sleep);powerMonitor.on('unlock-screen',wake);
    if(testMode)global.__meo={cursor:null,window:()=>win,setMode,setSize,setVisible,setPaused,setAutoMedia,receiveMedia,setAutoGame,receiveGame,setGameRule,gamePid:()=>gameMonitor.pid(),mediaPid:()=>mediaMonitor.pid(),route:()=>route,state:()=>({...state,ready,display:{id:display.id,workArea:display.workArea},bounds:win.getBounds(),visible:win.isVisible(),alwaysOnTop:win.isAlwaysOnTop(),focusable:win.isFocusable()}),move:s=>{state.freePosition=null;state.distance=wrap(s,route.total);state.target=null;state.jump=null;state.action='idle';tickFrame();},menu:()=>buildMenu().items.map(i=>i.label),drag:value=>{state.dragging=value;state.dragAt=Date.now();},shutdown:()=>{quitting=true;app.quit();}};
    if(testMode)Object.assign(global.__meo,{updates,screenshots,audioControl,receiveAudio,desktopActions,acceptDroppedFiles,fileMenuTemplate,pinnedMenu,refreshPinIcons,openSettings,settingsSnapshot,settingsWindow:()=>settingsWindow});
    if(testMode)Object.assign(global.__meo,{overlay:()=>({raises:overlayRaises}),advancePlay:seconds=>{for(let t=0;t<seconds;t+=.05)advance(.05,{x:-10000,y:-10000});tickFrame();}});
    if(testMode)Object.assign(global.__meo,{placeFree:point=>{state.freePosition={...constrainPosition(display.workArea,point,state.size),displayId:display.id};state.target=null;state.jump=null;tickFrame();},openPlayer,togglePlayer,playerWindow:()=>playerWindow,playerState:()=>({open:playerOpen,loaded:playerLoaded}),playerSnapshot,mediaTransport});
    startMedia();startGame();if(!testMode)audioControl.start();
    if(!testMode)scanGames();
    updates.start();
    loop();
    if(!testMode&&!startsInBackground(process.argv))openSettings();
  }).catch(error=>{log(error.stack||error.message);app.quit();});
  app.on('second-instance',(_event,argv)=>{if(argv.includes('--meo-quit')){quitting=true;app.quit();return;}if(!startsInBackground(argv))openSettings();});
  app.on('activate',()=>{if(app.isReady())openSettings();});
  app.on('window-all-closed',()=>{});
  app.on('before-quit',()=>{quitting=true;updates.dispose();screenshots?.dispose();clearTimeout(timer);clearTimeout(persistTimer);clearTimeout(playerHideTimer);clearTimeout(playerBlurTimer);mediaTransport.stop();mediaMonitor.stop();mediaDecision.reset();gameMonitor.stop();gameDecision.reset();audioControl.stop();if(display)saveSettings();globalShortcut.unregisterAll();tray?.destroy();});
}
