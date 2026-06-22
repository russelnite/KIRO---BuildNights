/**
 * AudioManager — Handles sound effect playback and background music.
 *
 * Uses AudioContext with pre-decoded AudioBuffers for low-latency sound effects.
 * Uses HTMLAudioElement for looping background music (placeholder — no music asset).
 * Generates scoring sound procedurally via oscillator (short sine beep).
 * Resumes AudioContext on first user interaction (autoplay policy).
 * Silently catches all playback failures — game continues without sound.
 *
 * @param {object} [config] - Optional config override (defaults to global CONFIG.audio)
 * @returns {object} AudioManager interface
 */
function createAudioManager(config) {
  const _config = config || { musicVolume: 0.3, sfxVolume: 1.0 };

  let _audioCtx = null;
  let _jumpBuffer = null;
  let _gameOverBuffer = null;
  let _musicElement = null;
  let _initialized = false;
  let _contextResumed = false;

  /**
   * Attempt to create an AudioContext (with webkit fallback).
   * Returns null if Web Audio API is not supported.
   */
  function _createAudioContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      return new AudioCtx();
    } catch (e) {
      return null;
    }
  }

  /**
   * Fetch and decode an audio file into an AudioBuffer.
   * Returns null on failure (asset missing, decode error, etc.)
   */
  async function _loadBuffer(url) {
    if (!_audioCtx) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await _audioCtx.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (e) {
      return null;
    }
  }

  /**
   * Resume AudioContext on first user interaction (handles autoplay policy).
   * Attaches one-shot listeners for click, touchstart, and keydown.
   */
  function _setupAutoResume() {
    if (!_audioCtx) return;

    const resume = () => {
      if (_audioCtx && _audioCtx.state === 'suspended') {
        _audioCtx.resume().catch(() => {});
      }
      _contextResumed = true;
      // Remove listeners after first interaction
      document.removeEventListener('click', resume);
      document.removeEventListener('touchstart', resume);
      document.removeEventListener('keydown', resume);
    };

    document.addEventListener('click', resume);
    document.addEventListener('touchstart', resume);
    document.addEventListener('keydown', resume);

    // If context is already running, mark as resumed
    if (_audioCtx.state === 'running') {
      _contextResumed = true;
    }
  }

  /**
   * Play an AudioBuffer as a one-shot sound effect.
   */
  function _playBuffer(buffer) {
    if (!_audioCtx || !buffer) return;
    try {
      // Resume context if suspended (belt and suspenders)
      if (_audioCtx.state === 'suspended') {
        _audioCtx.resume().catch(() => {});
      }
      const source = _audioCtx.createBufferSource();
      source.buffer = buffer;

      // Apply SFX volume via gain node
      const gainNode = _audioCtx.createGain();
      gainNode.gain.value = _config.sfxVolume !== undefined ? _config.sfxVolume : 1.0;
      source.connect(gainNode);
      gainNode.connect(_audioCtx.destination);

      source.start(0);
    } catch (e) {
      // Silently fail — game continues without sound
    }
  }

  /**
   * Initialize the AudioManager:
   * - Create AudioContext
   * - Fetch and decode sound assets (jump.wav, game_over.wav)
   * - Set up autoplay policy resume
   * - Set up music element placeholder
   */
  async function init() {
    if (_initialized) return;

    _audioCtx = _createAudioContext();

    if (_audioCtx) {
      _setupAutoResume();

      // Load sound effect buffers in parallel
      const [jumpBuf, gameOverBuf] = await Promise.all([
        _loadBuffer('assets/jump.wav'),
        _loadBuffer('assets/game_over.wav')
      ]);

      _jumpBuffer = jumpBuf;
      _gameOverBuffer = gameOverBuf;
    }

    // Set up music element (placeholder — no actual music asset)
    // Uses HTMLAudioElement for looping background music support
    try {
      _musicElement = new Audio();
      _musicElement.loop = true;
      _musicElement.volume = _config.musicVolume !== undefined ? _config.musicVolume : 0.3;
      // No src set — music is a placeholder until an asset is provided
    } catch (e) {
      _musicElement = null;
    }

    _initialized = true;
  }

  /**
   * Play jump sound effect (low latency via AudioBuffer).
   */
  function playJump() {
    _playBuffer(_jumpBuffer);
  }

  /**
   * Play score sound effect (procedural oscillator — short 880Hz sine beep, ~100ms).
   */
  function playScore() {
    if (!_audioCtx) return;
    try {
      if (_audioCtx.state === 'suspended') {
        _audioCtx.resume().catch(() => {});
      }

      const oscillator = _audioCtx.createOscillator();
      const gainNode = _audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 880; // A5 note

      const volume = _config.sfxVolume !== undefined ? _config.sfxVolume : 1.0;
      gainNode.gain.setValueAtTime(volume * 0.3, _audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(_audioCtx.destination);

      oscillator.start(_audioCtx.currentTime);
      oscillator.stop(_audioCtx.currentTime + 0.1);
    } catch (e) {
      // Silently fail
    }
  }

  /**
   * Play game over sound effect (low latency via AudioBuffer).
   */
  function playGameOver() {
    _playBuffer(_gameOverBuffer);
  }

  /**
   * Start background music (placeholder — no actual music asset).
   */
  function startMusic() {
    if (!_musicElement || !_musicElement.src) return;
    try {
      _musicElement.currentTime = 0;
      _musicElement.play().catch(() => {});
    } catch (e) {
      // Silently fail
    }
  }

  /**
   * Pause background music.
   */
  function pauseMusic() {
    if (!_musicElement) return;
    try {
      _musicElement.pause();
    } catch (e) {
      // Silently fail
    }
  }

  /**
   * Resume background music from paused position.
   */
  function resumeMusic() {
    if (!_musicElement || !_musicElement.src) return;
    try {
      _musicElement.play().catch(() => {});
    } catch (e) {
      // Silently fail
    }
  }

  /**
   * Stop background music and reset to beginning.
   */
  function stopMusic() {
    if (!_musicElement) return;
    try {
      _musicElement.pause();
      _musicElement.currentTime = 0;
    } catch (e) {
      // Silently fail
    }
  }

  return {
    init,
    playJump,
    playScore,
    playGameOver,
    startMusic,
    pauseMusic,
    resumeMusic,
    stopMusic
  };
}

// Export for testing (Node.js/CommonJS environment)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createAudioManager };
}
