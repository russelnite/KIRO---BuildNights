// DifficultyManager — Testable ES module version
// Mirrors the inline DifficultyManager in index.html

// Default config values (same as CONFIG.difficulty in index.html)
const DEFAULT_CONFIG = {
  baseSpeed: 120,
  speedIncrement: 15,
  maxSpeed: 280,
  baseGap: 140,
  gapDecrement: 5,
  minGap: 90,
  baseSpacing: 350,
  spacingDecrement: 15,
  minSpacing: 200,
  scoreTierSize: 10
};

/**
 * Evaluates difficulty parameters based on the current score.
 * @param {number} score - The current player score (non-negative integer)
 * @param {object} [config] - Optional config override for testing
 * @returns {{ pipeSpeed: number, gapHeight: number, pipeSpacing: number }}
 */
export function evaluate(score, config = DEFAULT_CONFIG) {
  const tier = Math.floor(score / config.scoreTierSize);
  const pipeSpeed = Math.min(config.baseSpeed + tier * config.speedIncrement, config.maxSpeed);
  const gapHeight = Math.max(config.baseGap - tier * config.gapDecrement, config.minGap);
  const pipeSpacing = Math.max(config.baseSpacing - tier * config.spacingDecrement, config.minSpacing);
  return { pipeSpeed, gapHeight, pipeSpacing };
}

export { DEFAULT_CONFIG };
