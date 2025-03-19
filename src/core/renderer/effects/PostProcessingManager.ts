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
  focalDistance: 10,
  aperture: 2.8,
  blurAmount: 0.1,
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

  /**
   * Initialize the post-processing manager
   * @param scene The scene to attach post-processing to
   * @param camera The camera to attach post-processing to
   */
  public initialize(scene: BABYLON.Scene, camera: BABYLON.Camera): void {
    this.scene = scene;
    this.camera = camera;

    // Set up default effect options
    this.effectOptions.set(PostProcessEffectType.BLOOM, { ...DEFAULT_BLOOM_OPTIONS });
    this.effectOptions.set(PostProcessEffectType.MOTION_BLUR, { ...DEFAULT_MOTION_BLUR_OPTIONS });
    this.effectOptions.set(PostProcessEffectType.DEPTH_OF_FIELD, {
      ...DEFAULT_DEPTH_OF_FIELD_OPTIONS,
    });
    this.effectOptions.set(PostProcessEffectType.COLOR_CORRECTION, {
      ...DEFAULT_COLOR_CORRECTION_OPTIONS,
    });
  }

  /**
   * Add a post-processing effect
   * @param type Type of effect to add
   * @param options Effect options
   * @returns True if effect was added successfully
   */
  public addEffect(type: PostProcessEffectType, options?: PostProcessEffectOptions): boolean {
    if (!this.scene || !this.camera) {
      console.error('PostProcessingManager: Cannot add effect, manager not initialized');
      return false;
    }

    // If effect already exists, update it
    if (this.postProcesses.has(type)) {
      return this.updateEffectOptions(type, options || {});
    }

    try {
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
          console.error(`PostProcessingManager: Unknown effect type ${type}`);
          return false;
      }

      if (postProcess) {
        this.postProcesses.set(type, postProcess);

        // Store options
        const defaultOptions = this.getDefaultOptionsForType(type);
        this.effectOptions.set(type, { ...defaultOptions, ...(options || {}) });

        return true;
      }
    } catch (err) {
      console.error(`PostProcessingManager: Failed to add effect ${type}`, err);
    }

    return false;
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
          postProcess.isEnabled = updatedOptions.enabled !== false;
          return true;
        }
        return false;
      }
    }
  }

  /**
   * Configure bloom effect
   * @param options Bloom effect options
   * @returns True if effect was configured successfully
   */
  public configureBloom(options: BloomEffectOptions): boolean {
    const bloomEffect = this.postProcesses.get(
      PostProcessEffectType.BLOOM
    ) as unknown as BABYLON.BloomEffect;
    if (!bloomEffect) {
      // If effect doesn't exist yet, add it
      if (!this.scene || !this.camera) return false;
      return this.addEffect(PostProcessEffectType.BLOOM, options);
    }

    try {
      // Update bloom effect settings
      if ('updateEffect' in bloomEffect) {
        // Access private properties using type assertion
        const bloomOptions = { ...DEFAULT_BLOOM_OPTIONS, ...options };

        // Update options on the underlying effect
        // Note: Actual property names might differ based on BabylonJS implementation
        const bloomEffectAny = bloomEffect as unknown as Record<string, any>;
        if (bloomEffectAny._bloomEffectKernelSize !== undefined) {
          bloomEffectAny._bloomEffectKernelSize =
            bloomOptions.kernelSize || DEFAULT_BLOOM_OPTIONS.kernelSize;
        }
        if (bloomEffectAny._bloomEffectIntensity !== undefined) {
          bloomEffectAny._bloomEffectIntensity =
            bloomOptions.intensity || DEFAULT_BLOOM_OPTIONS.intensity;
        }
        if (bloomEffectAny._bloomEffectThreshold !== undefined) {
          bloomEffectAny._bloomEffectThreshold =
            bloomOptions.threshold || DEFAULT_BLOOM_OPTIONS.threshold;
        }

        (bloomEffect as unknown as { isEnabled: boolean }).isEnabled =
          bloomOptions.enabled !== false;

        // Update stored options
        this.effectOptions.set(PostProcessEffectType.BLOOM, bloomOptions);
        return true;
      }
      return false;
    } catch (err) {
      console.error('PostProcessingManager: Failed to configure bloom effect', err);
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
      console.error('PostProcessingManager: Failed to configure motion blur effect', err);
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
      if (dofAny.focalDistance !== undefined) {
        dofAny.focalDistance =
          dofOptions.focalDistance || DEFAULT_DEPTH_OF_FIELD_OPTIONS.focalDistance;
      }
      if (dofAny.aperture !== undefined) {
        dofAny.aperture = dofOptions.aperture || DEFAULT_DEPTH_OF_FIELD_OPTIONS.aperture;
      }

      (depthOfFieldEffect as unknown as { isEnabled: boolean }).isEnabled =
        dofOptions.enabled !== false;

      // Update stored options
      this.effectOptions.set(PostProcessEffectType.DEPTH_OF_FIELD, dofOptions);
      return true;
    } catch (err) {
      console.error('PostProcessingManager: Failed to configure depth of field effect', err);
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

      colorCorrectionEffect.isEnabled = ccOptions.enabled !== false;

      // Update stored options
      this.effectOptions.set(PostProcessEffectType.COLOR_CORRECTION, ccOptions);
      return true;
    } catch (err) {
      console.error('PostProcessingManager: Failed to configure color correction effect', err);
      return false;
    }
  }

  /**
   * Reset all post-processing effects to defaults
   */
  public resetEffects(): void {
    // Remove all effects
    for (const [, effect] of this.postProcesses.entries()) {
      effect.dispose();
    }

    this.postProcesses.clear();

    // Reset options to defaults
    this.effectOptions.set(PostProcessEffectType.BLOOM, { ...DEFAULT_BLOOM_OPTIONS });
    this.effectOptions.set(PostProcessEffectType.MOTION_BLUR, { ...DEFAULT_MOTION_BLUR_OPTIONS });
    this.effectOptions.set(PostProcessEffectType.DEPTH_OF_FIELD, {
      ...DEFAULT_DEPTH_OF_FIELD_OPTIONS,
    });
    this.effectOptions.set(PostProcessEffectType.COLOR_CORRECTION, {
      ...DEFAULT_COLOR_CORRECTION_OPTIONS,
    });
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

    // Create bloom post process
    // Note: In an actual implementation, you'd use BabylonJS specific APIs
    const bloomEffect = new BABYLON.BloomEffect(
      this.scene,
      bloomOptions.scale || DEFAULT_BLOOM_OPTIONS.scale || 0.5,
      bloomOptions.intensity || DEFAULT_BLOOM_OPTIONS.intensity || 0.5,
      bloomOptions.threshold || DEFAULT_BLOOM_OPTIONS.threshold || 0.8
    );

    const postProcess = bloomEffect.getPostProcesses()[0]; // Use getPostProcesses instead of getPostProcess
    (postProcess as unknown as { isEnabled: boolean }).isEnabled = bloomOptions.enabled !== false;

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
   * @param options Effect options
   * @returns Post process
   */
  private createDepthOfFieldEffect(options?: DepthOfFieldEffectOptions): BABYLON.PostProcess {
    if (!this.scene || !this.camera) {
      throw new Error('PostProcessingManager: Cannot create effect, manager not initialized');
    }

    const dofOptions = { ...DEFAULT_DEPTH_OF_FIELD_OPTIONS, ...(options || {}) };

    // Create depth of field post process
    const depthOfFieldEffect = new BABYLON.DepthOfFieldEffect(this.scene, this.camera, {
      focalLength: dofOptions.focalLength || DEFAULT_DEPTH_OF_FIELD_OPTIONS.focalLength || 50,
      fStop: dofOptions.aperture || DEFAULT_DEPTH_OF_FIELD_OPTIONS.aperture || 2.8,
      focusDistance: dofOptions.focalDistance || DEFAULT_DEPTH_OF_FIELD_OPTIONS.focalDistance || 10,
      lensSize: dofOptions.blurAmount || DEFAULT_DEPTH_OF_FIELD_OPTIONS.blurAmount || 0.1,
    });

    const postProcess = depthOfFieldEffect.getPostProcess();
    postProcess.isEnabled = dofOptions.enabled !== false;

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

    colorCorrectionPostProcess.isEnabled = ccOptions.enabled !== false;

    // Set color correction properties
    // These would need to be set differently in BabylonJS
    const ccAny = colorCorrectionPostProcess as unknown as Record<string, any>;
    if (ccAny._exposure !== undefined) {
      ccAny._exposure = ccOptions.exposure || DEFAULT_COLOR_CORRECTION_OPTIONS.exposure;
    }
    if (ccAny._contrast !== undefined) {
      ccAny._contrast = ccOptions.contrast || DEFAULT_COLOR_CORRECTION_OPTIONS.contrast;
    }
    if (ccAny._saturation !== undefined) {
      ccAny._saturation = ccOptions.saturation || DEFAULT_COLOR_CORRECTION_OPTIONS.saturation;
    }

    return colorCorrectionPostProcess;
  }

  /**
   * Create chromatic aberration effect
   * @param options Effect options
   * @returns Post process
   */
  private createChromaticAberrationEffect(options?: PostProcessEffectOptions): BABYLON.PostProcess {
    if (!this.scene || !this.camera) {
      throw new Error('PostProcessingManager: Cannot create effect, manager not initialized');
    }

    // Create chromatic aberration post process
    const chromaticAberrationPostProcess = new BABYLON.ChromaticAberrationPostProcess(
      'chromaticAberration',
      0.03, // Default aberration amount
      1, // Size ratio
      this.camera
    );

    chromaticAberrationPostProcess.isEnabled = options?.enabled !== false;

    return chromaticAberrationPostProcess;
  }

  /**
   * Create film grain effect
   * @param options Effect options
   * @returns Post process
   */
  private createFilmGrainEffect(options?: PostProcessEffectOptions): BABYLON.PostProcess {
    if (!this.scene || !this.camera) {
      throw new Error('PostProcessingManager: Cannot create effect, manager not initialized');
    }

    // Create film grain post process
    const filmGrainPostProcess = new BABYLON.GrainPostProcess(
      'grain',
      0.5, // Grain amount
      1, // Size ratio
      this.camera
    );

    filmGrainPostProcess.isEnabled = options?.enabled !== false;

    return filmGrainPostProcess;
  }

  /**
   * Create vignette effect
   * @param options Effect options
   * @returns Post process
   */
  private createVignetteEffect(options?: PostProcessEffectOptions): BABYLON.PostProcess {
    if (!this.scene || !this.camera) {
      throw new Error('PostProcessingManager: Cannot create effect, manager not initialized');
    }

    // Create vignette post process
    const vignettePostProcess = new BABYLON.VignettePostProcess(
      'vignette',
      new BABYLON.Color3(0, 0, 0), // Vignette color
      0.5, // Weight
      0.1, // Bias
      this.camera
    );

    vignettePostProcess.isEnabled = options?.enabled !== false;

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
    const fxaaPostProcess = new BABYLON.FxaaPostProcess(
      'fxaa',
      1, // Size ratio
      this.camera
    );

    fxaaPostProcess.isEnabled = options?.enabled !== false;

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
}
