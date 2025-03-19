/**
 * @file src/game/player/ICharacterController.ts
 * @description Interface for character controller that handles input, physics, and animation
 */

import * as BABYLON from 'babylonjs';
import { IPlayerPhysics, MovementMode, PlayerPhysicsState } from './IPlayerPhysics';
import { GameInput } from '../input/GameInput';
import { TerrainCollider } from '../../core/physics/TerrainCollider';

/**
 * Character animation states
 */
export enum CharacterAnimationState {
  IDLE = 'idle',
  WALK = 'walk',
  RUN = 'run',
  JUMP = 'jump',
  FALL = 'fall',
  SKI = 'ski',
  SKI_TURN_LEFT = 'ski_turn_left',
  SKI_TURN_RIGHT = 'ski_turn_right',
  JETPACK = 'jetpack',
  SLIDE = 'slide'
}

/**
 * Character controller configuration
 */
export interface CharacterControllerConfig {
  /**
   * Camera follow distance
   */
  cameraDistance: number;
  
  /**
   * Camera height offset
   */
  cameraHeightOffset: number;
  
  /**
   * Camera rotation speed
   */
  cameraRotationSpeed: number;
  
  /**
   * Camera look up/down angle limit
   */
  cameraPitchLimit: number;
  
  /**
   * Mouse sensitivity
   */
  mouseSensitivity: number;
  
  /**
   * Character turning speed
   */
  characterTurnSpeed: number;
  
  /**
   * Character model height
   */
  characterHeight: number;
  
  /**
   * Character model radius
   */
  characterRadius: number;
  
  /**
   * Height above ground to maintain
   */
  groundOffset: number;
  
  /**
   * Whether to auto-adjust position to ground height
   */
  snapToGround: boolean;
  
  /**
   * Whether to use first person view
   */
  useFirstPerson: boolean;
}

/**
 * Current state of the character controller
 */
export interface CharacterControllerState {
  /**
   * Current position
   */
  position: BABYLON.Vector3;
  
  /**
   * Current rotation
   */
  rotation: BABYLON.Quaternion;
  
  /**
   * Current velocity
   */
  velocity: BABYLON.Vector3;
  
  /**
   * Current speed
   */
  speed: number;
  
  /**
   * Current movement mode
   */
  movementMode: MovementMode;
  
  /**
   * Current animation state
   */
  animationState: CharacterAnimationState;
  
  /**
   * Whether the character is grounded
   */
  isGrounded: boolean;
  
  /**
   * Whether the character is moving
   */
  isMoving: boolean;
  
  /**
   * Current camera target position
   */
  cameraTarget: BABYLON.Vector3;
  
  /**
   * Current camera position
   */
  cameraPosition: BABYLON.Vector3;
  
  /**
   * Current camera rotation
   */
  cameraRotation: BABYLON.Vector3;
  
  /**
   * Physics state
   */
  physicsState: PlayerPhysicsState;
}

/**
 * Character controller interface
 */
export interface ICharacterController {
  /**
   * Initialize the character controller
   * @param scene The BabylonJS scene
   * @param position Initial position
   * @param direction Initial facing direction
   * @param config Configuration options
   */
  initialize(
    scene: BABYLON.Scene,
    position: BABYLON.Vector3,
    direction: BABYLON.Vector3,
    config?: Partial<CharacterControllerConfig>
  ): void;
  
  /**
   * Update the character controller
   * @param deltaTime Time elapsed since last update in seconds
   * @returns Updated position vector
   */
  update(deltaTime: number): BABYLON.Vector3;
  
  /**
   * Process input for the character
   * @param input Current game input state
   */
  processInput(input: GameInput): void;
  
  /**
   * Set the terrain collider for ground detection
   * @param terrainCollider The terrain collider to use
   */
  setTerrainCollider(terrainCollider: TerrainCollider): void;
  
  /**
   * Set the character model mesh
   * @param mesh The character mesh
   */
  setCharacterMesh(mesh: BABYLON.Mesh): void;
  
  /**
   * Set the camera used to follow the character
   * @param camera The camera to use
   */
  setCamera(camera: BABYLON.Camera): void;
  
  /**
   * Apply a force to the character
   * @param force Force vector to apply
   * @param isImpulse Whether the force is an impulse
   */
  applyForce(force: BABYLON.Vector3, isImpulse?: boolean): void;
  
  /**
   * Get the character's current position
   * @returns Current position vector
   */
  getPosition(): BABYLON.Vector3;
  
  /**
   * Set the character's position
   * @param position New position vector
   * @param updatePhysics Whether to update physics state
   */
  setPosition(position: BABYLON.Vector3, updatePhysics?: boolean): void;
  
  /**
   * Get the character's current rotation
   * @returns Current rotation quaternion
   */
  getRotation(): BABYLON.Quaternion;
  
  /**
   * Set the character's rotation
   * @param rotation New rotation quaternion or facing direction vector
   */
  setRotation(rotation: BABYLON.Quaternion | BABYLON.Vector3): void;
  
  /**
   * Get the character's current state
   * @returns Current character controller state
   */
  getState(): CharacterControllerState;
  
  /**
   * Toggle between first and third person view
   * @param useFirstPerson Whether to use first person view
   */
  setViewMode(useFirstPerson: boolean): void;
  
  /**
   * Play a specific animation
   * @param animationState The animation state to play
   * @param loop Whether to loop the animation
   * @param speed Animation playback speed
   */
  playAnimation(
    animationState: CharacterAnimationState,
    loop?: boolean,
    speed?: number
  ): void;
  
  /**
   * Set the movement mode
   * @param mode The movement mode to set
   */
  setMovementMode(mode: MovementMode): void;
  
  /**
   * Enable or disable camera control
   * @param enabled Whether camera control is enabled
   */
  enableCameraControl(enabled: boolean): void;
  
  /**
   * Reset the character controller to initial state
   */
  reset(): void;
  
  /**
   * Dispose of the character controller and release resources
   */
  dispose(): void;
}
