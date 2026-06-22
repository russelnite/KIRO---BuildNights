# Implementation Plan: Visual Overhaul

## Overview

This plan converts Flappy Kiro from a portrait (480×640) game to landscape (800×500), replaces the ghost with a two-frame winged Nailong character featuring three-tier wing animation, adds velocity-based tilt, upgrades pipes with rounded caps, and introduces flying obstacle enemies at score ≥ 30. All changes are implemented in JavaScript within the existing single-file architecture (index.html) with testable module extractions in `src/`.

## Tasks

- [x] 1. Update canvas dimensions and CONFIG for landscape orientation
  - [x] 1.1 Update CONFIG canvas, ghost, and pipe values for 800×500 layout
    - Change `CONFIG.canvas.width` to 800, `CONFIG.canvas.height` to 500
    - Update `CONFIG.ghost.startX` to 150, `CONFIG.ghost.startY` to 250
    - Update `CONFIG.ghost.width` to 44, `CONFIG.ghost.height` to 44, `CONFIG.ghost.hitboxRadius` to 16
    - Update the `<canvas>` element's width/height attributes in index.html to 800×500
    - Update CSS aspect-ratio and media queries from 480/640 to 800/500
    - Add new CONFIG sections: `CONFIG.character` (tilt params), `CONFIG.wingAnimation`, `CONFIG.pipes` cap properties, `CONFIG.flyingObstacles`
    - Update `game-config.json` with all new values matching the design document
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Update all subsystems to use new canvas dimensions
    - Update ScrollingEngine's hardcoded canvas references to read from CONFIG (800×500)
    - Update CollisionDetector's DEFAULT_CONFIG to reflect new canvas size
    - Update PhysicsEngine references if any hardcoded values exist
    - Update `createInitialGameState()` to use new ghost start position (150, 250) and dimensions (44×44)
    - Update `_resetGameState()` to use new CONFIG values
    - Verify Nailong starts in left quarter (x=150) and vertical center (y=250)
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [x] 1.3 Write property test for pipe gap bounds in landscape canvas
    - **Property 14: Pipe gap centers within landscape bounds**
    - Generate pipe pairs with random seeds, verify gapCenterY is between 20% and 80% of playable area (500 - 40 = 460px)
    - **Validates: Requirements 1.6**

- [x] 2. Implement Nailong character with wing animation
  - [x] 2.1 Create WingAnimController module
    - Create `src/WingAnimController.js` as a factory function `createWingAnimController(config)`
    - Implement three-tier state machine: base (250–350ms), jump (120–180ms), rapid (60–100ms)
    - Implement `update(dt, jumpTriggeredThisFrame, jumpHeld, gameState)` method
    - Implement `getCurrentFrame()` returning 'up' or 'down'
    - Implement `reset()` method
    - Implement rapid detection: track last jump timestamps, transition to rapid when two jumps occur within 200ms
    - Freeze animation (no timer advance) when gameState is 'paused' or 'game_over'
    - Animate at base rate during 'ready' state
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9, 2.10, 2.11_

  - [x] 2.2 Write property test for wing tier state machine
    - **Property 3: Wing animation tier state machine**
    - Generate random sequences of (dt, jumpInput) pairs, verify rate bounds match expected tier
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**

  - [x] 2.3 Write property test for wing animation freeze
    - **Property 4: Wing animation freezes in inactive game states**
    - Generate random wing states and dt values in paused/game_over, verify no mutation
    - **Validates: Requirements 2.10, 2.11**

  - [x] 2.4 Integrate Nailong sprites and WingAnimController into index.html
    - Load `assets/nailong_up.png` and `assets/nailong_down.png` in asset loader
    - Replace Ghosty sprite rendering with Nailong two-frame sprite rendering
    - Select sprite frame based on `wingAnimController.getCurrentFrame()`
    - Call `wingAnimController.update()` in game loop after physics step
    - Implement fallback: render white circle if either sprite fails to load
    - Render Nailong at configured width/height (44×44) maintaining circular hitbox
    - Keep idle bob animation during Ready state alongside wing animation at base rate
    - _Requirements: 2.1, 2.7, 2.8, 2.9, 2.10, 2.11_

- [x] 3. Implement character tilt and rotation
  - [x] 3.1 Create TiltCalculator module
    - Create `src/TiltCalculator.js` as a pure function `calculateTilt(velocity, config)`
    - Positive velocity (descending) → positive angle (clockwise), proportional to velocity
    - Negative velocity (ascending) → negative angle (counter-clockwise), proportional to magnitude
    - Zero velocity → zero angle
    - Clamp to maxDownTilt (0.6 rad) and maxUpTilt (0.4 rad) from CONFIG
    - Ensure maxDownTilt > maxUpTilt (asymmetric bounds)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Write property test for tilt proportionality and bounds
    - **Property 1: Tilt is proportional to velocity with correct sign and asymmetric bounds**
    - Generate random velocities in [-600, 600], verify sign, proportionality, bounds, and asymmetry
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x] 3.3 Write property test for tilt hitbox independence
    - **Property 2: Tilt does not affect collision hitbox**
    - Generate random velocities producing tilt angles, verify hitbox remains axis-aligned circle at (ghost.x + width/2, ghost.y + height/2) with radius = hitboxRadius
    - **Validates: Requirements 3.5**

  - [x] 3.4 Integrate tilt into Nailong rendering
    - Compute tilt angle each frame from ghost.velocity using TiltCalculator
    - Apply rotation in renderer using `ctx.save()`, `ctx.translate()`, `ctx.rotate()`, `ctx.drawImage()`, `ctx.restore()`
    - Ensure collision detection continues using unrotated circular hitbox
    - _Requirements: 3.5, 3.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement styled pipes with rounded caps
  - [x] 5.1 Add pipe cap rendering to the Renderer
    - Add `drawRoundedRect(ctx, x, y, width, height, radius)` utility function
    - Draw top pipe cap at bottom edge of top pipe (gap-facing edge): position at `gapCenterY - gapHeight/2 - capHeight`
    - Draw bottom pipe cap at top edge of bottom pipe (gap-facing edge): position at `gapCenterY + gapHeight/2`
    - Cap width = pipe width + 2 × capOverhang (8px each side = total 76px)
    - Cap height = 25px, border radius = 4px
    - Cap color = darker green (#1a7a28), distinct from pipe body fill (#2ecc40)
    - Draw caps in the same pipe rendering pass, after pipe bodies
    - Pipe body retains existing green fill and dark outline
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [x] 5.2 Write property test for cap collision exclusion
    - **Property 5: Collision detection uses pipe body dimensions only (not caps)**
    - Generate ghost positions in cap-only zones (between pipe.x - capOverhang and pipe.x, or between pipe.x + pipe.width and pipe.x + pipe.width + capOverhang) but NOT within pipe body
    - Verify collision detector reports no collision
    - **Validates: Requirements 4.6**

- [x] 6. Implement flying obstacles system
  - [x] 6.1 Extend DifficultyManager with flying obstacle parameters
    - Add `flyingObstacleSpeedMultiplier` and `flyingObstacleSpawnInterval` to evaluate() return
    - Speed multiplier scales from 1.2× at score 30 to 2.0× at max difficulty (increment 0.2 per 10 points above threshold)
    - Spawn interval decreases from 3000–5000ms at score 30 to 1500–2500ms at max difficulty (decrement 400ms per tier)
    - Only compute these when score >= 30; return null/undefined otherwise
    - _Requirements: 5.4, 5.5_

  - [x] 6.2 Write property test for flying obstacle speed multiplier bounds
    - **Property 8: Flying obstacle speed multiplier within bounds and monotonically increasing**
    - Generate scores [30, 200], verify multiplier in [1.2, 2.0] and monotonically non-decreasing
    - **Validates: Requirements 5.3, 5.5**

  - [x] 6.3 Write property test for flying obstacle spawn interval bounds
    - **Property 9: Flying obstacle spawn interval within bounds and monotonically decreasing**
    - Generate scores [30, 200], verify interval in [1500, 5000] and monotonically non-increasing
    - **Validates: Requirements 5.4**

  - [x] 6.4 Add flying obstacle spawning and movement to ScrollingEngine
    - Add flying obstacle object pool (pool size 4) using existing ObjectPool pattern
    - Implement `spawnFlyingObstacle(difficulty, score)`: only spawn when score >= 30, max 2 on screen, random Y between 15%–85% of playable height, x = canvas width + obstacle width
    - Implement `updateFlyingObstacles(flyingObstacles, dt, state)`: move left at pipeSpeed × speedMultiplier, freeze when paused, no spawn/move when game_over or ready
    - Implement `removeFlyingObstacleOffscreen(flyingObstacles)`: return to pool when right edge < 0
    - Add spawn timer tracking spawn intervals from DifficultyManager
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.9, 5.10, 5.11, 5.13_

  - [x] 6.5 Write property test for flying obstacle activation threshold
    - **Property 6: Flying obstacle activation threshold**
    - Generate random scores [0, 100], verify no spawn when score < 30, eligible when score >= 30
    - **Validates: Requirements 5.1**

  - [x] 6.6 Write property test for flying obstacle spawn Y bounds
    - **Property 7: Flying obstacle spawn Y position within bounds**
    - Generate spawn calls with random seeds, verify Y within [15%, 85%] of playable height
    - **Validates: Requirements 5.2**

  - [x] 6.7 Write property test for flying obstacle count cap
    - **Property 10: Flying obstacle count cap**
    - Generate rapid spawn sequences at various scores/difficulties, verify active count never exceeds 2
    - **Validates: Requirements 5.6**

  - [x] 6.8 Write property test for flying obstacle off-screen removal
    - **Property 12: Flying obstacle off-screen removal**
    - Generate obstacles with various x positions, verify removal when x + width < 0
    - **Validates: Requirements 5.9**

  - [x] 6.9 Write property test for flying obstacles freeze in non-playing states
    - **Property 13: Flying obstacles freeze in non-playing states**
    - Generate obstacle arrays and dt in paused/game_over, verify positions unchanged and no spawns
    - **Validates: Requirements 5.10, 5.11**

- [x] 7. Integrate flying obstacle collision detection
  - [x] 7.1 Extend CollisionDetector with flying obstacle checks
    - Add `checkFlyingObstacles(ghost, flyingObstacles)` method using existing `circleRectCollision` algorithm
    - Flying obstacle hitbox = bounding rectangle (x, y, width, height)
    - Return `{ collided: true }` if ghost circle overlaps any obstacle rect
    - Trigger game_over state on collision (same as pipe collision)
    - _Requirements: 5.7_

  - [x] 7.2 Write property test for flying obstacle collision correctness
    - **Property 11: Flying obstacle circle-rect collision correctness**
    - Generate random circles (cx, cy, r) and rectangles (rx, ry, rw, rh), verify collision matches mathematical formula
    - **Validates: Requirements 5.7**

- [x] 8. Implement flying obstacle rendering and asset loading
  - [x] 8.1 Add flying obstacle rendering and integrate into game loop
    - Load `assets/flying_enemy.png` in asset loader with onload/onerror handlers
    - Render each flying obstacle using drawImage at (obs.x, obs.y, obs.width, obs.height)
    - Obstacle height = 75% of Nailong height (33px if Nailong is 44px), width proportional to image aspect ratio
    - Fallback: render red filled circle if image fails to load
    - Add flying obstacles to render order (after collectibles, before particles)
    - Wire flying obstacle spawn/update/collision into the main game loop
    - Add `flyingObstacles: []` to gameState and include in reset logic
    - _Requirements: 5.8, 5.12_

- [x] 9. Update HUD and Game Over rendering
  - [x] 9.1 Center HUD text and update Game Over color
    - Change score text rendering to use `ctx.textAlign = 'center'` at x = 400 (canvas.width / 2)
    - Render both current score and high score centered horizontally in the HUD bar
    - Change Game Over text color from white to red (#e74c3c)
    - Update offscreen HUD canvas dimensions to 800×40 if applicable
    - _Requirements: 1.8, 1.9_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Vitest with fast-check for property-based testing
- All implementation is in JavaScript (existing project language)
- New modules (WingAnimController, TiltCalculator) are extracted as testable factory functions in `src/`
- The main game integration happens in `index.html` inline script following existing patterns

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1", "6.1"] },
    { "id": 2, "tasks": ["1.3", "2.2", "2.3", "3.2", "3.3", "5.1", "6.2", "6.3"] },
    { "id": 3, "tasks": ["2.4", "3.4", "5.2", "6.4"] },
    { "id": 4, "tasks": ["6.5", "6.6", "6.7", "6.8", "6.9", "7.1"] },
    { "id": 5, "tasks": ["7.2", "8.1"] },
    { "id": 6, "tasks": ["9.1"] }
  ]
}
```
