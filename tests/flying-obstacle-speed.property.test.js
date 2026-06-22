import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluate, DEFAULT_FLYING_OBSTACLE_CONFIG } from '../src/DifficultyManager.js';

/**
 * Property 8: Flying obstacle speed multiplier within bounds and monotonically increasing
 *
 * For any score >= 30, the flying obstacle speed multiplier SHALL be within
 * [1.2, 2.0] times the current pipe speed, and for any two scores s1 < s2
 * (both >= 30), the speed multiplier at s2 SHALL be greater than or equal
 * to the speed multiplier at s1.
 *
 * **Validates: Requirements 5.3, 5.5**
 */
describe('Property 8: Flying obstacle speed multiplier within bounds and monotonically increasing', () => {
  const minMultiplier = DEFAULT_FLYING_OBSTACLE_CONFIG.baseSpeedMultiplier; // 1.2
  const maxMultiplier = DEFAULT_FLYING_OBSTACLE_CONFIG.maxSpeedMultiplier;  // 2.0

  it('speed multiplier is within [1.2, 2.0] for any score >= 30', () => {
    fc.assert(fc.property(
      fc.integer({ min: 30, max: 200 }),
      (score) => {
        const result = evaluate(score);
        expect(result.flyingObstacleSpeedMultiplier).not.toBeNull();
        expect(result.flyingObstacleSpeedMultiplier).toBeGreaterThanOrEqual(minMultiplier);
        expect(result.flyingObstacleSpeedMultiplier).toBeLessThanOrEqual(maxMultiplier);
      }
    ));
  });

  it('speed multiplier is monotonically non-decreasing for any s1 < s2 (both >= 30)', () => {
    fc.assert(fc.property(
      fc.integer({ min: 30, max: 199 }),
      fc.integer({ min: 1, max: 170 }),
      (s1, offset) => {
        const s2 = s1 + offset;
        const result1 = evaluate(s1);
        const result2 = evaluate(s2);
        expect(result2.flyingObstacleSpeedMultiplier).toBeGreaterThanOrEqual(
          result1.flyingObstacleSpeedMultiplier
        );
      }
    ));
  });
});
