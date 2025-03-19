/**
 * @file src/core/renderer/RenderingSystem.ts
 * @description Implements the core rendering system responsible for managing the Babylon.js engine, render loop, and coordinating with SceneManager and CameraManager.
 * 
 * @dependencies babylonjs, IRenderingSystem, ISceneManager, ICameraManager
 * @relatedFiles IRenderingSystem.ts, SceneManager.ts, CameraManager.ts
 */
import * as BABYLON from 'babylonjs';
import { IRenderingSystem } from './IRenderingSystem';
import { ISceneManager } from './ISceneManager';
import { ICameraManager } from './ICameraManager';

export class RenderingSystem implements IRenderingSystem {
  private engine: BABYLON.Engine;
  private canvas: HTMLCanvasElement;
  private sceneManager: ISceneManager;
  private cameraManager: ICameraManager;

  /**
   * Creates an instance of RenderingSystem.
   * @param canvasId The ID of the canvas element to render to.
   * @param sceneManager Instance of ISceneManager to manage scenes.
   * @param cameraManager Instance of ICameraManager to manage cameras.
   */
  constructor(canvasId: string, sceneManager: ISceneManager, cameraManager: ICameraManager) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found.`);
    }
    this.canvas = canvas;
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.sceneManager = sceneManager;
    this.cameraManager = cameraManager;
  }

  /**
   * Initializes the rendering system by setting up the scene and camera.
   */
  public initialize(): void {
    this.sceneManager.initialize(this.engine);
    this.cameraManager.initialize(this.sceneManager.getActiveScene());
  }

  /**
   * Starts the render loop.
   */
  public start(): void {
    const scene = this.sceneManager.getActiveScene();
    if (!scene) {
      throw new Error('No active scene available to render.');
    }
    this.engine.runRenderLoop(() => {
      try {
        this.cameraManager.update();
        scene.render();
      } catch (error) {
        console.error('Error during render loop:', error);
      }
    });
  }

  /**
   * Stops the render loop and disposes engine resources.
   */
  public stop(): void {
    this.engine.stopRenderLoop();
    this.engine.dispose();
  }
}
