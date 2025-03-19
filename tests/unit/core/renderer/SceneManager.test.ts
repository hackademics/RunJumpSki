/**
 * @file tests/unit/core/renderer/SceneManager.test.ts
 * @description Unit tests for the SceneManager class.
 */

import * as BABYLON from 'babylonjs';
import { SceneManager } from '../../../../src/core/renderer/SceneManager';

describe('SceneManager', () => {
  let sceneManager: SceneManager;
  let engine: BABYLON.Engine;

  beforeEach(() => {
    // Use Babylon's NullEngine to simulate the engine without real rendering.
    engine = new BABYLON.NullEngine();
    sceneManager = new SceneManager();
  });

  test('initialize sets active scene', () => {
    sceneManager.initialize(engine);
    const activeScene = sceneManager.getActiveScene();
    expect(activeScene).toBeDefined();
    expect(activeScene.getEngine()).toBe(engine);
  });

  test('getActiveScene should throw error if not initialized', () => {
    expect(() => sceneManager.getActiveScene()).toThrowError('Scene has not been initialized.');
  });

  test('createScene should create and set new active scene', () => {
    sceneManager.initialize(engine);
    const newScene = sceneManager.createScene();
    expect(newScene).toBeDefined();
    expect(sceneManager.getActiveScene()).toBe(newScene);
  });

  test('disposeScene should dispose active scene and reset it', () => {
    sceneManager.initialize(engine);
    const activeScene = sceneManager.getActiveScene();
    const disposeSpy = jest.spyOn(activeScene, 'dispose');
    sceneManager.disposeScene();
    expect(disposeSpy).toHaveBeenCalled();
    expect(() => sceneManager.getActiveScene()).toThrowError('Scene has not been initialized.');
  });
});
