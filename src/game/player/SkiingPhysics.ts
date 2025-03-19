/**
 * @file src/game/player/SkiingPhysics.ts
 * @description Implementation of skiing physics for the player
 */

import * as BABYLON from 'babylonjs';
import { 
  ISkiingPhysics, 
  SkiingPhysicsConfig, 
  SkiingState, 
  SkiingInput 
} from './ISkiingPhysics';
import { TerrainSurfaceInfo } from '../../core/physics/ITerrainCollider';

/**
 * Default configuration for skiing physics
 */
export const DEFAULT_SKIING_CONFIG: SkiingPhysicsConfig = {
  maxSpeed: 30,
  baseFriction: 0.1,
  minSkiSlope: 0.1, // About 5.7 degrees
  maxAcceleration: 20,
  airControl: 0.2,
  airFriction: 0.01,
  downhillMultiplier: 1.5,
  uphillPenalty: 2.0,
  turnSpeed: 2.0
};

/**
 * Implementation of skiing physics that handles slope-based movement
 */
export class SkiingPhysics implements ISkiingPhysics {
  private config: SkiingPhysicsConfig;
  private state: SkiingState;
  private accumulatedForces: BABYLON.Vector3;
  
  /**
   * Creates a new instance of skiing physics
   */
  constructor() {
    this.config = { ...DEFAULT_SKIING_CONFIG };
    
    // Initialize the skiing state
    this.state = {
      isSkiing: false,
      isGrounded: false,
      velocity: new BABYLON.Vector3(0, 0, 0),
      speed: 0,
      acceleration: new BABYLON.Vector3(0, 0, 0),
      facingDirection: new BABYLON.Vector3(0, 0, 1),
      surfaceInfo: {
        exists: false,
        height: 0,
        normal: new BABYLON.Vector3(0, 1, 0),
        slope: 0,
        friction: this.config.baseFriction
      },
      skiingTime: 0
    };
    
    this.accumulatedForces = new BABYLON.Vector3(0, 0, 0);
  }
  
  /**
   * Initializes the skiing physics
   * @param config The skiing physics configuration
   */
  public initialize(config: Partial<SkiingPhysicsConfig> = {}): void {
    // Merge the provided config with the default config
    this.config = {
      ...DEFAULT_SKIING_CONFIG,
      ...config
    };
    
    this.reset();
  }
  
  /**
   * Updates the skiing physics based on input and terrain
   * @param deltaTime Time elapsed since the last update in seconds
   * @param input Current input state
   * @param surfaceInfo Current terrain surface information
   * @param isGrounded Whether the player is currently on the ground
   * @param currentVelocity Current velocity vector of the player
   * @returns Updated velocity vector
   */
  public update(
    deltaTime: number,
    input: SkiingInput,
    surfaceInfo: TerrainSurfaceInfo,
    isGrounded: boolean,
    currentVelocity: BABYLON.Vector3
  ): BABYLON.Vector3 {
    // Update the state
    this.state.isGrounded = isGrounded;
    this.state.surfaceInfo = surfaceInfo;
    this.state.velocity = currentVelocity.clone();
    this.state.speed = currentVelocity.length();
    
    // Update whether skiing is active based on input
    if (input.ski && !this.state.isSkiing) {
      this.startSkiing();
    } else if (!input.ski && this.state.isSkiing) {
      this.stopSkiing();
    }
    
    // If not skiing, just return the current velocity
    if (!this.state.isSkiing) {
      return currentVelocity.clone();
    }
    
    // Update skiing time counter
    this.state.skiingTime += deltaTime;
    
    // Apply turning based on input
    this.applyTurning(input, deltaTime);
    
    // Calculate skiing acceleration based on slope
    const acceleration = this.calculateSkiingAcceleration(surfaceInfo, isGrounded);
    
    // Apply input-based control
    this.applyInputControl(input, isGrounded, acceleration);
    
    // Apply accumulated forces
    if (!this.accumulatedForces.equalsWithEpsilon(BABYLON.Vector3.Zero(), 0.001)) {
      acceleration.addInPlace(this.accumulatedForces);
      this.accumulatedForces = BABYLON.Vector3.Zero();
    }
    
    // Update the velocity based on acceleration
    let newVelocity = currentVelocity.add(acceleration.scale(deltaTime));
    
    // Apply friction
    this.applyFriction(newVelocity, isGrounded, surfaceInfo, deltaTime);
    
    // Enforce maximum speed
    const speed = newVelocity.length();
    if (speed > this.config.maxSpeed) {
      newVelocity = newVelocity.normalize().scale(this.config.maxSpeed);
    }
    
    // Update the state with new values
    this.state.velocity = newVelocity.clone();
    this.state.speed = newVelocity.length();
    this.state.acceleration = acceleration.clone();
    
    return newVelocity;
  }
  
  /**
   * Applies turning based on input
   * @param input The current input state
   * @param deltaTime Time elapsed since the last update
   */
  private applyTurning(input: SkiingInput, deltaTime: number): void {
    if (Math.abs(input.right) < 0.05) return;
    
    // Create a rotation quaternion based on the right input
    const turnAmount = input.right * this.config.turnSpeed * deltaTime;
    const rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Up(), turnAmount);
    
    // Apply the rotation to the facing direction
    const rotationMatrix = new BABYLON.Matrix();
    rotationQuaternion.toRotationMatrix(rotationMatrix);
    
    this.state.facingDirection = BABYLON.Vector3.TransformNormal(
      this.state.facingDirection,
      rotationMatrix
    );
    
    // Apply partial turning to velocity if grounded and skiing
    if (this.state.isGrounded && this.state.speed > 0.1) {
      // The faster we go, the less turning affects the velocity
      const turnEffectFactor = Math.max(0.1, 1 - this.state.speed / this.config.maxSpeed);
      
      // Create a weaker rotation for the velocity
      const velocityTurnAmount = turnAmount * turnEffectFactor;
      const velocityRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Up(), velocityTurnAmount);
      
      // Create rotation matrix from quaternion
      const velocityRotationMatrix = new BABYLON.Matrix();
      velocityRotation.toRotationMatrix(velocityRotationMatrix);
      
      // Apply the rotation to the velocity
      this.state.velocity = BABYLON.Vector3.TransformNormal(
        this.state.velocity,
        velocityRotationMatrix
      );
    }
  }
  
  /**
   * Calculates the acceleration due to skiing on a slope
   * @param surfaceInfo The terrain surface information
   * @param isGrounded Whether the player is on the ground
   * @returns The acceleration vector
   */
  private calculateSkiingAcceleration(surfaceInfo: TerrainSurfaceInfo, isGrounded: boolean): BABYLON.Vector3 {
    const acceleration = new BABYLON.Vector3(0, 0, 0);
    
    if (!isGrounded || !surfaceInfo.exists) {
      return acceleration;
    }
    
    // Calculate the slope direction (the direction to slide down the slope)
    // This is perpendicular to the normal, pointing downhill
    const normal = surfaceInfo.normal;
    const gravity = new BABYLON.Vector3(0, -9.81, 0);
    
    // Project gravity onto the surface plane
    const gravityProjection = gravity.subtract(
      normal.scale(BABYLON.Vector3.Dot(gravity, normal))
    );
    
    // The acceleration magnitude is based on the slope angle
    // Steeper slopes provide more acceleration
    const slopeAngle = surfaceInfo.slope;
    
    // Only apply skiing acceleration if the slope is steep enough
    if (slopeAngle > this.config.minSkiSlope) {
      // Calculate acceleration magnitude based on slope angle
      // Using sine of the slope angle to get acceleration component parallel to slope
      const accelerationMagnitude = 9.81 * Math.sin(slopeAngle);
      
      // The steeper the slope, the more acceleration
      const accelerationVector = gravityProjection.normalize().scale(accelerationMagnitude);
      
      // Apply downhill multiplier to increase speed on downhill sections
      if (BABYLON.Vector3.Dot(this.state.velocity.normalize(), accelerationVector.normalize()) > 0) {
        accelerationVector.scaleInPlace(this.config.downhillMultiplier);
      } else {
        // Going uphill, apply the penalty
        accelerationVector.scaleInPlace(1 / this.config.uphillPenalty);
      }
      
      // Add the skiing acceleration
      acceleration.addInPlace(accelerationVector);
    }
    
    return acceleration;
  }
  
  /**
   * Applies input-based control to the acceleration
   * @param input The current input state
   * @param isGrounded Whether the player is on the ground
   * @param acceleration The current acceleration vector (modified in place)
   */
  private applyInputControl(input: SkiingInput, isGrounded: boolean, acceleration: BABYLON.Vector3): void {
    // Apply forward/backward input
    if (Math.abs(input.forward) > 0.05) {
      const controlStrength = isGrounded ? 1.0 : this.config.airControl;
      const controlForce = this.state.facingDirection.scale(input.forward * controlStrength * 5.0);
      
      // If on ground, limit control to mostly turning, not accelerating
      if (isGrounded && this.state.speed > 2.0) {
        // Project control force perpendicular to velocity
        const velocity = this.state.velocity.normalize();
        const perpendicular = controlForce.subtract(
          velocity.scale(BABYLON.Vector3.Dot(controlForce, velocity))
        );
        
        // Apply much stronger turning control than acceleration
        acceleration.addInPlace(perpendicular.scale(2.0));
        
        // Apply only a small amount of direct control
        acceleration.addInPlace(controlForce.scale(0.1));
      } else {
        // At slow speeds or in air, apply full control
        acceleration.addInPlace(controlForce);
      }
    }
    
    // Apply jumping if grounded
    if (input.jump && isGrounded) {
      // The jump force should be applied directly through applyForce, not here
      // This is because jump is an impulse, not a continuous acceleration
    }
  }
  
  /**
   * Applies friction to the velocity
   * @param velocity The velocity vector to modify
   * @param isGrounded Whether the player is on the ground
   * @param surfaceInfo The terrain surface information
   * @param deltaTime Time elapsed since the last update
   */
  private applyFriction(
    velocity: BABYLON.Vector3,
    isGrounded: boolean,
    surfaceInfo: TerrainSurfaceInfo,
    deltaTime: number
  ): void {
    // Apply appropriate friction based on whether grounded
    const friction = this.getCurrentFriction();
    
    // Apply friction as a deceleration
    const speed = velocity.length();
    
    if (speed > 0.01) {
      const frictionDeceleration = friction * speed * speed;
      const frictionForce = velocity.normalize().scale(-frictionDeceleration);
      
      // Calculate maximum possible friction based on velocity
      const maxFrictionDelta = speed / deltaTime;
      const frictionMagnitude = Math.min(frictionForce.length(), maxFrictionDelta);
      
      // Apply friction
      if (frictionMagnitude > 0) {
        const normalizedFriction = frictionForce.normalize().scale(frictionMagnitude * deltaTime);
        velocity.addInPlace(normalizedFriction);
      }
    } else {
      // If very slow, just stop completely to avoid tiny movements
      velocity.set(0, 0, 0);
    }
  }
  
  /**
   * Applies a force to the skiing physics
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
   * Activates the skiing state
   */
  public startSkiing(): void {
    this.state.isSkiing = true;
    this.state.skiingTime = 0;
  }
  
  /**
   * Deactivates the skiing state
   */
  public stopSkiing(): void {
    this.state.isSkiing = false;
    this.state.skiingTime = 0;
  }
  
  /**
   * Gets the current skiing state
   * @returns Current skiing physics state
   */
  public getState(): SkiingState {
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
   * Gets the effective friction coefficient based on the current state
   * @returns Current friction coefficient
   */
  public getCurrentFriction(): number {
    if (!this.state.isGrounded) {
      return this.config.airFriction;
    }
    
    if (this.state.isSkiing) {
      // When skiing, use the terrain's friction or a reduced base friction
      if (this.state.surfaceInfo.exists) {
        return this.state.surfaceInfo.friction * 0.5; // Reduce friction while skiing
      }
      return this.config.baseFriction * 0.5;
    }
    
    // When not skiing, use the terrain's friction or default friction
    if (this.state.surfaceInfo.exists) {
      return this.state.surfaceInfo.friction;
    }
    return this.config.baseFriction;
  }
  
  /**
   * Resets the skiing physics to its initial state
   */
  public reset(): void {
    this.state = {
      isSkiing: false,
      isGrounded: false,
      velocity: new BABYLON.Vector3(0, 0, 0),
      speed: 0,
      acceleration: new BABYLON.Vector3(0, 0, 0),
      facingDirection: new BABYLON.Vector3(0, 0, 1),
      surfaceInfo: {
        exists: false,
        height: 0,
        normal: new BABYLON.Vector3(0, 1, 0),
        slope: 0,
        friction: this.config.baseFriction
      },
      skiingTime: 0
    };
    
    this.accumulatedForces = new BABYLON.Vector3(0, 0, 0);
  }
}
