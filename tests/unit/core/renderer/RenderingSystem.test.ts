/**
 * @file tests/unit/core/renderer/RenderingSystem.test.ts
 * @description Unit tests for the RenderingSystem class.
 */

import * as BABYLON from 'babylonjs';
import { RenderingSystem } from '../../../../src/core/renderer/RenderingSystem';
import { ISceneManager } from '../../../../src/core/renderer/ISceneManager';
import { ICameraManager } from '../../../../src/core/renderer/ICameraManager';

describe('RenderingSystem', () => {
  let canvas: HTMLCanvasElement;
  let mockSceneManager: ISceneManager;
  let mockCameraManager: ICameraManager;
  let renderingSystem: RenderingSystem;
  let dummyScene: BABYLON.Scene;

  beforeEach(() => {
    // Create a dummy canvas element and add it to the DOM
    canvas = document.createElement('canvas');
    canvas.id = 'testCanvas';
    document.body.appendChild(canvas);

    // Create a dummy scene using a Babylon NullEngine to avoid real rendering.
    dummyScene = new BABYLON.Scene(new BABYLON.NullEngine());

    // Create simple mocks for sceneManager and cameraManager.
    mockSceneManager = {
      initialize: jest.fn((engine: BABYLON.Engine) => {
        // Instead of creating a new scene, assign our dummyScene.
        (mockSceneManager as any).activeScene = dummyScene;
      }),
      getActiveScene: jest.fn(() => dummyScene),
      createScene: jest.fn(() => dummyScene),
      disposeScene: jest.fn()
    };

    mockCameraManager = {
      initialize: jest.fn(),
      update: jest.fn(),
      getActiveCamera: jest.fn(() => null)
    };

    // Instantiate RenderingSystem with the dummy canvas and mocks.
    renderingSystem = new RenderingSystem('testCanvas', mockSceneManager, mockCameraManager);
  });

  afterEach(() => {
    document.body.removeChild(canvas);
  });

  test('should throw error if canvas element is not found', () => {
    document.body.removeChild(canvas);
    expect(() => new RenderingSystem('nonExistentCanvas', mockSceneManager, mockCameraManager))
      .toThrowError("Canvas element with id 'nonExistentCanvas' not found.");
  });

  test('initialize should call sceneManager.initialize and cameraManager.initialize', () => {
    renderingSystem.initialize();
    expect(mockSceneManager.initialize).toHaveBeenCalled();
    expect(mockSceneManager.getActiveScene).toHaveBeenCalled();
    expect(mockCameraManager.initialize).toHaveBeenCalledWith(dummyScene);
  });

  test('start should call engine.runRenderLoop and invoke update and render', () => {
    // Spy on engine.runRenderLoop, and simulate callback invocation.
    const engine = (renderingSystem as any).engine as BABYLON.Engine;
    const runRenderLoopSpy = jest.spyOn(engine, 'runRenderLoop').mockImplementation((callback: () => void) => {
      callback();
    });

    // Also spy on dummyScene.render to verify it gets called.
    const renderSpy = jest.spyOn(dummyScene, 'render');

    renderingSystem.start();

    expect(runRenderLoopSpy).toHaveBeenCalled();
    expect(mockCameraManager.update).toHaveBeenCalled();
    expect(renderSpy).toHaveBeenCalled();
  });

  test('stop should call engine.stopRenderLoop and engine.dispose', () => {
    const engine = (renderingSystem as any).engine as BABYLON.Engine;
    const stopRenderLoopSpy = jest.spyOn(engine, 'stopRenderLoop').mockImplementation(() => {});
    const disposeSpy = jest.spyOn(engine, 'dispose').mockImplementation(() => {});

    renderingSystem.stop();

    expect(stopRenderLoopSpy).toHaveBeenCalled();
    expect(disposeSpy).toHaveBeenCalled();
  });
});
