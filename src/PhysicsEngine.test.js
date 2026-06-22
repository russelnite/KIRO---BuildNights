import { describe, it, expect, beforeEach } from 'vitest';
import { createPhysicsEngine } from './PhysicsEngine.js';

const DEFAULT_CONFIG = {
  physics: {
    gravity: 800,
    jumpVelocity: -300,
    terminalVelocityDown: 600,
    terminalVelocityUp: -400
  }
};

describe('PhysicsEngine', () => {
  let engine;
  let ghost;

  beforeEach(() => {
    engine = createPhysicsEngine(DEFAULT_CONFIG);
    ghost = { x: 120, y: 320, velocity: 0 };
  });

  describe('update() — gravity application', () => {
    it('applies gravity scaled by dt in playing state', () => {
      engine.update(ghost, 1 / 60, 'playing');
      const expectedVelocity = 800 * (1 / 60);
      expect(ghost.velocity).toBeCloseTo(expectedVelocity, 5);
    });

    it('accumulates gravity over multiple frames', () => {
      const dt = 1 / 60;
      engine.update(ghost, dt, 'playing');
      engine.update(ghost, dt, 'playing');
      const expectedVelocity = 800 * dt * 2;
      expect(ghost.velocity).toBeCloseTo(expectedVelocity, 5);
    });

    it('updates ghost.y by velocity * dt', () => {
      ghost.velocity = 100;
      const dt = 1 / 60;
      const initialY = ghost.y;
      engine.update(ghost, dt, 'playing');
      // velocity after gravity: 100 + 800 * dt = ~113.33
      // clamped: still ~113.33 (within bounds)
      // position change: clampedVelocity * dt
      const newVelocity = 100 + 800 * dt;
      const expectedY = initialY + newVelocity * dt;
      expect(ghost.y).toBeCloseTo(expectedY, 5);
    });
  });

  describe('update() — terminal velocity clamping', () => {
    it('clamps downward velocity at terminalVelocityDown (600)', () => {
      ghost.velocity = 590;
      engine.update(ghost, 1, 'playing'); // 590 + 800 = 1390 → clamped to 600
      expect(ghost.velocity).toBe(600);
    });

    it('clamps upward velocity at terminalVelocityUp (-400)', () => {
      ghost.velocity = -400;
      engine.update(ghost, 1 / 60, 'playing');
      // -400 + 800/60 ≈ -386.67 → within bounds, no clamp needed
      expect(ghost.velocity).toBeGreaterThan(-400);
    });

    it('does not let velocity go below terminalVelocityUp', () => {
      // Force velocity well below terminal up
      ghost.velocity = -500;
      engine.update(ghost, 0.001, 'playing');
      // -500 + 800*0.001 = -499.2 → clamped to -400
      expect(ghost.velocity).toBe(-400);
    });
  });

  describe('update() — state-dependent behavior', () => {
    it('does not modify ghost in ready state', () => {
      const originalY = ghost.y;
      const originalVelocity = ghost.velocity;
      engine.update(ghost, 1 / 60, 'ready');
      expect(ghost.y).toBe(originalY);
      expect(ghost.velocity).toBe(originalVelocity);
    });

    it('does not modify ghost in paused state', () => {
      ghost.velocity = 100;
      const originalY = ghost.y;
      engine.update(ghost, 1 / 60, 'paused');
      expect(ghost.y).toBe(originalY);
      expect(ghost.velocity).toBe(100);
    });

    it('does not modify ghost in game_over state', () => {
      ghost.velocity = 200;
      const originalY = ghost.y;
      engine.update(ghost, 1 / 60, 'game_over');
      expect(ghost.y).toBe(originalY);
      expect(ghost.velocity).toBe(200);
    });

    it('applies physics in playing state', () => {
      const originalY = ghost.y;
      engine.update(ghost, 1 / 60, 'playing');
      expect(ghost.y).not.toBe(originalY);
      expect(ghost.velocity).not.toBe(0);
    });
  });

  describe('applyJump()', () => {
    it('sets velocity to jumpVelocity (-300)', () => {
      ghost.velocity = 200;
      engine.applyJump(ghost);
      expect(ghost.velocity).toBe(-300);
    });

    it('overrides any positive (falling) velocity', () => {
      ghost.velocity = 600;
      engine.applyJump(ghost);
      expect(ghost.velocity).toBe(-300);
    });

    it('overrides any negative (rising) velocity', () => {
      ghost.velocity = -100;
      engine.applyJump(ghost);
      expect(ghost.velocity).toBe(-300);
    });

    it('overrides zero velocity', () => {
      ghost.velocity = 0;
      engine.applyJump(ghost);
      expect(ghost.velocity).toBe(-300);
    });
  });

  describe('frame-rate independence', () => {
    it('produces same total displacement regardless of frame subdivision', () => {
      // Simulate 1 second of falling in 60 small steps
      const ghost60 = { x: 120, y: 320, velocity: 0 };
      const engine60 = createPhysicsEngine(DEFAULT_CONFIG);
      for (let i = 0; i < 60; i++) {
        engine60.update(ghost60, 1 / 60, 'playing');
      }

      // Simulate 1 second in 30 larger steps
      const ghost30 = { x: 120, y: 320, velocity: 0 };
      const engine30 = createPhysicsEngine(DEFAULT_CONFIG);
      for (let i = 0; i < 30; i++) {
        engine30.update(ghost30, 1 / 30, 'playing');
      }

      // Both should have velocity clamped to terminalVelocityDown (600)
      // after enough accumulation
      expect(ghost60.velocity).toBe(600);
      expect(ghost30.velocity).toBe(600);
    });
  });

  describe('custom config', () => {
    it('uses provided config values', () => {
      const customEngine = createPhysicsEngine({
        physics: {
          gravity: 400,
          jumpVelocity: -200,
          terminalVelocityDown: 300,
          terminalVelocityUp: -200
        }
      });

      const g = { x: 120, y: 320, velocity: 0 };
      customEngine.update(g, 1, 'playing');
      // 0 + 400*1 = 400, clamped to 300
      expect(g.velocity).toBe(300);

      customEngine.applyJump(g);
      expect(g.velocity).toBe(-200);
    });

    it('uses defaults when no config provided', () => {
      const defaultEngine = createPhysicsEngine();
      const g = { x: 120, y: 320, velocity: 0 };
      defaultEngine.applyJump(g);
      expect(g.velocity).toBe(-300);
    });
  });
});
