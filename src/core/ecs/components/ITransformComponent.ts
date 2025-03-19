/**
 * @file src/core/ecs/components/ITransformComponent.ts
 * @description Interface for the TransformComponent that handles entity positioning
 */

import * as BABYLON from 'babylonjs';
import { IComponent } from '../IComponent';

/**
 * Interface for Transform component
 * Handles entity positioning, rotation, and scale in 3D space
 */
export interface ITransformComponent extends IComponent {
  /**
   * Get the current position
   */
  getPosition(): BABYLON.Vector3;
  
  /**
   * Set the position
   * @param position - New position vector
   */
  setPosition(position: BABYLON.Vector3): void;
  
  /**
   * Set the position using individual coordinates
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   */
  setPosition(x: number, y: number, z: number): void;
  
  /**
   * Get the current rotation
   */
  getRotation(): BABYLON.Vector3;
  
  /**
   * Set the rotation
   * @param rotation - New rotation vector (in radians)
   */
  setRotation(rotation: BABYLON.Vector3): void;
  
  /**
   * Set the rotation using individual angles
   * @param x - Rotation around X axis (in radians)
   * @param y - Rotation around Y axis (in radians)
   * @param z - Rotation around Z axis (in radians)
   */
  setRotation(x: number, y: number, z: number): void;
  
  /**
   * Get the current scale
   */
  getScale(): BABYLON.Vector3;
  
  /**
   * Set the scale
   * @param scale - New scale vector
   */
  setScale(scale: BABYLON.Vector3): void;
  
  /**
   * Set uniform scale on all axes
   * @param scale - Uniform scale value
   */
  setScale(scale: number): void;
  
  /**
   * Set the scale using individual factors
   * @param x - X scale factor
   * @param y - Y scale factor
   * @param z - Z scale factor
   */
  setScale(x: number, y: number, z: number): void;
  
  /**
   * Get the local matrix
   */
  getLocalMatrix(): BABYLON.Matrix;
  
  /**
   * Get the world matrix
   */
  getWorldMatrix(): BABYLON.Matrix;
  
  /**
   * Move the entity relative to its current position
   * @param offset - Position offset
   */
  translate(offset: BABYLON.Vector3): void;
  
  /**
   * Move the entity relative to its current position
   * @param x - X offset
   * @param y - Y offset
   * @param z - Z offset
   */
  translate(x: number, y: number, z: number): void;
  
  /**
   * Rotate the entity relative to its current rotation
   * @param rotation - Rotation offset (in radians)
   */
  rotate(rotation: BABYLON.Vector3): void;
  
  /**
   * Rotate the entity relative to its current rotation
   * @param x - X rotation offset (in radians)
   * @param y - Y rotation offset (in radians)
   * @param z - Z rotation offset (in radians)
   */
  rotate(x: number, y: number, z: number): void;
  
  /**
   * Look at a specific target position
   * @param target - Position to look at
   */
  lookAt(target: BABYLON.Vector3): void;
  
  /**
   * Get the forward direction vector
   */
  getForward(): BABYLON.Vector3;
  
  /**
   * Get the right direction vector
   */
  getRight(): BABYLON.Vector3;
  
  /**
   * Get the up direction vector
   */
  getUp(): BABYLON.Vector3;
}

