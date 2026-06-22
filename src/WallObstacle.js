/**
 * WallObstacle — Pipe pair with positioning, movement, and collision boundaries.
 * Follows game-mechanics.md collision patterns and game-coding-standards.md pooling.
 */
const WallObstacle = {
  /**
   * Create a new pipe pair object (or reset a pooled one).
   */
  create(x, gapCenterY, gapHeight, pipeWidth) {
    return {
      x: x,
      gapCenterY: gapCenterY,
      gapHeight: gapHeight,
      width: pipeWidth || 60,
      scored: false,
      active: true
    };
  },

  /**
   * Reset a pooled pipe pair for reuse.
   */
  reset(pipe, x, gapCenterY, gapHeight) {
    pipe.x = x;
    pipe.gapCenterY = gapCenterY;
    pipe.gapHeight = gapHeight;
    pipe.scored = false;
    pipe.active = true;
    return pipe;
  },

  /**
   * Move pipe left by speed * dt (per-second units).
   */
  update(pipe, speed, dt) {
    pipe.x -= speed * dt;
  },

  /**
   * Check if pipe is off-screen left (ready to recycle).
   */
  isOffscreen(pipe) {
    return pipe.x + pipe.width < 0;
  },

  /**
   * Get the two rectangular collision boundaries for a pipe pair.
   * @returns {{ top: {x,y,w,h}, bottom: {x,y,w,h} }}
   */
  getCollisionRects(pipe, canvasHeight) {
    const topH = pipe.gapCenterY - pipe.gapHeight / 2;
    const botY = pipe.gapCenterY + pipe.gapHeight / 2;
    return {
      top: { x: pipe.x, y: 0, w: pipe.width, h: topH },
      bottom: { x: pipe.x, y: botY, w: pipe.width, h: canvasHeight - botY }
    };
  },

  /**
   * Generate a random gap center Y within allowed bounds.
   */
  randomGapCenter(canvasHeight, hudHeight, gapMinPercent, gapMaxPercent) {
    const playableH = canvasHeight - hudHeight;
    const minY = playableH * gapMinPercent;
    const maxY = playableH * gapMaxPercent;
    return minY + Math.random() * (maxY - minY);
  },

  /**
   * Check if ghost has passed this pipe (for scoring).
   */
  hasBeenPassed(pipe, ghostRightEdge) {
    return !pipe.scored && ghostRightEdge > pipe.x + pipe.width;
  },

  /**
   * Render a pipe pair (batched approach — caller should batch multiple).
   */
  render(ctx, pipe, canvasHeight, hudHeight, fillColor, outlineColor, outlineWidth) {
    const topH = pipe.gapCenterY - pipe.gapHeight / 2;
    const botY = pipe.gapCenterY + pipe.gapHeight / 2;
    const botH = canvasHeight - hudHeight - botY;

    ctx.fillStyle = fillColor;
    ctx.fillRect(pipe.x, 0, pipe.width, topH);
    ctx.fillRect(pipe.x, botY, pipe.width, botH);

    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.strokeRect(pipe.x, 0, pipe.width, topH);
    ctx.strokeRect(pipe.x, botY, pipe.width, botH);
  }
};

if (typeof module !== 'undefined') module.exports = WallObstacle;
