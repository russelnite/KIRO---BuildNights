# Ghosty Character Specifications

## Sprite Sheet Overview

| Property | Value |
|----------|-------|
| Frame Size | 32×32 px |
| Sprite Sheet Layout | Horizontal strip |
| Hitbox Shape | Circle |
| Hitbox Radius | 12 px |
| Hitbox Offset | Centered on sprite |
| Color Palette | White body, light blue glow, dark eyes |
| Art Style | Retro pixel-art with soft edges |

## Sprite Dimensions

```
┌──────────────────────────────┐
│         32px wide            │
│  ┌────────────────────────┐  │
│  │                        │  │  32px
│  │    ○ ○   (eyes)        │  │  tall
│  │   ╭─────╮  (body)     │  │
│  │   │     │             │  │
│  │   ╰─┬─┬─╯  (tail)    │  │
│  └────────────────────────┘  │
└──────────────────────────────┘

Hitbox (centered):
    Center: (16, 16) relative to sprite origin
    Radius: 12px
    Coverage: ~56% of sprite area (forgiving feel)
```

## Animation States

### Idle State
- **Frames:** 2
- **Frame Duration:** 400ms per frame
- **Description:** Gentle vertical bob (±2px) with subtle eye blink on frame 2
- **Used When:** Game_State is Ready
- **Loop:** Yes

| Frame | Description |
|-------|-------------|
| idle_0 | Neutral position, eyes open |
| idle_1 | Slight upward shift (+2px), eyes half-closed (blink) |

### Flap State
- **Frames:** 3
- **Frame Duration:** 80ms per frame (fast cycle)
- **Description:** Wing/body compression on jump, expand on ascent, return to neutral
- **Used When:** Game_State is Playing, triggered on jump input
- **Loop:** No (plays once, returns to idle_0 as base)

| Frame | Description |
|-------|-------------|
| flap_0 | Body compressed vertically (squash: 34×28px drawn area) |
| flap_1 | Body stretched vertically (stretch: 28×36px drawn area) |
| flap_2 | Return to neutral shape (32×32px) |

### Death State
- **Frames:** 4
- **Frame Duration:** 100ms per frame
- **Description:** Spin and fade effect on collision
- **Used When:** Game_State transitions to Game_Over
- **Loop:** No (holds on last frame)

| Frame | Description |
|-------|-------------|
| death_0 | Eyes become X shapes, slight rotation (15°) |
| death_1 | Full rotation (45°), opacity 0.8 |
| death_2 | Further rotation (90°), opacity 0.6 |
| death_3 | Rotation (135°), opacity 0.4, hold here |

## Sprite Sheet Layout

```
┌────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┐
│ idle_0 │ idle_1 │ flap_0 │ flap_1 │ flap_2 │death_0 │death_1 │death_2 │death_3 │
│  32×32 │  32×32 │  32×32 │  32×32 │  32×32 │  32×32 │  32×32 │  32×32 │  32×32 │
└────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┘
 0        32       64       96       128      160      192      224      256
Total sheet: 288×32 px
```

## Implementation Notes

### Current Asset (ghosty.png)
The existing `ghosty.png` is a single static sprite. For MVP:
- Use `ghosty.png` directly for all states (no animation)
- Apply rotation transforms for death state programmatically
- Apply scale transforms for squash/stretch in flap state programmatically

### Future Enhancement (Sprite Sheet)
If a full sprite sheet is created:
- Load as single image, draw sub-regions using `drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)`
- Track current animation state and frame index
- Use elapsed time to advance frames

### Hitbox Visualization (Debug Mode)
When URL param `?debug=true` is set:
- Draw a red circle overlay (radius 12px, opacity 0.3) centered on the ghost
- Useful for tuning collision feel

## Rendering Specifications

| Property | Value |
|----------|-------|
| Render Position | Centered on ghost.x, ghost.y |
| Rotation Pivot | Center of sprite (16, 16) |
| Interpolation | `imageSmoothingEnabled = false` (pixel-art crisp) |
| Z-Order | Above particles, below HUD |
