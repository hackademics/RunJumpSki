/**
 * @file src/core/ecs/components/IAudioComponent.ts
 * @description Interface for the Audio Component that manages sound functionality
 */

import * as BABYLON from 'babylonjs';
import { IComponent } from '../IComponent';

/**
 * Interface for Audio component
 * Handles sound playback attached to entities
 */
export interface IAudioComponent extends IComponent {
  /**
   * Get the BABYLON.Sound instance by key
   * @param key - Unique identifier for the sound
   */
  getSound(key: string): BABYLON.Sound | undefined;
  
  /**
   * Load a sound from the specified URL and register it with a unique key
   * @param key - Unique identifier for the sound
   * @param url - URL to load the sound from
   * @param options - Optional sound configuration options
   * @returns Promise resolving with the loaded sound
   */
  loadSound(key: string, url: string, options?: BABYLON.ISoundOptions): Promise<BABYLON.Sound>;
  
  /**
   * Play a sound associated with the given key
   * @param key - Unique identifier for the sound
   */
  playSound(key: string): void;
  
  /**
   * Stop a sound associated with the given key
   * @param key - Unique identifier for the sound
   */
  stopSound(key: string): void;
  
  /**
   * Pause a sound associated with the given key
   * @param key - Unique identifier for the sound
   */
  pauseSound(key: string): void;
  
  /**
   * Set the volume for a sound associated with the given key
   * @param key - Unique identifier for the sound
   * @param volume - New volume (range typically 0.0 to 1.0)
   */
  setVolume(key: string, volume: number): void;
  
  /**
   * Get the volume for a sound associated with the given key
   * @param key - Unique identifier for the sound
   * @returns Current volume of the sound, or undefined if sound not found
   */
  getVolume(key: string): number | undefined;
  
  /**
   * Set whether a sound plays in loop mode
   * @param key - Unique identifier for the sound
   * @param loop - Whether the sound should loop
   */
  setLoop(key: string, loop: boolean): void;
  
  /**
   * Check if a sound is set to loop
   * @param key - Unique identifier for the sound
   * @returns Whether the sound is set to loop, or undefined if sound not found
   */
  isLooping(key: string): boolean | undefined;
  
  /**
   * Set the playback rate (speed) for a sound
   * @param key - Unique identifier for the sound
   * @param rate - Playback rate (1.0 = normal speed, 0.5 = half speed, 2.0 = double speed)
   */
  setPlaybackRate(key: string, rate: number): void;
  
  /**
   * Get the playback rate for a sound
   * @param key - Unique identifier for the sound
   * @returns Current playback rate, or undefined if sound not found
   */
  getPlaybackRate(key: string): number | undefined;
  
  /**
   * Set whether sounds attached to this component should be spatialized (3D positioned)
   * @param key - Unique identifier for the sound
   * @param spatial - Whether the sound should be spatialized
   */
  setSpatial(key: string, spatial: boolean): void;
  
  /**
   * Check if a sound is spatialized (3D positioned)
   * @param key - Unique identifier for the sound
   * @returns Whether the sound is spatialized, or undefined if sound not found
   */
  isSpatial(key: string): boolean | undefined;
  
  /**
   * Set the maximum distance at which the sound can be heard
   * @param key - Unique identifier for the sound
   * @param distance - Maximum distance
   */
  setMaxDistance(key: string, distance: number): void;
  
  /**
   * Get the maximum distance at which the sound can be heard
   * @param key - Unique identifier for the sound
   * @returns Maximum distance, or undefined if sound not found
   */
  getMaxDistance(key: string): number | undefined;
  
  /**
   * Update the position of spatialilzed sounds based on the entity's position
   */
  updatePosition(): void;
  
  /**
   * Check if a sound is currently playing
   * @param key - Unique identifier for the sound
   * @returns Whether the sound is playing, or undefined if sound not found
   */
  isPlaying(key: string): boolean | undefined;
  
  /**
   * Clear all registered sounds from the component
   */
  clearSounds(): void;
}

