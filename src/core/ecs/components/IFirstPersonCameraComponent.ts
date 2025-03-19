/**
 * @file src/core/ecs/components/IFirstPersonCameraComponent.ts
 * @description Interface for the FirstPersonCameraComponent that manages first-person camera controls
 */

import * as BABYLON from 'babylonjs';
import { ICameraComponent } from './ICameraComponent';

/**
 * Interface for FirstPersonCamera component
 * Extends the base camera with first-person controls
 */
export interface IFirstPersonCameraComponent extends ICameraComponent {
  /**
   * Get the movement speed of the camera
   */
  getMovementSpeed(): number;
  
  /**
   * Set the movement speed of the camera
   * @param speed - New movement speed
   */
  setMovementSpeed(speed: number): void;
  
  /**
   * Get the rotation speed of the camera
   */
  getRotationSpeed(): number;
  
  /**
   * Set the rotation speed of the camera
   * @param speed - New rotation speed
   */
  setRotationSpeed(speed: number): void;
  
  /**
   * Get the inertia factor controlling camera smoothness
   */
  getInertia(): number;
  
  /**
   * Set the inertia factor controlling camera smoothness
   * @param inertia - New inertia value (0-1)
   */
  setInertia(inertia: number): void;
  
  /**
   * Get the camera's vertical angle limits (in radians)
   */
  getAngleLimits(): { min: number; max: number };
  
  /**
   * Set the camera's vertical angle limits
   * @param min - Minimum vertical angle (in radians)
   * @param max - Maximum vertical angle (in radians)
   */
  setAngleLimits(min: number, max: number): void;
  
  /**
   * Get the camera's position offset from the target
   */
  getPositionOffset(): BABYLON.Vector3;
  
  /**
   * Set the camera's position offset from the target
   * @param offset - Position offset
   */
  setPositionOffset(offset: BABYLON.Vector3): void;
  
  /**
   * Enable/disable first-person camera controls
   * @param enabled - Whether the controls should be enabled
   */
  enableControls(enabled: boolean): void;
  
  /**
   * Check if first-person camera controls are enabled
   */
  isControlsEnabled(): boolean;
}

