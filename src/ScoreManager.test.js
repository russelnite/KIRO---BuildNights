import { describe, it, expect, beforeEach } from 'vitest';
import { createScoreManager } from './ScoreManager.js';

/**
 * Unit tests for ScoreManager module.
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.3
 */

// Mock storage for testing without real localStorage
function createMockStorage() {
  const store = {};
  return {
    getItem(key) { return store[key] !== undefined ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    _store: store
  };
}

const DEFAULT_CONFIG = { collectibles: { bonusPoints: 5 } };

describe('ScoreManager', () => {
  let sm;
  let mockStorage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    sm = createScoreManager(DEFAULT_CONFIG, mockStorage);
  });

  describe('initialization', () => {
    it('starts with currentScore 0', () => {
      expect(sm.currentScore).toBe(0);
    });

    it('loads high score from storage on init', () => {
      mockStorage.setItem('flappyKiroHigh', '42');
      const sm2 = createScoreManager(DEFAULT_CONFIG, mockStorage);
      expect(sm2.highScore).toBe(42);
    });

    it('defaults high score to 0 when storage is empty', () => {
      expect(sm.highScore).toBe(0);
    });

    it('defaults high score to 0 for corrupt data', () => {
      mockStorage.setItem('flappyKiroHigh', 'notanumber');
      const sm2 = createScoreManager(DEFAULT_CONFIG, mockStorage);
      expect(sm2.highScore).toBe(0);
    });

    it('defaults high score to 0 when storage is unavailable', () => {
      const sm2 = createScoreManager(DEFAULT_CONFIG, null);
      expect(sm2.highScore).toBe(0);
    });
  });

  describe('increment()', () => {
    it('increments score by given points', () => {
      sm.increment(1);
      expect(sm.currentScore).toBe(1);
    });

    it('accumulates multiple increments', () => {
      sm.increment(1);
      sm.increment(5);
      sm.increment(1);
      expect(sm.currentScore).toBe(7);
    });
  });

  describe('checkPipePass()', () => {
    it('awards 1 point when ghost passes pipe trailing edge', () => {
      const ghost = { x: 200 };
      const pipes = [{ x: 100, width: 60, scored: false }];
      const points = sm.checkPipePass(ghost, pipes);
      expect(points).toBe(1);
      expect(sm.currentScore).toBe(1);
    });

    it('marks pipe as scored to prevent double-scoring', () => {
      const ghost = { x: 200 };
      const pipes = [{ x: 100, width: 60, scored: false }];
      sm.checkPipePass(ghost, pipes);
      expect(pipes[0].scored).toBe(true);

      // Second call should not score again
      const points = sm.checkPipePass(ghost, pipes);
      expect(points).toBe(0);
      expect(sm.currentScore).toBe(1);
    });

    it('does not score if ghost has not passed pipe trailing edge', () => {
      const ghost = { x: 100 };
      const pipes = [{ x: 100, width: 60, scored: false }];
      const points = sm.checkPipePass(ghost, pipes);
      expect(points).toBe(0);
      expect(sm.currentScore).toBe(0);
    });

    it('scores multiple pipes in one call', () => {
      const ghost = { x: 300 };
      const pipes = [
        { x: 50, width: 60, scored: false },
        { x: 150, width: 60, scored: false }
      ];
      const points = sm.checkPipePass(ghost, pipes);
      expect(points).toBe(2);
      expect(sm.currentScore).toBe(2);
    });

    it('uses ghost.x (left edge) for comparison', () => {
      // ghost.x = 160, pipe trailing edge = 100 + 60 = 160
      // ghost.x > pipe.x + pipe.width must be strictly greater
      const ghost = { x: 160 };
      const pipes = [{ x: 100, width: 60, scored: false }];
      const points = sm.checkPipePass(ghost, pipes);
      expect(points).toBe(0); // exactly at edge, not past it
    });

    it('scores when ghost.x is just past trailing edge', () => {
      const ghost = { x: 161 };
      const pipes = [{ x: 100, width: 60, scored: false }];
      const points = sm.checkPipePass(ghost, pipes);
      expect(points).toBe(1);
    });
  });

  describe('checkCollectiblePickup()', () => {
    it('awards 5 points when ghost overlaps collectible', () => {
      const ghost = { x: 100, y: 100, width: 32, height: 32, hitboxRadius: 12 };
      // Place collectible overlapping with ghost center (116, 116)
      const collectibles = [{ x: 110, y: 110, width: 30, height: 20, collected: false }];
      const points = sm.checkCollectiblePickup(ghost, collectibles);
      expect(points).toBe(5);
      expect(sm.currentScore).toBe(5);
    });

    it('marks collectible as collected', () => {
      const ghost = { x: 100, y: 100, width: 32, height: 32, hitboxRadius: 12 };
      const collectibles = [{ x: 110, y: 110, width: 30, height: 20, collected: false }];
      sm.checkCollectiblePickup(ghost, collectibles);
      expect(collectibles[0].collected).toBe(true);
    });

    it('does not award points for already collected items', () => {
      const ghost = { x: 100, y: 100, width: 32, height: 32, hitboxRadius: 12 };
      const collectibles = [{ x: 110, y: 110, width: 30, height: 20, collected: true }];
      const points = sm.checkCollectiblePickup(ghost, collectibles);
      expect(points).toBe(0);
    });

    it('does not award points when ghost does not overlap', () => {
      const ghost = { x: 100, y: 100, width: 32, height: 32, hitboxRadius: 12 };
      // Place collectible far away
      const collectibles = [{ x: 400, y: 400, width: 30, height: 20, collected: false }];
      const points = sm.checkCollectiblePickup(ghost, collectibles);
      expect(points).toBe(0);
    });

    it('uses configurable bonus points value', () => {
      const customConfig = { collectibles: { bonusPoints: 10 } };
      const sm2 = createScoreManager(customConfig, mockStorage);
      const ghost = { x: 100, y: 100, width: 32, height: 32, hitboxRadius: 12 };
      const collectibles = [{ x: 110, y: 110, width: 30, height: 20, collected: false }];
      const points = sm2.checkCollectiblePickup(ghost, collectibles);
      expect(points).toBe(10);
    });
  });

  describe('reset()', () => {
    it('resets current score to 0', () => {
      sm.increment(15);
      sm.reset();
      expect(sm.currentScore).toBe(0);
    });

    it('clears isNewHighScore flag', () => {
      sm.increment(10);
      sm.onGameOver();
      sm.reset();
      expect(sm.isNewHighScore).toBe(false);
    });
  });

  describe('saveHighScore()', () => {
    it('persists high score to storage', () => {
      sm.increment(25);
      sm.onGameOver();
      expect(mockStorage._store['flappyKiroHigh']).toBe('25');
    });

    it('handles unavailable storage gracefully', () => {
      const sm2 = createScoreManager(DEFAULT_CONFIG, null);
      sm2.increment(10);
      // Should not throw
      expect(() => sm2.saveHighScore()).not.toThrow();
    });

    it('handles storage quota exceeded gracefully', () => {
      const failingStorage = {
        getItem() { return null; },
        setItem() { throw new Error('QuotaExceededError'); }
      };
      const sm2 = createScoreManager(DEFAULT_CONFIG, failingStorage);
      sm2.increment(10);
      sm2.highScore = 10;
      // Should not throw
      expect(() => sm2.saveHighScore()).not.toThrow();
    });
  });

  describe('loadHighScore()', () => {
    it('loads persisted high score', () => {
      mockStorage.setItem('flappyKiroHigh', '99');
      expect(sm.loadHighScore()).toBe(99);
    });

    it('returns 0 for missing data', () => {
      expect(sm.loadHighScore()).toBe(0);
    });

    it('returns 0 for corrupt data (NaN)', () => {
      mockStorage.setItem('flappyKiroHigh', 'abc');
      expect(sm.loadHighScore()).toBe(0);
    });

    it('returns 0 when storage throws', () => {
      const failingStorage = {
        getItem() { throw new Error('SecurityError'); },
        setItem() {}
      };
      const sm2 = createScoreManager(DEFAULT_CONFIG, failingStorage);
      expect(sm2.loadHighScore()).toBe(0);
    });
  });

  describe('onGameOver() / high score update', () => {
    it('updates high score to max(current, previous)', () => {
      sm.increment(10);
      sm.onGameOver();
      expect(sm.highScore).toBe(10);
    });

    it('does not lower high score if current is less', () => {
      mockStorage.setItem('flappyKiroHigh', '50');
      const sm2 = createScoreManager(DEFAULT_CONFIG, mockStorage);
      sm2.increment(5);
      sm2.onGameOver();
      expect(sm2.highScore).toBe(50);
    });

    it('sets isNewHighScore when current beats previous', () => {
      sm.increment(10);
      sm.onGameOver();
      expect(sm.isNewHighScore).toBe(true);
    });

    it('does not set isNewHighScore when current equals zero', () => {
      sm.onGameOver();
      expect(sm.isNewHighScore).toBe(false);
    });

    it('saves high score to storage on game over', () => {
      sm.increment(30);
      sm.onGameOver();
      expect(mockStorage._store['flappyKiroHigh']).toBe('30');
    });
  });

  describe('getHudText()', () => {
    it('returns correct format with zero scores', () => {
      expect(sm.getHudText()).toBe('Score: 0 | High: 0');
    });

    it('returns correct format with non-zero scores', () => {
      sm.increment(7);
      sm.highScore = 42;
      expect(sm.getHudText()).toBe('Score: 7 | High: 42');
    });
  });
});
