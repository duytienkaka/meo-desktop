(() => {
  'use strict';
  const columns = {classic:0, mit:1, may:2, muc:3};
  const edges = [0, 314, 627, 941, 1254];
  // Register the floor under the paws, including the shorter crouching pose.
  const floors = [304, 616, 931, 1247];
  window.CAT_SPRITES['head-rub'] = {
    baseHeight:294,
    frames:floors.flatMap(bottom => edges.slice(0,4).map((x,col) =>
      ({x, y:bottom-304, w:edges[col+1]-x, h:304})))
  };
  // Seconds, drawing, fingertip X/Y (relative to the sprite), and wrist angle.
  const beats = [
    [0,    0, .84, -.035, -.52],
    [.18,  0, .70,  .10,  -.46],
    [.30,  1, .64,  .17,  -.36],
    [.53,  1, .48,  .19,  -.25],
    [.67,  2, .49,  .145, -.32],
    [.85,  2, .61,  .11,  -.47],
    [1.01, 3, .68,  .13,  -.53],
    [1.20, 3, .76,  .10,  -.56],
    [1.38, 2, .79,  .04,  -.54],
    [1.52, 0, .84, -.035, -.52]
  ];
  const palm = new Path2D('M0 0 Q-2 -3 1 -4 L12 -1 Q9 -6 11 -8 Q13 -10 15 -6 L20 -2 Q24 0 28 -1 L32 -2 L35 11 L28 13 Q24 18 19 17 L7 12 Q4 10 6 9 L11 10 L2 6 Q-1 4 1 3 L9 5 Z');
  function createPlayer() {
    let start = null;
    return function sample(active, now, character, quiet) {
      if (!active) { start = null; return null; }
      start ??= now;
      const t = quiet ? .79 : ((now-start)/1000) % 1.52;
      const next = beats.findIndex(beat => beat[0] > t);
      const a = beats[next-1], b = beats[next];
      const fraction = (t-a[0])/(b[0]-a[0]);
      const k = fraction*fraction*(3-2*fraction);
      const mix = i => a[i]+(b[i]-a[i])*k;
      return {
        sheet:'head-rub', index:a[1]*4+(columns[character]??0),
        altitude:0, rotation:0, sx:1, sy:1,
        handX:mix(2), handY:mix(3), wrist:mix(4)
      };
    };
  }
  function drawHand(ctx, pose, width, height) {
    ctx.save();
    ctx.translate((pose.handX-.5)*width, (pose.handY-1)*height);
    ctx.rotate(pose.wrist);
    ctx.scale(width/103, width/103);
    ctx.lineJoin='round'; ctx.lineCap='round'; ctx.lineWidth=1.3;
    ctx.fillStyle='#ffdbb6'; ctx.strokeStyle='#764d43'; ctx.fill(palm); ctx.stroke(palm);
    ctx.strokeStyle='#c38c74'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(9,5); ctx.lineTo(14,7); ctx.moveTo(11,10); ctx.lineTo(16,11); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(28,-3,8,17,3);
    ctx.fillStyle='#a7ba9c'; ctx.strokeStyle='#586959'; ctx.fill(); ctx.stroke(); ctx.restore();
  }
  window.CAT_HEAD_RUB={createPlayer,drawHand};
})();
