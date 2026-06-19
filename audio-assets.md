# Audio Assets Specification

## Overview

All sound effects are designed for a retro arcade feel — short, punchy, and satisfying. Effects are implemented using the Web Audio API for low-latency playback. Background music uses HTMLAudioElement for streaming.

## Sound Effects

### Flap Sound (jump.wav)

| Property | Value |
|----------|-------|
| File | `assets/jump.wav` |
| Duration | 0.1s (100ms) |
| Type | Short whoosh |
| Trigger | Player jump input |
| Latency Target | < 50ms from input |

**Sound Design:**
- Quick upward frequency sweep (200Hz → 600Hz over 60ms)
- Soft white noise burst layered underneath (40ms, low volume)
- Fast attack (5ms), no sustain, short decay (40ms)
- Feels like a small gust of air

**Waveform:**
```
Amplitude
  │  ╱╲
  │ ╱  ╲
  │╱    ╲___
  └──────────── Time
  0   50ms  100ms
```

**Generation (Procedural Fallback):**
```javascript
// If jump.wav unavailable, generate procedurally:
oscillator.type = 'sine';
oscillator.frequency.setValueAtTime(200, t);
oscillator.frequency.exponentialRampToValueAtTime(600, t + 0.06);
gain.gain.setValueAtTime(0.3, t);
gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
```

---

### Score Sound (procedural)

| Property | Value |
|----------|-------|
| File | None (procedurally generated) |
| Duration | 0.2s (200ms) |
| Type | Pleasant chime |
| Trigger | Score increment (pipe pass or collectible) |
| Variation | Collectible pickup is slightly higher pitched |

**Sound Design:**
- Two-tone ascending chime (C5 → E5, 523Hz → 659Hz)
- Sine wave, clean and bright
- Fast attack (5ms), short sustain (80ms), gentle decay (115ms)
- Feels rewarding without being intrusive

**Waveform:**
```
Amplitude
  │  ┌──┐
  │  │  │╲
  │  │  │ ╲
  │ ╱│  │  ╲___
  └──────────────── Time
  0  5ms 85ms  200ms
     C5    E5
```

**Generation:**
```javascript
// Pipe pass chime (C5 → E5)
const osc1 = ctx.createOscillator();
osc1.type = 'sine';
osc1.frequency.setValueAtTime(523, t);        // C5
osc1.frequency.setValueAtTime(659, t + 0.08); // E5
gain.gain.setValueAtTime(0.25, t);
gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

// Collectible pickup variant (E5 → G5, slightly louder)
osc1.frequency.setValueAtTime(659, t);        // E5
osc1.frequency.setValueAtTime(784, t + 0.08); // G5
gain.gain.setValueAtTime(0.3, t);
```

---

### Collision Sound (game_over.wav)

| Property | Value |
|----------|-------|
| File | `assets/game_over.wav` |
| Duration | 0.3s (300ms) |
| Type | Soft thud |
| Trigger | Game_State → Game_Over |
| Accompanies | Screen shake effect |

**Sound Design:**
- Low-frequency impact (80Hz → 40Hz descending)
- Layered with brief noise burst for texture (50ms)
- Medium attack (10ms), no sustain, long decay (240ms)
- Feels like bumping into something soft — not harsh or jarring
- Slightly muffled/filtered to match retro aesthetic

**Waveform:**
```
Amplitude
  │ ╱╲
  │╱  ╲
  │    ╲
  │     ╲
  │      ╲____
  └────────────── Time
  0  10ms     300ms
     80Hz→40Hz
```

**Generation (Procedural Fallback):**
```javascript
// If game_over.wav unavailable:
oscillator.type = 'sine';
oscillator.frequency.setValueAtTime(80, t);
oscillator.frequency.exponentialRampToValueAtTime(40, t + 0.3);
gain.gain.setValueAtTime(0.4, t + 0.01);
gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

// Noise layer
const noiseGain = ctx.createGain();
noiseGain.gain.setValueAtTime(0.15, t);
noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
```

---

## Background Music

| Property | Value |
|----------|-------|
| File | `assets/bg-music.mp3` (optional, not shipped) |
| Duration | 30-60s loop |
| Volume | 20-40% (CONFIG.audio.musicVolume) |
| Type | Chiptune/8-bit ambient loop |
| Playback | HTMLAudioElement with loop=true |

**Design Notes:**
- Light and unobtrusive — should not compete with SFX
- Simple melody, 4-8 bar loop with seamless looping point
- If no music file exists, game runs silently (graceful degradation)
- Pauses when Game_State is Paused, resumes on unpause
- Stops on Game_Over and Ready states

---

## Audio Manager Behavior

| Game Event | Sound | Priority |
|------------|-------|----------|
| Jump input | Flap (0.1s) | High — play immediately, interrupt nothing |
| Pipe passed | Score chime (0.2s) | Medium — can overlap with flap |
| Collectible pickup | Score chime variant (0.2s) | Medium — slightly higher pitch |
| Collision | Thud (0.3s) | High — play immediately |
| Game start | None | — |
| Pause | Music pause | — |
| Resume | Music resume | — |

## Technical Requirements

| Requirement | Implementation |
|-------------|---------------|
| Low latency | Web Audio API AudioBufferSourceNode (pre-decoded) |
| Autoplay policy | Resume AudioContext on first user interaction |
| Fallback | HTMLAudioElement if AudioContext unavailable |
| Error handling | Silently catch; game continues without sound |
| Concurrent SFX | Allow multiple simultaneous (no channel limit for short SFX) |
| Volume control | Master gain node; separate music volume via HTMLAudioElement.volume |
