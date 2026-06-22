/**
 * ScoreManager — Point tracking, high score persistence, and display formatting.
 * 
 * Factory export: createScoreManager(config?, storage?)
 * - config: optional config object (defaults to { collectibles: { bonusPoints: 5 } })
 * - storage: optional storage object with getItem/setItem (defaults to localStorage)
 * 
 * Follows flappy-kiro-domain.md scoring patterns and game-coding-standards.md conventions.
 */

function createScoreManager(config, storage) {
  const _config = config || { collectibles: { bonusPoints: 5 } };
  const _storageKey = 'flappyKiroHigh';

  // Determine storage backend with graceful fallback
  let _storage = storage || null;
  if (!_storage) {
    try {
      // Test that localStorage is accessible
      if (typeof localStorage !== 'undefined') {
        _storage = localStorage;
      }
    } catch (e) {
      _storage = null;
    }
  }

  const manager = {
    currentScore: 0,
    highScore: 0,
    isNewHighScore: false,

    /**
     * Load high score from storage with graceful fallback.
     * Returns 0 for corrupt/missing data or unavailable storage.
     * @returns {number}
     */
    loadHighScore() {
      try {
        if (!_storage) return 0;
        const stored = _storage.getItem(_storageKey);
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? 0 : parsed;
      } catch (e) {
        return 0;
      }
    },

    /**
     * Persist high score to storage.
     * Fails silently if storage unavailable or quota exceeded.
     */
    saveHighScore() {
      try {
        if (!_storage) return;
        _storage.setItem(_storageKey, String(this.highScore));
      } catch (e) {
        // Quota exceeded or unavailable — silently continue
      }
    },

    /**
     * Increment score by given points.
     * @param {number} points - Points to add.
     */
    increment(points) {
      this.currentScore += points;
    },

    /**
     * Check if ghost has passed any unscored pipes and award points.
     * Ghost's left edge x position is compared against pipe's trailing edge (pipe.x + pipe.width).
     * Marks pipes as scored to prevent double-counting.
     * @param {object} ghost - Ghost object with x property.
     * @param {Array} pipes - Array of pipe objects with x, width, scored properties.
     * @returns {number} Total points scored this frame from pipe passes.
     */
    checkPipePass(ghost, pipes) {
      let pointsThisFrame = 0;
      for (const pipe of pipes) {
        if (!pipe.scored && ghost.x > pipe.x + pipe.width) {
          pipe.scored = true;
          this.increment(1);
          pointsThisFrame += 1;
        }
      }
      return pointsThisFrame;
    },

    /**
     * Check if ghost collects any collectibles and award bonus points.
     * Uses circle-vs-rect overlap: ghost circle center vs collectible rect.
     * Marks collectible as collected.
     * @param {object} ghost - Ghost object with x, y, width, height, hitboxRadius.
     * @param {Array} collectibles - Array of collectible objects with x, y, width, height, collected.
     * @returns {number} Total bonus points scored this frame.
     */
    checkCollectiblePickup(ghost, collectibles) {
      let pointsThisFrame = 0;
      const bonusPoints = _config.collectibles.bonusPoints;

      // Ghost circle
      const cx = ghost.x + ghost.width / 2;
      const cy = ghost.y + ghost.height / 2;
      const r = ghost.hitboxRadius;

      for (const c of collectibles) {
        if (c.collected) continue;

        // Circle-vs-rect collision
        const closestX = Math.max(c.x, Math.min(cx, c.x + c.width));
        const closestY = Math.max(c.y, Math.min(cy, c.y + c.height));
        const dx = cx - closestX;
        const dy = cy - closestY;

        if ((dx * dx + dy * dy) <= (r * r)) {
          c.collected = true;
          this.increment(bonusPoints);
          pointsThisFrame += bonusPoints;
        }
      }
      return pointsThisFrame;
    },

    /**
     * Reset score for new game session.
     * Sets current score to 0 and clears new high score flag.
     */
    reset() {
      this.currentScore = 0;
      this.isNewHighScore = false;
    },

    /**
     * Finalize score on game over.
     * Updates high score to max(currentScore, previousHighScore) and persists.
     */
    onGameOver() {
      this.highScore = Math.max(this.currentScore, this.highScore);
      this.isNewHighScore = this.currentScore > 0 && this.currentScore >= this.highScore;
      this.saveHighScore();
    },

    /**
     * Get formatted HUD display string.
     * Format: "Score: {score} | High: {highScore}"
     * @returns {string}
     */
    getHudText() {
      return 'Score: ' + this.currentScore + ' | High: ' + this.highScore;
    }
  };

  // Load high score on initialization
  manager.highScore = manager.loadHighScore();

  return manager;
}

// Export for Node.js testing and browser usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createScoreManager };
}
