/**
 * @file src/core/renderer/effects/ColorCorrectionEffect.ts
 * @description Specialized color correction effect for scene color adjustment.
 *
 * @dependencies babylonjs
 * @relatedFiles PostProcessingManager.ts, IPostProcessingManager.ts
 */
import * as BABYLON from 'babylonjs';
import { ColorCorrectionEffectOptions } from './IPostProcessingManager';
import { Logger } from '../../utils/Logger';
import { ServiceLocator } from '../../base/ServiceLocator';

/**
 * Color grading presets
 */
export enum ColorGradingPreset {
  NEUTRAL = 'neutral', // Default colors with no adjustment
  WARM = 'warm', // Warm colors (orange/yellow tint)
  COOL = 'cool', // Cool colors (blue tint)
  SEPIA = 'sepia', // Vintage sepia tone
  DRAMATIC = 'dramatic', // High contrast dramatic look
  NIGHT = 'night', // Night vision effect
  VIBRANT = 'vibrant', // Enhanced vibrant colors
}

/**
 * Default preset settings
 */
const COLOR_PRESETS: Record<ColorGradingPreset, ColorCorrectionEffectOptions> = {
  [ColorGradingPreset.NEUTRAL]: {
    enabled: true,
    saturation: 1.0,
    contrast: 1.0,
    exposure: 1.0,
  },
  [ColorGradingPreset.WARM]: {
    enabled: true,
    saturation: 1.1,
    contrast: 1.0,
    exposure: 1.05,
  },
  [ColorGradingPreset.COOL]: {
    enabled: true,
    saturation: 0.9,
    contrast: 1.05,
    exposure: 0.95,
  },
  [ColorGradingPreset.SEPIA]: {
    enabled: true,
    saturation: 0.5,
    contrast: 1.1,
    exposure: 0.9,
  },
  [ColorGradingPreset.DRAMATIC]: {
    enabled: true,
    saturation: 0.8,
    contrast: 1.5,
    exposure: 0.9,
  },
  [ColorGradingPreset.NIGHT]: {
    enabled: true,
    saturation: 0.1,
    contrast: 1.4,
    exposure: 0.7,
  },
  [ColorGradingPreset.VIBRANT]: {
    enabled: true,
    saturation: 1.5,
    contrast: 1.2,
    exposure: 1.1,
  },
};

/**
 * Color effect types for specialized color adjustments
 */
export enum ColorEffectType {
  NORMAL = 'normal',
  SEPIA = 'sepia',
  BLACK_AND_WHITE = 'blackAndWhite',
  VIGNETTE = 'vignette',
  DUOTONE = 'duotone',
}

/**
 * Specialized color correction effect for scene color adjustment
 */
export class ColorCorrectionEffect {
  private scene: BABYLON.Scene;
  private camera: BABYLON.Camera;
  private pipeline: BABYLON.DefaultRenderingPipeline;
  private currentPreset: ColorGradingPreset = ColorGradingPreset.NEUTRAL;
  private customSettings: Partial<ColorCorrectionEffectOptions> = {};
  private activeColorEffect: ColorEffectType = ColorEffectType.NORMAL;
  private colorGradingTexture: BABYLON.BaseTexture | null = null;
  private customLutPath: string | null = null;
  private logger: Logger;

  /**
   * Create a new color correction effect
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
    preset: ColorGradingPreset = ColorGradingPreset.NEUTRAL,
    options?: Partial<ColorCorrectionEffectOptions>
  ) {
    this.scene = scene;
    this.camera = camera;
    this.pipeline = pipeline;
    this.currentPreset = preset;
    this.customSettings = options || {};

    // Initialize logger
    this.logger = new Logger('ColorCorrectionEffect');

    // Try to get logger from ServiceLocator if available
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        // Add context tag
        this.logger.addTag('ColorCorrectionEffect');
      }
    } catch {
      // If service locator is not available, we'll use the default logger
    }

    // Initialize color correction in pipeline
    this.initializeColorCorrection();
    this.applySettings();
  }

  /**
   * Initialize color correction in the rendering pipeline
   */
  private initializeColorCorrection(): void {
    // Ensure color correction components are enabled in the pipeline
    this.pipeline.imageProcessingEnabled = true;

    // Default values
    this.pipeline.imageProcessing.contrast = 1.0;
    this.pipeline.imageProcessing.exposure = 1.0;

    // Ensure tone mapping is set
    this.pipeline.imageProcessing.toneMappingEnabled = true;
    this.pipeline.imageProcessing.toneMappingType =
      BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  }

  /**
   * Apply current settings to the pipeline
   */
  private applySettings(): void {
    if (!this.pipeline) {
      return;
    }

    // Get preset settings
    const presetSettings = COLOR_PRESETS[this.currentPreset];

    // Merge with custom settings
    const mergedSettings = {
      ...presetSettings,
      ...this.customSettings,
    };

    // Apply to pipeline
    if (!mergedSettings.enabled) {
      // Reset to neutral values when disabled
      this.pipeline.imageProcessing.contrast = 1.0;
      this.pipeline.imageProcessing.exposure = 1.0;
      return;
    }

    // Apply settings to the color correction
    // Apply contrast if specified
    if (mergedSettings.contrast !== undefined) {
      this.pipeline.imageProcessing.contrast = mergedSettings.contrast;
    }

    // Apply exposure if specified
    if (mergedSettings.exposure !== undefined) {
      this.pipeline.imageProcessing.exposure = mergedSettings.exposure;
    }

    // Apply saturation if it exists on the configuration
    if (this.pipeline.imageProcessing.colorCurves && mergedSettings.saturation !== undefined) {
      // Saturation is applied via color curves
      if (!this.pipeline.imageProcessing.colorCurvesEnabled) {
        this.pipeline.imageProcessing.colorCurvesEnabled = true;
      }

      this.pipeline.imageProcessing.colorCurves.globalSaturation = mergedSettings.saturation;
    }
  }

  /**
   * Apply a specialized color effect
   * @param type Color effect type to apply
   */
  public applyColorEffect(type: ColorEffectType): void {
    this.activeColorEffect = type;

    // Configure color effect based on type
    switch (type) {
      case ColorEffectType.NORMAL:
        // Reset any color transformations
        this.clearColorEffects();
        break;

      case ColorEffectType.SEPIA:
        this.applySepiaEffect();
        break;

      case ColorEffectType.BLACK_AND_WHITE:
        this.applyBlackAndWhiteEffect();
        break;

      case ColorEffectType.VIGNETTE:
        this.applyVignetteEffect();
        break;

      case ColorEffectType.DUOTONE:
        this.applyDuotoneEffect();
        break;
    }
  }

  /**
   * Clear all color effects
   */
  private clearColorEffects(): void {
    // Reset color curves to defaults
    if (this.pipeline.imageProcessing.colorCurves) {
      this.resetColorCurves(this.pipeline.imageProcessing.colorCurves);

      // Restore saturation from preset
      const settings = this.getSettings();
      if (settings.saturation !== undefined) {
        this.pipeline.imageProcessing.colorCurves.globalSaturation = settings.saturation;
      }
    }

    // Disable any active vignette
    if (this.pipeline.imageProcessing.vignetteEnabled) {
      this.pipeline.imageProcessing.vignetteEnabled = false;
    }
  }

  /**
   * Reset color curves to default values
   * This is a workaround for the missing reset() method in some versions of Babylon.js
   * @param colorCurves The color curves to reset
   */
  private resetColorCurves(colorCurves: BABYLON.ColorCurves): void {
    // Check if reset method exists
    if (typeof colorCurves.reset === 'function') {
      // Use the native reset method if available
      colorCurves.reset();
    } else {
      // Manual reset to default values
      colorCurves.globalHue = 30;
      colorCurves.globalDensity = 0;
      colorCurves.globalSaturation = 0;
      colorCurves.globalExposure = 0;

      // Reset highlights, midtones and shadows
      colorCurves.highlightsHue = 30;
      colorCurves.highlightsDensity = 0;
      colorCurves.highlightsSaturation = 0;
      colorCurves.highlightsExposure = 0;

      colorCurves.midtonesHue = 30;
      colorCurves.midtonesDensity = 0;
      colorCurves.midtonesSaturation = 0;
      colorCurves.midtonesExposure = 0;

      colorCurves.shadowsHue = 30;
      colorCurves.shadowsDensity = 0;
      colorCurves.shadowsSaturation = 0;
      colorCurves.shadowsExposure = 0;
    }
  }

  /**
   * Apply sepia effect
   */
  private applySepiaEffect(): void {
    this.clearColorEffects();

    if (this.pipeline.imageProcessing.colorCurves) {
      // Create sepia effect with color curves
      const colorCurves = this.pipeline.imageProcessing.colorCurves;

      // Enable color curves
      this.pipeline.imageProcessing.colorCurvesEnabled = true;

      // Adjust color balance for sepia tone
      colorCurves.globalHue = 0.1; // Slight yellow/orange shift
      colorCurves.globalDensity = 0.8; // Reduce overall color density
      colorCurves.globalSaturation = 0.5; // Reduce saturation

      // Adjust RGB channels for sepia tone - using proper API
      // Instead of individual R,G,B highlight properties, use the vector methods
      colorCurves.highlightsHue = 0.1;
      colorCurves.highlightsDensity = 1.2;

      // Instead of individual R,G,B shadow properties, use the vector methods
      colorCurves.shadowsHue = 0.1;
      colorCurves.shadowsDensity = 0.8;
    }
  }

  /**
   * Apply black and white effect
   */
  private applyBlackAndWhiteEffect(): void {
    this.clearColorEffects();

    if (this.pipeline.imageProcessing.colorCurves) {
      // Create black and white effect with color curves
      const colorCurves = this.pipeline.imageProcessing.colorCurves;

      // Enable color curves
      this.pipeline.imageProcessing.colorCurvesEnabled = true;

      // Set saturation to zero for black and white
      colorCurves.globalSaturation = 0;

      // Adjust contrast for a nicer B&W look
      this.pipeline.imageProcessing.contrast = 1.2;
    }
  }

  /**
   * Apply vignette effect
   */
  private applyVignetteEffect(): void {
    // Keep existing color settings, just add vignette

    // Enable vignette using the correct API
    if (this.pipeline.imageProcessing) {
      // Modern BabylonJS uses imageProcessing for vignette control
      this.pipeline.imageProcessing.vignetteEnabled = true;

      // Configure vignette parameters
      this.pipeline.imageProcessing.vignetteWeight = 1.0; // Strength
      this.pipeline.imageProcessing.vignetteStretch = 0.5; // Size
      this.pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0, 0); // Black
      this.pipeline.imageProcessing.vignetteBlendMode =
        BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    }
  }

  /**
   * Apply duotone effect (two-color gradient)
   */
  private applyDuotoneEffect(): void {
    this.clearColorEffects();

    // Use default duotone colors (dark blue to light yellow)
    const darkColor = BABYLON.Color3.FromHexString('#0d253f');
    const lightColor = BABYLON.Color3.FromHexString('#e5de17');

    this.applyDuotoneColors(darkColor, lightColor);
  }

  /**
   * Apply custom duotone colors
   * @param darkColor Dark color for shadows
   * @param lightColor Light color for highlights
   */
  public applyDuotoneColors(darkColor: BABYLON.Color3, lightColor: BABYLON.Color3): void {
    // Clear any existing effects
    this.clearColorEffects();

    if (this.pipeline.imageProcessing.colorCurves) {
      // Enable color curves
      this.pipeline.imageProcessing.colorCurvesEnabled = true;

      // Convert to black and white first
      this.pipeline.imageProcessing.colorCurves.globalSaturation = 0;

      // Create color grading texture for duotone
      const lutSize = 16; // Size of the color lookup table
      const data = new Uint8Array(lutSize * lutSize * lutSize * 4);

      // Fill the lookup table with a gradient between dark and light colors
      for (let r = 0; r < lutSize; r++) {
        for (let g = 0; g < lutSize; g++) {
          for (let b = 0; b < lutSize; b++) {
            // Calculate position in data array
            const index = (r + g * lutSize + b * lutSize * lutSize) * 4;

            // Calculate brightness (0-1)
            const brightness = (r + g + b) / (3 * (lutSize - 1));

            // Interpolate between dark and light colors
            const resultColor = BABYLON.Color3.Lerp(darkColor, lightColor, brightness);

            // Set RGB values
            data[index] = Math.round(resultColor.r * 255);
            data[index + 1] = Math.round(resultColor.g * 255);
            data[index + 2] = Math.round(resultColor.b * 255);
            data[index + 3] = 255; // Alpha
          }
        }
      }

      // Create 3D texture for LUT
      const texture = new BABYLON.RawTexture3D(
        data,
        lutSize,
        lutSize,
        lutSize,
        BABYLON.Engine.TEXTUREFORMAT_RGBA,
        this.scene,
        false,
        false,
        BABYLON.Texture.TRILINEAR_SAMPLINGMODE
      );

      // Apply texture
      this.colorGradingTexture = texture;
      this.pipeline.imageProcessing.colorGradingTexture = texture;
      this.pipeline.imageProcessing.colorGradingEnabled = true;
    }
  }

  /**
   * Load a LUT (Look-Up Table) from file for color grading
   * @param url URL to the LUT file (should be a .CUBE or compatible format)
   * @returns Promise that resolves when LUT is loaded
   */
  public async loadColorGradingLUT(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Clear any existing color grading
      if (this.colorGradingTexture) {
        this.colorGradingTexture.dispose();
        this.colorGradingTexture = null;
      }

      // Create and load the color grading texture
      const texture = new BABYLON.Texture(
        url,
        this.scene,
        true,
        false,
        undefined,
        () => {
          // Success callback
          this.colorGradingTexture = texture;
          this.pipeline.imageProcessing.colorGradingTexture = texture;
          this.pipeline.imageProcessing.colorGradingEnabled = true;
          this.customLutPath = url;
          resolve();
        },
        error => {
          // Error callback
          this.logger.error(
            'Failed to load LUT:',
            typeof error === 'string' ? new Error(error) : error
          );
          reject(error);
        }
      );
    });
  }

  /**
   * Enable the color correction effect
   */
  public enable(): void {
    if (this.pipeline) {
      this.pipeline.imageProcessingEnabled = true;
      this.applySettings();
    }
  }

  /**
   * Disable the color correction effect
   */
  public disable(): void {
    if (this.pipeline) {
      // Don't disable image processing entirely, just reset to neutral values
      const settings = this.getSettings();
      settings.enabled = false;
      this.applySettings();
    }
  }

  /**
   * Switch to a different preset
   * @param preset The preset to use
   * @param keepCustomOverrides Whether to maintain custom settings
   */
  public usePreset(preset: ColorGradingPreset, keepCustomOverrides: boolean = true): void {
    this.currentPreset = preset;

    if (!keepCustomOverrides) {
      this.customSettings = {};
    }

    this.applySettings();

    // Reapply any active color effect
    if (this.activeColorEffect !== ColorEffectType.NORMAL) {
      this.applyColorEffect(this.activeColorEffect);
    }
  }

  /**
   * Get a copy of the current settings
   * @returns Current settings
   */
  public getSettings(): ColorCorrectionEffectOptions {
    const presetSettings = COLOR_PRESETS[this.currentPreset];
    return { ...presetSettings, ...this.customSettings };
  }

  /**
   * Update multiple settings at once
   * @param options Settings to update
   */
  public updateSettings(options: Partial<ColorCorrectionEffectOptions>): void {
    this.customSettings = { ...this.customSettings, ...options };
    this.applySettings();

    // Reapply any active color effect
    if (this.activeColorEffect !== ColorEffectType.NORMAL) {
      this.applyColorEffect(this.activeColorEffect);
    }
  }

  /**
   * Set the color saturation
   * @param value Saturation value (0-2)
   */
  public setSaturation(value: number): void {
    this.updateSettings({ saturation: value });
  }

  /**
   * Set the color contrast
   * @param value Contrast value (0-2)
   */
  public setContrast(value: number): void {
    this.updateSettings({ contrast: value });
  }

  /**
   * Set the exposure
   * @param value Exposure value (0-2)
   */
  public setExposure(value: number): void {
    this.updateSettings({ exposure: value });
  }

  /**
   * Temporarily apply a color effect for a duration
   * @param type The color effect to apply
   * @param duration Duration in milliseconds
   * @returns Promise that resolves when effect is complete
   */
  public async pulseEffect(type: ColorEffectType, duration: number = 1000): Promise<void> {
    // Store current effect
    const originalEffect = this.activeColorEffect;

    // Apply new effect
    this.applyColorEffect(type);

    // Return to original effect after duration
    return new Promise<void>(resolve => {
      setTimeout(() => {
        this.applyColorEffect(originalEffect);
        resolve();
      }, duration);
    });
  }

  /**
   * Get the currently active color effect
   * @returns Current color effect type
   */
  public getCurrentEffect(): ColorEffectType {
    return this.activeColorEffect;
  }

  /**
   * Get the currently loaded LUT path (if any)
   * @returns Path to the current LUT file or null
   */
  public getCurrentLUT(): string | null {
    return this.customLutPath;
  }

  /**
   * Dispose the effect and release resources
   */
  public dispose(): void {
    // Dispose of any textures
    if (this.colorGradingTexture) {
      this.colorGradingTexture.dispose();
      this.colorGradingTexture = null;
    }

    // Reset to neutral
    if (this.pipeline) {
      this.pipeline.imageProcessing.colorGradingEnabled = false;
      this.pipeline.imageProcessing.contrast = 1.0;
      this.pipeline.imageProcessing.exposure = 1.0;

      if (this.pipeline.imageProcessing.colorCurves) {
        this.resetColorCurves(this.pipeline.imageProcessing.colorCurves);
      }

      this.pipeline.imageProcessing.vignetteEnabled = false;
    }
  }
}
