/**
 * @file src/game/player/MovementController.ts
 * @description Controller that manages player movement by connecting physics with game input/components
 */

import * as BABYLON from 'babylonjs';
import { IPlayerPhysics, PlayerInput, MovementMode, PlayerPhysicsState } from './IPlayerPhysics';
import { PlayerPhysics } from './PlayerPhysics';
import { TerrainSurfaceInfo } from '../../core/physics/ITerrainCollider';
import { ITerrainCollider } from '../../core/physics/ITerrainCollider';
import { IInputManager } from '../../core/input/IInputManager';
import { ICameraComponent } from '../../core/ecs/components/ICameraComponent';
import { ITransformComponent } from '../../core/ecs/components/ITransformComponent';
import { ICollisionManager } from '../../core/physics/ICollisionManager';

// Extend IInputManager with game-specific methods that would be implemented
interface IGameInputManager extends IInputManager {
  /**
   * Gets the value of an axis (-1 to 1)
   * @param axis The axis to get
   */
  getAxis(axis: string): number;
  
  /**
   * Gets whether a button is pressed
   * @param button The button to check
   */
  getButton(button: string): boolean;
}

/**
 * Configuration options for the movement controller
 */
export interface MovementControllerConfig {
  /**
   * How quickly the player accelerates to full speed (0-1)
   */
  acceleration: number;
  
  /**
   * How quickly the player comes to a stop (0-1)
   */
  deceleration: number;
  
  /**
   * Maximum camera pitch in radians (looking up/down)
   */
  maxCameraPitch: number;
  
  /**
   * Height of the player capsule in units
   */
  playerHeight: number;
  
  /**
   * Radius of the player capsule in units
   */
  playerRadius: number;
  
  /**
   * Ground check ray distance
   */
  groundCheckDistance: number;
  
  /**
   * Offset distance for ground check to avoid colliding with player's own collider
   */
  groundCheckOffset: number;
  
  /**
   * How far the terrain check rays extend
   */
  terrainRayLength: number;
}

/**
 * Default configuration for the movement controller
 */
export const DEFAULT_MOVEMENT_CONTROLLER_CONFIG: MovementControllerConfig = {
  acceleration: 0.15,
  deceleration: 0.1,
  maxCameraPitch: Math.PI / 2 - 0.1, // Just under 90 degrees
  playerHeight: 1.8,
  playerRadius: 0.5,
  groundCheckDistance: 0.2,
  groundCheckOffset: 0.1,
  terrainRayLength: 5.0
};

/**
 * Controller that manages player movement by connecting physics with game components
 */
export class MovementController {
  private physics: IPlayerPhysics;
  private config: MovementControllerConfig;
  private input: PlayerInput;
  private currentSurfaceInfo: TerrainSurfaceInfo;
  private isGrounded: boolean;
  private yaw: number;
  private pitch: number;
  private movementDirection: BABYLON.Vector3;
  private cameraDirection: BABYLON.Vector3;
  private raycaster: BABYLON.Ray;
  
  // References to external systems
  private inputManager: IGameInputManager | null;
  private terrainCollider: ITerrainCollider | null;
  private collisionManager: ICollisionManager | null;
  private playerTransform: ITransformComponent | null;
  private cameraComponent: ICameraComponent | null;
  private scene: BABYLON.Scene | null;
  private babylonCamera: BABYLON.TargetCamera | null;
  
  /**
   * Creates a new movement controller
   * @param config Configuration options
   */
  constructor(config: Partial<MovementControllerConfig> = {}) {
    // Initialize configuration
    this.config = {
      ...DEFAULT_MOVEMENT_CONTROLLER_CONFIG,
      ...config
    };
    
    // Create the physics system
    this.physics = new PlayerPhysics();
    
    // Initialize input state
    this.input = {
      forward: 0,
      right: 0,
      jump: false,
      sprint: false,
      ski: false,
      jetpack: false,
      thrust: 0
    };
    
    // Initialize look state
    this.yaw = 0;
    this.pitch = 0;
    
    // Initialize physics state
    this.isGrounded = false;
    this.currentSurfaceInfo = {
      exists: false,
      height: 0,
      normal: new BABYLON.Vector3(0, 1, 0),
      slope: 0,
      friction: 0.1,
      materialType: 'default'
    };
    
    // Initialize direction vectors
    this.movementDirection = new BABYLON.Vector3(0, 0, 1);
    this.cameraDirection = new BABYLON.Vector3(0, 0, 1);
    
    // Initialize system references
    this.inputManager = null;
    this.terrainCollider = null;
    this.collisionManager = null;
    this.playerTransform = null;
    this.cameraComponent = null;
    this.scene = null;
    this.babylonCamera = null;
    
    // Initialize raycaster
    this.raycaster = new BABYLON.Ray(
      new BABYLON.Vector3(0, 0, 0),
      new BABYLON.Vector3(0, -1, 0),
      this.config.terrainRayLength
    );
  }
  
  /**
   * Initializes the movement controller
   * @param scene The BabylonJS scene
   * @param inputManager The input manager
   * @param terrainCollider The terrain collider
   * @param collisionManager The collision manager
   * @param playerTransform The player's transform component
   * @param cameraComponent The player's camera component
   */
  public initialize(
    scene: BABYLON.Scene,
    inputManager: IGameInputManager,
    terrainCollider: ITerrainCollider,
    collisionManager: ICollisionManager,
    playerTransform: ITransformComponent,
    cameraComponent: ICameraComponent
  ): void {
    // Store references
    this.scene = scene;
    this.inputManager = inputManager;
    this.terrainCollider = terrainCollider;
    this.collisionManager = collisionManager;
    this.playerTransform = playerTransform;
    this.cameraComponent = cameraComponent;
    
    // Get the Babylon camera and ensure it's a TargetCamera (or derived type)
    const camera = cameraComponent.getCamera();
    if (camera instanceof BABYLON.TargetCamera) {
      this.babylonCamera = camera;
    } else {
      console.warn('Camera is not a TargetCamera, some functionality may be limited');
    }
    
    // Initialize physics system
    this.physics.initialize();
    
    // Initialize player position and rotation
    this.updatePlayerFromTransform();
    
    // Set up collision detection
    this.setupCollisionDetection();
    
    // Start with player looking forward
    this.yaw = 0;
    this.pitch = 0;
    this.updateCameraRotation();
  }
  
  /**
   * Updates the movement controller
   * @param deltaTime Time elapsed since last update in seconds
   */
  public update(deltaTime: number): void {
    if (!this.scene || !this.inputManager || !this.playerTransform || 
        !this.cameraComponent || !this.terrainCollider) {
      return;
    }
    
    // Update input state
    this.updateInputState();
    
    // Update camera rotation from mouse/look input
    this.updateCameraFromInput(deltaTime);
    
    // Update ground check and terrain info
    this.updateGroundState();
    
    // Update physics
    const newVelocity = this.physics.update(
      deltaTime,
      this.input,
      this.currentSurfaceInfo,
      this.isGrounded
    );
    
    // Move the player based on physics
    this.movePlayer(newVelocity, deltaTime);
    
    // Update camera position to follow player
    this.updateCameraPosition();
  }
  
  /**
   * Updates the input state from the input manager
   */
  private updateInputState(): void {
    if (!this.inputManager) return;
    
    // Movement inputs
    this.input.forward = this.inputManager.getAxis('moveForward');
    this.input.right = this.inputManager.getAxis('moveRight');
    
    // Action inputs
    this.input.jump = this.inputManager.getButton('jump');
    this.input.sprint = this.inputManager.getButton('sprint');
    this.input.ski = this.inputManager.getButton('ski');
    this.input.jetpack = this.inputManager.getButton('jetpack');
    this.input.thrust = this.inputManager.getButton('thrust') ? 1.0 : 0.0;
  }
  
  /**
   * Updates the camera rotation based on input
   * @param deltaTime Time elapsed since last update
   */
  private updateCameraFromInput(deltaTime: number): void {
    if (!this.inputManager || !this.babylonCamera) return;
    
    // Get mouse movement
    const mouseDeltaX = this.inputManager.getAxis('lookHorizontal');
    const mouseDeltaY = this.inputManager.getAxis('lookVertical');
    
    // Apply sensitivity
    const sensitivity = 0.002;
    this.yaw += mouseDeltaX * sensitivity;
    this.pitch += mouseDeltaY * sensitivity;
    
    // Clamp pitch to prevent camera flipping
    this.pitch = Math.max(-this.config.maxCameraPitch, 
                          Math.min(this.config.maxCameraPitch, this.pitch));
    
    // Update camera rotation
    this.updateCameraRotation();
    
    // Update the physics system's facing direction (horizontal only)
    const cameraDirection = this.getForwardDirection();
    this.physics.setFacingDirection(new BABYLON.Vector3(
      cameraDirection.x,
      0,
      cameraDirection.z
    ));
  }
  
  /**
   * Updates the camera rotation based on yaw and pitch
   */
  private updateCameraRotation(): void {
    if (!this.babylonCamera) return;
    
    // Create rotation quaternion from yaw and pitch
    const yawQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Up(), this.yaw);
    const pitchQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Right(), this.pitch);
    
    // Combine rotations
    const rotation = yawQuaternion.multiply(pitchQuaternion);
    
    // Apply to camera - BabylonJS cameras may use either rotationQuaternion or rotation
    this.babylonCamera.rotationQuaternion = rotation;
    
    // Update camera direction
    this.cameraDirection = this.getForwardDirection();
  }
  
  /**
   * Gets the forward direction vector based on current yaw
   * @returns Forward direction vector
   */
  private getForwardDirection(): BABYLON.Vector3 {
    // Create forward vector (0, 0, 1) rotated by yaw
    const rotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Up(), this.yaw);
    const rotationMatrix = new BABYLON.Matrix();
    rotation.toRotationMatrix(rotationMatrix);
    
    return BABYLON.Vector3.TransformNormal(
      new BABYLON.Vector3(0, 0, 1),
      rotationMatrix
    );
  }
  
  /**
   * Updates the player's ground state and terrain information
   */
  private updateGroundState(): void {
    if (!this.playerTransform || !this.terrainCollider) return;
    
    // Get player position
    const position = this.playerTransform.getPosition().clone();
    
    // Create ray for ground check
    const rayStart = position.clone();
    rayStart.y += this.config.groundCheckOffset; // Start slightly above player position
    
    this.raycaster.origin = rayStart;
    this.raycaster.direction = new BABYLON.Vector3(0, -1, 0);
    this.raycaster.length = this.config.groundCheckDistance + this.config.groundCheckOffset;
    
    // Check for ground hit
    if (this.collisionManager) {
      const rayEnd = rayStart.clone().add(
        new BABYLON.Vector3(0, -1, 0).scale(this.config.groundCheckDistance + this.config.groundCheckOffset)
      );
      
      const raycastHit = this.collisionManager.raycast(
        rayStart,
        rayEnd
      );
      
      this.isGrounded = raycastHit !== null && raycastHit.hasHit;
    } else {
      this.isGrounded = false;
    }
    
    // Get terrain information
    const terrainRayHit = this.terrainCollider.raycast(
      position,
      new BABYLON.Vector3(0, -1, 0),
      this.config.terrainRayLength
    );
    
    if (terrainRayHit && terrainRayHit.hit) {
      this.currentSurfaceInfo = terrainRayHit.surfaceInfo;
    } else {
      // Default surface info if no terrain hit
      this.currentSurfaceInfo = {
        exists: false,
        height: 0,
        normal: new BABYLON.Vector3(0, 1, 0),
        slope: 0,
        friction: 0.1,
        materialType: 'default'
      };
    }
  }
  
  /**
   * Moves the player based on the physics velocity
   * @param velocity Current velocity vector
   * @param deltaTime Time elapsed since last update
   */
  private movePlayer(velocity: BABYLON.Vector3, deltaTime: number): void {
    if (!this.playerTransform) return;
    
    // Calculate displacement
    const displacement = velocity.scale(deltaTime);
    
    // Get current position
    const currentPosition = this.playerTransform.getPosition();
    
    // Create new position by adding displacement
    const newPosition = currentPosition.add(displacement);
    
    // Apply new position to player transform
    this.playerTransform.setPosition(newPosition);
    
    // Set player rotation to match camera yaw (horizontal only)
    const rotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Up(), this.yaw);
    const rotationVector = new BABYLON.Vector3(0, this.yaw, 0);
    
    // Apply rotation to player transform
    this.playerTransform.setRotation(rotationVector);
  }
  
  /**
   * Updates the camera position to follow the player
   */
  private updateCameraPosition(): void {
    if (!this.playerTransform || !this.babylonCamera) return;
    
    // Position camera at player's eye level
    const playerPosition = this.playerTransform.getPosition();
    const cameraPosition = new BABYLON.Vector3(
      playerPosition.x,
      playerPosition.y + this.config.playerHeight * 0.9, // Eye height
      playerPosition.z
    );
    
    this.babylonCamera.position = cameraPosition;
  }
  
  /**
   * Sets up collision detection for the player
   */
  private setupCollisionDetection(): void {
    if (!this.collisionManager || !this.scene) return;
    
    // Create player collision shape (capsule)
    // This would typically be done by adding a collider component to the player entity
    // in an ECS-based implementation
  }
  
  /**
   * Updates player position and rotation from transform
   */
  private updatePlayerFromTransform(): void {
    if (!this.playerTransform) return;
    
    // Get current rotation
    const rotation = this.playerTransform.getRotation();
    
    // Extract yaw from player rotation (Y component is yaw in euler angles)
    this.yaw = rotation.y;
    
    // Calculate the forward vector from the rotation
    const forward = this.playerTransform.getForward();
    
    // Update physics facing direction (horizontal only)
    this.physics.setFacingDirection(new BABYLON.Vector3(
      forward.x,
      0,
      forward.z
    ));
  }
  
  /**
   * Applies an external force to the player
   * @param force Force vector to apply
   * @param isImpulse Whether this is an impulse force
   */
  public applyForce(force: BABYLON.Vector3, isImpulse: boolean = false): void {
    this.physics.applyForce(force, isImpulse);
  }
  
  /**
   * Refills the player's jetpack fuel
   * @param amount Amount to refill
   */
  public refillJetpackFuel(amount?: number): void {
    this.physics.refillJetpackFuel(amount);
  }
  
  /**
   * Forces a specific movement mode
   * @param mode The movement mode to set
   */
  public setMovementMode(mode: MovementMode): void {
    this.physics.setMovementMode(mode);
  }
  
  /**
   * Gets the current physics state
   * @returns Current player physics state
   */
  public getPhysicsState(): PlayerPhysicsState {
    return this.physics.getState();
  }
  
  /**
   * Gets whether the player is currently on the ground
   * @returns true if the player is grounded
   */
  public isPlayerGrounded(): boolean {
    return this.isGrounded;
  }
  
  /**
   * Gets the player's current surface information
   * @returns Current terrain surface info
   */
  public getCurrentSurface(): TerrainSurfaceInfo {
    return { ...this.currentSurfaceInfo };
  }
  
  /**
   * Gets the player's current forward direction vector
   * @returns Forward direction vector
   */
  public getPlayerDirection(): BABYLON.Vector3 {
    return this.cameraDirection.clone();
  }
  
  /**
   * Resets the controller to its initial state
   */
  public reset(): void {
    this.physics.reset();
    this.isGrounded = false;
    this.yaw = 0;
    this.pitch = 0;
    
    this.updateCameraRotation();
    
    if (this.playerTransform) {
      this.playerTransform.setPosition(new BABYLON.Vector3(0, 2, 0));
      this.playerTransform.setRotation(new BABYLON.Vector3(0, 0, 0));
    }
  }
}
