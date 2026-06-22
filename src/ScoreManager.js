/**
 * ScoreManager — Point tracking, high score persistence, and display formatting.
 * Follows flappy-kiro-domain.md scoring patterns and game-coding-standards.md conventions.
 */
const ScoreManager = {
  currentScore: 0,
  highScore: 0,
  isNewHighScore: false,
  _storageKey: 'flappyKiroHigh',

  /**
   * Initialize by loading persisted high score.
   */
  init() {
    this.highScore = this._loadHighScore();
    this.currentScore = 0;
    this.isNewHighScore = false;
  },

  /**
   * Reset score for new game session.
   */
  reset() {
    this.currentScore = 0;
    this.isNewHighScore = false;
  },

  /**
   * Increment score by given points.
   * @returns {number} Points awarded this call.
   */
  increment(points) {
    this.currentScore += points;
    return points;
  },

  /**
   * Check if ghost has passed any unscored pipes and award points.
   * Marks pipes as scored to prevent double-counting.
   * @returns {number} Total points scored this frame from pipe passes.
   */
  checkPipePass(ghostRightEdge, pipes, pipeWidth) {
    let scored = 0;
    for (const pipe of pipes) {
      if (!pipe.scored && ghostRightEdge > pipe.x + pipeWidth) {
        pipe.scored = true;
        scored += 1;
      }
    }
    if (scored > 0) this.currentScore += scored;
    return scored;
  },

  /**
   * Award bonus points for collectible pickup.
   * @returns {number} Points awarded.
   */
  awardCollectibleBonus(bonusPoints) {
    this.currentScore += bonusPoints;
    return bonusPoints;
  },

  /**
   * Finalize score on game over. Updates high score if beaten.
   * @returns {boolean} True if new high score was set.
   */
  finalizeGameOver() {
    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore;
      this.isNewHighScore = true;
      this._saveHighScore(this.highScore);
      return true;
    }
    this.isNewHighScore = false;
    return false;
  },

  /**
   * Get formatted HUD display string.
   * Format: "Score: {n} | High: {n}"
   */
  getHudText() {
    return 'Score: ' + this.currentScore + ' | High: ' + this.highScore;
  },

  /**
   * Get formatted score for left-aligned HUD.
   */
  getScoreText() {
    return 'Score: ' + this.currentScore;
  },

  /**
   * Get formatted high score for right-aligned HUD.
   */
  getHighText() {
    return 'High: ' + this.highScore;
  },

  /**
   * Load high score from localStorage with graceful fallback.
   * @returns {number}
   */
  _loadHighScore() {
    try {
      const stored = localStorage.getItem(this._storageKey);
      const parsed = parseInt(stored, 10);
      return isNaN(parsed) ? 0 : parsed;
    } catch (e) {
      // localStorage unavailable (private browsing, quota, etc.)
      return 0;
    }
  },

  /**
   * Persist high score to localStorage.
   * Fails silently if storage unavailable.
   */
  _saveHighScore(score) {
    try {
      localStorage.setItem(this._storageKey, String(score));
    } catch (e) {
      // Quota exceeded or unavailable — continue without persistence
    }
  }
};

if (typeof module !== 'undefined') module.exports = ScoreManager;
