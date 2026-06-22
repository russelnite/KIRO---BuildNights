# Implementation Plan: Flappy Kiro

## Overview

Implement a retro-styled endless side-scrolling browser game as a single HTML5 page with embedded JavaScript. The game uses Canvas 2D API for rendering, Web Audio API for sound effects, and localStorage for high score persistence. The implementation follows a modular game-loop architecture with separated subsystems for physics, rendering, collision, scoring, audio, difficulty, and particles.

## Tasks

- [x] 1. Set up project structure, constants, and core data models
  - [x] 1.1 Create the main index.html file with canvas element, CSS scaling, and script skeleton
    - Create HTML file with a 480x640 canvas element
    - Add CSS to scale canvas to fill viewport while maintaining aspect ratio
    - Add embedded `<script>` tag with module structure
    - Define centralized CONFIG object with all tunable parameters grouped by subsystem (canvas, physics, difficulty, ghost, pipes, collectibles, clouds, particles, shake, scorePopup, audio, pools)
    - Implement applyUrlOverrides() function that parses URL query parameters using dot-notation keys (e.g., `?physics.gravity=0.3&difficulty.baseSpeed=4`) and overrides matching CONFIG values while preserving types
    - Call applyUrlOverrides(CONFIG) once at startup before any subsystem initialization
    - Implement ObjectPool class with acquire(), release(), prewarm(count) methods for reusable object management
    - Define initial game state object structure with all fields referencing CONFIG values
    - _Requirements: 1.1, 1.3, 8.1, 8.3_

- [x] 2. Implement input handling and state management
  - [x] 2.1 Implement InputHandler module
    - Create InputHandler with init(), pollJump(), pollPause(), reset() methods
    - Register keydown listeners for Spacebar (jump), Escape/P (pause)
    - Register mousedown and touchstart on canvas for jump
    - Buffer inputs as flags consumed on poll to prevent double-processing
    - Separate pause inputs from jump inputs to avoid accidental jumps on resume
    - _Requirements: 2.1, 7.2, 7.5, 7.9_

  - [x] 2.2 Implement StateManager module
    - Create StateManager with currentState, transition(), and state query methods
    - Implement state machine: Ready→Playing, Playing→Paused, Playing→GameOver, Paused→Playing, GameOver→Ready
    - Validate transition legality (reject invalid transitions)
    - _Requirements: 7.1, 7.2, 7.5, 7.8, 7.10, 7.11_

  - [x] 2.3 Write unit tests for StateManager
    - Test all valid state transitions
    - Test rejection of invalid transitions
    - Test state query methods return correct values
    - _Requirements: 7.1_

- [x] 3. Implement physics engine
  - [x] 3.1 Implement PhysicsEngine module
    - Create PhysicsEngine with update() and applyJump() methods
    - Apply gravity (800 px/s²) scaled by delta-time (seconds) each frame in Playing state
    - Set velocity to JUMP_VELOCITY (-300 px/s) on jump input, overriding current velocity
    - Clamp velocity between TERMINAL_VELOCITY_UP (-400 px/s) and TERMINAL_VELOCITY_DOWN (600 px/s)
    - Update ghost.y by velocity * dt for frame-rate independent movement
    - Do not apply physics in Ready, Paused, or GameOver states
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 3.2 Write property tests for physics (Properties 1-6)
    - **Property 1: Jump overrides velocity** — For any ghost velocity, applyJump sets velocity to exactly JUMP_VELOCITY
    - **Property 2: Gravity accumulates momentum** — Velocity increases by GRAVITY * dt each frame
    - **Property 3: Terminal velocity capping (downward)** — Velocity never exceeds TERMINAL_VELOCITY_DOWN
    - **Property 4: Terminal velocity capping (upward)** — Velocity never less than TERMINAL_VELOCITY_UP
    - **Property 5: Ghost horizontal position invariant** — ghost.x always <= CANVAS_WIDTH / 3
    - **Property 6: Delta-time proportional movement** — Position delta equals velocity * dt
    - **Validates: Requirements 2.1, 2.2, 2.5, 2.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7**

- [x] 4. Implement scrolling engine and pipe generation
  - [x] 4.1 Implement ScrollingEngine module — pipe generation and movement
    - Create ScrollingEngine with update(), spawnPipePair(), removeOffscreen() methods
    - Initialize pipe pool (prewarm 8 objects) and collectible pool (prewarm 6 objects) at startup
    - Use pool.acquire() when spawning new pipes/collectibles; pool.release() when deactivating off-screen objects
    - Generate pipe pairs at regular spacing (BASE_SPACING = 250px)
    - Position gap center between 20%-80% of playable area using uniform random
    - Move all pipes left at pipeSpeed * dt each frame in Playing state
    - Remove pipes when right edge passes x=0 (return to pool)
    - Do not generate or move pipes in Ready/GameOver states
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.12_

  - [x] 4.2 Write property tests for pipes (Properties 8-10)
    - **Property 8: Pipe gap center within bounds** — Gap center always between 20%-80% of playable area
    - **Property 9: Pipe movement at correct speed** — Pipe x decreases by pipeSpeed * dt each frame
    - **Property 10: Offscreen object removal** — Objects with right edge < 0 are removed
    - **Validates: Requirements 3.2, 3.3, 3.4, 6.5**

- [x] 5. Implement difficulty manager
  - [x] 5.1 Implement DifficultyManager module
    - Create DifficultyManager with evaluate(score) method
    - Compute tier = floor(score / 10)
    - Compute pipeSpeed = min(BASE_SPEED + tier * 15, MAX_SPEED=280) in px/s
    - Compute gapHeight = max(BASE_GAP - tier * 5, MIN_GAP=90) in px
    - Compute pipeSpacing = max(BASE_SPACING - tier * 15, MIN_SPACING=200) in px
    - Return DifficultyParams object with all three values
    - _Requirements: 3.7, 3.8, 3.9_

  - [x] 5.2 Write property test for difficulty (Property 7)
    - **Property 7: Difficulty parameters are correctly computed and clamped** — For any non-negative score, all three values match formula and stay within bounds
    - **Validates: Requirements 3.7, 3.8, 3.9**

- [x] 6. Implement collision detection and scoring
  - [x] 6.1 Implement CollisionDetector module
    - Create CollisionDetector with check() and checkCollectibles() methods
    - Implement circular hitbox for Ghost: center at (ghost.x + width/2, ghost.y + height/2), radius = min(width, height) / 2 * hitboxScale
    - Implement rectangular hitbox for pipes: axis-aligned rects for top and bottom segments
    - Implement circle-vs-rectangle collision: find closest point on rect to circle center, test distance² <= radius²
    - Add broad-phase AABB pre-check: skip precise circle-rect math for pipes not within ghost's x-range (±pipe.width)
    - Detect floor collision: ghostCenterY + radius >= canvasHeight - hudHeight
    - Detect ceiling collision: ghostCenterY - radius <= 0
    - Return CollisionResult with collided flag and type
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.2 Write property test for collision (Property 11)
    - **Property 11: Circle-vs-Rectangle collision detection correctness** — Circle overlapping rect always detected (distance² <= radius²); boundary violations always detected (ceiling: cy - r <= 0, floor: cy + r >= canvasHeight - hudHeight)
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [x] 6.3 Implement ScoreManager module
    - Create ScoreManager with increment(), checkPipePass(), checkCollectiblePickup(), reset(), saveHighScore(), loadHighScore()
    - Award 1 point when ghost.x passes pipe trailing edge (mark pipe as scored to prevent double-scoring)
    - Award 5 points on collectible pickup
    - Persist high score to localStorage with graceful fallback
    - Load high score on init with fallback to 0 for corrupt/missing data
    - Update high score on game over: max(current, previous)
    - Reset score to 0 on new game
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.3_

  - [x] 6.4 Write property tests for scoring (Properties 12-14)
    - **Property 12: Pipe pass scoring** — Unscored pipe awards exactly 1 point once; scored pipe awards 0
    - **Property 13: High score is max of current and previous** — After game over, persisted = max(current, previous)
    - **Property 14: HUD format string** — Display exactly matches "Score: {score} | High: {highScore}"
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 7. Checkpoint - Core gameplay mechanics
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement collectibles system
  - [x] 8.1 Implement collectible spawning and movement in ScrollingEngine
    - Add spawnCollectible() method with 30-50% probability per pipe interval
    - Position collectible at horizontal midpoint between consecutive pipe pairs
    - Assign random speed between 50%-150% of base pipe speed
    - Assign opacity correlated with speed (0.4-0.7, slower=lower)
    - Add vertical oscillation animation offset
    - Move collectibles left at their individual speed * dt
    - Remove collectibles when off-screen left
    - Collision takes priority over collectible pickup on same frame
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 8.2 Write property tests for collectibles (Properties 15-16)
    - **Property 15: Collectible spawn position** — Spawns at horizontal midpoint between pipe pairs
    - **Property 16: Collectible speed and opacity constraints** — Speed in 50%-150% range, opacity correlates monotonically with speed
    - **Validates: Requirements 6.1, 6.4, 6.7**

- [x] 9. Implement parallax cloud system
  - [x] 9.1 Implement cloud spawning, layering, and scrolling
    - Create cloud management in ScrollingEngine with spawnCloud() method
    - Implement 3 parallax layers: near (70-90% speed, 0.5-0.7 opacity, 0.8-1.0 scale), mid (40-60% speed, 0.3-0.5 opacity, 0.5-0.7 scale), far (10-30% speed, 0.1-0.3 opacity, 0.2-0.4 scale)
    - Maintain 2-5 clouds per layer at all times
    - Recycle clouds that move off-screen left by spawning new ones off-screen right
    - Continue cloud scrolling in Ready and GameOver states (pipes/collectibles stay frozen)
    - Render clouds as soft white rounded shapes
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 9.2 Write property tests for clouds (Properties 18-20)
    - **Property 18: Cloud layer properties** — Speed, opacity, scale match layer definitions
    - **Property 19: Cloud count invariant** — Each layer has 2-5 clouds after any update
    - **Property 20: Clouds continue scrolling in non-playing states** — Clouds move in Ready/GameOver, pipes don't
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.6, 9.8**

- [x] 10. Implement pause functionality
  - [x] 10.1 Implement pause/resume state handling
    - Wire Escape/P key input to toggle Playing↔Paused state transitions
    - Freeze all positions and velocities when Paused (ghost, pipes, collectibles)
    - Ignore jump inputs (spacebar, click, tap) while Paused
    - Resume from exact pre-pause state on unpause
    - _Requirements: 7.5, 7.6, 7.8, 7.9_

  - [x] 10.2 Write property test for pause (Property 17)
    - **Property 17: Paused state freezes all positions and velocities** — All game object positions/velocities unchanged after update in Paused state
    - **Validates: Requirements 7.6, 7.9**

- [x] 11. Checkpoint - Full game mechanics
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement audio manager
  - [x] 12.1 Implement AudioManager module
    - Create AudioManager with init(), playJump(), playScore(), playGameOver(), startMusic(), pauseMusic(), resumeMusic(), stopMusic()
    - Use AudioContext with pre-decoded AudioBuffers for sound effects (low latency)
    - Load jump.wav and game_over.wav as audio buffers
    - Generate scoring sound procedurally via oscillator (short beep)
    - Use HTMLAudioElement for looping background music at 20-40% volume
    - Resume AudioContext on first user interaction (autoplay policy)
    - Handle AudioContext not supported: fallback to HTMLAudioElement
    - Silently catch playback failures; game continues without sound
    - _Requirements: 2.3, 4.4, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 12.2 Write unit tests for AudioManager
    - Mock AudioContext to verify correct methods called on game events
    - Test graceful fallback when AudioContext unavailable
    - Test music pause/resume lifecycle
    - _Requirements: 11.1, 11.3, 11.5_

- [x] 13. Implement particle system and visual effects
  - [x] 13.1 Implement ParticleSystem module
    - Create ParticleSystem with update(), emitTrail(), emitBurst(), render() methods
    - Initialize particle pool (prewarm 100 objects) at startup
    - Use pool.acquire() when emitting; pool.release() when particle lifespan expires
    - Emit 3-8 trail particles per frame behind ghost during Playing state
    - Each particle: small circle (2-5px radius), opacity 0.3-0.6, drifts left/down, fades over 200-500ms
    - Emit 5-10 burst particles in downward fan on jump input
    - Use white/light-blue color for particles
    - Only emit in Playing state; stop in Ready/GameOver
    - Skip draw calls for particles with opacity below 0.05
    - _Requirements: 11.7, 11.8, 11.9, 11.10_

  - [x] 13.2 Implement screen shake effect
    - Create shake system activated on Game_Over transition
    - Offset canvas rendering origin by random values between -3 and +3 pixels on both axes
    - Duration: 200-400ms, decreasing intensity over time
    - _Requirements: 11.6_

  - [x] 13.3 Implement score popup system
    - Create ScorePopup objects on score increment showing "+1" or "+5"
    - Position near ghost, animate upward, fade out over 500-1000ms
    - Remove popups when lifespan expired
    - _Requirements: 5.8_

- [x] 14. Implement renderer
  - [x] 14.1 Implement Renderer module with full draw pipeline
    - Create Renderer with draw() method taking ctx and full game state
    - Render in correct z-order: background → far clouds → mid clouds → near clouds → pipes → collectibles → particle trail → ghost sprite → score popups → HUD bar → overlays → screen shake offset
    - Batch pipe rendering: use single beginPath() with multiple rect() calls and one fill() for all pipes (same fillStyle)
    - Batch particle rendering: group by opacity range, set globalAlpha once per group
    - Pre-render static HUD background bar to an offscreen canvas at init; stamp via drawImage() each frame
    - Minimize canvas state switches by grouping draws that share fillStyle/globalAlpha/font
    - Render pipes as green rectangles with darker outline (2px+)
    - Render HUD as dark bar at bottom (40px height) with "Score: X | High: X" in monospace font (14px+)
    - Render collectibles as white rounded rectangles with oscillation animation
    - Render ghost using preloaded ghosty.png sprite (40x40px)
    - Apply screen shake transform offset when active
    - _Requirements: 1.3, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 14.2 Implement overlay screens (Ready, Paused, GameOver)
    - Ready screen: ghost at center, start prompt text, high score display
    - Paused screen: semi-transparent dark overlay, centered "Paused" text, resume prompt
    - GameOver screen: final score, high score, "New High Score!" indicator if applicable, restart prompt
    - _Requirements: 1.2, 7.3, 7.7, 7.10_

- [x] 15. Implement asset loading and game loop
  - [x] 15.1 Implement asset preloader
    - Load ghosty.png via Image element
    - Load jump.wav and game_over.wav via fetch + AudioContext.decodeAudioData
    - Use Promise.all with 10-second timeout (Promise.race)
    - Track which assets failed and display error on canvas if any fail
    - Only transition to Ready state after all assets loaded successfully
    - _Requirements: 1.4, 1.5_

  - [x] 15.2 Implement GameLoop orchestrator
    - Create GameLoop with start(), stop(), tick(timestamp) methods
    - Calculate delta-time between frames, clamp to max 33ms
    - Call subsystems in deterministic order: input → state → physics → scroll → collision → difficulty → score → particles → render
    - Manage requestAnimationFrame lifecycle
    - Fallback to setTimeout(fn, 16) if requestAnimationFrame unavailable
    - _Requirements: 1.3, 7.2_

  - [x] 15.3 Wire all subsystems together
    - Connect InputHandler events to StateManager transitions
    - Connect PhysicsEngine to ghost state updates
    - Connect ScrollingEngine to pipe/collectible/cloud movement
    - Connect CollisionDetector results to state transitions and audio triggers
    - Connect ScoreManager to HUD updates and popup creation
    - Connect DifficultyManager output to ScrollingEngine parameters
    - Connect AudioManager to game events (jump, score, game over, pause)
    - Connect ParticleSystem to ghost movement and jump events
    - Handle game reset on GameOver→Ready transition (reset all state)
    - _Requirements: All_

- [x] 16. Final checkpoint - Complete game integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The game is a single index.html file — all JavaScript is embedded, no build step required
- Test files should be in a separate `tests/` directory using Vitest + fast-check
- For testability, game subsystems should be implemented as exportable functions/objects even though the main game is a single file
- All tunable parameters live in a single centralized CONFIG object — subsystems read from CONFIG rather than using hardcoded magic numbers
- URL query parameter overrides (dot-notation, e.g., `?physics.gravity=0.3`) allow rapid playtesting without editing source; different tuning profiles can be bookmarked

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "5.1"] },
    { "id": 2, "tasks": ["2.3", "3.1", "5.2"] },
    { "id": 3, "tasks": ["3.2", "4.1", "6.1", "6.3"] },
    { "id": 4, "tasks": ["4.2", "6.2", "6.4", "8.1"] },
    { "id": 5, "tasks": ["8.2", "9.1", "10.1"] },
    { "id": 6, "tasks": ["9.2", "10.2", "12.1", "13.1", "13.2", "13.3"] },
    { "id": 7, "tasks": ["12.2", "14.1", "14.2"] },
    { "id": 8, "tasks": ["15.1", "15.2"] },
    { "id": 9, "tasks": ["15.3"] }
  ]
}
```
