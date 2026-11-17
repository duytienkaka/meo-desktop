const assert = require('node:assert/strict');
const path = require('node:path');
const { _electron } = require('playwright');

async function run() {
  const root = path.resolve(__dirname, '..');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const executable = process.env.MEO_EXECUTABLE || (process.platform === 'win32'
    ? path.join(root, '.cache/electron-dist-45.0.0-win32-x64/electron.exe') : require('electron'));
  const app = await _electron.launch({
    executablePath: executable,
    args: process.env.MEO_EXECUTABLE ? ['--meo-test'] : [root, '--meo-test'], env
  });
  try {
    const page = await app.firstWindow();
    page.setDefaultTimeout(6000);
    const errors=[];
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForFunction(() => window.meoPet?.snapshot().frame);
    await app.evaluate(() => {
      global.__meo.setMode('music');
      global.__meo.setPaused(false);
      global.__meo.placeFree({ x:500, y:400 });
      global.__meo.cursor = { x:50, y:50 };
    });
    await page.waitForFunction(() => {
      const {frame} = window.meoPet.snapshot();
      return frame.mode === 'music' && frame.x + frame.anchorX === 500 && frame.y + frame.anchorY === 400;
    });
    const head = await page.evaluate(() => {
      const {frame, displaySize} = window.meoPet.snapshot();
      return {x: frame.x + frame.anchorX, y: frame.y + frame.anchorY - displaySize * 0.72};
    });
    async function hover(x,y) {
      const point = {x:Math.round(x), y:Math.round(y)};
      await app.evaluate((_, cursor) => { global.__meo.cursor = cursor; }, point);
      await page.waitForFunction(cursor => {
        const {frame} = window.meoPet.snapshot();
        return frame.cursor.x + frame.x === cursor.x && frame.cursor.y + frame.y === cursor.y;
      }, point);
    }
    for(let x=-40;x<=20;x+=10) await hover(head.x+x,head.y);
    assert.equal(await page.evaluate(() => window.meoPet.snapshot().rubbing), false);
    for(let step=1;step<=20;step++){
      const angle=step*Math.PI/10;
      await hover(head.x+20*Math.cos(angle),head.y+20*Math.sin(angle));
    }
    await page.waitForFunction(() => {
      const {rubbing, renderedPose, frame} = window.meoPet.snapshot();
      return rubbing && !frame.dragging && renderedPose.sheet === 'head-rub';
    });
    assert.equal(await app.evaluate(() => global.__meo.playerState().open), false);
    await hover(50,50);
    await page.waitForFunction(() => !window.meoPet.snapshot().rubbing && !window.meoPet.snapshot().frame.pet);
    // Lower body/tail is outside the previous head-only circle.
    await page.waitForTimeout(800); // Allow the remainder of the 3-second cooldown.
    const body=await page.evaluate(()=>{
      const {frame,displaySize}=window.meoPet.snapshot();
      return {x:frame.x+frame.anchorX-displaySize*.4,y:frame.y+frame.anchorY-displaySize*.12};
    });
    for(let step=0;step<=20;step++){
      const angle=step*Math.PI/10;
      await hover(body.x+12*Math.cos(angle),body.y+12*Math.sin(angle));
    }
    await page.waitForFunction(()=>window.meoPet.snapshot().rubbing);
    await hover(50,50);
    await page.waitForFunction(()=>!window.meoPet.snapshot().rubbing&&!window.meoPet.snapshot().frame.pet);
    const point = await page.evaluate(() => {
      const {frame,displaySize} = window.meoPet.snapshot();
      const x = Math.round(frame.anchorX), y = Math.round(frame.anchorY - displaySize * 0.6);
      if (!window.meoPet.hitAt({x,y})) throw Error('Test point missed the cat');
      return {x,y};
    });
    for (const direction of [-1, 1]) {
      await app.evaluate((_, point) => {
        const bounds = global.__meo.window().getBounds();
        global.__meo.cursor = {x:bounds.x + point.x, y:bounds.y + point.y};
      }, point);
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      for (let step = 1; step <= 24; step++) {
        const angle = direction * step * Math.PI / 12;
        await page.mouse.move(point.x + 13 * (Math.cos(angle) - 1), point.y + 13 * Math.sin(angle));
      }
      await page.waitForFunction(() => {
        const {rubbing,renderedPose,frame} = window.meoPet.snapshot();
        return rubbing && !frame.dragging && renderedPose.sheet === 'head-rub';
      });
      const rows = await page.evaluate(async () => {
        const observed = new Set();
        const stop = performance.now()+1650;
        do {
          const p = window.meoPet.snapshot().renderedPose;
          if (p.sheet === 'head-rub' && Number.isFinite(p.handX)) observed.add(Math.floor(p.index/4));
          await new Promise(requestAnimationFrame);
        } while(performance.now()<stop);
        return [...observed].sort();
      });
      assert.deepEqual(rows,[0,1,2,3]);
      await page.mouse.up();
      await app.evaluate(() => { global.__meo.cursor = {x:50,y:50}; });
      await page.waitForFunction(() => !window.meoPet.snapshot().rubbing && window.meoPet.snapshot().frame.mode === 'music');
      assert.equal(await app.evaluate(() => global.__meo.playerState().open), false);
    }
    await page.mouse.down();
    await page.mouse.move(point.x + 55, point.y, {steps:5});
    await page.waitForFunction(() => window.meoPet.snapshot().frame.dragging);
    await page.mouse.up();
    await page.waitForFunction(() => !window.meoPet.snapshot().frame.dragging);
    assert.deepEqual(errors,[]);
    console.log('Hover and held circles play the dedicated head-rub atlas. The loop advances through all four poses without renderer errors; straight dragging still works.');
  } finally {
    await app.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
