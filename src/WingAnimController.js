// WingAnimController — Testable ES module
// Manages three-tier wing animation speed based on player input state.

const DEFAULT_CONFIG = {
  baseRateMin: 250,
  baseRateMax: 350,
  jumpRateMin: 120,
  jumpRateMax: 180,
  rapidRateMin: 60,
  rapidRateMax: 100,
  jumpBoostDuration: 300,
  rapidDetectionWindow: 200
};

/**
 * Creates a WingAnimController instance.
 * @param {object} [config] - Optional config override (wingAnimation section)
 * @returns {{ update: Function, getCurrentFrame: Function, reset: Function }}
 */
export function createWingAnimController(config = DEFAULT_CONFIG) {
  // Validate config - fall back to defaults if values are invalid
  const cfg = {
    baseRateMin: (config.baseRateMin > 0) ? config.baseRateMin : DEFAULT_CONFIG.baseRateMin,
    baseRateMax: (config.baseRateMax > 0) ? config.baseRateMax : DEFAULT_CONFIG.baseRateMax,
    jumpRateMin: (config.jumpRateMin > 0) ? config.jumpRateMin : DEFAULT_CONFIG.jumpRateMin,
    jumpRateMax: (config.jumpRateMax > 0) ? config.jumpRateMax : DEFAULT_CONFIG.jumpRateMax,
    rapidRateMin: (config.rapidRateMin > 0) ? config.rapidRateMin : DEFAULT_CONFIG.rapidRateMin,
    rapidRateMax: (config.rapidRateMax > 0) ? config.rapidRateMax : DEFAULT_CONFIG.rapidRateMax,
    jumpBoostDuration: (config.jumpBoostDuration > 0) ? config.jumpBoostDuration : DEFAULT_CONFIG.jumpBoostDuration,
    rapidDetectionWindow: (config.rapidDetectionWindow > 0) ? config.rapidDetectionWindow : DEFAULT_CONFIG.rapidDetectionWindow
  };

  // Internal state
  let currentFrame = 'up';
  let frameTimer = 0;
  let tier = 'base';
  let currentRate = _midpoint(cfg.baseRateMin, cfg.baseRateMax);
  let jumpBoostTimer = 0;
  let lastJumpTimestamps = []; // Track recent jump timestamps for rapid detection
  let elapsedTime = 0; // Total elapsed time (used as a virtual clock)

  /**
   * Midpoint helper - picks the center of a range.
   */
  function _midpoint(min, max) {
    return (min + max) / 2;
  }

  /**
   * Get the rate for the current tier.
   */
  function _getRateForTier(t) {
    switch (t) {
      case 'jump':
        return _midpoint(cfg.jumpRateMin, cfg.jumpRateMax);
      case 'rapid':
        return _midpoint(cfg.rapidRateMin, cfg.rapidRateMax);
      case 'base':
      default:
        return _midpoint(cfg.baseRateMin, cfg.baseRateMax);
    }
  }

  /**
   * Update the wing animation state.
   * @param {number} dt - Delta time in seconds
   * @param {boolean} jumpTriggeredThisFrame - Whether a jump was triggered this frame
   * @param {boolean} jumpHeld - Whether the jump key is currently held
   * @param {string} gameState - Current game state: 'ready', 'playing', 'paused', 'game_over'
   */
  function update(dt, jumpTriggeredThisFrame, jumpHeld, gameState) {
    // No-op for zero or negative dt
    if (dt <= 0) return;

    // Freeze animation in paused or game_over states
    if (gameState === 'paused' || gameState === 'game_over') {
      return;
    }

    const dtMs = dt * 1000;
    elapsedTime += dtMs;

    // In 'ready' state, always animate at base rate
    if (gameState === 'ready') {
      tier = 'base';
      currentRate = _getRateForTier('base');
      _advanceFrame(dtMs);
      return;
    }

    // Playing state - handle tier transitions
    if (jumpTriggeredThisFrame) {
      lastJumpTimestamps.push(elapsedTime);

      // Keep only recent timestamps within the detection window
      _pruneJumpTimestamps();

      // Check for rapid: two jumps within rapidDetectionWindow
      if (_isRapidJumping()) {
        tier = 'rapid';
        currentRate = _getRateForTier('rapid');
        jumpBoostTimer = 0; // Rapid overrides jump boost
      } else {
        // Single jump - transition to jump tier
        tier = 'jump';
        currentRate = _getRateForTier('jump');
        jumpBoostTimer = cfg.jumpBoostDuration;
      }
    }

    // If in rapid tier, check if we should revert
    if (tier === 'rapid') {
      _pruneJumpTimestamps();
      // If no recent jumps within the window and key is not held, revert to base
      if (!jumpHeld && !_isRapidJumping()) {
        tier = 'base';
        currentRate = _getRateForTier('base');
      }
    }

    // If in jump tier, count down the boost timer
    if (tier === 'jump') {
      jumpBoostTimer -= dtMs;
      if (jumpBoostTimer <= 0) {
        jumpBoostTimer = 0;
        tier = 'base';
        currentRate = _getRateForTier('base');
      }
    }

    // Advance frame timer
    _advanceFrame(dtMs);
  }

  /**
   * Advance the frame timer and toggle frame when rate is exceeded.
   */
  function _advanceFrame(dtMs) {
    frameTimer += dtMs;
    while (frameTimer >= currentRate) {
      frameTimer -= currentRate;
      currentFrame = (currentFrame === 'up') ? 'down' : 'up';
    }
  }

  /**
   * Remove jump timestamps older than the rapid detection window.
   */
  function _pruneJumpTimestamps() {
    const cutoff = elapsedTime - cfg.rapidDetectionWindow;
    while (lastJumpTimestamps.length > 0 && lastJumpTimestamps[0] < cutoff) {
      lastJumpTimestamps.shift();
    }
  }

  /**
   * Check if two or more jumps occurred within the rapid detection window.
   */
  function _isRapidJumping() {
    return lastJumpTimestamps.length >= 2;
  }

  /**
   * Get the current animation frame.
   * @returns {'up' | 'down'}
   */
  function getCurrentFrame() {
    return currentFrame;
  }

  /**
   * Reset the controller to its initial state.
   */
  function reset() {
    currentFrame = 'up';
    frameTimer = 0;
    tier = 'base';
    currentRate = _midpoint(cfg.baseRateMin, cfg.baseRateMax);
    jumpBoostTimer = 0;
    lastJumpTimestamps = [];
    elapsedTime = 0;
  }

  /**
   * Get the current tier (exposed for testing/debugging).
   * @returns {'base' | 'jump' | 'rapid'}
   */
  function getCurrentTier() {
    return tier;
  }

  /**
   * Get the current rate in ms (exposed for testing/debugging).
   * @returns {number}
   */
  function getCurrentRate() {
    return currentRate;
  }

  return {
    update,
    getCurrentFrame,
    getCurrentTier,
    getCurrentRate,
    reset
  };
}

export { DEFAULT_CONFIG };
