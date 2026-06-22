# Visual Design — Flappy Kiro

## Sprite Rendering Patterns

### Ghost Character

| Property | Value |
|----------|-------|
| Sprite | `assets/ghosty.png` (fallback: white circle) |
| Dimensions | 32×32 px |
| Position | Fixed X=120, variable Y |
| Rendering | `ctx.drawImage(img, ghost.x, ghost.y, 32, 32)` |
| Smoothing | `imageSmoothingEnabled = false` (pixel-art crisp) |

### Ghosty Animation States (programmatic transforms on single sprite)

**Idle (Ready state):**
- Gentle vertical bob: ±2px, 800ms sine cycle
- `ghost.y = baseY + Math.sin(time * 2.5) * 2`

**Flap (on jump):**
- Squash frame: scale(1.1, 0.85) for 80ms
- Stretch frame: scale(0.9, 1.15) for 80ms
- Return to normal

**Death (GameOver):**
- Rotation: increment 2 rad/s
- Opacity fade: 1.0 → 0.4 over 400ms
- Applied via `ctx.save()` / `ctx.rotate()` / `ctx.globalAlpha`

### Wall/Pipe Textures

```javascript
// Batched pipe rendering (one fill, one stroke pass):
ctx.fillStyle = '#2ecc40';       // green fill
ctx.beginPath();
for (const pipe of pipes) {
  ctx.rect(pipe.x, 0, 60, topH);
  ctx.rect(pipe.x, botY, 60, botH);
}
ctx.fill();

ctx.strokeStyle = '#1a7a28';     // dark green outline
ctx.lineWidth = 2;
ctx.beginPath();
for (const pipe of pipes) { /* same rects */ }
ctx.stroke();
```

---

## Background Parallax Effects

### Three Cloud Layers (back to front)

| Layer | Speed Factor | Opacity | Scale | Depth Feel |
|-------|-------------|---------|-------|------------|
| Far (0) | 20% of pipe speed | 0.2 | 0.3 | Distant, subtle |
| Mid (1) | 50% of pipe speed | 0.4 | 0.6 | Middle ground |
| Near (2) | 80% of pipe speed | 0.6 | 0.9 | Close, prominent |

```javascript
// Cloud rendering (ellipses with layer-appropriate opacity):
ctx.fillStyle = '#ffffff';
for (const cloud of clouds) {
  ctx.globalAlpha = cloud.opacity;
  ctx.beginPath();
  ctx.ellipse(cloud.x + cloud.width/2, cloud.y + cloud.height/2,
              cloud.width/2, cloud.height/2, 0, 0, Math.PI * 2);
  ctx.fill();
}
ctx.globalAlpha = 1;
```

### Cloud Recycling

- When cloud moves off-screen left: reposition off-screen right
- Random new Y position within playable area
- Never destroyed, only repositioned (zero allocation)
- Clouds scroll in Ready/GameOver states (visual interest), freeze on Pause

---

## Canvas Drawing Optimization

### State Change Minimization

```javascript
// GOOD — Group by shared state
ctx.fillStyle = pipeColor;
ctx.beginPath();
// ... all pipe rects ...
ctx.fill();

// BAD — Redundant state changes
for (pipe of pipes) {
  ctx.fillStyle = pipeColor;  // same value every iteration!
  ctx.fillRect(...);
}
```

### Offscreen Canvas for Static Elements

```javascript
// Pre-render HUD background once at init:
const hudBuffer = document.createElement('canvas');
hudBuffer.width = 480; hudBuffer.height = 40;
const hCtx = hudBuffer.getContext('2d');
hCtx.fillStyle = 'rgba(0,0,0,0.85)';
hCtx.fillRect(0, 0, 480, 40);

// Per frame — stamp (fast single drawImage):
ctx.drawImage(hudBuffer, 0, canvasHeight - 40);
```

### Render Order (Z-index, back to front)

1. Sky background (fillRect)
2. Far clouds
3. Mid clouds
4. Near clouds
5. Pipes (batched fill + stroke)
6. Collectibles (rounded rects with oscillation)
7. Particles (grouped by opacity)
8. Ghost sprite
9. Score popups
10. HUD bar (offscreen stamp + text)
11. Screen overlays (pause/gameover)

---

## Particle Effect Guidelines

### Trail Particles

| Property | Value |
|----------|-------|
| Rate | 5 per frame (Playing state only) |
| Shape | Circle (2-5px radius) |
| Color | #b0e0ff (light blue) |
| Opacity | 0.5, fading to 0 over lifespan |
| Lifespan | 200-500ms |
| Movement | Drift left (-30 to -50 px/s) and slightly down |
| Spawn position | Behind ghost (ghost.x, ghost.y + height/2 ± 5px) |

### Burst Particles (on jump)

| Property | Value |
|----------|-------|
| Count | 8 per jump event |
| Shape | Circle (2-8px radius) |
| Color | #b0e0ff |
| Direction | Downward fan (90° ± 35°) |
| Speed | 60-100 px/s |
| Lifespan | 300ms |
| Spawn position | Below ghost center |

### Particle Rendering

```javascript
// Skip invisible particles for performance:
for (const p of particles) {
  if (p.opacity < 0.05) continue;
  ctx.globalAlpha = p.opacity;
  ctx.fillStyle = '#b0e0ff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
}
ctx.globalAlpha = 1;
```

---

## Visual Feedback Patterns

### Screen Shake (on collision/game over)

```javascript
// Before all draws:
if (shake.active) {
  const decay = 1 - shake.elapsed / shakeDuration;
  const ox = (Math.random() * 2 - 1) * shakeIntensity * decay;
  const oy = (Math.random() * 2 - 1) * shakeIntensity * decay;
  ctx.save();
  ctx.translate(ox, oy);
}
// After all draws:
if (shake.active) ctx.restore();
```

- Duration: 300ms
- Intensity: ±3px, decreasing with decay
- Overlays drawn AFTER restore (they don't shake)

### Score Popups

```javascript
// On score: create popup at ghost position
{ x: ghost.x + 32, y: ghost.y, text: '+1', age: 0 }
// Per frame: float upward, fade out
popup.y -= 40 * dt;
popup.opacity = 1 - (popup.age / 700);
// Remove when age > 700ms
```

- Pipe pass: white "+1"
- Collectible: gold "#FFD700" "+5"
- Font: bold 14px monospace

### UI Text Pulsing

```javascript
// "TAP TO PLAY" and "TAP TO RESTART" pulse opacity:
ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 500);
```

---

## Color Palette

| Element | Hex | Usage |
|---------|-----|-------|
| Sky | #87CEEB | Background fill |
| Pipe fill | #2ECC40 | Green columns |
| Pipe outline | #1A7A28 | Dark green border |
| HUD | rgba(0,0,0,0.85) | Bottom bar |
| Text | #FFFFFF | All UI text |
| Particles | #B0E0FF | Trail/burst |
| Collectibles | #FFFFFF | Floating items |
| Score popup (bonus) | #FFD700 | Gold for +5 |
| Pause overlay | rgba(0,0,0,0.6) | Semi-transparent |
