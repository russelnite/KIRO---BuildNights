# Game Coding Standards — Flappy Kiro

## Overview

Standards and patterns for implementing Flappy Kiro as a single-file HTML5 Canvas game.
All code lives in one `index.html` with embedded `<script>`. No build tools, no bundler.
Reference `game-config.json` for all numeric parameters.
Reference `.kiro/specs/flappy-kiro/design.md` for architecture details.

---

## JavaScript Conventions

### Naming

| Type | Convention | Example |
|------|-----------|---------|
| Constants (CONFIG) | camelCase nested objects | `CONFIG.physics.gravity` |
| Module/subsystem objects | PascalCase | `PhysicsEngine`, `ScrollingEngine` |
| Methods | camelCase | `applyJump()`, `checkPipePass()` |
| Private/internal helpers | underscore prefix | `_clamp()`, `_resetGhost()` |
| Boolean flags | `is`/`has`/`should` prefix | `isPlaying`, `hasCollided` |
| Event handlers | `on` prefix | `onKeyDown`, `onTouchStart` |
| Pool objects | noun matching entity | `pipePool`, `particlePool` |

### Module Pattern

Each subsystem is an object literal with a clear interface.

```javascript
// GOOD — Object literal module
const PhysicsEngine = {
  update(ghost, dt, state) { /* ... */ },
  applyJump(ghost) { /* ... */ }
};

// GOOD — Factory if internal state needed
function createAudioManager() {
  let ctx = null;
  let buffers = {};
  return {
    init() { /* ... */ },
    playJump() { /* ... */ }
  };
}

// AVOID — Classes for stateless utilities
// class MathUtils { static clamp() {} }  ← overkill
```

### Code Organization (top to bottom in script)

1. CONFIG object (all tunable parameters)
2. `applyUrlOverrides()` utility
3. ObjectPool implementation
4. Data model / initial state factory
5. Subsystem modules (InputHandler, StateManager, PhysicsEngine, etc.)
6. Renderer
7. GameLoop orchestrator
8. Asset loader + bootstrap (`window.onload`)

### General Rules

- No `var`. Use `const` by default, `let` only when reassignment needed.
- No global mutable state outside the single `gameState` object.
- All numeric values come from CONFIG — zero magic numbers in logic.
- Functions do one thing. If a function exceeds 30 lines, split it.
- Prefer early returns over deep nesting.
- Comment the "why", not the "what". Code should be self-documenting.

---

## Game Loop Structure

### Frame Pipeline (deterministic order)

```javascript
function tick(timestamp) {
  // 1. Calculate delta-time (seconds), clamp to prevent spiral-of-death
  const dt = Math.min((timestamp - lastTimestamp) / 1000, CONFIG.canvas.maxDt);
  lastTimestamp = timestamp;

  // 2. Input (poll and consume buffered flags)
  const jump = InputHandler.pollJump();
  const pause = InputHandler.pollPause();

  // 3. State transitions (based on input + current state)
  StateManager.processTransitions(jump, pause);

  // 4. Physics (apply gravity, jump, clamp velocity, update position)
  PhysicsEngine.update(gameState.ghost, dt, StateManager.currentState);

  // 5. Scrolling (move pipes, collectibles, clouds; spawn/recycle)
  ScrollingEngine.update(gameState, dt, gameState.difficulty, StateManager.currentState);

  // 6. Collision detection (circle-vs-rect for pipes, boundary checks)
  const collision = CollisionDetector.check(gameState.ghost, gameState.pipes);

  // 7. Difficulty evaluation
  gameState.difficulty = DifficultyManager.evaluate(gameState.score);

  // 8. Scoring (pipe pass, collectible pickup)
  ScoreManager.update(gameState);

  // 9. Particles (emit trail/burst, age and remove dead)
  ParticleSystem.update(gameState.ghost, dt, StateManager.currentState);

  // 10. Render (single draw call orchestration)
  Renderer.draw(ctx, gameState);

  // 11. Request next frame
  requestAnimationFrame(tick);
}
```

### Rules for Game Loop

- **Never skip steps.** Even if the game is paused, the renderer still runs (frozen scene + overlay).
- **Delta-time in seconds.** All velocity/acceleration values in CONFIG use px/s and px/s² units.
- **Clamp dt.** Max 33ms (0.033s) prevents physics explosion if tab was backgrounded.
- **No async work in the loop.** Asset loading happens before the loop starts.
- **State checks inside subsystems.** Each subsystem checks `state` and no-ops if inappropriate (e.g., PhysicsEngine skips if paused).

---

## Memory Management & Object Pooling

### Object Pool Pattern

```javascript
function createPool(factory, initialSize) {
  const free = [];
  for (let i = 0; i < initialSize; i++) {
    free.push(factory());
  }
  return {
    acquire() {
      return free.length > 0 ? free.pop() : factory();
    },
    release(obj) {
      free.push(obj);
    },
    get freeCount() { return free.length; }
  };
}
```

### Pool Usage Rules

- **Prewarm at init.** Allocate expected max objects upfront (see CONFIG.pools).
- **Never `new` in the game loop.** Always `pool.acquire()`.
- **Reset on acquire, not release.** Keeps release fast (just push to array).
- **Don't shrink pools.** Let them grow if needed; memory is cheap, GC pauses are not.

### What Gets Pooled

| Object | Pool Size | Lifecycle |
|--------|-----------|-----------|
| PipePair | 8 | Spawn right → scroll left → release when off-screen |
| Collectible | 6 | Spawn between pipes → release on pickup or off-screen |
| Particle | 100 | Emit behind ghost → release when lifespan expires |
| ScorePopup | 5 | Spawn on score → release when faded out |
| Cloud | 15 | Spawn right → scroll left → reposition right (recycle, never release) |

### Allocation Rules

- No object creation (`{}`, `[]`, `new`) inside `tick()` or any function called per-frame.
- Pre-allocate reusable temp objects for calculations:
```javascript
// GOOD — reuse temp vectors
const _tempVec = { x: 0, y: 0 };
function getClosestPoint(cx, cy, rect) {
  _tempVec.x = _clamp(cx, rect.x, rect.x + rect.w);
  _tempVec.y = _clamp(cy, rect.y, rect.y + rect.h);
  return _tempVec;
}

// BAD — allocates every frame
function getClosestPoint(cx, cy, rect) {
  return { x: _clamp(...), y: _clamp(...) }; // GC pressure!
}
```

- Avoid `Array.filter()`, `Array.map()` in hot paths (they allocate new arrays). Use in-place iteration with index swapping for removal.

---

## Canvas API Patterns

### Canvas Setup

```javascript
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.canvas.width;   // 480 logical pixels
canvas.height = CONFIG.canvas.height; // 640 logical pixels
ctx.imageSmoothingEnabled = false;    // Pixel-art crisp rendering
```

### Sprite Batching — Minimize State Changes

```javascript
// GOOD — Batch all pipes in one draw call
ctx.fillStyle = CONFIG.pipes.fillColor;
ctx.beginPath();
for (const pipe of activePipes) {
  const topH = pipe.gapCenterY - pipe.gapHeight / 2;
  const botY = pipe.gapCenterY + pipe.gapHeight / 2;
  ctx.rect(pipe.x, 0, pipe.width, topH);
  ctx.rect(pipe.x, botY, pipe.width, CONFIG.canvas.height - botY);
}
ctx.fill();

// Then outlines in a second pass (different strokeStyle)
ctx.strokeStyle = CONFIG.pipes.outlineColor;
ctx.lineWidth = CONFIG.pipes.outlineWidth;
ctx.beginPath();
for (const pipe of activePipes) { /* same rects */ }
ctx.stroke();

// BAD — Setting fillStyle per pipe
for (const pipe of activePipes) {
  ctx.fillStyle = CONFIG.pipes.fillColor; // redundant state change!
  ctx.fillRect(...);
}
```

### Offscreen Canvas for Static Elements

```javascript
// Pre-render HUD background once
const hudCanvas = document.createElement('canvas');
hudCanvas.width = CONFIG.canvas.width;
hudCanvas.height = CONFIG.canvas.hudHeight;
const hudCtx = hudCanvas.getContext('2d');
hudCtx.fillStyle = 'rgba(0,0,0,0.85)';
hudCtx.fillRect(0, 0, hudCanvas.width, hudCanvas.height);

// In render loop — stamp it (fast)
ctx.drawImage(hudCanvas, 0, CONFIG.canvas.height - CONFIG.canvas.hudHeight);
```

### Render Order (Z-index back to front)

1. `ctx.fillRect()` — sky background
2. Far clouds (low opacity, small scale)
3. Mid clouds
4. Near clouds (high opacity, large scale)
5. Pipes (batched fill + stroke)
6. Collectibles (rounded rects with globalAlpha)
7. Particles (grouped by opacity range)
8. Ghost sprite (`drawImage`)
9. Score popups (text with fading alpha)
10. HUD bar (offscreen canvas stamp + text)
11. Overlays (pause/gameover if applicable)
12. Screen shake (applied as `ctx.translate()` before all draws, reset after)

### Screen Shake Implementation

```javascript
// Apply before drawing
if (gameState.shake.active) {
  const progress = gameState.shake.elapsed / gameState.shake.duration;
  const decay = 1 - progress; // intensity decreases over time
  const ox = (Math.random() * 2 - 1) * CONFIG.shake.intensity * decay;
  const oy = (Math.random() * 2 - 1) * CONFIG.shake.intensity * decay;
  ctx.save();
  ctx.translate(ox, oy);
}

// ... all draw calls ...

// Reset after drawing
if (gameState.shake.active) {
  ctx.restore();
}
```

### Animation Frame Handling

```javascript
// Sprite animation (for future sprite sheet support)
function updateAnimation(entity, dt) {
  entity.animTimer += dt * 1000; // convert to ms
  if (entity.animTimer >= entity.frameDuration) {
    entity.animTimer -= entity.frameDuration;
    entity.frameIndex = (entity.frameIndex + 1) % entity.frameCount;
  }
}

// Oscillation for collectibles
function getOscillation(baseY, time, amplitude, frequency) {
  return baseY + Math.sin(time * frequency) * amplitude;
}
```

---

## Collision Detection Algorithms

### Ghost Hitbox — Circle

The ghost uses a circular hitbox (matches sprite shape, feels fair to player).

```javascript
function getGhostCircle(ghost) {
  return {
    cx: ghost.x + ghost.width / 2,
    cy: ghost.y + ghost.height / 2,
    r: Math.min(ghost.width, ghost.height) / 2 * ghost.hitboxScale
  };
}
```

### Pipe Hitbox — Rectangles

Each pipe pair produces two axis-aligned rects:

```javascript
function getPipeRects(pipe) {
  const topH = pipe.gapCenterY - pipe.gapHeight / 2;
  const botY = pipe.gapCenterY + pipe.gapHeight / 2;
  return {
    top: { x: pipe.x, y: 0, w: pipe.width, h: topH },
    bot: { x: pipe.x, y: botY, w: pipe.width, h: CONFIG.canvas.height - botY }
  };
}
```

### Circle-vs-Rectangle Algorithm

```javascript
function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  // Find closest point on rect to circle center
  const closestX = _clamp(cx, rx, rx + rw);
  const closestY = _clamp(cy, ry, ry + rh);

  // Distance squared (avoid sqrt for performance)
  const dx = cx - closestX;
  const dy = cy - closestY;

  return (dx * dx + dy * dy) <= (r * r);
}

function _clamp(val, min, max) {
  return val < min ? min : val > max ? max : val;
}
```

### Broad-Phase Optimization

Skip expensive circle-rect math for pipes that are clearly not near the ghost:

```javascript
function checkCollisions(ghost, pipes) {
  const circle = getGhostCircle(ghost);

  for (const pipe of pipes) {
    // Broad phase: is pipe anywhere near ghost's X range?
    if (pipe.x > circle.cx + circle.r + pipe.width) continue; // pipe ahead
    if (pipe.x + pipe.width < circle.cx - circle.r) continue; // pipe behind

    // Narrow phase: precise circle-rect
    const rects = getPipeRects(pipe);
    if (circleRectCollision(circle.cx, circle.cy, circle.r,
        rects.top.x, rects.top.y, rects.top.w, rects.top.h)) {
      return { collided: true, type: 'pipe' };
    }
    if (circleRectCollision(circle.cx, circle.cy, circle.r,
        rects.bot.x, rects.bot.y, rects.bot.w, rects.bot.h)) {
      return { collided: true, type: 'pipe' };
    }
  }

  // Boundary checks (floor and ceiling)
  if (circle.cy + circle.r >= CONFIG.canvas.height - CONFIG.canvas.hudHeight) {
    return { collided: true, type: 'floor' };
  }
  if (circle.cy - circle.r <= 0) {
    return { collided: true, type: 'ceiling' };
  }

  return { collided: false, type: null };
}
```

### Collectible Collision (Circle-vs-Rect)

Same algorithm, but collectibles are removed on hit rather than ending the game:

```javascript
function checkCollectibles(ghost, collectibles) {
  const circle = getGhostCircle(ghost);
  const collected = [];
  for (const c of collectibles) {
    if (c.collected) continue;
    if (circleRectCollision(circle.cx, circle.cy, circle.r,
        c.x, c.y, c.width, c.height)) {
      c.collected = true;
      collected.push(c);
    }
  }
  return collected;
}
```

---

## State Management

### State Machine Pattern

```javascript
const StateManager = {
  currentState: 'ready', // 'ready' | 'playing' | 'paused' | 'game_over'

  // Valid transitions (source → allowed targets)
  _transitions: {
    ready: ['playing'],
    playing: ['paused', 'game_over'],
    paused: ['playing'],
    game_over: ['ready']
  },

  transition(newState) {
    if (this._transitions[this.currentState].includes(newState)) {
      this.currentState = newState;
      return true;
    }
    return false; // invalid transition, silently reject
  },

  isPlaying() { return this.currentState === 'playing'; },
  isPaused() { return this.currentState === 'paused'; },
  isReady() { return this.currentState === 'ready'; },
  isGameOver() { return this.currentState === 'game_over'; }
};
```

### State-Dependent Behavior Rules

| State | Physics | Scrolling | Input (Jump) | Input (Pause) | Clouds |
|-------|---------|-----------|--------------|---------------|--------|
| Ready | Frozen | Frozen | Start game | — | Scroll |
| Playing | Active | Active | Jump | Pause | Scroll |
| Paused | Frozen | Frozen | Ignored | Resume | Frozen |
| Game Over | Frozen | Frozen | Restart | — | Scroll |

### State Transition Side Effects

On each transition, trigger associated actions:

```javascript
function processTransitions(jumpInput, pauseInput) {
  const state = StateManager.currentState;

  if (state === 'ready' && jumpInput) {
    StateManager.transition('playing');
    AudioManager.startMusic();
  }
  else if (state === 'playing' && pauseInput) {
    StateManager.transition('paused');
    AudioManager.pauseMusic();
  }
  else if (state === 'paused' && pauseInput) {
    StateManager.transition('playing');
    AudioManager.resumeMusic();
  }
  else if (state === 'game_over' && jumpInput) {
    StateManager.transition('ready');
    _resetGameState();
    AudioManager.stopMusic();
  }
  // playing → game_over happens via collision detection, not input
}
```

### Single Source of Truth

- `gameState` is THE state. No shadow copies, no derived state objects.
- Subsystems read from `gameState` and mutate it in place (no immutable patterns — this is a game, perf matters).
- Only the game loop calls subsystems. Subsystems never call each other directly.

---

## Game Architecture — Modular Systems

### System Boundaries

Each subsystem has:
- **Clear inputs** (what it reads from gameState)
- **Clear outputs** (what it mutates on gameState)
- **No cross-system calls** (only the game loop orchestrates)

```
InputHandler    → reads: DOM events      → writes: buffered flags
StateManager    → reads: input flags     → writes: currentState
PhysicsEngine   → reads: ghost, dt       → writes: ghost.velocity, ghost.y
ScrollingEngine → reads: pipes, clouds   → writes: positions, spawn/remove
CollisionDetector → reads: ghost, pipes  → returns: CollisionResult
DifficultyManager → reads: score         → returns: DifficultyParams
ScoreManager    → reads: ghost, pipes    → writes: score, highScore
ParticleSystem  → reads: ghost, dt       → writes: particles array
AudioManager    → reads: events          → writes: nothing (side effects only)
Renderer        → reads: everything      → writes: nothing (draws to canvas)
```

### Event Handling Pattern

No custom event emitter system. Use direct function calls from the game loop:

```javascript
// GOOD — Direct calls, predictable order
if (collision.collided) {
  StateManager.transition('game_over');
  AudioManager.playGameOver();
  gameState.shake.active = true;
  gameState.shake.elapsed = 0;
  ScoreManager.saveHighScore();
}

// AVOID — Event emitter (adds indirection, harder to debug)
// eventBus.emit('collision', { type: 'pipe' });
```

### Why No Event Bus

- Game has <12 subsystems — direct calls are clearer
- Execution order matters (score before render, physics before collision)
- Event buses hide control flow and make debugging state bugs harder
- Performance: no listener array iteration per event

### Subsystem Initialization Order

```javascript
// In bootstrap (after assets load)
const audioManager = createAudioManager();
await audioManager.init();
InputHandler.init(canvas);
// Pools prewarm
const pipePool = createPool(createPipePair, CONFIG.pools.pipes);
const particlePool = createPool(createParticle, CONFIG.pools.particles);
// ... etc
// Start loop
requestAnimationFrame(tick);
```

---

## Performance Optimization Guidelines

### Target: 60 FPS (16.6ms per frame budget)

| Phase | Budget |
|-------|--------|
| Input + State | < 0.5ms |
| Physics | < 0.5ms |
| Scrolling + Pooling | < 1.0ms |
| Collision Detection | < 1.0ms |
| Difficulty + Scoring | < 0.5ms |
| Particle Update | < 1.0ms |
| Render | < 8.0ms |
| **Total** | **< 12.5ms** (4ms headroom) |

### Rules

- Zero allocations per frame — use object pools for all spawned entities.
- Batch Canvas draw calls by shared state (fillStyle, globalAlpha).
- Use offscreen canvas for static elements (HUD bar).
- Broad-phase collision skip: only check pipes within ghost's x-range.
- Skip particle draws when opacity < 0.05.
- Delta-time in seconds. All CONFIG values use px/s and px/s².
- `game-config.json` is the authoritative source of truth for all numeric values.
- Clamp dt at 0.033s max to prevent physics explosion after tab-away.
