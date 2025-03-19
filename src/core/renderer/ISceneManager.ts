/**
 * @file src/core/renderer/ISceneManager.ts
 * @description Interface for managing Babylon.js scenes.
 * 
 * @dependencies babylonjs
 * @relatedFiles SceneManager.ts, RenderingSystem.ts
 */
import * as BABYLON from 'babylonjs';

export interface ISceneManager {
  /**
   * Initializes the scene manager with a Babylon.js engine.
   * @param engine The Babylon.js engine instance.
   */
  initialize(engine: BABYLON.Engine): void;
  
  /**
   * Returns the currently active scene.
   * @returns The active Babylon.js Scene.
   */
  getActiveScene(): BABYLON.Scene;
  
  /**
   * Creates a new scene and sets it as active.
   * @returns The newly created scene.
   */
  createScene(): BABYLON.Scene;
  
  /**
   * Disposes of the current active scene.
   */
  disposeScene(): void;
}
