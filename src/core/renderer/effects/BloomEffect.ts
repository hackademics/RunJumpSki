/**
 * @file src/core/renderer/effects/BloomEffect.ts
 * @description Specialized bloom effect optimized for weapons and explosions.
 * 
 * @dependencies babylonjs
 * @relatedFiles PostProcessingManager.ts, IPostProcessingManager.ts
 */
import * as BABYLON from 'babylonjs';
import { BloomEffectOptions } from './IPostProcessingManager';

/**
 * Bloom effect preset types
 */
export enum BloomPreset {
  SUBTLE = 'subtle',
  MEDIUM = 'medium',
  INTENSE = 'intense',
  WEAPON = 'weapon',
  EXPLOSION = 'explosion',
  JETPACK = 'jetpack'
}

/**
 * Default bloom settings for various presets
 */
const BLOOM_PRESETS: Record<BloomPreset, BloomEffectOptions> = {
  [BloomPreset.SUBTLE]: {
    enabled: true,
    intensity: 0.3,
    threshold: 0.7,
    kernelSize: 64,
    scale: 0.5
  },
  [BloomPreset.MEDIUM]: {
    enabled: true,
    intensity: 0.7,
    threshold: 0.6,
    kernelSize: 64,
    scale: 0.6
  },
  [BloomPreset.INTENSE]: {
    enabled: true,
    intensity: 1.0,
    threshold: 0.5,
    kernelSize: 128,
    scale: 0.7
  },
  [BloomPreset.WEAPON]: {
    enabled: true,
    intensity: 0.8,
    threshold: 0.4,
    kernelSize: 64,
    scale: 0.7
  },
  [BloomPreset.EXPLOSION]: {
    enabled: true,
    intensity: 1.2,
    threshold: 0.3,
    kernelSize: 128,
    scale: 0.8
  },
  [BloomPreset.JETPACK]: {
    enabled: true,
    intensity: 0.9,
    threshold: 0.4,
    kernelSize: 64,
    scale: 0.7
  }
};

/**
 * Specialized bloom effect with optimized settings for different game scenarios
 */
export class BloomEffect {
  private pipeline: BABYLON.DefaultRenderingPipeline | null = null;
  private currentPreset: BloomPreset = BloomPreset.MEDIUM;
  private customSettings: Partial<BloomEffectOptions> = {};
  
  /**
   * Create a new bloom effect
   * @param pipeline The rendering pipeline to attach to
   * @param preset Optional preset to use
   * @param options Custom options to override preset
   */
  constructor(
    pipeline: BABYLON.DefaultRenderingPipeline,
    preset: BloomPreset = BloomPreset.MEDIUM,
    options?: Partial<BloomEffectOptions>
  ) {
    this.pipeline = pipeline;
    this.currentPreset = preset;
    this.customSettings = options || {};
    
    this.applySettings();
  }
  
  /**
   * Apply current settings to the pipeline
   */
  private applySettings(): void {
    if (!this.pipeline) {
      return;
    }
    
    // Get preset settings
    const presetSettings = BLOOM_PRESETS[this.currentPreset];
    
    // Merge with custom settings
    const mergedSettings = {
      ...presetSettings,
      ...this.customSettings
    };
    
    // Apply to pipeline
    this.pipeline.bloomEnabled = mergedSettings.enabled !== false;
    
    if (this.pipeline.bloomEnabled) {
      if (mergedSettings.intensity !== undefined) {
        this.pipeline.bloomWeight = mergedSettings.intensity;
      }
      
      if (mergedSettings.threshold !== undefined) {
        this.pipeline.bloomThreshold = mergedSettings.threshold;
      }
      
      if (mergedSettings.kernelSize !== undefined) {
        this.pipeline.bloomKernel = mergedSettings.kernelSize;
      }
      
      if (mergedSettings.scale !== undefined) {
        this.pipeline.bloomScale = mergedSettings.scale;
      }
    }
  }
  
  /**
   * Enable the bloom effect
   */
  public enable(): void {
    if (this.pipeline) {
      this.pipeline.bloomEnabled = true;
    }
  }
  
  /**
   * Disable the bloom effect
   */
  public disable(): void {
    if (this.pipeline) {
      this.pipeline.bloomEnabled = false;
    }
  }
  
  /**
   * Set bloom intensity
   * @param value Intensity value (0-2 range recommended)
   */
  public setIntensity(value: number): void {
    if (this.pipeline) {
      this.pipeline.bloomWeight = value;
      this.customSettings.intensity = value;
    }
  }
  
  /**
   * Set bloom threshold (higher = less elements will bloom)
   * @param value Threshold value (0-1 range)
   */
  public setThreshold(value: number): void {
    if (this.pipeline) {
      this.pipeline.bloomThreshold = value;
      this.customSettings.threshold = value;
    }
  }
  
  /**
   * Set bloom scale (controls bloom size)
   * @param value Scale value (0-1 range recommended)
   */
  public setScale(value: number): void {
    if (this.pipeline) {
      this.pipeline.bloomScale = value;
      this.customSettings.scale = value;
    }
  }
  
  /**
   * Switch to a different preset
   * @param preset The preset to use
   * @param keepCustomOverrides Whether to maintain custom settings
   */
  public usePreset(preset: BloomPreset, keepCustomOverrides: boolean = true): void {
    this.currentPreset = preset;
    
    if (!keepCustomOverrides) {
      this.customSettings = {};
    }
    
    this.applySettings();
  }
  
  /**
   * Get a copy of the current settings
   * @returns Current settings
   */
  public getSettings(): BloomEffectOptions {
    const presetSettings = BLOOM_PRESETS[this.currentPreset];
    return { ...presetSettings, ...this.customSettings };
  }
  
  /**
   * Update multiple settings at once
   * @param options Settings to update
   */
  public updateSettings(options: Partial<BloomEffectOptions>): void {
    this.customSettings = { ...this.customSettings, ...options };
    this.applySettings();
  }
  
  /**
   * Set up optimized settings for weapons
   */
  public optimizeForWeapons(): void {
    this.usePreset(BloomPreset.WEAPON);
  }
  
  /**
   * Set up optimized settings for explosions
   */
  public optimizeForExplosions(): void {
    this.usePreset(BloomPreset.EXPLOSION);
  }
  
  /**
   * Set up optimized settings for jetpack
   */
  public optimizeForJetpack(): void {
    this.usePreset(BloomPreset.JETPACK);
  }
  
  /**
   * Pulse the bloom effect for a short duration (useful for explosions/impacts)
   * @param duration Duration of the pulse in milliseconds
   * @param intensity Maximum intensity at peak of pulse
   * @returns Promise that resolves when the pulse completes
   */
  public async pulse(duration: number = 500, intensity: number = 1.5): Promise<void> {
    if (!this.pipeline) {
      return Promise.resolve();
    }
    
    const originalIntensity = this.pipeline.bloomWeight;
    const originalEnabled = this.pipeline.bloomEnabled;
    
    // Make sure bloom is enabled
    this.pipeline.bloomEnabled = true;
    
    return new Promise<void>((resolve) => {
      // Use scene's onBeforeRenderObservable for animation
      const scene = this.pipeline?.scene;
      if (!scene) {
        resolve();
        return;
      }
      
      const startTime = Date.now();
      const observer = scene.onBeforeRenderObservable.add(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in/out curve for intensity
        let t = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        
        // Set intensity based on curve
        if (this.pipeline) {
          this.pipeline.bloomWeight = originalIntensity + (intensity - originalIntensity) * t;
          
          // If complete, clean up
          if (progress >= 1) {
            this.pipeline.bloomWeight = originalIntensity;
            this.pipeline.bloomEnabled = originalEnabled;
            
            if (scene) {
              scene.onBeforeRenderObservable.remove(observer);
            }
            
            resolve();
          }
        }
      });
    });
  }
} 