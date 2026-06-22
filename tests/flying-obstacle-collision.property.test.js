import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { circleRectCollision, _clamp, createCollisionDetector, DEFAULT_CONFIG } from '../src/CollisionDetector.js';

/**
 * Property 11: Flying obstacle circle-rect collision correctness
 *
 * For any ghost circle (cx, cy, r) and flying obstacle rectangle (rx, ry, rw, rh),
 * the collision detector SHALL return collided=true if and only if the distance
 * from the circle center to the nearest point on the rectangle is less than or
 * equal to the radius.
 *
 * Formula:
 *   closestX = clamp(cx, rx, rx + rw)
 *   closestY = clamp(cy, ry, ry + rh)
 *   distSq = (cx - closestX)² + (cy - closestY)²
 *   expected = distSq <= r²
 *
 * **Validates: Requirements 5.7**
 */
describe('Property 11: Flying obstacle circle-rect collision correctness', () => {
  // Helper: compute expected collision using the mathematical formula
  function expectedCollision(cx, cy, r, rx, ry, rw, rh) {
    const closestX = _clamp(cx, rx, rx + rw);
    const closestY = _clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) <= (r * r);
  }

  // Arbitraries matching the task specification
  const circleArb = fc.record({
    cx: fc.float({ min: 0, max: 800, noNaN: true, noDefaultInfinity: true }),
    cy: fc.float({ min: 0, max: 800, noNaN: true, noDefaultInfinity: true }),
    r: fc.float({ min: 1, max: 50, noNaN: true, noDefaultInfinity: true })
  });

  const rectArb = fc.record({
    rx: fc.float({ min: 0, max: 800, noNaN: true, noDefaultInfinity: true }),
    ry: fc.float({ min: 0, max: 800, noNaN: true, noDefaultInfinity: true }),
    rw: fc.float({ min: 1, max: 200, noNaN: true, noDefaultInfinity: true }),
    rh: fc.float({ min: 1, max: 200, noNaN: true, noDefaultInfinity: true })
  });

  it('circleRectCollision matches mathematical formula for random inputs', () => {
    fc.assert(
      fc.property(circleArb, rectArb, (circle, rect) => {
        const { cx, cy, r } = circle;
        const { rx, ry, rw, rh } = rect;

        const actual = circleRectCollision(cx, cy, r, rx, ry, rw, rh);
        const expected = expectedCollision(cx, cy, r, rx, ry, rw, rh);

        expect(actual).toBe(expected);
      }),
      { numRuns: 1000 }
    );
  });

  it('checkFlyingObstacles agrees with the mathematical formula', () => {
    const detector = createCollisionDetector(DEFAULT_CONFIG);

    // Generate ghost params and a flying obstacle
    const ghostArb = fc.record({
      cx: fc.float({ min: 0, max: 800, noNaN: true, noDefaultInfinity: true }),
      cy: fc.float({ min: 0, max: 800, noNaN: true, noDefaultInfinity: true }),
      r: fc.float({ min: 1, max: 50, noNaN: true, noDefaultInfinity: true })
    });

    const obstacleArb = fc.record({
      x: fc.float({ min: 0, max: 800, noNaN: true, noDefaultInfinity: true }),
      y: fc.float({ min: 0, max: 800, noNaN: true, noDefaultInfinity: true }),
      width: fc.float({ min: 1, max: 200, noNaN: true, noDefaultInfinity: true }),
      height: fc.float({ min: 1, max: 200, noNaN: true, noDefaultInfinity: true })
    });

    fc.assert(
      fc.property(ghostArb, obstacleArb, (ghostParams, obs) => {
        // Build a ghost object from circle params
        const ghost = {
          x: ghostParams.cx - DEFAULT_CONFIG.ghost.width / 2,
          y: ghostParams.cy - DEFAULT_CONFIG.ghost.height / 2,
          width: DEFAULT_CONFIG.ghost.width,
          height: DEFAULT_CONFIG.ghost.height,
          hitboxRadius: ghostParams.r
        };

        const flyingObstacle = {
          x: obs.x,
          y: obs.y,
          width: obs.width,
          height: obs.height,
          active: true
        };

        const result = detector.checkFlyingObstacles(ghost, [flyingObstacle]);
        const expected = expectedCollision(
          ghostParams.cx, ghostParams.cy, ghostParams.r,
          obs.x, obs.y, obs.width, obs.height
        );

        expect(result.collided).toBe(expected);
      }),
      { numRuns: 1000 }
    );
  });

  it('checkFlyingObstacles skips inactive obstacles', () => {
    const detector = createCollisionDetector(DEFAULT_CONFIG);

    fc.assert(
      fc.property(circleArb, rectArb, (circle, rect) => {
        const ghost = {
          x: circle.cx - DEFAULT_CONFIG.ghost.width / 2,
          y: circle.cy - DEFAULT_CONFIG.ghost.height / 2,
          width: DEFAULT_CONFIG.ghost.width,
          height: DEFAULT_CONFIG.ghost.height,
          hitboxRadius: circle.r
        };

        // Obstacle is inactive — should never collide
        const flyingObstacle = {
          x: rect.rx,
          y: rect.ry,
          width: rect.rw,
          height: rect.rh,
          active: false
        };

        const result = detector.checkFlyingObstacles(ghost, [flyingObstacle]);
        expect(result.collided).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
