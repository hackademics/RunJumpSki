/**
 * @file src/core/audio/IAudioManager.ts
 * @description Interface for the AudioManager, which handles core audio features using Babylon.js Sound.
 * 
 * @dependencies TYPE_IMPORTS.md (for BABYLON)
 * @relatedFiles AudioManager.ts
 */

import * as BABYLON from "babylonjs";

export interface IAudioManager {
  /**
   * Loads a sound from the specified URL and registers it with a unique key.
   * @param key - Unique identifier for the sound.
   * @param url - URL to load the sound from.
   * @param scene - The Babylon.js scene to associate the sound with.
   * @param options - Optional sound options for configuration.
   * @returns A Promise resolving with the loaded BABYLON.Sound.
   */
  loadSound(
    key: string,
    url: string,
    scene: BABYLON.Scene,
    options?: BABYLON.ISoundOptions
  ): Promise<BABYLON.Sound>;

  /**
   * Plays a sound associated with the given key.
   * @param key - Unique identifier for the sound.
   */
  playSound(key: string): void;

  /**
   * Pauses a sound associated with the given key.
   * @param key - Unique identifier for the sound.
   */
  pauseSound(key: string): void;

  /**
   * Stops a sound associated with the given key.
   * @param key - Unique identifier for the sound.
   */
  stopSound(key: string): void;

  /**
   * Retrieves a sound by its key.
   * @param key - Unique identifier for the sound.
   * @returns The BABYLON.Sound if found; otherwise, undefined.
   */
  getSound(key: string): BABYLON.Sound | undefined;

  /**
   * Sets the volume for a sound associated with the given key.
   * @param key - Unique identifier for the sound.
   * @param volume - New volume (range typically 0.0 to 1.0).
   */
  setVolume(key: string, volume: number): void;

  /**
   * Clears all registered sounds from the manager.
   */
  clear(): void;
}
