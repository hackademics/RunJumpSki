/**
 * @file src/core/renderer/IRenderingSystem.ts
 * @description Interface for the RenderingSystem responsible for managing the Babylon.js engine, render loop, and coordinating with scene and camera managers.
 * 
 * @dependencies babylonjs, ISceneManager, ICameraManager
 * @relatedFiles RenderingSystem.ts, ISceneManager.ts, ICameraManager.ts
 */
export interface IRenderingSystem {
    /**
     * Initializes the rendering system, setting up the scene and camera.
     */
    initialize(): void;
    
    /**
     * Starts the render loop.
     */
    start(): void;
    
    /**
     * Stops the render loop and disposes engine resources.
     */
    stop(): void;
  }
  