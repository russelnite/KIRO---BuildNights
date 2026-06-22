/**
 * GameEngine — Main loop, state management, and rendering orchestration.
 * Follows game-coding-standards.md architecture and flappy-kiro-domain.md state patterns.
 */
const GameEngine = {
  // State machine
  state: 'ready',
  _transitions: {
    ready: ['playing'],
    playing: ['paused', 'game_over'],
    paused: ['playing'],
    game_over: ['ready']
  },

  // Timing
  lastTimestamp: 0,
  maxDt: 0.033,
  isRunning: false,
  rafId: null,

  // Subsystem references (injected via init)
  _ghosty: null,
  _renderer: null,
  _inputHandler: null,
  _onStateChange: null,

  /**
   * Initialize engine with subsystem references.
   */
  init(config) {
    this.maxDt = config.maxDt || 0.033;
    this._ghosty = config.ghosty || null;
    this._renderer = config.renderer || null;
    this._inputHandler = config.inputHandler || null;
    this._onStateChange = config.onStateChange || null;
    this.state = 'ready';
  },

  /**
   * Attempt a state transition. Returns true if valid.
   */
  transition(newState) {
    const allowed = this._transitions[this.state];
    if (allowed && allowed.includes(newState)) {
      const oldState = this.state;
      this.state = newState;
      if (this._onStateChange) this._onStateChange(oldState, newState);
      return true;
    }
    return false;
  },

  // State query helpers
  isPlaying() { return this.state === 'playing'; },
  isPaused() { return this.state === 'paused'; },
  isReady() { return this.state === 'ready'; },
  isGameOver() { return this.state === 'game_over'; },

  /**
   * Start the game loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame((ts) => this._tick(ts));
  },

  /**
   * Stop the game loop.
   */
  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  },

  /**
   * Single frame execution — deterministic pipeline order.
   * Pipeline: input → state → physics → scroll → collision → difficulty → score → particles → render
   */
  _tick(timestamp) {
    if (!this.isRunning) return;

    // 1. Delta-time (seconds), clamped to prevent spiral-of-death
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, this.maxDt);
    this.lastTimestamp = timestamp;

    // 2. Process frame (delegated to external tick handler for flexibility)
    if (this._onTick) {
      this._onTick(dt, this.state);
    }

    // 3. Request next frame
    this.rafId = requestAnimationFrame((ts) => this._tick(ts));
  },

  /**
   * Set the per-frame tick handler.
   * Handler receives (dt: number, state: string).
   */
  setTickHandler(handler) {
    this._onTick = handler;
  },

  /**
   * Process input and trigger state transitions.
   * Called from within tick handler.
   */
  processInput(jumpInput, pauseInput) {
    if (this.isReady() && jumpInput) {
      this.transition('playing');
    } else if (this.isPlaying() && pauseInput) {
      this.transition('paused');
    } else if (this.isPaused() && pauseInput) {
      this.transition('playing');
    } else if (this.isGameOver() && jumpInput) {
      this.transition('ready');
    }
  },

  /**
   * Trigger game over (from collision detection).
   */
  triggerGameOver() {
    this.transition('game_over');
  }
};

if (typeof module !== 'undefined') module.exports = GameEngine;
