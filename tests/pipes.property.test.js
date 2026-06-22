import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createScrollingEngine } from '../src/ScrollingEngine.js';

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

// Helper: valid dt (delta-time in seconds) as a 32-bit float
const dtArb = fc.float({ min: Math.fround(0.001), max: Math.fround(0.033), noNaN: true, noDefaultInfinity: true });

// Helper: valid pipe speed in px/s
const pipeSpeedArb = fc.float({ min: Math.fround(60), max: Math.fround(280), noNaN: true, noDefaultInfinity: true });

// Helper: valid gap height in px
const gapHeightArb = fc.float({ min: Math.fround(90), max: Math.fround(140), noNaN: true, noDefaultInfinity: true });

// Helper: random float [0,1] for deterministic pipe gap generation
const randomFloatArb = fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true, noDefaultInfinity: true });

/**
 * Property 8: Pipe gap center within bounds
 *
 * For any generated pipe pair, the gap center vertical position SHALL be
 * between 20% and 80% of the playable area height (canvas height minus HUD height).
 *
 * **Validates: Requirements 3.2**
 */
describe('Property 8: Pipe gap center within bounds', () => {
  it('gap center is always between 20% and 80% of playable area for any random value', () => {
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
    ));
  });
});

/**
 * Property 9: Pipe movement at correct speed
 *
 * For any pipe pair position and valid delta-time in the Playing state,
 * after one scrolling update the pipe's x position SHALL decrease by
 * exactly pipeSpeed * dt.
 *
 * **Validates: Requirements 3.3**
 */
describe('Property 9: Pipe movement at correct speed', () => {
  it('pipe x decreases by exactly pipeSpeed * dt after one update in playing state', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      dtArb,
      gapHeightArb,
      (pipeSpeed, dt, gapHeight) => {
        const engine = createScrollingEngine(config, () => 0.5);
        const difficulty = { pipeSpeed, gapHeight, pipeSpacing: 9999 };

        // Spawn a pipe and place it in game objects
        const pipe = engine.spawnPipePair(difficulty);
        const initialX = pipe.x;
        const gameObjects = { pipes: [pipe], collectibles: [] };

        // Run one update
        engine.update(gameObjects, dt, difficulty, 'playing');

        const expectedX = initialX - pipeSpeed * dt;
        expect(gameObjects.pipes[0].x).toBeCloseTo(expectedX, 3);
      }
    ));
  });
});

/**
 * Property 10: Offscreen object removal
 *
 * For any pipe pair or collectible whose right edge (x + width) is less than zero,
 * after the removal pass that object SHALL no longer exist in the active game objects array.
 *
 * **Validates: Requirements 3.4, 6.5**
 */
describe('Property 10: Offscreen object removal', () => {
  it('pipes with right edge < 0 are removed after removeOffscreen', () => {
    fc.assert(fc.property(
      // Generate a negative x such that x + pipeWidth < 0 (i.e., x < -pipeWidth)
      fc.float({ min: Math.fround(-1000), max: Math.fround(-PIPE_WIDTH - 1), noNaN: true, noDefaultInfinity: true }),
      fc.integer({ min: 1, max: 5 }),
      (offscreenX, count) => {
        const engine = createScrollingEngine(config, () => 0.5);

        // Create pipes that are off-screen
        const gameObjects = { pipes: [], collectibles: [] };
        for (let i = 0; i < count; i++) {
          gameObjects.pipes.push({
            x: offscreenX,
            width: PIPE_WIDTH,
            gapCenterY: 300,
            gapHeight: 140,
            scored: false
          });
        }

        engine.removeOffscreen(gameObjects);

        expect(gameObjects.pipes.length).toBe(0);
      }
    ));
  });

  it('collectibles with right edge < 0 are removed after removeOffscreen', () => {
    fc.assert(fc.property(
      // Generate a negative x such that x + collectible width (30) < 0
      fc.float({ min: Math.fround(-1000), max: Math.fround(-31), noNaN: true, noDefaultInfinity: true }),
      fc.integer({ min: 1, max: 5 }),
      (offscreenX, count) => {
        const engine = createScrollingEngine(config, () => 0.5);

        const gameObjects = { pipes: [], collectibles: [] };
        for (let i = 0; i < count; i++) {
          gameObjects.collectibles.push({
            x: offscreenX,
            y: 200,
            width: 30,
            height: 20,
            speed: 120,
            opacity: 0.5,
            oscillateOffset: 0,
            collected: false
          });
        }

        engine.removeOffscreen(gameObjects);

        expect(gameObjects.collectibles.length).toBe(0);
      }
    ));
  });

  it('objects with right edge >= 0 are NOT removed', () => {
    fc.assert(fc.property(
      // Generate x such that x + min(pipeWidth, collectibleWidth) >= 0
      // Collectible width=30 is the smallest, so x >= 0 guarantees both stay on screen
      fc.float({ min: Math.fround(0), max: Math.fround(500), noNaN: true, noDefaultInfinity: true }),
      (onscreenX) => {
        const engine = createScrollingEngine(config, () => 0.5);

        const gameObjects = {
          pipes: [{
            x: onscreenX,
            width: PIPE_WIDTH,
            gapCenterY: 300,
            gapHeight: 140,
            scored: false
          }],
          collectibles: [{
            x: onscreenX,
            y: 200,
            width: 30,
            height: 20,
            speed: 120,
            opacity: 0.5,
            oscillateOffset: 0,
            collected: false
          }]
        };

        engine.removeOffscreen(gameObjects);

        expect(gameObjects.pipes.length).toBe(1);
        expect(gameObjects.collectibles.length).toBe(1);
      }
    ));
  });
});
