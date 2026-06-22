import { describe, it, expect, beforeEach } from 'vitest';
import { createParticleSystem } from './ParticleSystem.js';

const DEFAULT_CONFIG = {
  particles: {
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
  },
  pools: {
    particles: 100
  }
};

function createGhost() {
  return { x: 120, y: 320, width: 32, height: 32 };
}

describe('ParticleSystem', () => {
  let ps;
  let ghost;
  let randValue;

  beforeEach(() => {
    randValue = 0.5;
    ps = createParticleSystem(DEFAULT_CONFIG, () => randValue);
    ghost = createGhost();
  });

  describe('pool initialization', () => {
    it('prewarms 100 particle objects at startup', () => {
      // After prewarm, pool should have 100 free objects
      expect(ps.pool.freeCount).toBe(100);
    });
  });

  describe('emitTrail()', () => {
    it('emits between trailRateMin and trailRateMax particles', () => {
      // With rand = 0.5: count = 3 + floor(0.5 * 6) = 3 + 3 = 6
      ps.emitTrail(ghost);
      expect(ps.getActive().length).toBe(6);
    });

    it('emits trailRateMin particles when rand returns 0', () => {
      randValue = 0;
      const ps0 = createParticleSystem(DEFAULT_CONFIG, () => 0);
      ps0.emitTrail(createGhost());
      expect(ps0.getActive().length).toBe(3);
    });

    it('emits trailRateMax particles when rand returns just below 1', () => {
      const psMax = createParticleSystem(DEFAULT_CONFIG, () => 0.999);
      psMax.emitTrail(createGhost());
      expect(psMax.getActive().length).toBe(8);
    });

    it('positions particles behind ghost (at ghost.x)', () => {
      ps.emitTrail(ghost);
      const particles = ps.getActive();
      for (const p of particles) {
        expect(p.x).toBe(ghost.x);
      }
    });

    it('positions particles near ghost vertical center (±5px)', () => {
      ps.emitTrail(ghost);
      const particles = ps.getActive();
      const centerY = ghost.y + ghost.height / 2;
      for (const p of particles) {
        expect(p.y).toBeGreaterThanOrEqual(centerY - 5);
        expect(p.y).toBeLessThanOrEqual(centerY + 5);
      }
    });

    it('sets negative vx (drift left) between -30 and -50', () => {
      ps.emitTrail(ghost);
      const particles = ps.getActive();
      for (const p of particles) {
        expect(p.vx).toBeLessThanOrEqual(-30);
        expect(p.vx).toBeGreaterThanOrEqual(-50);
      }
    });

    it('sets positive vy (drift down) between 10 and 20', () => {
      ps.emitTrail(ghost);
      const particles = ps.getActive();
      for (const p of particles) {
        expect(p.vy).toBeGreaterThanOrEqual(10);
        expect(p.vy).toBeLessThanOrEqual(20);
      }
    });

    it('sets radius between radiusMin (2) and radiusMax (5)', () => {
      ps.emitTrail(ghost);
      const particles = ps.getActive();
      for (const p of particles) {
        expect(p.radius).toBeGreaterThanOrEqual(2);
        expect(p.radius).toBeLessThanOrEqual(5);
      }
    });

    it('sets opacity between opacityMin (0.3) and opacityMax (0.6)', () => {
      ps.emitTrail(ghost);
      const particles = ps.getActive();
      for (const p of particles) {
        expect(p.startOpacity).toBeGreaterThanOrEqual(0.3);
        expect(p.startOpacity).toBeLessThanOrEqual(0.6);
      }
    });

    it('sets lifespan between 200ms and 500ms', () => {
      ps.emitTrail(ghost);
      const particles = ps.getActive();
      for (const p of particles) {
        expect(p.lifespan).toBeGreaterThanOrEqual(200);
        expect(p.lifespan).toBeLessThanOrEqual(500);
      }
    });

    it('sets age to 0 on emission', () => {
      ps.emitTrail(ghost);
      const particles = ps.getActive();
      for (const p of particles) {
        expect(p.age).toBe(0);
      }
    });

    it('acquires from pool (decrements free count)', () => {
      const freeBefore = ps.pool.freeCount;
      ps.emitTrail(ghost);
      const freeAfter = ps.pool.freeCount;
      expect(freeAfter).toBe(freeBefore - ps.getActive().length);
    });
  });

  describe('emitBurst()', () => {
    it('emits between burstCountMin and burstCountMax particles', () => {
      // With rand = 0.5: count = 5 + floor(0.5 * 6) = 5 + 3 = 8
      ps.emitBurst(ghost);
      expect(ps.getActive().length).toBe(8);
    });

    it('emits burstCountMin particles when rand returns 0', () => {
      const ps0 = createParticleSystem(DEFAULT_CONFIG, () => 0);
      ps0.emitBurst(createGhost());
      expect(ps0.getActive().length).toBe(5);
    });

    it('emits burstCountMax particles when rand returns just below 1', () => {
      const psMax = createParticleSystem(DEFAULT_CONFIG, () => 0.999);
      psMax.emitBurst(createGhost());
      expect(psMax.getActive().length).toBe(10);
    });

    it('positions burst particles at ghost center-bottom', () => {
      ps.emitBurst(ghost);
      const particles = ps.getActive();
      for (const p of particles) {
        expect(p.x).toBe(ghost.x + ghost.width / 2);
        expect(p.y).toBe(ghost.y + ghost.height);
      }
    });

    it('sets burst velocity in a downward fan (vx and vy from angle 55-125°)', () => {
      ps.emitBurst(ghost);
      const particles = ps.getActive();
      for (const p of particles) {
        // vy should be positive (downward direction for angles 55-125°)
        expect(p.vy).toBeGreaterThan(0);
        // Speed magnitude should be between 60 and 100
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        expect(speed).toBeGreaterThanOrEqual(59.9);
        expect(speed).toBeLessThanOrEqual(100.1);
      }
    });

    it('sets burst lifespan to 300ms', () => {
      ps.emitBurst(ghost);
      const particles = ps.getActive();
      for (const p of particles) {
        expect(p.lifespan).toBe(300);
      }
    });

    it('sets burst opacity to opacityMax', () => {
      ps.emitBurst(ghost);
      const particles = ps.getActive();
      for (const p of particles) {
        expect(p.startOpacity).toBe(DEFAULT_CONFIG.particles.opacityMax);
      }
    });
  });

  describe('update()', () => {
    it('emits trail particles when state is playing', () => {
      ps.update(ghost, 1 / 60, 'playing', false);
      expect(ps.getActive().length).toBeGreaterThan(0);
    });

    it('emits burst particles when state is playing and jumpTriggered is true', () => {
      ps.update(ghost, 1 / 60, 'playing', true);
      // trail (6) + burst (8) = 14 with rand = 0.5
      expect(ps.getActive().length).toBe(14);
    });

    it('does not emit trail particles when state is ready', () => {
      ps.update(ghost, 1 / 60, 'ready', false);
      expect(ps.getActive().length).toBe(0);
    });

    it('does not emit trail particles when state is game_over', () => {
      ps.update(ghost, 1 / 60, 'game_over', false);
      expect(ps.getActive().length).toBe(0);
    });

    it('does not emit trail particles when state is paused', () => {
      ps.update(ghost, 1 / 60, 'paused', false);
      expect(ps.getActive().length).toBe(0);
    });

    it('ages particles by dt * 1000 (converts seconds to ms)', () => {
      ps.emitTrail(ghost);
      const dt = 1 / 60;
      ps.update(ghost, dt, 'ready', false); // ready state to avoid emitting more
      const particles = ps.getActive();
      for (const p of particles) {
        expect(p.age).toBeCloseTo(dt * 1000, 5);
      }
    });

    it('updates particle position by velocity * dt', () => {
      ps.emitTrail(ghost);
      const particles = ps.getActive();
      const initialPositions = particles.map(p => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy }));
      const dt = 1 / 60;
      ps.update(ghost, dt, 'ready', false); // ready state to avoid emitting more

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const initial = initialPositions[i];
        expect(p.x).toBeCloseTo(initial.x + initial.vx * dt, 5);
        expect(p.y).toBeCloseTo(initial.y + initial.vy * dt, 5);
      }
    });

    it('fades particle opacity based on age/lifespan ratio', () => {
      ps.emitTrail(ghost);
      const particles = ps.getActive();
      const startOpacities = particles.map(p => p.startOpacity);
      const lifespans = particles.map(p => p.lifespan);
      const dt = 0.1; // 100ms

      ps.update(ghost, dt, 'ready', false);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const expectedOpacity = (1 - (dt * 1000) / lifespans[i]) * startOpacities[i];
        expect(p.opacity).toBeCloseTo(expectedOpacity, 5);
      }
    });

    it('removes particles whose age exceeds lifespan', () => {
      ps.emitTrail(ghost);
      const countBefore = ps.getActive().length;
      expect(countBefore).toBeGreaterThan(0);

      // Advance time past max lifespan (500ms = 0.5s)
      ps.update(ghost, 0.6, 'ready', false);
      expect(ps.getActive().length).toBe(0);
    });

    it('releases expired particles back to the pool', () => {
      ps.emitTrail(ghost);
      const emittedCount = ps.getActive().length;
      const freeBefore = ps.pool.freeCount;

      // Expire all
      ps.update(ghost, 0.6, 'ready', false);
      expect(ps.pool.freeCount).toBe(freeBefore + emittedCount);
    });

    it('still ages existing particles even when not in playing state', () => {
      // Emit some particles while playing
      ps.update(ghost, 1 / 60, 'playing', false);
      const countAfterEmit = ps.getActive().length;
      expect(countAfterEmit).toBeGreaterThan(0);

      // Now pause — particles should still age and eventually expire
      ps.update(ghost, 0.6, 'paused', false);
      expect(ps.getActive().length).toBe(0);
    });
  });

  describe('render()', () => {
    it('skips particles with opacity below 0.05', () => {
      ps.emitTrail(ghost);
      // Age particles until they are almost expired (very low opacity)
      ps.update(ghost, 0.48, 'ready', false);

      const mockCtx = {
        fillStyle: '',
        globalAlpha: 1,
        beginPathCalls: 0,
        arcCalls: 0,
        fillCalls: 0,
        beginPath() { this.beginPathCalls++; },
        arc() { this.arcCalls++; },
        fill() { this.fillCalls++; }
      };

      // Some particles may have opacity < 0.05 due to aging
      const visibleCount = ps.getActive().filter(p => p.opacity >= 0.05).length;
      ps.render(mockCtx);
      expect(mockCtx.arcCalls).toBe(visibleCount);
    });

    it('sets fillStyle to #b0e0ff', () => {
      ps.emitTrail(ghost);
      const mockCtx = {
        fillStyle: '',
        globalAlpha: 1,
        beginPath() {},
        arc() {},
        fill() {}
      };
      ps.render(mockCtx);
      expect(mockCtx.fillStyle).toBe('#b0e0ff');
    });

    it('resets globalAlpha to 1 after rendering', () => {
      ps.emitTrail(ghost);
      const mockCtx = {
        fillStyle: '',
        globalAlpha: 0.5,
        beginPath() {},
        arc() {},
        fill() {}
      };
      ps.render(mockCtx);
      expect(mockCtx.globalAlpha).toBe(1);
    });
  });

  describe('reset()', () => {
    it('clears all active particles', () => {
      ps.emitTrail(ghost);
      expect(ps.getActive().length).toBeGreaterThan(0);
      ps.reset();
      expect(ps.getActive().length).toBe(0);
    });

    it('returns all active particles to pool', () => {
      ps.emitTrail(ghost);
      const emittedCount = ps.getActive().length;
      const freeBefore = ps.pool.freeCount;
      ps.reset();
      expect(ps.pool.freeCount).toBe(freeBefore + emittedCount);
    });
  });

  describe('pool usage', () => {
    it('reuses pool objects after release', () => {
      // Emit and expire particles
      ps.emitTrail(ghost);
      const emittedCount = ps.getActive().length;
      ps.update(ghost, 0.6, 'ready', false);
      expect(ps.getActive().length).toBe(0);

      // Emit again — should reuse pool objects
      const freeBefore = ps.pool.freeCount;
      ps.emitTrail(ghost);
      const reEmitted = ps.getActive().length;
      expect(ps.pool.freeCount).toBe(freeBefore - reEmitted);
    });
  });
});
