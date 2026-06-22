/**
 * StateManager — Controls game state transitions and validates transition legality.
 *
 * States: 'ready' | 'playing' | 'paused' | 'game_over'
 *
 * Valid transitions:
 *   ready     → playing
 *   playing   → paused, game_over
 *   paused    → playing
 *   game_over → ready
 */

export function createStateManager() {
  return {
    currentState: 'ready',

    _transitions: {
      ready: ['playing'],
      playing: ['paused', 'game_over'],
      paused: ['playing'],
      game_over: ['ready']
    },

    transition(newState) {
      if (this._transitions[this.currentState].includes(newState)) {
        this.currentState = newState;
        return true;
      }
      return false;
    },

    isPlaying() { return this.currentState === 'playing'; },
    isPaused() { return this.currentState === 'paused'; },
    isReady() { return this.currentState === 'ready'; },
    isGameOver() { return this.currentState === 'game_over'; }
  };
}
