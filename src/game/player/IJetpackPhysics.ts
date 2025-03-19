/**
 * @file src/game/player/IJetpackPhysics.ts
 * @description Interface for jetpack physics system that handles flight mechanics
 */

import * as BABYLON from 'babylonjs';

/**
 * Configuration options for jetpack physics
 */
export interface JetpackPhysicsConfig {
  /**
   * Maximum speed while using jetpack
   */
  maxSpeed: number;

  /**
   * Maximum vertical speed (ascent)
   */
  maxVerticalSpeed: number;

  /**
   * Base thrust force applied when jetpack is active
   */
  thrustForce: number;

  /**
   * Multiplier for horizontal movement while using jetpack
   */
  horizontalControlMultiplier: number;

  /**
   * Air resistance factor while flying
   */
  airResistance: number;

  /**
   * Maximum amount of fuel available
   */
  maxFuel: number;

  /**
   * Fuel consumption rate per second
   */
  fuelConsumptionRate: number;

  /**
   * Fuel recharge rate per second when not using jetpack
   */
  fuelRechargeRate: number;

  /**
   * Gravity reduction factor when jetpack is active (0-1)
   */
  gravityReductionFactor: number;
}

/**
 * Current state of the jetpack physics
 */
export interface JetpackState {
  /**
   * Whether the jetpack is currently active
   */
  isActive: boolean;

  /**
   * Current fuel level
   */
  currentFuel: number;

  /**
   * Whether the jetpack has any fuel remaining
   */
  hasFuel: boolean;

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
   * Time the jetpack has been active in seconds
   */
  activeTime: number;
}

/**
 * Input state for jetpack controls
 */
export interface JetpackInput {
  /**
   * Activate jetpack (button press)
   */
  activate: boolean;

  /**
   * Forward/backward control (-1 to 1)
   */
  forward: number;

  /**
   * Left/right control (-1 to 1)
   */
  right: number;

  /**
   * Upward thrust control (0 to 1)
   */
  thrust: number;
}

/**
 * Interface for jetpack physics system
 */
export interface IJetpackPhysics {
  /**
   * Initialize the jetpack physics
   * @param config Configuration options
   */
  initialize(config?: Partial<JetpackPhysicsConfig>): void;

  /**
   * Update the jetpack physics
   * @param deltaTime Time elapsed since last update in seconds
   * @param input Current input state
   * @param isGrounded Whether the player is on the ground
   * @param currentVelocity Current velocity vector of the player
   * @returns Updated velocity vector
   */
  update(
    deltaTime: number,
    input: JetpackInput,
    isGrounded: boolean,
    currentVelocity: BABYLON.Vector3
  ): BABYLON.Vector3;

  /**
   * Apply an external force to the jetpack physics
   * @param force Force vector to apply
   * @param isImpulse Whether the force is an impulse
   */
  applyForce(force: BABYLON.Vector3, isImpulse?: boolean): void;

  /**
   * Activate the jetpack
   */
  activate(): void;

  /**
   * Deactivate the jetpack
   */
  deactivate(): void;

  /**
   * Get the current jetpack state
   * @returns Current state of the jetpack
   */
  getState(): JetpackState;

  /**
   * Set the facing direction
   * @param direction Direction vector
   */
  setFacingDirection(direction: BABYLON.Vector3): void;

  /**
   * Refill the jetpack fuel
   * @param amount Amount to refill (defaults to max)
   */
  refillFuel(amount?: number): void;

  /**
   * Reset the jetpack physics to initial state
   */
  reset(): void;
}
