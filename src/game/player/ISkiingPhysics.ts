/**
 * @file src/game/player/ISkiingPhysics.ts
 * @description Interface for skiing physics behavior in the game
 */

import * as BABYLON from 'babylonjs';
import { TerrainSurfaceInfo } from '../../core/physics/ITerrainCollider';

/**
 * Configuration options for skiing physics
 */
export interface SkiingPhysicsConfig {
  /**
   * Maximum speed the player can reach while skiing (units/second)
   */
  maxSpeed: number;
  
  /**
   * Base friction coefficient when skiing on default terrain
   */
  baseFriction: number;
  
  /**
   * Minimum slope angle in radians before skiing becomes effective
   */
  minSkiSlope: number;
  
  /**
   * Maximum acceleration when skiing on perfect slope
   */
  maxAcceleration: number;
  
  /**
   * Air control factor when skiing and in the air (0-1)
   */
  airControl: number;
  
  /**
   * Air friction coefficient
   */
  airFriction: number;
  
  /**
   * Downhill multiplier for speed
   */
  downhillMultiplier: number;
  
  /**
   * Uphill penalty multiplier for speed
   */
  uphillPenalty: number;
  
  /**
   * How quickly the player turns while skiing (radians/second)
   */
  turnSpeed: number;
}

/**
 * Current state of the skiing physics
 */
export interface SkiingState {
  /**
   * Whether the player is currently skiing
   */
  isSkiing: boolean;
  
  /**
   * Whether the player is grounded
   */
  isGrounded: boolean;
  
  /**
   * Current velocity vector
   */
  velocity: BABYLON.Vector3;
  
  /**
   * Current speed magnitude
   */
  speed: number;
  
  /**
   * Current acceleration vector
   */
  acceleration: BABYLON.Vector3;
  
  /**
   * Direction the player is facing
   */
  facingDirection: BABYLON.Vector3;
  
  /**
   * Terrain surface information at the player's current position
   */
  surfaceInfo: TerrainSurfaceInfo;
  
  /**
   * Time in seconds the player has been skiing
   */
  skiingTime: number;
}

/**
 * Input state for controlling skiing physics
 */
export interface SkiingInput {
  /**
   * Forward/backward input (-1 to 1)
   */
  forward: number;
  
  /**
   * Left/right input (-1 to 1)
   */
  right: number;
  
  /**
   * Whether the ski button is pressed
   */
  ski: boolean;
  
  /**
   * Whether the jump button is pressed
   */
  jump: boolean;
}

/**
 * Interface for skiing physics that handles slope-based movement
 */
export interface ISkiingPhysics {
  /**
   * Initializes the skiing physics
   * @param config The skiing physics configuration
   */
  initialize(config: SkiingPhysicsConfig): void;
  
  /**
   * Updates the skiing physics based on input and terrain
   * @param deltaTime Time elapsed since the last update in seconds
   * @param input Current input state
   * @param surfaceInfo Current terrain surface information
   * @param isGrounded Whether the player is currently on the ground
   * @param currentVelocity Current velocity vector of the player
   * @returns Updated velocity vector
   */
  update(
    deltaTime: number,
    input: SkiingInput,
    surfaceInfo: TerrainSurfaceInfo,
    isGrounded: boolean,
    currentVelocity: BABYLON.Vector3
  ): BABYLON.Vector3;
  
  /**
   * Applies a force to the skiing physics
   * @param force Force vector to apply
   * @param isImpulse Whether this is an impulse (instant) force
   */
  applyForce(force: BABYLON.Vector3, isImpulse?: boolean): void;
  
  /**
   * Activates the skiing state
   */
  startSkiing(): void;
  
  /**
   * Deactivates the skiing state
   */
  stopSkiing(): void;
  
  /**
   * Gets the current skiing state
   * @returns Current skiing physics state
   */
  getState(): SkiingState;
  
  /**
   * Sets the player's facing direction
   * @param direction Direction vector
   */
  setFacingDirection(direction: BABYLON.Vector3): void;
  
  /**
   * Gets the effective friction coefficient based on the current state
   * @returns Current friction coefficient
   */
  getCurrentFriction(): number;
  
  /**
   * Resets the skiing physics to its initial state
   */
  reset(): void;
}
