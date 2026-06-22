/**
 * Ghosty — Player character with physics, animation states, and collision detection.
 * Follows game-mechanics.md and visual-design.md steering patterns.
 */
const Ghosty = {
  // Physics properties (per-second units from game-config.json)
  x: 120,
  y: 320,
  velocity: 0,
  width: 32,
  height: 32,
  hitboxRadius: 12,

  // Animation state
  animState: 'idle',  // 'idle' | 'flap' | 'death'
  animTimer: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,

  /**
   * Reset ghost to initial position and state.
   */
  reset() {
    this.x = 120;
    this.y = 320;
    this.velocity = 0;
    this.animState = 'idle';
    this.animTimer = 0;
    this.rotation = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.opacity = 1;
  },

  /**
   * Apply gravity and update position (per-second physics, scaled by dt).
   * Only active in Playing state.
   */
  updatePhysics(dt, gravity, termDown, termUp) {
    this.velocity += gravity * dt;
    this.velocity = this.velocity < termUp ? termUp : this.velocity > termDown ? termDown : this.velocity;
    this.y += this.velocity * dt;
  },

  /**
   * Apply jump — immediate velocity override (no momentum blending).
   */
  applyJump(jumpVelocity) {
    this.velocity = jumpVelocity;
    this.animState = 'flap';
    this.animTimer = 0;
  },

  /**
   * Update animation state based on elapsed time.
   */
  updateAnimation(dt) {
    this.animTimer += dt * 1000;

    if (this.animState === 'idle') {
      // Gentle bob (±2px, 800ms cycle) — visual only, doesn't affect physics y
      this.scaleX = 1;
      this.scaleY = 1;
      this.rotation = 0;
      this.opacity = 1;
    }
    else if (this.animState === 'flap') {
      // Squash/stretch over 160ms then return to idle
      if (this.animTimer < 80) {
        this.scaleX = 1.1;
        this.scaleY = 0.85;
      } else if (this.animTimer < 160) {
        this.scaleX = 0.9;
        this.scaleY = 1.15;
      } else {
        this.scaleX = 1;
        this.scaleY = 1;
        this.animState = 'idle';
      }
    }
    else if (this.animState === 'death') {
      // Spin and fade
      this.rotation += 2 * dt;  // 2 rad/s
      this.opacity = Math.max(0.4, 1 - this.animTimer / 400);
    }
  },

  /**
   * Get circular hitbox for collision detection.
   * @returns {{ cx: number, cy: number, r: number }}
   */
  getHitbox() {
    return {
      cx: this.x + this.width / 2,
      cy: this.y + this.height / 2,
      r: this.hitboxRadius
    };
  },

  /**
   * Check if ghost circle collides with a rectangle (pipe or boundary).
   */
  collidesWithRect(rx, ry, rw, rh) {
    const { cx, cy, r } = this.getHitbox();
    const closestX = cx < rx ? rx : cx > rx + rw ? rx + rw : cx;
    const closestY = cy < ry ? ry : cy > ry + rh ? ry + rh : cy;
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) <= (r * r);
  },

  /**
   * Check boundary collisions (floor and ceiling).
   */
  checkBoundaries(canvasHeight, hudHeight) {
    const { cy, r } = this.getHitbox();
    if (cy + r >= canvasHeight - hudHeight) return 'floor';
    if (cy - r <= 0) return 'ceiling';
    return null;
  },

  /**
   * Trigger death state.
   */
  die() {
    this.animState = 'death';
    this.animTimer = 0;
  },

  /**
   * Render ghost with current animation transforms.
   */
  render(ctx, sprite) {
    ctx.save();
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.globalAlpha = this.opacity;

    if (sprite) {
      ctx.drawImage(sprite, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

// Export for testing (Node.js/Vitest compatibility)
if (typeof module !== 'undefined') module.exports = Ghosty;
