/**
 * @file src/core/renderer/CameraManager.ts
 * @description Implementation of camera management system for creating, tracking and updating cameras
 *
 * @dependencies babylonjs
 * @relatedFiles ICameraManager.ts
 */

import * as BABYLON from 'babylonjs';
import { CameraComponent, CameraComponentOptions } from '../ecs/components/CameraComponent';
import {
  FirstPersonCameraComponent,
  FirstPersonCameraComponentOptions,
} from '../ecs/components/FirstPersonCameraComponent';
import { ICameraComponent } from '../ecs/components/ICameraComponent';
import { IFirstPersonCameraComponent } from '../ecs/components/IFirstPersonCameraComponent';
import { IEntity } from '../ecs/IEntity';
import {
  CameraType,
  ICameraManager,
  CameraConfiguration,
  FirstPersonCameraConfig,
  ThirdPersonCameraConfig,
  ArcRotateCameraConfig,
  FollowCameraConfig,
} from './ICameraManager';

/**
 * Implementation of camera management system
 */
export class CameraManager implements ICameraManager {
  /**
   * Scene managed by this camera system
   */
  private scene: BABYLON.Scene | null = null;

  /**
   * Map of all managed cameras by name
   */
  private cameras: Map<string, BABYLON.Camera> = new Map();

  /**
   * Map of all camera components by entity ID
   */
  private cameraComponents: Map<string, ICameraComponent> = new Map();

  /**
   * Active camera
   */
  private activeCamera: BABYLON.Camera | null = null;

  /**
   * Creates a new CameraManager instance
   */
  constructor() {}

  /**
   * Initializes the camera manager
   * @param scene The Babylon.js scene for camera management
   */
  public initialize(scene: BABYLON.Scene): void {
    if (this.scene) {
      throw new Error('CameraManager is already initialized');
    }

    this.scene = scene;

    // Create a default camera if the scene doesn't have one
    if (!scene.activeCamera) {
      this.createDefaultCamera();
    }
  }

  /**
   * Updates all cameras managed by this system
   * @param deltaTime Time since the last update in seconds
   */
  public update(deltaTime: number): void {
    // Update all camera components
    this.cameraComponents.forEach(component => {
      if (component.isEnabled()) {
        component.update(deltaTime);
      }
    });
  }

  /**
   * Creates a camera with the specified configuration
   * @param config Camera configuration
   * @returns Newly created Babylon camera instance
   */
  public createCamera(config: CameraConfiguration): BABYLON.Camera {
    if (!this.scene) {
      throw new Error('CameraManager is not initialized');
    }

    const name = config.name || `camera-${Date.now()}`;
    const position = config.position || new BABYLON.Vector3(0, 5, -10);
    const target = config.target || new BABYLON.Vector3(0, 0, 0);

    let camera: BABYLON.Camera;

    switch (config.type) {
      case CameraType.FREE:
        camera = new BABYLON.FreeCamera(name, position, this.scene);
        (camera as BABYLON.FreeCamera).setTarget(target);
        break;

      case CameraType.FIRST_PERSON:
        camera = new BABYLON.UniversalCamera(name, position, this.scene);
        (camera as BABYLON.UniversalCamera).setTarget(target);

        // Apply first-person specific config
        if (this.isFirstPersonConfig(config)) {
          this.configureFirstPersonCamera(camera as BABYLON.UniversalCamera, config);
        }
        break;

      case CameraType.THIRD_PERSON:
        // For third person, we use ArcRotateCamera with specific settings
        camera = new BABYLON.ArcRotateCamera(
          name,
          Math.PI, // Alpha - horizontal rotation
          Math.PI / 3, // Beta - vertical rotation
          10, // Radius - distance from target
          target,
          this.scene
        );

        // Apply third-person specific config
        if (this.isThirdPersonConfig(config)) {
          this.configureThirdPersonCamera(camera as BABYLON.ArcRotateCamera, config);
        }
        break;

      case CameraType.ARC_ROTATE: {
        const arcConfig = config as ArcRotateCameraConfig;
        camera = new BABYLON.ArcRotateCamera(
          name,
          arcConfig.alpha || Math.PI,
          arcConfig.beta || Math.PI / 3,
          arcConfig.radius || 10,
          target,
          this.scene
        );
        break;
      }

      case CameraType.FOLLOW:
        camera = new BABYLON.FollowCamera(name, position, this.scene);

        // Apply follow camera specific config
        if (this.isFollowConfig(config)) {
          this.configureFollowCamera(camera as BABYLON.FollowCamera, config);
        }
        break;

      case CameraType.UNIVERSAL:
        camera = new BABYLON.UniversalCamera(name, position, this.scene);
        (camera as BABYLON.UniversalCamera).setTarget(target);
        break;

      default:
        camera = new BABYLON.FreeCamera(name, position, this.scene);
        break;
    }

    // Apply common camera settings
    this.applyCommonCameraSettings(camera, config);

    // Store the camera
    this.cameras.set(name, camera);

    // Set as active if requested
    if (config.setAsActive) {
      this.setActiveCamera(camera);
    }

    return camera;
  }

  /**
   * Creates a camera component on the specified entity
   * @param entity Entity to attach the camera component to
   * @param config Camera configuration
   * @returns The created camera component
   */
  public createCameraComponent(entity: IEntity, config: CameraConfiguration): ICameraComponent {
    if (!this.scene) {
      throw new Error('CameraManager is not initialized');
    }

    if (!entity) {
      throw new Error('Entity is required to create a camera component');
    }

    if (config.type === CameraType.FIRST_PERSON && this.isFirstPersonConfig(config)) {
      return this.createFirstPersonCamera(entity, config);
    }

    // Create the camera first
    const camera = this.createCamera(config);

    // Create component options
    const componentOptions: CameraComponentOptions = {
      camera,
      scene: this.scene,
      setAsActive: config.setAsActive,
    };

    // Create the component
    const cameraComponent = new CameraComponent(componentOptions);

    // Initialize the component
    cameraComponent.initialize(entity);

    // Add to entity
    entity.addComponent(cameraComponent);

    // Store in our component map
    this.cameraComponents.set(entity.id, cameraComponent);

    return cameraComponent;
  }

  /**
   * Creates a first-person camera component
   * @param entity Entity to attach the camera component to
   * @param config First-person camera configuration
   * @returns The created first-person camera component
   */
  public createFirstPersonCamera(
    entity: IEntity,
    config: FirstPersonCameraConfig
  ): IFirstPersonCameraComponent {
    if (!this.scene) {
      throw new Error('CameraManager is not initialized');
    }

    if (!entity) {
      throw new Error('Entity is required to create a first-person camera component');
    }

    // Create camera
    const camera = this.createCamera(config);

    // Create component options
    const componentOptions: FirstPersonCameraComponentOptions = {
      camera,
      scene: this.scene,
      movementSpeed: config.movementSpeed,
      rotationSpeed: config.rotationSpeed,
      inertia: config.inertia,
      minAngle: config.minAngle,
      maxAngle: config.maxAngle,
      positionOffset: config.positionOffset,
      setAsActive: config.setAsActive,
      controlsEnabled: true,
    };

    // Create the component
    const firstPersonCamera = new FirstPersonCameraComponent(componentOptions);

    // Initialize the component
    firstPersonCamera.initialize(entity);

    // Add to entity
    entity.addComponent(firstPersonCamera);

    // Store in our component map
    this.cameraComponents.set(entity.id, firstPersonCamera);

    return firstPersonCamera;
  }

  /**
   * Gets the active camera
   * @returns The active camera or null if none exists
   */
  public getActiveCamera(): BABYLON.Camera | null {
    return this.activeCamera || (this.scene ? this.scene.activeCamera : null);
  }

  /**
   * Sets a camera as the active camera
   * @param camera Camera to set as active
   */
  public setActiveCamera(camera: BABYLON.Camera): void {
    if (!this.scene) {
      throw new Error('CameraManager is not initialized');
    }

    this.scene.activeCamera = camera;
    this.activeCamera = camera;
  }

  /**
   * Gets a camera by name
   * @param name Name of the camera to retrieve
   * @returns The camera with the specified name, or null if not found
   */
  public getCameraByName(name: string): BABYLON.Camera | null {
    return this.cameras.get(name) || null;
  }

  /**
   * Gets all cameras managed by this system
   * @returns Array of all cameras
   */
  public getAllCameras(): BABYLON.Camera[] {
    return Array.from(this.cameras.values());
  }

  /**
   * Gets all camera components managed by this system
   * @returns Array of all camera components
   */
  public getAllCameraComponents(): ICameraComponent[] {
    return Array.from(this.cameraComponents.values());
  }

  /**
   * Removes a camera from management
   * @param cameraOrName Camera instance or name to remove
   * @returns True if the camera was removed, false if not found
   */
  public removeCamera(cameraOrName: BABYLON.Camera | string): boolean {
    let cameraName: string | undefined;

    if (typeof cameraOrName === 'string') {
      cameraName = cameraOrName;
    } else {
      // Find the camera name by instance
      for (const [name, camera] of this.cameras.entries()) {
        if (camera === cameraOrName) {
          cameraName = name;
          break;
        }
      }
    }

    if (!cameraName || !this.cameras.has(cameraName)) {
      return false;
    }

    // Remove from our maps
    const camera = this.cameras.get(cameraName)!;
    this.cameras.delete(cameraName);

    // Remove associated components
    for (const [entityId, component] of this.cameraComponents.entries()) {
      if (component.getCamera() === camera) {
        this.cameraComponents.delete(entityId);
      }
    }

    return true;
  }

  /**
   * Disposes all resources used by the camera manager
   */
  public dispose(): void {
    // Dispose all cameras that are not the scene's active camera
    for (const camera of this.cameras.values()) {
      if (this.scene && camera !== this.scene.activeCamera) {
        camera.dispose();
      }
    }

    // Clear our maps
    this.cameras.clear();
    this.cameraComponents.clear();

    // Clear references
    this.activeCamera = null;
    this.scene = null;
  }

  /**
   * Creates a default camera if none exists
   */
  private createDefaultCamera(): void {
    if (!this.scene) {
      throw new Error('CameraManager is not initialized');
    }

    // Create a default free camera
    const camera = new BABYLON.FreeCamera(
      'default-camera',
      new BABYLON.Vector3(0, 5, -10),
      this.scene
    );

    camera.setTarget(BABYLON.Vector3.Zero());

    // Apply some reasonable defaults
    camera.fov = Math.PI / 4; // 45 degrees
    camera.minZ = 0.1;
    camera.maxZ = 1000;

    // Attach controls
    camera.attachControl();

    // Set as active
    this.scene.activeCamera = camera;
    this.activeCamera = camera;

    // Store in our map
    this.cameras.set('default-camera', camera);
  }

  /**
   * Applies common camera settings to a camera
   * @param camera Camera to configure
   * @param config Configuration to apply
   */
  private applyCommonCameraSettings(camera: BABYLON.Camera, config: CameraConfiguration): void {
    // Set FOV if provided (for perspective cameras)
    if (config.fov !== undefined && 'fov' in camera) {
      (camera as unknown as { fov: number }).fov = config.fov;
    }

    // Set clipping planes
    if (config.nearClip !== undefined) {
      camera.minZ = config.nearClip;
    }

    if (config.farClip !== undefined) {
      camera.maxZ = config.farClip;
    }

    // Set position if provided
    if (config.position) {
      camera.position = config.position.clone();
    }

    // Set target if provided
    if (config.target && 'setTarget' in camera) {
      (camera as BABYLON.TargetCamera).setTarget(config.target);
    }

    // Attach control to canvas
    camera.attachControl();

    // For angle limits, check if it's a first-person camera configuration
    if (this.isFirstPersonConfig(config)) {
      if (config.minAngle !== undefined || config.maxAngle !== undefined) {
        // Store these for component use
        (camera as unknown as { minAngle?: number; maxAngle?: number }).minAngle = config.minAngle;
        (camera as unknown as { minAngle?: number; maxAngle?: number }).maxAngle = config.maxAngle;
      }
    }
  }

  /**
   * Configures a first-person camera
   * @param camera Camera to configure
   * @param config First-person configuration
   */
  private configureFirstPersonCamera(
    camera: BABYLON.UniversalCamera,
    config: FirstPersonCameraConfig
  ): void {
    if (config.movementSpeed !== undefined) {
      camera.speed = config.movementSpeed;
    }

    if (config.rotationSpeed !== undefined) {
      camera.angularSensibility = 1 / config.rotationSpeed;
    }

    if (config.inertia !== undefined) {
      camera.inertia = config.inertia;
    }

    // For angle limits, we need to handle them specially since they're not
    // directly available on Universal Camera
    if (config.minAngle !== undefined || config.maxAngle !== undefined) {
      // Store these for component use
      (camera as unknown as { minAngle?: number; maxAngle?: number }).minAngle = config.minAngle;
      (camera as unknown as { minAngle?: number; maxAngle?: number }).maxAngle = config.maxAngle;
    }
  }

  /**
   * Configures a third-person camera (based on ArcRotateCamera)
   * @param camera Camera to configure
   * @param config Third-person configuration
   */
  private configureThirdPersonCamera(
    camera: BABYLON.ArcRotateCamera,
    config: ThirdPersonCameraConfig
  ): void {
    if (config.distance !== undefined) {
      camera.radius = config.distance;
    }

    if (config.heightOffset !== undefined) {
      // Apply height offset to the target
      const target = camera.target.clone();
      target.y += config.heightOffset;
      camera.setTarget(target);
    }

    if (config.rotationOffset !== undefined) {
      camera.alpha += config.rotationOffset;
    }

    // Apply common ArcRotateCamera settings
    camera.upperBetaLimit = Math.PI / 2 - 0.1; // Just below 90 degrees
    camera.lowerRadiusLimit = 2; // Prevent camera from going inside the target
    camera.wheelPrecision = 50; // Mouse wheel zoom sensitivity
    camera.pinchPrecision = 50; // Touch pinch zoom sensitivity
  }

  /**
   * Configures an arc-rotate camera
   * @param camera Camera to configure
   * @param config Arc-rotate configuration
   */
  private configureArcRotateCamera(
    camera: BABYLON.ArcRotateCamera,
    config: ArcRotateCameraConfig
  ): void {
    if (config.lowerAlphaLimit !== undefined) {
      camera.lowerAlphaLimit = config.lowerAlphaLimit;
    }

    if (config.upperAlphaLimit !== undefined) {
      camera.upperAlphaLimit = config.upperAlphaLimit;
    }

    if (config.lowerBetaLimit !== undefined) {
      camera.lowerBetaLimit = config.lowerBetaLimit;
    }

    if (config.upperBetaLimit !== undefined) {
      camera.upperBetaLimit = config.upperBetaLimit;
    }

    if (config.lowerRadiusLimit !== undefined) {
      camera.lowerRadiusLimit = config.lowerRadiusLimit;
    }

    if (config.upperRadiusLimit !== undefined) {
      camera.upperRadiusLimit = config.upperRadiusLimit;
    }
  }

  /**
   * Configures a follow camera
   * @param camera Camera to configure
   * @param config Follow camera configuration
   */
  private configureFollowCamera(camera: BABYLON.FollowCamera, config: FollowCameraConfig): void {
    if (config.distance !== undefined) {
      camera.radius = config.distance;
    }

    if (config.heightOffset !== undefined) {
      camera.heightOffset = config.heightOffset;
    }

    if (config.rotationOffset !== undefined) {
      camera.rotationOffset = config.rotationOffset;
    }

    if (config.cameraAcceleration !== undefined) {
      camera.cameraAcceleration = config.cameraAcceleration;
    }

    if (config.maxCameraSpeed !== undefined) {
      camera.maxCameraSpeed = config.maxCameraSpeed;
    }
  }

  /**
   * Type guard for FirstPersonCameraConfig
   * @param config Configuration to check
   * @returns True if the configuration is a FirstPersonCameraConfig
   */
  private isFirstPersonConfig(config: CameraConfiguration): config is FirstPersonCameraConfig {
    return config.type === CameraType.FIRST_PERSON;
  }

  /**
   * Type guard for ThirdPersonCameraConfig
   * @param config Configuration to check
   * @returns True if the configuration is a ThirdPersonCameraConfig
   */
  private isThirdPersonConfig(config: CameraConfiguration): config is ThirdPersonCameraConfig {
    return config.type === CameraType.THIRD_PERSON;
  }

  /**
   * Type guard for ArcRotateCameraConfig
   * @param config Configuration to check
   * @returns True if the configuration is an ArcRotateCameraConfig
   */
  private isArcRotateConfig(config: CameraConfiguration): config is ArcRotateCameraConfig {
    return config.type === CameraType.ARC_ROTATE;
  }

  /**
   * Type guard for FollowCameraConfig
   * @param config Configuration to check
   * @returns True if the configuration is a FollowCameraConfig
   */
  private isFollowConfig(config: CameraConfiguration): config is FollowCameraConfig {
    return config.type === CameraType.FOLLOW;
  }
}
