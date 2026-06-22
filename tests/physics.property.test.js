import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createPhysicsEngine } from '../src/PhysicsEngine.js';

const GRAVITY = 800;
const JUMP_VELOCITY = -300;
const TERMINAL_VELOCITY_DOWN = 600;
const TERMINAL_VELOCITY_UP = -400;
const CANVAS_WIDTH = 480;

const engine = createPhysicsEngine();

// Helper: generate a valid dt (delta-time in seconds) as a 32-bit float
const dtArb = fc.float({ min: Math.fround(0.001), max: Math.fround(0.033), noNaN: true, noDefaultInfinity: true });

// Helper: velocity within terminal bounds
const velocityArb = fc.float({ min: Math.fround(-400), max: Math.fround(600), noNaN: true, noDefaultInfinity: true });

// Helper: any velocity in wider range
const wideVelocityArb = fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true, noDefaultInfinity: true });

/**
 * Property 1: Jump overrides velocity
 *
 * For any ghost with any current vertical velocity (positive or negative),
 * when a jump input is applied, the ghost's vertical velocity SHALL be set
 * to exactly the JUMP_VELOCITY constant, completely overriding the previous value.
 *
 * **Validates: Requirements 2.1, 10.2, 10.7**
 */
describe('Property 1: Jump overrides velocity', () => {
  it('applyJump sets velocity to exactly JUMP_VELOCITY for any initial velocity', () => {
    fc.assert(fc.property(
      wideVelocityArb,
      (initialVelocity) => {
        const ghost = { x: 120, y: 320, velocity: initialVelocity };
        engine.applyJump(ghost);
        expect(ghost.velocity).toBe(JUMP_VELOCITY);
      }
    ));
  });
});

/**
 * Property 2: Gravity accumulates momentum
 *
 * For any ghost with vertical velocity below TERMINAL_VELOCITY_DOWN and any
 * valid delta-time, after a single physics update in the Playing state, the
 * ghost's new velocity SHALL equal the previous velocity plus GRAVITY multiplied
 * by delta-time (clamped at terminal velocities).
 *
 * **Validates: Requirements 2.2, 10.1, 10.5**
 */
describe('Property 2: Gravity accumulates momentum', () => {
  it('velocity increases by GRAVITY * dt each frame (clamped to terminal velocities)', () => {
    fc.assert(fc.property(
      velocityArb,
      dtArb,
      (velocity, dt) => {
        const ghost = { x: 120, y: 320, velocity };
        engine.update(ghost, dt, 'playing');
        const expected = Math.min(
          Math.max(velocity + GRAVITY * dt, TERMINAL_VELOCITY_UP),
          TERMINAL_VELOCITY_DOWN
        );
        expect(ghost.velocity).toBeCloseTo(expected, 3);
      }
    ));
  });
});

/**
 * Property 3: Terminal velocity capping (downward)
 *
 * For any sequence of physics updates without jump inputs, the ghost's
 * downward velocity SHALL never exceed TERMINAL_VELOCITY_DOWN, regardless
 * of how many frames of gravitational acceleration are applied.
 *
 * **Validates: Requirements 10.3**
 */
describe('Property 3: Terminal velocity capping (downward)', () => {
  it('velocity never exceeds TERMINAL_VELOCITY_DOWN after many gravity frames', () => {
    fc.assert(fc.property(
      velocityArb,
      fc.integer({ min: 1, max: 200 }),
      dtArb,
      (initialVelocity, frameCount, dt) => {
        const ghost = { x: 120, y: 320, velocity: initialVelocity };
        for (let i = 0; i < frameCount; i++) {
          engine.update(ghost, dt, 'playing');
        }
        expect(ghost.velocity).toBeLessThanOrEqual(TERMINAL_VELOCITY_DOWN);
      }
    ));
  });
});

/**
 * Property 4: Terminal velocity capping (upward)
 *
 * For any sequence of rapid jump inputs, the ghost's upward velocity SHALL
 * never be less than TERMINAL_VELOCITY_UP (more negative), regardless of
 * how many consecutive jumps are applied.
 *
 * **Validates: Requirements 2.6, 10.4**
 */
describe('Property 4: Terminal velocity capping (upward)', () => {
  it('velocity never goes below TERMINAL_VELOCITY_UP after many jumps and updates', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }),
      dtArb,
      (jumpCount, dt) => {
        const ghost = { x: 120, y: 320, velocity: 0 };
        for (let i = 0; i < jumpCount; i++) {
          engine.applyJump(ghost);
          engine.update(ghost, dt, 'playing');
        }
        expect(ghost.velocity).toBeGreaterThanOrEqual(TERMINAL_VELOCITY_UP);
      }
    ));
  });
});

/**
 * Property 5: Ghost horizontal position invariant
 *
 * For any game frame in any Game_State, the ghost's horizontal position
 * SHALL remain at a fixed value within the left third of the canvas width
 * (ghost.x <= CANVAS_WIDTH / 3).
 *
 * **Validates: Requirements 2.5**
 */
describe('Property 5: Ghost horizontal position invariant', () => {
  it('ghost.x remains unchanged and <= CANVAS_WIDTH / 3 after physics updates', () => {
    fc.assert(fc.property(
      wideVelocityArb,
      dtArb,
      fc.integer({ min: 1, max: 60 }),
      fc.constantFrom('ready', 'playing', 'paused', 'game_over'),
      (velocity, dt, frameCount, state) => {
        const startX = 120;
        const ghost = { x: startX, y: 320, velocity };
        for (let i = 0; i < frameCount; i++) {
          engine.update(ghost, dt, state);
        }
        expect(ghost.x).toBe(startX);
        expect(ghost.x).toBeLessThanOrEqual(CANVAS_WIDTH / 3);
      }
    ));
  });
});

/**
 * Property 6: Delta-time proportional movement
 *
 * For any ghost velocity and valid delta-time, the position change SHALL
 * be proportional to delta-time (position_delta = velocity * dt), ensuring
 * frame-rate independent physics.
 *
 * **Validates: Requirements 10.6**
 */
describe('Property 6: Delta-time proportional movement', () => {
  it('position delta equals velocity * dt after a single update', () => {
    fc.assert(fc.property(
      velocityArb,
      dtArb,
      (velocity, dt) => {
        const ghost = { x: 120, y: 320, velocity };
        const yBefore = ghost.y;
        engine.update(ghost, dt, 'playing');
        // The engine applies: velocity += gravity * dt; clamp; y += velocity * dt
        // So position delta uses the post-gravity, post-clamp velocity
        const newVelocity = Math.min(
          Math.max(velocity + GRAVITY * dt, TERMINAL_VELOCITY_UP),
          TERMINAL_VELOCITY_DOWN
        );
        const expectedDelta = newVelocity * dt;
        const actualDelta = ghost.y - yBefore;
        expect(actualDelta).toBeCloseTo(expectedDelta, 3);
      }
    ));
  });
});
