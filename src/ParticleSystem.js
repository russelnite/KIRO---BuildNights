/**
 * ParticleSystem — Manages particle trail and burst effects.
 *
 * Exported as a factory function for testability. Accepts a config object
 * and an optional randomFn for deterministic testing.
 *
 * @param {object} [config] - Configuration object with `particles` and `pools` sub-objects
 * @param {function} [randomFn] - Random number generator (0-1), defaults to Math.random
 * @returns {{ update: Function, emitTrail: Function, emitBurst: Function, render: Function, getActive: Function, reset: Function }}
 */
export function createParticleSystem(config, randomFn) {
  const rand = randomFn || Math.random;

  const particles = (config && config.particles) ? config.particles : {
    trailRateMin: 3,
    trailRateMax: 8,
    burstCountMin: 5,
    burstCountMax: 10,
    radiusMin: 2,
    radiusMax: 5,
    opacityMin: 0.3,
    opacityMax: 0.6,
    lifespanMin: 200,
    lifespanMax: 500
  };

  const poolSize = (config && config.pools && config.pools.particles) ? config.pools.particles : 100;

  // Simple object pool
  const pool = {
    _free: [],

    acquire() {
      return this._free.length > 0
        ? this._free.pop()
        : { x: 0, y: 0, vx: 0, vy: 0, opacity: 0, startOpacity: 0, lifespan: 0, age: 0, radius: 0 };
    },

    release(obj) {
      this._free.push(obj);
    },

    prewarm(count) {
      for (let i = 0; i < count; i++) {
        this._free.push({ x: 0, y: 0, vx: 0, vy: 0, opacity: 0, startOpacity: 0, lifespan: 0, age: 0, radius: 0 });
      }
    },

    get freeCount() {
      return this._free.length;
    }
  };

  // Prewarm the pool
  pool.prewarm(poolSize);

  const active = [];

  /**
   * Emit trail particles behind the ghost.
   * Rate: trailRateMin to trailRateMax particles.
   * Spawn position: behind ghost (ghost.x, ghost.y + height/2 ± 5px).
   * Drift: left (-30 to -50 px/s), slightly down (10-20 px/s).
   * Lifespan: 200-500ms.
   */
  function emitTrail(ghost) {
    const count = particles.trailRateMin + Math.floor(rand() * (particles.trailRateMax - particles.trailRateMin + 1));
    for (let i = 0; i < count; i++) {
      const p = pool.acquire();
      p.x = ghost.x;
      p.y = ghost.y + ghost.height / 2 + (rand() * 10 - 5);
      p.vx = -(30 + rand() * 20);  // drift left: -30 to -50 px/s
      p.vy = 10 + rand() * 10;      // slight downward: 10-20 px/s
      p.radius = particles.radiusMin + rand() * (particles.radiusMax - particles.radiusMin);
      p.opacity = particles.opacityMin + rand() * (particles.opacityMax - particles.opacityMin);
      p.startOpacity = p.opacity;
      p.lifespan = particles.lifespanMin + rand() * (particles.lifespanMax - particles.lifespanMin);
      p.age = 0;
      active.push(p);
    }
  }

  /**
   * Emit burst particles on jump input.
   * Count: burstCountMin to burstCountMax particles.
   * Direction: downward fan (90° ± 35° → 55° to 125°).
   * Speed: 60-100 px/s.
   * Lifespan: 300ms.
   */
  function emitBurst(ghost) {
    const count = particles.burstCountMin + Math.floor(rand() * (particles.burstCountMax - particles.burstCountMin + 1));
    for (let i = 0; i < count; i++) {
      const p = pool.acquire();
      p.x = ghost.x + ghost.width / 2;
      p.y = ghost.y + ghost.height;
      // Downward fan: angle between 55° and 125° (90° ± 35°)
      const angle = (55 + rand() * 70) * Math.PI / 180;
      const speed = 60 + rand() * 40;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.radius = particles.radiusMin + rand() * (particles.radiusMax - particles.radiusMin);
      p.opacity = particles.opacityMax;
      p.startOpacity = p.opacity;
      p.lifespan = 300;
      p.age = 0;
      active.push(p);
    }
  }

  /**
   * Update particle system: emit trail/burst in playing state,
   * age particles, update positions, remove expired.
   *
   * @param {object} ghost - Ghost object with { x, y, width, height }
   * @param {number} dt - Delta time in seconds
   * @param {string} state - Current game state
   * @param {boolean} [jumpTriggered] - Whether jump was triggered this frame
   */
  function update(ghost, dt, state, jumpTriggered) {
    // Emit only in playing state
    if (state === 'playing') {
      emitTrail(ghost);
      if (jumpTriggered) {
        emitBurst(ghost);
      }
    }

    // Age and remove expired particles
    let i = active.length;
    while (i--) {
      const p = active[i];
      p.age += dt * 1000; // age in ms
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.opacity = (1 - p.age / p.lifespan) * p.startOpacity;

      if (p.age >= p.lifespan) {
        active.splice(i, 1);
        pool.release(p);
      }
    }
  }

  /**
   * Render active particles to the canvas context.
   * Skips particles with opacity below 0.05.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
   */
  function render(ctx) {
    ctx.fillStyle = '#b0e0ff';
    for (let i = 0; i < active.length; i++) {
      const p = active[i];
      if (p.opacity < 0.05) continue; // skip invisible
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Get active particles array (for testing/inspection).
   */
  function getActive() {
    return active;
  }

  /**
   * Reset: return all active particles to pool.
   */
  function reset() {
    while (active.length) {
      pool.release(active.pop());
    }
  }

  return { update, emitTrail, emitBurst, render, getActive, reset, pool };
}
