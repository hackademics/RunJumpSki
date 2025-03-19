/**
 * @file src/core/renderer/effects/MotionBlurEffect.ts
 * @description Specialized motion blur effect that enhances blur based on player speed.
 * 
 * @dependencies babylonjs
 * @relatedFiles PostProcessingManager.ts, IPostProcessingManager.ts
 */
import * as BABYLON from 'babylonjs';
import { MotionBlurEffectOptions } from './IPostProcessingManager';

/**
 * Motion blur intensity presets
 */
export enum MotionBlurPreset {
  OFF = 'off',           // No motion blur
  SUBTLE = 'subtle',     // Subtle blur effect
  MEDIUM = 'medium',     // Moderate blur effect
  INTENSE = 'intense',   // Strong blur effect
  EXTREME = 'extreme'    // Very strong blur effect (for high speeds)
}

/**
 * Speed thresholds for adaptive blur (units per second)
 */
export interface SpeedThresholds {
  min: number;    // Minimum speed for blur to start
  low: number;    // Low speed threshold
  medium: number; // Medium speed threshold
  high: number;   // High speed threshold
  max: number;    // Maximum speed threshold
}

/**
 * Default preset settings
 */
const MOTION_BLUR_PRESETS: Record<MotionBlurPreset, MotionBlurEffectOptions> = {
  [MotionBlurPreset.OFF]: {
    enabled: false,
    intensity: 0.0,
    samples: 4,
    speedFactor: 0.0
  },
  [MotionBlurPreset.SUBTLE]: {
    enabled: true,
    intensity: 0.2,
    samples: 4,
    speedFactor: 0.5
  },
  [MotionBlurPreset.MEDIUM]: {
    enabled: true,
    intensity: 0.5,
    samples: 8,
    speedFactor: 1.0
  },
  [MotionBlurPreset.INTENSE]: {
    enabled: true,
    intensity: 0.8,
    samples: 16,
    speedFactor: 1.5
  },
  [MotionBlurPreset.EXTREME]: {
    enabled: true,
    intensity: 1.2,
    samples: 32,
    speedFactor: 2.0
  }
};

/**
 * Default speed thresholds
 */
const DEFAULT_SPEED_THRESHOLDS: SpeedThresholds = {
  min: 10,   // Minimum speed for blur to start
  low: 30,   // Low speed threshold
  medium: 60, // Medium speed threshold
  high: 90,   // High speed threshold
  max: 120    // Maximum speed threshold
};

/**
 * Specialized motion blur effect with speed-based intensity
 */
export class MotionBlurEffect {
  private scene: BABYLON.Scene;
  private camera: BABYLON.Camera;
  private motionBlurPostProcess: BABYLON.MotionBlurPostProcess | null = null;
  private currentPreset: MotionBlurPreset = MotionBlurPreset.MEDIUM;
  private customSettings: Partial<MotionBlurEffectOptions> = {};
  private speedThresholds: SpeedThresholds;
  private currentSpeed: number = 0;
  private adaptiveMode: boolean = false;
  private blurDirection: BABYLON.Vector2 = new BABYLON.Vector2(0, 0);
  private velocitySourceFn: (() => BABYLON.Vector3) | null = null;
  
  /**
   * Create a new motion blur effect
   * @param scene The scene to attach to
   * @param camera The camera to apply effect to
   * @param preset The initial preset to use
   * @param options Custom options to override preset
   * @param speedThresholds Speed thresholds for adaptive mode
   */
  constructor(
    scene: BABYLON.Scene,
    camera: BABYLON.Camera,
    preset: MotionBlurPreset = MotionBlurPreset.MEDIUM,
    options?: Partial<MotionBlurEffectOptions>,
    speedThresholds?: Partial<SpeedThresholds>
  ) {
    this.scene = scene;
    this.camera = camera;
    this.currentPreset = preset;
    this.customSettings = options || {};
    this.speedThresholds = { ...DEFAULT_SPEED_THRESHOLDS, ...speedThresholds };
    
    this.createPostProcess();
    this.applySettings();
  }
  
  /**
   * Create the motion blur post-process
   */
  private createPostProcess(): void {
    // Create motion blur post process
    this.motionBlurPostProcess = new BABYLON.MotionBlurPostProcess(
      'motionBlur',
      this.scene,
      1.0, // ratio
      this.camera
    );
    
    // Set up our custom implementation
    const originalApply = this.motionBlurPostProcess.onApply;
    this.motionBlurPostProcess.onApply = (effect: BABYLON.Effect) => {
      // Call original onApply first
      if (originalApply) {
        originalApply(effect);
      }
      
      // Get the settings
      const settings = this.getSettings();
      
      // If we have a velocity source function and adaptive mode is on,
      // calculate intensity based on speed
      if (this.velocitySourceFn && this.adaptiveMode) {
        const velocity = this.velocitySourceFn();
        this.currentSpeed = velocity.length();
        
        // Calculate blur strength based on speed
        const normalizedStrength = this.calculateAdaptiveStrength(this.currentSpeed);
        
        // Calculate blur direction from velocity
        if (this.currentSpeed > 0.1) {
          // Normalize velocity and convert to screen space direction
          const normalizedVelocity = velocity.normalize();
          this.blurDirection.x = -normalizedVelocity.x; // Invert for correct blur direction
          this.blurDirection.y = -normalizedVelocity.y;
        } else {
          this.blurDirection.x = 0;
          this.blurDirection.y = 0;
        }
        
        // Apply final values
        effect.setFloat('motionStrength', normalizedStrength * settings.intensity!);
        effect.setFloat2('screenSize', this.scene.getEngine().getRenderWidth(), this.scene.getEngine().getRenderHeight());
        effect.setVector2('direction', this.blurDirection);
      } else {
        // Standard implementation with fixed parameters
        effect.setFloat('motionStrength', settings.intensity || 0);
      }
    };
  }
  
  /**
   * Calculate adaptive blur strength based on speed
   * @param speed Current speed
   * @returns Normalized blur strength
   */
  private calculateAdaptiveStrength(speed: number): number {
    // No blur below minimum threshold
    if (speed < this.speedThresholds.min) {
      return 0;
    }
    
    // Clamp to max threshold
    const clampedSpeed = Math.min(speed, this.speedThresholds.max);
    
    // Normalize between min and max thresholds
    const normalizedSpeed = (clampedSpeed - this.speedThresholds.min) / 
      (this.speedThresholds.max - this.speedThresholds.min);
    
    // Apply curve for smoother transitions - ease-in-out quadratic
    const easedStrength = normalizedSpeed < 0.5 
      ? 2 * normalizedSpeed * normalizedSpeed 
      : -1 + (4 - 2 * normalizedSpeed) * normalizedSpeed;
    
    return easedStrength;
  }
  
  /**
   * Apply current settings to the post-process
   */
  private applySettings(): void {
    if (!this.motionBlurPostProcess) {
      return;
    }
    
    // Get preset settings
    const presetSettings = MOTION_BLUR_PRESETS[this.currentPreset];
    
    // Merge with custom settings
    const mergedSettings = {
      ...presetSettings,
      ...this.customSettings
    };
    
    // Apply to post-process
    if (mergedSettings.enabled === false) {
      // Instead of disabling post-process (which can cause issues with reattachment),
      // we set intensity to 0
      this.motionBlurPostProcess.motionStrength = 0;
    } else {
      this.motionBlurPostProcess.motionStrength = mergedSettings.intensity || 0;
    }
    
    // Other settings can be applied in the onApply callback
  }
  
  /**
   * Set the velocity source function to enable adaptive blur
   * @param velocitySourceFn Function that returns current velocity vector
   */
  public setVelocitySource(velocitySourceFn: () => BABYLON.Vector3): void {
    this.velocitySourceFn = velocitySourceFn;
  }
  
  /**
   * Enable adaptive motion blur based on speed
   * @param enable Whether to enable adaptive mode
   */
  public setAdaptiveMode(enable: boolean): void {
    this.adaptiveMode = enable;
  }
  
  /**
   * Enable the motion blur effect
   */
  public enable(): void {
    if (this.motionBlurPostProcess) {
      // Restore effect intensity
      const settings = this.getSettings();
      this.motionBlurPostProcess.motionStrength = settings.intensity || 0;
    }
  }
  
  /**
   * Disable the motion blur effect
   */
  public disable(): void {
    if (this.motionBlurPostProcess) {
      // Set intensity to 0 instead of disabling post-process
      this.motionBlurPostProcess.motionStrength = 0;
    }
  }
  
  /**
   * Switch to a different preset
   * @param preset The preset to use
   * @param keepCustomOverrides Whether to maintain custom settings
   */
  public usePreset(preset: MotionBlurPreset, keepCustomOverrides: boolean = true): void {
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
  public getSettings(): MotionBlurEffectOptions {
    const presetSettings = MOTION_BLUR_PRESETS[this.currentPreset];
    return { ...presetSettings, ...this.customSettings };
  }
  
  /**
   * Update multiple settings at once
   * @param options Settings to update
   */
  public updateSettings(options: Partial<MotionBlurEffectOptions>): void {
    this.customSettings = { ...this.customSettings, ...options };
    this.applySettings();
  }
  
  /**
   * Set the motion blur intensity
   * @param value Intensity value (0-2 range recommended)
   */
  public setIntensity(value: number): void {
    this.customSettings.intensity = value;
    this.applySettings();
  }
  
  /**
   * Update speed thresholds for adaptive mode
   * @param thresholds New threshold values
   */
  public updateSpeedThresholds(thresholds: Partial<SpeedThresholds>): void {
    this.speedThresholds = { ...this.speedThresholds, ...thresholds };
  }
  
  /**
   * Temporarily boost blur intensity for a duration (useful for impacts or sudden movements)
   * @param multiplier Intensity multiplier
   * @param duration Duration in milliseconds
   * @returns Promise that resolves when boost completes
   */
  public async boost(multiplier: number = 2.0, duration: number = 300): Promise<void> {
    if (!this.motionBlurPostProcess) {
      return Promise.resolve();
    }
    
    const originalIntensity = this.motionBlurPostProcess.motionStrength;
    const boostIntensity = originalIntensity * multiplier;
    
    // Set boosted intensity
    this.motionBlurPostProcess.motionStrength = boostIntensity;
    
    return new Promise<void>((resolve) => {
      // Use setTimeout for simple duration-based animation
      setTimeout(() => {
        if (this.motionBlurPostProcess) {
          this.motionBlurPostProcess.motionStrength = originalIntensity;
        }
        resolve();
      }, duration);
    });
  }
  
  /**
   * Get the current speed (only relevant when using adaptive mode)
   * @returns Current speed value
   */
  public getCurrentSpeed(): number {
    return this.currentSpeed;
  }
  
  /**
   * Dispose the effect and release resources
   */
  public dispose(): void {
    if (this.motionBlurPostProcess) {
      this.motionBlurPostProcess.dispose();
      this.motionBlurPostProcess = null;
    }
  }
} 