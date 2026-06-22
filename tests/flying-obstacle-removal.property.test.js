import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createScrollingEngine } from '../src/ScrollingEngine.js';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const HUD_HEIGHT = 40;
const FLYING_OBS_WIDTH = 40;
const FLYING_OBS_HEIGHT = 33;

const config = {
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, hudHeight: HUD_HEIGHT },
  pipes: { width: 60, gapMinPercent: 0.2, gapMaxPercent: 0.8 },
  pools: { pipes: 8, collectibles: 6 },
  difficulty: { baseSpacing: 350 },
  flyingObstacles: {
    activationThreshold: 30,
    maxOnScreen: 2,
    spawnYMinPercent: 0.15,
    spawnYMaxPercent: 0.85,
    heightRatio: 0.75,
    poolSize: 4,
    width: FLYING_OBS_WIDTH
  },
  character: { spriteHeight: 44 }
};

// Arbitrary: obstacle x position that is off-screen left (x + width < 0)
const offscreenXArb = fc.float({
  min: Math.fround(-2000),
  max: Math.fround(-FLYING_OBS_WIDTH - 1),
  noNaN: true,
  noDefaultInfinity: true
});

// Arbitrary: obstacle x position that is still on-screen (x + width >= 0)
const onscreenXArb = fc.float({
  min: Math.fround(-FLYING_OBS_WIDTH + 1),
  max: Math.fround(CANVAS_WIDTH + 200),
  noNaN: true,
  noDefaultInfinity: true
});

// Arbitrary: valid y position for a flying obstacle
const yArb = fc.float({
  min: Math.fround(0),
  max: Math.fround(CANVAS_HEIGHT - HUD_HEIGHT),
  noNaN: true,
  noDefaultInfinity: true
});

// Helper to create a flying obstacle object
function makeFlyingObstacle(x, y) {
  return {
    x,
    y: y || 100,
    width: FLYING_OBS_WIDTH,
    height: FLYING_OBS_HEIGHT,
    speed: 200,
    active: true
  };
}

/**
 * Property 12: Flying obstacle off-screen removal
 *
 * For any flying obstacle whose right edge (x + width) is less than zero,
 * after the removal pass that obstacle SHALL no longer exist in the active
 * flying obstacles array and SHALL be returned to the pool.
 *
 * **Validates: Requirements 5.9**
 */
describe('Property 12: Flying obstacle off-screen removal', () => {
  it('obstacles with right edge < 0 are removed from the array', () => {
    fc.assert(fc.property(
      fc.array(offscreenXArb, { minLength: 1, maxLength: 4 }),
      yArb,
      (xPositions, y) => {
        const engine = createScrollingEngine(config, () => 0.5);
        const flyingObstacles = xPositions.map(x => makeFlyingObstacle(x, y));

        engine.removeFlyingObstacleOffscreen(flyingObstacles);

        expect(flyingObstacles.length).toBe(0);
      }
    ));
  });

  it('obstacles with right edge >= 0 remain in the array', () => {
    fc.assert(fc.property(
      fc.array(onscreenXArb, { minLength: 1, maxLength: 4 }),
      yArb,
      (xPositions, y) => {
        const engine = createScrollingEngine(config, () => 0.5);
        const flyingObstacles = xPositions.map(x => makeFlyingObstacle(x, y));
        const originalCount = flyingObstacles.length;

        engine.removeFlyingObstacleOffscreen(flyingObstacles);

        expect(flyingObstacles.length).toBe(originalCount);
      }
    ));
  });

  it('mixed array: only off-screen obstacles are removed, on-screen ones remain', () => {
    fc.assert(fc.property(
      fc.array(offscreenXArb, { minLength: 1, maxLength: 3 }),
      fc.array(onscreenXArb, { minLength: 1, maxLength: 3 }),
      yArb,
      (offscreenXs, onscreenXs, y) => {
        const engine = createScrollingEngine(config, () => 0.5);

        const offscreenObs = offscreenXs.map(x => makeFlyingObstacle(x, y));
        const onscreenObs = onscreenXs.map(x => makeFlyingObstacle(x, y));

        // Interleave obstacles
        const flyingObstacles = [];
        let oi = 0, ni = 0;
        while (oi < offscreenObs.length || ni < onscreenObs.length) {
          if (oi < offscreenObs.length) flyingObstacles.push(offscreenObs[oi++]);
          if (ni < onscreenObs.length) flyingObstacles.push(onscreenObs[ni++]);
        }

        engine.removeFlyingObstacleOffscreen(flyingObstacles);

        // Only on-screen obstacles should remain
        expect(flyingObstacles.length).toBe(onscreenXs.length);

        // All remaining obstacles should have right edge >= 0
        for (const obs of flyingObstacles) {
          expect(obs.x + obs.width).toBeGreaterThanOrEqual(0);
        }
      }
    ));
  });

  it('removed obstacles are marked inactive and returned to pool', () => {
    fc.assert(fc.property(
      fc.array(offscreenXArb, { minLength: 1, maxLength: 4 }),
      yArb,
      (xPositions, y) => {
        const engine = createScrollingEngine(config, () => 0.5);
        const pool = engine.getFlyingObstaclePool();
        const initialFreeCount = pool.freeCount;

        const flyingObstacles = xPositions.map(x => makeFlyingObstacle(x, y));

        engine.removeFlyingObstacleOffscreen(flyingObstacles);

        // Pool should have gained back the removed obstacles
        expect(pool.freeCount).toBe(initialFreeCount + xPositions.length);

        // Array should be empty (all were off-screen)
        expect(flyingObstacles.length).toBe(0);
      }
    ));
  });
});
