/**
 * @file src/core/renderer/effects/DepthOfFieldEffect.ts
 * @description Specialized depth of field effect with focus control based on distance.
 *
 * @dependencies babylonjs
 * @relatedFiles PostProcessingManager.ts, IPostProcessingManager.ts
 */
import * as BABYLON from 'babylonjs';
import { DepthOfFieldEffectOptions } from './IPostProcessingManager';

/**
 * Extended depth of field effect options with additional properties
 */
export interface ExtendedDepthOfFieldOptions extends DepthOfFieldEffectOptions {
  /** Lens f-stop (aperture) */
  fStop?: number;
  /** Focus distance in scene units */
  focusDistance?: number;
  /** Legacy focus distance property (use focusDistance instead) */
  focalDistance?: number;
  /** Focal depth (range of focus) */
  focalDepth?: number;
  /** Maximum blur strength (0-100) */
  maxBlurStrength?: number;
  /** Direct blur amount setting */
  blurAmount?: number;
}

/**
 * Depth of field focus presets
 */
export enum DepthOfFieldPreset {
  OFF = 'off', // No depth of field
  SUBTLE = 'subtle', // Subtle focus effect
  MEDIUM = 'medium', // Medium focus effect
  INTENSE = 'intense', // Strong focus effect
  MACRO = 'macro', // Close-up focus (for inspecting objects)
  CINEMATIC = 'cinematic', // Dramatic cinematic focus
}

/**
 * Default preset settings
 */
const DOF_PRESETS: Record<DepthOfFieldPreset, ExtendedDepthOfFieldOptions> = {
  [DepthOfFieldPreset.OFF]: {
    enabled: false,
    focalLength: 50,
    fStop: 1.4,
    focusDistance: 2000,
    focalDepth: 100,
    maxBlurStrength: 0,
  },
  [DepthOfFieldPreset.SUBTLE]: {
    enabled: true,
    focalLength: 50,
    fStop: 5.6,
    focusDistance: 2000,
    focalDepth: 500,
    maxBlurStrength: 5,
  },
  [DepthOfFieldPreset.MEDIUM]: {
    enabled: true,
    focalLength: 85,
    fStop: 2.8,
    focusDistance: 2000,
    focalDepth: 300,
    maxBlurStrength: 30,
  },
  [DepthOfFieldPreset.INTENSE]: {
    enabled: true,
    focalLength: 135,
    fStop: 1.8,
    focusDistance: 2000,
    focalDepth: 300,
    maxBlurStrength: 64,
  },
  [DepthOfFieldPreset.MACRO]: {
    enabled: true,
    focalLength: 200,
    fStop: 1.4,
    focusDistance: 500,
    focalDepth: 20,
    maxBlurStrength: 100,
  },
  [DepthOfFieldPreset.CINEMATIC]: {
    enabled: true,
    focalLength: 70,
    fStop: 2.0,
    focusDistance: 2000,
    focalDepth: 200,
    maxBlurStrength: 80,
  },
};

/**
 * Specialized depth of field effect with dynamic focus control
 */
export class DepthOfFieldEffect {
  private scene: BABYLON.Scene;
  private camera: BABYLON.Camera;
  private pipeline: BABYLON.DefaultRenderingPipeline;
  private currentPreset: DepthOfFieldPreset = DepthOfFieldPreset.MEDIUM;
  private customSettings: Partial<ExtendedDepthOfFieldOptions> = {};
  private autoFocusEnabled: boolean = false;
  private focusTarget: BABYLON.Mesh | null = null;
  private autoFocusObserver: BABYLON.Observer<BABYLON.Scene> | null = null;
  private transitionInProgress: boolean = false;

  /**
   * Create a new depth of field effect
   * @param scene The scene to attach to
   * @param camera The camera to apply effect to
   * @param pipeline The rendering pipeline
   * @param preset The initial preset to use
   * @param options Custom options to override preset
   */
  constructor(
    scene: BABYLON.Scene,
    camera: BABYLON.Camera,
    pipeline: BABYLON.DefaultRenderingPipeline,
    preset: DepthOfFieldPreset = DepthOfFieldPreset.MEDIUM,
    options?: Partial<ExtendedDepthOfFieldOptions>
  ) {
    this.scene = scene;
    this.camera = camera;
    this.pipeline = pipeline;
    this.currentPreset = preset;
    this.customSettings = options || {};

    // Initialize depth of field effect in pipeline
    this.initializeDepthOfField();
    this.applySettings();
  }

  /**
   * Initialize depth of field in the rendering pipeline
   */
  private initializeDepthOfField(): void {
    // Ensure depth of field is enabled in the pipeline
    this.pipeline.depthOfFieldEnabled = true;

    // Ensure the depth of field effect is using the lens blur
    this.pipeline.depthOfFieldBlurLevel = BABYLON.DepthOfFieldEffectBlurLevel.High;
  }

  /**
   * Apply current settings to the pipeline
   */
  private applySettings(): void {
    if (!this.pipeline) {
      return;
    }

    // Get preset settings
    const presetSettings = DOF_PRESETS[this.currentPreset];

    // Merge with custom settings
    const mergedSettings = {
      ...presetSettings,
      ...this.customSettings,
    };

    // Apply to pipeline
    this.pipeline.depthOfFieldEnabled = !!mergedSettings.enabled;

    // If disabled, no need to set other parameters
    if (!mergedSettings.enabled) {
      return;
    }

    // Apply settings to the depth of field effect
    const dof = this.pipeline.depthOfField;
    if (dof) {
      // Configure DOF settings
      dof.focalLength = mergedSettings.focalLength || 50;

      // Map from our extended options to the Babylon.js properties
      if (mergedSettings.fStop) {
        // Use type assertion to access properties that might not be in typings
        (dof as any).fStop = mergedSettings.fStop;
      }

      // Handle focusDistance (which maps to focalDistance in Babylon)
      if (mergedSettings.focusDistance) {
        // Use the correct property name according to Babylon.js API
        dof.focusDistance = mergedSettings.focusDistance;
      } else if (mergedSettings.focalDistance) {
        // Support legacy property name
        dof.focusDistance = mergedSettings.focalDistance;
      }

      // Other properties that might need mapping
      if (mergedSettings.blurAmount) {
        // Apply blur amount if specified - use type assertion for properties not in typings
        (dof as any).depthOfFieldBlurLevel = mergedSettings.blurAmount;
      } else if (mergedSettings.maxBlurStrength) {
        // Set blur based on max blur strength - use type assertion for properties not in typings
        const kernelSize = this.mapBlurStrengthToKernelSize(mergedSettings.maxBlurStrength);
        (dof as any).depthOfFieldBlurWidth = kernelSize;
      }
    }
  }

  /**
   * Map blur strength value to kernel size (internal helper)
   * @param strength Blur strength (0-100)
   * @returns Appropriate kernel size
   */
  private mapBlurStrengthToKernelSize(strength: number): number {
    // Convert strength (0-100) to kernel size
    // Kernel size in Babylon.js DOF typically ranges from 32 to 128
    const minKernel = 32;
    const maxKernel = 128;
    return Math.round(minKernel + (strength / 100) * (maxKernel - minKernel));
  }

  /**
   * Enable the depth of field effect
   */
  public enable(): void {
    if (this.pipeline) {
      this.pipeline.depthOfFieldEnabled = true;
      this.applySettings();
    }
  }

  /**
   * Disable the depth of field effect
   */
  public disable(): void {
    if (this.pipeline) {
      this.pipeline.depthOfFieldEnabled = false;
    }
  }

  /**
   * Switch to a different preset
   * @param preset The preset to use
   * @param transitionDuration Duration of transition in ms (0 for instant)
   * @param keepCustomOverrides Whether to maintain custom settings
   */
  public usePreset(
    preset: DepthOfFieldPreset,
    transitionDuration: number = 0,
    keepCustomOverrides: boolean = true
  ): Promise<void> {
    // Save current preset
    const previousPreset = this.currentPreset;
    this.currentPreset = preset;

    if (!keepCustomOverrides) {
      this.customSettings = {};
    }

    // If no transition, apply immediately
    if (transitionDuration <= 0 || !this.pipeline.depthOfField) {
      this.applySettings();
      return Promise.resolve();
    }

    // Otherwise, transition smoothly
    return this.transitionSettings(
      DOF_PRESETS[previousPreset],
      { ...DOF_PRESETS[preset], ...this.customSettings },
      transitionDuration
    );
  }

  /**
   * Transition between two sets of settings
   * @param fromSettings Starting settings
   * @param toSettings Target settings
   * @param duration Duration in milliseconds
   * @returns Promise that resolves when transition completes
   */
  private async transitionSettings(
    fromSettings: ExtendedDepthOfFieldOptions,
    toSettings: ExtendedDepthOfFieldOptions,
    duration: number
  ): Promise<void> {
    if (this.transitionInProgress || !this.pipeline.depthOfField) {
      return Promise.resolve();
    }

    this.transitionInProgress = true;
    const dof = this.pipeline.depthOfField;
    const startTime = Date.now();

    return new Promise<void>(resolve => {
      // Create a scene observer for animation
      const observer = this.scene.onBeforeRenderObservable.add(() => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;

        // Calculate progress (0 to 1)
        const progress = Math.min(elapsed / duration, 1);

        // Interpolate all values
        dof.focalLength = this.lerp(
          fromSettings.focalLength || 50,
          toSettings.focalLength || 50,
          progress
        );

        // Use aperture instead of fStop
        if (fromSettings.fStop && toSettings.fStop) {
          (dof as any).fStop = this.lerp(fromSettings.fStop, toSettings.fStop, progress);
        }

        // Handle focusDistance property (maps to focusDistance in our extended options)
        const fromFocalDist = fromSettings.focusDistance || fromSettings.focalDistance || 2000;
        const toFocalDist = toSettings.focusDistance || toSettings.focalDistance || 2000;
        dof.focusDistance = this.lerp(fromFocalDist, toFocalDist, progress);

        // Interpolate blur strength (kernel size)
        if (
          fromSettings.maxBlurStrength !== undefined &&
          toSettings.maxBlurStrength !== undefined
        ) {
          const fromBlur = fromSettings.maxBlurStrength;
          const toBlur = toSettings.maxBlurStrength;
          const currentBlur = this.lerp(fromBlur, toBlur, progress);
          (dof as any).depthOfFieldBlurWidth = this.mapBlurStrengthToKernelSize(currentBlur);
        } else if (fromSettings.blurAmount !== undefined && toSettings.blurAmount !== undefined) {
          // Or use direct blur amount if available
          (dof as any).depthOfFieldBlurLevel = this.lerp(
            fromSettings.blurAmount,
            toSettings.blurAmount,
            progress
          );
        }

        // If transition is complete
        if (progress >= 1) {
          this.scene.onBeforeRenderObservable.remove(observer);
          this.transitionInProgress = false;
          resolve();
        }
      });
    });
  }

  /**
   * Linear interpolation helper
   * @param a Starting value
   * @param b Ending value
   * @param t Progress (0-1)
   * @returns Interpolated value
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Get a copy of the current settings
   * @returns Current settings
   */
  public getSettings(): ExtendedDepthOfFieldOptions {
    const presetSettings = DOF_PRESETS[this.currentPreset];
    return { ...presetSettings, ...this.customSettings };
  }

  /**
   * Update multiple settings at once
   * @param options Settings to update
   * @param transitionDuration Duration for smooth transition (0 for instant)
   */
  public async updateSettings(
    options: Partial<ExtendedDepthOfFieldOptions>,
    transitionDuration: number = 0
  ): Promise<void> {
    if (transitionDuration <= 0) {
      this.customSettings = { ...this.customSettings, ...options };
      this.applySettings();
      return Promise.resolve();
    }

    // Otherwise, transition smoothly
    const currentSettings = this.getSettings();
    const newSettings = { ...currentSettings, ...options };
    this.customSettings = { ...this.customSettings, ...options };

    return this.transitionSettings(currentSettings, newSettings, transitionDuration);
  }

  /**
   * Set a focus target for auto-focus
   * @param mesh The mesh to focus on
   * @param enabled Whether to enable auto-focus
   */
  public setFocusTarget(mesh: BABYLON.Mesh, enabled: boolean = true): void {
    this.focusTarget = mesh;
    this.setAutoFocus(enabled);
  }

  /**
   * Enable or disable auto-focus on target
   * @param enabled Whether to enable auto-focus
   */
  public setAutoFocus(enabled: boolean): void {
    this.autoFocusEnabled = enabled;

    // Clean up existing observer
    if (this.autoFocusObserver) {
      this.scene.onBeforeRenderObservable.remove(this.autoFocusObserver);
      this.autoFocusObserver = null;
    }

    // If enabled and we have a target, create new observer
    if (enabled && this.focusTarget && this.pipeline.depthOfField) {
      this.autoFocusObserver = this.scene.onBeforeRenderObservable.add(() => {
        if (!this.focusTarget || !this.pipeline.depthOfField) return;

        // Calculate distance from camera to focus target
        const cameraPosition = this.camera.position;
        const targetPosition = this.focusTarget.position;
        const distance = BABYLON.Vector3.Distance(cameraPosition, targetPosition);

        // Smoothly update focus distance (to avoid jarring changes)
        const currentFocusDistance = this.pipeline.depthOfField.focusDistance;
        const smoothingFactor = 0.05; // Adjust for slower/faster focus changes

        this.pipeline.depthOfField.focusDistance =
          currentFocusDistance + (distance - currentFocusDistance) * smoothingFactor;
      });
    }
  }

  /**
   * Focus on a specific world position
   * @param position Position to focus on
   * @param transitionDuration Duration for smooth transition (0 for instant)
   */
  public async focusOnPosition(
    position: BABYLON.Vector3,
    transitionDuration: number = 300
  ): Promise<void> {
    if (!this.pipeline.depthOfField) {
      return Promise.resolve();
    }

    // Calculate distance from camera to position
    const distance = BABYLON.Vector3.Distance(this.camera.position, position);

    // Update focus distance with transition (using focusDistance to match BabylonJS API)
    return this.updateSettings({ focusDistance: distance }, transitionDuration);
  }

  /**
   * Focus on a specific mesh
   * @param mesh Mesh to focus on
   * @param transitionDuration Duration for smooth transition (0 for instant)
   */
  public async focusOnMesh(mesh: BABYLON.Mesh, transitionDuration: number = 300): Promise<void> {
    return this.focusOnPosition(mesh.position, transitionDuration);
  }

  /**
   * Create a rack focus effect (shift focus from one object to another)
   * @param fromMesh Starting focus mesh
   * @param toMesh Target focus mesh
   * @param duration Duration in milliseconds
   * @returns Promise that resolves when transition completes
   */
  public async rackFocus(
    fromMesh: BABYLON.Mesh,
    toMesh: BABYLON.Mesh,
    duration: number = 1500
  ): Promise<void> {
    if (!this.pipeline.depthOfField) {
      return Promise.resolve();
    }

    // Calculate distances
    const fromDistance = BABYLON.Vector3.Distance(this.camera.position, fromMesh.position);
    const toDistance = BABYLON.Vector3.Distance(this.camera.position, toMesh.position);

    // Temporarily increase blur for dramatic effect
    const currentBlur =
      this.customSettings.maxBlurStrength || DOF_PRESETS[this.currentPreset].maxBlurStrength || 30;
    const increasedBlur = Math.min(currentBlur * 1.5, 100);

    // Apply initial focus (using focusDistance to match BabylonJS API)
    await this.updateSettings(
      {
        focusDistance: fromDistance,
        maxBlurStrength: increasedBlur,
      },
      0
    );

    // Transition to new focus
    await this.updateSettings(
      {
        focusDistance: toDistance,
      },
      duration
    );

    // Restore normal blur amount
    return this.updateSettings(
      {
        maxBlurStrength: currentBlur,
      },
      300
    );
  }

  /**
   * Simulate a breath effect (slight pulsing of focus)
   * @param intensity Intensity of the effect (0-1)
   * @param duration Duration in milliseconds
   * @returns Promise that resolves when effect completes
   */
  public async breathEffect(intensity: number = 0.3, duration: number = 2000): Promise<void> {
    if (!this.pipeline.depthOfField) {
      return Promise.resolve();
    }

    // Store original values
    const originalSettings = this.getSettings();
    const startTime = Date.now();
    this.transitionInProgress = true;

    return new Promise<void>(resolve => {
      const observer = this.scene.onBeforeRenderObservable.add(() => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;

        // Calculate progress (0 to 1)
        const progress = Math.min(elapsed / duration, 1);

        // Create a sine wave effect
        const breathFactor = Math.sin(progress * Math.PI * 2) * intensity;

        // Apply subtle variations
        if (this.pipeline.depthOfField) {
          // Vary focal length slightly
          this.pipeline.depthOfField.focalLength =
            originalSettings.focalLength! * (1 + breathFactor * 0.1);

          // Vary focus distance slightly
          this.pipeline.depthOfField.focusDistance =
            (originalSettings.focusDistance || originalSettings.focalDistance || 2000) *
            (1 + breathFactor * 0.05);

          // Vary aperture slightly
          this.pipeline.depthOfField.fStop =
            (originalSettings.fStop || 2.8) * (1 - breathFactor * 0.15);
        }

        // If effect is complete
        if (progress >= 1) {
          this.scene.onBeforeRenderObservable.remove(observer);
          this.transitionInProgress = false;

          // Restore original settings
          this.updateSettings(originalSettings, 300);
          resolve();
        }
      });
    });
  }

  /**
   * Dispose the effect and release resources
   */
  public dispose(): void {
    // Remove auto-focus observer if it exists
    if (this.autoFocusObserver) {
      this.scene.onBeforeRenderObservable.remove(this.autoFocusObserver);
      this.autoFocusObserver = null;
    }

    // Disable DOF in pipeline (not disposing the pipeline itself)
    if (this.pipeline) {
      this.pipeline.depthOfFieldEnabled = false;
    }
  }
}
