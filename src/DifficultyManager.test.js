import { describe, it, expect } from 'vitest';
import { evaluate, DEFAULT_CONFIG, DEFAULT_FLYING_OBSTACLE_CONFIG } from './DifficultyManager.js';

describe('DifficultyManager.evaluate', () => {
  it('returns base values at score 0', () => {
    const result = evaluate(0);
    expect(result.pipeSpeed).toBe(120);
    expect(result.gapHeight).toBe(140);
    expect(result.pipeSpacing).toBe(350);
  });

  it('computes tier correctly (tier = floor(score / 10))', () => {
    // Score 9 → tier 0 (same as base)
    const r9 = evaluate(9);
    expect(r9.pipeSpeed).toBe(120);
    expect(r9.gapHeight).toBe(140);
    expect(r9.pipeSpacing).toBe(350);

    // Score 10 → tier 1
    const r10 = evaluate(10);
    expect(r10.pipeSpeed).toBe(135);
    expect(r10.gapHeight).toBe(135);
    expect(r10.pipeSpacing).toBe(335);
  });

  it('scales pipe speed: baseSpeed + tier * speedIncrement', () => {
    // Score 20 → tier 2 → 120 + 2*15 = 150
    expect(evaluate(20).pipeSpeed).toBe(150);
    // Score 50 → tier 5 → 120 + 5*15 = 195
    expect(evaluate(50).pipeSpeed).toBe(195);
  });

  it('caps pipe speed at maxSpeed (280)', () => {
    // tier 11 → 120 + 11*15 = 285, capped at 280
    expect(evaluate(110).pipeSpeed).toBe(280);
    // Very high score stays capped
    expect(evaluate(1000).pipeSpeed).toBe(280);
  });

  it('scales gap height: baseGap - tier * gapDecrement', () => {
    // Score 20 → tier 2 → 140 - 2*5 = 130
    expect(evaluate(20).gapHeight).toBe(130);
  });

  it('caps gap height at minGap (90)', () => {
    // tier 10 → 140 - 10*5 = 90 (exactly min)
    expect(evaluate(100).gapHeight).toBe(90);
    // tier 11 → 140 - 11*5 = 85, capped at 90
    expect(evaluate(110).gapHeight).toBe(90);
  });

  it('scales pipe spacing: baseSpacing - tier * spacingDecrement', () => {
    // Score 20 → tier 2 → 350 - 2*15 = 320
    expect(evaluate(20).pipeSpacing).toBe(320);
  });

  it('caps pipe spacing at minSpacing (200)', () => {
    // tier 10 → 350 - 10*15 = 200 (exactly min)
    expect(evaluate(100).pipeSpacing).toBe(200);
    // tier 11 → 350 - 11*15 = 185, capped at 200
    expect(evaluate(110).pipeSpacing).toBe(200);
  });

  it('returns a DifficultyParams object with all expected properties', () => {
    const result = evaluate(25);
    expect(result).toHaveProperty('pipeSpeed');
    expect(result).toHaveProperty('gapHeight');
    expect(result).toHaveProperty('pipeSpacing');
    expect(result).toHaveProperty('flyingObstacleSpeedMultiplier');
    expect(result).toHaveProperty('flyingObstacleSpawnInterval');
  });

  it('reads all values from provided config (no magic numbers)', () => {
    const customConfig = {
      baseSpeed: 100,
      speedIncrement: 10,
      maxSpeed: 200,
      baseGap: 120,
      gapDecrement: 10,
      minGap: 80,
      baseSpacing: 300,
      spacingDecrement: 20,
      minSpacing: 150,
      scoreTierSize: 5
    };

    // score 10, tierSize 5 → tier 2
    const result = evaluate(10, customConfig);
    expect(result.pipeSpeed).toBe(120);   // 100 + 2*10
    expect(result.gapHeight).toBe(100);   // 120 - 2*10
    expect(result.pipeSpacing).toBe(260); // 300 - 2*20
  });
});

describe('DifficultyManager.evaluate - Flying Obstacle Parameters', () => {
  it('returns null for flying obstacle params when score < 30', () => {
    const result = evaluate(0);
    expect(result.flyingObstacleSpeedMultiplier).toBeNull();
    expect(result.flyingObstacleSpawnInterval).toBeNull();
  });

  it('returns null for flying obstacle params at score 29', () => {
    const result = evaluate(29);
    expect(result.flyingObstacleSpeedMultiplier).toBeNull();
    expect(result.flyingObstacleSpawnInterval).toBeNull();
  });

  it('returns flying obstacle params at score 30 (activation threshold)', () => {
    const result = evaluate(30);
    expect(result.flyingObstacleSpeedMultiplier).toBe(1.2);
    expect(result.flyingObstacleSpawnInterval).toEqual({ min: 3000, max: 5000 });
  });

  it('computes speed multiplier correctly at score 40 (obstacleTier 1)', () => {
    const result = evaluate(40);
    // obstacleScore = 40 - 30 = 10, obstacleTier = floor(10/10) = 1
    // speedMultiplier = 1.2 + 1 * 0.2 = 1.4
    expect(result.flyingObstacleSpeedMultiplier).toBe(1.4);
  });

  it('computes speed multiplier correctly at score 50 (obstacleTier 2)', () => {
    const result = evaluate(50);
    // obstacleScore = 50 - 30 = 20, obstacleTier = floor(20/10) = 2
    // speedMultiplier = 1.2 + 2 * 0.2 = 1.6
    expect(result.flyingObstacleSpeedMultiplier).toBe(1.6);
  });

  it('caps speed multiplier at 2.0 (max difficulty)', () => {
    const result = evaluate(80);
    // obstacleScore = 80 - 30 = 50, obstacleTier = floor(50/10) = 5
    // speedMultiplier = 1.2 + 5 * 0.2 = 2.2, capped at 2.0
    expect(result.flyingObstacleSpeedMultiplier).toBe(2.0);
  });

  it('caps speed multiplier at very high scores', () => {
    const result = evaluate(200);
    expect(result.flyingObstacleSpeedMultiplier).toBe(2.0);
  });

  it('computes spawn interval correctly at score 40 (obstacleTier 1)', () => {
    const result = evaluate(40);
    // obstacleTier = 1
    // intervalMin = 3000 - 1 * 400 = 2600
    // intervalMax = 5000 - 1 * 400 = 4600
    expect(result.flyingObstacleSpawnInterval).toEqual({ min: 2600, max: 4600 });
  });

  it('computes spawn interval correctly at score 50 (obstacleTier 2)', () => {
    const result = evaluate(50);
    // obstacleTier = 2
    // intervalMin = 3000 - 2 * 400 = 2200
    // intervalMax = 5000 - 2 * 400 = 4200
    expect(result.flyingObstacleSpawnInterval).toEqual({ min: 2200, max: 4200 });
  });

  it('caps spawn interval at minimum values at max difficulty', () => {
    const result = evaluate(80);
    // obstacleTier = 5
    // intervalMin = 3000 - 5 * 400 = 1000, capped at 1500
    // intervalMax = 5000 - 5 * 400 = 3000, but need to check max cap
    // intervalMax = max(3000, 2500) = 3000 (still above min max)
    expect(result.flyingObstacleSpawnInterval.min).toBe(1500);
    expect(result.flyingObstacleSpawnInterval.max).toBe(3000);
  });

  it('caps both spawn interval values at very high scores', () => {
    const result = evaluate(200);
    // obstacleTier = 17
    // intervalMin = 3000 - 17 * 400 = -3800, capped at 1500
    // intervalMax = 5000 - 17 * 400 = -1800, capped at 2500
    expect(result.flyingObstacleSpawnInterval).toEqual({ min: 1500, max: 2500 });
  });

  it('spawn interval min is always <= max', () => {
    for (let score = 30; score <= 200; score += 5) {
      const result = evaluate(score);
      expect(result.flyingObstacleSpawnInterval.min).toBeLessThanOrEqual(
        result.flyingObstacleSpawnInterval.max
      );
    }
  });

  it('uses custom flying obstacle config when provided', () => {
    const customFlyingConfig = {
      activationThreshold: 20,
      baseSpeedMultiplier: 1.0,
      maxSpeedMultiplier: 1.5,
      speedMultiplierIncrement: 0.1,
      baseSpawnIntervalMin: 2000,
      baseSpawnIntervalMax: 4000,
      minSpawnIntervalMin: 1000,
      minSpawnIntervalMax: 2000,
      spawnIntervalDecrement: 500
    };

    // score 20, threshold 20 → obstacleScore = 0, obstacleTier = 0
    const result = evaluate(20, DEFAULT_CONFIG, customFlyingConfig);
    expect(result.flyingObstacleSpeedMultiplier).toBe(1.0);
    expect(result.flyingObstacleSpawnInterval).toEqual({ min: 2000, max: 4000 });

    // score 30, threshold 20 → obstacleScore = 10, obstacleTier = 1
    const result2 = evaluate(30, DEFAULT_CONFIG, customFlyingConfig);
    expect(result2.flyingObstacleSpeedMultiplier).toBe(1.1); // 1.0 + 1*0.1
    expect(result2.flyingObstacleSpawnInterval).toEqual({ min: 1500, max: 3500 }); // 2000-500, 4000-500
  });

  it('returns null for flying obstacle params with custom threshold when score below', () => {
    const customFlyingConfig = {
      ...DEFAULT_FLYING_OBSTACLE_CONFIG,
      activationThreshold: 50
    };
    const result = evaluate(49, DEFAULT_CONFIG, customFlyingConfig);
    expect(result.flyingObstacleSpeedMultiplier).toBeNull();
    expect(result.flyingObstacleSpawnInterval).toBeNull();
  });
});
