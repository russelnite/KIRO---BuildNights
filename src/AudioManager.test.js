import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Global mocks for browser APIs ---

let mockGainNode;
let mockBufferSource;
let mockOscillator;
let mockAudioContext;
let mockMusicElement;

function createMockGainNode() {
  return {
    gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn()
  };
}

function createMockBufferSource() {
  return {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  };
}

function createMockOscillator() {
  return {
    type: '',
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  };
}

function setupMocks() {
  mockGainNode = createMockGainNode();
  mockBufferSource = createMockBufferSource();
  mockOscillator = createMockOscillator();

  mockAudioContext = {
    state: 'running',
    createBufferSource: vi.fn(() => createMockBufferSource()),
    createOscillator: vi.fn(() => createMockOscillator()),
    createGain: vi.fn(() => createMockGainNode()),
    destination: {},
    decodeAudioData: vi.fn().mockResolvedValue({ duration: 1 }),
    resume: vi.fn().mockResolvedValue(undefined),
    currentTime: 0
  };

  mockMusicElement = {
    loop: false,
    volume: 1,
    src: '',
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    currentTime: 0
  };

  global.window = {
    AudioContext: vi.fn(() => mockAudioContext),
    webkitAudioContext: undefined
  };

  global.document = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };

  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    })
  );

  global.Audio = vi.fn(() => mockMusicElement);
}

// Dynamic import after mocks are set
async function loadModule() {
  // Clear module cache to get fresh import with new mocks
  const mod = await import('./AudioManager.js');
  return mod.createAudioManager;
}

describe('AudioManager', () => {
  let createAudioManager;

  beforeEach(async () => {
    vi.resetModules();
    setupMocks();
    createAudioManager = (await import('./AudioManager.js')).createAudioManager;
  });

  describe('init()', () => {
    it('creates AudioContext and loads buffers', async () => {
      const audio = createAudioManager({ musicVolume: 0.3, sfxVolume: 1.0 });
      await audio.init();

      // AudioContext was created
      expect(global.window.AudioContext).toHaveBeenCalledTimes(1);
      // fetch was called for jump.wav and game_over.wav
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith('assets/jump.wav');
      expect(global.fetch).toHaveBeenCalledWith('assets/game_over.wav');
      // decodeAudioData called for each buffer
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalledTimes(2);
    });

    it('does not re-initialize when called multiple times', async () => {
      const audio = createAudioManager();
      await audio.init();
      await audio.init();

      expect(global.window.AudioContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('playJump()', () => {
    it('creates buffer source and starts playback', async () => {
      const audio = createAudioManager({ musicVolume: 0.3, sfxVolume: 1.0 });
      await audio.init();

      // Track the buffer source created during playJump
      const mockSource = createMockBufferSource();
      const mockGain = createMockGainNode();
      mockAudioContext.createBufferSource.mockReturnValueOnce(mockSource);
      mockAudioContext.createGain.mockReturnValueOnce(mockGain);

      audio.playJump();

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockSource.connect).toHaveBeenCalledWith(mockGain);
      expect(mockGain.connect).toHaveBeenCalledWith(mockAudioContext.destination);
      expect(mockSource.start).toHaveBeenCalledWith(0);
    });
  });

  describe('playScore()', () => {
    it('creates oscillator with 880Hz sine wave', async () => {
      const audio = createAudioManager({ musicVolume: 0.3, sfxVolume: 1.0 });
      await audio.init();

      const mockOsc = createMockOscillator();
      const mockGain = createMockGainNode();
      mockAudioContext.createOscillator.mockReturnValueOnce(mockOsc);
      mockAudioContext.createGain.mockReturnValueOnce(mockGain);

      audio.playScore();

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOsc.type).toBe('sine');
      expect(mockOsc.frequency.value).toBe(880);
      expect(mockOsc.connect).toHaveBeenCalledWith(mockGain);
      expect(mockGain.connect).toHaveBeenCalledWith(mockAudioContext.destination);
      expect(mockOsc.start).toHaveBeenCalled();
      expect(mockOsc.stop).toHaveBeenCalled();
    });
  });

  describe('playGameOver()', () => {
    it('creates buffer source and starts playback', async () => {
      const audio = createAudioManager({ musicVolume: 0.3, sfxVolume: 1.0 });
      await audio.init();

      const mockSource = createMockBufferSource();
      const mockGain = createMockGainNode();
      mockAudioContext.createBufferSource.mockReturnValueOnce(mockSource);
      mockAudioContext.createGain.mockReturnValueOnce(mockGain);

      audio.playGameOver();

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockSource.connect).toHaveBeenCalledWith(mockGain);
      expect(mockGain.connect).toHaveBeenCalledWith(mockAudioContext.destination);
      expect(mockSource.start).toHaveBeenCalledWith(0);
    });
  });

  describe('graceful fallback when AudioContext unavailable', () => {
    it('all methods work as no-ops when AudioContext throws', async () => {
      // Override AudioContext to throw
      global.window.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported');
      });
      global.window.webkitAudioContext = undefined;

      const audio = createAudioManager({ musicVolume: 0.3, sfxVolume: 1.0 });
      await audio.init();

      // All sound methods should not throw
      expect(() => audio.playJump()).not.toThrow();
      expect(() => audio.playScore()).not.toThrow();
      expect(() => audio.playGameOver()).not.toThrow();
      expect(() => audio.pauseMusic()).not.toThrow();
      expect(() => audio.resumeMusic()).not.toThrow();
      expect(() => audio.stopMusic()).not.toThrow();
    });

    it('all methods work as no-ops when AudioContext is undefined', async () => {
      global.window.AudioContext = undefined;
      global.window.webkitAudioContext = undefined;

      const audio = createAudioManager({ musicVolume: 0.3, sfxVolume: 1.0 });
      await audio.init();

      expect(() => audio.playJump()).not.toThrow();
      expect(() => audio.playScore()).not.toThrow();
      expect(() => audio.playGameOver()).not.toThrow();
      expect(() => audio.pauseMusic()).not.toThrow();
      expect(() => audio.resumeMusic()).not.toThrow();
      expect(() => audio.stopMusic()).not.toThrow();
    });
  });

  describe('music pause/resume lifecycle', () => {
    it('pauseMusic() pauses the music element', async () => {
      const audio = createAudioManager({ musicVolume: 0.3, sfxVolume: 1.0 });
      await audio.init();

      audio.pauseMusic();

      expect(mockMusicElement.pause).toHaveBeenCalled();
    });

    it('resumeMusic() plays the music element when src is set', async () => {
      mockMusicElement.src = 'assets/music.mp3';
      const audio = createAudioManager({ musicVolume: 0.3, sfxVolume: 1.0 });
      await audio.init();

      audio.resumeMusic();

      expect(mockMusicElement.play).toHaveBeenCalled();
    });

    it('resumeMusic() does not play when no src is set', async () => {
      // src is empty by default in mock
      const audio = createAudioManager({ musicVolume: 0.3, sfxVolume: 1.0 });
      await audio.init();

      audio.resumeMusic();

      expect(mockMusicElement.play).not.toHaveBeenCalled();
    });

    it('stopMusic() pauses and resets currentTime to 0', async () => {
      mockMusicElement.currentTime = 42;
      const audio = createAudioManager({ musicVolume: 0.3, sfxVolume: 1.0 });
      await audio.init();

      audio.stopMusic();

      expect(mockMusicElement.pause).toHaveBeenCalled();
      expect(mockMusicElement.currentTime).toBe(0);
    });
  });
});
