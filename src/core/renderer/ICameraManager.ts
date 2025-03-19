/**
 * @file src/core/renderer/ICameraManager.ts
 * @description Interface for managing cameras within a Babylon.js scene.
 *
 * @dependencies babylonjs
 * @relatedFiles CameraManager.ts, RenderingSystem.ts
 */
import * as BABYLON from 'babylonjs';
import { ICameraComponent } from '../ecs/components/ICameraComponent';
import { IFirstPersonCameraComponent } from '../ecs/components/IFirstPersonCameraComponent';
import { IEntity } from '../ecs/IEntity';

/**
 * Supported camera types
 */
export enum CameraType {
  FREE = 'free',
  FIRST_PERSON = 'firstPerson',
  THIRD_PERSON = 'thirdPerson',
  ARC_ROTATE = 'arcRotate',
  FOLLOW = 'follow',
  UNIVERSAL = 'universal',
}

/**
 * Base camera configuration options
 */
export interface CameraConfig {
  type: CameraType;
  name?: string;
  position?: BABYLON.Vector3;
  target?: BABYLON.Vector3;
  fov?: number;
  nearClip?: number;
  farClip?: number;
  setAsActive?: boolean;
}

/**
 * First person camera specific configuration
 */
export interface FirstPersonCameraConfig extends CameraConfig {
  type: CameraType.FIRST_PERSON;
  movementSpeed?: number;
  rotationSpeed?: number;
  inertia?: number;
  minAngle?: number;
  maxAngle?: number;
  positionOffset?: BABYLON.Vector3;
}

/**
 * Third person camera specific configuration
 */
export interface ThirdPersonCameraConfig extends CameraConfig {
  type: CameraType.THIRD_PERSON;
  distance?: number;
  heightOffset?: number;
  rotationOffset?: number;
  shouldFollowRotation?: boolean;
}

/**
 * Arc rotate camera specific configuration
 */
export interface ArcRotateCameraConfig extends CameraConfig {
  type: CameraType.ARC_ROTATE;
  alpha?: number;
  beta?: number;
  radius?: number;
  lowerAlphaLimit?: number;
  upperAlphaLimit?: number;
  lowerBetaLimit?: number;
  upperBetaLimit?: number;
  lowerRadiusLimit?: number;
  upperRadiusLimit?: number;
}

/**
 * Follow camera specific configuration
 */
export interface FollowCameraConfig extends CameraConfig {
  type: CameraType.FOLLOW;
  distance?: number;
  heightOffset?: number;
  rotationOffset?: number;
  cameraAcceleration?: number;
  maxCameraSpeed?: number;
}

/**
 * Union type for all camera configurations
 */
export type CameraConfiguration =
  | CameraConfig
  | FirstPersonCameraConfig
  | ThirdPersonCameraConfig
  | ArcRotateCameraConfig
  | FollowCameraConfig;

/**
 * Interface for camera manager
 */
export interface ICameraManager {
  /**
   * Initializes the camera manager
   * @param scene The Babylon.js scene for camera management
   */
  initialize(scene: BABYLON.Scene): void;

  /**
   * Updates all cameras managed by this system
   * @param deltaTime Time since the last update in seconds
   */
  update(deltaTime: number): void;

  /**
   * Creates a camera with the specified configuration
   * @param config Camera configuration
   * @returns Newly created Babylon camera instance
   */
  createCamera(config: CameraConfiguration): BABYLON.Camera;

  /**
   * Creates a camera component on the specified entity
   * @param entity Entity to attach the camera component to
   * @param config Camera configuration
   * @returns The created camera component
   */
  createCameraComponent(entity: IEntity, config: CameraConfiguration): ICameraComponent;

  /**
   * Gets the active camera
   * @returns The active camera or null if none exists
   */
  getActiveCamera(): BABYLON.Camera | null;

  /**
   * Sets a camera as the active camera
   * @param camera Camera to set as active
   */
  setActiveCamera(camera: BABYLON.Camera): void;

  /**
   * Gets a camera by name
   * @param name Name of the camera to retrieve
   * @returns The camera with the specified name, or null if not found
   */
  getCameraByName(name: string): BABYLON.Camera | null;

  /**
   * Gets all cameras managed by this system
   * @returns Array of all cameras
   */
  getAllCameras(): BABYLON.Camera[];

  /**
   * Gets all camera components managed by this system
   * @returns Array of all camera components
   */
  getAllCameraComponents(): ICameraComponent[];

  /**
   * Creates a first-person camera component
   * @param entity Entity to attach the camera component to
   * @param config First-person camera configuration
   * @returns The created first-person camera component
   */
  createFirstPersonCamera(
    entity: IEntity,
    config: FirstPersonCameraConfig
  ): IFirstPersonCameraComponent;

  /**
   * Removes a camera from management
   * @param cameraOrName Camera instance or name to remove
   * @returns True if the camera was removed, false if not found
   */
  removeCamera(cameraOrName: BABYLON.Camera | string): boolean;

  /**
   * Disposes all resources used by the camera manager
   */
  dispose(): void;
}
