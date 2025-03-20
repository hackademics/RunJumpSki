/**
 * @file tests/unit/core/audio/AudioManager.test.ts
 * @description Unit tests for the AudioManager.
 */

import { AudioManager } from '@core/audio/AudioManager';
import BABYLON from '../../../mocks/babylon-standard';
import { Sound } from '../../../mocks/babylon-standard';
import { Scene } from '../../../mocks/babylon-standard';

// Mock the babylonjs import
jest.mock('babylonjs', () => {
  return {
    ...jest.requireActual('../../../mocks/babylon-standard'),
    __esModule: true,
  };
});

describe('AudioManager', () => {
  let audioManager: AudioManager;
  let mockScene: Scene;

  beforeEach(() => {
    audioManager = new AudioManager();
    mockScene = new Scene();
    
    // Spy on Sound methods to verify calls
    jest.spyOn(Sound.prototype, 'play');
    jest.spyOn(Sound.prototype, 'pause');
    jest.spyOn(Sound.prototype, 'stop');
    jest.spyOn(Sound.prototype, 'setVolume');
    jest.spyOn(Sound.prototype, 'dispose');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should load a sound and register it', async () => {
    const key = 'testSound';
    const url = 'http://example.com/test.mp3';
    const sound = await audioManager.loadSound(key, url, mockScene);
    
    expect(sound).toBeDefined();
    expect(sound).toBeInstanceOf(Sound);
    expect(sound.name).toBe(key);
    expect(audioManager.getSound(key)).toBe(sound);
  });

  test('should play a sound', async () => {
    const key = 'testSound';
    const url = 'http://example.com/test.mp3';
    const sound = await audioManager.loadSound(key, url, mockScene);
    
    audioManager.playSound(key);
    
    expect(sound.play).toHaveBeenCalled();
    expect(sound.isPlaying).toBe(true);
  });

  test('should pause a sound', async () => {
    const key = 'testSound';
    const url = 'http://example.com/test.mp3';
    const sound = await audioManager.loadSound(key, url, mockScene);
    
    // First play the sound
    audioManager.playSound(key);
    expect(sound.isPlaying).toBe(true);
    
    // Then pause it
    audioManager.pauseSound(key);
    
    expect(sound.pause).toHaveBeenCalled();
    expect(sound.isPlaying).toBe(false);
  });

  test('should stop a sound', async () => {
    const key = 'testSound';
    const url = 'http://example.com/test.mp3';
    const sound = await audioManager.loadSound(key, url, mockScene);
    
    // First play the sound
    audioManager.playSound(key);
    expect(sound.isPlaying).toBe(true);
    
    // Then stop it
    audioManager.stopSound(key);
    
    expect(sound.stop).toHaveBeenCalled();
    expect(sound.isPlaying).toBe(false);
  });

  test('should set volume of a sound', async () => {
    const key = 'testSound';
    const url = 'http://example.com/test.mp3';
    const sound = await audioManager.loadSound(key, url, mockScene);
    
    audioManager.setVolume(key, 0.5);
    
    expect(sound.setVolume).toHaveBeenCalledWith(0.5);
    expect(sound.volume).toBe(0.5);
  });

  test('should clear all sounds and dispose them', async () => {
    const key1 = 'sound1';
    const key2 = 'sound2';
    const url1 = 'http://example.com/sound1.mp3';
    const url2 = 'http://example.com/sound2.mp3';
    
    const sound1 = await audioManager.loadSound(key1, url1, mockScene);
    const sound2 = await audioManager.loadSound(key2, url2, mockScene);
    
    audioManager.clear();
    
    expect(sound1.dispose).toHaveBeenCalled();
    expect(sound2.dispose).toHaveBeenCalled();
    expect(audioManager.getSound(key1)).toBeUndefined();
    expect(audioManager.getSound(key2)).toBeUndefined();
  });
});
