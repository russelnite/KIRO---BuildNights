import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createScoreManager } from '../src/ScoreManager.js';

// Helper: create a mock storage object for testing
function createMockStorage() {
  const store = {};
  return {
    getItem(key) { return store[key] !== undefined ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); }
  };
}

// Arbitraries
const pipeWidthArb = fc.integer({ min: 20, max: 100 });
const pipeXArb = fc.integer({ min: -200, max: 400 });
const ghostXArb = fc.integer({ min: 0, max: 500 });
const scoreArb = fc.nat(10000);
const highScoreArb = fc.nat(10000);

/**
 * Property 12: Pipe pass scoring
 *
 * For any ghost position past a pipe's trailing edge with an unscored pipe,
 * the score check SHALL return exactly 1 point and mark the pipe as scored.
 * For any already-scored pipe, the score check SHALL return 0 points regardless
 * of position.
 *
 * **Validates: Requirements 5.1**
 */
describe('Property 12: Pipe pass scoring', () => {
  it('unscored pipe awards exactly 1 point when ghost.x > pipe.x + pipe.width', () => {
    fc.assert(fc.property(
      pipeXArb,
      pipeWidthArb,
      (pipeX, pipeWidth) => {
        const storage = createMockStorage();
        const manager = createScoreManager(undefined, storage);
        // Ghost is past the pipe's trailing edge
        const ghostX = pipeX + pipeWidth + 1;
        const ghost = { x: ghostX };
        const pipe = { x: pipeX, width: pipeWidth, scored: false };

        const points = manager.checkPipePass(ghost, [pipe]);

        expect(points).toBe(1);
        expect(manager.currentScore).toBe(1);
        expect(pipe.scored).toBe(true);
      }
    ));
  });

  it('scored pipe awards 0 points regardless of ghost position', () => {
    fc.assert(fc.property(
      ghostXArb,
      pipeXArb,
      pipeWidthArb,
      (ghostX, pipeX, pipeWidth) => {
        const storage = createMockStorage();
        const manager = createScoreManager(undefined, storage);
        const ghost = { x: ghostX };
        const pipe = { x: pipeX, width: pipeWidth, scored: true };

        const points = manager.checkPipePass(ghost, [pipe]);

        expect(points).toBe(0);
        expect(manager.currentScore).toBe(0);
      }
    ));
  });

  it('calling checkPipePass twice on same pipe awards only 1 point total', () => {
    fc.assert(fc.property(
      pipeXArb,
      pipeWidthArb,
      (pipeX, pipeWidth) => {
        const storage = createMockStorage();
        const manager = createScoreManager(undefined, storage);
        // Ghost is past the pipe's trailing edge
        const ghostX = pipeX + pipeWidth + 1;
        const ghost = { x: ghostX };
        const pipe = { x: pipeX, width: pipeWidth, scored: false };

        manager.checkPipePass(ghost, [pipe]);
        manager.checkPipePass(ghost, [pipe]);

        expect(manager.currentScore).toBe(1);
        expect(pipe.scored).toBe(true);
      }
    ));
  });
});

/**
 * Property 13: High score is max of current and previous
 *
 * For any current score and previous high score, after a game-over event
 * the persisted high score SHALL equal max(currentScore, previousHighScore).
 *
 * **Validates: Requirements 5.2, 5.3**
 */
describe('Property 13: High score is max of current and previous', () => {
  it('after onGameOver, highScore = max(currentScore, previousHighScore)', () => {
    fc.assert(fc.property(
      scoreArb,
      highScoreArb,
      (currentScore, previousHighScore) => {
        const storage = createMockStorage();
        storage.setItem('flappyKiroHigh', String(previousHighScore));
        const manager = createScoreManager(undefined, storage);

        // Set the current score
        manager.currentScore = currentScore;

        manager.onGameOver();

        const expected = Math.max(currentScore, previousHighScore);
        expect(manager.highScore).toBe(expected);
        // Verify it was persisted to storage
        expect(parseInt(storage.getItem('flappyKiroHigh'), 10)).toBe(expected);
      }
    ));
  });
});

/**
 * Property 14: HUD format string
 *
 * For any non-negative integer score and highScore values, the HUD display
 * string SHALL exactly match the format "Score: {score} | High: {highScore}".
 *
 * **Validates: Requirements 5.3**
 */
describe('Property 14: HUD format string', () => {
  it('getHudText() matches "Score: {score} | High: {highScore}" for any non-negative values', () => {
    fc.assert(fc.property(
      scoreArb,
      highScoreArb,
      (score, highScore) => {
        const storage = createMockStorage();
        const manager = createScoreManager(undefined, storage);

        manager.currentScore = score;
        manager.highScore = highScore;

        const expected = `Score: ${score} | High: ${highScore}`;
        expect(manager.getHudText()).toBe(expected);
      }
    ));
  });
});
