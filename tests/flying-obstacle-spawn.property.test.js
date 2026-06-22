import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluate, DEFAULT_CONFIG, DEFAULT_FLYING_OBSTACLE_CONFIG } from '../src/DifficultyManager.js';

/**
 * Property 9: Flying obstacle spawn interval within bounds and monotonically decreasing
 *
 * For any score >= 30, the flying obstacle spawn interval SHALL be within [1500, 5000] milliseconds,
 * and for any two scores s1 < s2 (both >= 30), the spawn interval at s2 SHALL be less than or equal
 * to the spawn interval at s1.
 *
 * **Validates: Requirements 5.4**
 */
describe('Property 9: Flying obstacle spawn interval within bounds and monotonically decreasing', () => {
  it('spawn interval min is within [1500, 5000] for any score >= 30', () => {
    fc.assert(fc.property(
      fc.integer({ min: 30, max: 200 }),
      (score) => {
        const result = evaluate(score, DEFAULT_CONFIG, DEFAULT_FLYING_OBSTACLE_CONFIG);
        expect(result.flyingObstacleSpawnInterval).not.toBeNull();
        expect(result.flyingObstacleSpawnInterval.min).toBeGreaterThanOrEqual(1500);
        expect(result.flyingObstacleSpawnInterval.min).toBeLessThanOrEqual(5000);
      }
    ));
  });

  it('spawn interval max is within [1500, 5000] for any score >= 30', () => {
    fc.assert(fc.property(
      fc.integer({ min: 30, max: 200 }),
      (score) => {
        const result = evaluate(score, DEFAULT_CONFIG, DEFAULT_FLYING_OBSTACLE_CONFIG);
        expect(result.flyingObstacleSpawnInterval).not.toBeNull();
        expect(result.flyingObstacleSpawnInterval.max).toBeGreaterThanOrEqual(1500);
        expect(result.flyingObstacleSpawnInterval.max).toBeLessThanOrEqual(5000);
      }
    ));
  });

  it('spawn interval min is monotonically non-increasing as score increases', () => {
    fc.assert(fc.property(
      fc.integer({ min: 30, max: 199 }),
      fc.integer({ min: 1, max: 170 }),
      (s1, offset) => {
        const s2 = Math.min(s1 + offset, 200);
        if (s2 <= s1) return; // skip degenerate cases

        const result1 = evaluate(s1, DEFAULT_CONFIG, DEFAULT_FLYING_OBSTACLE_CONFIG);
        const result2 = evaluate(s2, DEFAULT_CONFIG, DEFAULT_FLYING_OBSTACLE_CONFIG);

        expect(result1.flyingObstacleSpawnInterval).not.toBeNull();
        expect(result2.flyingObstacleSpawnInterval).not.toBeNull();
        // Interval at higher score should be <= interval at lower score (decreasing)
        expect(result2.flyingObstacleSpawnInterval.min).toBeLessThanOrEqual(result1.flyingObstacleSpawnInterval.min);
      }
    ));
  });

  it('spawn interval max is monotonically non-increasing as score increases', () => {
    fc.assert(fc.property(
      fc.integer({ min: 30, max: 199 }),
      fc.integer({ min: 1, max: 170 }),
      (s1, offset) => {
        const s2 = Math.min(s1 + offset, 200);
        if (s2 <= s1) return; // skip degenerate cases

        const result1 = evaluate(s1, DEFAULT_CONFIG, DEFAULT_FLYING_OBSTACLE_CONFIG);
        const result2 = evaluate(s2, DEFAULT_CONFIG, DEFAULT_FLYING_OBSTACLE_CONFIG);

        expect(result1.flyingObstacleSpawnInterval).not.toBeNull();
        expect(result2.flyingObstacleSpawnInterval).not.toBeNull();
        // Interval at higher score should be <= interval at lower score (decreasing)
        expect(result2.flyingObstacleSpawnInterval.max).toBeLessThanOrEqual(result1.flyingObstacleSpawnInterval.max);
      }
    ));
  });

  it('spawn interval min <= max for any score >= 30', () => {
    fc.assert(fc.property(
      fc.integer({ min: 30, max: 200 }),
      (score) => {
        const result = evaluate(score, DEFAULT_CONFIG, DEFAULT_FLYING_OBSTACLE_CONFIG);
        expect(result.flyingObstacleSpawnInterval).not.toBeNull();
        expect(result.flyingObstacleSpawnInterval.min).toBeLessThanOrEqual(result.flyingObstacleSpawnInterval.max);
      }
    ));
  });
});
