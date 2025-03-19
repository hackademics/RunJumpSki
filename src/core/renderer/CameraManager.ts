/**
 * @file src/core/renderer/CameraManager.ts
 * @description Implements the camera manager responsible for handling cameras within a Babylon.js scene.
 * 
 * @dependencies babylonjs, ICameraManager
 * @relatedFiles ICameraManager.ts, RenderingSystem.ts
 */
import * as BABYLON from 'babylonjs';
import { ICameraManager } from './ICameraManager';

export class CameraManager implements ICameraManager {
  private activeCamera: BABYLON.Camera | null = null;

  /**
   * Initializes the CameraManager by creating a default camera.
   * @param scene The Babylon.js scene where the camera will be added.
   */
  public initialize(scene: BABYLON.Scene): void {
    if (!scene) {
      throw new Error('Scene is required to initialize the camera.');
    }
    this.activeCamera = new BABYLON.ArcRotateCamera(
      'defaultCamera',
      Math.PI / 2,
      Math.PI / 4,
      10,
      new BABYLON.Vector3(0, 0, 0),
      scene
    );
    this.activeCamera.attachControl(scene.getEngine().getRenderingCanvas(), true);
  }

  /**
   * Updates the active camera.
   */
  public update(): void {
    // Implement any dynamic camera update logic if required.
  }

  /**
   * Returns the active Babylon.js camera.
   * @returns The active camera or null if not set.
   */
  public getActiveCamera(): BABYLON.Camera | null {
    return this.activeCamera;
  }
}
