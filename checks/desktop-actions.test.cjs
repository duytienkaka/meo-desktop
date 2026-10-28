const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createDesktopActions}=require('../src/desktop-actions.cjs');
function fixture(t,platform='win32'){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'meo-actions-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const calls=[];
 const shell={openPath:async p=>{calls.push(['open',p]);return '';},showItemInFolder:p=>calls.push(['reveal',p])},clipboard={writeText:p=>calls.push(['copy',p])};
 const build=()=>createDesktopActions({directory:path.join(root,'data'),shell,clipboard,platform}),actions=build();
 const file=name=>{const p=path.join(root,name);fs.writeFileSync(p,'test');return p;};return {root,actions,calls,shell,build,file};
}
test('pins persist, deduplicate, launch only known apps, and removal leaves files untouched',async t=>{
 const f=fixture(t),app=f.file('Công cụ & Notes.exe'),shortcut=f.file('Nhạc.lnk'),pin=f.actions.pin(app);
 assert.equal(pin.name,'Công cụ & Notes');assert.equal(f.actions.pin(app).id,pin.id);f.actions.pin(shortcut);assert.equal(f.actions.pins().length,2);assert.deepEqual(f.build().pins(),f.actions.pins());
 await f.actions.launch(pin.id);assert.deepEqual(f.calls,[['open',app]]);await assert.rejects(f.actions.launch('unknown'));
 f.actions.remove(pin.id);assert.equal(fs.existsSync(app),true);await assert.rejects(f.actions.launch(pin.id));assert.throws(()=>f.actions.pin(f.file('document.txt')));
 fs.unlinkSync(shortcut);await assert.rejects(f.build().launch(f.actions.pins()[0].id));
});
test('file actions preserve exact paths, handle folders and batches, and report failures',async t=>{
 const f=fixture(t),first=f.file('Tiếng Việt & spaces.txt'),second=f.file('other.png');
 assert.deepEqual(f.actions.dropped([first,first,second]),[first,second]);await f.actions.open(first);f.actions.reveal(first);f.actions.copy([first,second]);await f.actions.open(f.root);
 assert.deepEqual(f.calls,[['open',first],['reveal',first],['copy',first+'\r\n'+second],['open',f.root]]);
 for(const value of [[],Array(21).fill(first),['https://example.com/file'],['relative.txt'],[first+'\n']])assert.throws(()=>f.actions.dropped(value));
 fs.unlinkSync(first);assert.throws(()=>f.actions.copy([first]));await assert.rejects(f.actions.open(first));
 f.shell.openPath=async()=> 'No application';await assert.rejects(f.actions.open(second),/Chưa mở/);
});
test('macOS app bundles can be pinned and failed saves do not change the list',t=>{
 const f=fixture(t,'darwin'),bundle=path.join(f.root,'Studio.app');fs.mkdirSync(bundle);assert.equal(f.actions.pin(bundle).name,'Studio');
 const second=path.join(f.root,'Other.app');fs.mkdirSync(second);fs.mkdirSync(path.join(f.root,'data','pinned-apps.json.tmp'));
 assert.throws(()=>f.actions.pin(second));assert.equal(f.actions.pins().length,1);assert.throws(()=>f.actions.pin(f.file('program.exe')));
});
