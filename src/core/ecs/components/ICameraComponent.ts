/**
 * @file src/core/ecs/components/ICameraComponent.ts
 * @description Interface for the Camera Component that manages camera functionality
 */

import * as BABYLON from 'babylonjs';
import { IComponent } from '../IComponent';
import { ITransformComponent } from './ITransformComponent';

/**
 * Interface for Camera component
 * Handles camera functionality and rendering viewpoint
 */
export interface ICameraComponent extends IComponent {
  /**
   * Get the Babylon camera instance
   */
  getCamera(): BABYLON.Camera;
  
  /**
   * Set the Babylon camera instance
   * @param camera - Camera instance to set
   */
  setCamera(camera: BABYLON.Camera): void;
  
  /**
   * Get the aspect ratio of the camera
   */
  getAspectRatio(): number;
  
  /**
   * Set the aspect ratio of the camera
   * @param ratio - New aspect ratio
   */
  setAspectRatio(ratio: number): void;
  
  /**
   * Get the field of view of the camera (in radians)
   */
  getFov(): number;
  
  /**
   * Set the field of view of the camera
   * @param fov - Field of view in radians
   */
  setFov(fov: number): void;
  
  /**
   * Get the near clip plane distance
   */
  getNearClip(): number;
  
  /**
   * Set the near clip plane distance
   * @param near - Near clip plane distance
   */
  setNearClip(near: number): void;
  
  /**
   * Get the far clip plane distance
   */
  getFarClip(): number;
  
  /**
   * Set the far clip plane distance
   * @param far - Far clip plane distance
   */
  setFarClip(far: number): void;
  
  /**
   * Get the target transform that the camera is attached to
   */
  getTargetTransform(): ITransformComponent | null;
  
  /**
   * Set the target transform that the camera should follow
   * @param transform - Target transform component
   */
  setTargetTransform(transform: ITransformComponent | null): void;
  
  /**
   * Get the scene that this camera is rendering
   */
  getScene(): BABYLON.Scene;
  
  /**
   * Attach the camera to the rendering canvas
   * @param forceAttach - Whether to force attachment if already attached
   */
  attachControl(forceAttach?: boolean): void;
  
  /**
   * Detach the camera from the rendering canvas
   */
  detachControl(): void;
  
  /**
   * Set this camera as the active camera for the scene
   */
  setAsActiveCamera(): void;
}

