import { describe, it, expect, beforeEach } from 'vitest';
import { createStateManager } from './StateManager.js';

describe('StateManager', () => {
  let sm;

  beforeEach(() => {
    sm = createStateManager();
  });

  describe('initial state', () => {
    it('starts in ready state', () => {
      expect(sm.currentState).toBe('ready');
      expect(sm.isReady()).toBe(true);
      expect(sm.isPlaying()).toBe(false);
      expect(sm.isPaused()).toBe(false);
      expect(sm.isGameOver()).toBe(false);
    });
  });

  describe('valid transitions', () => {
    it('transitions from ready to playing', () => {
      const result = sm.transition('playing');
      expect(result).toBe(true);
      expect(sm.currentState).toBe('playing');
      expect(sm.isPlaying()).toBe(true);
    });

    it('transitions from playing to paused', () => {
      sm.transition('playing');
      const result = sm.transition('paused');
      expect(result).toBe(true);
      expect(sm.currentState).toBe('paused');
      expect(sm.isPaused()).toBe(true);
    });

    it('transitions from playing to game_over', () => {
      sm.transition('playing');
      const result = sm.transition('game_over');
      expect(result).toBe(true);
      expect(sm.currentState).toBe('game_over');
      expect(sm.isGameOver()).toBe(true);
    });

    it('transitions from paused to playing', () => {
      sm.transition('playing');
      sm.transition('paused');
      const result = sm.transition('playing');
      expect(result).toBe(true);
      expect(sm.currentState).toBe('playing');
      expect(sm.isPlaying()).toBe(true);
    });

    it('transitions from game_over to ready', () => {
      sm.transition('playing');
      sm.transition('game_over');
      const result = sm.transition('ready');
      expect(result).toBe(true);
      expect(sm.currentState).toBe('ready');
      expect(sm.isReady()).toBe(true);
    });
  });

  describe('invalid transitions (rejected)', () => {
    it('rejects ready to paused', () => {
      const result = sm.transition('paused');
      expect(result).toBe(false);
      expect(sm.currentState).toBe('ready');
    });

    it('rejects ready to game_over', () => {
      const result = sm.transition('game_over');
      expect(result).toBe(false);
      expect(sm.currentState).toBe('ready');
    });

    it('rejects ready to ready', () => {
      const result = sm.transition('ready');
      expect(result).toBe(false);
      expect(sm.currentState).toBe('ready');
    });

    it('rejects playing to ready', () => {
      sm.transition('playing');
      const result = sm.transition('ready');
      expect(result).toBe(false);
      expect(sm.currentState).toBe('playing');
    });

    it('rejects playing to playing', () => {
      sm.transition('playing');
      const result = sm.transition('playing');
      expect(result).toBe(false);
      expect(sm.currentState).toBe('playing');
    });

    it('rejects paused to game_over', () => {
      sm.transition('playing');
      sm.transition('paused');
      const result = sm.transition('game_over');
      expect(result).toBe(false);
      expect(sm.currentState).toBe('paused');
    });

    it('rejects paused to ready', () => {
      sm.transition('playing');
      sm.transition('paused');
      const result = sm.transition('ready');
      expect(result).toBe(false);
      expect(sm.currentState).toBe('paused');
    });

    it('rejects game_over to playing', () => {
      sm.transition('playing');
      sm.transition('game_over');
      const result = sm.transition('playing');
      expect(result).toBe(false);
      expect(sm.currentState).toBe('game_over');
    });

    it('rejects game_over to paused', () => {
      sm.transition('playing');
      sm.transition('game_over');
      const result = sm.transition('paused');
      expect(result).toBe(false);
      expect(sm.currentState).toBe('game_over');
    });

    it('rejects game_over to game_over', () => {
      sm.transition('playing');
      sm.transition('game_over');
      const result = sm.transition('game_over');
      expect(result).toBe(false);
      expect(sm.currentState).toBe('game_over');
    });

    it('rejects paused to paused', () => {
      sm.transition('playing');
      sm.transition('paused');
      const result = sm.transition('paused');
      expect(result).toBe(false);
      expect(sm.currentState).toBe('paused');
    });
  });

  describe('state query methods', () => {
    it('returns correct values in ready state', () => {
      expect(sm.isReady()).toBe(true);
      expect(sm.isPlaying()).toBe(false);
      expect(sm.isPaused()).toBe(false);
      expect(sm.isGameOver()).toBe(false);
    });

    it('returns correct values in playing state', () => {
      sm.transition('playing');
      expect(sm.isReady()).toBe(false);
      expect(sm.isPlaying()).toBe(true);
      expect(sm.isPaused()).toBe(false);
      expect(sm.isGameOver()).toBe(false);
    });

    it('returns correct values in paused state', () => {
      sm.transition('playing');
      sm.transition('paused');
      expect(sm.isReady()).toBe(false);
      expect(sm.isPlaying()).toBe(false);
      expect(sm.isPaused()).toBe(true);
      expect(sm.isGameOver()).toBe(false);
    });

    it('returns correct values in game_over state', () => {
      sm.transition('playing');
      sm.transition('game_over');
      expect(sm.isReady()).toBe(false);
      expect(sm.isPlaying()).toBe(false);
      expect(sm.isPaused()).toBe(false);
      expect(sm.isGameOver()).toBe(true);
    });
  });

  describe('full game cycle', () => {
    it('supports a complete play cycle: ready → playing → game_over → ready', () => {
      expect(sm.isReady()).toBe(true);

      sm.transition('playing');
      expect(sm.isPlaying()).toBe(true);

      sm.transition('game_over');
      expect(sm.isGameOver()).toBe(true);

      sm.transition('ready');
      expect(sm.isReady()).toBe(true);
    });

    it('supports pause/resume cycle: playing → paused → playing → game_over', () => {
      sm.transition('playing');
      sm.transition('paused');
      expect(sm.isPaused()).toBe(true);

      sm.transition('playing');
      expect(sm.isPlaying()).toBe(true);

      sm.transition('game_over');
      expect(sm.isGameOver()).toBe(true);
    });
  });
});
