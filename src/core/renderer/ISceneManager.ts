/**
 * @file src/core/renderer/ISceneManager.ts
 * @description Interface for managing Babylon.js scenes with multi-scene support.
 * 
 * @dependencies babylonjs
 * @relatedFiles SceneManager.ts, RenderingSystem.ts, SceneTransitionManager.ts
 */
import * as BABYLON from 'babylonjs';

/**
 * Options for scene creation
 */
export interface SceneCreationOptions {
  /** Optional name for the scene */
  name?: string;
  /** Whether to set as active scene after creation */
  setAsActive?: boolean;
  /** Whether to optimize the scene for physics */
  enablePhysics?: boolean;
  /** Custom scene setup callback */
  setupCallback?: (scene: BABYLON.Scene) => void;
}

/**
 * Base interface for scene-specific options
 */
export interface BaseSceneOptions {
  /** Optional name for the scene */
  name?: string;
  /** Optional loading screen to display during scene creation */
  loadingScreen?: boolean;
  /** Optional physics engine configuration */
  physics?: {
    /** Gravity vector for the scene */
    gravity?: BABYLON.Vector3;
    /** Type of physics engine to use */
    engineType?: string;
  };
  /** Optional render settings */
  renderSettings?: {
    /** Clear color for the scene */
    clearColor?: BABYLON.Color4;
    /** Whether to enable anti-aliasing */
    antialiasing?: boolean;
    /** Target rendering FPS */
    targetFps?: number;
  };
  /** Custom additional options specific to scene implementations */
  [key: string]: any;
}

/**
 * Available scene transition types
 */
export enum SceneTransitionType {
  NONE = 'none',
  FADE = 'fade',
  SLIDE = 'slide',
  DISSOLVE = 'dissolve',
  ZOOM = 'zoom'
}

/**
 * Options for scene transitions
 */
export interface SceneTransitionOptions {
  /** Type of transition to perform */
  type: SceneTransitionType;
  
  /** Duration of the transition in milliseconds */
  duration?: number;
  
  /** Whether to dispose the previous scene after transition */
  disposePrevious?: boolean;
  
  /** Color to fade to/from for fade transitions */
  fadeToColor?: BABYLON.Color3;
  
  /** Direction for slide transitions: 'left', 'right', 'up', 'down' */
  slideDirection?: 'left' | 'right' | 'up' | 'down';
  
  /** Type of zoom transition: 'zoomIn' or 'zoomOut' */
  zoomType?: 'zoomIn' | 'zoomOut';
}

/**
 * Scene creation options
 */
export interface SceneCreateOptions {
  /** Unique identifier for the scene */
  id: string;
  
  /** Whether to make this the active scene immediately */
  makeActive?: boolean;
  
  /** Scene-specific options to pass to the scene factory */
  sceneOptions?: BaseSceneOptions;
}

export interface ISceneManager {
  /**
   * Initializes the scene manager with a Babylon.js engine.
   * @param engine The Babylon.js engine instance.
   */
  initialize(engine: BABYLON.Engine): void;
  
  /**
   * Returns the currently active scene.
   * @returns The active Babylon.js Scene.
   * @throws Error if no active scene exists
   */
  getActiveScene(): BABYLON.Scene;
  
  /**
   * Creates a new scene with optional settings.
   * @param options Scene creation options
   * @returns The newly created scene.
   */
  createScene(options: SceneCreateOptions): BABYLON.Scene;
  
  /**
   * Get a scene by name or ID.
   * @param nameOrId The name or ID of the scene to retrieve
   * @returns The requested scene or null if not found
   */
  getScene(nameOrId: string): BABYLON.Scene | null;
  
  /**
   * Get all available scenes
   * @returns Array of all scenes
   */
  getAllScenes(): BABYLON.Scene[];
  
  /**
   * Set a scene as the active scene
   * @param nameOrId The name or ID of the scene to set as active
   * @param transitionOptions Optional transition settings
   * @returns Promise resolving when transition completes
   */
  setActiveScene(nameOrId: string, transitionOptions?: SceneTransitionOptions): Promise<void>;
  
  /**
   * Transitions between two scenes with animation
   * @param from Source scene
   * @param to Target scene
   * @param options Transition options
   * @returns Promise resolving when transition completes
   */
  transitionBetweenScenes(from: BABYLON.Scene, to: BABYLON.Scene, options: SceneTransitionOptions): Promise<void>;
  
  /**
   * Disposes the specified scene.
   * @param nameOrId The name or ID of the scene to dispose, or current active scene if undefined
   */
  disposeScene(nameOrId?: string): void;
  
  /**
   * Disposes all scenes and resources
   */
  disposeAll(): void;
}
