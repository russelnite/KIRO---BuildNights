import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createScrollingEngine } from '../src/ScrollingEngine.js';

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const HUD_HEIGHT = 40;
const PIPE_WIDTH = 60;
const SPEED_FACTOR_MIN = 0.5;
const SPEED_FACTOR_MAX = 1.5;
const OPACITY_MIN = 0.4;
const OPACITY_MAX = 0.7;

const config = {
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, hudHeight: HUD_HEIGHT },
  pipes: { width: PIPE_WIDTH, gapMinPercent: 0.2, gapMaxPercent: 0.8 },
  pools: { pipes: 8, collectibles: 6 },
  difficulty: { baseSpacing: 350 },
  collectibles: {
    spawnProbabilityMin: 0.3,
    spawnProbabilityMax: 0.5,
    speedFactorMin: SPEED_FACTOR_MIN,
    speedFactorMax: SPEED_FACTOR_MAX,
    opacityMin: OPACITY_MIN,
    opacityMax: OPACITY_MAX,
    width: 30,
    height: 20
  }
};

// Arbitrary for pipe x positions (prevPipe should be to the left of newPipe)
const prevPipeXArb = fc.float({ min: Math.fround(0), max: Math.fround(300), noNaN: true, noDefaultInfinity: true });
const pipeSpacingArb = fc.float({ min: Math.fround(100), max: Math.fround(400), noNaN: true, noDefaultInfinity: true });
const pipeSpeedArb = fc.float({ min: Math.fround(60), max: Math.fround(280), noNaN: true, noDefaultInfinity: true });

// Arbitrary for a random value in [0, 1] used to vary speed factor
const randomValueArb = fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true, noDefaultInfinity: true });

/**
 * Property 15: Collectible spawn position
 *
 * For any two consecutive pipe pairs, if a collectible is spawned between them,
 * its x position SHALL be at the horizontal midpoint between the trailing edge
 * of the first pipe (prevPipe.x + prevPipe.width) and the leading edge of the
 * second pipe (newPipe.x).
 *
 * collectible.x = (prevPipe.x + prevPipe.width + newPipe.x) / 2
 *
 * **Validates: Requirements 6.1**
 */
describe('Property 15: Collectible spawn position', () => {
  it('collectible x is at the horizontal midpoint between trailing edge of prevPipe and leading edge of newPipe', () => {
    fc.assert(fc.property(
      prevPipeXArb,
      pipeSpacingArb,
      pipeSpeedArb,
      (prevPipeX, spacing, pipeSpeed) => {
        // Use randomFn that always returns 0 to guarantee spawn
        // spawnProb = 0.3 + 0 * 0.2 = 0.3; check: 0 > 0.3 → false → spawns
        const engine = createScrollingEngine(config, () => 0);

        const prevPipe = {
          x: prevPipeX,
          width: PIPE_WIDTH,
          gapCenterY: 300,
          gapHeight: 140,
          scored: false
        };

        const newPipe = {
          x: prevPipeX + spacing,
          width: PIPE_WIDTH,
          gapCenterY: 300,
          gapHeight: 140,
          scored: false
        };

        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };
        const collectible = engine.spawnCollectible(prevPipe, newPipe, difficulty);

        // With randomFn = () => 0, spawn should always succeed
        expect(collectible).not.toBeNull();

        // Expected midpoint: (prevPipe.x + prevPipe.width + newPipe.x) / 2
        const prevTrailing = prevPipe.x + prevPipe.width;
        const nextLeading = newPipe.x;
        const expectedX = (prevTrailing + nextLeading) / 2;

        expect(collectible.x).toBeCloseTo(expectedX, 3);
      }
    ));
  });
});

/**
 * Property 16: Collectible speed and opacity constraints
 *
 * For any spawned collectible:
 * - Speed SHALL be between 50% and 150% of current pipe speed:
 *   speed ∈ [pipeSpeed * 0.5, pipeSpeed * 1.5]
 * - Opacity SHALL monotonically correlate with speed: higher speed → higher opacity
 * - All opacity values between 0.4 and 0.7
 *
 * **Validates: Requirements 6.4, 6.7**
 */
describe('Property 16: Collectible speed and opacity constraints', () => {
  it('collectible speed is between 50% and 150% of pipe speed', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      randomValueArb,
      (pipeSpeed, randVal) => {
        // Use fixed randomFn to control speed factor
        const engine = createScrollingEngine(config, () => randVal);

        const prevPipe = { x: 100, width: PIPE_WIDTH, gapCenterY: 300, gapHeight: 140, scored: false };
        const newPipe = { x: 400, width: PIPE_WIDTH, gapCenterY: 300, gapHeight: 140, scored: false };
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const collectible = engine.spawnCollectible(prevPipe, newPipe, difficulty);

        // With randVal=0, spawnProb = 0.3 + 0*0.2 = 0.3, check: 0 > 0.3 → false → spawns
        // With randVal>0, spawnProb = 0.3 + randVal*0.2, check: randVal > spawnProb
        // When randVal is high enough, spawn might fail. Skip null results.
        if (collectible === null) return;

        const minSpeed = pipeSpeed * SPEED_FACTOR_MIN;
        const maxSpeed = pipeSpeed * SPEED_FACTOR_MAX;

        expect(collectible.speed).toBeGreaterThanOrEqual(minSpeed - 0.001);
        expect(collectible.speed).toBeLessThanOrEqual(maxSpeed + 0.001);
      }
    ));
  });

  it('collectible opacity is between 0.4 and 0.7', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      randomValueArb,
      (pipeSpeed, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);

        const prevPipe = { x: 100, width: PIPE_WIDTH, gapCenterY: 300, gapHeight: 140, scored: false };
        const newPipe = { x: 400, width: PIPE_WIDTH, gapCenterY: 300, gapHeight: 140, scored: false };
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const collectible = engine.spawnCollectible(prevPipe, newPipe, difficulty);
        if (collectible === null) return;

        expect(collectible.opacity).toBeGreaterThanOrEqual(OPACITY_MIN - 0.001);
        expect(collectible.opacity).toBeLessThanOrEqual(OPACITY_MAX + 0.001);
      }
    ));
  });

  it('opacity monotonically correlates with speed: higher speed → higher opacity', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      // Two different random values to produce two different speed factors
      randomValueArb,
      randomValueArb,
      (pipeSpeed, randVal1, randVal2) => {
        // Ensure we get two distinct speed factors by using dedicated engines
        // with fixed random values that guarantee spawn
        // Use () => 0 for spawn probability, then override speed factor via separate calls

        // For reliable spawning and distinct speeds, we create a sequence of random values
        // Call order in spawnCollectible: spawnProb, probCheck, y-position, speedFactor, oscillateOffset
        // We want to control call #4 (speedFactor) while guaranteeing spawn (calls #1-2)

        // Strategy: use a counter-based random to control each call separately
        let callCount1 = 0;
        const randomSeq1 = () => {
          callCount1++;
          if (callCount1 === 4) return randVal1; // speed factor call
          return 0; // 0 guarantees spawn (spawnProb=0.3, check: 0>0.3 = false)
        };

        let callCount2 = 0;
        const randomSeq2 = () => {
          callCount2++;
          if (callCount2 === 4) return randVal2; // speed factor call
          return 0;
        };

        const engine1 = createScrollingEngine(config, randomSeq1);
        const engine2 = createScrollingEngine(config, randomSeq2);

        const prevPipe = { x: 100, width: PIPE_WIDTH, gapCenterY: 300, gapHeight: 140, scored: false };
        const newPipe = { x: 400, width: PIPE_WIDTH, gapCenterY: 300, gapHeight: 140, scored: false };
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const c1 = engine1.spawnCollectible(prevPipe, newPipe, difficulty);
        const c2 = engine2.spawnCollectible(prevPipe, newPipe, difficulty);

        expect(c1).not.toBeNull();
        expect(c2).not.toBeNull();

        // Monotonic correlation: if speed1 >= speed2 then opacity1 >= opacity2
        if (c1.speed >= c2.speed) {
          expect(c1.opacity).toBeGreaterThanOrEqual(c2.opacity - 0.001);
        } else {
          expect(c2.opacity).toBeGreaterThanOrEqual(c1.opacity - 0.001);
        }
      }
    ));
  });
});
