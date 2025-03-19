/**
 * @file tests/unit/core/renderer/SceneManager.test.ts
 * @description Unit tests for the SceneManager class
 */

import * as BABYLON from 'babylonjs';
import { SceneManager } from '../../../../src/core/renderer/SceneManager';
import { SceneFactory } from '../../../../src/core/renderer/SceneFactory';
import { SceneTransitionManager } from '../../../../src/core/renderer/SceneTransitionManager';
import {
  SceneTransitionType,
  SceneCreateOptions,
} from '../../../../src/core/renderer/ISceneManager';

// Mock BabylonJS
jest.mock('babylonjs');

describe('SceneManager', () => {
  // Mocks
  let mockEngine: jest.Mocked<BABYLON.Engine>;
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockCanvas: HTMLCanvasElement;
  let mockSceneFactory: jest.Mocked<SceneFactory>;
  let mockTransitionManager: jest.Mocked<SceneTransitionManager>;

  // System under test
  let sceneManager: SceneManager;

  beforeEach(() => {
    // Set up mock canvas
    mockCanvas = document.createElement('canvas');

    // Set up mock engine
    mockEngine = {
      runRenderLoop: jest.fn(),
      stopRenderLoop: jest.fn(),
      resize: jest.fn(),
      dispose: jest.fn(),
    } as unknown as jest.Mocked<BABYLON.Engine>;

    (BABYLON.Engine as jest.Mock).mockImplementation(() => mockEngine);

    // Set up mock scene
    mockScene = {
      render: jest.fn(),
      dispose: jest.fn(),
      detachControl: jest.fn(),
      metadata: { id: 'scene1' },
    } as unknown as jest.Mocked<BABYLON.Scene>;

    (BABYLON.Scene as jest.Mock).mockImplementation(() => mockScene);

    // Set up mock scene factory
    mockSceneFactory = {
      createScene: jest.fn().mockReturnValue(mockScene),
    } as unknown as jest.Mocked<SceneFactory>;

    // Set up mock transition manager
    mockTransitionManager = {
      transition: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SceneTransitionManager>;

    // Create scene manager with mocks
    sceneManager = new SceneManager();
    (sceneManager as unknown as { sceneFactory: typeof mockSceneFactory }).sceneFactory =
      mockSceneFactory;
    (
      sceneManager as unknown as { transitionManager: typeof mockTransitionManager }
    ).transitionManager = mockTransitionManager;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initialize', () => {
    it('should create a Babylon engine with the provided canvas', () => {
      sceneManager.initialize(mockCanvas);

      expect(BABYLON.Engine).toHaveBeenCalledWith(mockCanvas, expect.anything());
      expect(sceneManager.getEngine()).toBe(mockEngine);
    });

    it('should pass engine options to the Babylon engine constructor', () => {
      const engineOptions = { preserveDrawingBuffer: true, stencil: true };

      sceneManager.initialize(mockCanvas, engineOptions);

      expect(BABYLON.Engine).toHaveBeenCalledWith(mockCanvas, engineOptions);
    });

    it('should create SceneFactory and SceneTransitionManager instances', () => {
      sceneManager.initialize(mockCanvas);

      expect(sceneManager['sceneFactory']).toBeDefined();
      expect(sceneManager['transitionManager']).toBeDefined();
    });

    it('should throw an error if initialize is called twice', () => {
      sceneManager.initialize(mockCanvas);

      expect(() => sceneManager.initialize(mockCanvas)).toThrow(
        'SceneManager is already initialized'
      );
    });
  });

  describe('createScene', () => {
    beforeEach(() => {
      sceneManager.initialize(mockCanvas);
    });

    it('should create a scene using the scene factory', () => {
      const options: SceneCreateOptions = { id: 'testScene' };

      const result = sceneManager.createScene(options);

      expect(mockSceneFactory.createScene).toHaveBeenCalledWith('testScene', options.sceneOptions);
      expect(result).toBe(mockScene);
      expect(sceneManager['scenes'].size).toBe(1);
      expect(sceneManager['scenes'].get('testScene')).toBe(mockScene);
    });

    it('should make the created scene active if makeActive is true', () => {
      const options: SceneCreateOptions = { id: 'testScene', makeActive: true };

      const result = sceneManager.createScene(options);

      expect(mockEngine.runRenderLoop).toHaveBeenCalled();
      expect(sceneManager.getActiveScene()).toBe(result);
    });

    it('should throw an error if a scene with the same ID already exists', () => {
      const options: SceneCreateOptions = { id: 'testScene' };

      sceneManager.createScene(options);

      expect(() => sceneManager.createScene(options)).toThrow(
        'A scene with ID testScene already exists'
      );
    });
  });

  describe('getScene', () => {
    beforeEach(() => {
      sceneManager.initialize(mockCanvas);
    });

    it('should return the scene with the specified ID if it exists', () => {
      const options: SceneCreateOptions = { id: 'testScene' };
      const scene = sceneManager.createScene(options);

      const result = sceneManager.getScene('testScene');

      expect(result).toBe(scene);
    });

    it('should return null if no scene with the specified ID exists', () => {
      const result = sceneManager.getScene('nonexistentScene');

      expect(result).toBeNull();
    });
  });

  describe('getActiveScene', () => {
    beforeEach(() => {
      sceneManager.initialize(mockCanvas);
    });

    it('should return the active scene', () => {
      const options: SceneCreateOptions = { id: 'testScene', makeActive: true };
      const scene = sceneManager.createScene(options);

      const result = sceneManager.getActiveScene();

      expect(result).toBe(scene);
    });

    it('should throw an error if no scene is active', () => {
      expect(() => sceneManager.getActiveScene()).toThrow('No active scene');
    });
  });

  describe('setActiveScene', () => {
    beforeEach(() => {
      sceneManager.initialize(mockCanvas);
    });

    it('should set the specified scene as active when providing a scene object', async () => {
      const options: SceneCreateOptions = { id: 'testScene' };
      const scene = sceneManager.createScene(options);

      await sceneManager.setActiveScene(scene);

      expect(sceneManager.getActiveScene()).toBe(scene);
      expect(mockEngine.runRenderLoop).toHaveBeenCalled();
    });

    it('should set the specified scene as active when providing a scene ID', async () => {
      const options: SceneCreateOptions = { id: 'testScene' };
      const scene = sceneManager.createScene(options);

      await sceneManager.setActiveScene('testScene');

      expect(sceneManager.getActiveScene()).toBe(scene);
      expect(mockEngine.runRenderLoop).toHaveBeenCalled();
    });

    it('should use the transition manager when transitioning between scenes', async () => {
      // Create two scenes
      const scene1 = sceneManager.createScene({ id: 'scene1', makeActive: true });
      const scene2 = sceneManager.createScene({ id: 'scene2' });

      const transitionOptions = { type: SceneTransitionType.FADE, duration: 500 };

      await sceneManager.setActiveScene('scene2', transitionOptions);

      expect(mockTransitionManager.transition).toHaveBeenCalledWith(
        scene1,
        scene2,
        transitionOptions
      );
      expect(sceneManager.getActiveScene()).toBe(scene2);
    });

    it('should throw an error if the specified scene does not exist', async () => {
      await expect(sceneManager.setActiveScene('nonexistentScene')).rejects.toThrow(
        'Scene with ID nonexistentScene does not exist'
      );
    });
  });

  describe('disposeScene', () => {
    beforeEach(() => {
      sceneManager.initialize(mockCanvas);
    });

    it('should dispose the scene with the specified ID', () => {
      const options: SceneCreateOptions = { id: 'testScene' };
      sceneManager.createScene(options);

      sceneManager.disposeScene('testScene');

      expect(mockScene.dispose).toHaveBeenCalled();
      expect(sceneManager['scenes'].has('testScene')).toBe(false);
    });

    it('should dispose the specified scene object', () => {
      const options: SceneCreateOptions = { id: 'testScene' };
      const scene = sceneManager.createScene(options);

      sceneManager.disposeScene(scene);

      expect(mockScene.dispose).toHaveBeenCalled();
      expect(sceneManager['scenes'].has('testScene')).toBe(false);
    });

    it('should throw an error if trying to dispose the active scene', () => {
      const options: SceneCreateOptions = { id: 'testScene', makeActive: true };
      sceneManager.createScene(options);

      expect(() => sceneManager.disposeScene('testScene')).toThrow(
        'Cannot dispose the active scene. Set another scene as active first.'
      );
    });

    it('should throw an error if the specified scene does not exist', () => {
      expect(() => sceneManager.disposeScene('nonexistentScene')).toThrow(
        'Scene with ID nonexistentScene does not exist'
      );
    });
  });

  describe('dispose', () => {
    beforeEach(() => {
      sceneManager.initialize(mockCanvas);
    });

    it('should dispose all scenes and the engine', () => {
      sceneManager.createScene({ id: 'scene1' });
      sceneManager.createScene({ id: 'scene2' });

      sceneManager.dispose();

      expect(mockScene.dispose).toHaveBeenCalledTimes(2);
      expect(mockEngine.dispose).toHaveBeenCalled();
      expect(sceneManager['scenes'].size).toBe(0);
      expect(sceneManager['activeScene']).toBeNull();
    });
  });
});
