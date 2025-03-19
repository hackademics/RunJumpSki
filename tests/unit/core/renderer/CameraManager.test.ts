/**
 * @file tests/unit/core/renderer/CameraManager.test.ts
 * @description Unit tests for the CameraManager class.
 */

import * as BABYLON from 'babylonjs';
import { CameraManager } from '../../../../src/core/renderer/CameraManager';

describe('CameraManager', () => {
  let cameraManager: CameraManager;
  let scene: BABYLON.Scene;
  let engine: BABYLON.Engine;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    cameraManager = new CameraManager();
  });

  test('initialize should create a default camera and attach control', () => {
    // Create a dummy canvas for camera attachment.
    const canvas = document.createElement('canvas');
    scene.getEngine().getRenderingCanvas = jest.fn(() => canvas);
    cameraManager.initialize(scene);
    const activeCamera = cameraManager.getActiveCamera();
    expect(activeCamera).toBeDefined();
    // Check that the active camera is an instance of ArcRotateCamera.
    expect(activeCamera?.getClassName()).toBe('ArcRotateCamera');
  });

  test('update should be callable without errors', () => {
    cameraManager.initialize(scene);
    expect(() => cameraManager.update()).not.toThrow();
  });

  test('getActiveCamera returns null if camera is not initialized', () => {
    expect(cameraManager.getActiveCamera()).toBeNull();
  });
});
