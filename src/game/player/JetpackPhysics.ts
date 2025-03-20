/**
 * @file src/game/player/JetpackPhysics.ts
 * @description Implementation of jetpack physics for the player
 */

import * as BABYLON from 'babylonjs';
import { 
  IJetpackPhysics, 
  JetpackPhysicsConfig, 
  JetpackState, 
  JetpackInput 
} from './IJetpackPhysics';

/**
 * Default configuration for jetpack physics
 */
export const DEFAULT_JETPACK_CONFIG: JetpackPhysicsConfig = {
  maxSpeed: 25,
  maxVerticalSpeed: 15,
  thrustForce: 20,
  horizontalControlMultiplier: 0.8,
  airResistance: 0.05,
  maxFuel: 100,
  fuelConsumptionRate: 20, // Units per second
  fuelRechargeRate: 10,    // Units per second
  gravityReductionFactor: 0.2
};

/**
 * Implementation of jetpack physics that handles flight mechanics
 */
export class JetpackPhysics implements IJetpackPhysics {
  private config: JetpackPhysicsConfig;
  private state: JetpackState;
  private accumulatedForces: BABYLON.Vector3;
  
  /**
   * Creates a new instance of jetpack physics
   */
  constructor() {
    this.config = { ...DEFAULT_JETPACK_CONFIG };
    
    // Initialize the jetpack state
    this.state = {
      isActive: false,
      currentFuel: DEFAULT_JETPACK_CONFIG.maxFuel,
      hasFuel: true,
      velocity: new BABYLON.Vector3(0, 0, 0),
      speed: 0,
      facingDirection: new BABYLON.Vector3(0, 0, 1),
      activeTime: 0
    };
    
    this.accumulatedForces = new BABYLON.Vector3(0, 0, 0);
  }
  
  /**
   * Initializes the jetpack physics
   * @param config The jetpack physics configuration
   */
  public initialize(config: Partial<JetpackPhysicsConfig> = {}): void {
    // Merge the provided config with the default config
    this.config = {
      ...DEFAULT_JETPACK_CONFIG,
      ...config
    };
    
    this.reset();
  }
  
  /**
   * Updates the jetpack physics based on input
   * @param deltaTime Time elapsed since the last update in seconds
   * @param input Current input state
   * @param isGrounded Whether the player is currently on the ground
   * @param currentVelocity Current velocity vector of the player
   * @returns Updated velocity vector
   */
  public update(
    deltaTime: number,
    input: JetpackInput,
    isGrounded: boolean,
    currentVelocity: BABYLON.Vector3
  ): BABYLON.Vector3 {
    // Update the state
    this.state.velocity = currentVelocity.clone();
    this.state.speed = currentVelocity.length();
    
    // Update fuel state
    this.state.hasFuel = this.state.currentFuel > 0;
    
    // Update whether jetpack is active based on input and fuel
    if (input.activate && this.state.hasFuel && !this.state.isActive) {
      this.activate();
    } else if ((!input.activate || !this.state.hasFuel) && this.state.isActive) {
      this.deactivate();
    }
    
    // If not active, just manage fuel recharge and return current velocity
    if (!this.state.isActive) {
      // Recharge fuel when jetpack is not active
      this.state.currentFuel = Math.min(
        this.config.maxFuel,
        this.state.currentFuel + (this.config.fuelRechargeRate * deltaTime)
      );
      this.state.hasFuel = this.state.currentFuel > 0;
      
      return currentVelocity.clone();
    }
    
    // Update jetpack active time
    this.state.activeTime += deltaTime;
    
    // Consume fuel
    this.state.currentFuel = Math.max(
      0,
      this.state.currentFuel - (this.config.fuelConsumptionRate * deltaTime)
    );
    
    // Check if we're out of fuel
    if (this.state.currentFuel <= 0) {
      this.state.hasFuel = false;
      this.deactivate();
      return currentVelocity.clone();
    }
    
    // Create acceleration vector
    let acceleration = new BABYLON.Vector3(0, 0, 0);
    
    // Apply turning based on input
    this.applyTurning(input, deltaTime);
    
    // Apply jetpack thrust
    this.applyJetpackThrust(input, isGrounded, acceleration);
    
    // Apply input-based control
    this.applyInputControl(input, acceleration);
    
    // Apply accumulated forces
    if (!this.accumulatedForces.equalsWithEpsilon(BABYLON.Vector3.Zero(), 0.001)) {
      acceleration.addInPlace(this.accumulatedForces);
      this.accumulatedForces = BABYLON.Vector3.Zero();
    }
    
    // Apply gravity reduction
    this.applyGravityReduction(currentVelocity, deltaTime);
    
    // Update the velocity based on acceleration
    let newVelocity = currentVelocity.add(acceleration.scale(deltaTime));
    
    // Apply air resistance
    this.applyAirResistance(newVelocity, deltaTime);
    
    // Enforce maximum speeds
    this.enforceSpeedLimits(newVelocity);
    
    // Update the state with new values
    this.state.velocity = newVelocity.clone();
    this.state.speed = newVelocity.length();
    
    return newVelocity;
  }
  
  /**
   * Applies turning based on input
   * @param input The current input state
   * @param deltaTime Time elapsed since the last update
   */
  private applyTurning(input: JetpackInput, deltaTime: number): void {
    if (Math.abs(input.right) < 0.05) return;
    
    // Create a rotation quaternion based on the right input
    const turnAmount = input.right * 2.0 * deltaTime;
    const rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Up(), turnAmount);
    
    // Create rotation matrix from quaternion
    const rotationMatrix = new BABYLON.Matrix();
    rotationQuaternion.toRotationMatrix(rotationMatrix);
    
    // Apply the rotation to the facing direction
    this.state.facingDirection = BABYLON.Vector3.TransformNormal(
      this.state.facingDirection,
      rotationMatrix
    );
    
    // Ensure direction is horizontal (y = 0)
    this.state.facingDirection.y = 0;
    
    // Re-normalize
    if (this.state.facingDirection.lengthSquared() > 0.001) {
      this.state.facingDirection.normalize();
    }
  }
  
  /**
   * Applies jetpack thrust force
   * @param input The current input state
   * @param isGrounded Whether the player is on the ground
   * @param acceleration The acceleration vector to modify
   */
  private applyJetpackThrust(input: JetpackInput, isGrounded: boolean, acceleration: BABYLON.Vector3): void {
    if (!this.state.isActive || !this.state.hasFuel) return;
    
    // Base thrust is upward
    const thrustMultiplier = input.thrust > 0.05 ? input.thrust : 0.5;
    const thrustForce = this.config.thrustForce * thrustMultiplier;
    
    // Apply vertical thrust
    acceleration.y += thrustForce;
  }
  
  /**
   * Applies control input to the acceleration
   * @param input The current input state
   * @param acceleration The acceleration vector to modify
   */
  private applyInputControl(input: JetpackInput, acceleration: BABYLON.Vector3): void {
    if (!this.state.isActive) return;
    
    // Apply forward/backward input
    if (Math.abs(input.forward) > 0.05) {
      const controlForce = this.state.facingDirection.scale(
        input.forward * this.config.horizontalControlMultiplier * this.config.thrustForce
      );
      
      // Only apply horizontal component
      controlForce.y = 0;
      
      acceleration.addInPlace(controlForce);
    }
  }
  
  /**
   * Applies reduced gravity effect when jetpack is active
   * @param velocity The velocity vector to modify
   * @param deltaTime Time elapsed since last update
   */
  private applyGravityReduction(velocity: BABYLON.Vector3, deltaTime: number): void {
    if (!this.state.isActive) return;
    
    // Calculate gravity compensation
    // If velocity.y is negative (falling), reduce the effect of gravity
    if (velocity.y < 0) {
      const gravityCompensation = 9.81 * (1 - this.config.gravityReductionFactor) * deltaTime;
      velocity.y += gravityCompensation;
    }
  }
  
  /**
   * Applies air resistance to velocity
   * @param velocity The velocity vector to modify
   * @param deltaTime Time elapsed since last update
   */
  private applyAirResistance(velocity: BABYLON.Vector3, deltaTime: number): void {
    // Apply air resistance as a deceleration
    const speed = velocity.length();
    
    if (speed > 0.01) {
      const resistanceForce = velocity.normalize().scale(
        -this.config.airResistance * speed * speed
      );
      
      velocity.addInPlace(resistanceForce.scale(deltaTime));
    }
  }
  
  /**
   * Enforces maximum speed limits
   * @param velocity The velocity vector to modify
   */
  private enforceSpeedLimits(velocity: BABYLON.Vector3): void {
    // Enforce maximum horizontal speed
    const horizontalVelocity = new BABYLON.Vector3(velocity.x, 0, velocity.z);
    const horizontalSpeed = horizontalVelocity.length();
    
    if (horizontalSpeed > this.config.maxSpeed) {
      const scaleFactor = this.config.maxSpeed / horizontalSpeed;
      velocity.x *= scaleFactor;
      velocity.z *= scaleFactor;
    }
    
    // Enforce maximum vertical speed
    if (velocity.y > this.config.maxVerticalSpeed) {
      velocity.y = this.config.maxVerticalSpeed;
    }
  }
  
  /**
   * Applies a force to the jetpack physics
   * @param force Force vector to apply
   * @param isImpulse Whether this is an impulse (instant) force
   */
  public applyForce(force: BABYLON.Vector3, isImpulse: boolean = false): void {
    if (isImpulse) {
      // For impulse forces, directly modify the velocity
      this.state.velocity.addInPlace(force);
      this.state.speed = this.state.velocity.length();
    } else {
      // For continuous forces, accumulate them for the next update
      this.accumulatedForces.addInPlace(force);
    }
  }
  
  /**
   * Activates the jetpack
   */
  public activate(): void {
    if (this.state.hasFuel) {
      this.state.isActive = true;
      this.state.activeTime = 0;
    }
  }
  
  /**
   * Deactivates the jetpack
   */
  public deactivate(): void {
    this.state.isActive = false;
    this.state.activeTime = 0;
  }
  
  /**
   * Gets the current jetpack state
   * @returns Current jetpack state
   */
  public getState(): JetpackState {
    return { ...this.state };
  }
  
  /**
   * Sets the player's facing direction
   * @param direction Direction vector
   */
  public setFacingDirection(direction: BABYLON.Vector3): void {
    const normalized = direction.normalize();
    
    // Ensure direction is horizontal (y = 0)
    normalized.y = 0;
    
    // Re-normalize if necessary
    if (normalized.lengthSquared() > 0.001) {
      normalized.normalize();
      this.state.facingDirection = normalized;
    }
  }
  
  /**
   * Refills the jetpack fuel
   * @param amount Amount to refill, defaults to max
   */
  public refillFuel(amount?: number): void {
    const refillAmount = amount !== undefined ? amount : this.config.maxFuel;
    this.state.currentFuel = Math.min(
      this.config.maxFuel,
      this.state.currentFuel + refillAmount
    );
    this.state.hasFuel = this.state.currentFuel > 0;
  }
  
  /**
   * Resets the jetpack physics to its initial state
   */
  public reset(): void {
    this.state = {
      isActive: false,
      currentFuel: this.config.maxFuel,
      hasFuel: true,
      velocity: new BABYLON.Vector3(0, 0, 0),
      speed: 0,
      facingDirection: new BABYLON.Vector3(0, 0, 1),
      activeTime: 0
    };
    
    this.accumulatedForces = new BABYLON.Vector3(0, 0, 0);
  }
}
