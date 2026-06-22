import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluate, DEFAULT_CONFIG } from '../src/DifficultyManager.js';

/**
 * Property 7: Difficulty parameters are correctly computed and clamped
 *
 * For any non-negative integer score, the difficulty manager SHALL compute:
 * - pipeSpeed = min(BASE_SPEED + floor(score/10) * SPEED_INCREMENT, MAX_SPEED)
 * - gapHeight = max(BASE_GAP - floor(score/10) * GAP_DECREMENT, MIN_GAP)
 * - pipeSpacing = max(BASE_SPACING - floor(score/10) * SPACING_DECREMENT, MIN_SPACING)
 *
 * And all three values SHALL remain within their defined bounds.
 *
 * **Validates: Requirements 3.7, 3.8, 3.9**
 */
describe('Property 7: Difficulty parameters computed and clamped', () => {
  it('pipeSpeed matches formula and stays within bounds for any non-negative score', () => {
    fc.assert(fc.property(
      fc.nat(10000),
      (score) => {
        const result = evaluate(score);
        const tier = Math.floor(score / DEFAULT_CONFIG.scoreTierSize);
        const expected = Math.min(
          DEFAULT_CONFIG.baseSpeed + tier * DEFAULT_CONFIG.speedIncrement,
          DEFAULT_CONFIG.maxSpeed
        );
        expect(result.pipeSpeed).toBe(expected);
        expect(result.pipeSpeed).toBeGreaterThanOrEqual(DEFAULT_CONFIG.baseSpeed);
        expect(result.pipeSpeed).toBeLessThanOrEqual(DEFAULT_CONFIG.maxSpeed);
      }
    ));
  });

  it('gapHeight matches formula and stays within bounds for any non-negative score', () => {
    fc.assert(fc.property(
      fc.nat(10000),
      (score) => {
        const result = evaluate(score);
        const tier = Math.floor(score / DEFAULT_CONFIG.scoreTierSize);
        const expected = Math.max(
          DEFAULT_CONFIG.baseGap - tier * DEFAULT_CONFIG.gapDecrement,
          DEFAULT_CONFIG.minGap
        );
        expect(result.gapHeight).toBe(expected);
        expect(result.gapHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minGap);
        expect(result.gapHeight).toBeLessThanOrEqual(DEFAULT_CONFIG.baseGap);
      }
    ));
  });

  it('pipeSpacing matches formula and stays within bounds for any non-negative score', () => {
    fc.assert(fc.property(
      fc.nat(10000),
      (score) => {
        const result = evaluate(score);
        const tier = Math.floor(score / DEFAULT_CONFIG.scoreTierSize);
        const expected = Math.max(
          DEFAULT_CONFIG.baseSpacing - tier * DEFAULT_CONFIG.spacingDecrement,
          DEFAULT_CONFIG.minSpacing
        );
        expect(result.pipeSpacing).toBe(expected);
        expect(result.pipeSpacing).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minSpacing);
        expect(result.pipeSpacing).toBeLessThanOrEqual(DEFAULT_CONFIG.baseSpacing);
      }
    ));
  });
});
