const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {createMediaMonitor,createMediaTransport}=require('../src/media.cjs');
let fixture,monitor,transport;
(async()=>{
 const wav=path.join(__dirname,'silent-fixture.wav'),buffer=Buffer.alloc(44+160000);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(8000,24);buffer.writeUInt32LE(16000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(160000,40);fs.writeFileSync(wav,buffer);
 fixture=spawn(path.join(__dirname,'MeoMediaFixture.exe'),[pathToFileURL(wav).href,String(process.pid),path.join(__dirname,'fixture-art.png')],{windowsHide:true,stdio:['ignore','pipe','pipe']});let messages='',diagnostic='';fixture.stdout.on('data',d=>messages+=d);fixture.stderr.on('data',d=>diagnostic+=d);
 const until=async(check,timeout=10000)=>{const deadline=Date.now()+timeout;while(!check()){if(fixture.exitCode!==null)throw new Error('Fixture exited: '+diagnostic);if(Date.now()>deadline)throw new Error('Fixture timeout: '+diagnostic);await new Promise(r=>setTimeout(r,100));}};
 await until(()=>messages.includes('ready'));
 let source='',artwork='',duration=0;monitor=createMediaMonitor({onSample:value=>{if(value.title?.startsWith('Meo native fixture ')){source=value.sourceAppId;artwork=value.artwork;duration=value.duration;}}});monitor.start();await until(()=>!!source&&!!artwork&&duration>0);
 transport=createMediaTransport();
 for(const action of ['pause','play','next','previous']){const before=messages.length;await transport.command(action,source);await until(()=>messages.slice(before).includes(action));}
 monitor.stop();transport.stop();const exited=new Promise(resolve=>fixture.once('exit',resolve));fixture.kill();await exited;fixture=null;fs.unlinkSync(wav);fs.unlinkSync(path.join(__dirname,'fixture-art.png'));
 const result={passed:true,realWindowsTransport:true,userPlayerControlled:false,checks:['muted local media fixture','Windows album art and timeline read','Windows play and pause received','Windows next and previous received','commands targeted only the fixture session','helper cleanup']};fs.writeFileSync(path.join(__dirname,'native-player-report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(error=>{console.error(error);monitor?.stop();transport?.stop();fixture?.kill();process.exitCode=1;});
