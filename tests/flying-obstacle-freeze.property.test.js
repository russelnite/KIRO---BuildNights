/**
 * Property 13: Flying obstacles freeze in non-playing states
 *
 * For any set of active flying obstacles and any positive delta-time,
 * when the game state is Paused, all flying obstacle positions SHALL remain unchanged.
 * When the game state is Game_Over or Ready, no flying obstacles SHALL be spawned or moved.
 *
 * **Validates: Requirements 5.10, 5.11**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createScrollingEngine } from '../src/ScrollingEngine.js';

// Arbitrary for a flying obstacle object with random position and speed
const flyingObstacleArb = fc.record({
  x: fc.float({ min: Math.fround(-100), max: Math.fround(1000), noNaN: true }),
  y: fc.float({ min: Math.fround(0), max: Math.fround(460), noNaN: true }),
  width: fc.constant(40),
  height: fc.constant(33),
  speed: fc.float({ min: Math.fround(50), max: Math.fround(600), noNaN: true }),
  active: fc.constant(true)
});

// Array of 0-4 flying obstacles
const flyingObstacleArrayArb = fc.array(flyingObstacleArb, { minLength: 0, maxLength: 4 });

// Positive dt values (in seconds)
const dtArb = fc.float({ min: Math.fround(0.001), max: Math.fround(0.5), noNaN: true });

// Non-playing states where obstacles should freeze
const nonPlayingStateArb = fc.constantFrom('paused', 'game_over', 'ready');

// Difficulty params (needed for function signature)
const difficultyArb = fc.record({
  pipeSpeed: fc.float({ min: Math.fround(120), max: Math.fround(280), noNaN: true }),
  gapHeight: fc.float({ min: Math.fround(90), max: Math.fround(140), noNaN: true }),
  pipeSpacing: fc.float({ min: Math.fround(200), max: Math.fround(350), noNaN: true }),
  flyingObstacleSpeedMultiplier: fc.float({ min: Math.fround(1.2), max: Math.fround(2.0), noNaN: true }),
  flyingObstacleSpawnInterval: fc.record({
    min: fc.float({ min: Math.fround(1500), max: Math.fround(3000), noNaN: true }),
    max: fc.float({ min: Math.fround(3000), max: Math.fround(5000), noNaN: true })
  })
});

// Score values (some above threshold to test spawning is still blocked)
const scoreArb = fc.integer({ min: 0, max: 200 });

describe('Property 13: Flying obstacles freeze in non-playing states', () => {
  it('all obstacle positions remain unchanged in paused/game_over/ready states', () => {
    fc.assert(
      fc.property(
        flyingObstacleArrayArb,
        dtArb,
        nonPlayingStateArb,
        difficultyArb,
        scoreArb,
        (obstacles, dt, state, difficulty, score) => {
          const engine = createScrollingEngine({
            canvas: { width: 800, height: 500, hudHeight: 40 },
            flyingObstacles: {
              activationThreshold: 30,
              maxOnScreen: 2,
              spawnYMinPercent: 0.15,
              spawnYMaxPercent: 0.85,
              heightRatio: 0.75,
              poolSize: 4
            },
            character: { spriteHeight: 44 }
          });

          // Deep copy obstacle positions before update
          const originalPositions = obstacles.map(obs => ({
            x: obs.x,
            y: obs.y
          }));
          const originalLength = obstacles.length;

          // Call updateFlyingObstacles with a non-playing state
          engine.updateFlyingObstacles(obstacles, dt, state, difficulty, score);

          // Verify all positions remain unchanged
          for (let i = 0; i < originalPositions.length; i++) {
            expect(obstacles[i].x).toBe(originalPositions[i].x);
            expect(obstacles[i].y).toBe(originalPositions[i].y);
          }

          // Verify no new obstacles were spawned (length unchanged or decreased)
          expect(obstacles.length).toBeLessThanOrEqual(originalLength);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('no new obstacles are spawned even when score exceeds threshold', () => {
    fc.assert(
      fc.property(
        flyingObstacleArrayArb,
        dtArb,
        nonPlayingStateArb,
        difficultyArb,
        fc.integer({ min: 30, max: 200 }), // score always above threshold
        (obstacles, dt, state, difficulty, score) => {
          const engine = createScrollingEngine({
            canvas: { width: 800, height: 500, hudHeight: 40 },
            flyingObstacles: {
              activationThreshold: 30,
              maxOnScreen: 2,
              spawnYMinPercent: 0.15,
              spawnYMaxPercent: 0.85,
              heightRatio: 0.75,
              poolSize: 4
            },
            character: { spriteHeight: 44 }
          });

          const originalLength = obstacles.length;

          // Even with score above threshold, non-playing states should not spawn
          engine.updateFlyingObstacles(obstacles, dt, state, difficulty, score);

          // Array length should not increase (no spawning)
          expect(obstacles.length).toBeLessThanOrEqual(originalLength);
        }
      ),
      { numRuns: 200 }
    );
  });
});
