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
import { ResourceTracker, ResourceType } from '../utils/ResourceTracker';
import { EventListenerManager, EventTargetType } from '../utils/EventListenerManager';
import { Logger } from '../utils/Logger';
import { ServiceLocator } from '../base/ServiceLocator';

export class RenderingSystem implements IRenderingSystem {
  private engine: BABYLON.Engine;
  private canvas: HTMLCanvasElement;
  private sceneManager: ISceneManager;
  private cameraManager: ICameraManager;
  private resourceTracker: ResourceTracker;
  private eventListenerManager: EventListenerManager;
  private logger: Logger;
  private resizeListener: () => void;
  private isRunning: boolean = false;

  /**
   * Creates an instance of RenderingSystem.
   * @param canvasId The ID of the canvas element to render to.
   * @param sceneManager Instance of ISceneManager to manage scenes.
   * @param cameraManager Instance of ICameraManager to manage cameras.
   * @param resourceTracker Optional ResourceTracker instance
   * @param eventListenerManager Optional EventListenerManager instance
   */
  constructor(
    canvasId: string, 
    sceneManager: ISceneManager, 
    cameraManager: ICameraManager,
    resourceTracker?: ResourceTracker,
    eventListenerManager?: EventListenerManager
  ) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found.`);
    }
    this.canvas = canvas;
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.sceneManager = sceneManager;
    this.cameraManager = cameraManager;
    
    // Set up resource tracking
    this.resourceTracker = resourceTracker || new ResourceTracker();
    this.resourceTracker.track(this.engine, {
      type: ResourceType.OTHER,
      id: 'mainEngine',
      metadata: {
        createdBy: 'RenderingSystem',
        createdAt: Date.now(),
        resourceType: 'engine'
      }
    });
    
    // Set up event listener management
    this.eventListenerManager = eventListenerManager || new EventListenerManager();
    
    // Try to get the logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      this.logger = serviceLocator.has('logger') 
        ? serviceLocator.get<Logger>('logger') 
        : new Logger('RenderingSystem');
    } catch (e) {
      this.logger = new Logger('RenderingSystem');
      console.warn('ServiceLocator not available for RenderingSystem, using default logger');
    }
    
    // Create window resize handler but don't attach it yet
    this.resizeListener = () => {
      this.engine.resize();
      this.logger.debug('Canvas resized');
    };
    
    this.logger.debug('RenderingSystem created');
  }

  /**
   * Initializes the rendering system by setting up the scene and camera.
   */
  public initialize(): void {
    this.logger.debug('Initializing RenderingSystem');
    
    // Initialize managers
    this.sceneManager.initialize(this.engine);
    this.cameraManager.initialize(this.sceneManager.getActiveScene());
    
    // Register window resize event
    this.eventListenerManager.addDOMListener(
      window,
      'resize',
      this.resizeListener,
      undefined,
      'renderingSystem'
    );
    
    this.logger.debug('RenderingSystem initialized');
  }

  /**
   * Starts the render loop.
   */
  public start(): void {
    const scene = this.sceneManager.getActiveScene();
    if (!scene) {
      throw new Error('No active scene available to render.');
    }
    
    if (this.isRunning) {
      this.logger.warn('Render loop is already running');
      return;
    }
    
    this.logger.debug('Starting render loop');
    
    // Track time for delta calculation
    let lastFrameTime = performance.now();
    
    this.engine.runRenderLoop(() => {
      try {
        // Calculate delta time in seconds
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastFrameTime) / 1000;
        lastFrameTime = currentTime;
        
        // Update camera with delta time
        this.cameraManager.update(deltaTime);
        scene.render();
      } catch (error) {
        this.logger.error(`Error during render loop: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
    
    this.isRunning = true;
  }

  /**
   * Stops the render loop.
   */
  public stop(): void {
    if (!this.isRunning) {
      this.logger.warn('Render loop is not running');
      return;
    }
    
    this.logger.debug('Stopping render loop');
    this.engine.stopRenderLoop();
    this.isRunning = false;
  }
  
  /**
   * Disposes engine resources and cleans up event listeners.
   */
  public dispose(): void {
    this.logger.debug('Disposing RenderingSystem');
    
    // Stop rendering if still running
    if (this.isRunning) {
      this.stop();
    }
    
    // Clean up event listeners
    this.eventListenerManager.removeAllListeners();
    
    // Dispose engine resources
    this.engine.dispose();
    
    this.logger.debug('RenderingSystem disposed');
  }
}
