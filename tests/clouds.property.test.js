import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createScrollingEngine } from '../src/ScrollingEngine.js';

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const HUD_HEIGHT = 40;
const PIPE_WIDTH = 60;

// Layer definitions from CONFIG (design doc)
const CLOUD_LAYERS = [
  { speedFactor: [0.1, 0.3], opacity: [0.1, 0.3], scale: [0.2, 0.4] },  // far (0)
  { speedFactor: [0.4, 0.6], opacity: [0.3, 0.5], scale: [0.5, 0.7] },  // mid (1)
  { speedFactor: [0.7, 0.9], opacity: [0.5, 0.7], scale: [0.8, 1.0] }   // near (2)
];

const CLOUD_COUNT_MIN = 2;
const CLOUD_COUNT_MAX = 5;

const config = {
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, hudHeight: HUD_HEIGHT },
  pipes: { width: PIPE_WIDTH, gapMinPercent: 0.2, gapMaxPercent: 0.8 },
  pools: { pipes: 8, collectibles: 6, clouds: 15 },
  difficulty: { baseSpacing: 350 },
  clouds: {
    layers: CLOUD_LAYERS,
    countPerLayer: [CLOUD_COUNT_MIN, CLOUD_COUNT_MAX],
    baseWidth: [60, 120]
  },
  collectibles: {
    spawnProbabilityMin: 0.3,
    spawnProbabilityMax: 0.5,
    speedFactorMin: 0.5,
    speedFactorMax: 1.5,
    opacityMin: 0.4,
    opacityMax: 0.7,
    width: 30,
    height: 20
  }
};

// Arbitraries
const layerArb = fc.integer({ min: 0, max: 2 });
const pipeSpeedArb = fc.float({ min: Math.fround(60), max: Math.fround(280), noNaN: true, noDefaultInfinity: true });
const dtArb = fc.float({ min: Math.fround(0.001), max: Math.fround(0.033), noNaN: true, noDefaultInfinity: true });
const randomSeedArb = fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true, noDefaultInfinity: true });

/**
 * Property 18: Cloud layer properties
 *
 * For any cloud on a given parallax layer (0=far, 1=mid, 2=near), its speed,
 * opacity, and scale SHALL be within the defined ranges for that layer:
 * - Far (0): speed = [0.1-0.3]*pipeSpeed, opacity [0.1-0.3], scale [0.2-0.4]
 * - Mid (1): speed = [0.4-0.6]*pipeSpeed, opacity [0.3-0.5], scale [0.5-0.7]
 * - Near (2): speed = [0.7-0.9]*pipeSpeed, opacity [0.5-0.7], scale [0.8-1.0]
 *
 * **Validates: Requirements 9.2, 9.3, 9.4**
 */
describe('Property 18: Cloud layer properties', () => {
  it('cloud speed is within layer speedFactor range × pipeSpeed', () => {
    fc.assert(fc.property(
      layerArb,
      pipeSpeedArb,
      randomSeedArb,
      (layer, pipeSpeed, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const cloud = engine.spawnCloud(layer, difficulty, false);

        const layerDef = CLOUD_LAYERS[layer];
        const minSpeed = layerDef.speedFactor[0] * pipeSpeed;
        const maxSpeed = layerDef.speedFactor[1] * pipeSpeed;

        expect(cloud.speed).toBeGreaterThanOrEqual(minSpeed - 0.01);
        expect(cloud.speed).toBeLessThanOrEqual(maxSpeed + 0.01);
      }
    ));
  });

  it('cloud opacity is within layer opacity range', () => {
    fc.assert(fc.property(
      layerArb,
      pipeSpeedArb,
      randomSeedArb,
      (layer, pipeSpeed, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const cloud = engine.spawnCloud(layer, difficulty, false);

        const layerDef = CLOUD_LAYERS[layer];
        expect(cloud.opacity).toBeGreaterThanOrEqual(layerDef.opacity[0] - 0.001);
        expect(cloud.opacity).toBeLessThanOrEqual(layerDef.opacity[1] + 0.001);
      }
    ));
  });

  it('cloud scale is within layer scale range', () => {
    fc.assert(fc.property(
      layerArb,
      pipeSpeedArb,
      randomSeedArb,
      (layer, pipeSpeed, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const cloud = engine.spawnCloud(layer, difficulty, false);

        const layerDef = CLOUD_LAYERS[layer];
        expect(cloud.scale).toBeGreaterThanOrEqual(layerDef.scale[0] - 0.001);
        expect(cloud.scale).toBeLessThanOrEqual(layerDef.scale[1] + 0.001);
      }
    ));
  });

  it('cloud layer index matches the requested layer', () => {
    fc.assert(fc.property(
      layerArb,
      pipeSpeedArb,
      randomSeedArb,
      (layer, pipeSpeed, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const cloud = engine.spawnCloud(layer, difficulty, false);
        expect(cloud.layer).toBe(layer);
      }
    ));
  });
});

/**
 * Property 19: Cloud count invariant
 *
 * For any game state after initClouds or updateClouds (including cloud recycling),
 * each parallax layer SHALL contain between 2 and 5 clouds.
 *
 * **Validates: Requirements 9.8**
 */
describe('Property 19: Cloud count invariant', () => {
  it('initClouds produces 2-5 clouds per layer', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      randomSeedArb,
      (pipeSpeed, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const clouds = engine.initClouds(difficulty);

        expect(clouds).toHaveLength(3);
        for (let layer = 0; layer < 3; layer++) {
          expect(clouds[layer].length).toBeGreaterThanOrEqual(CLOUD_COUNT_MIN);
          expect(clouds[layer].length).toBeLessThanOrEqual(CLOUD_COUNT_MAX);
        }
      }
    ));
  });

  it('updateClouds maintains 2-5 clouds per layer after multiple updates', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      dtArb,
      fc.integer({ min: 1, max: 20 }),
      randomSeedArb,
      (pipeSpeed, dt, iterations, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const clouds = engine.initClouds(difficulty);

        // Run multiple update cycles
        for (let i = 0; i < iterations; i++) {
          engine.updateClouds(clouds, dt, difficulty, 'playing');
        }

        for (let layer = 0; layer < 3; layer++) {
          expect(clouds[layer].length).toBeGreaterThanOrEqual(CLOUD_COUNT_MIN);
          expect(clouds[layer].length).toBeLessThanOrEqual(CLOUD_COUNT_MAX);
        }
      }
    ));
  });

  it('updateClouds maintains count in Ready state', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      dtArb,
      randomSeedArb,
      (pipeSpeed, dt, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const clouds = engine.initClouds(difficulty);
        engine.updateClouds(clouds, dt, difficulty, 'ready');

        for (let layer = 0; layer < 3; layer++) {
          expect(clouds[layer].length).toBeGreaterThanOrEqual(CLOUD_COUNT_MIN);
          expect(clouds[layer].length).toBeLessThanOrEqual(CLOUD_COUNT_MAX);
        }
      }
    ));
  });

  it('updateClouds maintains count in GameOver state', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      dtArb,
      randomSeedArb,
      (pipeSpeed, dt, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const clouds = engine.initClouds(difficulty);
        engine.updateClouds(clouds, dt, difficulty, 'game_over');

        for (let layer = 0; layer < 3; layer++) {
          expect(clouds[layer].length).toBeGreaterThanOrEqual(CLOUD_COUNT_MIN);
          expect(clouds[layer].length).toBeLessThanOrEqual(CLOUD_COUNT_MAX);
        }
      }
    ));
  });
});

/**
 * Property 20: Clouds continue scrolling in non-playing states
 *
 * For any cloud position in the Ready or Game_Over state, after a scrolling update
 * with positive delta-time, the cloud's x position SHALL decrease (clouds keep
 * moving for visual interest), while pipe and collectible positions remain unchanged.
 *
 * **Validates: Requirements 9.6, 7.12**
 */
describe('Property 20: Clouds continue scrolling in non-playing states', () => {
  it('clouds move left in Ready state', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      dtArb,
      randomSeedArb,
      (pipeSpeed, dt, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const clouds = engine.initClouds(difficulty);

        // Record initial x positions of clouds that are on-screen (not about to recycle)
        const initialPositions = clouds.map(layer =>
          layer.map(cloud => cloud.x)
        );

        engine.updateClouds(clouds, dt, difficulty, 'ready');

        // At least some clouds should have moved left (x decreased)
        // Clouds that were off-screen left might have been recycled to right
        let anyMoved = false;
        for (let layer = 0; layer < 3; layer++) {
          for (let i = 0; i < clouds[layer].length; i++) {
            const cloud = clouds[layer][i];
            const initialX = initialPositions[layer][i];
            // Cloud either moved left OR was recycled to right (off-screen)
            if (cloud.x < initialX) {
              anyMoved = true;
            }
          }
        }
        expect(anyMoved).toBe(true);
      }
    ));
  });

  it('clouds move left in GameOver state', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      dtArb,
      randomSeedArb,
      (pipeSpeed, dt, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const clouds = engine.initClouds(difficulty);

        const initialPositions = clouds.map(layer =>
          layer.map(cloud => cloud.x)
        );

        engine.updateClouds(clouds, dt, difficulty, 'game_over');

        let anyMoved = false;
        for (let layer = 0; layer < 3; layer++) {
          for (let i = 0; i < clouds[layer].length; i++) {
            const cloud = clouds[layer][i];
            const initialX = initialPositions[layer][i];
            if (cloud.x < initialX) {
              anyMoved = true;
            }
          }
        }
        expect(anyMoved).toBe(true);
      }
    ));
  });

  it('pipes do NOT move in Ready state', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      dtArb,
      randomSeedArb,
      (pipeSpeed, dt, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        // Create some pipes at known positions
        const gameObjects = {
          pipes: [
            { x: 200, width: PIPE_WIDTH, gapCenterY: 300, gapHeight: 140, scored: false },
            { x: 400, width: PIPE_WIDTH, gapCenterY: 250, gapHeight: 140, scored: false }
          ],
          collectibles: []
        };

        const initialPipePositions = gameObjects.pipes.map(p => p.x);

        // Call the main update in 'ready' state — pipes should NOT move
        engine.update(gameObjects, dt, difficulty, 'ready');

        for (let i = 0; i < gameObjects.pipes.length; i++) {
          expect(gameObjects.pipes[i].x).toBe(initialPipePositions[i]);
        }
      }
    ));
  });

  it('pipes do NOT move in GameOver state', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      dtArb,
      randomSeedArb,
      (pipeSpeed, dt, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const gameObjects = {
          pipes: [
            { x: 200, width: PIPE_WIDTH, gapCenterY: 300, gapHeight: 140, scored: false },
            { x: 400, width: PIPE_WIDTH, gapCenterY: 250, gapHeight: 140, scored: false }
          ],
          collectibles: []
        };

        const initialPipePositions = gameObjects.pipes.map(p => p.x);

        engine.update(gameObjects, dt, difficulty, 'game_over');

        for (let i = 0; i < gameObjects.pipes.length; i++) {
          expect(gameObjects.pipes[i].x).toBe(initialPipePositions[i]);
        }
      }
    ));
  });

  it('clouds do NOT move in Paused state', () => {
    fc.assert(fc.property(
      pipeSpeedArb,
      dtArb,
      randomSeedArb,
      (pipeSpeed, dt, randVal) => {
        const engine = createScrollingEngine(config, () => randVal);
        const difficulty = { pipeSpeed, gapHeight: 140, pipeSpacing: 350 };

        const clouds = engine.initClouds(difficulty);

        const initialPositions = clouds.map(layer =>
          layer.map(cloud => cloud.x)
        );

        engine.updateClouds(clouds, dt, difficulty, 'paused');

        // All clouds should remain at exact same position when paused
        for (let layer = 0; layer < 3; layer++) {
          for (let i = 0; i < clouds[layer].length; i++) {
            expect(clouds[layer][i].x).toBe(initialPositions[layer][i]);
          }
        }
      }
    ));
  });
});
