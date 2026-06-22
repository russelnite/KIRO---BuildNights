import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { circleRectCollision, _clamp, createCollisionDetector, DEFAULT_CONFIG } from '../src/CollisionDetector.js';

const CANVAS_HEIGHT = DEFAULT_CONFIG.canvas.height;   // 500
const HUD_HEIGHT = DEFAULT_CONFIG.canvas.hudHeight;   // 40
const FLOOR_Y = CANVAS_HEIGHT - HUD_HEIGHT;           // 460

/**
 * Property 11: Circle-vs-Rectangle collision detection correctness
 *
 * For any ghost circle (center cx, cy and radius r) and pipe rectangle
 * (rx, ry, rw, rh), the collision detector SHALL return collided=true if
 * and only if the distance from the circle center to the nearest point on
 * the rectangle is less than or equal to the radius. Specifically:
 * `(clamp(cx, rx, rx+rw) - cx)² + (clamp(cy, ry, ry+rh) - cy)² <= r²`.
 *
 * For any ghost circle where `cy - r <= 0` (ceiling) or
 * `cy + r >= canvasHeight - hudHeight` (floor), the collision detector
 * SHALL return collided=true.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3**
 */
describe('Property 11: Circle-vs-Rectangle collision detection correctness', () => {
  // --- Sub-property: Circle overlapping rect is always detected ---
  it('circle overlapping rect is always detected', () => {
    // Generate a rect, then place the circle center INSIDE the rect (guaranteed overlap)
    const overlappingArb = fc.record({
      rx: fc.float({ min: 0, max: 400, noNaN: true, noDefaultInfinity: true }),
      ry: fc.float({ min: 0, max: 500, noNaN: true, noDefaultInfinity: true }),
      rw: fc.float({ min: 10, max: 100, noNaN: true, noDefaultInfinity: true }),
      rh: fc.float({ min: 10, max: 200, noNaN: true, noDefaultInfinity: true }),
      r: fc.float({ min: 1, max: 20, noNaN: true, noDefaultInfinity: true })
    }).chain(({ rx, ry, rw, rh, r }) => {
      // Circle center inside the rect → distance to nearest point is 0 → always overlaps
      return fc.record({
        cx: fc.float({ min: Math.fround(rx), max: Math.fround(rx + rw), noNaN: true, noDefaultInfinity: true }),
        cy: fc.float({ min: Math.fround(ry), max: Math.fround(ry + rh), noNaN: true, noDefaultInfinity: true })
      }).map(({ cx, cy }) => ({ cx, cy, r, rx, ry, rw, rh }));
    });

    fc.assert(fc.property(overlappingArb, ({ cx, cy, r, rx, ry, rw, rh }) => {
      const result = circleRectCollision(cx, cy, r, rx, ry, rw, rh);
      expect(result).toBe(true);
    }));
  });

  // --- Sub-property: Circle not overlapping rect is never detected ---
  it('circle not overlapping rect is never detected', () => {
    // Generate a rect and radius, then place circle center far enough away
    const nonOverlappingArb = fc.record({
      rx: fc.float({ min: 0, max: 300, noNaN: true, noDefaultInfinity: true }),
      ry: fc.float({ min: 0, max: 400, noNaN: true, noDefaultInfinity: true }),
      rw: fc.float({ min: 10, max: 100, noNaN: true, noDefaultInfinity: true }),
      rh: fc.float({ min: 10, max: 200, noNaN: true, noDefaultInfinity: true }),
      r: fc.float({ min: 1, max: 20, noNaN: true, noDefaultInfinity: true }),
      // Extra distance beyond the radius to guarantee no overlap
      extraDist: fc.float({ min: 1, max: 50, noNaN: true, noDefaultInfinity: true }),
      // Angle to determine direction the circle is placed away from rect
      angle: fc.float({ min: 0, max: Math.fround(Math.PI * 2), noNaN: true, noDefaultInfinity: true })
    }).map(({ rx, ry, rw, rh, r, extraDist, angle }) => {
      // Place circle center at a corner of the rect offset by r + extraDist in some direction
      const cornerX = rx + rw / 2;
      const cornerY = ry + rh / 2;
      // Move from center of rect outward far enough to guarantee no overlap
      const halfDiag = Math.sqrt((rw / 2) ** 2 + (rh / 2) ** 2);
      const dist = halfDiag + r + extraDist;
      const cx = cornerX + Math.cos(angle) * dist;
      const cy = cornerY + Math.sin(angle) * dist;
      return { cx, cy, r, rx, ry, rw, rh };
    }).filter(({ cx, cy, r, rx, ry, rw, rh }) => {
      // Verify: compute actual distance² to confirm no overlap
      const closestX = _clamp(cx, rx, rx + rw);
      const closestY = _clamp(cy, ry, ry + rh);
      const dx = cx - closestX;
      const dy = cy - closestY;
      return (dx * dx + dy * dy) > (r * r);
    });

    fc.assert(fc.property(nonOverlappingArb, ({ cx, cy, r, rx, ry, rw, rh }) => {
      const result = circleRectCollision(cx, cy, r, rx, ry, rw, rh);
      expect(result).toBe(false);
    }));
  });

  // --- Sub-property: Floor boundary violation always detected ---
  it('floor boundary violation always detected (cy + r >= 460)', () => {
    const floorViolationArb = fc.record({
      r: fc.float({ min: 1, max: 20, noNaN: true, noDefaultInfinity: true }),
      // cy such that cy + r >= FLOOR_Y (600)
      cyOffset: fc.float({ min: 0, max: 50, noNaN: true, noDefaultInfinity: true })
    }).map(({ r, cyOffset }) => {
      // cy = FLOOR_Y - r + cyOffset ensures cy + r >= FLOOR_Y when cyOffset >= 0
      const cy = FLOOR_Y - r + cyOffset;
      return { cy, r };
    }).filter(({ cy, r }) => cy + r >= FLOOR_Y);

    fc.assert(fc.property(floorViolationArb, ({ cy, r }) => {
      const ghost = {
        x: 120,
        y: cy - DEFAULT_CONFIG.ghost.height / 2,
        width: DEFAULT_CONFIG.ghost.width,
        height: DEFAULT_CONFIG.ghost.height,
        hitboxRadius: r
      };
      const detector = createCollisionDetector(DEFAULT_CONFIG);
      const result = detector.check(ghost, []);
      expect(result.collided).toBe(true);
      expect(result.type).toBe('floor');
    }));
  });

  // --- Sub-property: Ceiling boundary violation always detected ---
  it('ceiling boundary violation always detected (cy - r <= 0)', () => {
    const ceilingViolationArb = fc.record({
      r: fc.float({ min: 1, max: 20, noNaN: true, noDefaultInfinity: true }),
      // cy such that cy - r <= 0
      cyOffset: fc.float({ min: 0, max: 50, noNaN: true, noDefaultInfinity: true })
    }).map(({ r, cyOffset }) => {
      // cy = r - cyOffset ensures cy - r <= 0 when cyOffset >= 0
      const cy = r - cyOffset;
      return { cy, r };
    }).filter(({ cy, r }) => cy - r <= 0);

    fc.assert(fc.property(ceilingViolationArb, ({ cy, r }) => {
      const ghost = {
        x: 120,
        y: cy - DEFAULT_CONFIG.ghost.height / 2,
        width: DEFAULT_CONFIG.ghost.width,
        height: DEFAULT_CONFIG.ghost.height,
        hitboxRadius: r
      };
      const detector = createCollisionDetector(DEFAULT_CONFIG);
      const result = detector.check(ghost, []);
      expect(result.collided).toBe(true);
      expect(result.type).toBe('ceiling');
    }));
  });

  // --- Sub-property: Ghost safely in bounds not flagged ---
  it('ghost safely in bounds with no pipes is not flagged as colliding', () => {
    const safeGhostArb = fc.record({
      r: fc.float({ min: 1, max: 20, noNaN: true, noDefaultInfinity: true }),
      // cy must satisfy: cy - r > 0 AND cy + r < FLOOR_Y
      // So cy in (r, FLOOR_Y - r), which requires r < FLOOR_Y / 2 = 300
      cyNorm: fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true, noDefaultInfinity: true })
    }).map(({ r, cyNorm }) => {
      // Map cyNorm (0.01..0.99) to the safe range (r+epsilon, FLOOR_Y - r - epsilon)
      const minCy = r + 1;
      const maxCy = FLOOR_Y - r - 1;
      const cy = minCy + cyNorm * (maxCy - minCy);
      return { cy, r };
    }).filter(({ cy, r }) => cy - r > 0 && cy + r < FLOOR_Y);

    fc.assert(fc.property(safeGhostArb, ({ cy, r }) => {
      const ghost = {
        x: 120,
        y: cy - DEFAULT_CONFIG.ghost.height / 2,
        width: DEFAULT_CONFIG.ghost.width,
        height: DEFAULT_CONFIG.ghost.height,
        hitboxRadius: r
      };
      const detector = createCollisionDetector(DEFAULT_CONFIG);
      const result = detector.check(ghost, []);
      expect(result.collided).toBe(false);
      expect(result.type).toBe(null);
    }));
  });
});
