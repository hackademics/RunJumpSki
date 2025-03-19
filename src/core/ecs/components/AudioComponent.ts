/**
 * @file src/core/ecs/components/AudioComponent.ts
 * @description Implementation of the Audio Component that manages sound functionality
 */

import * as BABYLON from 'babylonjs';
import { Component } from '../Component';
import { IEntity } from '../IEntity';
import { IAudioComponent } from './IAudioComponent';
import { ITransformComponent } from './ITransformComponent';

/**
 * Configuration options for AudioComponent
 */
export interface AudioComponentOptions {
  /**
   * The scene to attach sounds to
   */
  scene: BABYLON.Scene;
  
  /**
   * Whether sounds should be spatialized (3D positioned) by default
   */
  spatialByDefault?: boolean;
  
  /**
   * Default maximum distance at which spatialized sounds can be heard
   */
  defaultMaxDistance?: number;
  
  /**
   * Whether to automatically update sound positions based on entity position
   */
  autoUpdatePosition?: boolean;
}

/**
 * Default configuration for the AudioComponent
 */
const DEFAULT_OPTIONS: Required<Omit<AudioComponentOptions, 'scene'>> = {
  spatialByDefault: false,
  defaultMaxDistance: 100,
  autoUpdatePosition: true
};

/**
 * Component that manages sound playback attached to an entity
 */
export class AudioComponent extends Component implements IAudioComponent {
  public readonly type: string = 'audio';
  
  /**
   * Map of sound keys to their corresponding BABYLON.Sound instances
   */
  private sounds: Map<string, BABYLON.Sound>;
  
  /**
   * The scene to which sounds are attached
   */
  private scene: BABYLON.Scene;
  
  /**
   * Whether sounds should be spatialized (3D positioned) by default
   */
  private spatialByDefault: boolean;
  
  /**
   * Default maximum distance at which spatialized sounds can be heard
   */
  private defaultMaxDistance: number;
  
  /**
   * Whether to automatically update sound positions based on entity position
   */
  private autoUpdatePosition: boolean;
  
  /**
   * Create a new AudioComponent
   * 
   * @param options Configuration options for the component
   */
  constructor(options: AudioComponentOptions) {
    super({ type: 'audio' });
    
    this.sounds = new Map<string, BABYLON.Sound>();
    this.scene = options.scene;
    
    // Apply defaults for optional properties
    this.spatialByDefault = options.spatialByDefault ?? DEFAULT_OPTIONS.spatialByDefault;
    this.defaultMaxDistance = options.defaultMaxDistance ?? DEFAULT_OPTIONS.defaultMaxDistance;
    this.autoUpdatePosition = options.autoUpdatePosition ?? DEFAULT_OPTIONS.autoUpdatePosition;
  }
  
  /**
   * Initialize the component and attach it to an entity
   * 
   * @param entity The entity to which this component is being added
   */
  public override init(entity: IEntity): void {
    super.init(entity);
    this.logger.debug('AudioComponent initialized');
  }
  
  /**
   * Update the component's state
   * 
   * @param deltaTime The time elapsed since the last update
   */
  public override update(deltaTime: number): void {
    if (!this.isEnabled()) return;
    
    // If auto-update position is enabled, update the position of all spatial sounds
    if (this.autoUpdatePosition) {
      this.updatePosition();
    }
  }
  
  /**
   * Dispose of the component and clean up its resources
   */
  public override dispose(): void {
    // Clear all sounds before disposal
    this.clearSounds();
    super.dispose();
  }
  
  /**
   * Get the BABYLON.Sound instance by key
   * 
   * @param key Unique identifier for the sound
   * @returns The BABYLON.Sound if found; otherwise, undefined
   */
  public getSound(key: string): BABYLON.Sound | undefined {
    return this.sounds.get(key);
  }
  
  /**
   * Load a sound from the specified URL and register it with a unique key
   * 
   * @param key Unique identifier for the sound
   * @param url URL to load the sound from
   * @param options Optional sound configuration options
   * @returns Promise resolving with the loaded BABYLON.Sound
   */
  public async loadSound(
    key: string,
    url: string,
    options?: BABYLON.ISoundOptions
  ): Promise<BABYLON.Sound> {
    return new Promise((resolve, reject) => {
      try {
        // Set spatial flag based on component default if not specified
        const soundOptions: BABYLON.ISoundOptions = {
          spatialSound: this.spatialByDefault,
          maxDistance: this.defaultMaxDistance,
          ...options
        };
        
        // Create a new BABYLON.Sound instance
        const sound = new BABYLON.Sound(
          key,
          url,
          this.scene,
          () => {
            // On success, register and resolve the sound
            this.sounds.set(key, sound);
            this.logger.debug(`Sound "${key}" loaded successfully`);
            resolve(sound);
          },
          soundOptions
        );
        
        // If the sound is spatial, update its position to match the entity
        if (soundOptions.spatialSound) {
          this.updateSoundPosition(sound);
        }
      } catch (error) {
        const errorMessage = `Failed to load sound "${key}" from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        this.logger.error(errorMessage);
        reject(new Error(errorMessage));
      }
    });
  }
  
  /**
   * Play a sound associated with the given key
   * 
   * @param key Unique identifier for the sound
   */
  public playSound(key: string): void {
    const sound = this.sounds.get(key);
    if (sound) {
      sound.play();
      this.logger.debug(`Playing sound "${key}"`);
    } else {
      this.logger.warn(`Sound "${key}" not found, cannot play`);
    }
  }
  
  /**
   * Stop a sound associated with the given key
   * 
   * @param key Unique identifier for the sound
   */
  public stopSound(key: string): void {
    const sound = this.sounds.get(key);
    if (sound) {
      sound.stop();
      this.logger.debug(`Stopped sound "${key}"`);
    } else {
      this.logger.warn(`Sound "${key}" not found, cannot stop`);
    }
  }
  
  /**
   * Pause a sound associated with the given key
   * 
   * @param key Unique identifier for the sound
   */
  public pauseSound(key: string): void {
    const sound = this.sounds.get(key);
    if (sound) {
      sound.pause();
      this.logger.debug(`Paused sound "${key}"`);
    } else {
      this.logger.warn(`Sound "${key}" not found, cannot pause`);
    }
  }
  
  /**
   * Set the volume for a sound associated with the given key
   * 
   * @param key Unique identifier for the sound
   * @param volume New volume (range typically 0.0 to 1.0)
   */
  public setVolume(key: string, volume: number): void {
    const sound = this.sounds.get(key);
    if (sound) {
      // Clamp volume between 0 and 1
      const clampedVolume = Math.max(0, Math.min(1, volume));
      sound.setVolume(clampedVolume);
      this.logger.debug(`Set volume of sound "${key}" to ${clampedVolume}`);
    } else {
      this.logger.warn(`Sound "${key}" not found, cannot set volume`);
    }
  }
  
  /**
   * Get the volume for a sound associated with the given key
   * 
   * @param key Unique identifier for the sound
   * @returns Current volume of the sound, or undefined if sound not found
   */
  public getVolume(key: string): number | undefined {
    const sound = this.sounds.get(key);
    return sound?.getVolume();
  }
  
  /**
   * Set whether a sound plays in loop mode
   * 
   * @param key Unique identifier for the sound
   * @param loop Whether the sound should loop
   */
  public setLoop(key: string, loop: boolean): void {
    const sound = this.sounds.get(key);
    if (sound) {
      sound.loop = loop;
      this.logger.debug(`Set loop for sound "${key}" to ${loop}`);
    } else {
      this.logger.warn(`Sound "${key}" not found, cannot set loop`);
    }
  }
  
  /**
   * Check if a sound is set to loop
   * 
   * @param key Unique identifier for the sound
   * @returns Whether the sound is set to loop, or undefined if sound not found
   */
  public isLooping(key: string): boolean | undefined {
    const sound = this.sounds.get(key);
    return sound?.loop;
  }
  
  /**
   * Set the playback rate (speed) for a sound
   * 
   * @param key Unique identifier for the sound
   * @param rate Playback rate (1.0 = normal speed, 0.5 = half speed, 2.0 = double speed)
   */
  public setPlaybackRate(key: string, rate: number): void {
    const sound = this.sounds.get(key);
    if (sound) {
      // Ensure rate is positive
      const validRate = Math.max(0.1, rate);
      sound.setPlaybackRate(validRate);
      this.logger.debug(`Set playback rate for sound "${key}" to ${validRate}`);
    } else {
      this.logger.warn(`Sound "${key}" not found, cannot set playback rate`);
    }
  }
  
  /**
   * Get the playback rate for a sound
   * 
   * @param key Unique identifier for the sound
   * @returns Current playback rate, or undefined if sound not found
   */
  public getPlaybackRate(key: string): number | undefined {
    const sound = this.sounds.get(key);
    // Using type assertion to access the property since the typings don't include it
    // but the property exists at runtime in the Babylon.js implementation
    return sound ? (sound as any).playbackRate : undefined;
  }
  
  /**
   * Set whether sounds attached to this component should be spatialized (3D positioned)
   * 
   * @param key Unique identifier for the sound
   * @param spatial Whether the sound should be spatialized
   */
  public setSpatial(key: string, spatial: boolean): void {
    const sound = this.sounds.get(key);
    if (sound) {
      sound.spatialSound = spatial;
      
      // If enabling spatial sound, update its position
      if (spatial) {
        this.updateSoundPosition(sound);
        
        // Set max distance if not already set
        if (sound.maxDistance === 0) {
          sound.maxDistance = this.defaultMaxDistance;
        }
      }
      
      this.logger.debug(`Set spatial mode for sound "${key}" to ${spatial}`);
    } else {
      this.logger.warn(`Sound "${key}" not found, cannot set spatial mode`);
    }
  }
  
  /**
   * Check if a sound is spatialized (3D positioned)
   * 
   * @param key Unique identifier for the sound
   * @returns Whether the sound is spatialized, or undefined if sound not found
   */
  public isSpatial(key: string): boolean | undefined {
    const sound = this.sounds.get(key);
    return sound?.spatialSound;
  }
  
  /**
   * Set the maximum distance at which the sound can be heard
   * 
   * @param key Unique identifier for the sound
   * @param distance Maximum distance
   */
  public setMaxDistance(key: string, distance: number): void {
    const sound = this.sounds.get(key);
    if (sound) {
      sound.maxDistance = Math.max(0, distance);
      this.logger.debug(`Set max distance for sound "${key}" to ${distance}`);
    } else {
      this.logger.warn(`Sound "${key}" not found, cannot set max distance`);
    }
  }
  
  /**
   * Get the maximum distance at which the sound can be heard
   * 
   * @param key Unique identifier for the sound
   * @returns Maximum distance, or undefined if sound not found
   */
  public getMaxDistance(key: string): number | undefined {
    const sound = this.sounds.get(key);
    return sound?.maxDistance;
  }
  
  /**
   * Update the position of spatialized sounds based on the entity's position
   */
  public updatePosition(): void {
    // Skip if not attached to an entity
    if (!this.entity) {
      return;
    }
    
    // Update the position of all spatial sounds
    this.sounds.forEach(sound => {
      if (sound.spatialSound) {
        this.updateSoundPosition(sound);
      }
    });
  }
  
  /**
   * Check if a sound is currently playing
   * 
   * @param key Unique identifier for the sound
   * @returns Whether the sound is playing, or undefined if sound not found
   */
  public isPlaying(key: string): boolean | undefined {
    const sound = this.sounds.get(key);
    return sound?.isPlaying;
  }
  
  /**
   * Clear all registered sounds from the component
   */
  public clearSounds(): void {
    this.sounds.forEach(sound => {
      sound.dispose();
    });
    this.sounds.clear();
    this.logger.debug('All sounds cleared');
  }
  
  /**
   * Helper method to update a specific sound's position based on entity transform
   * 
   * @param sound The BABYLON.Sound to update
   * @private
   */
  private updateSoundPosition(sound: BABYLON.Sound): void {
    // Skip if not attached to an entity
    if (!this.entity) {
      return;
    }
    
    // Get the transform component from the entity
    const transformComponent = this.entity.getComponent<ITransformComponent>('transform');
    if (transformComponent) {
      // Get the current position from the transform
      const position = transformComponent.getPosition();
      
      // Update the sound's position
      if (sound.spatialSound) {
        sound.setPosition(new BABYLON.Vector3(position.x, position.y, position.z));
      }
    }
  }
}

