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

// Create a simple Observable mock for Babylon
class MockObservable {
  private callbacks: Array<(...args: any[]) => void> = [];

  public add(callback: (...args: any[]) => void): void {
    this.callbacks.push(callback);
  }

  public remove(callback: (...args: any[]) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  public notifyObservers(...args: any[]): void {
    this.callbacks.forEach(callback => callback(...args));
  }
}

// Helper to create a mock post-process
const createMockPostProcess = (name = 'mock') => ({
  name,
  isEnabled: true,
  dispose: jest.fn(),
  getClassName: jest.fn().mockReturnValue(name)
});

describe('PostProcessingManager', () => {
  // Test variables
  let manager: PostProcessingManager;
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockCamera: jest.Mocked<BABYLON.Camera>;
  let mockActiveCameraChangedObservable: MockObservable;
  let mockEngine: jest.Mocked<BABYLON.Engine>;

  // Mock post-processes
  let mockBloomEffect: any; // Use any to avoid type issues
  let mockMotionBlurPostProcess: any;
  let mockDepthOfFieldEffect: any;
  let mockColorCorrectionPostProcess: any;
  let mockChromaticAberrationPostProcess: any;
  let mockGrainPostProcess: any;
  let mockVignettePostProcess: any;
  let mockFxaaPostProcess: any;

  // Helper function to access private properties for testing
  const getPrivateProperty = (obj: any, prop: string) => {
    return (obj as any)[prop];
  };

  // Helper function to set private properties for testing
  const setPrivateProperty = (obj: any, prop: string, value: any) => {
    (obj as any)[prop] = value;
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock engine
    mockEngine = {
      getRenderingCanvas: jest.fn().mockReturnValue(document.createElement('canvas'))
    } as unknown as jest.Mocked<BABYLON.Engine>;

    // Create mock observable for scene.onActiveCameraChanged
    mockActiveCameraChangedObservable = new MockObservable();

    // Create mock scene and camera
    mockScene = {
      dispose: jest.fn(),
      activeCamera: null,
      // Add onActiveCameraChanged observable
      onActiveCameraChanged: mockActiveCameraChangedObservable,
      getEngine: jest.fn().mockReturnValue(mockEngine)
    } as unknown as jest.Mocked<BABYLON.Scene>;

    mockCamera = {
      dispose: jest.fn(),
    } as unknown as jest.Mocked<BABYLON.Camera>;

    // Set active camera on scene
    mockScene.activeCamera = mockCamera;

    // Create mock post-processes
    mockBloomEffect = {
      getPostProcesses: jest.fn().mockReturnValue([createMockPostProcess('bloom')]),
      dispose: jest.fn(),
    };

    mockMotionBlurPostProcess = createMockPostProcess('motionBlur');

    mockDepthOfFieldEffect = {
      getPostProcesses: jest.fn().mockReturnValue([createMockPostProcess('depthOfField')]),
      dispose: jest.fn(),
    };

    mockColorCorrectionPostProcess = createMockPostProcess('colorCorrection');
    
    mockChromaticAberrationPostProcess = createMockPostProcess('chromaticAberration');
    
    mockGrainPostProcess = createMockPostProcess('grain');
    
    mockVignettePostProcess = createMockPostProcess('vignette');
    
    mockFxaaPostProcess = createMockPostProcess('fxaa');

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
    (BABYLON.ChromaticAberrationPostProcess as any) = jest
      .fn()
      .mockImplementation(() => mockChromaticAberrationPostProcess);
    (BABYLON.GrainPostProcess as any) = jest
      .fn()
      .mockImplementation(() => mockGrainPostProcess);
    (BABYLON.VignettePostProcess as any) = jest
      .fn()
      .mockImplementation(() => mockVignettePostProcess);
    (BABYLON.FxaaPostProcess as any) = jest
      .fn()
      .mockImplementation(() => mockFxaaPostProcess);
    (BABYLON.Color3 as any) = jest.fn().mockImplementation(() => ({}));
    (BABYLON.Color4 as any) = jest.fn().mockImplementation(() => ({}));

    // Create manager
    manager = new PostProcessingManager();
  });

  describe('initialize', () => {
    it('should initialize with scene and camera', () => {
      // Act
      manager.initialize(mockScene);

      // Assert - this test just verifies it doesn't throw
      expect(mockScene).toBeDefined();
      expect(mockScene.activeCamera).toBeDefined();
    });

    it('should handle camera change event', () => {
      // Arrange
      manager.initialize(mockScene);
      
      // Add a bloom effect first
      manager.addEffect(PostProcessEffectType.BLOOM);
      
      // Manually set the internal state to include the bloom effect
      setPrivateProperty(manager, 'postProcesses', new Map([
        [PostProcessEffectType.BLOOM, mockBloomEffect]
      ]));
      
      // Create a new camera
      const newMockCamera = {
        dispose: jest.fn(),
      } as unknown as jest.Mocked<BABYLON.Camera>;
      
      // Set new active camera and trigger event
      mockScene.activeCamera = newMockCamera;
      
      // Act - trigger the camera changed event
      mockActiveCameraChangedObservable.notifyObservers();
      
      // Assert
      // Just verify it doesn't throw - the reattachment is internal
      expect(mockScene.activeCamera).toBe(newMockCamera);
      
      // Verify that bloom effect got disposed during reattachment
      expect(mockBloomEffect.dispose).toHaveBeenCalled();
    });
  });

  describe('addEffect', () => {
    beforeEach(() => {
      manager.initialize(mockScene);
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
      manager.initialize(mockScene);
      // Add bloom effect to manager
      manager.addEffect(PostProcessEffectType.BLOOM);
      
      // Manually set the internal state to include the effect for testing
      setPrivateProperty(manager, 'postProcesses', new Map([
        [PostProcessEffectType.BLOOM, mockBloomEffect]
      ]));
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
      // First, clear the map
      setPrivateProperty(manager, 'postProcesses', new Map());

      // Act
      const result = manager.removeEffect(PostProcessEffectType.BLOOM);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getEffect', () => {
    beforeEach(() => {
      manager.initialize(mockScene);
      manager.addEffect(PostProcessEffectType.BLOOM);
      
      // Manually set the internal state to include the effect for testing
      setPrivateProperty(manager, 'postProcesses', new Map([
        [PostProcessEffectType.BLOOM, mockBloomEffect]
      ]));
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
      manager.initialize(mockScene);
      manager.addEffect(PostProcessEffectType.BLOOM);
      
      // Manually set the internal state to include the effect for testing
      setPrivateProperty(manager, 'postProcesses', new Map([
        [PostProcessEffectType.BLOOM, mockBloomEffect]
      ]));
    });

    it('should enable an existing effect', () => {
      // First disable the effect
      mockBloomEffect.isEnabled = false;

      // Act
      const result = manager.enableEffect(PostProcessEffectType.BLOOM);

      // Assert
      expect(result).toBe(true);
      expect(mockBloomEffect.isEnabled).toBe(true);
    });

    it('should disable an existing effect', () => {
      // Act
      const result = manager.disableEffect(PostProcessEffectType.BLOOM);

      // Assert
      expect(result).toBe(true);
      expect(mockBloomEffect.isEnabled).toBe(false);
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
      manager.initialize(mockScene);
      
      // Set up the internal state for testing
      setPrivateProperty(manager, 'postProcesses', new Map([
        [PostProcessEffectType.BLOOM, mockBloomEffect],
        [PostProcessEffectType.MOTION_BLUR, mockMotionBlurPostProcess],
        [PostProcessEffectType.DEPTH_OF_FIELD, mockDepthOfFieldEffect],
        [PostProcessEffectType.COLOR_CORRECTION, mockColorCorrectionPostProcess]
      ]));
      
      // Initialize the options map
      setPrivateProperty(manager, 'effectOptions', new Map([
        [PostProcessEffectType.BLOOM, { enabled: true, priority: 100, intensity: 0.5 }],
        [PostProcessEffectType.MOTION_BLUR, { enabled: true, priority: 200, intensity: 0.2 }],
        [PostProcessEffectType.DEPTH_OF_FIELD, { enabled: true, priority: 300, focusDistance: 10 }],
        [PostProcessEffectType.COLOR_CORRECTION, { enabled: true, priority: 400, contrast: 1.1 }]
      ]));
    });

    it('should update bloom effect options', () => {
      // Act
      const result = manager.updateEffectOptions(PostProcessEffectType.BLOOM, {
        enabled: true,
        priority: 100,
        intensity: 0.7,
      });

      // Assert
      expect(result).toBe(true);
      
      // Verify options were updated
      const options = getPrivateProperty(manager, 'effectOptions').get(PostProcessEffectType.BLOOM);
      expect(options.intensity).toBe(0.7);
    });

    it('should update motion blur effect options', () => {
      // Act
      const result = manager.updateEffectOptions(PostProcessEffectType.MOTION_BLUR, {
        enabled: true,
        priority: 200,
        intensity: 0.3,
      });

      // Assert
      expect(result).toBe(true);
      
      // Verify options were updated
      const options = getPrivateProperty(manager, 'effectOptions').get(PostProcessEffectType.MOTION_BLUR);
      expect(options.intensity).toBe(0.3);
    });

    it('should update depth of field effect options', () => {
      // Act
      const result = manager.updateEffectOptions(PostProcessEffectType.DEPTH_OF_FIELD, {
        enabled: true,
        priority: 300,
        focusDistance: 15,
      });

      // Assert
      expect(result).toBe(true);
      
      // Verify options were updated
      const options = getPrivateProperty(manager, 'effectOptions').get(PostProcessEffectType.DEPTH_OF_FIELD);
      expect(options.focusDistance).toBe(15);
    });

    it('should update color correction effect options', () => {
      // Act
      const result = manager.updateEffectOptions(PostProcessEffectType.COLOR_CORRECTION, {
        enabled: true,
        priority: 400,
        contrast: 1.2,
      });

      // Assert
      expect(result).toBe(true);
      
      // Verify options were updated
      const options = getPrivateProperty(manager, 'effectOptions').get(PostProcessEffectType.COLOR_CORRECTION);
      expect(options.contrast).toBe(1.2);
    });

    it('should return false for non-existing effect', () => {
      // Act
      const result = manager.updateEffectOptions(PostProcessEffectType.CHROMATIC_ABERRATION, {
        enabled: true,
        priority: 500,
      });

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Effect configuration methods', () => {
    beforeEach(() => {
      manager.initialize(mockScene);
      
      // Set up the internal state for testing
      setPrivateProperty(manager, 'postProcesses', new Map([
        [PostProcessEffectType.BLOOM, mockBloomEffect],
        [PostProcessEffectType.MOTION_BLUR, mockMotionBlurPostProcess],
        [PostProcessEffectType.DEPTH_OF_FIELD, mockDepthOfFieldEffect],
        [PostProcessEffectType.COLOR_CORRECTION, mockColorCorrectionPostProcess]
      ]));
      
      // Initialize the options map
      setPrivateProperty(manager, 'effectOptions', new Map([
        [PostProcessEffectType.BLOOM, { enabled: true, priority: 100, intensity: 0.5 }],
        [PostProcessEffectType.MOTION_BLUR, { enabled: true, priority: 200, intensity: 0.2 }],
        [PostProcessEffectType.DEPTH_OF_FIELD, { enabled: true, priority: 300, focusDistance: 10 }],
        [PostProcessEffectType.COLOR_CORRECTION, { enabled: true, priority: 400, contrast: 1.1 }]
      ]));
    });

    it('should configure bloom effect', () => {
      // Act
      const result = manager.configureBloom({
        enabled: true,
        priority: 100,
        intensity: 0.7,
        threshold: 0.9,
      });

      // Assert
      expect(result).toBe(true);
      
      // Verify options were updated
      const options = getPrivateProperty(manager, 'effectOptions').get(PostProcessEffectType.BLOOM);
      expect(options.intensity).toBe(0.7);
      expect(options.threshold).toBe(0.9);
    });

    it('should configure motion blur effect', () => {
      // Act
      const result = manager.configureMotionBlur({
        enabled: true,
        priority: 200,
        intensity: 0.3,
        samples: 12,
      });

      // Assert
      expect(result).toBe(true);
      
      // Verify options were updated
      const options = getPrivateProperty(manager, 'effectOptions').get(PostProcessEffectType.MOTION_BLUR);
      expect(options.intensity).toBe(0.3);
      expect(options.samples).toBe(12);
    });

    it('should configure depth of field effect', () => {
      // Act
      const result = manager.configureDepthOfField({
        enabled: true,
        priority: 300,
        focusDistance: 15,
        focalLength: 55,
        fStop: 3.5,
      });

      // Assert
      expect(result).toBe(true);
      
      // Verify options were updated
      const options = getPrivateProperty(manager, 'effectOptions').get(PostProcessEffectType.DEPTH_OF_FIELD);
      expect(options.focusDistance).toBe(15);
      expect(options.focalLength).toBe(55);
      expect(options.fStop).toBe(3.5);
    });

    it('should configure color correction effect', () => {
      // Act
      const result = manager.configureColorCorrection({
        enabled: true,
        priority: 400,
        contrast: 1.2,
        saturation: 1.1,
      });

      // Assert
      expect(result).toBe(true);
      
      // Verify options were updated
      const options = getPrivateProperty(manager, 'effectOptions').get(PostProcessEffectType.COLOR_CORRECTION);
      expect(options.contrast).toBe(1.2);
      expect(options.saturation).toBe(1.1);
    });

    it('should add effect if it does not exist when configuring', () => {
      // Clear the postProcesses map
      setPrivateProperty(manager, 'postProcesses', new Map());
      
      // Act - configure a non-existing effect
      const result = manager.configureBloom({
        enabled: true,
        priority: 100,
        intensity: 0.7,
      });

      // Assert
      expect(result).toBe(true);
      expect(BABYLON.BloomEffect).toHaveBeenCalled();
    });
  });

  describe('resetEffects', () => {
    beforeEach(() => {
      manager.initialize(mockScene);
      
      // Set up the internal state for testing
      setPrivateProperty(manager, 'postProcesses', new Map([
        [PostProcessEffectType.BLOOM, mockBloomEffect],
        [PostProcessEffectType.MOTION_BLUR, mockMotionBlurPostProcess]
      ]));
      
      // Initialize the options map
      setPrivateProperty(manager, 'effectOptions', new Map([
        [PostProcessEffectType.BLOOM, { enabled: true, priority: 100, intensity: 0.5 }],
        [PostProcessEffectType.MOTION_BLUR, { enabled: true, priority: 200, intensity: 0.2 }]
      ]));
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

      // Verify maps are cleared
      expect(getPrivateProperty(manager, 'postProcesses').size).toBe(0);
      expect(getPrivateProperty(manager, 'effectOptions').size).toBe(0);
    });
  });

  describe('dispose', () => {
    beforeEach(() => {
      manager.initialize(mockScene);
      
      // Set up the internal state for testing
      setPrivateProperty(manager, 'postProcesses', new Map([
        [PostProcessEffectType.BLOOM, mockBloomEffect],
        [PostProcessEffectType.MOTION_BLUR, mockMotionBlurPostProcess]
      ]));
      
      // Initialize the options map
      setPrivateProperty(manager, 'effectOptions', new Map([
        [PostProcessEffectType.BLOOM, { enabled: true, priority: 100, intensity: 0.5 }],
        [PostProcessEffectType.MOTION_BLUR, { enabled: true, priority: 200, intensity: 0.2 }]
      ]));
    });

    it('should dispose all resources', () => {
      // Act
      manager.dispose();

      // Assert
      expect(mockBloomEffect.dispose).toHaveBeenCalled();
      expect(mockMotionBlurPostProcess.dispose).toHaveBeenCalled();

      // Verify internal state is reset
      expect(getPrivateProperty(manager, 'scene')).toBeNull();
      expect(getPrivateProperty(manager, 'camera')).toBeNull();
      expect(getPrivateProperty(manager, 'postProcesses').size).toBe(0);
      expect(getPrivateProperty(manager, 'effectOptions').size).toBe(0);
    });
  });
});
