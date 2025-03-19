/**
 * @file src/core/renderer/SceneManager.ts
 * @description Implements the scene manager for creating and managing Babylon.js scenes.
 * 
 * @dependencies babylonjs, ISceneManager
 * @relatedFiles ISceneManager.ts, RenderingSystem.ts
 */
import * as BABYLON from 'babylonjs';
import { ISceneManager } from './ISceneManager';

export class SceneManager implements ISceneManager {
  private engine: BABYLON.Engine | null = null;
  private activeScene: BABYLON.Scene | null = null;

  /**
   * Initializes the SceneManager with a Babylon.js engine.
   * @param engine The Babylon.js engine instance.
   */
  public initialize(engine: BABYLON.Engine): void {
    this.engine = engine;
    this.activeScene = new BABYLON.Scene(engine);
  }

  /**
   * Returns the currently active scene.
   * @returns The active Babylon.js Scene.
   */
  public getActiveScene(): BABYLON.Scene {
    if (!this.activeScene) {
      throw new Error('Scene has not been initialized.');
    }
    return this.activeScene;
  }

  /**
   * Creates a new scene and sets it as the active scene.
   * @returns The newly created scene.
   */
  public createScene(): BABYLON.Scene {
    if (!this.engine) {
      throw new Error('Engine not initialized for SceneManager.');
    }
    const scene = new BABYLON.Scene(this.engine);
    this.activeScene = scene;
    return scene;
  }

  /**
   * Disposes the current active scene.
   */
  public disposeScene(): void {
    if (this.activeScene) {
      this.activeScene.dispose();
      this.activeScene = null;
    }
  }
}
