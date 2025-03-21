/**
 * @file src/core/renderer/effects/IPostProcessingManager.ts
 * @description Interface for post-processing effects management.
 * 
 * @dependencies babylonjs
 * @relatedFiles PostProcessingManager.ts, BloomEffect.ts, MotionBlurEffect.ts, DepthOfFieldEffect.ts
 */
import * as BABYLON from 'babylonjs';

/**
 * Available post-processing effect types
 */
export enum PostProcessEffectType {
  BLOOM = 'bloom',
  MOTION_BLUR = 'motionBlur',
  DEPTH_OF_FIELD = 'depthOfField',
  COLOR_CORRECTION = 'colorCorrection',
  CHROMATIC_ABERRATION = 'chromaticAberration',
  FILM_GRAIN = 'filmGrain',
  VIGNETTE = 'vignette',
  ANTI_ALIASING = 'antiAliasing',
  AMBIENT_OCCLUSION = 'ambientOcclusion'
}

/**
 * Base interface for post-process effect options
 */
export interface PostProcessEffectOptions {
  /** Whether the effect is enabled */
  enabled?: boolean;
  /** Processing priority (order of execution) */
  priority?: number;
}

/**
 * Options for bloom effect
 */
export interface BloomEffectOptions extends PostProcessEffectOptions {
  /** Size of the bloom filter */
  kernelSize?: number;
  /** Bloom intensity */
  intensity?: number;
  /** Bloom threshold */
  threshold?: number;
  /** Bloom scaling factor */
  scale?: number;
}

/**
 * Options for motion blur effect
 */
export interface MotionBlurEffectOptions extends PostProcessEffectOptions {
  /** Motion blur intensity */
  intensity?: number;
  /** Motion blur samples */
  samples?: number;
  /** Speed-based intensity factor */
  speedFactor?: number;
}

/**
 * Options for depth of field effect
 */
export interface DepthOfFieldEffectOptions extends PostProcessEffectOptions {
  /**
   * Focus distance in scene units
   */
  focusDistance?: number;
  
  /**
   * Focal length in millimeters
   */
  focalLength?: number;
  
  /**
   * F-stop (aperture) - lower values give more blur
   */
  fStop?: number;
  
  /**
   * Lens size in scene units
   */
  lensSize?: number;
}

/**
 * Options for color correction effect
 */
export interface ColorCorrectionEffectOptions extends PostProcessEffectOptions {
  /** Color saturation (0-2) */
  saturation?: number;
  /** Color contrast (0-2) */
  contrast?: number;
  /** Color exposure (0-2) */
  exposure?: number;
}

/**
 * Options for ambient occlusion effect
 */
export interface AmbientOcclusionEffectOptions extends PostProcessEffectOptions {
  /** Ambient occlusion radius */
  radius?: number;
  /** Ambient occlusion strength */
  strength?: number;
  /** Ambient occlusion sample count */
  samples?: number;
  /** Whether to use blurred occlusion */
  useBlur?: boolean;
}

/**
 * Interface for post-processing manager
 */
export interface IPostProcessingManager {
  /**
   * Initialize the post-processing manager
   * @param scene The scene to attach post-processing to
   */
  initialize(scene: BABYLON.Scene): void;
  
  /**
   * Create the default post-processing pipeline
   */
  createDefaultPipeline(): void;
  
  /**
   * Add a post-processing effect
   * @param type Type of effect to add
   * @param options Effect options
   * @returns True if effect was added successfully
   */
  addEffect(type: PostProcessEffectType, options?: PostProcessEffectOptions): boolean;
  
  /**
   * Remove a post-processing effect
   * @param type Type of effect to remove
   * @returns True if effect was removed successfully
   */
  removeEffect(type: PostProcessEffectType): boolean;
  
  /**
   * Get a post-processing effect
   * @param type Type of effect to get
   * @returns The post-process object or null if not found
   */
  getEffect(type: PostProcessEffectType): BABYLON.PostProcess | null;
  
  /**
   * Enable a post-processing effect
   * @param type Type of effect to enable
   * @returns True if effect was enabled successfully
   */
  enableEffect(type: PostProcessEffectType): boolean;
  
  /**
   * Disable a post-processing effect
   * @param type Type of effect to disable
   * @returns True if effect was disabled successfully
   */
  disableEffect(type: PostProcessEffectType): boolean;
  
  /**
   * Update effect options
   * @param type Type of effect to update
   * @param options New effect options
   * @returns True if effect was updated successfully
   */
  updateEffectOptions(type: PostProcessEffectType, options: PostProcessEffectOptions): boolean;
  
  /**
   * Configure bloom effect
   * @param options Bloom effect options
   * @returns True if effect was configured successfully
   */
  configureBloom(options: BloomEffectOptions): boolean;
  
  /**
   * Configure motion blur effect
   * @param options Motion blur effect options
   * @returns True if effect was configured successfully
   */
  configureMotionBlur(options: MotionBlurEffectOptions): boolean;
  
  /**
   * Configure depth of field effect
   * @param options Depth of field effect options
   * @returns True if effect was configured successfully
   */
  configureDepthOfField(options: DepthOfFieldEffectOptions): boolean;
  
  /**
   * Configure color correction effect
   * @param options Color correction effect options
   * @returns True if effect was configured successfully
   */
  configureColorCorrection(options: ColorCorrectionEffectOptions): boolean;
  
  /**
   * Reset all post-processing effects to defaults
   */
  resetEffects(): void;
  
  /**
   * Dispose all post-processing effects and resources
   */
  dispose(): void;
  
  /**
   * Enable or disable bloom effect
   * @param enabled Whether bloom should be enabled
   * @returns True if operation was successful
   */
  enableBloom(enabled: boolean): boolean;
  
  /**
   * Enable or disable depth of field effect
   * @param enabled Whether depth of field should be enabled
   * @returns True if operation was successful
   */
  enableDepthOfField(enabled: boolean): boolean;
  
  /**
   * Enable or disable ambient occlusion effect
   * @param enabled Whether ambient occlusion should be enabled
   * @returns True if operation was successful
   */
  enableAmbientOcclusion(enabled: boolean): boolean;
  
  /**
   * Set bloom intensity
   * @param intensity Bloom intensity value
   * @returns True if operation was successful
   */
  setBloomIntensity(intensity: number): boolean;
  
  /**
   * Set depth of field focal length
   * @param focalLength Focal length in millimeters
   * @returns True if operation was successful
   */
  setDepthOfFieldFocalLength(focalLength: number): boolean;
  
  /**
   * Set ambient occlusion radius
   * @param radius Radius value for ambient occlusion
   * @returns True if operation was successful
   */
  setAmbientOcclusionRadius(radius: number): boolean;
  
  /**
   * Enable or disable the entire post-processing pipeline
   * @param enabled Whether the pipeline should be enabled
   * @returns True if operation was successful
   */
  setPipelineEnabled(enabled: boolean): boolean;
} 