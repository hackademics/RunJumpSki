/**
 * @file src/core/renderer/ICameraManager.ts
 * @description Interface for managing cameras within a Babylon.js scene.
 * 
 * @dependencies babylonjs
 * @relatedFiles CameraManager.ts, RenderingSystem.ts
 */
import * as BABYLON from 'babylonjs';

export interface ICameraManager {
  /**
   * Initializes the camera manager by creating and attaching a default camera.
   * @param scene The Babylon.js scene for camera attachment.
   */
  initialize(scene: BABYLON.Scene): void;
  
  /**
   * Updates the active camera (e.g., for dynamic behaviors).
   */
  update(): void;
  
  /**
   * Retrieves the active Babylon.js camera.
   * @returns The active camera or null if none exists.
   */
  getActiveCamera(): BABYLON.Camera | null;
}
