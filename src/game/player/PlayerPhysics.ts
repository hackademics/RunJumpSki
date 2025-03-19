/**
 * @file src/game/player/PlayerPhysics.ts
 * @description Implementation of player physics that combines skiing and jetpack movement
 */

import * as BABYLON from 'babylonjs';
import {
  IPlayerPhysics,
  PlayerPhysicsConfig,
  PlayerPhysicsState,
  PlayerInput,
  MovementMode
} from './IPlayerPhysics';
import { SkiingPhysics, DEFAULT_SKIING_CONFIG } from './SkiingPhysics';
import { JetpackPhysics, DEFAULT_JETPACK_CONFIG } from './JetpackPhysics';
import { TerrainSurfaceInfo } from '../../core/physics/ITerrainCollider';
import { SkiingInput } from './ISkiingPhysics';
import { JetpackInput } from './IJetpackPhysics';

/**
 * Default configuration for player physics
 */
export const DEFAULT_PLAYER_PHYSICS_CONFIG: PlayerPhysicsConfig = {
  skiingConfig: DEFAULT_SKIING_CONFIG,
  jetpackConfig: DEFAULT_JETPACK_CONFIG,
  maxWalkSpeed: 8,
  maxRunSpeed: 15,
  maxFallSpeed: 30,
  jumpForce: 10,
  gravity: 9.81,
  groundFriction: 0.2,
  airFriction: 0.01,
  groundControlMultiplier: 1.0,
  airControlMultiplier: 0.3
};

/**
 * Implementation of player physics that combines skiing and jetpack movement
 */
export class PlayerPhysics implements IPlayerPhysics {
  private config: PlayerPhysicsConfig;
  private state: PlayerPhysicsState;
  private skiingPhysics: SkiingPhysics;
  private jetpackPhysics: JetpackPhysics;
  private accumulatedForces: BABYLON.Vector3;
  
  /**
   * Creates a new instance of player physics
   */
  constructor() {
    // Initialize subsystems
    this.skiingPhysics = new SkiingPhysics();
    this.jetpackPhysics = new JetpackPhysics();
    
    // Set default config
    this.config = { ...DEFAULT_PLAYER_PHYSICS_CONFIG };
    
    // Initialize state
    this.state = {
      movementMode: MovementMode.WALKING,
      isGrounded: false,
      velocity: new BABYLON.Vector3(0, 0, 0),
      speed: 0,
      facingDirection: new BABYLON.Vector3(0, 0, 1),
      surfaceInfo: {
        exists: false,
        height: 0,
        normal: new BABYLON.Vector3(0, 1, 0),
        slope: 0,
        friction: this.config.groundFriction
      },
      modeTime: 0,
      skiingState: this.skiingPhysics.getState(),
      jetpackState: this.jetpackPhysics.getState()
    };
    
    this.accumulatedForces = new BABYLON.Vector3(0, 0, 0);
  }
  
  /**
   * Initializes the player physics
   * @param config The player physics configuration
   */
  public initialize(config: Partial<PlayerPhysicsConfig> = {}): void {
    // Merge the provided config with the default config
    this.config = {
      ...DEFAULT_PLAYER_PHYSICS_CONFIG,
      ...config
    };
    
    // Initialize subsystems
    this.skiingPhysics.initialize(this.config.skiingConfig);
    this.jetpackPhysics.initialize(this.config.jetpackConfig);
    
    this.reset();
  }
  
  /**
   * Updates the player physics based on input and terrain
   * @param deltaTime Time elapsed since the last update in seconds
   * @param input Current input state
   * @param surfaceInfo Current terrain surface information
   * @param isGrounded Whether the player is currently on the ground
   * @returns Updated velocity vector
   */
  public update(
    deltaTime: number,
    input: PlayerInput,
    surfaceInfo: TerrainSurfaceInfo,
    isGrounded: boolean
  ): BABYLON.Vector3 {
    // Update the state
    this.state.isGrounded = isGrounded;
    this.state.surfaceInfo = surfaceInfo;
    
    // Determine movement mode based on input and state
    this.determineMovementMode(input, isGrounded);
    
    // Update mode time
    this.state.modeTime += deltaTime;
    
    // Calculate new velocity based on movement mode
    let newVelocity: BABYLON.Vector3;
    
    switch (this.state.movementMode) {
      case MovementMode.SKIING:
        newVelocity = this.updateSkiing(deltaTime, input, surfaceInfo, isGrounded);
        break;
        
      case MovementMode.JETPACK:
        newVelocity = this.updateJetpack(deltaTime, input, isGrounded);
        break;
        
      case MovementMode.RUNNING:
        newVelocity = this.updateRunning(deltaTime, input, isGrounded);
        break;
        
      case MovementMode.WALKING:
        newVelocity = this.updateWalking(deltaTime, input, isGrounded);
        break;
        
      case MovementMode.AIR:
        newVelocity = this.updateAir(deltaTime, input);
        break;
        
      case MovementMode.SLIDING:
        newVelocity = this.updateSliding(deltaTime, input, surfaceInfo, isGrounded);
        break;
        
      default:
        newVelocity = this.updateWalking(deltaTime, input, isGrounded);
        break;
    }
    
    // Apply gravity if not grounded and not using jetpack
    if (!isGrounded && this.state.movementMode !== MovementMode.JETPACK) {
      newVelocity.y -= this.config.gravity * deltaTime;
      
      // Enforce maximum fall speed
      if (newVelocity.y < -this.config.maxFallSpeed) {
        newVelocity.y = -this.config.maxFallSpeed;
      }
    }
    
    // Apply accumulated forces
    if (!this.accumulatedForces.equalsWithEpsilon(BABYLON.Vector3.Zero(), 0.001)) {
      newVelocity.addInPlace(this.accumulatedForces.scale(deltaTime));
      this.accumulatedForces = BABYLON.Vector3.Zero();
    }
    
    // Update the state with new values
    this.state.velocity = newVelocity.clone();
    this.state.speed = newVelocity.length();
    
    // Update subsystem states
    this.state.skiingState = this.skiingPhysics.getState();
    this.state.jetpackState = this.jetpackPhysics.getState();
    
    return newVelocity;
  }
  
  /**
   * Determines the movement mode based on input and state
   * @param input Current input state
   * @param isGrounded Whether the player is on the ground
   */
  private determineMovementMode(input: PlayerInput, isGrounded: boolean): void {
    const previousMode = this.state.movementMode;
    
    // Priority order:
    // 1. Skiing (if on ground and input.ski is true)
    // 2. Jetpack (if input.jetpack is true and has fuel)
    // 3. Running (if on ground and input.sprint is true)
    // 4. Walking (if on ground)
    // 5. Air (if not on ground)
    
    if (isGrounded) {
      if (input.ski) {
        this.state.movementMode = MovementMode.SKIING;
      } else if (input.sprint) {
        this.state.movementMode = MovementMode.RUNNING;
      } else {
        this.state.movementMode = MovementMode.WALKING;
      }
      
      // Check if on steep slope - force sliding
      if (this.state.surfaceInfo.exists && this.state.surfaceInfo.slope > 0.5) { // About 30 degrees
        this.state.movementMode = MovementMode.SLIDING;
      }
    } else {
      if (input.jetpack && this.state.jetpackState.hasFuel) {
        this.state.movementMode = MovementMode.JETPACK;
      } else {
        this.state.movementMode = MovementMode.AIR;
      }
    }
    
    // If mode changed, reset the mode timer
    if (previousMode !== this.state.movementMode) {
      this.state.modeTime = 0;
    }
  }
  
  /**
   * Updates the physics when skiing
   * @param deltaTime Time elapsed since the last update
   * @param input Current input state
   * @param surfaceInfo Current terrain surface information
   * @param isGrounded Whether the player is on the ground
   * @returns Updated velocity vector
   */
  private updateSkiing(
    deltaTime: number,
    input: PlayerInput,
    surfaceInfo: TerrainSurfaceInfo,
    isGrounded: boolean
  ): BABYLON.Vector3 {
    // Convert player input to skiing input
    const skiingInput: SkiingInput = {
      forward: input.forward,
      right: input.right,
      jump: input.jump,
      ski: true
    };
    
    // Update skiing physics
    return this.skiingPhysics.update(
      deltaTime,
      skiingInput,
      surfaceInfo,
      isGrounded,
      this.state.velocity
    );
  }
  
  /**
   * Updates the physics when using jetpack
   * @param deltaTime Time elapsed since the last update
   * @param input Current input state
   * @param isGrounded Whether the player is on the ground
   * @returns Updated velocity vector
   */
  private updateJetpack(
    deltaTime: number,
    input: PlayerInput,
    isGrounded: boolean
  ): BABYLON.Vector3 {
    // Convert player input to jetpack input
    const jetpackInput: JetpackInput = {
      activate: true,
      forward: input.forward,
      right: input.right,
      thrust: input.thrust > 0 ? input.thrust : 1.0
    };
    
    // Update jetpack physics
    return this.jetpackPhysics.update(
      deltaTime,
      jetpackInput,
      isGrounded,
      this.state.velocity
    );
  }
  
  /**
   * Updates the physics when walking
   * @param deltaTime Time elapsed since the last update
   * @param input Current input state
   * @param isGrounded Whether the player is on the ground
   * @returns Updated velocity vector
   */
  private updateWalking(
    deltaTime: number,
    input: PlayerInput,
    isGrounded: boolean
  ): BABYLON.Vector3 {
    const newVelocity = this.state.velocity.clone();
    
    // Apply jumping if the player presses jump
    if (input.jump && isGrounded) {
      this.jump();
    }
    
    // Apply movement controls
    this.applyMovementControl(
      newVelocity,
      input,
      this.config.maxWalkSpeed,
      deltaTime,
      isGrounded
    );
    
    // Apply friction if on ground
    if (isGrounded) {
      this.applyFriction(newVelocity, this.config.groundFriction, deltaTime);
    }
    
    return newVelocity;
  }
  
  /**
   * Updates the physics when running
   * @param deltaTime Time elapsed since the last update
   * @param input Current input state
   * @param isGrounded Whether the player is on the ground
   * @returns Updated velocity vector
   */
  private updateRunning(
    deltaTime: number,
    input: PlayerInput,
    isGrounded: boolean
  ): BABYLON.Vector3 {
    const newVelocity = this.state.velocity.clone();
    
    // Apply jumping if the player presses jump
    if (input.jump && isGrounded) {
      this.jump();
    }
    
    // Apply movement controls with higher max speed
    this.applyMovementControl(
      newVelocity,
      input,
      this.config.maxRunSpeed,
      deltaTime,
      isGrounded
    );
    
    // Apply friction if on ground
    if (isGrounded) {
      this.applyFriction(newVelocity, this.config.groundFriction, deltaTime);
    }
    
    return newVelocity;
  }
  
  /**
   * Updates the physics when in air (jumping or falling)
   * @param deltaTime Time elapsed since the last update
   * @param input Current input state
   * @returns Updated velocity vector
   */
  private updateAir(deltaTime: number, input: PlayerInput): BABYLON.Vector3 {
    const newVelocity = this.state.velocity.clone();
    
    // Apply air movement controls with limited effect
    this.applyMovementControl(
      newVelocity,
      input,
      this.config.maxWalkSpeed,
      deltaTime,
      false
    );
    
    // Apply air friction
    this.applyFriction(newVelocity, this.config.airFriction, deltaTime);
    
    return newVelocity;
  }
  
  /**
   * Updates the physics when sliding on steep slopes
   * @param deltaTime Time elapsed since the last update
   * @param input Current input state
   * @param surfaceInfo Current terrain surface information
   * @param isGrounded Whether the player is on the ground
   * @returns Updated velocity vector
   */
  private updateSliding(
    deltaTime: number,
    input: PlayerInput,
    surfaceInfo: TerrainSurfaceInfo,
    isGrounded: boolean
  ): BABYLON.Vector3 {
    const newVelocity = this.state.velocity.clone();
    
    if (!isGrounded || !surfaceInfo.exists) {
      return newVelocity;
    }
    
    // Apply jumping if the player presses jump
    if (input.jump) {
      this.jump();
    }
    
    // Calculate the slope direction (the direction to slide down the slope)
    const normal = surfaceInfo.normal;
    const gravity = new BABYLON.Vector3(0, -this.config.gravity, 0);
    
    // Project gravity onto the surface plane to get slide direction
    const slideDirection = gravity.subtract(
      normal.scale(BABYLON.Vector3.Dot(gravity, normal))
    );
    
    // Calculate slide acceleration based on slope angle
    const slopeAngle = surfaceInfo.slope;
    const slideMagnitude = this.config.gravity * Math.sin(slopeAngle);
    
    // Apply slide acceleration
    const slideAcceleration = slideDirection.normalize().scale(slideMagnitude);
    newVelocity.addInPlace(slideAcceleration.scale(deltaTime));
    
    // Apply limited control when sliding
    const controlMultiplier = 0.3; // Reduced control while sliding
    this.applyMovementControl(
      newVelocity,
      input,
      this.config.maxRunSpeed,
      deltaTime,
      true,
      controlMultiplier
    );
    
    // Apply a minimum of friction
    const slidingFriction = Math.min(0.05, surfaceInfo.friction);
    this.applyFriction(newVelocity, slidingFriction, deltaTime);
    
    // Limit maximum sliding speed
    const maxSlideSpeed = this.config.maxRunSpeed * 1.5;
    const speed = newVelocity.length();
    
    if (speed > maxSlideSpeed) {
      newVelocity.scaleInPlace(maxSlideSpeed / speed);
    }
    
    return newVelocity;
  }
  
  /**
   * Applies movement control based on input
   * @param velocity Velocity vector to modify
   * @param input Current input state
   * @param maxSpeed Maximum allowed speed
   * @param deltaTime Time elapsed since the last update
   * @param isGrounded Whether the player is on the ground
   * @param controlMultiplier Optional multiplier for control strength
   */
  private applyMovementControl(
    velocity: BABYLON.Vector3,
    input: PlayerInput,
    maxSpeed: number,
    deltaTime: number,
    isGrounded: boolean,
    controlMultiplier: number = 1.0
  ): void {
    if (Math.abs(input.forward) < 0.05 && Math.abs(input.right) < 0.05) {
      return;
    }
    
    // Base control strength depends on whether grounded
    const baseControlStrength = isGrounded ? 
      this.config.groundControlMultiplier : 
      this.config.airControlMultiplier;
    
    // Calculate move direction from input
    const moveDirection = new BABYLON.Vector3(
      input.right,
      0,
      input.forward
    ).normalize();
    
    // Rotate movement direction to align with facing direction
    const rotationAngle = Math.atan2(
      this.state.facingDirection.x,
      this.state.facingDirection.z
    );
    
    const rotationMatrix = new BABYLON.Matrix();
    const rotationQuaternion = BABYLON.Quaternion.RotationAxis(
      BABYLON.Vector3.Up(),
      rotationAngle
    );
    rotationQuaternion.toRotationMatrix(rotationMatrix);
    
    const worldMoveDirection = BABYLON.Vector3.TransformNormal(
      moveDirection,
      rotationMatrix
    );
    
    // Calculate acceleration force
    const accelerationStrength = 20.0; // Base acceleration
    const controlStrength = baseControlStrength * controlMultiplier;
    const acceleration = worldMoveDirection.scale(
      accelerationStrength * controlStrength
    );
    
    // Apply acceleration to velocity
    velocity.addInPlace(acceleration.scale(deltaTime));
    
    // Limit to max speed (horizontal only)
    const horizontalVelocity = new BABYLON.Vector3(
      velocity.x,
      0,
      velocity.z
    );
    const horizontalSpeed = horizontalVelocity.length();
    
    if (horizontalSpeed > maxSpeed) {
      const scaleFactor = maxSpeed / horizontalSpeed;
      velocity.x *= scaleFactor;
      velocity.z *= scaleFactor;
    }
  }
  
  /**
   * Applies friction to the velocity
   * @param velocity Velocity vector to modify
   * @param friction Friction coefficient
   * @param deltaTime Time elapsed since the last update
   */
  private applyFriction(
    velocity: BABYLON.Vector3,
    friction: number,
    deltaTime: number
  ): void {
    const speed = velocity.length();
    
    if (speed > 0.01) {
      // Apply quadratic friction (higher friction at higher speeds)
      const frictionForce = friction * speed * speed;
      const frictionVector = velocity.normalize().scale(-frictionForce);
      
      // Ensure friction doesn't reverse direction
      const maxFrictionDelta = speed;
      const frictionMagnitude = Math.min(frictionForce, maxFrictionDelta / deltaTime);
      
      // Apply friction
      velocity.addInPlace(
        frictionVector.normalize().scale(frictionMagnitude * deltaTime)
      );
      
      // Stop completely if very slow
      if (velocity.length() < 0.1) {
        velocity.scaleInPlace(0);
      }
    }
  }
  
  /**
   * Applies a force to the player
   * @param force Force vector to apply
   * @param isImpulse Whether this is an impulse (instant) force
   */
  public applyForce(force: BABYLON.Vector3, isImpulse: boolean = false): void {
    if (isImpulse) {
      // For impulse forces, directly modify the velocity
      this.state.velocity.addInPlace(force);
      this.state.speed = this.state.velocity.length();
      
      // Also apply to skiing/jetpack physics so they update properly
      this.skiingPhysics.applyForce(force, true);
      this.jetpackPhysics.applyForce(force, true);
    } else {
      // For continuous forces, accumulate them for the next update
      this.accumulatedForces.addInPlace(force);
    }
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
      
      // Update subsystems
      this.skiingPhysics.setFacingDirection(normalized);
      this.jetpackPhysics.setFacingDirection(normalized);
    }
  }
  
  /**
   * Performs a jump
   * @param extraForce Additional force to apply to the jump
   */
  public jump(extraForce: number = 0): void {
    if (!this.state.isGrounded) return;
    
    // Create jump vector
    const jumpVector = new BABYLON.Vector3(0, this.config.jumpForce + extraForce, 0);
    
    // Apply jump force as impulse
    this.applyForce(jumpVector, true);
  }
  
  /**
   * Gets the current physics state
   * @returns Current player physics state
   */
  public getState(): PlayerPhysicsState {
    return { ...this.state };
  }
  
  /**
   * Refills the jetpack fuel
   * @param amount Amount to refill, defaults to max
   */
  public refillJetpackFuel(amount?: number): void {
    this.jetpackPhysics.refillFuel(amount);
    this.state.jetpackState = this.jetpackPhysics.getState();
  }
  
  /**
   * Forces a specific movement mode
   * @param mode The movement mode to set
   */
  public setMovementMode(mode: MovementMode): void {
    if (this.state.movementMode === mode) return;
    
    this.state.movementMode = mode;
    this.state.modeTime = 0;
    
    // Update subsystems based on new mode
    if (mode === MovementMode.SKIING) {
      this.skiingPhysics.startSkiing();
    } else {
      this.skiingPhysics.stopSkiing();
    }
    
    if (mode === MovementMode.JETPACK) {
      this.jetpackPhysics.activate();
    } else {
      this.jetpackPhysics.deactivate();
    }
  }
  
  /**
   * Resets the player physics to its initial state
   */
  public reset(): void {
    // Reset subsystems
    this.skiingPhysics.reset();
    this.jetpackPhysics.reset();
    
    // Reset state
    this.state = {
      movementMode: MovementMode.WALKING,
      isGrounded: false,
      velocity: new BABYLON.Vector3(0, 0, 0),
      speed: 0,
      facingDirection: new BABYLON.Vector3(0, 0, 1),
      surfaceInfo: {
        exists: false,
        height: 0,
        normal: new BABYLON.Vector3(0, 1, 0),
        slope: 0,
        friction: this.config.groundFriction
      },
      modeTime: 0,
      skiingState: this.skiingPhysics.getState(),
      jetpackState: this.jetpackPhysics.getState()
    };
    
    this.accumulatedForces = new BABYLON.Vector3(0, 0, 0);
  }
}
