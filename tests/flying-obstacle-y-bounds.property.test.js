import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createScrollingEngine } from '../src/ScrollingEngine.js';

/**
 * Property 7: Flying obstacle spawn Y position within bounds
 *
 * For any spawned flying obstacle, its vertical position SHALL be between
 * 15% and 85% of the playable area height (canvas height minus HUD height).
 *
 * **Validates: Requirements 5.2**
 */

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const HUD_HEIGHT = 40;
const PLAYABLE_HEIGHT = CANVAS_HEIGHT - HUD_HEIGHT; // 460px
const SPAWN_Y_MIN_PERCENT = 0.15;
const SPAWN_Y_MAX_PERCENT = 0.85;
const MIN_Y = PLAYABLE_HEIGHT * SPAWN_Y_MIN_PERCENT; // 69px
const MAX_Y = PLAYABLE_HEIGHT * SPAWN_Y_MAX_PERCENT; // 391px

const config = {
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, hudHeight: HUD_HEIGHT },
  pipes: { width: 60, gapMinPercent: 0.2, gapMaxPercent: 0.8 },
  pools: { pipes: 8, collectibles: 6 },
  difficulty: { baseSpacing: 350 },
  character: { spriteHeight: 44 },
  flyingObstacles: {
    activationThreshold: 30,
    maxOnScreen: 2,
    spawnYMinPercent: SPAWN_Y_MIN_PERCENT,
    spawnYMaxPercent: SPAWN_Y_MAX_PERCENT,
    heightRatio: 0.75,
    poolSize: 4,
    width: 40
  }
};

// Arbitrary: random float [0, 1] to use as the randomFn return value
const randomFloatArb = fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true, noDefaultInfinity: true });

// Arbitrary: score >= 30 (activation threshold) to ensure spawning is eligible
const activeScoreArb = fc.integer({ min: 30, max: 200 });

// Arbitrary: pipe speed for difficulty params
const pipeSpeedArb = fc.float({ min: Math.fround(120), max: Math.fround(280), noNaN: true, noDefaultInfinity: true });

describe('Property 7: Flying obstacle spawn Y position within bounds', () => {
  it('spawned flying obstacle Y is always between 15% and 85% of playable height for any random value', () => {
    fc.assert(fc.property(
      randomFloatArb,
      activeScoreArb,
      pipeSpeedArb,
      (randomValue, score, pipeSpeed) => {
        const engine = createScrollingEngine(config, () => randomValue);
        const difficulty = {
          pipeSpeed,
          gapHeight: 120,
          pipeSpacing: 350,
          flyingObstacleSpeedMultiplier: 1.5
        };

        const flyingObstacles = []; // empty, so under max on screen
        const obstacle = engine.spawnFlyingObstacle(difficulty, score, flyingObstacles);

        // Should always spawn since score >= 30 and count < max
        expect(obstacle).not.toBeNull();
        expect(obstacle.y).toBeGreaterThanOrEqual(MIN_Y);
        expect(obstacle.y).toBeLessThanOrEqual(MAX_Y);
      }
    ), { numRuns: 200 });
  });

  it('spawned flying obstacle Y respects bounds at extreme random values (0 and 1)', () => {
    // Test with randomFn returning 0 (minimum Y)
    const engineMin = createScrollingEngine(config, () => 0);
    const difficulty = { pipeSpeed: 150, gapHeight: 120, pipeSpacing: 350, flyingObstacleSpeedMultiplier: 1.5 };
    const obsMin = engineMin.spawnFlyingObstacle(difficulty, 50, []);
    expect(obsMin).not.toBeNull();
    expect(obsMin.y).toBeGreaterThanOrEqual(MIN_Y);
    expect(obsMin.y).toBeLessThanOrEqual(MAX_Y);

    // Test with randomFn returning 1 (maximum Y)
    const engineMax = createScrollingEngine(config, () => 1);
    const obsMax = engineMax.spawnFlyingObstacle(difficulty, 50, []);
    expect(obsMax).not.toBeNull();
    expect(obsMax.y).toBeGreaterThanOrEqual(MIN_Y);
    expect(obsMax.y).toBeLessThanOrEqual(MAX_Y);
  });
});
