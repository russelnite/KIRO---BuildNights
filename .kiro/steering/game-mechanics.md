# Game Mechanics — Flappy Kiro

## Authoritative Values

All numeric values come from `game-config.json`. This file documents the algorithms and patterns.

---

## Physics Constants (per-second units, multiply by dt)

| Constant | Value | Unit | Purpose |
|----------|-------|------|---------|
| Gravity | 800 | px/s² | Constant downward acceleration |
| Jump Velocity | -300 | px/s | Instant upward velocity on input |
| Terminal Velocity Down | 600 | px/s | Max falling speed |
| Terminal Velocity Up | -400 | px/s | Max rising speed |
| Wall/Pipe Speed | 120 | px/s | Base horizontal scroll speed |
| Max Dt | 0.033 | seconds | Frame cap to prevent physics explosion |

---

## Ghosty Movement Physics

### Gravity Simulation

```javascript
// Every frame in Playing state:
ghost.velocity += CONFIG.physics.gravity * dt;   // accelerate downward
ghost.velocity = clamp(ghost.velocity, TERM_UP, TERM_DOWN);  // cap speed
ghost.y += ghost.velocity * dt;                  // update position
```

### Jump Response

```javascript
// On jump input (immediate override, no deceleration required):
ghost.velocity = CONFIG.physics.jumpVelocity;  // -300 px/s (upward)
```

- Jump completely replaces current velocity — no momentum blending
- This gives snappy, predictable control
- Terminal velocity up (-400) prevents stacking jumps beyond control

### Input Handling Responsiveness

- Inputs are buffered as boolean flags, consumed on poll (one per frame)
- Jump inputs: Spacebar, mouse click, touch tap
- Pause inputs: Escape, P key (separate buffer to avoid jump-on-resume)
- Input latency target: < 1 frame (16.6ms)
- Audio plays on same frame as input for perceptual immediacy

### Delta-Time Interpolation

```javascript
// All movement uses dt in seconds for frame-rate independence:
const dt = Math.min((timestamp - lastTimestamp) / 1000, CONFIG.canvas.maxDt);
// Position change is always: velocity * dt
// This ensures identical behavior at 30fps and 60fps
```

---

## Wall/Pipe Generation Algorithms

### Spawn Logic

```javascript
// Pipes spawn when distance traveled exceeds spacing threshold:
pipeTimer += pipeSpeed * dt;
if (pipeTimer >= difficulty.pipeSpacing) {
  pipeTimer = 0;
  spawnNewPipe();
}
```

### Gap Positioning

```javascript
// Gap center: random between 20%-80% of playable height
const playableH = canvasHeight - hudHeight;
const minY = playableH * 0.2;
const maxY = playableH * 0.8;
const gapCenterY = minY + Math.random() * (maxY - minY);
```

### Pipe Structure

- Each pipe pair has: x position, gapCenterY, gapHeight, scored flag
- Top pipe: rect from y=0 to gapCenterY - gapHeight/2
- Bottom pipe: rect from gapCenterY + gapHeight/2 to canvas bottom (above HUD)
- Width: 60px constant
- Movement: x -= pipeSpeed * dt each frame

### Off-screen Cleanup

- Remove pipes when `pipe.x + pipeWidth < 0`
- Remove collectibles when `collectible.x + width < 0`

---

## Collision Detection Patterns

### Ghost Hitbox — Circle

```javascript
// Ghost collision shape: circle centered on sprite
const cx = ghost.x + ghostWidth / 2;
const cy = ghost.y + ghostHeight / 2;
const r = CONFIG.ghost.hitboxRadius;  // 12px
```

### Pipe Hitbox — Axis-Aligned Rectangles

```javascript
// Each pipe pair produces two rects:
const topRect = { x: pipe.x, y: 0, w: pipeWidth, h: gapCenterY - gapHeight/2 };
const botRect = { x: pipe.x, y: gapCenterY + gapHeight/2, w: pipeWidth, h: canvasH - botY };
```

### Circle-vs-Rectangle Algorithm

```javascript
function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) <= (r * r);
}
```

### Broad-Phase Optimization

```javascript
// Skip pipes clearly not near ghost:
if (pipe.x > ghostCx + r + pipeWidth) continue;  // pipe far ahead
if (pipe.x + pipeWidth < ghostCx - r) continue;  // pipe far behind
// Only run circle-rect math for pipes in range
```

### Boundary Detection

```javascript
// Floor: ghost circle bottom touches HUD bar
if (cy + r >= canvasHeight - hudHeight) → collision (floor)
// Ceiling: ghost circle top touches canvas top
if (cy - r <= 0) → collision (ceiling)
```

### Collision Priority

- Pipe/boundary collision checked BEFORE collectible pickup
- If both happen same frame: game over, no bonus points awarded

---

## Scoring System Patterns

### Pipe Pass Detection

```javascript
// Score when ghost's right edge passes pipe's right edge:
if (!pipe.scored && ghostRight > pipe.x + pipeWidth) {
  pipe.scored = true;  // prevent double-scoring
  score += 1;
}
```

### Collectible Pickup

- Award 5 bonus points on circle-rect overlap with collectible
- Mark collectible as collected (remove from scene)
- Only checked if no pipe/boundary collision same frame

### High Score Persistence

```javascript
// Save: localStorage.setItem('flappyKiroHigh', score)
// Load: parseInt(localStorage.getItem('flappyKiroHigh')) || 0
// Fallback: if localStorage throws, default to 0, continue without persistence
```

### Difficulty Progression

```javascript
const tier = Math.floor(score / 10);
pipeSpeed = Math.min(baseSpeed + tier * 15, maxSpeed);     // 120 → 280 px/s
gapHeight = Math.max(baseGap - tier * 5, minGap);         // 140 → 90 px
pipeSpacing = Math.max(baseSpacing - tier * 15, minSpacing); // 350 → 200 px
```

- Difficulty recalculated every frame based on current score
- All three parameters tighten simultaneously
- Caps prevent impossible gameplay
