const {test}=require('node:test'),assert=require('node:assert/strict'),{parseLyrics,createLyrics}=require('../src/lyrics.cjs');
test('LRC parser sorts timestamps, supports repeated tags, and rejects malformed times',()=>{
 const p=parseLyrics({syncedLyrics:'[00:12.50]second\n[00:01][00:03.2]first\n[01:99]invalid'});assert.deepEqual(p.lines.map(l=>l.time),[1,3.2,12.5]);assert.equal(p.synced,true);assert.equal(parseLyrics({instrumental:true}).status,'instrumental');assert.equal(parseLyrics({plainLyrics:'hello\nworld'}).synced,false);
});
test('lyrics requests deduplicate, cache results, identify the client and preserve track identity',async()=>{
 let calls=0;const lyrics=createLyrics({fetcher:async(url,options)=>{calls++;assert.match(url,/track_name=Title/);assert.match(options.headers['User-Agent'],/MeoDesktop/);return{ok:true,text:async()=>JSON.stringify({plainLyrics:'fixture'})};}}),track={hasSession:true,title:'Title',artist:'Artist',sourceAppId:'Spotify',duration:120};
 const [a,b]=await Promise.all([lyrics.get(track),lyrics.get(track)]);assert.equal(calls,1);assert.equal(a.status,'ready');assert.equal(a.trackKey,b.trackKey);await lyrics.get({...track,sourceAppId:'Other'});assert.equal(calls,1);
});
test('missing metadata never leaves device and Retry-After prevents more requests',async()=>{
 let calls=0,time=0;const lyrics=createLyrics({now:()=>time,fetcher:async()=>{calls++;return {status:429,headers:{get:()=> '120'}};}});await lyrics.get({hasSession:false});assert.equal(calls,0);await lyrics.get({hasSession:true,title:'A',artist:'B'});time=40000;await lyrics.get({hasSession:true,title:'C',artist:'D'});assert.equal(calls,1);
});
