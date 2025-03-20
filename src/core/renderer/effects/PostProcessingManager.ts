/**
 * @file src/core/renderer/effects/PostProcessingManager.ts
 * @description Implementation of post-processing effects management.
 *
 * @dependencies babylonjs
 * @relatedFiles IPostProcessingManager.ts
 */
import * as BABYLON from 'babylonjs';
import {
  IPostProcessingManager,
  PostProcessEffectType,
  PostProcessEffectOptions,
  BloomEffectOptions,
  MotionBlurEffectOptions,
  DepthOfFieldEffectOptions,
  ColorCorrectionEffectOptions,
} from './IPostProcessingManager';
import { Logger } from '../../utils/Logger';
import { ServiceLocator } from '../../base/ServiceLocator';

/**
 * Default options for bloom effect
 */
const DEFAULT_BLOOM_OPTIONS: BloomEffectOptions = {
  enabled: true,
  priority: 100,
  kernelSize: 64,
  intensity: 0.5,
  threshold: 0.8,
  scale: 0.5,
};

/**
 * Default options for motion blur effect
 */
const DEFAULT_MOTION_BLUR_OPTIONS: MotionBlurEffectOptions = {
  enabled: true,
  priority: 200,
  intensity: 0.2,
  samples: 10,
  speedFactor: 1.0,
};

/**
 * Default options for depth of field effect
 */
const DEFAULT_DEPTH_OF_FIELD_OPTIONS: DepthOfFieldEffectOptions = {
  enabled: true,
  priority: 300,
  focalLength: 50,
  focusDistance: 10,
  fStop: 2.8,
  lensSize: 0.1,
};

/**
 * Default options for color correction effect
 */
const DEFAULT_COLOR_CORRECTION_OPTIONS: ColorCorrectionEffectOptions = {
  enabled: true,
  priority: 400,
  saturation: 1.0,
  contrast: 1.1,
  exposure: 1.0,
};

/**
 * Implementation of IPostProcessingManager for managing post-processing effects
 */
export class PostProcessingManager implements IPostProcessingManager {
  private scene: BABYLON.Scene | null = null;
  private camera: BABYLON.Camera | null = null;
  private postProcesses: Map<PostProcessEffectType, BABYLON.PostProcess> = new Map();
  private effectOptions: Map<PostProcessEffectType, PostProcessEffectOptions> = new Map();
  private logger: Logger;
  private defaultPipelineEnabled: boolean = true;

  /**
   * Creates a new PostProcessingManager
   */
  constructor() {
    // Initialize logger
    this.logger = new Logger('PostProcessingManager');
    
    // Try to get logger from ServiceLocator if available
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        // Add context tag
        this.logger.addTag('PostProcessingManager');
      }
    } catch (e) {
      // If service locator is not available, we'll use the default logger
    }
  }

  /**
   * Initialize the post processing manager
   * @param scene The scene to apply effects to
   */
  public initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
    
    // Get active camera
    if (scene.activeCamera) {
      this.camera = scene.activeCamera;
    }
    
    // Listen for active camera changes
    scene.onActiveCameraChanged.add(() => {
      if (scene.activeCamera) {
        this.camera = scene.activeCamera;
        
        // Re-attach post processes to new active camera
        this.reattachPostProcesses();
      }
    });
  }

  /**
   * Reattach existing post processes to the current camera
   */
  private reattachPostProcesses(): void {
    if (!this.camera) return;
    
    // Reattach all post processes to the new camera
    for (const [type, postProcess] of this.postProcesses.entries()) {
      // Detach from current camera and attach to the new one
      postProcess.dispose();
      
      // Get options and recreate
      const options = this.effectOptions.get(type);
      if (options) {
        this.addEffect(type, options);
      }
    }
  }

  /**
   * Add a post-processing effect
   * @param type Type of effect to add
   * @param options Effect options
   * @returns True if effect was added successfully
   */
  public addEffect(type: PostProcessEffectType, options?: PostProcessEffectOptions): boolean {
    if (!this.scene || !this.camera) {
      this.logger.error('PostProcessingManager: Cannot add effect, manager not initialized');
      return false;
    }

    try {
      // Check if effect already exists
      if (this.postProcesses.has(type)) {
        return this.updateEffectOptions(type, options || {});
      }

      // Create effect based on type
      let postProcess: BABYLON.PostProcess | null = null;

      switch (type) {
        case PostProcessEffectType.BLOOM:
          postProcess = this.createBloomEffect(options as BloomEffectOptions);
          break;
        case PostProcessEffectType.MOTION_BLUR:
          postProcess = this.createMotionBlurEffect(options as MotionBlurEffectOptions);
          break;
        case PostProcessEffectType.DEPTH_OF_FIELD:
          postProcess = this.createDepthOfFieldEffect(options as DepthOfFieldEffectOptions);
          break;
        case PostProcessEffectType.COLOR_CORRECTION:
          postProcess = this.createColorCorrectionEffect(options as ColorCorrectionEffectOptions);
          break;
        case PostProcessEffectType.CHROMATIC_ABERRATION:
          postProcess = this.createChromaticAberrationEffect(options);
          break;
        case PostProcessEffectType.FILM_GRAIN:
          postProcess = this.createFilmGrainEffect(options);
          break;
        case PostProcessEffectType.VIGNETTE:
          postProcess = this.createVignetteEffect(options);
          break;
        case PostProcessEffectType.ANTI_ALIASING:
          postProcess = this.createAntiAliasingEffect(options);
          break;
        default:
          this.logger.error(`PostProcessingManager: Unknown effect type ${type}`);
          return false;
      }

      if (postProcess) {
        this.postProcesses.set(type, postProcess);
        this.effectOptions.set(type, options || this.getDefaultOptionsForType(type));
        return true;
      }

      return false;
    } catch (err) {
      this.logger.error(`PostProcessingManager: Failed to add effect ${type}`, err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  /**
   * Remove a post-processing effect
   * @param type Type of effect to remove
   * @returns True if effect was removed successfully
   */
  public removeEffect(type: PostProcessEffectType): boolean {
    const postProcess = this.postProcesses.get(type);
    if (postProcess) {
      postProcess.dispose();
      this.postProcesses.delete(type);
      return true;
    }
    return false;
  }

  /**
   * Get a post-processing effect
   * @param type Type of effect to get
   * @returns The post-process object or null if not found
   */
  public getEffect(type: PostProcessEffectType): BABYLON.PostProcess | null {
    return this.postProcesses.get(type) || null;
  }

  /**
   * Enable a post-processing effect
   * @param type Type of effect to enable
   * @returns True if effect was enabled successfully
   */
  public enableEffect(type: PostProcessEffectType): boolean {
    const postProcess = this.postProcesses.get(type);
    if (postProcess) {
      // Some effects might need special handling to enable
      (postProcess as unknown as { isEnabled: boolean }).isEnabled = true;

      // Update options
      const options = this.effectOptions.get(type);
      if (options) {
        options.enabled = true;
      }

      return true;
    }
    return false;
  }

  /**
   * Disable a post-processing effect
   * @param type Type of effect to disable
   * @returns True if effect was disabled successfully
   */
  public disableEffect(type: PostProcessEffectType): boolean {
    const postProcess = this.postProcesses.get(type);
    if (postProcess) {
      // Some effects might need special handling to disable
      (postProcess as unknown as { isEnabled: boolean }).isEnabled = false;

      // Update options
      const options = this.effectOptions.get(type);
      if (options) {
        options.enabled = false;
      }

      return true;
    }
    return false;
  }

  /**
   * Update effect options
   * @param type Type of effect to update
   * @param options New effect options
   * @returns True if effect was updated successfully
   */
  public updateEffectOptions(
    type: PostProcessEffectType,
    options: PostProcessEffectOptions
  ): boolean {
    // Get existing options and merge with new ones
    const existingOptions = this.effectOptions.get(type);
    if (!existingOptions) {
      return false;
    }

    const updatedOptions = { ...existingOptions, ...options };

    // Update stored options
    this.effectOptions.set(type, updatedOptions);

    // Update effect based on type
    switch (type) {
      case PostProcessEffectType.BLOOM:
        return this.configureBloom(updatedOptions as BloomEffectOptions);
      case PostProcessEffectType.MOTION_BLUR:
        return this.configureMotionBlur(updatedOptions as MotionBlurEffectOptions);
      case PostProcessEffectType.DEPTH_OF_FIELD:
        return this.configureDepthOfField(updatedOptions as DepthOfFieldEffectOptions);
      case PostProcessEffectType.COLOR_CORRECTION:
        return this.configureColorCorrection(updatedOptions as ColorCorrectionEffectOptions);
      // Other effect types...
      default: {
        // Generic options update
        const postProcess = this.postProcesses.get(type);
        if (postProcess) {
          postProcess.enabled = updatedOptions.enabled !== false;
          return true;
        }
        return false;
      }
    }
  }

  /**
   * Configure bloom effect
   * @param options Bloom effect options
   * @returns True if configuration was successful
   */
  public configureBloom(options: BloomEffectOptions): boolean {
    if (!this.scene || !this.camera) {
      return false;
    }

    try {
      // Get existing bloom effect or create a new one
      let bloomEffect = this.getEffect(PostProcessEffectType.BLOOM);
      if (!bloomEffect) {
        bloomEffect = this.createBloomEffect(options);
        if (bloomEffect) {
          this.postProcesses.set(PostProcessEffectType.BLOOM, bloomEffect);
        }
      }

      if (bloomEffect) {
        // Apply options to the bloom effect
        const mergedOptions = {
          ...DEFAULT_BLOOM_OPTIONS,
          ...options
        };

        // Cast to correct types for Babylon.js
        const bloom = bloomEffect as any;
        if (bloom.kernel !== undefined) {
          bloom.kernel = mergedOptions.kernelSize;
        }
        if (bloom.threshold !== undefined) {
          bloom.threshold = mergedOptions.threshold;
        }
        if (bloom.weight !== undefined) {
          bloom.weight = mergedOptions.intensity;
        }
        
        // Enable/disable based on options
        bloomEffect.enabled = !!mergedOptions.enabled;
        
        // Store the updated options
        this.effectOptions.set(PostProcessEffectType.BLOOM, mergedOptions);
        
        return true;
      }
      
      return false;
    } catch (err) {
      this.logger.error('Failed to configure bloom effect', err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  /**
   * Configure motion blur effect
   * @param options Motion blur effect options
   * @returns True if effect was configured successfully
   */
  public configureMotionBlur(options: MotionBlurEffectOptions): boolean {
    const motionBlurEffect = this.postProcesses.get(PostProcessEffectType.MOTION_BLUR);
    if (!motionBlurEffect) {
      // If effect doesn't exist yet, add it
      if (!this.scene || !this.camera) return false;
      return this.addEffect(PostProcessEffectType.MOTION_BLUR, options);
    }

    try {
      // Update motion blur effect settings
      const motionBlurOptions = { ...DEFAULT_MOTION_BLUR_OPTIONS, ...options };

      // Access properties using type assertion
      const motionBlurAny = motionBlurEffect as unknown as Record<string, any>;
      if (motionBlurAny.motionStrength !== undefined) {
        motionBlurAny.motionStrength =
          motionBlurOptions.intensity || DEFAULT_MOTION_BLUR_OPTIONS.intensity;
      }
      if (motionBlurAny.motionBlurSamples !== undefined) {
        motionBlurAny.motionBlurSamples =
          motionBlurOptions.samples || DEFAULT_MOTION_BLUR_OPTIONS.samples;
      }

      (motionBlurEffect as unknown as { isEnabled: boolean }).isEnabled =
        motionBlurOptions.enabled !== false;

      // Update stored options
      this.effectOptions.set(PostProcessEffectType.MOTION_BLUR, motionBlurOptions);
      return true;
    } catch (err) {
      this.logger.error('PostProcessingManager: Failed to configure motion blur effect', err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  /**
   * Configure depth of field effect
   * @param options Depth of field effect options
   * @returns True if effect was configured successfully
   */
  public configureDepthOfField(options: DepthOfFieldEffectOptions): boolean {
    const depthOfFieldEffect = this.postProcesses.get(PostProcessEffectType.DEPTH_OF_FIELD);
    if (!depthOfFieldEffect) {
      // If effect doesn't exist yet, add it
      if (!this.scene || !this.camera) return false;
      return this.addEffect(PostProcessEffectType.DEPTH_OF_FIELD, options);
    }

    try {
      // Update depth of field effect settings
      const dofOptions = { ...DEFAULT_DEPTH_OF_FIELD_OPTIONS, ...options };

      // Access properties using type assertion
      const dofAny = depthOfFieldEffect as unknown as Record<string, any>;
      if (dofAny.focalLength !== undefined) {
        dofAny.focalLength = dofOptions.focalLength || DEFAULT_DEPTH_OF_FIELD_OPTIONS.focalLength;
      }
      if (dofAny.focusDistance !== undefined) {
        dofAny.focusDistance =
          dofOptions.focusDistance || DEFAULT_DEPTH_OF_FIELD_OPTIONS.focusDistance;
      }
      if (dofAny.fStop !== undefined) {
        dofAny.fStop = dofOptions.fStop || DEFAULT_DEPTH_OF_FIELD_OPTIONS.fStop;
      }
      if (dofAny.lensSize !== undefined) {
        dofAny.lensSize = dofOptions.lensSize || DEFAULT_DEPTH_OF_FIELD_OPTIONS.lensSize;
      }

      (depthOfFieldEffect as unknown as { isEnabled: boolean }).isEnabled =
        dofOptions.enabled !== false;

      // Update stored options
      this.effectOptions.set(PostProcessEffectType.DEPTH_OF_FIELD, dofOptions);
      return true;
    } catch (err) {
      this.logger.error('PostProcessingManager: Failed to configure depth of field effect', err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  /**
   * Configure color correction effect
   * @param options Color correction effect options
   * @returns True if effect was configured successfully
   */
  public configureColorCorrection(options: ColorCorrectionEffectOptions): boolean {
    const colorCorrectionEffect = this.postProcesses.get(PostProcessEffectType.COLOR_CORRECTION);
    if (!colorCorrectionEffect) {
      // If effect doesn't exist yet, add it
      if (!this.scene || !this.camera) return false;
      return this.addEffect(PostProcessEffectType.COLOR_CORRECTION, options);
    }

    try {
      // Update color correction effect settings
      const ccOptions = { ...DEFAULT_COLOR_CORRECTION_OPTIONS, ...options };

      // Access properties using type assertion
      const ccAny = colorCorrectionEffect as unknown as Record<string, any>;
      if (ccAny.saturation !== undefined) {
        ccAny.saturation = ccOptions.saturation || DEFAULT_COLOR_CORRECTION_OPTIONS.saturation;
      }
      if (ccAny.contrast !== undefined) {
        ccAny.contrast = ccOptions.contrast || DEFAULT_COLOR_CORRECTION_OPTIONS.contrast;
      }
      if (ccAny.exposure !== undefined) {
        ccAny.exposure = ccOptions.exposure || DEFAULT_COLOR_CORRECTION_OPTIONS.exposure;
      }

      colorCorrectionEffect.enabled = ccOptions.enabled !== false;

      // Update stored options
      this.effectOptions.set(PostProcessEffectType.COLOR_CORRECTION, ccOptions);
      return true;
    } catch (err) {
      this.logger.error('PostProcessingManager: Failed to configure color correction effect', err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  /**
   * Reset all effects (remove all post-processing)
   */
  public resetEffects(): void {
    // Remove all effects
    for (const [, effect] of this.postProcesses.entries()) {
      effect.dispose();
    }

    this.postProcesses.clear();
    this.effectOptions.clear();
  }

  /**
   * Dispose all post-processing effects and resources
   */
  public dispose(): void {
    // Dispose all effects
    for (const [, effect] of this.postProcesses.entries()) {
      effect.dispose();
    }

    this.postProcesses.clear();
    this.effectOptions.clear();
    this.scene = null;
    this.camera = null;
  }

  // Private methods for creating specific effects

  /**
   * Create bloom effect
   * @param options Effect options
   * @returns Post process
   */
  private createBloomEffect(options?: BloomEffectOptions): BABYLON.PostProcess {
    if (!this.scene || !this.camera) {
      throw new Error('PostProcessingManager: Cannot create effect, manager not initialized');
    }

    const bloomOptions = { ...DEFAULT_BLOOM_OPTIONS, ...(options || {}) };

    // Create bloom effect with default values for any undefined parameters
    const bloomEffect = new BABYLON.BloomEffect(
      this.scene,
      bloomOptions.scale ?? 0.5,
      bloomOptions.intensity ?? 0.5,
      bloomOptions.threshold ?? 0.8,
      bloomOptions.kernelSize ?? 64
    );

    // Get the post process and configure it
    const postProcesses = bloomEffect.getPostProcesses();
    // Null check and access first element if available
    const postProcess = postProcesses && postProcesses.length > 0 ? postProcesses[0] : null;
    if (!postProcess) {
      throw new Error('PostProcessingManager: Failed to get post process from bloom effect');
    }

    postProcess.enabled = bloomOptions.enabled !== false;

    // Store options
    this.effectOptions.set(PostProcessEffectType.BLOOM, bloomOptions);

    return postProcess;
  }

  /**
   * Create motion blur effect
   * @param options Effect options
   * @returns Post process
   */
  private createMotionBlurEffect(options?: MotionBlurEffectOptions): BABYLON.PostProcess {
    if (!this.scene || !this.camera) {
      throw new Error('PostProcessingManager: Cannot create effect, manager not initialized');
    }

    const mbOptions = { ...DEFAULT_MOTION_BLUR_OPTIONS, ...(options || {}) };

    // Create motion blur post process
    const motionBlurPostProcess = new BABYLON.MotionBlurPostProcess(
      'motionBlur',
      this.scene,
      mbOptions.intensity || DEFAULT_MOTION_BLUR_OPTIONS.intensity || 0.2,
      this.camera
    );

    (motionBlurPostProcess as unknown as { isEnabled: boolean }).isEnabled =
      mbOptions.enabled !== false;

    // Must set these properties separately
    // We're accessing them through any since they might not be public
    const mbAny = motionBlurPostProcess as unknown as Record<string, any>;
    if (mbAny._motionStrength !== undefined) {
      mbAny._motionStrength = mbOptions.intensity || DEFAULT_MOTION_BLUR_OPTIONS.intensity;
    }
    if (mbAny._motionBlurSamples !== undefined) {
      mbAny._motionBlurSamples = mbOptions.samples || DEFAULT_MOTION_BLUR_OPTIONS.samples;
    }

    return motionBlurPostProcess;
  }

  /**
   * Create depth of field effect
   * @param options Depth of field options
   * @returns The post process
   */
  private createDepthOfFieldEffect(options?: DepthOfFieldEffectOptions): BABYLON.PostProcess {
    if (!this.scene || !this.camera) {
      throw new Error('PostProcessingManager: Cannot create effect, manager not initialized');
    }

    const dofOptions = { ...DEFAULT_DEPTH_OF_FIELD_OPTIONS, ...options };

    // Create depth of field effect with any cast to bypass type checking issues
    const depthOfFieldEffect = new BABYLON.DepthOfFieldEffect(
      this.scene,
      this.camera as any, // Type cast to match Babylon.js API
      dofOptions as any // Type cast due to interface mismatch
    );

    // Get post process from effect
    const postProcess = depthOfFieldEffect.getPostProcesses()?.[0];
    if (!postProcess) {
      throw new Error(
        'PostProcessingManager: Failed to get post process from depth of field effect'
      );
    }

    // Enable/disable based on options
    postProcess.enabled = dofOptions.enabled !== false;

    return postProcess;
  }

  /**
   * Create color correction effect
   * @param options Effect options
   * @returns Post process
   */
  private createColorCorrectionEffect(options?: ColorCorrectionEffectOptions): BABYLON.PostProcess {
    if (!this.scene || !this.camera) {
      throw new Error('PostProcessingManager: Cannot create effect, manager not initialized');
    }

    const ccOptions = { ...DEFAULT_COLOR_CORRECTION_OPTIONS, ...(options || {}) };

    // Create color correction post process
    const colorCorrectionPostProcess = new BABYLON.ColorCorrectionPostProcess(
      'colorCorrection',
      'path/to/color/grading/lut.png', // This should be replaced with actual path
      1.0,
      this.camera
    );

    colorCorrectionPostProcess.enabled = ccOptions.enabled !== false;

    // Set color correction properties
    // These would need to be set differently in BabylonJS
    const ccAny = colorCorrectionPostProcess as unknown as Record<string, any>;
    if (ccAny.exposure !== undefined) {
      ccAny.exposure = ccOptions.exposure || DEFAULT_COLOR_CORRECTION_OPTIONS.exposure;
    }
    if (ccAny.contrast !== undefined) {
      ccAny.contrast = ccOptions.contrast || DEFAULT_COLOR_CORRECTION_OPTIONS.contrast;
    }
    if (ccAny.saturation !== undefined) {
      ccAny.saturation = ccOptions.saturation || DEFAULT_COLOR_CORRECTION_OPTIONS.saturation;
    }

    return colorCorrectionPostProcess;
  }

  /**
   * Create a new chromatic aberration post-process
   * @param options Effect options
   * @returns The created post-process
   */
  private createChromaticAberrationEffect(options?: PostProcessEffectOptions): BABYLON.PostProcess {
    if (!this.scene || !this.camera) return null as unknown as BABYLON.PostProcess;

    // Create chromatic aberration effect with correct parameters
    // Use any cast for all parameters due to type mismatch in definition
    const ChromaticAberrationPostProcess = BABYLON.ChromaticAberrationPostProcess as any;
    const chromaticAberrationPostProcess = new ChromaticAberrationPostProcess(
      'chromaticAberration',
      1.0, // size ratio
      this.camera,
      1, // sampling
      this.scene.getEngine(),
      false // reusable
    );

    chromaticAberrationPostProcess.enabled = options?.enabled !== false;

    // Store options
    this.effectOptions.set(
      PostProcessEffectType.CHROMATIC_ABERRATION,
      options || this.getDefaultOptionsForType(PostProcessEffectType.CHROMATIC_ABERRATION)
    );

    return chromaticAberrationPostProcess;
  }

  /**
   * Create a new film grain post-process
   * @param options Effect options
   * @returns The created post-process
   */
  private createFilmGrainEffect(options?: PostProcessEffectOptions): BABYLON.PostProcess {
    if (!this.scene || !this.camera) return null as unknown as BABYLON.PostProcess;

    // Use any cast due to parameter type mismatch in definition
    const filmGrainPostProcess = new BABYLON.GrainPostProcess(
      'grain',
      1.0, // Size ratio
      this.camera as any,
      1 // Sampling mode
    );

    filmGrainPostProcess.enabled = options?.enabled !== false;

    // Store options
    this.effectOptions.set(
      PostProcessEffectType.FILM_GRAIN,
      options || this.getDefaultOptionsForType(PostProcessEffectType.FILM_GRAIN)
    );

    return filmGrainPostProcess;
  }

  /**
   * Create a new vignette effect
   * @param options Effect options
   * @returns The created post-process
   */
  private createVignetteEffect(options?: PostProcessEffectOptions): BABYLON.PostProcess {
    if (!this.scene || !this.camera) {
      throw new Error('PostProcessingManager: Cannot create effect, manager not initialized');
    }

    // Create vignette post process - use any cast because VignettePostProcess might be missing in typings
    const VignettePostProcess = (BABYLON as any).VignettePostProcess;
    const vignettePostProcess = new VignettePostProcess(
      'vignette',
      1.0,
      this.camera,
      1,
      this.scene.getEngine()
    );

    vignettePostProcess.enabled = options?.enabled !== false;

    // Store options
    this.effectOptions.set(
      PostProcessEffectType.VIGNETTE,
      options || this.getDefaultOptionsForType(PostProcessEffectType.VIGNETTE)
    );

    return vignettePostProcess;
  }

  /**
   * Create anti-aliasing effect
   * @param options Effect options
   * @returns Post process
   */
  private createAntiAliasingEffect(options?: PostProcessEffectOptions): BABYLON.PostProcess {
    if (!this.scene || !this.camera) {
      throw new Error('PostProcessingManager: Cannot create effect, manager not initialized');
    }

    // Create FXAA post process
    const fxaaPostProcess = new BABYLON.FxaaPostProcess('fxaa', 1.0, this.camera);

    fxaaPostProcess.enabled = options?.enabled !== false;

    // Store options
    this.effectOptions.set(
      PostProcessEffectType.ANTI_ALIASING,
      options || this.getDefaultOptionsForType(PostProcessEffectType.ANTI_ALIASING)
    );

    return fxaaPostProcess;
  }

  /**
   * Get default options for a specific effect type
   * @param type Effect type
   * @returns Default options
   */
  private getDefaultOptionsForType(type: PostProcessEffectType): PostProcessEffectOptions {
    switch (type) {
      case PostProcessEffectType.BLOOM:
        return DEFAULT_BLOOM_OPTIONS;
      case PostProcessEffectType.MOTION_BLUR:
        return DEFAULT_MOTION_BLUR_OPTIONS;
      case PostProcessEffectType.DEPTH_OF_FIELD:
        return DEFAULT_DEPTH_OF_FIELD_OPTIONS;
      case PostProcessEffectType.COLOR_CORRECTION:
        return DEFAULT_COLOR_CORRECTION_OPTIONS;
      default:
        return {
          enabled: true,
          priority: 1000,
        };
    }
  }

  /**
   * Create the default post-processing pipeline
   */
  public createDefaultPipeline(): void {
    if (!this.scene || !this.camera) {
      this.logger.error('Cannot create default pipeline, manager not initialized');
      return;
    }

    // Create default effects
    this.addEffect(PostProcessEffectType.BLOOM, DEFAULT_BLOOM_OPTIONS);
    this.addEffect(PostProcessEffectType.COLOR_CORRECTION, DEFAULT_COLOR_CORRECTION_OPTIONS);
  }

  /**
   * Enable or disable bloom effect
   * @param enabled Whether bloom should be enabled
   * @returns True if operation was successful
   */
  public enableBloom(enabled: boolean): boolean {
    const bloomEffect = this.getEffect(PostProcessEffectType.BLOOM);
    if (bloomEffect) {
      bloomEffect.enabled = enabled;
      return true;
    } else if (enabled) {
      // Create and add the bloom effect if it doesn't exist
      return this.addEffect(PostProcessEffectType.BLOOM, {
        ...DEFAULT_BLOOM_OPTIONS,
        enabled: true
      });
    }
    return false;
  }

  /**
   * Enable or disable depth of field effect
   * @param enabled Whether depth of field should be enabled
   * @returns True if operation was successful
   */
  public enableDepthOfField(enabled: boolean): boolean {
    const dofEffect = this.getEffect(PostProcessEffectType.DEPTH_OF_FIELD);
    if (dofEffect) {
      dofEffect.enabled = enabled;
      return true;
    } else if (enabled) {
      // Create and add the depth of field effect if it doesn't exist
      return this.addEffect(PostProcessEffectType.DEPTH_OF_FIELD, {
        ...DEFAULT_DEPTH_OF_FIELD_OPTIONS,
        enabled: true
      });
    }
    return false;
  }

  /**
   * Enable or disable ambient occlusion effect
   * @param enabled Whether ambient occlusion should be enabled
   * @returns True if operation was successful
   */
  public enableAmbientOcclusion(enabled: boolean): boolean {
    const aoEffect = this.getEffect(PostProcessEffectType.AMBIENT_OCCLUSION);
    if (aoEffect) {
      aoEffect.enabled = enabled;
      return true;
    } else if (enabled) {
      // Create and add the ambient occlusion effect if it doesn't exist
      return this.addEffect(PostProcessEffectType.AMBIENT_OCCLUSION, {
        enabled: true,
        priority: 500
      });
    }
    return false;
  }

  /**
   * Set bloom intensity
   * @param intensity Bloom intensity value
   * @returns True if operation was successful
   */
  public setBloomIntensity(intensity: number): boolean {
    // Get the current bloom options
    const bloomOptions = this.effectOptions.get(PostProcessEffectType.BLOOM) as BloomEffectOptions;
    if (bloomOptions) {
      // Update the options
      bloomOptions.intensity = intensity;
      // Apply the updated options
      return this.configureBloom(bloomOptions);
    }
    return false;
  }

  /**
   * Set depth of field focal length
   * @param focalLength Focal length in millimeters
   * @returns True if operation was successful
   */
  public setDepthOfFieldFocalLength(focalLength: number): boolean {
    // Get the current depth of field options
    const dofOptions = this.effectOptions.get(PostProcessEffectType.DEPTH_OF_FIELD) as DepthOfFieldEffectOptions;
    if (dofOptions) {
      // Update the options
      dofOptions.focalLength = focalLength;
      // Apply the updated options
      return this.configureDepthOfField(dofOptions);
    }
    return false;
  }

  /**
   * Set ambient occlusion radius
   * @param radius Radius value for ambient occlusion
   * @returns True if operation was successful
   */
  public setAmbientOcclusionRadius(radius: number): boolean {
    // Get the current ambient occlusion options
    const aoOptions = this.effectOptions.get(PostProcessEffectType.AMBIENT_OCCLUSION);
    if (aoOptions) {
      // Update the radius property
      (aoOptions as any).radius = radius;
      // Apply the updated options
      return this.updateEffectOptions(PostProcessEffectType.AMBIENT_OCCLUSION, aoOptions);
    }
    return false;
  }

  /**
   * Enable or disable the entire post-processing pipeline
   * @param enabled Whether the pipeline should be enabled
   * @returns True if operation was successful
   */
  public setPipelineEnabled(enabled: boolean): boolean {
    if (enabled === this.defaultPipelineEnabled) {
      return true; // Already in the desired state
    }

    this.defaultPipelineEnabled = enabled;

    // Enable/disable all effects
    let success = true;
    for (const [type, postProcess] of this.postProcesses.entries()) {
      // Get the original enabled state from options
      const options = this.effectOptions.get(type);
      const shouldBeEnabled = enabled && (options?.enabled !== false);
      
      // Set the enabled state of the post process
      if (postProcess.enabled !== shouldBeEnabled) {
        postProcess.enabled = shouldBeEnabled;
      }
    }

    return success;
  }
}
