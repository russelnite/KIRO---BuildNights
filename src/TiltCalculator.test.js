import { describe, it, expect } from 'vitest';
import { calculateTilt, DEFAULT_CONFIG } from './TiltCalculator.js';

describe('TiltCalculator', () => {
  describe('calculateTilt', () => {
    it('returns zero angle when velocity is zero', () => {
      expect(calculateTilt(0)).toBe(0);
    });

    it('returns positive angle (clockwise) for positive velocity (descending)', () => {
      const angle = calculateTilt(300);
      expect(angle).toBeGreaterThan(0);
    });

    it('returns negative angle (counter-clockwise) for negative velocity (ascending)', () => {
      const angle = calculateTilt(-200);
      expect(angle).toBeLessThan(0);
    });

    it('is proportional to velocity when descending', () => {
      const angle1 = calculateTilt(150);
      const angle2 = calculateTilt(300);
      // angle2 should be roughly 2x angle1 (both below saturation)
      expect(angle2).toBeCloseTo(angle1 * 2, 5);
    });

    it('is proportional to velocity magnitude when ascending', () => {
      const angle1 = calculateTilt(-100);
      const angle2 = calculateTilt(-200);
      // angle2 magnitude should be roughly 2x angle1 magnitude
      expect(Math.abs(angle2)).toBeCloseTo(Math.abs(angle1) * 2, 5);
    });

    it('clamps to maxDownTilt for velocity >= maxDescentVelocity', () => {
      const angle = calculateTilt(600);
      expect(angle).toBe(DEFAULT_CONFIG.maxDownTilt);

      const angleBeyond = calculateTilt(900);
      expect(angleBeyond).toBe(DEFAULT_CONFIG.maxDownTilt);
    });

    it('clamps to -maxUpTilt for velocity <= -maxAscentVelocity', () => {
      const angle = calculateTilt(-400);
      expect(angle).toBe(-DEFAULT_CONFIG.maxUpTilt);

      const angleBeyond = calculateTilt(-800);
      expect(angleBeyond).toBe(-DEFAULT_CONFIG.maxUpTilt);
    });

    it('enforces asymmetric bounds (maxDownTilt > maxUpTilt)', () => {
      expect(DEFAULT_CONFIG.maxDownTilt).toBeGreaterThan(DEFAULT_CONFIG.maxUpTilt);
    });

    it('descending max angle magnitude exceeds ascending max angle magnitude', () => {
      const maxDown = calculateTilt(1000);
      const maxUp = calculateTilt(-1000);
      expect(Math.abs(maxDown)).toBeGreaterThan(Math.abs(maxUp));
    });

    it('accepts custom config', () => {
      const customConfig = {
        maxDownTilt: 1.0,
        maxUpTilt: 0.5,
        maxDescentVelocity: 500,
        maxAscentVelocity: 300
      };
      const angle = calculateTilt(500, customConfig);
      expect(angle).toBe(1.0);

      const upAngle = calculateTilt(-300, customConfig);
      expect(upAngle).toBe(-0.5);
    });

    it('handles very small velocities correctly', () => {
      const angle = calculateTilt(1);
      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThan(DEFAULT_CONFIG.maxDownTilt);

      const upAngle = calculateTilt(-1);
      expect(upAngle).toBeLessThan(0);
      expect(upAngle).toBeGreaterThan(-DEFAULT_CONFIG.maxUpTilt);
    });
  });
});
