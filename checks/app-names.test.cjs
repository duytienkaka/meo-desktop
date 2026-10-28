const {test}=require('node:test');
const assert=require('node:assert/strict');
const {appName}=require('../src/app-names.cjs');
test('Windows application description takes precedence over executable filename',()=>{assert.equal(appName('ChatGPT.exe','Codex'),'Codex');assert.equal(appName('cs2.exe','Counter-Strike 2'),'Counter-Strike 2');});
test('Raw executable names and generic runtime descriptions get readable labels',()=>{assert.equal(appName('gpt.exe'),'ChatGPT');assert.equal(appName('ChatGPT.exe','ChatGPT.exe'),'ChatGPT');assert.equal(appName('cs2.exe','Electron'),'Counter-Strike 2');assert.equal(appName('my-indie-game.exe'),'my indie game');});
test('Display labels remove control characters and remain bounded',()=>{assert.equal(appName('game.exe','Example\u0000Game'),'ExampleGame');assert.ok(appName('game.exe','A'.repeat(300)).length<=100);});
