import { describe, it, expect } from 'vitest';
import { evaluate, DEFAULT_CONFIG } from './DifficultyManager.js';

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

  it('returns a DifficultyParams object with all three properties', () => {
    const result = evaluate(25);
    expect(result).toHaveProperty('pipeSpeed');
    expect(result).toHaveProperty('gapHeight');
    expect(result).toHaveProperty('pipeSpacing');
    expect(Object.keys(result)).toHaveLength(3);
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
