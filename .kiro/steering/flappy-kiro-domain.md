# Flappy Kiro Domain Knowledge

## Game State Management

### Four States (exclusive, no overlap)

```
Ready → Playing → Paused → Playing → GameOver → Ready (cycle)
```

| State | Entry Condition | Exit Condition |
|-------|----------------|----------------|
| Ready | Page load / restart from GameOver | Jump input |
| Playing | Jump input from Ready | Pause input OR collision |
| Paused | Pause input from Playing | Pause input |
| GameOver | Collision detected in Playing | Jump input |

### State-Dependent System Behavior

| System | Ready | Playing | Paused | GameOver |
|--------|-------|---------|--------|----------|
| Physics | Off | Active | Frozen | Off |
| Pipe scrolling | Off | Active | Frozen | Off |
| Collectible scrolling | Off | Active | Frozen | Off |
| Cloud scrolling | Active | Active | Frozen | Active |
| Particle emission | Off | Active | Off | Off |
| Input (jump) | Starts game | Jumps | Ignored | Restarts |
| Input (pause) | Ignored | Pauses | Resumes | Ignored |

### Reset on Restart (GameOver → Ready)

```javascript
function resetGameState() {
  ghost.y = CONFIG.ghost.startY;  // 320
  ghost.velocity = 0;
  pipes = [];
  collectibles = [];
  particles = [];
  scorePopups = [];
  score = 0;
  isNewHighScore = false;
  pipeTimer = 0;
  difficulty = DifficultyManager.evaluate(0);
  // Clouds persist (not reset, just keep scrolling)
}
```

---

## Score Persistence

### High Score Tracking

```javascript
// Load on game init:
function loadHighScore() {
  try { return parseInt(localStorage.getItem('flappyKiroHigh')) || 0; }
  catch (e) { return 0; }
}

// Save on game over (only if new record):
function saveHighScore(score) {
  try { localStorage.setItem('flappyKiroHigh', String(score)); }
  catch (e) { /* quota exceeded or unavailable — silently continue */ }
}
```

### Score Update Flow

1. Ghost right edge passes pipe right edge → +1 point, mark pipe scored
2. Ghost circle overlaps collectible → +5 points, mark collected
3. On GameOver: compare score to highScore, update if greater
4. High score persists across sessions via localStorage
5. If localStorage unavailable: default to 0, no persistence

### Display Format

- HUD: `"Score: {n}"` left-aligned, `"High: {n}"` right-aligned
- GameOver overlay: final score + best score + "NEW HIGH SCORE!" if applicable
- Ready screen: "Best: {n}" below start prompt

---

## Difficulty Progression

### Tier System

```javascript
const tier = Math.floor(score / 10);  // Every 10 points = 1 tier
```

### Parameter Scaling

| Parameter | Base | Change/Tier | Min/Max | Effect |
|-----------|------|-------------|---------|--------|
| Pipe Speed | 120 px/s | +15/tier | max 280 | Faster scrolling |
| Gap Height | 140 px | -5/tier | min 90 | Narrower gaps |
| Pipe Spacing | 350 px | -15/tier | min 200 | Closer pipes |

### Difficulty Curve

```
Score 0:  speed=120, gap=140, spacing=350 (easy)
Score 10: speed=135, gap=135, spacing=335
Score 20: speed=150, gap=130, spacing=320
Score 50: speed=195, gap=115, spacing=275
Score 100: speed=270, gap=90,  spacing=200 (near max)
Score 110: speed=280, gap=90,  spacing=200 (capped)
```

---

## Obstacle Generation Rules

### Pipe Pair Spawning

- Trigger: distance traveled since last pipe >= current pipeSpacing
- Gap center: uniform random between 20%-80% of playable height
- Gap height: current difficulty gapHeight value
- Initial X: canvas right edge (480px)
- Pipe width: constant 60px

### Collectible Spawning

- Trigger: 40% probability per pipe pair spawn
- Position X: midpoint between previous pipe trailing edge and new pipe leading edge
- Position Y: random within 20%-80% of playable height
- Speed: 50%-150% of current pipe speed (parallax depth effect)
- Opacity: correlates with speed (faster = more opaque = appears closer)

### Removal Rules

- Pipes: remove when right edge < 0 (fully off-screen left)
- Collectibles: remove when collected OR right edge < 0
- Particles: remove when age > lifespan
- Score popups: remove when age > 700ms

---

## Ghosty Behavior Patterns

### Position Rules

- X position: FIXED at 120px (never changes, world scrolls past)
- Y position: controlled by physics (gravity + jump velocity)
- Velocity: vertical only (positive = falling, negative = rising)

### Collision Responses

| Collision Type | Response |
|---------------|----------|
| Pipe (top or bottom) | Immediate GameOver, freeze position |
| Floor (HUD bar) | Immediate GameOver, freeze position |
| Ceiling (top edge) | Immediate GameOver, freeze position |
| Collectible | Award +5, remove collectible, continue playing |

### Game Over Sequence

1. StateManager transitions to 'game_over'
2. Ghost freezes at collision position (no more physics)
3. Screen shake activates (300ms, ±3px)
4. game_over.wav plays
5. High score check and save
6. GameOver overlay renders
7. Wait for jump input to restart

---

## Game Session Management

### Session Lifecycle

```
[Page Load] → Asset Loading → Ready → Playing ↔ Paused → GameOver → Ready → ...
```

### Asset Requirements

| Asset | Path | Required | Fallback |
|-------|------|----------|----------|
| Ghost sprite | assets/ghosty.png | No | White circle |
| Jump sound | assets/jump.wav | No | Silent |
| GameOver sound | assets/game_over.wav | No | Silent |

### Initialization Order

1. Parse CONFIG + URL overrides
2. Set up canvas + resize handler
3. Load assets (non-blocking, with fallbacks)
4. Initialize InputHandler (attach DOM listeners)
5. Create initial gameState
6. Initialize clouds
7. Start game loop (requestAnimationFrame)

### Frame Budget

- Target: 60 FPS (16.6ms per frame)
- All subsystems must complete within 12.5ms total
- 4ms headroom for browser overhead and GC
- If frame exceeds budget: dt capped at 33ms prevents cascade
