import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createScrollingEngine } from '../src/ScrollingEngine.js';

/**
 * Property 6: Flying obstacle activation threshold
 *
 * For any score value less than 30, the scrolling engine SHALL never spawn a flying obstacle.
 * For any score value greater than or equal to 30, the spawn system SHALL be eligible to produce
 * flying obstacles.
 *
 * **Validates: Requirements 5.1**
 */
describe('Property 6: Flying obstacle activation threshold', () => {
  const config = {
    canvas: { width: 800, height: 500, hudHeight: 40 },
    pipes: { width: 60, gapMinPercent: 0.2, gapMaxPercent: 0.8 },
    pools: { pipes: 8, collectibles: 6, clouds: 15 },
    difficulty: { baseSpacing: 350 },
    flyingObstacles: {
      activationThreshold: 30,
      maxOnScreen: 2,
      spawnYMinPercent: 0.15,
      spawnYMaxPercent: 0.85,
      heightRatio: 0.75,
      poolSize: 4
    },
    character: { spriteHeight: 44 }
  };

  const difficulty = {
    pipeSpeed: 150,
    gapHeight: 130,
    pipeSpacing: 300,
    flyingObstacleSpeedMultiplier: 1.2,
    flyingObstacleSpawnInterval: { min: 3000, max: 5000 }
  };

  it('no flying obstacle spawns when score < 30', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 29 }),
      (score) => {
        const engine = createScrollingEngine(config, () => 0.5);
        const flyingObstacles = [];
        const result = engine.spawnFlyingObstacle(difficulty, score, flyingObstacles);
        expect(result).toBeNull();
      }
    ));
  });

  it('flying obstacle is eligible to spawn when score >= 30', () => {
    fc.assert(fc.property(
      fc.integer({ min: 30, max: 100 }),
      (score) => {
        const engine = createScrollingEngine(config, () => 0.5);
        const flyingObstacles = [];
        const result = engine.spawnFlyingObstacle(difficulty, score, flyingObstacles);
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('x');
        expect(result).toHaveProperty('y');
        expect(result).toHaveProperty('width');
        expect(result).toHaveProperty('height');
        expect(result).toHaveProperty('speed');
        expect(result.active).toBe(true);
      }
    ));
  });
});
