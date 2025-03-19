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
  SceneTransitionOptions,
  SceneTransitionType,
} from './ISceneManager';
import { SceneTransitionManager } from './SceneTransitionManager';
import { SceneFactory, SceneType } from './SceneFactory';

export class SceneManager implements ISceneManager {
  private engine: BABYLON.Engine | null = null;
  private activeScene: BABYLON.Scene | null = null;
  private scenes: Map<string, BABYLON.Scene> = new Map();
  private transitionManager: SceneTransitionManager | null = null;
  private sceneFactory: SceneFactory | null = null;

  /**
   * Initializes the SceneManager with a Babylon.js engine.
   * @param engine The Babylon.js engine instance.
   */
  public initialize(engine: BABYLON.Engine): void {
    this.engine = engine;
    this.transitionManager = new SceneTransitionManager(engine);
    this.sceneFactory = new SceneFactory(engine);

    // Create a default scene
    this.activeScene = this.createScene({
      name: 'default',
      setAsActive: true,
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
  public createScene(options: SceneCreationOptions = {}): BABYLON.Scene {
    if (!this.engine) {
      throw new Error('Engine not initialized for SceneManager.');
    }

    // Use scene factory if possible, otherwise create basic scene
    let scene: BABYLON.Scene;
    if (this.sceneFactory && options.name) {
      // Determine scene type from name if possible
      const sceneTypeMap: Record<string, SceneType> = {
        mainMenu: SceneType.MAIN_MENU,
        gameLevel: SceneType.GAME_LEVEL,
        loading: SceneType.LOADING,
        pauseMenu: SceneType.PAUSE_MENU,
        controls: SceneType.CONTROLS,
        gameOver: SceneType.GAME_OVER,
        levelSelect: SceneType.LEVEL_SELECT,
      };

      const sceneType = sceneTypeMap[options.name] || SceneType.GAME_LEVEL;
      scene = this.sceneFactory.createScene(sceneType, options);
    } else {
      scene = new BABYLON.Scene(this.engine);
    }

    // Register in our scene map with a name
    const sceneName = options.name || `scene_${Date.now()}`;
    scene.metadata = { ...scene.metadata, name: sceneName };
    this.scenes.set(sceneName, scene);

    // Set as active if requested
    if (options.setAsActive) {
      this.activeScene = scene;

      // Run render loop for this scene
      this.engine.runRenderLoop(() => {
        scene.render();
      });
    }

    // Execute setup callback if provided
    if (options.setupCallback) {
      options.setupCallback(scene);
    }

    // Enable physics if requested
    if (options.enablePhysics) {
      scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.CannonJSPlugin());
    }

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

    // Remove from render loop if it's the active scene
    if (sceneToDispose === this.activeScene && this.engine) {
      this.engine.stopRenderLoop();
      this.activeScene = null;
    }

    // Remove from scene map
    const sceneName = sceneToDispose.metadata?.name;
    if (sceneName) {
      this.scenes.delete(sceneName);
    }

    // Dispose the scene
    sceneToDispose.dispose();
  }

  /**
   * Disposes all scenes and resources
   */
  public disposeAll(): void {
    if (this.engine) {
      this.engine.stopRenderLoop();
    }

    // Dispose all scenes
    this.scenes.forEach(scene => {
      scene.dispose();
    });

    // Clear collections
    this.scenes.clear();
    this.activeScene = null;
  }
}
