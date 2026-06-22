import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateTilt, DEFAULT_CONFIG as TILT_CONFIG } from '../src/TiltCalculator.js';
import { createCollisionDetector, DEFAULT_CONFIG as COLLISION_CONFIG } from '../src/CollisionDetector.js';

/**
 * Property 2: Tilt does not affect collision hitbox
 *
 * For any ghost velocity (producing any tilt angle), the collision hitbox
 * returned by the ghost SHALL remain an axis-aligned circle with center at
 * (ghost.x + width/2, ghost.y + height/2) and radius equal to ghost.hitboxRadius,
 * independent of the current tilt angle.
 *
 * **Validates: Requirements 3.5**
 */
describe('Property 2: Tilt does not affect collision hitbox', () => {
  const GHOST_WIDTH = COLLISION_CONFIG.ghost.width;     // 44
  const GHOST_HEIGHT = COLLISION_CONFIG.ghost.height;   // 44
  const HITBOX_RADIUS = COLLISION_CONFIG.ghost.hitboxRadius; // 16

  // Safe Y range: ghost must be within boundaries so we can test hitbox
  // without triggering floor/ceiling collisions
  const FLOOR_Y = COLLISION_CONFIG.canvas.height - COLLISION_CONFIG.canvas.hudHeight; // 460
  const SAFE_Y_MIN = HITBOX_RADIUS + 1; // cy - r > 0 → ghost.y + height/2 - r > 0
  const SAFE_Y_MAX = FLOOR_Y - HITBOX_RADIUS - 1; // cy + r < FLOOR_Y

  // Generator for ghost position (safe from boundaries)
  const ghostPositionArb = fc.record({
    x: fc.float({ min: 0, max: 700, noNaN: true, noDefaultInfinity: true }),
    yCenter: fc.float({
      min: Math.fround(SAFE_Y_MIN),
      max: Math.fround(SAFE_Y_MAX),
      noNaN: true,
      noDefaultInfinity: true
    })
  }).map(({ x, yCenter }) => ({
    x,
    y: yCenter - GHOST_HEIGHT / 2 // Convert center-Y to top-left Y
  }));

  // Generator for velocity covering full range (ascending, zero, descending, beyond terminal)
  const velocityArb = fc.float({ min: -800, max: 800, noNaN: true, noDefaultInfinity: true });

  it('hitbox center is always (ghost.x + width/2, ghost.y + height/2) regardless of velocity/tilt', () => {
    fc.assert(
      fc.property(ghostPositionArb, velocityArb, (pos, velocity) => {
        // Compute tilt angle from velocity (this is what the game does each frame)
        const tiltAngle = calculateTilt(velocity, TILT_CONFIG);

        // Create a ghost object with the given position and apply tilt visually
        const ghost = {
          x: pos.x,
          y: pos.y,
          width: GHOST_WIDTH,
          height: GHOST_HEIGHT,
          hitboxRadius: HITBOX_RADIUS,
          velocity: velocity,
          tiltAngle: tiltAngle // Visual-only; should NOT affect collision
        };

        // Expected hitbox values (always axis-aligned, independent of tilt)
        const expectedCx = ghost.x + GHOST_WIDTH / 2;
        const expectedCy = ghost.y + GHOST_HEIGHT / 2;
        const expectedR = HITBOX_RADIUS;

        // CollisionDetector internally computes:
        //   cx = ghost.x + ghost.width / 2
        //   cy = ghost.y + ghost.height / 2
        //   r = ghost.hitboxRadius
        // Verify these don't change based on velocity/tilt by checking that
        // the collision result is consistent with the expected hitbox.

        // Place a pipe far away from the ghost so no pipe collision occurs.
        // With no pipes and safe boundaries, check() should return no collision.
        const detector = createCollisionDetector(COLLISION_CONFIG);
        const result = detector.check(ghost, []);
        expect(result.collided).toBe(false);
        expect(result.type).toBe(null);

        // Now place a pipe that barely overlaps the expected circle center
        // to confirm the hitbox IS at the expected position (not shifted by tilt).
        // A pipe at cx - pipeWidth/2 with gap that does NOT cover cy should collide.
        const pipeX = expectedCx - 30; // pipe.x so ghost cx is within pipe x-range
        const pipeWidth = 60;

        // Gap placed far above ghost so ghost is in the bottom pipe body
        const gapCenterY = 50; // Very high gap
        const gapHeight = 40;  // Small gap
        // Bottom pipe starts at gapCenterY + gapHeight/2 = 70
        // Ghost cy should be below 70 for collision

        if (expectedCy + expectedR > gapCenterY + gapHeight / 2) {
          const pipe = {
            x: pipeX,
            width: pipeWidth,
            gapCenterY: gapCenterY,
            gapHeight: gapHeight
          };
          const colResult = detector.check(ghost, [pipe]);
          // The ghost should collide with the bottom pipe since cy is well below the gap
          expect(colResult.collided).toBe(true);
          expect(colResult.type).toBe('pipe');
        }
      }),
      { numRuns: 200 }
    );
  });

  it('hitbox radius equals ghost.hitboxRadius regardless of tilt angle', () => {
    fc.assert(
      fc.property(ghostPositionArb, velocityArb, (pos, velocity) => {
        const tiltAngle = calculateTilt(velocity, TILT_CONFIG);

        const ghost = {
          x: pos.x,
          y: pos.y,
          width: GHOST_WIDTH,
          height: GHOST_HEIGHT,
          hitboxRadius: HITBOX_RADIUS,
          velocity: velocity,
          tiltAngle: tiltAngle
        };

        const expectedCx = ghost.x + GHOST_WIDTH / 2;
        const expectedCy = ghost.y + GHOST_HEIGHT / 2;

        // Test: a pipe edge placed exactly at distance = hitboxRadius from center
        // should be a collision. A pipe placed at distance > hitboxRadius should not.
        // This confirms the radius used is exactly hitboxRadius, not affected by tilt.

        const detector = createCollisionDetector(COLLISION_CONFIG);

        // Place a thin pipe just touching the circle's right edge
        // Pipe left edge at cx + r - 1 (overlapping by 1px)
        const touchingPipeX = expectedCx + HITBOX_RADIUS - 1;
        const touchingPipe = {
          x: touchingPipeX,
          width: 60,
          gapCenterY: expectedCy + 200, // Gap far below ghost → top pipe covers ghost
          gapHeight: 40
        };

        // Top pipe extends from y=0 to gapCenterY - gapHeight/2
        // = expectedCy + 200 - 20 = expectedCy + 180
        // Ghost cy is well within this range, so top pipe overlaps vertically
        const topPipeBottom = touchingPipe.gapCenterY - touchingPipe.gapHeight / 2;
        if (expectedCy < topPipeBottom && touchingPipeX < expectedCx + HITBOX_RADIUS + 60) {
          const result = detector.check(ghost, [touchingPipe]);
          expect(result.collided).toBe(true);
          expect(result.type).toBe('pipe');
        }

        // Place a pipe just beyond the circle's right edge
        // Pipe left edge at cx + r + 2 (no overlap)
        const missingPipeX = expectedCx + HITBOX_RADIUS + 2;
        const missingPipe = {
          x: missingPipeX,
          width: 60,
          gapCenterY: expectedCy + 200,
          gapHeight: 40
        };

        // This pipe should NOT collide because its closest point is > r away
        const missTopPipeBottom = missingPipe.gapCenterY - missingPipe.gapHeight / 2;
        if (expectedCy < missTopPipeBottom) {
          const missResult = detector.check(ghost, [missingPipe]);
          expect(missResult.collided).toBe(false);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('same position with different velocities produces identical collision results', () => {
    // For a fixed ghost position, varying the velocity (and thus tilt) should
    // not change collision outcomes at all.
    const fixedPosArb = ghostPositionArb;
    const twoVelocitiesArb = fc.tuple(velocityArb, velocityArb);

    fc.assert(
      fc.property(fixedPosArb, twoVelocitiesArb, (pos, [vel1, vel2]) => {
        const tilt1 = calculateTilt(vel1, TILT_CONFIG);
        const tilt2 = calculateTilt(vel2, TILT_CONFIG);

        const ghost1 = {
          x: pos.x,
          y: pos.y,
          width: GHOST_WIDTH,
          height: GHOST_HEIGHT,
          hitboxRadius: HITBOX_RADIUS,
          velocity: vel1,
          tiltAngle: tilt1
        };

        const ghost2 = {
          x: pos.x,
          y: pos.y,
          width: GHOST_WIDTH,
          height: GHOST_HEIGHT,
          hitboxRadius: HITBOX_RADIUS,
          velocity: vel2,
          tiltAngle: tilt2
        };

        // Create a pipe in range of the ghost position
        const cx = pos.x + GHOST_WIDTH / 2;
        const cy = pos.y + GHOST_HEIGHT / 2;
        const pipe = {
          x: cx - 30,
          width: 60,
          gapCenterY: cy, // Gap centered exactly at ghost → ghost in gap → no collision
          gapHeight: 140
        };

        const detector = createCollisionDetector(COLLISION_CONFIG);
        const result1 = detector.check(ghost1, [pipe]);
        const result2 = detector.check(ghost2, [pipe]);

        // Same position, different velocities → must produce identical collision result
        expect(result1.collided).toBe(result2.collided);
        expect(result1.type).toBe(result2.type);
      }),
      { numRuns: 200 }
    );
  });
});
