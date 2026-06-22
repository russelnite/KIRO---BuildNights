import { describe, it, expect, beforeEach } from 'vitest';
import { createScrollingEngine } from './ScrollingEngine.js';

const DEFAULT_CONFIG = {
  canvas: {
    width: 480,
    height: 640,
    hudHeight: 40
  },
  pipes: {
    width: 60,
    gapMinPercent: 0.2,
    gapMaxPercent: 0.8
  },
  pools: {
    pipes: 8,
    collectibles: 6,
    clouds: 15
  },
  difficulty: {
    baseSpacing: 350
  },
  clouds: {
    layers: [
      { speedFactor: [0.1, 0.3], opacity: [0.1, 0.3], scale: [0.2, 0.4] },
      { speedFactor: [0.4, 0.6], opacity: [0.3, 0.5], scale: [0.5, 0.7] },
      { speedFactor: [0.7, 0.9], opacity: [0.5, 0.7], scale: [0.8, 1.0] }
    ],
    countPerLayer: [2, 5],
    baseWidth: [60, 120]
  }
};

const DEFAULT_DIFFICULTY = {
  pipeSpeed: 120,
  gapHeight: 140,
  pipeSpacing: 350
};

describe('ScrollingEngine', () => {
  let engine;
  let gameObjects;

  beforeEach(() => {
    engine = createScrollingEngine(DEFAULT_CONFIG, () => 0.5);
    gameObjects = { pipes: [], collectibles: [] };
  });

  describe('spawnPipePair()', () => {
    it('creates a pipe at the right canvas edge', () => {
      const pipe = engine.spawnPipePair(DEFAULT_DIFFICULTY);
      expect(pipe.x).toBe(480);
    });

    it('sets pipe width from config', () => {
      const pipe = engine.spawnPipePair(DEFAULT_DIFFICULTY);
      expect(pipe.width).toBe(60);
    });

    it('sets gap height from difficulty params', () => {
      const pipe = engine.spawnPipePair(DEFAULT_DIFFICULTY);
      expect(pipe.gapHeight).toBe(140);
    });

    it('initializes scored as false', () => {
      const pipe = engine.spawnPipePair(DEFAULT_DIFFICULTY);
      expect(pipe.scored).toBe(false);
    });

    it('positions gap center within playable area bounds', () => {
      const playableHeight = 640 - 40; // 600
      const minY = playableHeight * 0.2; // 120
      const maxY = playableHeight * 0.8; // 480

      // With random = 0.5, gapCenterY = 120 + 0.5 * (480 - 120) = 120 + 180 = 300
      const pipe = engine.spawnPipePair(DEFAULT_DIFFICULTY);
      expect(pipe.gapCenterY).toBe(300);
    });

    it('uses random function to determine gap center', () => {
      // Random = 0 → min Y
      const engineMin = createScrollingEngine(DEFAULT_CONFIG, () => 0);
      const pipeMin = engineMin.spawnPipePair(DEFAULT_DIFFICULTY);
      expect(pipeMin.gapCenterY).toBe(120); // 600 * 0.2

      // Random = 1 → max Y
      const engineMax = createScrollingEngine(DEFAULT_CONFIG, () => 1);
      const pipeMax = engineMax.spawnPipePair(DEFAULT_DIFFICULTY);
      expect(pipeMax.gapCenterY).toBe(480); // 600 * 0.8
    });

    it('acquires pipe from pool', () => {
      const pool = engine.getPipePool();
      const initialFree = pool.freeCount;
      engine.spawnPipePair(DEFAULT_DIFFICULTY);
      expect(pool.freeCount).toBe(initialFree - 1);
    });
  });

  describe('update() — pipe movement', () => {
    it('moves pipes left by pipeSpeed * dt', () => {
      gameObjects.pipes.push({ x: 400, width: 60, gapCenterY: 300, gapHeight: 140, scored: false });
      engine.update(gameObjects, 1 / 60, DEFAULT_DIFFICULTY, 'playing');
      expect(gameObjects.pipes[0].x).toBeCloseTo(400 - 120 / 60, 5);
    });

    it('moves all pipes left by same delta', () => {
      gameObjects.pipes.push({ x: 400, width: 60, gapCenterY: 300, gapHeight: 140, scored: false });
      gameObjects.pipes.push({ x: 200, width: 60, gapCenterY: 250, gapHeight: 140, scored: false });
      engine.update(gameObjects, 0.5, DEFAULT_DIFFICULTY, 'playing');
      expect(gameObjects.pipes[0].x).toBeCloseTo(400 - 60, 5);
      expect(gameObjects.pipes[1].x).toBeCloseTo(200 - 60, 5);
    });

    it('does not move pipes in ready state', () => {
      gameObjects.pipes.push({ x: 400, width: 60, gapCenterY: 300, gapHeight: 140, scored: false });
      engine.update(gameObjects, 1 / 60, DEFAULT_DIFFICULTY, 'ready');
      expect(gameObjects.pipes[0].x).toBe(400);
    });

    it('does not move pipes in game_over state', () => {
      gameObjects.pipes.push({ x: 400, width: 60, gapCenterY: 300, gapHeight: 140, scored: false });
      engine.update(gameObjects, 1 / 60, DEFAULT_DIFFICULTY, 'game_over');
      expect(gameObjects.pipes[0].x).toBe(400);
    });

    it('does not move pipes in paused state', () => {
      gameObjects.pipes.push({ x: 400, width: 60, gapCenterY: 300, gapHeight: 140, scored: false });
      engine.update(gameObjects, 1 / 60, DEFAULT_DIFFICULTY, 'paused');
      expect(gameObjects.pipes[0].x).toBe(400);
    });
  });

  describe('update() — pipe spawning', () => {
    it('spawns a pipe when no pipes exist', () => {
      engine.update(gameObjects, 1 / 60, DEFAULT_DIFFICULTY, 'playing');
      expect(gameObjects.pipes.length).toBeGreaterThanOrEqual(1);
    });

    it('spawns a new pipe when rightmost pipe is far enough from right edge', () => {
      // Pipe at x=0, right edge = 60. Distance from canvas right = 480 - 60 = 420 > 350 spacing
      gameObjects.pipes.push({ x: 0, width: 60, gapCenterY: 300, gapHeight: 140, scored: false });
      engine.update(gameObjects, 1 / 60, DEFAULT_DIFFICULTY, 'playing');
      expect(gameObjects.pipes.length).toBe(2);
    });

    it('does not spawn when rightmost pipe is too close to right edge', () => {
      // Pipe at x=400, right edge = 460. Distance from canvas right = 480 - 460 = 20 < 350
      gameObjects.pipes.push({ x: 400, width: 60, gapCenterY: 300, gapHeight: 140, scored: false });
      engine.update(gameObjects, 1 / 60, DEFAULT_DIFFICULTY, 'playing');
      expect(gameObjects.pipes.length).toBe(1);
    });

    it('does not spawn pipes in non-playing states', () => {
      engine.update(gameObjects, 1 / 60, DEFAULT_DIFFICULTY, 'ready');
      expect(gameObjects.pipes.length).toBe(0);

      engine.update(gameObjects, 1 / 60, DEFAULT_DIFFICULTY, 'game_over');
      expect(gameObjects.pipes.length).toBe(0);
    });
  });

  describe('removeOffscreen()', () => {
    it('removes pipes whose right edge is past x=0', () => {
      gameObjects.pipes.push({ x: -70, width: 60, gapCenterY: 300, gapHeight: 140, scored: false });
      engine.removeOffscreen(gameObjects);
      expect(gameObjects.pipes.length).toBe(0);
    });

    it('keeps pipes whose right edge is still on screen', () => {
      gameObjects.pipes.push({ x: -50, width: 60, gapCenterY: 300, gapHeight: 140, scored: false });
      engine.removeOffscreen(gameObjects);
      expect(gameObjects.pipes.length).toBe(1);
    });

    it('returns removed pipes to pool', () => {
      const pool = engine.getPipePool();
      const initialFree = pool.freeCount;
      gameObjects.pipes.push({ x: -70, width: 60, gapCenterY: 300, gapHeight: 140, scored: false });
      engine.removeOffscreen(gameObjects);
      expect(pool.freeCount).toBe(initialFree + 1);
    });

    it('removes off-screen collectibles', () => {
      gameObjects.collectibles.push({ x: -40, width: 30, height: 20, speed: 100, opacity: 0.5, collected: false });
      engine.removeOffscreen(gameObjects);
      expect(gameObjects.collectibles.length).toBe(0);
    });

    it('keeps on-screen collectibles', () => {
      gameObjects.collectibles.push({ x: 100, width: 30, height: 20, speed: 100, opacity: 0.5, collected: false });
      engine.removeOffscreen(gameObjects);
      expect(gameObjects.collectibles.length).toBe(1);
    });
  });

  describe('pool management', () => {
    it('prewarms pipe pool with configured count', () => {
      const freshEngine = createScrollingEngine(DEFAULT_CONFIG, () => 0.5);
      expect(freshEngine.getPipePool().freeCount).toBe(8);
    });

    it('prewarms collectible pool with configured count', () => {
      const freshEngine = createScrollingEngine(DEFAULT_CONFIG, () => 0.5);
      expect(freshEngine.getCollectiblePool().freeCount).toBe(6);
    });
  });

  describe('collectible movement', () => {
    it('moves collectibles left at their individual speed', () => {
      gameObjects.collectibles.push({ x: 300, width: 30, height: 20, speed: 180, opacity: 0.5, collected: false });
      engine.update(gameObjects, 0.5, DEFAULT_DIFFICULTY, 'playing');
      expect(gameObjects.collectibles[0].x).toBeCloseTo(300 - 180 * 0.5, 5);
    });

    it('does not move collectibles in non-playing states', () => {
      gameObjects.collectibles.push({ x: 300, width: 30, height: 20, speed: 180, opacity: 0.5, collected: false });
      engine.update(gameObjects, 0.5, DEFAULT_DIFFICULTY, 'paused');
      expect(gameObjects.collectibles[0].x).toBe(300);
    });
  });

  describe('spawnCloud()', () => {
    it('creates a cloud with correct layer assignment', () => {
      const cloud = engine.spawnCloud(1, DEFAULT_DIFFICULTY, false);
      expect(cloud.layer).toBe(1);
    });

    it('spawns cloud off-screen right when not initial spread', () => {
      const cloud = engine.spawnCloud(0, DEFAULT_DIFFICULTY, false);
      expect(cloud.x).toBeGreaterThanOrEqual(480);
    });

    it('uses initial spread to distribute across canvas width', () => {
      const cloud = engine.spawnCloud(0, DEFAULT_DIFFICULTY, true);
      // With random=0.5, x = 0.5 * (480 + width) - width
      // Width depends on baseWidth and scale calculations
      expect(cloud.x).toBeLessThan(480 + cloud.width);
    });

    it('sets speed within far layer range (layer 0)', () => {
      // With random=0.5: speedFactor = 0.1 + 0.5*(0.3-0.1) = 0.2
      // speed = 0.2 * 120 = 24
      const cloud = engine.spawnCloud(0, DEFAULT_DIFFICULTY, false);
      expect(cloud.speed).toBeCloseTo(0.2 * 120, 5);
    });

    it('sets speed within mid layer range (layer 1)', () => {
      // With random=0.5: speedFactor = 0.4 + 0.5*(0.6-0.4) = 0.5
      // speed = 0.5 * 120 = 60
      const cloud = engine.spawnCloud(1, DEFAULT_DIFFICULTY, false);
      expect(cloud.speed).toBeCloseTo(0.5 * 120, 5);
    });

    it('sets speed within near layer range (layer 2)', () => {
      // With random=0.5: speedFactor = 0.7 + 0.5*(0.9-0.7) = 0.8
      // speed = 0.8 * 120 = 96
      const cloud = engine.spawnCloud(2, DEFAULT_DIFFICULTY, false);
      expect(cloud.speed).toBeCloseTo(0.8 * 120, 5);
    });

    it('sets opacity within layer range', () => {
      // Layer 0, random=0.5: opacity = 0.1 + 0.5*(0.3-0.1) = 0.2
      const cloud = engine.spawnCloud(0, DEFAULT_DIFFICULTY, false);
      expect(cloud.opacity).toBeCloseTo(0.2, 5);
    });

    it('sets scale within layer range', () => {
      // Layer 0, random=0.5: scale = 0.2 + 0.5*(0.4-0.2) = 0.3
      const cloud = engine.spawnCloud(0, DEFAULT_DIFFICULTY, false);
      expect(cloud.scale).toBeCloseTo(0.3, 5);
    });

    it('computes width as baseWidth * scale', () => {
      // random=0.5: baseW = 60 + 0.5*(120-60) = 90, scale=0.3 → width=27
      const cloud = engine.spawnCloud(0, DEFAULT_DIFFICULTY, false);
      expect(cloud.width).toBeCloseTo(90 * 0.3, 5);
    });

    it('computes height as width * 0.5', () => {
      const cloud = engine.spawnCloud(0, DEFAULT_DIFFICULTY, false);
      expect(cloud.height).toBeCloseTo(cloud.width * 0.5, 5);
    });

    it('positions Y within playable area', () => {
      const cloud = engine.spawnCloud(0, DEFAULT_DIFFICULTY, false);
      const playableHeight = 640 - 40;
      expect(cloud.y).toBeGreaterThanOrEqual(0);
      expect(cloud.y).toBeLessThanOrEqual(playableHeight);
    });
  });

  describe('initClouds()', () => {
    it('returns an array of 3 layers', () => {
      const clouds = engine.initClouds(DEFAULT_DIFFICULTY);
      expect(clouds.length).toBe(3);
    });

    it('each layer has between 2 and 5 clouds', () => {
      const clouds = engine.initClouds(DEFAULT_DIFFICULTY);
      for (let i = 0; i < 3; i++) {
        expect(clouds[i].length).toBeGreaterThanOrEqual(2);
        expect(clouds[i].length).toBeLessThanOrEqual(5);
      }
    });

    it('clouds in each layer have the correct layer index', () => {
      const clouds = engine.initClouds(DEFAULT_DIFFICULTY);
      for (let layer = 0; layer < 3; layer++) {
        for (const cloud of clouds[layer]) {
          expect(cloud.layer).toBe(layer);
        }
      }
    });

    it('distributes initial clouds across full canvas (not just right edge)', () => {
      const clouds = engine.initClouds(DEFAULT_DIFFICULTY);
      // With random=0.5, all clouds should be near the middle of the canvas
      // Not all at x >= canvasWidth
      for (let layer = 0; layer < 3; layer++) {
        for (const cloud of clouds[layer]) {
          expect(cloud.x).toBeLessThan(480 + cloud.width);
        }
      }
    });
  });

  describe('updateClouds()', () => {
    it('moves clouds left at their individual speed', () => {
      const clouds = [[{ x: 200, y: 100, width: 50, height: 25, layer: 0, speed: 24, opacity: 0.2, scale: 0.3 }], [], []];
      engine.updateClouds(clouds, 1.0, DEFAULT_DIFFICULTY, 'playing');
      expect(clouds[0][0].x).toBeCloseTo(200 - 24, 5);
    });

    it('moves clouds in ready state', () => {
      const clouds = [[{ x: 200, y: 100, width: 50, height: 25, layer: 0, speed: 24, opacity: 0.2, scale: 0.3 }], [], []];
      engine.updateClouds(clouds, 1.0, DEFAULT_DIFFICULTY, 'ready');
      expect(clouds[0][0].x).toBeCloseTo(200 - 24, 5);
    });

    it('moves clouds in game_over state', () => {
      const clouds = [[{ x: 200, y: 100, width: 50, height: 25, layer: 0, speed: 24, opacity: 0.2, scale: 0.3 }], [], []];
      engine.updateClouds(clouds, 1.0, DEFAULT_DIFFICULTY, 'game_over');
      expect(clouds[0][0].x).toBeCloseTo(200 - 24, 5);
    });

    it('does NOT move clouds in paused state', () => {
      const clouds = [[{ x: 200, y: 100, width: 50, height: 25, layer: 0, speed: 24, opacity: 0.2, scale: 0.3 }], [], []];
      engine.updateClouds(clouds, 1.0, DEFAULT_DIFFICULTY, 'paused');
      expect(clouds[0][0].x).toBe(200);
    });

    it('recycles clouds that move off-screen left', () => {
      const clouds = [[{ x: -60, y: 100, width: 50, height: 25, layer: 0, speed: 24, opacity: 0.2, scale: 0.3 }], [], []];
      engine.updateClouds(clouds, 0, DEFAULT_DIFFICULTY, 'playing');
      // Cloud should be repositioned off-screen right
      expect(clouds[0][0].x).toBeGreaterThanOrEqual(480);
    });

    it('spawns new clouds if layer count falls below minimum', () => {
      // Layer with only 1 cloud — should add at least one more to reach minimum of 2
      const clouds = [[{ x: 200, y: 100, width: 50, height: 25, layer: 0, speed: 24, opacity: 0.2, scale: 0.3 }], [], []];
      engine.updateClouds(clouds, 0, DEFAULT_DIFFICULTY, 'playing');
      expect(clouds[0].length).toBeGreaterThanOrEqual(2);
    });

    it('does not remove clouds, only repositions them', () => {
      const clouds = [[
        { x: -60, y: 100, width: 50, height: 25, layer: 0, speed: 24, opacity: 0.2, scale: 0.3 },
        { x: 200, y: 150, width: 60, height: 30, layer: 0, speed: 20, opacity: 0.15, scale: 0.25 }
      ], [], []];
      engine.updateClouds(clouds, 0, DEFAULT_DIFFICULTY, 'playing');
      // Should still have at least 2 clouds (none removed)
      expect(clouds[0].length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('cloud pool management', () => {
    it('prewarms cloud pool with configured count', () => {
      const freshEngine = createScrollingEngine(DEFAULT_CONFIG, () => 0.5);
      expect(freshEngine.getCloudPool().freeCount).toBe(15);
    });
  });
});
