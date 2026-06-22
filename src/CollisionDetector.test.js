import { describe, it, expect } from 'vitest';
import { createCollisionDetector, circleRectCollision, _clamp, DEFAULT_CONFIG } from './CollisionDetector.js';

describe('_clamp', () => {
  it('returns value when within range', () => {
    expect(_clamp(5, 0, 10)).toBe(5);
  });

  it('returns min when value is below range', () => {
    expect(_clamp(-3, 0, 10)).toBe(0);
  });

  it('returns max when value is above range', () => {
    expect(_clamp(15, 0, 10)).toBe(10);
  });
});

describe('circleRectCollision', () => {
  it('returns true when circle center is inside rectangle', () => {
    // Circle at (50, 50) r=10, rect at (40, 40) w=20, h=20
    expect(circleRectCollision(50, 50, 10, 40, 40, 20, 20)).toBe(true);
  });

  it('returns true when circle overlaps rectangle edge', () => {
    // Circle at (30, 50) r=12, rect at (40, 40) w=20, h=20
    // Closest point on rect: (40, 50), distance = 10, 10 <= 12 → true
    expect(circleRectCollision(30, 50, 12, 40, 40, 20, 20)).toBe(true);
  });

  it('returns false when circle is far from rectangle', () => {
    // Circle at (10, 50) r=5, rect at (40, 40) w=20, h=20
    // Closest point on rect: (40, 50), distance = 30, 30 > 5 → false
    expect(circleRectCollision(10, 50, 5, 40, 40, 20, 20)).toBe(false);
  });

  it('returns true when circle just touches rectangle corner', () => {
    // Circle at (0, 0) r=5, rect at (3, 4) w=10, h=10
    // Closest point: (3, 4), distance = sqrt(9+16)=5, exactly at radius
    expect(circleRectCollision(0, 0, 5, 3, 4, 10, 10)).toBe(true);
  });

  it('returns false when circle barely misses rectangle corner', () => {
    // Circle at (0, 0) r=4.9, rect at (3, 4) w=10, h=10
    // distance = 5, 5 > 4.9 → false
    expect(circleRectCollision(0, 0, 4.9, 3, 4, 10, 10)).toBe(false);
  });
});

describe('CollisionDetector.check', () => {
  const detector = createCollisionDetector(DEFAULT_CONFIG);

  function makeGhost(x, y) {
    return {
      x, y,
      width: 32,
      height: 32,
      hitboxRadius: 12
    };
  }

  function makePipe(x, gapCenterY, gapHeight) {
    return {
      x,
      width: 60,
      gapCenterY,
      gapHeight,
      scored: false
    };
  }

  it('returns no collision when ghost is safely in the gap', () => {
    const ghost = makeGhost(120, 300); // center at (136, 316)
    const pipe = makePipe(130, 316, 140); // gap from 246 to 386
    const result = detector.check(ghost, [pipe]);
    expect(result.collided).toBe(false);
    expect(result.type).toBeNull();
  });

  it('detects floor collision when ghost touches HUD bar', () => {
    // Canvas height 640, HUD height 40, floor at y=600
    // Ghost center Y must be >= 600 - radius(12) → centerY >= 588
    // Ghost at y=580 → centerY = 580 + 16 = 596, 596 + 12 = 608 >= 600
    const ghost = makeGhost(120, 580);
    const result = detector.check(ghost, []);
    expect(result.collided).toBe(true);
    expect(result.type).toBe('floor');
  });

  it('detects ceiling collision when ghost touches top', () => {
    // Ghost centerY - radius <= 0 → centerY <= 12 → ghost.y + 16 <= 12 → ghost.y <= -4
    const ghost = makeGhost(120, -5);
    const result = detector.check(ghost, []);
    expect(result.collided).toBe(true);
    expect(result.type).toBe('ceiling');
  });

  it('no floor collision when ghost is above HUD', () => {
    // ghost.y = 560 → centerY = 576, 576 + 12 = 588 < 600
    const ghost = makeGhost(120, 560);
    const result = detector.check(ghost, []);
    expect(result.collided).toBe(false);
    expect(result.type).toBeNull();
  });

  it('no ceiling collision when ghost is below top', () => {
    // ghost.y = 10 → centerY = 26, 26 - 12 = 14 > 0
    const ghost = makeGhost(120, 10);
    const result = detector.check(ghost, []);
    expect(result.collided).toBe(false);
    expect(result.type).toBeNull();
  });

  it('detects pipe collision when ghost hits top pipe', () => {
    // Pipe gap center at 200, gap height 140 → top pipe bottom at 130
    // Ghost at y=100 → centerY = 116. Top pipe rect: (130, 0, 60, 130)
    // Ghost center at (136+16=didn't adjust), let's be precise:
    // ghost x=120 → cx=136, ghost y=100 → cy=116, r=12
    // Pipe at x=130, topH=130. Circle to rect (130, 0, 60, 130):
    // closestX = clamp(136, 130, 190) = 136
    // closestY = clamp(116, 0, 130) = 116
    // dx=0, dy=0 → inside rect → collision
    const ghost = makeGhost(120, 100);
    const pipe = makePipe(130, 200, 140); // topH = 200-70=130
    const result = detector.check(ghost, [pipe]);
    expect(result.collided).toBe(true);
    expect(result.type).toBe('pipe');
  });

  it('detects pipe collision when ghost hits bottom pipe', () => {
    // Pipe gap center at 200, gap height 140 → bottom pipe top at 270
    // Ghost at y=280 → cy=296, r=12
    // Bottom pipe rect: (130, 270, 60, 640-270=370)
    // closestX = clamp(136, 130, 190) = 136
    // closestY = clamp(296, 270, 640) = 296
    // distance = 0 → inside → collision
    const ghost = makeGhost(120, 280);
    const pipe = makePipe(130, 200, 140);
    const result = detector.check(ghost, [pipe]);
    expect(result.collided).toBe(true);
    expect(result.type).toBe('pipe');
  });

  it('skips pipes that are far ahead (broad-phase)', () => {
    // Ghost cx=136, r=12. Pipe at x=400: 400 > 136+12+60=208 → skip
    const ghost = makeGhost(120, 300);
    const pipe = makePipe(400, 316, 140);
    const result = detector.check(ghost, [pipe]);
    expect(result.collided).toBe(false);
  });

  it('skips pipes that are far behind (broad-phase)', () => {
    // Ghost cx=136, r=12. Pipe at x=-100, width=60: -100+60=-40 < 136-12=124 → skip
    const ghost = makeGhost(120, 300);
    const pipe = makePipe(-100, 316, 140);
    const result = detector.check(ghost, [pipe]);
    expect(result.collided).toBe(false);
  });

  it('accepts custom hudTop and canvasTop parameters', () => {
    const ghost = makeGhost(120, 480);
    // Custom floor at 500: cy=496, 496+12=508 >= 500 → floor collision
    const result = detector.check(ghost, [], 500, 0);
    expect(result.collided).toBe(true);
    expect(result.type).toBe('floor');
  });

  it('returns collision result with correct shape', () => {
    const ghost = makeGhost(120, 300);
    const result = detector.check(ghost, []);
    expect(result).toHaveProperty('collided');
    expect(result).toHaveProperty('type');
  });
});

describe('CollisionDetector.checkCollectibles', () => {
  const detector = createCollisionDetector(DEFAULT_CONFIG);

  function makeGhost(x, y) {
    return {
      x, y,
      width: 32,
      height: 32,
      hitboxRadius: 12
    };
  }

  function makeCollectible(x, y) {
    return {
      x, y,
      width: 30,
      height: 20,
      collected: false
    };
  }

  it('returns collected collectibles when ghost overlaps them', () => {
    const ghost = makeGhost(120, 300); // cx=136, cy=316, r=12
    // Collectible at (130, 310, 30, 20) — ghost center is inside rect
    const collectible = makeCollectible(130, 310);
    const result = detector.checkCollectibles(ghost, [collectible]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(collectible);
    expect(collectible.collected).toBe(true);
  });

  it('skips already-collected collectibles', () => {
    const ghost = makeGhost(120, 300);
    const collectible = makeCollectible(130, 310);
    collectible.collected = true;
    const result = detector.checkCollectibles(ghost, [collectible]);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when no collectibles are hit', () => {
    const ghost = makeGhost(120, 300);
    const collectible = makeCollectible(400, 300); // far away
    const result = detector.checkCollectibles(ghost, [collectible]);
    expect(result).toHaveLength(0);
    expect(collectible.collected).toBe(false);
  });

  it('can collect multiple collectibles in one check', () => {
    const ghost = makeGhost(120, 300); // cx=136, cy=316
    const c1 = makeCollectible(130, 310); // overlaps ghost
    const c2 = makeCollectible(125, 305); // overlaps ghost
    const c3 = makeCollectible(400, 300); // far away
    const result = detector.checkCollectibles(ghost, [c1, c2, c3]);
    expect(result).toHaveLength(2);
    expect(c1.collected).toBe(true);
    expect(c2.collected).toBe(true);
    expect(c3.collected).toBe(false);
  });
});
