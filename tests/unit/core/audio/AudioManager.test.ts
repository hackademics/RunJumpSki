/**
 * @file tests/unit/core/audio/AudioManager.test.ts
 * @description Unit tests for the AudioManager.
 */

import { AudioManager } from '@core/audio/AudioManager';
import * as BABYLON from 'babylonjs';

describe('AudioManager', () => {
  let audioManager: AudioManager;
  let originalBABYLONSound: any;
  let fakeScene: any;

  // Fake BABYLON.Sound implementation for testing.
  class FakeSound {
    key: string;
    url: string;
    scene: any;
    options: any;
    volume: number;
    isPlaying: boolean;
    disposeCalled: boolean;

    constructor(
      key: string,
      url: string,
      scene: any,
      onLoadCallback: () => void,
      options?: any
    ) {
      this.key = key;
      this.url = url;
      this.scene = scene;
      this.options = options;
      this.volume = 1;
      this.isPlaying = false;
      this.disposeCalled = false;
      // Immediately simulate successful load.
      onLoadCallback();
    }

    play() {
      this.isPlaying = true;
    }

    pause() {
      this.isPlaying = false;
    }

    stop() {
      this.isPlaying = false;
    }

    setVolume(volume: number) {
      this.volume = volume;
    }

    dispose() {
      this.disposeCalled = true;
    }
  }

  beforeAll(() => {
    // Backup the original BABYLON.Sound.
    originalBABYLONSound = BABYLON.Sound;
    // Override with our fake implementation.
    BABYLON.Sound = FakeSound as any;
  });

  afterAll(() => {
    // Restore the original BABYLON.Sound.
    BABYLON.Sound = originalBABYLONSound;
  });

  beforeEach(() => {
    audioManager = new AudioManager();
    fakeScene = {}; // Minimal fake scene for testing.
  });

  test('should load a sound and register it', async () => {
    const key = 'testSound';
    const url = 'http://example.com/test.mp3';
    const sound = await audioManager.loadSound(key, url, fakeScene);
    expect(sound).toBeDefined();
    expect(audioManager.getSound(key)).toEqual(sound);
  });

  test('should play a sound', async () => {
    const key = 'testSound';
    const url = 'http://example.com/test.mp3';
    const sound = await audioManager.loadSound(key, url, fakeScene);
    audioManager.playSound(key);
    expect(sound.isPlaying).toBe(true);
  });

  test('should pause a sound', async () => {
    const key = 'testSound';
    const url = 'http://example.com/test.mp3';
    const sound = await audioManager.loadSound(key, url, fakeScene);
    // Play sound then pause it.
    audioManager.playSound(key);
    expect(sound.isPlaying).toBe(true);
    audioManager.pauseSound(key);
    expect(sound.isPlaying).toBe(false);
  });

  test('should stop a sound', async () => {
    const key = 'testSound';
    const url = 'http://example.com/test.mp3';
    const sound = await audioManager.loadSound(key, url, fakeScene);
    // Play sound then stop it.
    audioManager.playSound(key);
    expect(sound.isPlaying).toBe(true);
    audioManager.stopSound(key);
    expect(sound.isPlaying).toBe(false);
  });

  test('should set volume of a sound', async () => {
    const key = 'testSound';
    const url = 'http://example.com/test.mp3';
    const sound = await audioManager.loadSound(key, url, fakeScene);
    audioManager.setVolume(key, 0.5);
    expect(sound.volume).toBe(0.5);
  });

  test('should clear all sounds and dispose them', async () => {
    const key1 = 'sound1';
    const key2 = 'sound2';
    const url1 = 'http://example.com/sound1.mp3';
    const url2 = 'http://example.com/sound2.mp3';
    const sound1 = await audioManager.loadSound(key1, url1, fakeScene);
    const sound2 = await audioManager.loadSound(key2, url2, fakeScene);
    audioManager.clear();
    expect(audioManager.getSound(key1)).toBeUndefined();
    expect(audioManager.getSound(key2)).toBeUndefined();
    expect(sound1.disposeCalled).toBe(true);
    expect(sound2.disposeCalled).toBe(true);
  });
});
