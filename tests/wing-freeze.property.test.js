import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createWingAnimController } from '../src/WingAnimController.js';

// Arbitraries
const dtArb = fc.float({ min: Math.fround(0.001), max: Math.fround(0.033), noNaN: true, noDefaultInfinity: true });
const playingDtArb = fc.float({ min: Math.fround(0.005), max: Math.fround(0.033), noNaN: true, noDefaultInfinity: true });
const jumpArb = fc.boolean();
const jumpHeldArb = fc.boolean();
const inactiveStateArb = fc.constantFrom('paused', 'game_over');

// Generate a sequence of playing-state inputs to put the controller in a random state
const playingInputArb = fc.record({
  dt: playingDtArb,
  jumpTriggered: jumpArb,
  jumpHeld: jumpHeldArb
});

const playingSequenceArb = fc.array(playingInputArb, { minLength: 1, maxLength: 20 });

/**
 * Property 4: Wing animation freezes in inactive game states
 *
 * For any wing animation state and any positive delta-time, when the game state
 * is Paused or Game_Over, updating the wing animation controller SHALL leave
 * the currentFrame and frameTimer completely unchanged.
 *
 * **Validates: Requirements 2.10, 2.11**
 */
describe('Property 4: Wing animation freezes in inactive game states', () => {
  it('getCurrentFrame() does not change after update in paused or game_over', () => {
    fc.assert(fc.property(
      playingSequenceArb,
      dtArb,
      inactiveStateArb,
      (playingInputs, freezeDt, inactiveState) => {
        const controller = createWingAnimController();

        // Advance the controller with random inputs in 'playing' state
        // to put it in a random internal state
        for (const input of playingInputs) {
          controller.update(input.dt, input.jumpTriggered, input.jumpHeld, 'playing');
        }

        // Snapshot state before freeze
        const frameBefore = controller.getCurrentFrame();
        const rateBefore = controller.getCurrentRate();

        // Update in inactive state — should be a no-op
        controller.update(freezeDt, false, false, inactiveState);

        // Verify no mutation
        expect(controller.getCurrentFrame()).toBe(frameBefore);
        expect(controller.getCurrentRate()).toBe(rateBefore);
      }
    ), { numRuns: 200 });
  });

  it('getCurrentFrame() does not change even with jump inputs during paused/game_over', () => {
    fc.assert(fc.property(
      playingSequenceArb,
      dtArb,
      inactiveStateArb,
      jumpArb,
      jumpHeldArb,
      (playingInputs, freezeDt, inactiveState, jumpTriggered, jumpHeld) => {
        const controller = createWingAnimController();

        // Advance the controller in 'playing' state
        for (const input of playingInputs) {
          controller.update(input.dt, input.jumpTriggered, input.jumpHeld, 'playing');
        }

        // Snapshot state before freeze
        const frameBefore = controller.getCurrentFrame();
        const rateBefore = controller.getCurrentRate();

        // Update in inactive state with arbitrary jump inputs — still should be a no-op
        controller.update(freezeDt, jumpTriggered, jumpHeld, inactiveState);

        // Verify no mutation
        expect(controller.getCurrentFrame()).toBe(frameBefore);
        expect(controller.getCurrentRate()).toBe(rateBefore);
      }
    ), { numRuns: 200 });
  });

  it('multiple updates in inactive state produce no cumulative change', () => {
    fc.assert(fc.property(
      playingSequenceArb,
      fc.array(dtArb, { minLength: 2, maxLength: 10 }),
      inactiveStateArb,
      (playingInputs, freezeDts, inactiveState) => {
        const controller = createWingAnimController();

        // Advance the controller in 'playing' state
        for (const input of playingInputs) {
          controller.update(input.dt, input.jumpTriggered, input.jumpHeld, 'playing');
        }

        // Snapshot state before freeze
        const frameBefore = controller.getCurrentFrame();
        const rateBefore = controller.getCurrentRate();

        // Multiple updates in inactive state
        for (const dt of freezeDts) {
          controller.update(dt, false, false, inactiveState);
        }

        // Verify no cumulative mutation
        expect(controller.getCurrentFrame()).toBe(frameBefore);
        expect(controller.getCurrentRate()).toBe(rateBefore);
      }
    ), { numRuns: 200 });
  });
});
