import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createPhysicsEngine } from '../src/PhysicsEngine.js';
import { createScrollingEngine } from '../src/ScrollingEngine.js';

// Helper arbitraries
const dtArb = fc.float({ min: Math.fround(0.001), max: Math.fround(0.033), noNaN: true, noDefaultInfinity: true });
const velocityArb = fc.float({ min: Math.fround(-400), max: Math.fround(600), noNaN: true, noDefaultInfinity: true });
const positionArb = fc.float({ min: Math.fround(0), max: Math.fround(500), noNaN: true, noDefaultInfinity: true });
const xPositionArb = fc.float({ min: Math.fround(0), max: Math.fround(800), noNaN: true, noDefaultInfinity: true });
const speedArb = fc.float({ min: Math.fround(60), max: Math.fround(180), noNaN: true, noDefaultInfinity: true });

// Ghost arbitrary
const ghostArb = fc.record({
  x: fc.constant(120),
  y: positionArb,
  velocity: velocityArb
});

// Pipe arbitrary
const pipeArb = fc.record({
  x: xPositionArb,
  width: fc.constant(60),
  gapCenterY: positionArb,
  gapHeight: fc.float({ min: Math.fround(90), max: Math.fround(140), noNaN: true, noDefaultInfinity: true }),
  scored: fc.boolean()
});

// Collectible arbitrary
const collectibleArb = fc.record({
  x: xPositionArb,
  y: positionArb,
  width: fc.constant(30),
  height: fc.constant(20),
  speed: speedArb,
  opacity: fc.float({ min: Math.fround(0.4), max: Math.fround(0.7), noNaN: true, noDefaultInfinity: true }),
  oscillateOffset: fc.float({ min: Math.fround(0), max: Math.fround(6.28), noNaN: true, noDefaultInfinity: true }),
  collected: fc.constant(false)
});

// Cloud arbitrary
const cloudArb = fc.record({
  x: fc.float({ min: Math.fround(-120), max: Math.fround(600), noNaN: true, noDefaultInfinity: true }),
  y: positionArb,
  width: fc.float({ min: Math.fround(20), max: Math.fround(120), noNaN: true, noDefaultInfinity: true }),
  height: fc.float({ min: Math.fround(10), max: Math.fround(60), noNaN: true, noDefaultInfinity: true }),
  layer: fc.integer({ min: 0, max: 2 }),
  speed: speedArb,
  opacity: fc.float({ min: Math.fround(0.1), max: Math.fround(0.7), noNaN: true, noDefaultInfinity: true }),
  scale: fc.float({ min: Math.fround(0.2), max: Math.fround(1.0), noNaN: true, noDefaultInfinity: true })
});

// Difficulty params arbitrary
const difficultyArb = fc.record({
  pipeSpeed: fc.float({ min: Math.fround(120), max: Math.fround(280), noNaN: true, noDefaultInfinity: true }),
  gapHeight: fc.float({ min: Math.fround(90), max: Math.fround(140), noNaN: true, noDefaultInfinity: true }),
  pipeSpacing: fc.float({ min: Math.fround(200), max: Math.fround(350), noNaN: true, noDefaultInfinity: true })
});

/**
 * Property 17: Paused state freezes all positions and velocities
 *
 * For any game state configuration in the Paused state, after a physics or
 * scrolling update with any delta-time, all ghost positions, ghost velocity,
 * pipe positions, collectible positions, and cloud positions SHALL remain
 * exactly unchanged.
 *
 * **Validates: Requirements 7.6, 7.9**
 */
describe('Property 17: Paused state freezes all positions and velocities', () => {
  it('PhysicsEngine.update does not change ghost position or velocity when paused', () => {
    const engine = createPhysicsEngine();

    fc.assert(fc.property(
      ghostArb,
      dtArb,
      (ghost, dt) => {
        const snapshotY = ghost.y;
        const snapshotVelocity = ghost.velocity;

        engine.update(ghost, dt, 'paused');

        expect(ghost.y).toBe(snapshotY);
        expect(ghost.velocity).toBe(snapshotVelocity);
      }
    ));
  });

  it('ScrollingEngine.update does not change pipe positions when paused', () => {
    const scrollEngine = createScrollingEngine();

    fc.assert(fc.property(
      fc.array(pipeArb, { minLength: 1, maxLength: 5 }),
      fc.array(collectibleArb, { minLength: 0, maxLength: 3 }),
      dtArb,
      difficultyArb,
      (pipes, collectibles, dt, difficulty) => {
        const gameObjects = { pipes, collectibles };

        // Snapshot all pipe x positions
        const pipeSnapshots = pipes.map(p => p.x);

        scrollEngine.update(gameObjects, dt, difficulty, 'paused');

        // All pipe positions must remain exactly unchanged
        for (let i = 0; i < pipes.length; i++) {
          expect(gameObjects.pipes[i].x).toBe(pipeSnapshots[i]);
        }
      }
    ));
  });

  it('ScrollingEngine.update does not change collectible positions when paused', () => {
    const scrollEngine = createScrollingEngine();

    fc.assert(fc.property(
      fc.array(pipeArb, { minLength: 0, maxLength: 3 }),
      fc.array(collectibleArb, { minLength: 1, maxLength: 5 }),
      dtArb,
      difficultyArb,
      (pipes, collectibles, dt, difficulty) => {
        const gameObjects = { pipes, collectibles };

        // Snapshot all collectible x positions
        const collectibleSnapshots = collectibles.map(c => c.x);

        scrollEngine.update(gameObjects, dt, difficulty, 'paused');

        // All collectible positions must remain exactly unchanged
        for (let i = 0; i < collectibles.length; i++) {
          expect(gameObjects.collectibles[i].x).toBe(collectibleSnapshots[i]);
        }
      }
    ));
  });

  it('ScrollingEngine.updateClouds does not change cloud positions when paused', () => {
    const scrollEngine = createScrollingEngine();

    fc.assert(fc.property(
      fc.array(cloudArb, { minLength: 2, maxLength: 5 }),
      fc.array(cloudArb, { minLength: 2, maxLength: 5 }),
      fc.array(cloudArb, { minLength: 2, maxLength: 5 }),
      dtArb,
      difficultyArb,
      (farClouds, midClouds, nearClouds, dt, difficulty) => {
        const clouds = [farClouds, midClouds, nearClouds];

        // Snapshot all cloud x positions across all layers
        const cloudSnapshots = clouds.map(layer => layer.map(c => c.x));

        scrollEngine.updateClouds(clouds, dt, difficulty, 'paused');

        // All cloud positions must remain exactly unchanged
        for (let layer = 0; layer < 3; layer++) {
          for (let i = 0; i < clouds[layer].length; i++) {
            expect(clouds[layer][i].x).toBe(cloudSnapshots[layer][i]);
          }
        }
      }
    ));
  });
});
