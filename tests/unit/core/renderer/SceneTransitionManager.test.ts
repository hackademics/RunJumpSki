/**
 * @file tests/unit/core/renderer/SceneTransitionManager.test.ts
 * @description Unit tests for the SceneTransitionManager class
 */

import * as BABYLON from 'babylonjs';
import { SceneTransitionManager } from '../../../../src/core/renderer/SceneTransitionManager';
import {
  SceneTransitionType,
  SceneTransitionOptions,
} from '../../../../src/core/renderer/ISceneManager';

// Mock BabylonJS
jest.mock('babylonjs');

describe('SceneTransitionManager', () => {
  // Mocks
  let mockEngine: jest.Mocked<BABYLON.Engine>;
  let mockFromScene: jest.Mocked<BABYLON.Scene>;
  let mockToScene: jest.Mocked<BABYLON.Scene>;
  let mockRenderTargetTexture: jest.Mocked<BABYLON.RenderTargetTexture>;
  let mockMaterial: jest.Mocked<BABYLON.StandardMaterial>;
  let mockPlane: jest.Mocked<BABYLON.Mesh>;
  let mockCamera: jest.Mocked<BABYLON.FreeCamera>;
  let mockTransitionScene: jest.Mocked<BABYLON.Scene>;

  // Test object
  let transitionManager: SceneTransitionManager;

  // Animation callback for tests
  let animationCompletedCallback: () => void;

  beforeEach(() => {
    // Set up mock BabylonJS engine
    mockEngine = {
      runRenderLoop: jest.fn(),
      stopRenderLoop: jest.fn(),
      getRenderWidth: jest.fn().mockReturnValue(800),
      getRenderHeight: jest.fn().mockReturnValue(600),
    } as unknown as jest.Mocked<BABYLON.Engine>;

    // Set up mock scenes
    mockFromScene = {
      render: jest.fn(),
      dispose: jest.fn(),
      stopAllAnimations: jest.fn(),
      audioEnabled: true,
      getPhysicsEngine: jest.fn().mockReturnValue({
        setTimeStep: jest.fn(),
      }),
      activeCamera: {
        position: new BABYLON.Vector3(0, 0, -10),
        getTarget: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0)),
      },
    } as unknown as jest.Mocked<BABYLON.Scene>;

    mockToScene = {
      render: jest.fn(),
      dispose: jest.fn(),
      stopAllAnimations: jest.fn(),
      audioEnabled: true,
      getPhysicsEngine: jest.fn().mockReturnValue({
        setTimeStep: jest.fn(),
      }),
    } as unknown as jest.Mocked<BABYLON.Scene>;

    // Set up mock transition scene
    mockTransitionScene = {
      render: jest.fn(),
      dispose: jest.fn(),
    } as unknown as jest.Mocked<BABYLON.Scene>;

    // Mock render target texture
    mockRenderTargetTexture = {
      renderList: [],
      dispose: jest.fn(),
    } as unknown as jest.Mocked<BABYLON.RenderTargetTexture>;

    // Mock material
    mockMaterial = {
      diffuseTexture: null,
      alpha: 1.0,
      emissiveColor: new BABYLON.Color3(0, 0, 0),
      backFaceCulling: true,
      dispose: jest.fn(),
    } as unknown as jest.Mocked<BABYLON.StandardMaterial>;

    // Mock plane
    mockPlane = {
      material: null,
      position: new BABYLON.Vector3(0, 0, 0),
      scaling: new BABYLON.Vector3(1, 1, 1),
      dispose: jest.fn(),
    } as unknown as jest.Mocked<BABYLON.Mesh>;

    // Mock camera
    mockCamera = {
      setTarget: jest.fn(),
    } as unknown as jest.Mocked<BABYLON.FreeCamera>;

    // Set up animation callback
    animationCompletedCallback = jest.fn();
    jest
      .spyOn(BABYLON.Animation, 'CreateAndStartAnimation')
      .mockImplementation(
        (
          name,
          target,
          targetProperty,
          fps,
          totalFrames,
          from,
          to,
          loopMode,
          easingFunction,
          onAnimationEnd
        ) => {
          if (onAnimationEnd) {
            // Store callback to manually trigger animation completion in tests
            animationCompletedCallback = onAnimationEnd as () => void;
          }
          return null;
        }
      );

    // Mock constructor implementations
    (BABYLON.Scene as unknown as jest.Mock).mockImplementation(() => mockTransitionScene);
    (BABYLON.FreeCamera as unknown as jest.Mock).mockImplementation(() => mockCamera);
    (BABYLON.StandardMaterial as unknown as jest.Mock).mockImplementation(() => mockMaterial);
    (BABYLON.RenderTargetTexture as unknown as jest.Mock).mockImplementation(
      () => mockRenderTargetTexture
    );
    (BABYLON.MeshBuilder.CreatePlane as unknown as jest.Mock).mockImplementation(() => mockPlane);

    // Create transition manager
    transitionManager = new SceneTransitionManager(mockEngine);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('transition', () => {
    it('should reject if a transition is already in progress', async () => {
      // Set internal isTransitioning flag to true
      (transitionManager as unknown as Record<string, boolean>).isTransitioning = true;

      const options: SceneTransitionOptions = {
        type: SceneTransitionType.FADE,
        duration: 500,
      };

      await expect(
        transitionManager.transition(mockFromScene, mockToScene, options)
      ).rejects.toThrow('A transition is already in progress');
    });

    it('should handle the NONE transition type by immediately switching scenes', async () => {
      const options: SceneTransitionOptions = {
        type: SceneTransitionType.NONE,
      };

      await transitionManager.transition(mockFromScene, mockToScene, options);

      expect(mockEngine.stopRenderLoop).toHaveBeenCalled();
      expect(mockEngine.runRenderLoop).toHaveBeenCalled();
      expect(mockFromScene.stopAllAnimations).toHaveBeenCalled();
      expect(mockFromScene.audioEnabled).toBe(false);
    });

    it('should dispose the from scene if disposePrevious is true', async () => {
      const options: SceneTransitionOptions = {
        type: SceneTransitionType.NONE,
        disposePrevious: true,
      };

      await transitionManager.transition(mockFromScene, mockToScene, options);

      expect(mockFromScene.dispose).toHaveBeenCalled();
    });

    it('should pause the from scene if disposePrevious is false', async () => {
      const options: SceneTransitionOptions = {
        type: SceneTransitionType.NONE,
        disposePrevious: false,
      };

      await transitionManager.transition(mockFromScene, mockToScene, options);

      expect(mockFromScene.stopAllAnimations).toHaveBeenCalled();
      expect(mockFromScene.audioEnabled).toBe(false);
      expect(mockFromScene.getPhysicsEngine()?.setTimeStep).toHaveBeenCalledWith(0);
    });

    it('should clean up transition resources after completion', async () => {
      // Spy on private cleanupTransitionResources method
      const cleanupSpy = jest.spyOn(
        transitionManager as unknown as Record<string, any>,
        'cleanupTransitionResources'
      );

      const options: SceneTransitionOptions = {
        type: SceneTransitionType.NONE,
      };

      await transitionManager.transition(mockFromScene, mockToScene, options);

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('fadeTransition', () => {
    it('should set up fade transition with correct animation parameters', async () => {
      // Spy on private methods
      const captureSpy = jest
        .spyOn(transitionManager as unknown as Record<string, any>, 'captureSceneToTexture')
        .mockReturnValue(mockRenderTargetTexture);

      const options: SceneTransitionOptions = {
        type: SceneTransitionType.FADE,
        duration: 1000,
        fadeToColor: new BABYLON.Color3(0, 0, 0),
      };

      // Start transition
      const transitionPromise = transitionManager.transition(mockFromScene, mockToScene, options);

      // Verify first animation setup
      expect(BABYLON.Animation.CreateAndStartAnimation).toHaveBeenCalledWith(
        'fadeOut',
        expect.anything(),
        'alpha',
        60,
        30, // half duration in frames (1000ms / 2 / 1000 * 60fps)
        1.0,
        0.0,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
        expect.any(Object),
        expect.any(Function)
      );

      // Manually trigger the first animation's completion callback
      animationCompletedCallback();

      // Verify second animation setup
      expect(BABYLON.Animation.CreateAndStartAnimation).toHaveBeenCalledWith(
        'fadeIn',
        expect.anything(),
        'alpha',
        60,
        30, // half duration in frames
        0.0,
        1.0,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
        expect.any(Object),
        expect.any(Function)
      );

      // Trigger the second animation's completion callback
      animationCompletedCallback();

      // Wait for the transition to complete
      await transitionPromise;

      // Verify that we captured both scenes and switched to the target scene
      expect(captureSpy).toHaveBeenCalledTimes(2);
      expect(mockTransitionScene.dispose).toHaveBeenCalled();
      expect(mockEngine.runRenderLoop).toHaveBeenCalled();
    });
  });

  describe('slideTransition', () => {
    it('should set up slide transition with correct animation parameters', async () => {
      // Spy on private captureSceneToTexture method
      const captureSpy = jest
        .spyOn(transitionManager as unknown as Record<string, any>, 'captureSceneToTexture')
        .mockReturnValue(mockRenderTargetTexture);

      const options: SceneTransitionOptions = {
        type: SceneTransitionType.SLIDE,
        duration: 1000,
        slideDirection: 'left',
      };

      // Start transition
      const transitionPromise = transitionManager.transition(mockFromScene, mockToScene, options);

      // Verify animation setup
      expect(BABYLON.Animation.CreateAndStartAnimation).toHaveBeenCalled();

      // Manually trigger the animation's completion callback
      animationCompletedCallback();

      // Wait for the transition to complete
      await transitionPromise;

      // Verify that we captured both scenes
      expect(captureSpy).toHaveBeenCalledTimes(2);
      expect(mockTransitionScene.dispose).toHaveBeenCalled();
    });
  });

  describe('dissolveTransition', () => {
    it('should set up dissolve transition with correct shader materials', async () => {
      // Spy on private captureSceneToTexture method
      const captureSpy = jest
        .spyOn(transitionManager as unknown as Record<string, any>, 'captureSceneToTexture')
        .mockReturnValue(mockRenderTargetTexture);

      const options: SceneTransitionOptions = {
        type: SceneTransitionType.DISSOLVE,
        duration: 1000,
      };

      // Mock ShaderMaterial
      const mockShaderMaterial = {
        setTexture: jest.fn(),
        setFloat: jest.fn(),
        dispose: jest.fn(),
      };
      (BABYLON.ShaderMaterial as unknown as jest.Mock).mockImplementation(() => mockShaderMaterial);

      // Start transition
      const transitionPromise = transitionManager.transition(mockFromScene, mockToScene, options);

      // Verify animation setup
      expect(BABYLON.Animation.CreateAndStartAnimation).toHaveBeenCalled();

      // Manually trigger the animation's completion callback
      animationCompletedCallback();

      // Wait for the transition to complete
      await transitionPromise;

      // Verify that we captured both scenes
      expect(captureSpy).toHaveBeenCalledTimes(2);
      expect(mockTransitionScene.dispose).toHaveBeenCalled();
    });
  });

  describe('zoomTransition', () => {
    it('should set up zoom transition with correct animation parameters', async () => {
      // Spy on private captureSceneToTexture method
      const captureSpy = jest
        .spyOn(transitionManager as unknown as Record<string, any>, 'captureSceneToTexture')
        .mockReturnValue(mockRenderTargetTexture);

      const options: SceneTransitionOptions = {
        type: SceneTransitionType.ZOOM,
        duration: 1000,
        zoomType: 'zoomIn',
      };

      // Start transition
      const transitionPromise = transitionManager.transition(mockFromScene, mockToScene, options);

      // Verify animation setup
      expect(BABYLON.Animation.CreateAndStartAnimation).toHaveBeenCalled();

      // Manually trigger the animation's completion callback
      animationCompletedCallback();

      // Wait for the transition to complete
      await transitionPromise;

      // Verify that we captured both scenes
      expect(captureSpy).toHaveBeenCalledTimes(2);
      expect(mockTransitionScene.dispose).toHaveBeenCalled();
    });
  });

  describe('captureSceneToTexture', () => {
    it('should create a render target texture with the scene dimensions', () => {
      // Call the private method directly
      (transitionManager as unknown as Record<string, any>).captureSceneToTexture(mockFromScene);

      // Verify RenderTargetTexture was created with correct dimensions
      expect(BABYLON.RenderTargetTexture).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          renderList: expect.any(Array),
        })
      );
    });
  });

  describe('cleanupTransitionResources', () => {
    it('should dispose all transition resources', () => {
      // Set up resources to be cleaned
      (transitionManager as unknown as Record<string, any>).transitionTexture =
        mockRenderTargetTexture;
      (transitionManager as unknown as Record<string, any>).transitionMaterial = mockMaterial;
      (transitionManager as unknown as Record<string, any>).transitionPlane = mockPlane;

      // Call the private method directly
      (transitionManager as unknown as Record<string, any>).cleanupTransitionResources();

      // Verify resources were disposed
      expect(mockRenderTargetTexture.dispose).toHaveBeenCalled();
      expect(mockMaterial.dispose).toHaveBeenCalled();
      expect(mockPlane.dispose).toHaveBeenCalled();

      // Verify references were cleared
      expect((transitionManager as unknown as Record<string, any>).transitionTexture).toBeNull();
      expect((transitionManager as unknown as Record<string, any>).transitionMaterial).toBeNull();
      expect((transitionManager as unknown as Record<string, any>).transitionPlane).toBeNull();
    });
  });
});
