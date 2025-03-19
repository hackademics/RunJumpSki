/**
 * @file src/core/renderer/SceneFactory.ts
 * @description Factory for creating and configuring different types of scenes
 * 
 * @dependencies babylonjs, babylonjs-gui, babylonjs-materials
 * @relatedFiles SceneManager.ts
 */

import * as BABYLON from 'babylonjs';
import * as GUI from 'babylonjs-gui';
import { GridMaterial } from 'babylonjs-materials';

/**
 * Scene type identifier
 */
export enum SceneType {
  DEFAULT = 'default',
  GAME = 'game',
  MENU = 'menu',
  LOADING = 'loading',
  EDITOR = 'editor'
}

/**
 * Base options for all scene types
 */
export interface BaseSceneOptions {
  /** Scene type */
  type?: SceneType;
  /** Whether to create a default camera */
  createDefaultCamera?: boolean;
  /** Whether to create default lighting */
  createDefaultLighting?: boolean;
  /** Background color */
  clearColor?: BABYLON.Color4;
}

/**
 * Options specific to game scenes
 */
export interface GameSceneOptions extends BaseSceneOptions {
  /** Level to load */
  levelName?: string;
  /** Whether to enable physics */
  enablePhysics?: boolean;
  /** Whether to enable debug layers */
  enableDebug?: boolean;
}

/**
 * Options specific to menu scenes
 */
export interface MenuSceneOptions extends BaseSceneOptions {
  /** Menu template to use */
  menuTemplate?: string;
  /** Whether to show background scene */
  showBackground?: boolean;
}

/**
 * Options specific to loading scenes
 */
export interface LoadingSceneOptions extends BaseSceneOptions {
  /** Loading screen text */
  loadingText?: string;
  /** Progress callback */
  onProgress?: (progress: number) => void;
}

/**
 * Options specific to editor scenes
 */
export interface EditorSceneOptions extends BaseSceneOptions {
  /** Whether to enable grid */
  showGrid?: boolean;
  /** Whether to show axis gizmo */
  showAxisGizmo?: boolean;
}

/**
 * Union type of all scene options
 */
export type SceneOptions = 
  BaseSceneOptions | 
  GameSceneOptions | 
  MenuSceneOptions |
  LoadingSceneOptions |
  EditorSceneOptions;

/**
 * Factory responsible for creating scenes of different types
 */
export class SceneFactory {
  private engine: BABYLON.Engine;
  
  /**
   * Creates a new SceneFactory
   * @param engine BabylonJS engine instance
   */
  constructor(engine: BABYLON.Engine) {
    this.engine = engine;
  }
  
  /**
   * Creates a scene with the specified options
   * @param id Unique identifier for the scene
   * @param options Options for scene creation
   * @returns The created scene
   */
  public createScene(id: string, options?: SceneOptions): BABYLON.Scene {
    const scene = new BABYLON.Scene(this.engine);
    scene.metadata = { id };
    
    // Set defaults
    const sceneOptions: BaseSceneOptions = options || {
      type: SceneType.DEFAULT,
      createDefaultCamera: true,
      createDefaultLighting: true,
      clearColor: new BABYLON.Color4(0, 0, 0, 1)
    };
    
    // Apply common settings
    if (sceneOptions.clearColor) {
      scene.clearColor = sceneOptions.clearColor;
    }
    
    // Apply type-specific settings
    if (options && 'type' in options) {
      switch (options.type) {
        case SceneType.GAME:
          this.setupGameScene(scene, options as GameSceneOptions);
          break;
        case SceneType.MENU:
          this.setupMenuScene(scene, options as MenuSceneOptions);
          break;
        case SceneType.LOADING:
          this.setupLoadingScene(scene, options as LoadingSceneOptions);
          break;
        case SceneType.EDITOR:
          this.setupEditorScene(scene, options as EditorSceneOptions);
          break;
        case SceneType.DEFAULT:
        default:
          this.setupDefaultScene(scene, sceneOptions);
          break;
      }
    } else {
      this.setupDefaultScene(scene, sceneOptions);
    }
    
    return scene;
  }
  
  /**
   * Sets up a default scene with basic camera and lighting
   * @param scene Scene to set up
   * @param options Scene options
   */
  private setupDefaultScene(scene: BABYLON.Scene, options: BaseSceneOptions): void {
    if (options.createDefaultCamera) {
      const camera = new BABYLON.ArcRotateCamera(
        'defaultCamera',
        Math.PI / 2,
        Math.PI / 3,
        10,
        BABYLON.Vector3.Zero(),
        scene
      );
      camera.attachControl();
    }
    
    if (options.createDefaultLighting) {
      const light1 = new BABYLON.HemisphericLight(
        'defaultLight',
        new BABYLON.Vector3(0, 1, 0),
        scene
      );
      light1.intensity = 0.7;
      
      const light2 = new BABYLON.DirectionalLight(
        'directionalLight',
        new BABYLON.Vector3(0.5, -1, 1),
        scene
      );
      light2.intensity = 0.5;
    }
  }
  
  /**
   * Sets up a game scene with physics and game-specific settings
   * @param scene Scene to set up
   * @param options Game scene options
   */
  private setupGameScene(scene: BABYLON.Scene, options: GameSceneOptions): void {
    // First set up as default scene
    this.setupDefaultScene(scene, options);
    
    // Enable physics if requested
    if (options.enablePhysics) {
      scene.enablePhysics(
        new BABYLON.Vector3(0, -9.81, 0),
        new BABYLON.CannonJSPlugin()
      );
    }
    
    // Enable debug layer if requested
    if (options.enableDebug) {
      scene.debugLayer.show({
        embedMode: true,
        overlay: true
      });
    }
    
    // Load level if specified
    if (options.levelName) {
      console.log(`Loading level: ${options.levelName} (not implemented)`);
      // This would typically load level data and create game entities
    }
  }
  
  /**
   * Sets up a menu scene with UI elements
   * @param scene Scene to set up
   * @param options Menu scene options
   */
  private setupMenuScene(scene: BABYLON.Scene, options: MenuSceneOptions): void {
    // Only create camera for menu scene, not lighting
    const menuOptions: BaseSceneOptions = {
      ...options,
      createDefaultLighting: false
    };
    this.setupDefaultScene(scene, menuOptions);
    
    // Create a simple UI for the menu
    const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);
    
    // Create a background if requested
    if (options.showBackground) {
      // Create a simple skybox or background
      const skybox = BABYLON.MeshBuilder.CreateBox('skyBox', { size: 1000.0 }, scene);
      const skyboxMaterial = new BABYLON.StandardMaterial('skyBoxMaterial', scene);
      skyboxMaterial.backFaceCulling = false;
      skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture('textures/skybox', scene);
      skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
      skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
      skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
      skybox.material = skyboxMaterial;
    }
    
    // Apply menu template if specified
    if (options.menuTemplate) {
      console.log(`Applying menu template: ${options.menuTemplate} (not implemented)`);
      // This would set up the menu UI based on a template
    } else {
      // Create a simple default menu
      const title = new GUI.TextBlock();
      title.text = "Menu";
      title.color = "white";
      title.fontSize = 36;
      title.top = "-100px";
      advancedTexture.addControl(title);
      
      const button = GUI.Button.CreateSimpleButton("startButton", "Start Game");
      button.width = "200px";
      button.height = "50px";
      button.color = "white";
      button.background = "green";
      advancedTexture.addControl(button);
    }
  }
  
  /**
   * Sets up a loading scene with progress display
   * @param scene Scene to set up
   * @param options Loading scene options
   */
  private setupLoadingScene(scene: BABYLON.Scene, options: LoadingSceneOptions): void {
    // Very minimal setup for loading scene
    const loadingOptions: BaseSceneOptions = {
      ...options,
      createDefaultCamera: true,
      createDefaultLighting: false,
      clearColor: new BABYLON.Color4(0, 0, 0, 1)
    };
    
    // Create simple camera
    const camera = new BABYLON.FreeCamera('loadingCamera', new BABYLON.Vector3(0, 0, -10), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    
    // Create loading UI
    const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('loadingUI', true, scene);
    
    const loadingText = new GUI.TextBlock();
    loadingText.text = options.loadingText || "Loading...";
    loadingText.color = "white";
    loadingText.fontSize = 24;
    loadingText.top = "-50px";
    advancedTexture.addControl(loadingText);
    
    const progressBar = new GUI.Rectangle("progressBar");
    progressBar.width = "400px";
    progressBar.height = "20px";
    progressBar.background = "gray";
    progressBar.color = "white";
    advancedTexture.addControl(progressBar);
    
    const progressIndicator = new GUI.Rectangle("progressIndicator");
    progressIndicator.width = "0%";
    progressIndicator.height = "100%";
    progressIndicator.background = "green";
    progressIndicator.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    progressBar.addControl(progressIndicator);
    
    // Set up progress callback
    if (options.onProgress) {
      scene.onBeforeRenderObservable.add(() => {
        // Dummy progress for demo purposes
        const progress = Math.random();
        progressIndicator.width = `${progress * 100}%`;
        if (options.onProgress) {
          options.onProgress(progress);
        }
      });
    }
  }
  
  /**
   * Sets up an editor scene with grid and gizmos
   * @param scene Scene to set up
   * @param options Editor scene options
   */
  private setupEditorScene(scene: BABYLON.Scene, options: EditorSceneOptions): void {
    // Set up basis with default camera and lighting
    this.setupDefaultScene(scene, options);
    
    // Create grid if requested
    if (options.showGrid) {
      const gridSize = 20;
      const gridPrecision = 1;
      const grid = BABYLON.MeshBuilder.CreateGround(
        'grid',
        { width: gridSize, height: gridSize, subdivisions: gridSize / gridPrecision },
        scene
      );
      
      const gridMaterial = new GridMaterial('gridMaterial', scene);
      gridMaterial.majorUnitFrequency = 5;
      gridMaterial.minorUnitVisibility = 0.5;
      gridMaterial.gridRatio = gridPrecision;
      gridMaterial.mainColor = new BABYLON.Color3(0.2, 0.2, 0.2);
      gridMaterial.lineColor = new BABYLON.Color3(0.4, 0.4, 0.4);
      grid.material = gridMaterial;
      
      grid.isPickable = false;
    }
    
    // Show axis gizmo if requested
    if (options.showAxisGizmo) {
      const gizmoManager = new BABYLON.GizmoManager(scene);
      gizmoManager.positionGizmoEnabled = true;
      gizmoManager.rotationGizmoEnabled = true;
      gizmoManager.scaleGizmoEnabled = true;
      gizmoManager.usePointerToAttachGizmos = true;
      
      // Create axis viewer in corner
      const axisViewer = new BABYLON.AxesViewer(scene, 1);
    }
    
    // Enable inspector
    scene.debugLayer.show({
      embedMode: true,
      overlay: true
    });
  }
} 