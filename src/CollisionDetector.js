// CollisionDetector — Testable ES module version
// Mirrors the inline CollisionDetector in index.html

// Default config values (same as CONFIG in index.html)
const DEFAULT_CONFIG = {
  canvas: {
    width: 480,
    height: 640,
    hudHeight: 40
  },
  ghost: {
    width: 32,
    height: 32,
    hitboxRadius: 12
  },
  pipes: {
    width: 60
  }
};

/**
 * Clamp a value between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function _clamp(val, min, max) {
  return val < min ? min : val > max ? max : val;
}

/**
 * Circle-vs-Rectangle collision test.
 * Finds the closest point on the rectangle to the circle center,
 * then tests if distance² <= radius².
 *
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} r - Circle radius
 * @param {number} rx - Rect left X
 * @param {number} ry - Rect top Y
 * @param {number} rw - Rect width
 * @param {number} rh - Rect height
 * @returns {boolean}
 */
function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  const closestX = _clamp(cx, rx, rx + rw);
  const closestY = _clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) <= (r * r);
}

/**
 * Creates a CollisionDetector instance with injectable config.
 * @param {object} [config] - Optional config override for testing
 * @returns {{ check: Function, checkCollectibles: Function }}
 */
export function createCollisionDetector(config = DEFAULT_CONFIG) {
  const canvasHeight = config.canvas.height;
  const hudHeight = config.canvas.hudHeight;

  /**
   * Check collision between the ghost and pipes/boundaries.
   * @param {object} ghost - Ghost object with x, y, width, height, hitboxRadius
   * @param {Array} pipes - Array of PipePair objects
   * @param {number} [hudTop] - Top edge of HUD bar (default: canvasHeight - hudHeight)
   * @param {number} [canvasTop] - Top edge of canvas (default: 0)
   * @returns {{ collided: boolean, type: 'pipe'|'floor'|'ceiling'|null }}
   */
  function check(ghost, pipes, hudTop, canvasTop) {
    const floorY = hudTop !== undefined ? hudTop : (canvasHeight - hudHeight);
    const ceilingY = canvasTop !== undefined ? canvasTop : 0;

    // Ghost circular hitbox
    const cx = ghost.x + ghost.width / 2;
    const cy = ghost.y + ghost.height / 2;
    const r = ghost.hitboxRadius;

    // Boundary checks — floor and ceiling
    if (cy + r >= floorY) {
      return { collided: true, type: 'floor' };
    }
    if (cy - r <= ceilingY) {
      return { collided: true, type: 'ceiling' };
    }

    // Check pipes with broad-phase AABB pre-check
    for (let i = 0; i < pipes.length; i++) {
      const pipe = pipes[i];

      // Broad-phase: skip pipes not within ghost's x-range (±pipe.width)
      if (pipe.x > cx + r + pipe.width) continue;  // pipe far ahead
      if (pipe.x + pipe.width < cx - r) continue;  // pipe far behind

      // Derive top and bottom pipe rectangles
      const topH = pipe.gapCenterY - pipe.gapHeight / 2;
      const botY = pipe.gapCenterY + pipe.gapHeight / 2;
      const botH = canvasHeight - botY;

      // Narrow-phase: circle-vs-rectangle for top pipe
      if (topH > 0 && circleRectCollision(cx, cy, r, pipe.x, 0, pipe.width, topH)) {
        return { collided: true, type: 'pipe' };
      }

      // Narrow-phase: circle-vs-rectangle for bottom pipe
      if (botH > 0 && circleRectCollision(cx, cy, r, pipe.x, botY, pipe.width, botH)) {
        return { collided: true, type: 'pipe' };
      }
    }

    return { collided: false, type: null };
  }

  /**
   * Check collision between the ghost and collectibles.
   * Uses the same circle-vs-rectangle algorithm.
   * @param {object} ghost - Ghost object with x, y, width, height, hitboxRadius
   * @param {Array} collectibles - Array of Collectible objects
   * @returns {Array} Array of collectibles that were collected this frame
   */
  function checkCollectibles(ghost, collectibles) {
    const cx = ghost.x + ghost.width / 2;
    const cy = ghost.y + ghost.height / 2;
    const r = ghost.hitboxRadius;

    const collected = [];
    for (let i = 0; i < collectibles.length; i++) {
      const c = collectibles[i];
      if (c.collected) continue;
      if (circleRectCollision(cx, cy, r, c.x, c.y, c.width, c.height)) {
        c.collected = true;
        collected.push(c);
      }
    }
    return collected;
  }

  return { check, checkCollectibles };
}

// Export internals for testing
export { circleRectCollision, _clamp, DEFAULT_CONFIG };
