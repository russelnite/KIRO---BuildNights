import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createScrollingEngine } from '../src/ScrollingEngine.js';

/**
 * Property 10: Flying obstacle count cap
 *
 * For any sequence of spawn attempts at any difficulty level, the number of
 * active (on-screen) flying obstacles SHALL never exceed 2 at any point in time.
 *
 * **Validates: Requirements 5.6**
 */
describe('Property 10: Flying obstacle count cap', () => {
  const MAX_ON_SCREEN = 2;

  function makeConfig() {
    return {
      canvas: { width: 800, height: 500, hudHeight: 40 },
      pipes: { width: 60, gapMinPercent: 0.2, gapMaxPercent: 0.8 },
      pools: { pipes: 8, collectibles: 6, clouds: 15 },
      difficulty: { baseSpacing: 350 },
      flyingObstacles: {
        activationThreshold: 30,
        maxOnScreen: MAX_ON_SCREEN,
        spawnYMinPercent: 0.15,
        spawnYMaxPercent: 0.85,
        heightRatio: 0.75,
        poolSize: 4,
        width: 40
      },
      character: { spriteHeight: 44 }
    };
  }

  function makeDifficulty(pipeSpeed, speedMultiplier) {
    return {
      pipeSpeed: pipeSpeed,
      gapHeight: 120,
      pipeSpacing: 300,
      flyingObstacleSpeedMultiplier: speedMultiplier,
      flyingObstacleSpawnInterval: { min: 1500, max: 3000 }
    };
  }

  it('active flying obstacle count never exceeds 2 for any sequence of rapid spawn attempts', () => {
    fc.assert(fc.property(
      fc.integer({ min: 30, max: 200 }),       // score (always above activation threshold)
      fc.integer({ min: 3, max: 50 }),          // number of spawn attempts
      fc.integer({ min: 120, max: 280 }),       // pipeSpeed
      fc.float({ min: Math.fround(1.2), max: Math.fround(2.0), noNaN: true }), // speedMultiplier
      (score, spawnAttempts, pipeSpeed, speedMultiplier) => {
        const engine = createScrollingEngine(makeConfig(), Math.random);
        const difficulty = makeDifficulty(pipeSpeed, speedMultiplier);
        const flyingObstacles = [];

        for (let i = 0; i < spawnAttempts; i++) {
          const obstacle = engine.spawnFlyingObstacle(difficulty, score, flyingObstacles);
          if (obstacle) {
            flyingObstacles.push(obstacle);
          }
          // After every spawn attempt, the count must never exceed max
          expect(flyingObstacles.length).toBeLessThanOrEqual(MAX_ON_SCREEN);
        }
      }
    ), { numRuns: 200 });
  });

  it('active count stays capped at 2 even when difficulty and score vary between spawns', () => {
    fc.assert(fc.property(
      fc.array(
        fc.record({
          score: fc.integer({ min: 30, max: 200 }),
          pipeSpeed: fc.integer({ min: 120, max: 280 }),
          speedMultiplier: fc.float({ min: Math.fround(1.2), max: Math.fround(2.0), noNaN: true })
        }),
        { minLength: 5, maxLength: 30 }
      ),
      (spawnSequence) => {
        const engine = createScrollingEngine(makeConfig(), Math.random);
        const flyingObstacles = [];

        for (const attempt of spawnSequence) {
          const difficulty = makeDifficulty(attempt.pipeSpeed, attempt.speedMultiplier);
          const obstacle = engine.spawnFlyingObstacle(difficulty, attempt.score, flyingObstacles);
          if (obstacle) {
            flyingObstacles.push(obstacle);
          }
          expect(flyingObstacles.length).toBeLessThanOrEqual(MAX_ON_SCREEN);
        }
      }
    ), { numRuns: 200 });
  });

  it('count cap is enforced regardless of obstacles being removed between spawns', () => {
    fc.assert(fc.property(
      fc.integer({ min: 30, max: 200 }),       // score
      fc.integer({ min: 5, max: 30 }),          // total operations
      fc.array(fc.boolean(), { minLength: 5, maxLength: 30 }), // whether to remove before spawning
      (score, _totalOps, removeSequence) => {
        const engine = createScrollingEngine(makeConfig(), Math.random);
        const difficulty = makeDifficulty(180, 1.5);
        const flyingObstacles = [];

        for (let i = 0; i < removeSequence.length; i++) {
          // Optionally remove one obstacle (simulating off-screen exit)
          if (removeSequence[i] && flyingObstacles.length > 0) {
            flyingObstacles.pop();
          }

          // Attempt a spawn
          const obstacle = engine.spawnFlyingObstacle(difficulty, score, flyingObstacles);
          if (obstacle) {
            flyingObstacles.push(obstacle);
          }

          // Invariant: count never exceeds max
          expect(flyingObstacles.length).toBeLessThanOrEqual(MAX_ON_SCREEN);
        }
      }
    ), { numRuns: 200 });
  });
});
