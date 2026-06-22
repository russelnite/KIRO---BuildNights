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

// Default flying obstacle config values (from CONFIG.flyingObstacles)
const DEFAULT_FLYING_OBSTACLE_CONFIG = {
  activationThreshold: 30,
  baseSpeedMultiplier: 1.2,
  maxSpeedMultiplier: 2.0,
  speedMultiplierIncrement: 0.2,
  baseSpawnIntervalMin: 3000,
  baseSpawnIntervalMax: 5000,
  minSpawnIntervalMin: 1500,
  minSpawnIntervalMax: 2500,
  spawnIntervalDecrement: 400
};

/**
 * Evaluates difficulty parameters based on the current score.
 * @param {number} score - The current player score (non-negative integer)
 * @param {object} [config] - Optional config override for testing
 * @param {object} [flyingObstacleConfig] - Optional flying obstacle config override
 * @returns {{ pipeSpeed: number, gapHeight: number, pipeSpacing: number, flyingObstacleSpeedMultiplier: number|null, flyingObstacleSpawnInterval: {min: number, max: number}|null }}
 */
export function evaluate(score, config = DEFAULT_CONFIG, flyingObstacleConfig = DEFAULT_FLYING_OBSTACLE_CONFIG) {
  const tier = Math.floor(score / config.scoreTierSize);
  const pipeSpeed = Math.min(config.baseSpeed + tier * config.speedIncrement, config.maxSpeed);
  const gapHeight = Math.max(config.baseGap - tier * config.gapDecrement, config.minGap);
  const pipeSpacing = Math.max(config.baseSpacing - tier * config.spacingDecrement, config.minSpacing);

  // Flying obstacle parameters: only active when score >= activation threshold
  let flyingObstacleSpeedMultiplier = null;
  let flyingObstacleSpawnInterval = null;

  if (score >= flyingObstacleConfig.activationThreshold) {
    const obstacleScore = score - flyingObstacleConfig.activationThreshold;
    const obstacleTier = Math.floor(obstacleScore / 10);

    // Speed multiplier: scales from 1.2 at threshold to 2.0 at max
    flyingObstacleSpeedMultiplier = Math.min(
      flyingObstacleConfig.baseSpeedMultiplier + obstacleTier * flyingObstacleConfig.speedMultiplierIncrement,
      flyingObstacleConfig.maxSpeedMultiplier
    );

    // Spawn interval: decreases from base range to min range
    const intervalMin = Math.max(
      flyingObstacleConfig.baseSpawnIntervalMin - obstacleTier * flyingObstacleConfig.spawnIntervalDecrement,
      flyingObstacleConfig.minSpawnIntervalMin
    );
    const intervalMax = Math.max(
      flyingObstacleConfig.baseSpawnIntervalMax - obstacleTier * flyingObstacleConfig.spawnIntervalDecrement,
      flyingObstacleConfig.minSpawnIntervalMax
    );

    flyingObstacleSpawnInterval = { min: intervalMin, max: intervalMax };
  }

  return { pipeSpeed, gapHeight, pipeSpacing, flyingObstacleSpeedMultiplier, flyingObstacleSpawnInterval };
}

export { DEFAULT_CONFIG, DEFAULT_FLYING_OBSTACLE_CONFIG };
