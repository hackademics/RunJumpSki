/**
 * @file src/core/audio/AudioManager.ts
 * @description Implements the core Audio Manager that orchestrates audio loading and playback using Babylon.js Sound.
 * 
 * @dependencies IAudioManager.ts, TYPE_IMPORTS.md
 * @relatedFiles IAudioManager.ts
 */

import * as BABYLON from "babylonjs";
import { IAudioManager } from "./IAudioManager";

export class AudioManager implements IAudioManager {
  private soundRegistry: Map<string, BABYLON.Sound>;

  constructor() {
    this.soundRegistry = new Map<string, BABYLON.Sound>();
  }

  public async loadSound(
    key: string,
    url: string,
    scene: BABYLON.Scene,
    options?: BABYLON.ISoundOptions
  ): Promise<BABYLON.Sound> {
    return new Promise((resolve, reject) => {
      try {
        // Create a new BABYLON.Sound instance.
        const sound = new BABYLON.Sound(
          key,
          url,
          scene,
          () => {
            // On success, register and resolve the sound.
            this.soundRegistry.set(key, sound);
            resolve(sound);
          },
          options
        );
      } catch (error) {
        reject(new Error(`Failed to load sound from ${url}: ${error}`));
      }
    });
  }

  public playSound(key: string): void {
    const sound = this.soundRegistry.get(key);
    if (sound) {
      sound.play();
    } else {
      console.warn(`Sound with key "${key}" not found.`);
    }
  }

  public pauseSound(key: string): void {
    const sound = this.soundRegistry.get(key);
    if (sound) {
      sound.pause();
    } else {
      console.warn(`Sound with key "${key}" not found.`);
    }
  }

  public stopSound(key: string): void {
    const sound = this.soundRegistry.get(key);
    if (sound) {
      sound.stop();
    } else {
      console.warn(`Sound with key "${key}" not found.`);
    }
  }

  public getSound(key: string): BABYLON.Sound | undefined {
    return this.soundRegistry.get(key);
  }

  public setVolume(key: string, volume: number): void {
    const sound = this.soundRegistry.get(key);
    if (sound) {
      sound.setVolume(volume);
    } else {
      console.warn(`Sound with key "${key}" not found.`);
    }
  }

  public clear(): void {
    this.soundRegistry.forEach((sound) => {
      sound.dispose();
    });
    this.soundRegistry.clear();
  }
}
