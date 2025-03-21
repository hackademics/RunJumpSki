/**
 * @file src/core/renderer/SceneManager.ts
 * @description Implements the scene manager for creating and managing multiple Babylon.js scenes.
 *
 * @dependencies babylonjs, ISceneManager, SceneTransitionManager, SceneFactory
 * @relatedFiles ISceneManager.ts, RenderingSystem.ts, SceneTransitionManager.ts, SceneFactory.ts
 */
import * as BABYLON from 'babylonjs';
import {
  ISceneManager,
  SceneCreationOptions,
  SceneCreateOptions,
  SceneTransitionOptions,
  SceneTransitionType,
} from './ISceneManager';
import { SceneType, SceneFactory } from './SceneFactory';
import { SceneTransitionManager } from './SceneTransitionManager';
import { ResourceTracker, ResourceType } from '../utils/ResourceTracker';
import { Logger } from '../utils/Logger';
import { ServiceLocator } from '../base/ServiceLocator';

export class SceneManager implements ISceneManager {
  private engine: BABYLON.Engine | null = null;
  private activeScene: BABYLON.Scene | null = null;
  private scenes: Map<string, BABYLON.Scene> = new Map();
  private sceneFactory: SceneFactory | null = null;
  private transitionManager: SceneTransitionManager | null = null;
  private resourceTracker: ResourceTracker;
  private logger: Logger;

  /**
   * Initializes the SceneManager.
   * @param resourceTracker Optional ResourceTracker instance to use for resource management
   */
  constructor(resourceTracker?: ResourceTracker) {
    // Use provided resource tracker or create a new one
    this.resourceTracker = resourceTracker || new ResourceTracker();
    
    // Initialize logger with default instance
    this.logger = new Logger('SceneManager');
    
    // Try to get the logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        // Add context tag
        this.logger.addTag('SceneManager');
      }
    } catch (e) {
      this.logger.warn(`Failed to get logger from ServiceLocator: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
    
    this.logger.debug('SceneManager constructed');
  }

  /**
   * Initializes the SceneManager with a Babylon.js engine.
   * @param engine The Babylon.js engine instance.
   */
  public initialize(engine: BABYLON.Engine): void {
    this.engine = engine;
    this.sceneFactory = new SceneFactory(engine);
    this.transitionManager = new SceneTransitionManager(engine);

    // Create a default scene
    this.activeScene = this.createScene({
      id: 'default',
      makeActive: true,
    });
  }

  /**
   * Returns the currently active scene.
   * @returns The active Babylon.js Scene.
   * @throws Error if no active scene exists
   */
  public getActiveScene(): BABYLON.Scene {
    if (!this.activeScene) {
      throw new Error('Scene has not been initialized.');
    }
    return this.activeScene;
  }

  /**
   * Creates a new scene with optional settings.
   * @param options Scene creation options
   * @returns The newly created scene.
   */
  public createScene(options: SceneCreateOptions): BABYLON.Scene {
    if (!this.engine) {
      throw new Error('Engine not initialized for SceneManager.');
    }

    // Use scene factory if possible, otherwise create basic scene
    let scene: BABYLON.Scene;
    
    // Map SceneCreateOptions to the internal SceneCreationOptionsAlias format
    const internalOptions: SceneCreationOptions = {
      name: options.id,
      setAsActive: options.makeActive,
      // Map any other properties if needed
      ...(options.sceneOptions || {})
    };
    
    if (this.sceneFactory && internalOptions.name) {
      // Determine scene type from name if possible
      const sceneTypeMap: Record<string, SceneType> = {
        mainMenu: SceneType.MENU,
        gameLevel: SceneType.GAME,
        loading: SceneType.LOADING,
        pauseMenu: SceneType.MENU,
        controls: SceneType.MENU,
        gameOver: SceneType.MENU,
        levelSelect: SceneType.MENU,
      };

      const sceneType = sceneTypeMap[internalOptions.name] || SceneType.GAME;
      scene = this.sceneFactory.createScene(internalOptions.name, { type: sceneType });
    } else {
      scene = new BABYLON.Scene(this.engine);
    }

    // Register in our scene map with a name
    const sceneName = internalOptions.name || `scene_${Date.now()}`;
    scene.metadata = { ...scene.metadata, name: sceneName };
    this.scenes.set(sceneName, scene);

    // Track the scene with ResourceTracker
    this.resourceTracker.track(scene, {
      type: ResourceType.OTHER, // Scenes don't have their own ResourceType
      id: sceneName,
      metadata: {
        sceneName,
        createdAt: Date.now(),
      }
    });

    // Set as active if requested
    if (internalOptions.setAsActive) {
      this.activeScene = scene;

      // Run render loop for this scene
      this.engine.runRenderLoop(() => {
        scene.render();
      });
    }

    // Call any provided setup callback
    if (internalOptions.setupCallback) {
      internalOptions.setupCallback(scene);
    }

    // Setup physics if requested
    if (internalOptions.enablePhysics) {
      const gravityVector = new BABYLON.Vector3(0, -9.81, 0);
      scene.enablePhysics(gravityVector, new BABYLON.CannonJSPlugin());
    }

    // Log scene creation
    this.logDebug(`Created scene "${sceneName}"`);

    return scene;
  }

  /**
   * Get a scene by name or ID.
   * @param nameOrId The name or ID of the scene to retrieve
   * @returns The requested scene or null if not found
   */
  public getScene(nameOrId: string): BABYLON.Scene | null {
    return this.scenes.get(nameOrId) || null;
  }

  /**
   * Get all available scenes
   * @returns Array of all scenes
   */
  public getAllScenes(): BABYLON.Scene[] {
    return Array.from(this.scenes.values());
  }

  /**
   * Set a scene as the active scene
   * @param nameOrId The name or ID of the scene to set as active
   * @param transitionOptions Optional transition settings
   * @returns Promise resolving when transition completes
   */
  public async setActiveScene(
    nameOrId: string,
    transitionOptions?: SceneTransitionOptions
  ): Promise<void> {
    const targetScene = this.getScene(nameOrId);
    if (!targetScene) {
      throw new Error(`Scene "${nameOrId}" not found.`);
    }

    // If same scene, do nothing
    if (targetScene === this.activeScene) {
      return Promise.resolve();
    }

    // If no transition specified or no transition manager, just switch
    if (!transitionOptions || !this.transitionManager) {
      if (this.engine) {
        this.engine.stopRenderLoop();
        this.activeScene = targetScene;
        this.engine.runRenderLoop(() => {
          targetScene.render();
        });
      }
      return Promise.resolve();
    }

    // Perform transition if we have both scenes
    if (this.activeScene && targetScene) {
      await this.transitionBetweenScenes(this.activeScene, targetScene, transitionOptions);
      this.activeScene = targetScene;
    } else {
      // Fallback if no active scene yet
      if (this.engine) {
        this.engine.stopRenderLoop();
        this.activeScene = targetScene;
        this.engine.runRenderLoop(() => {
          targetScene.render();
        });
      }
    }

    return Promise.resolve();
  }

  /**
   * Transitions between two scenes with animation
   * @param from Source scene
   * @param to Target scene
   * @param options Transition options
   * @returns Promise resolving when transition completes
   */
  public async transitionBetweenScenes(
    from: BABYLON.Scene,
    to: BABYLON.Scene,
    options: SceneTransitionOptions
  ): Promise<void> {
    if (!this.transitionManager) {
      throw new Error('TransitionManager not initialized.');
    }

    const defaultOptions: SceneTransitionOptions = {
      type: SceneTransitionType.FADE,
      duration: 1000,
      disposePrevious: false,
    };

    const mergedOptions = { ...defaultOptions, ...options };

    return this.transitionManager.transition(from, to, mergedOptions);
  }

  /**
   * Disposes the specified scene.
   * @param nameOrId The name or ID of the scene to dispose, or current active scene if undefined
   */
  public disposeScene(nameOrId?: string): void {
    // Determine which scene to dispose
    let sceneToDispose: BABYLON.Scene | null = null;

    if (nameOrId) {
      sceneToDispose = this.getScene(nameOrId);
      if (!sceneToDispose) {
        throw new Error(`Scene "${nameOrId}" not found.`);
      }
    } else if (this.activeScene) {
      sceneToDispose = this.activeScene;
    }

    if (!sceneToDispose) {
      return;
    }

    // Get the scene name for resource tracking
    const sceneName = sceneToDispose.metadata?.name;

    // Remove from render loop if it's the active scene
    if (sceneToDispose === this.activeScene && this.engine) {
      this.engine.stopRenderLoop();
      this.activeScene = null;
    }

    // Dispose resources associated with this scene
    if (sceneName) {
      // Dispose all resources associated with this scene
      this.resourceTracker.disposeByScene(sceneName);
      
      // Remove from scene map
      this.scenes.delete(sceneName);
      
      // Log disposal
      this.logDebug(`Disposed scene "${sceneName}"`);
    }

    // Dispose the scene itself
    sceneToDispose.dispose();
  }

  /**
   * Disposes all scenes and resources
   */
  public disposeAll(): void {
    if (this.engine) {
      this.engine.stopRenderLoop();
    }

    // Log the disposal of all scenes
    this.logDebug(`Disposing all scenes (${this.scenes.size} total)`);

    // Dispose all resources first
    this.resourceTracker.disposeAll();

    // Dispose all scenes
    this.scenes.forEach(scene => {
      scene.dispose();
    });

    // Clear collections
    this.scenes.clear();
    this.activeScene = null;
  }
  
  /**
   * Track a resource associated with a scene
   * @param resource The resource to track
   * @param type The type of resource
   * @param sceneName The name of the scene this resource belongs to
   * @param id Optional custom identifier for the resource
   * @returns The resource ID
   */
  public trackResource(resource: any, type: ResourceType, sceneName: string, id?: string): string {
    return this.resourceTracker.track(resource, {
      type,
      id,
      sceneId: sceneName,
      metadata: {
        sceneName,
        trackedBy: 'SceneManager'
      }
    });
  }
  
  /**
   * Log a debug message
   * @param message The message to log
   */
  private logDebug(message: string): void {
    this.logger.debug(message);
  }
  
  /**
   * Log a warning message
   * @param message The message to log
   */
  private logWarning(message: string): void {
    this.logger.warn(message);
  }
  
  /**
   * Log an error message
   * @param message The message to log
   */
  private logError(message: string): void {
    this.logger.error(message);
  }
}
