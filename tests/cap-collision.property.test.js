import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createCollisionDetector, DEFAULT_CONFIG } from '../src/CollisionDetector.js';

/**
 * Property 5: Collision detection uses pipe body dimensions only (not caps)
 *
 * For any ghost position that is within the pipe cap overhang area
 * (between pipe.x - capOverhang and pipe.x, or between pipe.x + pipe.width
 * and pipe.x + pipe.width + capOverhang) but NOT within the pipe body rectangle
 * (pipe.x to pipe.x + pipe.width), the collision detector SHALL report no collision.
 *
 * **Validates: Requirements 4.6**
 */
describe('Property 5: Collision detection uses pipe body dimensions only (not caps)', () => {
  const CAP_OVERHANG = 8; // CONFIG.pipes.capOverhang
  const PIPE_WIDTH = DEFAULT_CONFIG.pipes.width; // 60
  const GHOST_WIDTH = DEFAULT_CONFIG.ghost.width; // 44
  const GHOST_HEIGHT = DEFAULT_CONFIG.ghost.height; // 44
  const GHOST_RADIUS = DEFAULT_CONFIG.ghost.hitboxRadius; // 16
  const CANVAS_HEIGHT = DEFAULT_CONFIG.canvas.height; // 500
  const HUD_HEIGHT = DEFAULT_CONFIG.canvas.hudHeight; // 40
  const FLOOR_Y = CANVAS_HEIGHT - HUD_HEIGHT; // 460

  it('ghost in left cap-only zone does not trigger collision', () => {
    // Generate a pipe at a reasonable x position, then place the ghost circle
    // in the left cap-only zone: ghost center between (pipe.x - capOverhang) and pipe.x
    // but with the circle not overlapping the pipe body (cx + r <= pipe.x)
    const leftCapArb = fc.record({
      // Pipe x: needs enough room for cap on the left side
      pipeX: fc.integer({ min: 100, max: 600 }),
      // Gap center: place gap so pipe body exists above and below
      gapCenterY: fc.integer({ min: 80, max: 380 }),
      gapHeight: fc.integer({ min: 90, max: 140 })
    }).chain(({ pipeX, gapCenterY, gapHeight }) => {
      // Ghost center X must be in cap-only zone to the left:
      // The cap extends from (pipeX - CAP_OVERHANG) to pipeX.
      // For no pipe body collision: cx + r <= pipeX (circle doesn't reach pipe body)
      // So cx must be <= pipeX - r
      // Also cx must be >= pipeX - CAP_OVERHANG (within the cap zone)
      // This requires: pipeX - CAP_OVERHANG <= cx <= pipeX - r
      // Which requires: CAP_OVERHANG >= r — but r=16 > capOverhang=8!
      // So we need the ghost circle's CENTER in the cap zone, but the circle
      // must NOT overlap the pipe body rect.
      // Overlap happens when cx < pipeX + PIPE_WIDTH and cx > pipeX - r (for x-axis)
      // Actually circleRectCollision uses clamp: closestX = clamp(cx, pipeX, pipeX+PIPE_WIDTH)
      // If cx < pipeX, closestX = pipeX, so dx = cx - pipeX (negative)
      // No collision if dx*dx + dy*dy > r*r
      // We need: (pipeX - cx)^2 + dy^2 > r^2
      // Since we place ghost vertically INSIDE the pipe body region, dy = 0 (cy is clamped to the rect)
      // So we need: (pipeX - cx)^2 > r^2 => pipeX - cx > r => cx < pipeX - r
      // BUT the cap zone left edge is pipeX - 8, and we need cx < pipeX - 16...
      // That means cx would be OUTSIDE the cap zone entirely!
      //
      // Key insight: With r=16 and capOverhang=8, if the ghost CENTER is in the cap zone
      // (between pipeX-8 and pipeX), then pipeX - cx < 8 < 16 = r, so the circle
      // actually reaches INTO the pipe body. BUT the collision detector checks against
      // the pipe body rect — and if dy=0 (ghost Y aligns with pipe body), then
      // collision = (pipeX - cx)^2 <= r^2, which IS true when pipeX - cx <= r=16.
      //
      // However, the property is about the cap ZONE not causing collision when
      // the ghost is NOT within the pipe body. The ghost is in the cap zone
      // horizontally, meaning its CENTER is in [pipeX - capOverhang, pipeX) or
      // [pipeX + pipeWidth, pipeX + pipeWidth + capOverhang].
      // The collision detector uses pipe.x and pipe.width — so if the ghost circle
      // doesn't reach the pipe body rect, no collision is reported.
      //
      // For the left cap zone: ghost center cx in [pipeX - 8, pipeX)
      // Distance from cx to nearest pipe body edge (pipeX) = pipeX - cx, which is in (0, 8]
      // For no collision: need (pipeX - cx)^2 + dy^2 > r^2
      // If ghost is also vertically in the gap (dy != 0 from pipe body), no collision!
      //
      // So the correct setup: ghost is in cap zone horizontally AND vertically in the GAP
      // (not overlapping the pipe body vertically either). Then the closest point on
      // BOTH pipe rects will have distance > r.
      //
      // Actually re-reading the task: "Place the ghost vertically within the pipe body
      // (not in the gap)" — meaning at a Y where it WOULD collide if cap were used.
      // But with the actual pipe body width, the horizontal distance (pipeX - cx) being
      // less than 8 with r=16 means the circle DOES reach into the pipe body rect!
      //
      // Wait — let me re-read: the collision check is circleRectCollision(cx, cy, r, pipe.x, 0, pipe.width, topH)
      // If cx is in [pipeX - 8, pipeX), the closest X on the rect is pipeX (left edge).
      // dx = cx - pipeX (negative, magnitude 0 to 8)
      // If cy is within [0, topH], closestY = cy, dy = 0
      // So distance^2 = (cx - pipeX)^2 + 0 = (pipeX - cx)^2
      // Since pipeX - cx <= 8 and r = 16: (pipeX-cx)^2 <= 64 <= 256 = r^2
      // So collision IS detected! The ghost circle overlaps the pipe body.
      //
      // This means with the default hitbox radius of 16 and cap overhang of 8,
      // if the ghost center is in the cap zone AND vertically within the pipe body,
      // it WILL collide with the pipe body (because the circle extends into it).
      //
      // The property should be tested with ghost positions where the circle does NOT
      // overlap the pipe body — meaning the ghost is in the cap zone but the circle
      // edge doesn't reach the pipe body. This requires the ghost center to be at
      // distance > r from the pipe body on BOTH axes combined.
      //
      // The correct interpretation: ghost RIGHT EDGE of bounding box is in cap zone
      // but does NOT reach pipe body. We test with a smaller hitbox radius to make
      // the test meaningful, OR we interpret the property as:
      // "ghost center is in the cap overhang region" where the cap rectangle would
      // cause collision but the pipe body rectangle does not.
      //
      // Let me use a small radius to demonstrate the property clearly.
      // With r=5 and capOverhang=8: ghost center at pipeX - 6 (in cap zone),
      // distance to pipe body = 6 > 5 = r, so NO collision with pipe body.
      // But the cap rect extends to pipeX - 8, so the ghost IS within the cap area.
      // That's the scenario the property describes.

      // Use a radius small enough that the ghost fits in the cap zone without
      // reaching the pipe body: r < capOverhang, so r in [1, 7]
      return fc.record({
        r: fc.integer({ min: 1, max: 7 }),
        // Ghost center X offset from pipeX into cap zone (negative direction)
        // cx = pipeX - offset, where offset is in [r+1, capOverhang] to ensure:
        // 1) cx >= pipeX - capOverhang (in cap zone)
        // 2) pipeX - cx > r (no collision with pipe body)
        offsetFactor: fc.double({ min: 0.01, max: 0.99, noNaN: true })
      }).map(({ r, offsetFactor }) => {
        // offset must be > r (no collision) and <= CAP_OVERHANG (in cap zone)
        // offset in (r, CAP_OVERHANG]
        // Since r is at most 7 and CAP_OVERHANG = 8, offset range is (r, 8]
        const minOffset = r + 0.1;
        const maxOffset = CAP_OVERHANG;
        const offset = minOffset + offsetFactor * (maxOffset - minOffset);
        const cx = pipeX - offset;

        // Ghost Y: place it within the top pipe body or bottom pipe body
        // Top pipe body: y from 0 to (gapCenterY - gapHeight/2)
        // Ensure ghost is within pipe body vertically (so dy=0 for the closest point)
        const topPipeBottom = gapCenterY - gapHeight / 2;
        // Ghost center must be within [r+1, topPipeBottom - 1] for top pipe overlap vertically
        // (and also not hit ceiling: cy - r > 0 => cy > r)
        const cyMin = r + 1;
        const cyMax = topPipeBottom - 1;

        return { pipeX, gapCenterY, gapHeight, r, cx, cyMin, cyMax };
      });
    }).chain(({ pipeX, gapCenterY, gapHeight, r, cx, cyMin, cyMax }) => {
      if (cyMin >= cyMax) {
        // Not enough room — use a fixed valid cy
        return fc.constant({ pipeX, gapCenterY, gapHeight, r, cx, cy: cyMin });
      }
      return fc.double({ min: cyMin, max: cyMax, noNaN: true }).map(cy => ({
        pipeX, gapCenterY, gapHeight, r, cx, cy
      }));
    }).filter(({ pipeX, gapCenterY, gapHeight, r, cx, cy }) => {
      // Ensure ghost is in the cap zone
      const inCapZone = cx >= pipeX - CAP_OVERHANG && cx < pipeX;
      // Ensure ghost doesn't collide with pipe body (distance > r)
      const distToPipeBody = pipeX - cx;
      const noBodyCollision = distToPipeBody > r;
      // Ensure ghost is vertically within top pipe body
      const topPipeBottom = gapCenterY - gapHeight / 2;
      const inPipeBodyVertically = cy >= r + 1 && cy <= topPipeBottom - 1;
      // Ensure not hitting ceiling or floor
      const notCeiling = cy - r > 0;
      const notFloor = cy + r < FLOOR_Y;
      return inCapZone && noBodyCollision && inPipeBodyVertically && notCeiling && notFloor;
    });

    fc.assert(fc.property(leftCapArb, ({ pipeX, gapCenterY, gapHeight, r, cx, cy }) => {
      const ghost = {
        x: cx - GHOST_WIDTH / 2,
        y: cy - GHOST_HEIGHT / 2,
        width: GHOST_WIDTH,
        height: GHOST_HEIGHT,
        hitboxRadius: r
      };

      const pipes = [{
        x: pipeX,
        width: PIPE_WIDTH,
        gapCenterY,
        gapHeight
      }];

      const detector = createCollisionDetector(DEFAULT_CONFIG);
      const result = detector.check(ghost, pipes);

      // The ghost is in the cap zone but NOT overlapping the pipe body
      // So the collision detector should report no collision
      expect(result.collided).toBe(false);
    }), { numRuns: 200 });
  });

  it('ghost in right cap-only zone does not trigger collision', () => {
    // Ghost center in the right cap zone: between pipeX + PIPE_WIDTH and
    // pipeX + PIPE_WIDTH + CAP_OVERHANG, with circle not reaching pipe body
    const rightCapArb = fc.record({
      pipeX: fc.integer({ min: 100, max: 600 }),
      gapCenterY: fc.integer({ min: 80, max: 380 }),
      gapHeight: fc.integer({ min: 90, max: 140 })
    }).chain(({ pipeX, gapCenterY, gapHeight }) => {
      return fc.record({
        r: fc.integer({ min: 1, max: 7 }),
        offsetFactor: fc.double({ min: 0.01, max: 0.99, noNaN: true })
      }).map(({ r, offsetFactor }) => {
        // cx must be > pipeX + PIPE_WIDTH (past pipe body right edge)
        // and cx <= pipeX + PIPE_WIDTH + CAP_OVERHANG (in cap zone)
        // and cx - (pipeX + PIPE_WIDTH) > r (no collision with pipe body)
        const pipeRightEdge = pipeX + PIPE_WIDTH;
        const minOffset = r + 0.1;
        const maxOffset = CAP_OVERHANG;
        const offset = minOffset + offsetFactor * (maxOffset - minOffset);
        const cx = pipeRightEdge + offset;

        // Place ghost vertically within the top pipe body
        const topPipeBottom = gapCenterY - gapHeight / 2;
        const cyMin = r + 1;
        const cyMax = topPipeBottom - 1;

        return { pipeX, gapCenterY, gapHeight, r, cx, cyMin, cyMax };
      });
    }).chain(({ pipeX, gapCenterY, gapHeight, r, cx, cyMin, cyMax }) => {
      if (cyMin >= cyMax) {
        return fc.constant({ pipeX, gapCenterY, gapHeight, r, cx, cy: cyMin });
      }
      return fc.double({ min: cyMin, max: cyMax, noNaN: true }).map(cy => ({
        pipeX, gapCenterY, gapHeight, r, cx, cy
      }));
    }).filter(({ pipeX, gapCenterY, gapHeight, r, cx, cy }) => {
      const pipeRightEdge = pipeX + PIPE_WIDTH;
      // In cap zone
      const inCapZone = cx > pipeRightEdge && cx <= pipeRightEdge + CAP_OVERHANG;
      // Not colliding with pipe body
      const distToPipeBody = cx - pipeRightEdge;
      const noBodyCollision = distToPipeBody > r;
      // Vertically within top pipe body
      const topPipeBottom = gapCenterY - gapHeight / 2;
      const inPipeBodyVertically = cy >= r + 1 && cy <= topPipeBottom - 1;
      // Not hitting boundaries
      const notCeiling = cy - r > 0;
      const notFloor = cy + r < FLOOR_Y;
      return inCapZone && noBodyCollision && inPipeBodyVertically && notCeiling && notFloor;
    });

    fc.assert(fc.property(rightCapArb, ({ pipeX, gapCenterY, gapHeight, r, cx, cy }) => {
      const ghost = {
        x: cx - GHOST_WIDTH / 2,
        y: cy - GHOST_HEIGHT / 2,
        width: GHOST_WIDTH,
        height: GHOST_HEIGHT,
        hitboxRadius: r
      };

      const pipes = [{
        x: pipeX,
        width: PIPE_WIDTH,
        gapCenterY,
        gapHeight
      }];

      const detector = createCollisionDetector(DEFAULT_CONFIG);
      const result = detector.check(ghost, pipes);

      expect(result.collided).toBe(false);
    }), { numRuns: 200 });
  });

  it('ghost overlapping pipe body DOES trigger collision (control test)', () => {
    // Verify that when ghost is in the pipe body, collision IS detected
    // This ensures the property test above is meaningful
    const bodyCollisionArb = fc.record({
      pipeX: fc.integer({ min: 100, max: 600 }),
      gapCenterY: fc.integer({ min: 120, max: 380 }),
      gapHeight: fc.integer({ min: 90, max: 140 })
    }).chain(({ pipeX, gapCenterY, gapHeight }) => {
      // Place ghost center inside the pipe body horizontally
      return fc.double({ min: pipeX + 5, max: pipeX + PIPE_WIDTH - 5, noNaN: true }).map(cx => {
        // Place ghost vertically within the top pipe (above the gap)
        const topPipeBottom = gapCenterY - gapHeight / 2;
        // cy somewhere in the top pipe body
        const cy = Math.max(GHOST_RADIUS + 1, Math.min(topPipeBottom - 5, topPipeBottom / 2));
        return { pipeX, gapCenterY, gapHeight, cx, cy };
      });
    }).filter(({ pipeX, gapCenterY, gapHeight, cx, cy }) => {
      const topPipeBottom = gapCenterY - gapHeight / 2;
      return cy > GHOST_RADIUS && cy < topPipeBottom && cx > pipeX && cx < pipeX + PIPE_WIDTH;
    });

    fc.assert(fc.property(bodyCollisionArb, ({ pipeX, gapCenterY, gapHeight, cx, cy }) => {
      const ghost = {
        x: cx - GHOST_WIDTH / 2,
        y: cy - GHOST_HEIGHT / 2,
        width: GHOST_WIDTH,
        height: GHOST_HEIGHT,
        hitboxRadius: GHOST_RADIUS
      };

      const pipes = [{
        x: pipeX,
        width: PIPE_WIDTH,
        gapCenterY,
        gapHeight
      }];

      const detector = createCollisionDetector(DEFAULT_CONFIG);
      const result = detector.check(ghost, pipes);

      expect(result.collided).toBe(true);
      expect(result.type).toBe('pipe');
    }), { numRuns: 200 });
  });
});
