import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createScrollingEngine } from '../src/ScrollingEngine.js';

/**
 * Property 14: Pipe gap centers within landscape bounds
 *
 * For any generated pipe pair in the 800×500 canvas, the gap center vertical
 * position SHALL be between 20% and 80% of the playable area height (500 - hudHeight).
 *
 * Canvas: 800×500 (landscape)
 * HUD height: 40px
 * Playable area: 500 - 40 = 460px
 * Min gapCenterY: 460 * 0.2 = 92px
 * Max gapCenterY: 460 * 0.8 = 368px
 *
 * **Validates: Requirements 1.6**
 */

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const HUD_HEIGHT = 40;
const PIPE_WIDTH = 60;
const PLAYABLE_HEIGHT = CANVAS_HEIGHT - HUD_HEIGHT; // 460
const GAP_MIN_PERCENT = 0.2;
const GAP_MAX_PERCENT = 0.8;
const MIN_GAP_CENTER_Y = PLAYABLE_HEIGHT * GAP_MIN_PERCENT; // 92
const MAX_GAP_CENTER_Y = PLAYABLE_HEIGHT * GAP_MAX_PERCENT; // 368

const config = {
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, hudHeight: HUD_HEIGHT },
  pipes: { width: PIPE_WIDTH, gapMinPercent: GAP_MIN_PERCENT, gapMaxPercent: GAP_MAX_PERCENT },
  pools: { pipes: 8, collectibles: 6 },
  difficulty: { baseSpacing: 350 }
};

// Arbitrary: random float in [0, 1] to drive pipe gap generation deterministically
const randomFloatArb = fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true, noDefaultInfinity: true });

// Arbitrary: valid gap heights from the difficulty system
const gapHeightArb = fc.float({ min: Math.fround(90), max: Math.fround(140), noNaN: true, noDefaultInfinity: true });

// Arbitrary: valid pipe speeds
const pipeSpeedArb = fc.float({ min: Math.fround(60), max: Math.fround(280), noNaN: true, noDefaultInfinity: true });

describe('Feature: visual-overhaul, Property 14: Pipe gap centers within landscape bounds', () => {
  it('gapCenterY is always between 20% and 80% of playable area (92px–368px) for any random seed', () => {
    fc.assert(fc.property(
      randomFloatArb,
      gapHeightArb,
      (randomValue, gapHeight) => {
        const engine = createScrollingEngine(config, () => randomValue);
        const difficulty = { pipeSpeed: 120, gapHeight, pipeSpacing: 350 };
        const pipe = engine.spawnPipePair(difficulty);

        expect(pipe.gapCenterY).toBeGreaterThanOrEqual(MIN_GAP_CENTER_Y);
        expect(pipe.gapCenterY).toBeLessThanOrEqual(MAX_GAP_CENTER_Y);
      }
    ), { numRuns: 200 });
  });

  it('gapCenterY stays within bounds across varying pipe speeds and gap heights', () => {
    fc.assert(fc.property(
      randomFloatArb,
      pipeSpeedArb,
      gapHeightArb,
      (randomValue, pipeSpeed, gapHeight) => {
        const engine = createScrollingEngine(config, () => randomValue);
        const difficulty = { pipeSpeed, gapHeight, pipeSpacing: 350 };
        const pipe = engine.spawnPipePair(difficulty);

        expect(pipe.gapCenterY).toBeGreaterThanOrEqual(MIN_GAP_CENTER_Y);
        expect(pipe.gapCenterY).toBeLessThanOrEqual(MAX_GAP_CENTER_Y);
      }
    ), { numRuns: 200 });
  });

  it('gapCenterY bounds hold when spawning multiple pipes sequentially', () => {
    fc.assert(fc.property(
      fc.array(randomFloatArb, { minLength: 3, maxLength: 10 }),
      gapHeightArb,
      (randomValues, gapHeight) => {
        let callIndex = 0;
        const engine = createScrollingEngine(config, () => {
          const val = randomValues[callIndex % randomValues.length];
          callIndex++;
          return val;
        });

        const difficulty = { pipeSpeed: 150, gapHeight, pipeSpacing: 350 };

        // Spawn multiple pipe pairs and verify each is in bounds
        for (let i = 0; i < randomValues.length; i++) {
          const pipe = engine.spawnPipePair(difficulty);
          expect(pipe.gapCenterY).toBeGreaterThanOrEqual(MIN_GAP_CENTER_Y);
          expect(pipe.gapCenterY).toBeLessThanOrEqual(MAX_GAP_CENTER_Y);
        }
      }
    ), { numRuns: 100 });
  });
});
