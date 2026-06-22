import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createWingAnimController, DEFAULT_CONFIG } from '../src/WingAnimController.js';

/**
 * Property 3: Wing animation tier state machine
 *
 * For any sequence of update calls with jump inputs:
 * - In the absence of jump inputs in Playing state, the wing rate SHALL be within Base_Wing_Rate bounds (250–350ms)
 * - After a single jump input, the wing rate SHALL transition to Jump_Wing_Rate bounds (120–180ms) and revert to Base_Wing_Rate after 200–400ms
 * - When multiple jump inputs arrive within 200ms of each other (rapid), the wing rate SHALL be within Rapid_Wing_Rate bounds (60–100ms) for the duration
 * - After the last rapid jump, once 200ms elapses with no jump input, the wing rate SHALL revert to Base_Wing_Rate
 *
 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**
 */
describe('Feature: visual-overhaul, Property 3: Wing animation tier state machine', () => {
  const cfg = DEFAULT_CONFIG;

  // Arbitraries
  // dt in seconds, small steps (1ms to 33ms)
  const dtArb = fc.float({ min: Math.fround(0.001), max: Math.fround(0.033), noNaN: true, noDefaultInfinity: true });

  // A sequence step: (dt in seconds, whether a jump was triggered)
  const stepArb = fc.tuple(dtArb, fc.boolean());

  // A sequence of steps for driving the controller
  const sequenceArb = fc.array(stepArb, { minLength: 1, maxLength: 50 });

  it('base tier: without jump inputs, rate stays within Base_Wing_Rate bounds (250–350ms)', () => {
    fc.assert(fc.property(
      // Generate a sequence of steps with NO jumps
      fc.array(dtArb, { minLength: 1, maxLength: 50 }),
      (dts) => {
        const controller = createWingAnimController(cfg);

        for (const dt of dts) {
          controller.update(dt, false, false, 'playing');
          const rate = controller.getCurrentRate();
          expect(rate).toBeGreaterThanOrEqual(cfg.baseRateMin);
          expect(rate).toBeLessThanOrEqual(cfg.baseRateMax);
          expect(controller.getCurrentTier()).toBe('base');
        }
      }
    ), { numRuns: 200 });
  });

  it('jump tier: after a single jump, rate transitions to Jump_Wing_Rate bounds (120–180ms)', () => {
    fc.assert(fc.property(
      dtArb,
      (dt) => {
        const controller = createWingAnimController(cfg);

        // Simulate some base time first
        controller.update(0.016, false, false, 'playing');

        // Trigger a single jump
        controller.update(dt, true, false, 'playing');

        const rate = controller.getCurrentRate();
        expect(rate).toBeGreaterThanOrEqual(cfg.jumpRateMin);
        expect(rate).toBeLessThanOrEqual(cfg.jumpRateMax);
        expect(controller.getCurrentTier()).toBe('jump');
      }
    ), { numRuns: 200 });
  });

  it('jump tier reverts to base after jumpBoostDuration elapses', () => {
    fc.assert(fc.property(
      // Generate enough time after the jump to exceed boost duration (300ms default)
      fc.integer({ min: 20, max: 40 }),
      (frameCount) => {
        const controller = createWingAnimController(cfg);

        // Start in playing, advance some time
        controller.update(0.016, false, false, 'playing');

        // Trigger a single jump
        controller.update(0.016, true, false, 'playing');
        expect(controller.getCurrentTier()).toBe('jump');

        // Advance time past the jumpBoostDuration (300ms) without any more jumps
        // Each frame is 16ms, so 20 frames = 320ms > 300ms
        for (let i = 0; i < frameCount; i++) {
          controller.update(0.016, false, false, 'playing');
        }

        // After enough time, should have reverted to base
        const rate = controller.getCurrentRate();
        expect(rate).toBeGreaterThanOrEqual(cfg.baseRateMin);
        expect(rate).toBeLessThanOrEqual(cfg.baseRateMax);
        expect(controller.getCurrentTier()).toBe('base');
      }
    ), { numRuns: 200 });
  });

  it('rapid tier: two jumps within 200ms triggers Rapid_Wing_Rate bounds (60–100ms)', () => {
    fc.assert(fc.property(
      // dt between jumps must be small enough that both fit within rapidDetectionWindow (200ms)
      fc.float({ min: Math.fround(0.001), max: Math.fround(0.015), noNaN: true, noDefaultInfinity: true }),
      (dtBetween) => {
        const controller = createWingAnimController(cfg);

        // First jump
        controller.update(0.016, true, false, 'playing');

        // Second jump within rapid detection window
        controller.update(dtBetween, true, false, 'playing');

        const rate = controller.getCurrentRate();
        expect(rate).toBeGreaterThanOrEqual(cfg.rapidRateMin);
        expect(rate).toBeLessThanOrEqual(cfg.rapidRateMax);
        expect(controller.getCurrentTier()).toBe('rapid');
      }
    ), { numRuns: 200 });
  });

  it('rapid tier reverts to base once 200ms elapses with no jump input', () => {
    fc.assert(fc.property(
      fc.integer({ min: 15, max: 30 }),
      (framesAfter) => {
        const controller = createWingAnimController(cfg);

        // Trigger rapid by two quick jumps
        controller.update(0.016, true, false, 'playing');
        controller.update(0.010, true, false, 'playing');
        expect(controller.getCurrentTier()).toBe('rapid');

        // Advance time past the rapidDetectionWindow (200ms) without jumps or held key
        // Each frame is 16ms, so 15 frames = 240ms > 200ms
        for (let i = 0; i < framesAfter; i++) {
          controller.update(0.016, false, false, 'playing');
        }

        // Should have reverted to base
        const rate = controller.getCurrentRate();
        expect(rate).toBeGreaterThanOrEqual(cfg.baseRateMin);
        expect(rate).toBeLessThanOrEqual(cfg.baseRateMax);
        expect(controller.getCurrentTier()).toBe('base');
      }
    ), { numRuns: 200 });
  });

  it('invariant: rate always within one of the three tier bounds during any input sequence', () => {
    fc.assert(fc.property(
      sequenceArb,
      (steps) => {
        const controller = createWingAnimController(cfg);

        for (const [dt, jump] of steps) {
          controller.update(dt, jump, false, 'playing');

          const rate = controller.getCurrentRate();
          const tier = controller.getCurrentTier();

          // Rate must be within the bounds for the current tier
          switch (tier) {
            case 'base':
              expect(rate).toBeGreaterThanOrEqual(cfg.baseRateMin);
              expect(rate).toBeLessThanOrEqual(cfg.baseRateMax);
              break;
            case 'jump':
              expect(rate).toBeGreaterThanOrEqual(cfg.jumpRateMin);
              expect(rate).toBeLessThanOrEqual(cfg.jumpRateMax);
              break;
            case 'rapid':
              expect(rate).toBeGreaterThanOrEqual(cfg.rapidRateMin);
              expect(rate).toBeLessThanOrEqual(cfg.rapidRateMax);
              break;
            default:
              // Should never happen
              expect(tier).toMatch(/^(base|jump|rapid)$/);
          }
        }
      }
    ), { numRuns: 300 });
  });

  it('rapid tier stays active while jumps keep arriving within the detection window', () => {
    fc.assert(fc.property(
      // Number of rapid jumps to send
      fc.integer({ min: 3, max: 15 }),
      (jumpCount) => {
        const controller = createWingAnimController(cfg);

        // Trigger rapid with initial two quick jumps
        controller.update(0.016, true, false, 'playing');
        controller.update(0.010, true, false, 'playing');
        expect(controller.getCurrentTier()).toBe('rapid');

        // Keep sending jumps within the detection window
        for (let i = 0; i < jumpCount; i++) {
          // Each step is well within 200ms window
          controller.update(0.010, true, false, 'playing');
          expect(controller.getCurrentTier()).toBe('rapid');
          const rate = controller.getCurrentRate();
          expect(rate).toBeGreaterThanOrEqual(cfg.rapidRateMin);
          expect(rate).toBeLessThanOrEqual(cfg.rapidRateMax);
        }
      }
    ), { numRuns: 200 });
  });
});
