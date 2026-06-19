# UI Mockups & Interface Design

## Screen Layout Overview

All UI renders within the 480×640 logical canvas. Text uses monospace font (14px minimum).
Background elements (clouds) remain animated on all screens.

---

## 1. Main Menu / Ready Screen

```
┌─────────────────────────────────────────┐
│              480 × 640                   │
│                                          │
│         ☁          ☁                     │
│                                          │
│      ┌───────────────────────┐           │
│      │    F L A P P Y        │           │
│      │      K I R O          │           │
│      └───────────────────────┘           │
│                                          │
│              👻                           │
│          (ghosty idle bob)               │
│                                          │
│                                          │
│       ╔═══════════════════╗              │
│       ║   TAP TO PLAY     ║              │
│       ╚═══════════════════╝              │
│                                          │
│                                          │
│        Best: 42                          │
│                                          │
│                                          │
│                                          │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│ Score: 0          │ High: 42            │
└──────────────────────────────────────────┘
```


### Ready Screen Elements

| Element | Position | Style |
|---------|----------|-------|
| Title "FLAPPY KIRO" | Center X, Y = 20% | White, bold, 24px monospace |
| Ghost sprite | Center X, Y = 40% | 32×32, idle animation (bob) |
| "TAP TO PLAY" prompt | Center X, Y = 60% | White, 16px, pulsing opacity |
| High score | Center X, Y = 72% | White, 14px, "Best: {n}" |
| HUD bar | Bottom, full width | Dark bar, 40px height |
| Clouds | Background layers | Animated, continuous scroll |

### Interactions
- **Space / Click / Tap** → Transition to Playing state
- Ghost bobs gently (±2px vertical, 800ms cycle)
- "TAP TO PLAY" pulses opacity (0.5 → 1.0, 1s cycle)

---

## 2. In-Game HUD (Playing State)

```
┌─────────────────────────────────────────┐
│                                          │
│    ☁         ☁                           │
│          ☁                               │
│                                          │
│                     ┌──┐                 │
│                     │  │                 │
│         👻    +1    │  │                 │
│        ~~~~         │  │  ← pipe        │
│                     │  │                 │
│                     └──┘                 │
│               ┌──┐       ┌──┐           │
│               │  │       │  │           │
│               │  │  ☁    │  │           │
│               │  │       │  │           │
│               └──┘       └──┘           │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│ Score: 7          │ High: 42            │
└──────────────────────────────────────────┘
```


### HUD Bar Layout

```
┌──────────────────────────────────────────┐
│  Score: 7                    High: 42    │  ← 40px height
└──────────────────────────────────────────┘
   ↑ 12px left pad               12px right pad ↑
```

| Element | Position | Style |
|---------|----------|-------|
| HUD background | Bottom, 480×40px | rgba(0, 0, 0, 0.85) |
| "Score: N" | Left-aligned, vertically centered | White, 16px monospace |
| "High: N" | Right-aligned, vertically centered | White, 14px monospace |
| Score popup "+1" | Near ghost, animates up | White, 14px, fades over 700ms |
| Score popup "+5" | Near ghost (collectible) | Gold/yellow, 14px, fades |

### In-Game Elements (non-HUD)
- Ghost: fixed at X=120, moves vertically
- Particle trail: behind ghost, white/light-blue circles
- Pipes: green with dark outline, 60px wide
- Collectibles: white rounded rects, floating oscillation
- Clouds: 3 parallax layers, continuous scroll

---

## 3. Paused Screen

```
┌─────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓   P A U S E D   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓  Press ESC to resume  ▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
├──────────────────────────────────────────┤
│ Score: 7          │ High: 42            │
└──────────────────────────────────────────┘
```


### Pause Overlay Elements

| Element | Position | Style |
|---------|----------|-------|
| Dark overlay | Full canvas (480×600, above HUD) | rgba(0, 0, 0, 0.6) |
| "PAUSED" text | Center X, Y = 45% | White, bold, 28px monospace |
| Resume prompt | Center X, Y = 55% | White, 14px, "Press ESC to resume" |
| Game scene | Behind overlay | Frozen in place, still visible |
| HUD bar | Bottom | Unchanged, remains visible |

### Interactions
- **ESC / P** → Resume (transition to Playing)
- All jump inputs (Space/Click/Tap) are **ignored** while paused

---

## 4. Game Over Screen

```
┌─────────────────────────────────────────┐
│                                          │
│    ☁         ☁                           │
│                                          │
│                                          │
│       ┌─────────────────────┐            │
│       │    GAME OVER        │            │
│       └─────────────────────┘            │
│                                          │
│              👻  (death frame)           │
│                                          │
│          ┌─────────────┐                 │
│          │  Score: 12  │                 │
│          │  Best:  42  │                 │
│          └─────────────┘                 │
│                                          │
│       ⭐ NEW HIGH SCORE! ⭐              │
│       (only if score > previous best)    │
│                                          │
│       ╔═══════════════════╗              │
│       ║  TAP TO RESTART   ║              │
│       ╚═══════════════════╝              │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│ Score: 12         │ High: 42            │
└──────────────────────────────────────────┘
```


### Game Over Elements

| Element | Position | Style |
|---------|----------|-------|
| "GAME OVER" title | Center X, Y = 25% | White, bold, 24px monospace |
| Ghost (death state) | Center X, Y = 38% | Rotated, reduced opacity |
| Score panel | Center X, Y = 50% | Semi-transparent box, 14px white |
| "NEW HIGH SCORE!" | Center X, Y = 62% | Gold/yellow, 16px, only if new best |
| "TAP TO RESTART" | Center X, Y = 75% | White, 16px, pulsing opacity |
| HUD bar | Bottom | Final score displayed |
| Clouds | Background | Continue scrolling |
| Pipes | Frozen | Remain in last position |

### Interactions
- **Space / Click / Tap** → Transition to Ready state (full reset)
- Clouds continue scrolling for visual interest
- Screen shake plays on entry (200-400ms)

### New High Score Indicator
- Only displayed when `currentScore > previousHighScore`
- Pulsing gold text with slight scale animation (1.0 → 1.1, 500ms cycle)

---

## 5. Color Palette

| Element | Color | Hex |
|---------|-------|-----|
| Background (sky) | Light blue | #87CEEB |
| Pipes | Green | #2ECC40 |
| Pipe outline | Dark green | #1A7A28 |
| HUD bar | Near-black | rgba(0,0,0,0.85) |
| HUD text | White | #FFFFFF |
| Ghost body | White | #FFFFFF |
| Clouds | White (varied opacity) | #FFFFFF |
| Collectibles | White | #FFFFFF |
| Particles | White/light blue | #FFFFFF / #B0E0FF |
| Score popup (pipe) | White | #FFFFFF |
| Score popup (collectible) | Gold | #FFD700 |
| New high score text | Gold | #FFD700 |
| Pause overlay | Black (60% opacity) | rgba(0,0,0,0.6) |

---

## 6. Typography

| Context | Font | Size | Weight |
|---------|------|------|--------|
| Title | Monospace (system) | 24px | Bold |
| HUD score | Monospace | 16px | Normal |
| Prompts | Monospace | 16px | Normal |
| Score popup | Monospace | 14px | Bold |
| "PAUSED" | Monospace | 28px | Bold |
| High score display | Monospace | 14px | Normal |

**Fallback chain:** `'Courier New', 'Courier', monospace`

---

## 7. Animation Timings

| Animation | Duration | Easing |
|-----------|----------|--------|
| Ghost idle bob | 800ms cycle | Sine wave |
| "TAP TO PLAY" pulse | 1000ms cycle | Sine (opacity 0.5→1.0) |
| Score popup float up | 700ms | Linear position, ease-out opacity |
| New high score pulse | 500ms cycle | Sine (scale 1.0→1.1) |
| Screen shake | 200-400ms | Random offset, decreasing intensity |
| Death rotation | 400ms total | Linear |
