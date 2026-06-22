import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateTilt, DEFAULT_CONFIG } from '../src/TiltCalculator.js';

// Velocity range matching the design doc generator spec [-600, 600]
const velocityArb = fc.float({ min: Math.fround(-600), max: Math.fround(600), noNaN: true, noDefaultInfinity: true });

// Strictly positive velocity (descending)
const positiveVelocityArb = fc.float({ min: Math.fround(0.001), max: Math.fround(600), noNaN: true, noDefaultInfinity: true });

// Strictly negative velocity (ascending)
const negativeVelocityArb = fc.float({ min: Math.fround(-600), max: Math.fround(-0.001), noNaN: true, noDefaultInfinity: true });

/**
 * Property 1: Tilt is proportional to velocity with correct sign and asymmetric bounds
 *
 * For any vertical velocity value, the tilt calculator SHALL return:
 * - A positive angle (clockwise) proportional to velocity when velocity > 0 (descending)
 * - A negative angle (counter-clockwise) proportional to |velocity| when velocity < 0 (ascending)
 * - Zero when velocity is exactly 0
 * - A maximum descending tilt magnitude that is strictly greater than the maximum ascending tilt magnitude (maxDownTilt > maxUpTilt)
 * - An angle whose absolute value never exceeds the configured maximum for its direction
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */
describe('Feature: visual-overhaul, Property 1: Tilt is proportional to velocity with correct sign and asymmetric bounds', () => {
  it('positive velocity produces positive (clockwise) tilt angle', () => {
    fc.assert(fc.property(
      positiveVelocityArb,
      (velocity) => {
        const tilt = calculateTilt(velocity, DEFAULT_CONFIG);
        expect(tilt).toBeGreaterThan(0);
      }
    ));
  });

  it('negative velocity produces negative (counter-clockwise) tilt angle', () => {
    fc.assert(fc.property(
      negativeVelocityArb,
      (velocity) => {
        const tilt = calculateTilt(velocity, DEFAULT_CONFIG);
        expect(tilt).toBeLessThan(0);
      }
    ));
  });

  it('zero velocity produces zero tilt', () => {
    const tilt = calculateTilt(0, DEFAULT_CONFIG);
    expect(tilt).toBe(0);
  });

  it('tilt magnitude is proportional to velocity magnitude (monotonically non-decreasing)', () => {
    fc.assert(fc.property(
      velocityArb,
      velocityArb,
      (v1, v2) => {
        // For two velocities with the same sign, greater magnitude → greater tilt magnitude
        if (v1 > 0 && v2 > 0) {
          const tilt1 = calculateTilt(v1, DEFAULT_CONFIG);
          const tilt2 = calculateTilt(v2, DEFAULT_CONFIG);
          if (v1 <= v2) {
            expect(tilt1).toBeLessThanOrEqual(tilt2 + 1e-7);
          } else {
            expect(tilt2).toBeLessThanOrEqual(tilt1 + 1e-7);
          }
        } else if (v1 < 0 && v2 < 0) {
          const tilt1 = calculateTilt(v1, DEFAULT_CONFIG);
          const tilt2 = calculateTilt(v2, DEFAULT_CONFIG);
          // More negative velocity → more negative tilt (greater magnitude)
          if (Math.abs(v1) <= Math.abs(v2)) {
            expect(Math.abs(tilt1)).toBeLessThanOrEqual(Math.abs(tilt2) + 1e-7);
          } else {
            expect(Math.abs(tilt2)).toBeLessThanOrEqual(Math.abs(tilt1) + 1e-7);
          }
        }
        // Mixed signs: skip, not comparable for proportionality
      }
    ));
  });

  it('descending tilt never exceeds maxDownTilt', () => {
    fc.assert(fc.property(
      positiveVelocityArb,
      (velocity) => {
        const tilt = calculateTilt(velocity, DEFAULT_CONFIG);
        expect(tilt).toBeLessThanOrEqual(DEFAULT_CONFIG.maxDownTilt);
      }
    ));
  });

  it('ascending tilt magnitude never exceeds maxUpTilt', () => {
    fc.assert(fc.property(
      negativeVelocityArb,
      (velocity) => {
        const tilt = calculateTilt(velocity, DEFAULT_CONFIG);
        expect(Math.abs(tilt)).toBeLessThanOrEqual(DEFAULT_CONFIG.maxUpTilt);
      }
    ));
  });

  it('asymmetric bounds: maxDownTilt is strictly greater than maxUpTilt', () => {
    expect(DEFAULT_CONFIG.maxDownTilt).toBeGreaterThan(DEFAULT_CONFIG.maxUpTilt);
  });

  it('tilt angle absolute value never exceeds configured maximum for any velocity', () => {
    fc.assert(fc.property(
      velocityArb,
      (velocity) => {
        const tilt = calculateTilt(velocity, DEFAULT_CONFIG);
        if (velocity > 0) {
          expect(tilt).toBeLessThanOrEqual(DEFAULT_CONFIG.maxDownTilt);
          expect(tilt).toBeGreaterThanOrEqual(0);
        } else if (velocity < 0) {
          expect(Math.abs(tilt)).toBeLessThanOrEqual(DEFAULT_CONFIG.maxUpTilt);
          expect(tilt).toBeLessThanOrEqual(0);
        } else {
          expect(tilt).toBe(0);
        }
      }
    ));
  });
});
