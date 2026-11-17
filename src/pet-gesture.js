// Screen coordinates stay stable even when the desktop window moves.
function createPetGesture(startX, startY, size) {
  const straightDistance = Math.max(18, size * 0.22);
  const maxSpan = Math.max(36, size * 0.65);
  let lastX = 0, lastY = 0, minX = 0, maxX = 0, minY = 0, maxY = 0;
  let length = 0, twiceArea = 0, maxDistance = 0;
  let mode = 'pending';

  return {
    get mode() { return mode; },
    get moved() { return maxDistance > 7; },
    move(screenX, screenY) {
      if (mode !== 'pending') return mode;
      const x = screenX - startX, y = screenY - startY;
      const step = Math.hypot(x - lastX, y - lastY);
      if (step < 2) return mode;
      length += step;
      twiceArea += lastX * y - lastY * x;
      lastX = x;
      lastY = y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      const distance = Math.hypot(x, y);
      maxDistance = Math.max(maxDistance, distance);
      const width = maxX - minX, height = maxY - minY;
      const span = Math.max(width, height), breadth = Math.min(width, height);
      if (span > maxSpan || (distance > straightDistance && distance >= length * 0.99)) {
        mode = 'drag';
      } else if (breadth >= Math.max(8, span * 0.38) && distance < span * 0.55 &&
                 Math.abs(twiceArea) > width * height && length <= 2.8 * (width + height)) {
        // A loop encloses area in either direction. Jitter and backtracking do not.
        mode = 'rub';
      }
      return mode;
    }
  };
}

// The cursor comes from desktop frames so circles may cross the transparent
// space between the ears. Use absolute positions to ignore movement of the cat.
function createHeadRubTracker() {
  let trail = [];
  let lastMove = -Infinity;
  let nextRubAt = -Infinity;
  return {
    reset() { trail = []; lastMove = -Infinity; },
    sample(point, now, size) {
      if (now < nextRubAt) { trail = []; return false; }
      if (now - lastMove > 500) trail = [];
      const last = trail.at(-1);
      if (last && Math.hypot(point.x - last.x, point.y - last.y) < 2) return false;
      lastMove = now;
      trail.push({ ...point, now });
      while (trail.length > 72 || now - trail[0].now > 2000) trail.shift();
      // Search suffixes so a straight approach to the head is not part of the loop.
      let length = 0, twiceArea = 0, left = 0, right = 0, top = 0, bottom = 0;
      let dx = 0, dy = 0;
      for (let i = trail.length - 2; i >= 0; i--) {
        const x = trail[i].x - point.x, y = trail[i].y - point.y;
        twiceArea += x * dy - y * dx;
        length += Math.hypot(x - dx, y - dy);
        dx = x; dy = y;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
        const width = right - left, height = bottom - top;
        const span = Math.max(width, height), breadth = Math.min(width, height);
        if (span > size * 1.3) break;
        if (breadth >= Math.max(8, span * 0.4) && Math.hypot(x, y) < span * 0.5 &&
            Math.abs(twiceArea) > width * height && length < 2.6 * (width + height)) {
          trail = [];
          nextRubAt = now + 3000;
          return true;
        }
      }
      return false;
    }
  };
}
