const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {scanLibrary,executables,parseVdf,validLibrary,idFor}=require('../src/library.cjs');
const {candidate}=require('../src/game.cjs');
test('Steam secondary libraries, Epic and Windows installs are discovered, deduplicated and usable by game detector',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'meo-library-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const steam=path.join(root,'Steam'),secondary=path.join(root,'Other library'),data=path.join(root,'Data');
  const write=async(file,text='fixture, never executed')=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,text);};
  await write(path.join(steam,'steamapps/libraryfolders.vdf'),`"libraryfolders" { "0" { "path" "${secondary.replaceAll('\\','\\\\')}" } }`);
  await write(path.join(secondary,'steamapps/appmanifest_9.acf'),'"AppState" { "appid" "9" "name" "Cozy Farm" "installdir" "Cozy Farm" }');
  const gameRoot=path.join(secondary,'steamapps/common/Cozy Farm');
  await write(path.join(gameRoot,'Binaries/Win64/cozy-win64-shipping.exe'));
  await write(path.join(gameRoot,'CrashReportClient.exe'));await write(path.join(gameRoot,'_CommonRedist/setup.exe'));
  const epicRoot=path.join(root,'Epic game');await write(path.join(epicRoot,'epic-fixture.exe'));
  await write(path.join(data,'Epic/EpicGamesLauncher/Data/Manifests/sample.item'),JSON.stringify({DisplayName:'Epic Fixture',InstallLocation:epicRoot}));
  await write(path.join(data,'Epic/EpicGamesLauncher/Data/Manifests/broken.item'),'not json');
  const result=await scanLibrary({env:{'ProgramFiles(x86)':root,ProgramData:data},inventory:{steamRoots:[steam],games:[{name:'Duplicate',location:gameRoot,source:'Windows'},{name:'Uninstalled',location:path.join(root,'missing')}]}});
  assert.equal(result.games.length,2);assert.equal(result.partial,false);
  const cozy=result.games.find(g=>g.name==='Cozy Farm');assert.equal(cozy.source,'Steam');assert.deepEqual(cozy.exes,['cozy-win64-shipping.exe']);
  assert.equal(candidate({available:true,foreground:{exe:cozy.exes[0],pid:99}},{games:cozy.exes}).sticky,true);
  assert.deepEqual(validLibrary(result.games),result.games);
  assert.equal(parseVdf('"name" "Mèo \\"nhỏ\\""')[0][1],'Mèo "nhỏ"');
  assert.equal(idFor(gameRoot),idFor(gameRoot));
});
test('bounded traversal reports partial results and rejects malformed persisted entries',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'meo-library-depth-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.mkdir(path.join(root,'deep/deeper'),{recursive:true});await fs.writeFile(path.join(root,'deep/deeper/game.exe'),'fixture');
  assert.equal((await executables(root,{maxDepth:0})).truncated,true);
  assert.deepEqual(validLibrary([{id:'bad',name:'bad',exes:['a.exe']},null]),[]);
});
