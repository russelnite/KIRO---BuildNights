/**
 * ScrollingEngine — Manages horizontal movement of pipes and collectibles.
 * Uses object pooling for memory efficiency.
 *
 * Exported as a factory function for testability. Accepts a config object
 * and an optional random function for deterministic testing.
 *
 * @param {object} [config] - Configuration object with canvas, pipes, pools, difficulty sub-objects
 * @param {function} [randomFn] - Random function (0-1), defaults to Math.random
 * @returns {{ update: Function, spawnPipePair: Function, spawnCollectible: Function, removeOffscreen: Function, getPipePool: Function, getCollectiblePool: Function }}
 */
export function createScrollingEngine(config, randomFn) {
  const _random = randomFn || Math.random;

  const canvasWidth = (config && config.canvas && config.canvas.width) || 800;
  const canvasHeight = (config && config.canvas && config.canvas.height) || 500;
  const hudHeight = (config && config.canvas && config.canvas.hudHeight) || 40;
  const pipeWidth = (config && config.pipes && config.pipes.width) || 60;
  const gapMinPercent = (config && config.pipes && config.pipes.gapMinPercent) || 0.2;
  const gapMaxPercent = (config && config.pipes && config.pipes.gapMaxPercent) || 0.8;
  const poolPipes = (config && config.pools && config.pools.pipes) || 8;
  const poolCollectibles = (config && config.pools && config.pools.collectibles) || 6;
  const poolClouds = (config && config.pools && config.pools.clouds) || 15;
  const baseSpacing = (config && config.difficulty && config.difficulty.baseSpacing) || 350;

  // Flying obstacle config
  const flyingObsConfig = (config && config.flyingObstacles) || {};
  const flyingObsActivationThreshold = flyingObsConfig.activationThreshold || 30;
  const flyingObsMaxOnScreen = flyingObsConfig.maxOnScreen || 2;
  const flyingObsSpawnYMinPercent = flyingObsConfig.spawnYMinPercent || 0.15;
  const flyingObsSpawnYMaxPercent = flyingObsConfig.spawnYMaxPercent || 0.85;
  const flyingObsHeightRatio = flyingObsConfig.heightRatio || 0.75;
  const flyingObsPoolSize = flyingObsConfig.poolSize || 4;
  const characterHeight = (config && config.character && config.character.spriteHeight) || 44;
  const flyingObsHeight = Math.round(characterHeight * flyingObsHeightRatio); // 33px
  const flyingObsWidth = flyingObsConfig.width || 40; // default width

  // Cloud config
  const cloudLayers = (config && config.clouds && config.clouds.layers) || [
    { speedFactor: [0.1, 0.3], opacity: [0.1, 0.3], scale: [0.2, 0.4] },
    { speedFactor: [0.4, 0.6], opacity: [0.3, 0.5], scale: [0.5, 0.7] },
    { speedFactor: [0.7, 0.9], opacity: [0.5, 0.7], scale: [0.8, 1.0] }
  ];
  const cloudCountPerLayer = (config && config.clouds && config.clouds.countPerLayer) || [2, 5];
  const cloudBaseWidth = (config && config.clouds && config.clouds.baseWidth) || [60, 120];

  // Simple ObjectPool implementation for the module
  function createPool(factory) {
    const free = [];
    return {
      acquire() {
        return free.length > 0 ? free.pop() : factory();
      },
      release(obj) {
        free.push(obj);
      },
      prewarm(count) {
        for (let i = 0; i < count; i++) {
          free.push(factory());
        }
      },
      get freeCount() {
        return free.length;
      }
    };
  }

  function createPipePairObject() {
    return {
      x: 0,
      width: pipeWidth,
      gapCenterY: 0,
      gapHeight: 0,
      scored: false
    };
  }

  function createCollectibleObject() {
    return {
      x: 0,
      y: 0,
      width: 30,
      height: 20,
      speed: 0,
      opacity: 0,
      oscillateOffset: 0,
      collected: false
    };
  }

  function createCloudObject() {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      layer: 0,
      speed: 0,
      opacity: 0,
      scale: 0
    };
  }

  // Create and prewarm pools
  const pipePool = createPool(createPipePairObject);
  pipePool.prewarm(poolPipes);

  const collectiblePool = createPool(createCollectibleObject);
  collectiblePool.prewarm(poolCollectibles);

  const cloudPool = createPool(createCloudObject);
  cloudPool.prewarm(poolClouds);

  // Flying obstacle pool
  function createFlyingObstacleObject() {
    return {
      x: 0,
      y: 0,
      width: flyingObsWidth,
      height: flyingObsHeight,
      speed: 0,
      active: false
    };
  }

  const flyingObstaclePool = createPool(createFlyingObstacleObject);
  flyingObstaclePool.prewarm(flyingObsPoolSize);

  // Spawn timer state for flying obstacles
  let flyingObsSpawnTimer = 0;
  let flyingObsCurrentInterval = 0;

  /**
   * Spawn a new pipe pair at the right edge of the canvas.
   *
   * @param {object} difficulty - DifficultyParams { pipeSpeed, gapHeight, pipeSpacing }
   * @returns {object} PipePair object
   */
  function spawnPipePair(difficulty) {
    const pipe = pipePool.acquire();
    pipe.x = canvasWidth;
    pipe.width = pipeWidth;
    pipe.gapHeight = difficulty.gapHeight;
    pipe.scored = false;

    // Gap center between 20% and 80% of playable area
    const playableHeight = canvasHeight - hudHeight;
    const minY = playableHeight * gapMinPercent;
    const maxY = playableHeight * gapMaxPercent;
    pipe.gapCenterY = minY + _random() * (maxY - minY);

    return pipe;
  }

  /**
   * Remove off-screen pipes and collectibles from the game objects,
   * returning them to their respective pools.
   *
   * @param {object} gameObjects - Object with { pipes: [], collectibles: [] }
   */
  function removeOffscreen(gameObjects) {
    // Remove pipes whose right edge has passed x=0
    let i = gameObjects.pipes.length;
    while (i--) {
      const pipe = gameObjects.pipes[i];
      if (pipe.x + pipe.width < 0) {
        gameObjects.pipes.splice(i, 1);
        pipePool.release(pipe);
      }
    }

    // Remove collectibles whose right edge has passed x=0
    if (gameObjects.collectibles) {
      let j = gameObjects.collectibles.length;
      while (j--) {
        const c = gameObjects.collectibles[j];
        if (c.x + c.width < 0) {
          gameObjects.collectibles.splice(j, 1);
          collectiblePool.release(c);
        }
      }
    }
  }

  /**
   * Update pipe positions, spawn new pipes as needed, and remove off-screen objects.
   * Only processes in 'playing' state.
   *
   * @param {object} gameObjects - Object with { pipes: [], collectibles: [] }
   * @param {number} dt - Delta time in seconds
   * @param {object} difficulty - DifficultyParams { pipeSpeed, gapHeight, pipeSpacing }
   * @param {string} state - Current game state ('ready'|'playing'|'paused'|'game_over')
   */
  function update(gameObjects, dt, difficulty, state) {
    if (state !== 'playing') return;

    // Move all pipes left
    for (let i = 0; i < gameObjects.pipes.length; i++) {
      gameObjects.pipes[i].x -= difficulty.pipeSpeed * dt;
    }

    // Move all collectibles left at their individual speed
    if (gameObjects.collectibles) {
      for (let i = 0; i < gameObjects.collectibles.length; i++) {
        gameObjects.collectibles[i].x -= gameObjects.collectibles[i].speed * dt;
      }
    }

    // Spawn new pipe pair if needed
    // Check if rightmost pipe's right edge is far enough from canvas right edge
    const spacing = difficulty.pipeSpacing || baseSpacing;
    let rightmostEdge = -Infinity;
    let rightmostPipe = null;
    for (let i = 0; i < gameObjects.pipes.length; i++) {
      const rightEdge = gameObjects.pipes[i].x + gameObjects.pipes[i].width;
      if (rightEdge > rightmostEdge) {
        rightmostEdge = rightEdge;
        rightmostPipe = gameObjects.pipes[i];
      }
    }

    // If no pipes exist, or rightmost pipe is far enough from the right edge, spawn
    if (gameObjects.pipes.length === 0 || (canvasWidth - rightmostEdge) >= spacing) {
      const newPipe = spawnPipePair(difficulty);
      gameObjects.pipes.push(newPipe);

      // Attempt to spawn a collectible between the previous and new pipe
      if (rightmostPipe && gameObjects.collectibles) {
        const collectible = spawnCollectible(rightmostPipe, newPipe, difficulty);
        if (collectible) {
          gameObjects.collectibles.push(collectible);
        }
      }
    }

    // Remove off-screen objects
    removeOffscreen(gameObjects);
  }

  /**
   * Attempt to spawn a collectible between two consecutive pipe pairs.
   * Has a 30-50% probability of spawning per call.
   *
   * @param {object} prevPipe - The previous (left) pipe pair
   * @param {object} newPipe - The newly spawned (right) pipe pair
   * @param {object} difficulty - DifficultyParams { pipeSpeed, gapHeight, pipeSpacing }
   * @returns {object|null} Collectible object or null if probability check fails
   */
  function spawnCollectible(prevPipe, newPipe, difficulty) {
    // Probability check: random value between 30%-50%
    const spawnProbMin = (config && config.collectibles && config.collectibles.spawnProbabilityMin) || 0.3;
    const spawnProbMax = (config && config.collectibles && config.collectibles.spawnProbabilityMax) || 0.5;
    const spawnProb = spawnProbMin + _random() * (spawnProbMax - spawnProbMin);
    if (_random() > spawnProb) return null;

    const collectible = collectiblePool.acquire();

    // Position at horizontal midpoint between previous pipe trailing edge and new pipe leading edge
    const prevTrailing = prevPipe.x + prevPipe.width;
    const nextLeading = newPipe.x;
    collectible.x = (prevTrailing + nextLeading) / 2;

    // Random Y within playable area (20%-80%)
    const playableH = canvasHeight - hudHeight;
    collectible.y = playableH * 0.2 + _random() * playableH * 0.6;

    // Speed: 50%-150% of current pipe speed
    const speedFactorMin = (config && config.collectibles && config.collectibles.speedFactorMin) || 0.5;
    const speedFactorMax = (config && config.collectibles && config.collectibles.speedFactorMax) || 1.5;
    const speedFactor = speedFactorMin + _random() * (speedFactorMax - speedFactorMin);
    collectible.speed = difficulty.pipeSpeed * speedFactor;

    // Opacity correlates with speed: faster = more opaque (appears closer)
    // Map speedFactor [0.5, 1.5] → opacity [0.4, 0.7]
    const opacityMin = (config && config.collectibles && config.collectibles.opacityMin) || 0.4;
    const opacityMax = (config && config.collectibles && config.collectibles.opacityMax) || 0.7;
    const opacityRange = opacityMax - opacityMin;
    const speedRange = speedFactorMax - speedFactorMin;
    collectible.opacity = opacityMin +
      ((speedFactor - speedFactorMin) / speedRange) * opacityRange;

    // Random phase offset for vertical oscillation
    collectible.oscillateOffset = _random() * Math.PI * 2;
    collectible.collected = false;
    collectible.width = (config && config.collectibles && config.collectibles.width) || 30;
    collectible.height = (config && config.collectibles && config.collectibles.height) || 20;

    return collectible;
  }

  /**
   * Spawn a cloud for a given parallax layer.
   * Positioned off-screen right with a random offset.
   *
   * @param {number} layer - Layer index (0=far, 1=mid, 2=near)
   * @param {object} difficulty - DifficultyParams { pipeSpeed, gapHeight, pipeSpacing }
   * @param {boolean} [initialSpread] - If true, distribute across full canvas width
   * @returns {object} Cloud object
   */
  function spawnCloud(layer, difficulty, initialSpread) {
    const cloud = cloudPool.acquire();
    const layerDef = cloudLayers[layer];

    // Random speed within layer's speedFactor range × pipeSpeed
    const speedFactor = layerDef.speedFactor[0] + _random() * (layerDef.speedFactor[1] - layerDef.speedFactor[0]);
    cloud.speed = speedFactor * difficulty.pipeSpeed;

    // Random opacity within layer's opacity range
    cloud.opacity = layerDef.opacity[0] + _random() * (layerDef.opacity[1] - layerDef.opacity[0]);

    // Random scale within layer's scale range
    cloud.scale = layerDef.scale[0] + _random() * (layerDef.scale[1] - layerDef.scale[0]);

    // Width = random baseWidth × scale
    const baseW = cloudBaseWidth[0] + _random() * (cloudBaseWidth[1] - cloudBaseWidth[0]);
    cloud.width = baseW * cloud.scale;
    cloud.height = cloud.width * 0.5;

    // Y = random position within playable area
    const playableHeight = canvasHeight - hudHeight;
    cloud.y = _random() * (playableHeight - cloud.height);

    // X position
    if (initialSpread) {
      // Distribute across full canvas width for initial population
      cloud.x = _random() * (canvasWidth + cloud.width) - cloud.width;
    } else {
      // Spawn off-screen right with random offset
      cloud.x = canvasWidth + _random() * 100;
    }

    cloud.layer = layer;
    return cloud;
  }

  /**
   * Pre-populate clouds array with 2-5 clouds per layer, distributed across canvas.
   *
   * @param {object} difficulty - DifficultyParams { pipeSpeed, gapHeight, pipeSpacing }
   * @returns {Array[]} Array of 3 arrays (one per layer): [farClouds, midClouds, nearClouds]
   */
  function initClouds(difficulty) {
    const clouds = [[], [], []];
    for (let layer = 0; layer < 3; layer++) {
      // Random count between min and max (inclusive)
      const minCount = cloudCountPerLayer[0];
      const maxCount = cloudCountPerLayer[1];
      const count = minCount + Math.floor(_random() * (maxCount - minCount + 1));
      for (let i = 0; i < count; i++) {
        clouds[layer].push(spawnCloud(layer, difficulty, true));
      }
    }
    return clouds;
  }

  /**
   * Update clouds: move left at individual speeds, recycle off-screen, maintain count.
   * Works in ALL states except paused.
   *
   * @param {Array[]} clouds - Array of 3 arrays: [farClouds, midClouds, nearClouds]
   * @param {number} dt - Delta time in seconds
   * @param {object} difficulty - DifficultyParams { pipeSpeed, gapHeight, pipeSpacing }
   * @param {string} state - Current game state
   */
  function updateClouds(clouds, dt, difficulty, state) {
    if (state === 'paused') return;

    for (let layer = 0; layer < 3; layer++) {
      const layerClouds = clouds[layer];

      // Move clouds left at their individual speed
      for (let i = 0; i < layerClouds.length; i++) {
        layerClouds[i].x -= layerClouds[i].speed * dt;
      }

      // Recycle clouds that moved off-screen left
      for (let i = 0; i < layerClouds.length; i++) {
        const cloud = layerClouds[i];
        if (cloud.x + cloud.width < 0) {
          // Reposition off-screen right with new random Y
          cloud.x = canvasWidth + _random() * 100;
          const playableHeight = canvasHeight - hudHeight;
          cloud.y = _random() * (playableHeight - cloud.height);
        }
      }

      // Maintain cloud count: if layer has fewer than min, spawn new ones
      const minCount = cloudCountPerLayer[0];
      while (layerClouds.length < minCount) {
        layerClouds.push(spawnCloud(layer, difficulty, false));
      }
    }
  }

  /**
   * Spawn a flying obstacle if conditions are met.
   * Only spawns when score >= activation threshold and active count < max on screen.
   *
   * @param {object} difficulty - DifficultyParams with flyingObstacleSpeedMultiplier and flyingObstacleSpawnInterval
   * @param {number} score - Current player score
   * @param {object[]} flyingObstacles - Current active flying obstacles array
   * @returns {object|null} FlyingObstacle object or null if not spawning
   */
  function spawnFlyingObstacle(difficulty, score, flyingObstacles) {
    // Only spawn when score >= activation threshold
    if (score < flyingObsActivationThreshold) return null;

    // Only spawn if under max on screen
    const activeCount = flyingObstacles ? flyingObstacles.length : 0;
    if (activeCount >= flyingObsMaxOnScreen) return null;

    const obstacle = flyingObstaclePool.acquire();

    // Position: just off right edge
    obstacle.x = canvasWidth + flyingObsWidth;
    obstacle.width = flyingObsWidth;
    obstacle.height = flyingObsHeight;

    // Vertical position: random between 15%–85% of playable height
    const playableHeight = canvasHeight - hudHeight;
    const minY = playableHeight * flyingObsSpawnYMinPercent;
    const maxY = playableHeight * flyingObsSpawnYMaxPercent;
    obstacle.y = minY + _random() * (maxY - minY);

    // Speed: pipeSpeed * speedMultiplier
    const speedMultiplier = difficulty.flyingObstacleSpeedMultiplier || 1.2;
    obstacle.speed = difficulty.pipeSpeed * speedMultiplier;
    obstacle.active = true;

    return obstacle;
  }

  /**
   * Update flying obstacles: move left, handle spawning via timer.
   * Freezes when paused. No spawn/move when game_over or ready.
   *
   * @param {object[]} flyingObstacles - Array of active flying obstacles
   * @param {number} dt - Delta time in seconds
   * @param {string} state - Current game state
   * @param {object} difficulty - DifficultyParams
   * @param {number} score - Current score
   */
  function updateFlyingObstacles(flyingObstacles, dt, state, difficulty, score) {
    // No movement or spawning in non-playing states
    if (state === 'paused' || state === 'game_over' || state === 'ready') return;

    // Move all obstacles left
    for (let i = 0; i < flyingObstacles.length; i++) {
      flyingObstacles[i].x -= flyingObstacles[i].speed * dt;
    }

    // Spawn timer logic (only when score >= threshold)
    if (score >= flyingObsActivationThreshold && difficulty.flyingObstacleSpawnInterval) {
      flyingObsSpawnTimer += dt * 1000; // convert to ms

      // Initialize interval if not set
      if (flyingObsCurrentInterval <= 0) {
        const interval = difficulty.flyingObstacleSpawnInterval;
        flyingObsCurrentInterval = interval.min + _random() * (interval.max - interval.min);
      }

      // Check if timer expired
      if (flyingObsSpawnTimer >= flyingObsCurrentInterval) {
        flyingObsSpawnTimer = 0;

        // Spawn new obstacle
        const newObs = spawnFlyingObstacle(difficulty, score, flyingObstacles);
        if (newObs) {
          flyingObstacles.push(newObs);
        }

        // Reset interval for next spawn
        const interval = difficulty.flyingObstacleSpawnInterval;
        flyingObsCurrentInterval = interval.min + _random() * (interval.max - interval.min);
      }
    }
  }

  /**
   * Remove flying obstacles that have moved completely off-screen left.
   * Returns them to the pool.
   *
   * @param {object[]} flyingObstacles - Array of active flying obstacles
   */
  function removeFlyingObstacleOffscreen(flyingObstacles) {
    let i = flyingObstacles.length;
    while (i--) {
      const obs = flyingObstacles[i];
      if (obs.x + obs.width < 0) {
        flyingObstacles.splice(i, 1);
        obs.active = false;
        flyingObstaclePool.release(obs);
      }
    }
  }

  /**
   * Reset the flying obstacle spawn timer (e.g., on game restart).
   */
  function resetFlyingObstacleTimer() {
    flyingObsSpawnTimer = 0;
    flyingObsCurrentInterval = 0;
  }

  return {
    update,
    spawnPipePair,
    spawnCollectible,
    removeOffscreen,
    spawnCloud,
    initClouds,
    updateClouds,
    spawnFlyingObstacle,
    updateFlyingObstacles,
    removeFlyingObstacleOffscreen,
    resetFlyingObstacleTimer,
    getPipePool() { return pipePool; },
    getCollectiblePool() { return collectiblePool; },
    getCloudPool() { return cloudPool; },
    getFlyingObstaclePool() { return flyingObstaclePool; }
  };
}
