/**
 * @file tests/unit/core/renderer/effects/PostProcessingManager.test.ts
 * @description Unit tests for the PostProcessingManager class
 */
import * as BABYLON from 'babylonjs';
import { PostProcessingManager } from '../../../../../src/core/renderer/effects/PostProcessingManager';
import {
  PostProcessEffectType,
  BloomEffectOptions,
  MotionBlurEffectOptions,
  DepthOfFieldEffectOptions,
  ColorCorrectionEffectOptions,
} from '../../../../../src/core/renderer/effects/IPostProcessingManager';

// Mock BabylonJS objects
jest.mock('babylonjs');

describe('PostProcessingManager', () => {
  // Test variables
  let manager: PostProcessingManager;
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockCamera: jest.Mocked<BABYLON.Camera>;

  // Mock post-processes
  let mockBloomEffect: any; // Use any to avoid type issues
  let mockMotionBlurPostProcess: any;
  let mockDepthOfFieldEffect: any;
  let mockColorCorrectionPostProcess: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock scene and camera
    mockScene = {
      dispose: jest.fn(),
    } as unknown as jest.Mocked<BABYLON.Scene>;

    mockCamera = {
      dispose: jest.fn(),
    } as unknown as jest.Mocked<BABYLON.Camera>;

    // Create mock post-processes
    mockBloomEffect = {
      getPostProcesses: jest.fn().mockReturnValue([{ isEnabled: true }]),
      dispose: jest.fn(),
    };

    mockMotionBlurPostProcess = {
      dispose: jest.fn(),
      isEnabled: true,
    };

    mockDepthOfFieldEffect = {
      getPostProcesses: jest.fn().mockReturnValue([{ isEnabled: true }]),
      dispose: jest.fn(),
    };

    mockColorCorrectionPostProcess = {
      dispose: jest.fn(),
      isEnabled: true,
    };

    // Set up BabylonJS constructor mocks
    (BABYLON.BloomEffect as any) = jest.fn().mockImplementation(() => mockBloomEffect);
    (BABYLON.MotionBlurPostProcess as any) = jest
      .fn()
      .mockImplementation(() => mockMotionBlurPostProcess);
    (BABYLON.DepthOfFieldEffect as any) = jest
      .fn()
      .mockImplementation(() => mockDepthOfFieldEffect);
    (BABYLON.ColorCorrectionPostProcess as any) = jest
      .fn()
      .mockImplementation(() => mockColorCorrectionPostProcess);
    (BABYLON.ChromaticAberrationPostProcess as any) = jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
      isEnabled: true,
    }));
    (BABYLON.GrainPostProcess as any) = jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
      isEnabled: true,
    }));
    // Add VignettePostProcess to BABYLON
    (BABYLON.VignettePostProcess as any) = jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
      isEnabled: true,
    }));
    (BABYLON.FxaaPostProcess as any) = jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
      isEnabled: true,
    }));
    (BABYLON.Color3 as any) = jest.fn().mockImplementation(() => ({}));
    (BABYLON.Color4 as any) = jest.fn().mockImplementation(() => ({}));

    // Create manager
    manager = new PostProcessingManager();
  });

  describe('initialize', () => {
    it('should initialize with scene and camera', () => {
      // Act
      manager.initialize(mockScene, mockCamera);

      // Assert - this test just verifies it doesn't throw
      expect(mockScene).toBeDefined();
      expect(mockCamera).toBeDefined();
    });
  });

  describe('addEffect', () => {
    beforeEach(() => {
      manager.initialize(mockScene, mockCamera);
    });

    it('should add bloom effect', () => {
      // Act
      const result = manager.addEffect(PostProcessEffectType.BLOOM);

      // Assert
      expect(result).toBe(true);
      expect(BABYLON.BloomEffect).toHaveBeenCalled();
    });

    it('should add motion blur effect', () => {
      // Act
      const result = manager.addEffect(PostProcessEffectType.MOTION_BLUR);

      // Assert
      expect(result).toBe(true);
      expect(BABYLON.MotionBlurPostProcess).toHaveBeenCalled();
    });

    it('should add depth of field effect', () => {
      // Act
      const result = manager.addEffect(PostProcessEffectType.DEPTH_OF_FIELD);

      // Assert
      expect(result).toBe(true);
      expect(BABYLON.DepthOfFieldEffect).toHaveBeenCalled();
    });

    it('should add color correction effect', () => {
      // Act
      const result = manager.addEffect(PostProcessEffectType.COLOR_CORRECTION);

      // Assert
      expect(result).toBe(true);
      expect(BABYLON.ColorCorrectionPostProcess).toHaveBeenCalled();
    });

    it('should add chromatic aberration effect', () => {
      // Act
      const result = manager.addEffect(PostProcessEffectType.CHROMATIC_ABERRATION);

      // Assert
      expect(result).toBe(true);
      expect(BABYLON.ChromaticAberrationPostProcess).toHaveBeenCalled();
    });

    it('should add film grain effect', () => {
      // Act
      const result = manager.addEffect(PostProcessEffectType.FILM_GRAIN);

      // Assert
      expect(result).toBe(true);
      expect(BABYLON.GrainPostProcess).toHaveBeenCalled();
    });

    it('should add vignette effect', () => {
      // Act
      const result = manager.addEffect(PostProcessEffectType.VIGNETTE);

      // Assert
      expect(result).toBe(true);
      expect(BABYLON.VignettePostProcess).toHaveBeenCalled();
    });

    it('should add anti-aliasing effect', () => {
      // Act
      const result = manager.addEffect(PostProcessEffectType.ANTI_ALIASING);

      // Assert
      expect(result).toBe(true);
      expect(BABYLON.FxaaPostProcess).toHaveBeenCalled();
    });

    it('should return false for unknown effect', () => {
      // Act
      const result = manager.addEffect('unknown' as PostProcessEffectType);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false if not initialized', () => {
      // Arrange
      manager = new PostProcessingManager(); // Reset manager without initializing

      // Act
      const result = manager.addEffect(PostProcessEffectType.BLOOM);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('removeEffect', () => {
    beforeEach(() => {
      manager.initialize(mockScene, mockCamera);
      manager.addEffect(PostProcessEffectType.BLOOM);
    });

    it('should remove an existing effect', () => {
      // Act
      const result = manager.removeEffect(PostProcessEffectType.BLOOM);

      // Assert
      expect(result).toBe(true);
      expect(mockBloomEffect.dispose).toHaveBeenCalled();
    });

    it('should return false for non-existing effect', () => {
      // Arrange - remove the effect first
      manager.removeEffect(PostProcessEffectType.BLOOM);

      // Act
      const result = manager.removeEffect(PostProcessEffectType.BLOOM);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getEffect', () => {
    beforeEach(() => {
      manager.initialize(mockScene, mockCamera);
      manager.addEffect(PostProcessEffectType.BLOOM);
    });

    it('should return existing effect', () => {
      // Act
      const result = manager.getEffect(PostProcessEffectType.BLOOM);

      // Assert
      expect(result).not.toBeNull();
    });

    it('should return null for non-existing effect', () => {
      // Act
      const result = manager.getEffect(PostProcessEffectType.MOTION_BLUR);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('enableEffect and disableEffect', () => {
    beforeEach(() => {
      manager.initialize(mockScene, mockCamera);
      manager.addEffect(PostProcessEffectType.BLOOM);
    });

    it('should enable an existing effect', () => {
      // Act
      const result = manager.enableEffect(PostProcessEffectType.BLOOM);

      // Assert
      expect(result).toBe(true);
    });

    it('should disable an existing effect', () => {
      // Act
      const result = manager.disableEffect(PostProcessEffectType.BLOOM);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when enabling non-existing effect', () => {
      // Act
      const result = manager.enableEffect(PostProcessEffectType.MOTION_BLUR);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when disabling non-existing effect', () => {
      // Act
      const result = manager.disableEffect(PostProcessEffectType.MOTION_BLUR);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('updateEffectOptions', () => {
    beforeEach(() => {
      manager.initialize(mockScene, mockCamera);
    });

    it('should update bloom effect options', () => {
      // Arrange
      manager.addEffect(PostProcessEffectType.BLOOM);
      const options: BloomEffectOptions = {
        intensity: 0.8,
        threshold: 0.7,
      };

      // Act
      const result = manager.updateEffectOptions(PostProcessEffectType.BLOOM, options);

      // Assert
      expect(result).toBe(true);
    });

    it('should update motion blur effect options', () => {
      // Arrange
      manager.addEffect(PostProcessEffectType.MOTION_BLUR);
      const options: MotionBlurEffectOptions = {
        intensity: 0.3,
        samples: 12,
      };

      // Act
      const result = manager.updateEffectOptions(PostProcessEffectType.MOTION_BLUR, options);

      // Assert
      expect(result).toBe(true);
    });

    it('should update depth of field effect options', () => {
      // Arrange
      manager.addEffect(PostProcessEffectType.DEPTH_OF_FIELD);
      const options: DepthOfFieldEffectOptions = {
        focalLength: 55,
        aperture: 3.5,
      };

      // Act
      const result = manager.updateEffectOptions(PostProcessEffectType.DEPTH_OF_FIELD, options);

      // Assert
      expect(result).toBe(true);
    });

    it('should update color correction effect options', () => {
      // Arrange
      manager.addEffect(PostProcessEffectType.COLOR_CORRECTION);
      const options: ColorCorrectionEffectOptions = {
        saturation: 1.2,
        contrast: 1.3,
      };

      // Act
      const result = manager.updateEffectOptions(PostProcessEffectType.COLOR_CORRECTION, options);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-existing effect', () => {
      // Act
      const result = manager.updateEffectOptions(PostProcessEffectType.BLOOM, {});

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Effect configuration methods', () => {
    beforeEach(() => {
      manager.initialize(mockScene, mockCamera);
    });

    it('should configure bloom effect', () => {
      // Arrange
      manager.addEffect(PostProcessEffectType.BLOOM);
      const options: BloomEffectOptions = {
        intensity: 0.8,
        threshold: 0.7,
      };

      // Act
      const result = manager.configureBloom(options);

      // Assert
      expect(result).toBe(true);
    });

    it('should configure motion blur effect', () => {
      // Arrange
      manager.addEffect(PostProcessEffectType.MOTION_BLUR);
      const options: MotionBlurEffectOptions = {
        intensity: 0.3,
        samples: 12,
      };

      // Act
      const result = manager.configureMotionBlur(options);

      // Assert
      expect(result).toBe(true);
    });

    it('should configure depth of field effect', () => {
      // Arrange
      manager.addEffect(PostProcessEffectType.DEPTH_OF_FIELD);
      const options: DepthOfFieldEffectOptions = {
        focalLength: 55,
        aperture: 3.5,
      };

      // Act
      const result = manager.configureDepthOfField(options);

      // Assert
      expect(result).toBe(true);
    });

    it('should configure color correction effect', () => {
      // Arrange
      manager.addEffect(PostProcessEffectType.COLOR_CORRECTION);
      const options: ColorCorrectionEffectOptions = {
        saturation: 1.2,
        contrast: 1.3,
      };

      // Act
      const result = manager.configureColorCorrection(options);

      // Assert
      expect(result).toBe(true);
    });

    it('should add effect if it does not exist when configuring', () => {
      // Act
      const result = manager.configureBloom({ intensity: 0.8 });

      // Assert
      expect(result).toBe(true);
      expect(BABYLON.BloomEffect).toHaveBeenCalled();
    });
  });

  describe('resetEffects', () => {
    beforeEach(() => {
      manager.initialize(mockScene, mockCamera);
      manager.addEffect(PostProcessEffectType.BLOOM);
      manager.addEffect(PostProcessEffectType.MOTION_BLUR);
    });

    it('should reset all effects', () => {
      // Act
      manager.resetEffects();

      // Assert
      expect(mockBloomEffect.dispose).toHaveBeenCalled();
      expect(mockMotionBlurPostProcess.dispose).toHaveBeenCalled();

      // Verify effects are cleared by trying to get them
      expect(manager.getEffect(PostProcessEffectType.BLOOM)).toBeNull();
      expect(manager.getEffect(PostProcessEffectType.MOTION_BLUR)).toBeNull();
    });
  });

  describe('dispose', () => {
    beforeEach(() => {
      manager.initialize(mockScene, mockCamera);
      manager.addEffect(PostProcessEffectType.BLOOM);
      manager.addEffect(PostProcessEffectType.MOTION_BLUR);
    });

    it('should dispose all resources', () => {
      // Act
      manager.dispose();

      // Assert
      expect(mockBloomEffect.dispose).toHaveBeenCalled();
      expect(mockMotionBlurPostProcess.dispose).toHaveBeenCalled();

      // Verify internal state is reset
      expect(manager.getEffect(PostProcessEffectType.BLOOM)).toBeNull();

      // Try to add an effect after disposal (should fail)
      expect(manager.addEffect(PostProcessEffectType.BLOOM)).toBe(false);
    });
  });
});
