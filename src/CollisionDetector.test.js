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
      width: 44,
      height: 44,
      hitboxRadius: 16
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
    const ghost = makeGhost(150, 200); // center at (172, 222)
    const pipe = makePipe(160, 222, 140); // gap from 152 to 292
    const result = detector.check(ghost, [pipe]);
    expect(result.collided).toBe(false);
    expect(result.type).toBeNull();
  });

  it('detects floor collision when ghost touches HUD bar', () => {
    // Canvas height 500, HUD height 40, floor at y=460
    // Ghost center Y must be >= 460 - radius(16) → centerY >= 444
    // Ghost at y=430 → centerY = 430 + 22 = 452, 452 + 16 = 468 >= 460
    const ghost = makeGhost(150, 430);
    const result = detector.check(ghost, []);
    expect(result.collided).toBe(true);
    expect(result.type).toBe('floor');
  });

  it('detects ceiling collision when ghost touches top', () => {
    // Ghost centerY - radius <= 0 → centerY <= 16 → ghost.y + 22 <= 16 → ghost.y <= -6
    const ghost = makeGhost(150, -7);
    const result = detector.check(ghost, []);
    expect(result.collided).toBe(true);
    expect(result.type).toBe('ceiling');
  });

  it('no floor collision when ghost is above HUD', () => {
    // ghost.y = 400 → centerY = 422, 422 + 16 = 438 < 460
    const ghost = makeGhost(150, 400);
    const result = detector.check(ghost, []);
    expect(result.collided).toBe(false);
    expect(result.type).toBeNull();
  });

  it('no ceiling collision when ghost is below top', () => {
    // ghost.y = 10 → centerY = 32, 32 - 16 = 16 > 0
    const ghost = makeGhost(150, 10);
    const result = detector.check(ghost, []);
    expect(result.collided).toBe(false);
    expect(result.type).toBeNull();
  });

  it('detects pipe collision when ghost hits top pipe', () => {
    // Pipe gap center at 200, gap height 140 → top pipe bottom at 130
    // Ghost at y=80 → centerY = 102. Top pipe rect: (160, 0, 60, 130)
    // ghost x=150 → cx=172, ghost y=80 → cy=102, r=16
    // Pipe at x=160, topH=130. Circle to rect (160, 0, 60, 130):
    // closestX = clamp(172, 160, 220) = 172
    // closestY = clamp(102, 0, 130) = 102
    // dx=0, dy=0 → inside rect → collision
    const ghost = makeGhost(150, 80);
    const pipe = makePipe(160, 200, 140); // topH = 200-70=130
    const result = detector.check(ghost, [pipe]);
    expect(result.collided).toBe(true);
    expect(result.type).toBe('pipe');
  });

  it('detects pipe collision when ghost hits bottom pipe', () => {
    // Pipe gap center at 200, gap height 140 → bottom pipe top at 270
    // Ghost at y=260 → cy=282, r=16
    // Bottom pipe rect: (160, 270, 60, 500-270=230)
    // closestX = clamp(172, 160, 220) = 172
    // closestY = clamp(282, 270, 500) = 282
    // distance = 0 → inside → collision
    const ghost = makeGhost(150, 260);
    const pipe = makePipe(160, 200, 140);
    const result = detector.check(ghost, [pipe]);
    expect(result.collided).toBe(true);
    expect(result.type).toBe('pipe');
  });

  it('skips pipes that are far ahead (broad-phase)', () => {
    // Ghost cx=172, r=16. Pipe at x=400: 400 > 172+16+60=248 → skip
    const ghost = makeGhost(150, 200);
    const pipe = makePipe(400, 222, 140);
    const result = detector.check(ghost, [pipe]);
    expect(result.collided).toBe(false);
  });

  it('skips pipes that are far behind (broad-phase)', () => {
    // Ghost cx=172, r=16. Pipe at x=-100, width=60: -100+60=-40 < 172-16=156 → skip
    const ghost = makeGhost(150, 200);
    const pipe = makePipe(-100, 222, 140);
    const result = detector.check(ghost, [pipe]);
    expect(result.collided).toBe(false);
  });

  it('accepts custom hudTop and canvasTop parameters', () => {
    const ghost = makeGhost(150, 380);
    // Custom floor at 400: cy=402, 402+16=418 >= 400 → floor collision
    const result = detector.check(ghost, [], 400, 0);
    expect(result.collided).toBe(true);
    expect(result.type).toBe('floor');
  });

  it('returns collision result with correct shape', () => {
    const ghost = makeGhost(150, 200);
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
      width: 44,
      height: 44,
      hitboxRadius: 16
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
    const ghost = makeGhost(150, 200); // cx=172, cy=222, r=16
    // Collectible at (165, 215, 30, 20) — ghost center is inside rect
    const collectible = makeCollectible(165, 215);
    const result = detector.checkCollectibles(ghost, [collectible]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(collectible);
    expect(collectible.collected).toBe(true);
  });

  it('skips already-collected collectibles', () => {
    const ghost = makeGhost(150, 200);
    const collectible = makeCollectible(165, 215);
    collectible.collected = true;
    const result = detector.checkCollectibles(ghost, [collectible]);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when no collectibles are hit', () => {
    const ghost = makeGhost(150, 200);
    const collectible = makeCollectible(400, 200); // far away
    const result = detector.checkCollectibles(ghost, [collectible]);
    expect(result).toHaveLength(0);
    expect(collectible.collected).toBe(false);
  });

  it('can collect multiple collectibles in one check', () => {
    const ghost = makeGhost(150, 200); // cx=172, cy=222
    const c1 = makeCollectible(160, 210); // overlaps ghost
    const c2 = makeCollectible(155, 205); // overlaps ghost
    const c3 = makeCollectible(400, 200); // far away
    const result = detector.checkCollectibles(ghost, [c1, c2, c3]);
    expect(result).toHaveLength(2);
    expect(c1.collected).toBe(true);
    expect(c2.collected).toBe(true);
    expect(c3.collected).toBe(false);
  });
});


describe('CollisionDetector.checkFlyingObstacles', () => {
  const detector = createCollisionDetector(DEFAULT_CONFIG);

  function makeGhost(x, y) {
    return {
      x, y,
      width: 44,
      height: 44,
      hitboxRadius: 16
    };
  }

  function makeObstacle(x, y, width, height, active = true) {
    return { x, y, width, height, active };
  }

  it('returns collided=false when no flying obstacles exist', () => {
    const ghost = makeGhost(150, 200);
    const result = detector.checkFlyingObstacles(ghost, []);
    expect(result.collided).toBe(false);
  });

  it('returns collided=true when ghost overlaps an active obstacle', () => {
    // Ghost cx=172, cy=222, r=16
    const ghost = makeGhost(150, 200);
    // Obstacle that overlaps the ghost circle
    const obs = makeObstacle(160, 210, 40, 30, true);
    const result = detector.checkFlyingObstacles(ghost, [obs]);
    expect(result.collided).toBe(true);
  });

  it('returns collided=false when ghost does not overlap any obstacle', () => {
    // Ghost cx=172, cy=222, r=16
    const ghost = makeGhost(150, 200);
    // Obstacle far away from ghost
    const obs = makeObstacle(400, 100, 40, 30, true);
    const result = detector.checkFlyingObstacles(ghost, [obs]);
    expect(result.collided).toBe(false);
  });

  it('skips inactive obstacles', () => {
    // Ghost cx=172, cy=222, r=16
    const ghost = makeGhost(150, 200);
    // Obstacle overlaps ghost but is inactive
    const obs = makeObstacle(160, 210, 40, 30, false);
    const result = detector.checkFlyingObstacles(ghost, [obs]);
    expect(result.collided).toBe(false);
  });

  it('detects collision with any one of multiple obstacles', () => {
    const ghost = makeGhost(150, 200); // cx=172, cy=222, r=16
    const obs1 = makeObstacle(500, 100, 40, 30, true); // far away
    const obs2 = makeObstacle(160, 210, 40, 30, true); // overlaps
    const result = detector.checkFlyingObstacles(ghost, [obs1, obs2]);
    expect(result.collided).toBe(true);
  });

  it('returns collided=false when all obstacles are inactive', () => {
    const ghost = makeGhost(150, 200);
    const obs1 = makeObstacle(160, 210, 40, 30, false);
    const obs2 = makeObstacle(155, 205, 40, 30, false);
    const result = detector.checkFlyingObstacles(ghost, [obs1, obs2]);
    expect(result.collided).toBe(false);
  });

  it('returns collided=true when ghost circle just touches obstacle edge', () => {
    // Ghost cx=172, cy=222, r=16
    // Place obstacle so closest point is exactly at distance = radius
    // Obstacle at x=188, y=200, width=40, height=40
    // Closest point to (172, 222): x=clamp(172,188,228)=188, y=clamp(222,200,240)=222
    // dx=172-188=-16, dy=0. dist²=256 <= 16²=256 → true (touching)
    const ghost = makeGhost(150, 200);
    const obs = makeObstacle(188, 200, 40, 40, true);
    const result = detector.checkFlyingObstacles(ghost, [obs]);
    expect(result.collided).toBe(true);
  });

  it('returns collided=false when ghost circle barely misses obstacle', () => {
    // Ghost cx=172, cy=222, r=16
    // Obstacle at x=189, y=200, width=40, height=40
    // Closest point: x=clamp(172,189,229)=189, y=clamp(222,200,240)=222
    // dx=172-189=-17, dy=0. dist²=289 > 256 → false
    const ghost = makeGhost(150, 200);
    const obs = makeObstacle(189, 200, 40, 40, true);
    const result = detector.checkFlyingObstacles(ghost, [obs]);
    expect(result.collided).toBe(false);
  });
});
