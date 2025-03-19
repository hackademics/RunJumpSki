/**
 * @file src/game/player/IPlayerPhysics.ts
 * @description Interface for player physics that combines skiing and jetpack movement
 */

import * as BABYLON from 'babylonjs';
import { SkiingPhysicsConfig, SkiingInput, SkiingState } from './ISkiingPhysics';
import { JetpackPhysicsConfig, JetpackInput, JetpackState } from './IJetpackPhysics';
import { TerrainSurfaceInfo } from '../../core/physics/ITerrainCollider';

/**
 * Configuration for player movement physics
 */
export interface PlayerPhysicsConfig {
  /**
   * Configuration for skiing physics
   */
  skiingConfig: SkiingPhysicsConfig;
  
  /**
   * Configuration for jetpack physics
   */
  jetpackConfig: JetpackPhysicsConfig;
  
  /**
   * Maximum walking speed
   */
  maxWalkSpeed: number;
  
  /**
   * Maximum running speed
   */
  maxRunSpeed: number;
  
  /**
   * Maximum falling speed
   */
  maxFallSpeed: number;
  
  /**
   * Jump force
   */
  jumpForce: number;
  
  /**
   * Gravity force
   */
  gravity: number;
  
  /**
   * Ground friction
   */
  groundFriction: number;
  
  /**
   * Air friction
   */
  airFriction: number;
  
  /**
   * Ground control multiplier
   */
  groundControlMultiplier: number;
  
  /**
   * Air control multiplier
   */
  airControlMultiplier: number;
}

/**
 * Movement mode for the player
 */
export enum MovementMode {
  WALKING = 'walking',
  RUNNING = 'running',
  SKIING = 'skiing',
  JETPACK = 'jetpack',
  AIR = 'air', // When not on ground but not using jetpack
  SLIDING = 'sliding'
}

/**
 * Player input state
 */
export interface PlayerInput {
  /**
   * Forward/backward input (-1 to 1)
   */
  forward: number;
  
  /**
   * Left/right input (-1 to 1)
   */
  right: number;
  
  /**
   * Jump input (button press)
   */
  jump: boolean;
  
  /**
   * Sprint input (button press)
   */
  sprint: boolean;
  
  /**
   * Ski input (button press)
   */
  ski: boolean;
  
  /**
   * Jetpack input (button press)
   */
  jetpack: boolean;
  
  /**
   * Thrust input for jetpack (0 to 1)
   */
  thrust: number;
}

/**
 * Current state of player physics
 */
export interface PlayerPhysicsState {
  /**
   * Current movement mode
   */
  movementMode: MovementMode;
  
  /**
   * Whether the player is currently on the ground
   */
  isGrounded: boolean;
  
  /**
   * Current velocity vector
   */
  velocity: BABYLON.Vector3;
  
  /**
   * Current speed scalar
   */
  speed: number;
  
  /**
   * Current facing direction
   */
  facingDirection: BABYLON.Vector3;
  
  /**
   * Current surface information
   */
  surfaceInfo: TerrainSurfaceInfo;
  
  /**
   * Time the player has been in the current movement mode
   */
  modeTime: number;
  
  /**
   * Skiing-specific state
   */
  skiingState: SkiingState;
  
  /**
   * Jetpack-specific state
   */
  jetpackState: JetpackState;
}

/**
 * Interface for player physics system
 */
export interface IPlayerPhysics {
  /**
   * Initialize the player physics
   * @param config Configuration options
   */
  initialize(config?: Partial<PlayerPhysicsConfig>): void;
  
  /**
   * Update the player physics
   * @param deltaTime Time elapsed since last update in seconds
   * @param input Current input state
   * @param surfaceInfo Current terrain surface information
   * @param isGrounded Whether the player is on the ground
   * @returns Updated velocity vector
   */
  update(
    deltaTime: number,
    input: PlayerInput,
    surfaceInfo: TerrainSurfaceInfo,
    isGrounded: boolean
  ): BABYLON.Vector3;
  
  /**
   * Apply an external force to the player
   * @param force Force vector to apply
   * @param isImpulse Whether the force is an impulse
   */
  applyForce(force: BABYLON.Vector3, isImpulse?: boolean): void;
  
  /**
   * Set the player's facing direction
   * @param direction Direction vector
   */
  setFacingDirection(direction: BABYLON.Vector3): void;
  
  /**
   * Perform a jump
   * @param extraForce Additional force to apply to the jump
   */
  jump(extraForce?: number): void;
  
  /**
   * Get the current physics state
   * @returns Current player physics state
   */
  getState(): PlayerPhysicsState;
  
  /**
   * Refill the jetpack fuel
   * @param amount Amount to refill
   */
  refillJetpackFuel(amount?: number): void;
  
  /**
   * Force a specific movement mode
   * @param mode The movement mode to set
   */
  setMovementMode(mode: MovementMode): void;
  
  /**
   * Reset the player physics to initial state
   */
  reset(): void;
}
