import { describe, it, expect, beforeEach } from 'vitest';
import { createWingAnimController, DEFAULT_CONFIG } from './WingAnimController.js';

describe('WingAnimController', () => {
  let controller;

  beforeEach(() => {
    controller = createWingAnimController();
  });

  describe('initial state', () => {
    it('starts with frame "up"', () => {
      expect(controller.getCurrentFrame()).toBe('up');
    });

    it('starts in base tier', () => {
      expect(controller.getCurrentTier()).toBe('base');
    });

    it('starts with base rate (midpoint of 250-350 = 300ms)', () => {
      expect(controller.getCurrentRate()).toBe(300);
    });
  });

  describe('reset()', () => {
    it('resets all state back to initial values', () => {
      // Change state by updating
      controller.update(0.5, true, false, 'playing');
      controller.reset();

      expect(controller.getCurrentFrame()).toBe('up');
      expect(controller.getCurrentTier()).toBe('base');
      expect(controller.getCurrentRate()).toBe(300);
    });
  });

  describe('freeze behavior', () => {
    it('does not advance animation when paused', () => {
      // Advance a bit first
      controller.update(0.1, false, false, 'playing');
      const frameBefore = controller.getCurrentFrame();
      const rateBefore = controller.getCurrentRate();

      // Pause with large dt - should not change anything
      controller.update(5.0, false, false, 'paused');

      expect(controller.getCurrentFrame()).toBe(frameBefore);
      expect(controller.getCurrentRate()).toBe(rateBefore);
    });

    it('does not advance animation when game_over', () => {
      controller.update(0.1, false, false, 'playing');
      const frameBefore = controller.getCurrentFrame();
      const rateBefore = controller.getCurrentRate();

      controller.update(5.0, false, false, 'game_over');

      expect(controller.getCurrentFrame()).toBe(frameBefore);
      expect(controller.getCurrentRate()).toBe(rateBefore);
    });

    it('ignores jump input when paused', () => {
      controller.update(0.1, true, true, 'paused');
      expect(controller.getCurrentTier()).toBe('base');
    });

    it('ignores jump input when game_over', () => {
      controller.update(0.1, true, true, 'game_over');
      expect(controller.getCurrentTier()).toBe('base');
    });
  });

  describe('ready state', () => {
    it('animates at base rate during ready state', () => {
      controller.update(0.3, false, false, 'ready');
      expect(controller.getCurrentTier()).toBe('base');
      expect(controller.getCurrentRate()).toBe(300);
    });

    it('toggles frame after base rate duration in ready state', () => {
      // 300ms = 0.3s is the base rate midpoint
      expect(controller.getCurrentFrame()).toBe('up');
      controller.update(0.31, false, false, 'ready');
      expect(controller.getCurrentFrame()).toBe('down');
    });
  });

  describe('base tier (playing)', () => {
    it('stays in base tier with no jump input', () => {
      controller.update(0.016, false, false, 'playing');
      expect(controller.getCurrentTier()).toBe('base');
    });

    it('rate is within base bounds (250-350ms)', () => {
      controller.update(0.016, false, false, 'playing');
      const rate = controller.getCurrentRate();
      expect(rate).toBeGreaterThanOrEqual(250);
      expect(rate).toBeLessThanOrEqual(350);
    });

    it('toggles frame after base rate elapsed', () => {
      expect(controller.getCurrentFrame()).toBe('up');
      // At 300ms rate, after 0.3s should toggle
      controller.update(0.31, false, false, 'playing');
      expect(controller.getCurrentFrame()).toBe('down');
    });
  });

  describe('jump tier', () => {
    it('transitions to jump tier on single jump', () => {
      controller.update(0.016, true, false, 'playing');
      expect(controller.getCurrentTier()).toBe('jump');
    });

    it('jump rate is within bounds (120-180ms)', () => {
      controller.update(0.016, true, false, 'playing');
      const rate = controller.getCurrentRate();
      expect(rate).toBeGreaterThanOrEqual(120);
      expect(rate).toBeLessThanOrEqual(180);
    });

    it('reverts to base tier after jumpBoostDuration expires', () => {
      controller.update(0.016, true, false, 'playing');
      expect(controller.getCurrentTier()).toBe('jump');

      // Wait for boost to expire (300ms = 0.3s)
      controller.update(0.35, false, false, 'playing');
      expect(controller.getCurrentTier()).toBe('base');
    });

    it('resets to base rate after boost expires', () => {
      controller.update(0.016, true, false, 'playing');
      controller.update(0.35, false, false, 'playing');
      expect(controller.getCurrentRate()).toBe(300);
    });
  });

  describe('rapid tier', () => {
    it('transitions to rapid tier when two jumps occur within 200ms', () => {
      // First jump
      controller.update(0.05, true, false, 'playing'); // 50ms elapsed
      // Second jump within 200ms window
      controller.update(0.05, true, true, 'playing'); // 100ms elapsed (within 200ms window)
      expect(controller.getCurrentTier()).toBe('rapid');
    });

    it('rapid rate is within bounds (60-100ms)', () => {
      controller.update(0.05, true, false, 'playing');
      controller.update(0.05, true, true, 'playing');
      const rate = controller.getCurrentRate();
      expect(rate).toBeGreaterThanOrEqual(60);
      expect(rate).toBeLessThanOrEqual(100);
    });

    it('stays in rapid tier while jumps keep coming within window', () => {
      controller.update(0.05, true, false, 'playing');
      controller.update(0.05, true, true, 'playing');
      expect(controller.getCurrentTier()).toBe('rapid');

      // Another jump within window
      controller.update(0.05, true, true, 'playing');
      expect(controller.getCurrentTier()).toBe('rapid');
    });

    it('reverts to base when no jump input for >200ms and key released', () => {
      // Enter rapid
      controller.update(0.05, true, false, 'playing');
      controller.update(0.05, true, true, 'playing');
      expect(controller.getCurrentTier()).toBe('rapid');

      // No jumps for more than 200ms, key not held
      controller.update(0.25, false, false, 'playing');
      expect(controller.getCurrentTier()).toBe('base');
    });

    it('stays in rapid tier while jumpHeld is true even after window elapses', () => {
      // Enter rapid
      controller.update(0.05, true, false, 'playing');
      controller.update(0.05, true, true, 'playing');
      expect(controller.getCurrentTier()).toBe('rapid');

      // Time passes but key is still held
      controller.update(0.25, false, true, 'playing');
      expect(controller.getCurrentTier()).toBe('rapid');
    });
  });

  describe('frame toggling', () => {
    it('alternates between up and down', () => {
      expect(controller.getCurrentFrame()).toBe('up');

      // Advance past one base rate cycle (300ms)
      controller.update(0.31, false, false, 'playing');
      expect(controller.getCurrentFrame()).toBe('down');

      // Advance past another cycle
      controller.update(0.31, false, false, 'playing');
      expect(controller.getCurrentFrame()).toBe('up');
    });

    it('toggles faster in jump tier', () => {
      controller.update(0.016, true, false, 'playing');
      expect(controller.getCurrentFrame()).toBe('up');

      // Jump rate is 150ms midpoint, so 0.16s should toggle
      controller.update(0.16, false, false, 'playing');
      expect(controller.getCurrentFrame()).toBe('down');
    });

    it('toggles fastest in rapid tier', () => {
      // Enter rapid
      controller.update(0.05, true, false, 'playing');
      controller.update(0.01, true, true, 'playing');
      expect(controller.getCurrentTier()).toBe('rapid');

      const frame1 = controller.getCurrentFrame();
      // Rapid rate is 80ms midpoint, so 0.09s should toggle
      controller.update(0.09, true, true, 'playing');
      expect(controller.getCurrentFrame()).not.toBe(frame1);
    });
  });

  describe('edge cases', () => {
    it('no-ops with dt of 0', () => {
      const frameBefore = controller.getCurrentFrame();
      controller.update(0, true, false, 'playing');
      expect(controller.getCurrentFrame()).toBe(frameBefore);
      expect(controller.getCurrentTier()).toBe('base');
    });

    it('no-ops with negative dt', () => {
      const frameBefore = controller.getCurrentFrame();
      controller.update(-0.1, true, false, 'playing');
      expect(controller.getCurrentFrame()).toBe(frameBefore);
    });

    it('handles custom config', () => {
      const custom = {
        baseRateMin: 100,
        baseRateMax: 200,
        jumpRateMin: 50,
        jumpRateMax: 100,
        rapidRateMin: 20,
        rapidRateMax: 40,
        jumpBoostDuration: 500,
        rapidDetectionWindow: 300
      };
      const ctrl = createWingAnimController(custom);
      expect(ctrl.getCurrentRate()).toBe(150); // midpoint of 100-200
    });

    it('falls back to defaults for invalid config values', () => {
      const badConfig = {
        baseRateMin: -1,
        baseRateMax: 0,
        jumpRateMin: 0,
        jumpRateMax: -5,
        rapidRateMin: 0,
        rapidRateMax: 0,
        jumpBoostDuration: -100,
        rapidDetectionWindow: 0
      };
      const ctrl = createWingAnimController(badConfig);
      // Should use DEFAULT_CONFIG midpoint (300ms)
      expect(ctrl.getCurrentRate()).toBe(300);
    });
  });
});
