/**
 * @file src/core/ecs/components/FirstPersonCameraComponent.ts
 * @description Implementation of the FirstPersonCameraComponent for first-person camera controls
 */

import * as BABYLON from 'babylonjs';
import { IEntity } from '../IEntity';
import { CameraComponent, CameraComponentOptions } from './CameraComponent';
import { IFirstPersonCameraComponent } from './IFirstPersonCameraComponent';
import { ITransformComponent } from './ITransformComponent';

/**
 * Configuration options for FirstPersonCameraComponent
 */
export interface FirstPersonCameraComponentOptions extends CameraComponentOptions {
  /**
   * Movement speed of the camera
   */
  movementSpeed?: number;
  
  /**
   * Rotation speed of the camera
   */
  rotationSpeed?: number;
  
  /**
   * Inertia factor (0-1) controlling camera smoothness
   */
  inertia?: number;
  
  /**
   * Minimum vertical angle (in radians)
   */
  minAngle?: number;
  
  /**
   * Maximum vertical angle (in radians)
   */
  maxAngle?: number;
  
  /**
   * Position offset from the target
   */
  positionOffset?: BABYLON.Vector3;
  
  /**
   * Whether controls should be enabled initially
   */
  controlsEnabled?: boolean;
}

/**
 * Default options for FirstPersonCameraComponent
 */
export const DEFAULT_FIRSTPERSONCAMERACOMPONENT_OPTIONS: Partial<FirstPersonCameraComponentOptions> = {
  movementSpeed: 5.0,
  rotationSpeed: 0.005,
  inertia: 0.9,
  minAngle: -Math.PI / 2 + 0.1, // Just above -90 degrees
  maxAngle: Math.PI / 2 - 0.1,  // Just below 90 degrees
  positionOffset: new BABYLON.Vector3(0, 1.8, 0), // Eye height (1.8 units)
  controlsEnabled: true
};

/**
 * Implementation of FirstPersonCamera component
 * Provides first-person camera controls
 */
export class FirstPersonCameraComponent extends CameraComponent implements IFirstPersonCameraComponent {
  public override readonly type: string = 'firstPersonCamera';
  
  /**
   * Movement speed of the camera
   */
  private movementSpeed: number;
  
  /**
   * Rotation speed of the camera
   */
  private rotationSpeed: number;
  
  /**
   * Inertia factor (0-1) controlling camera smoothness
   */
  private inertia: number;
  
  /**
   * Minimum vertical angle (in radians)
   */
  private minAngle: number;
  
  /**
   * Maximum vertical angle (in radians)
   */
  private maxAngle: number;
  
  /**
   * Position offset from the target
   */
  private positionOffset: BABYLON.Vector3;
  
  /**
   * Whether controls are enabled
   */
  private controlsEnabled: boolean;
  
  /**
   * Create a new FirstPersonCameraComponent
   */
  constructor(options: FirstPersonCameraComponentOptions) {
    super(options);
    
    // Merge with default options
    const config = { ...DEFAULT_FIRSTPERSONCAMERACOMPONENT_OPTIONS, ...options };
    
    this.movementSpeed = config.movementSpeed !== undefined ? config.movementSpeed : DEFAULT_FIRSTPERSONCAMERACOMPONENT_OPTIONS.movementSpeed!;
    this.rotationSpeed = config.rotationSpeed !== undefined ? config.rotationSpeed : DEFAULT_FIRSTPERSONCAMERACOMPONENT_OPTIONS.rotationSpeed!;
    this.inertia = config.inertia !== undefined ? config.inertia : DEFAULT_FIRSTPERSONCAMERACOMPONENT_OPTIONS.inertia!;
    this.minAngle = config.minAngle !== undefined ? config.minAngle : DEFAULT_FIRSTPERSONCAMERACOMPONENT_OPTIONS.minAngle!;
    this.maxAngle = config.maxAngle !== undefined ? config.maxAngle : DEFAULT_FIRSTPERSONCAMERACOMPONENT_OPTIONS.maxAngle!;
    this.positionOffset = config.positionOffset ? config.positionOffset.clone() : DEFAULT_FIRSTPERSONCAMERACOMPONENT_OPTIONS.positionOffset!.clone();
    this.controlsEnabled = config.controlsEnabled !== undefined ? config.controlsEnabled : DEFAULT_FIRSTPERSONCAMERACOMPONENT_OPTIONS.controlsEnabled!;
    
    // Configure the camera for first-person
    if (this.camera instanceof BABYLON.FreeCamera) {
      this.camera.angularSensibility = 1 / this.rotationSpeed;
      this.camera.inertia = this.inertia;
      
      // Set angle limits - need to use any cast since these properties are on ArcRotateCamera
      (this.camera as any).upperBetaLimit = this.maxAngle;
      (this.camera as any).lowerBetaLimit = this.minAngle;
    }
  }
  
  /**
   * Initialize the component
   */
  public override init(entity: IEntity): void {
    super.init(entity);
    
    // Ensure proper setup for first-person camera
    this.setupFirstPersonCamera();
  }
  
  /**
   * Update the component
   */
  public override update(deltaTime: number): void {
    if (!this.isEnabled() || !this.controlsEnabled) return;
    
    // Update camera position based on target transform
    if (this.targetTransform) {
      // Get target position
      const targetPosition = this.targetTransform.getPosition();
      
      // Calculate the camera position with offset
      const cameraPosition = targetPosition.add(this.positionOffset);
      
      // Update camera position
      this.camera.position.copyFrom(cameraPosition);
      
      // For first-person, we also want to use the target's rotation for the camera's yaw
      if (this.camera instanceof BABYLON.FreeCamera) {
        const targetRotation = this.targetTransform.getRotation();
        // Only apply yaw (Y rotation) to maintain first-person look control
        (this.camera as any).rotation.y = targetRotation.y;
      }
    }
  }
  
  /**
   * Get the movement speed of the camera
   */
  public getMovementSpeed(): number {
    return this.movementSpeed;
  }
  
  /**
   * Set the movement speed of the camera
   */
  public setMovementSpeed(speed: number): void {
    this.movementSpeed = speed;
    
    // Update the camera speed if it's a FreeLookCamera
    if (this.camera instanceof BABYLON.UniversalCamera) {
      this.camera.speed = this.movementSpeed;
    }
  }
  
  /**
   * Get the rotation speed of the camera
   */
  public getRotationSpeed(): number {
    return this.rotationSpeed;
  }
  
  /**
   * Set the rotation speed of the camera
   */
  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
    
    // Update the camera angular sensitivity
    if (this.camera instanceof BABYLON.FreeCamera) {
      this.camera.angularSensibility = 1 / this.rotationSpeed;
    }
  }
  
  /**
   * Get the inertia factor controlling camera smoothness
   */
  public getInertia(): number {
    return this.inertia;
  }
  
  /**
   * Set the inertia factor controlling camera smoothness
   */
  public setInertia(inertia: number): void {
    this.inertia = Math.max(0, Math.min(1, inertia)); // Clamp between 0-1
    
    if (this.camera instanceof BABYLON.FreeCamera) {
      this.camera.inertia = this.inertia;
    }
  }
  
  /**
   * Get the camera's vertical angle limits
   */
  public getAngleLimits(): { min: number; max: number } {
    return {
      min: this.minAngle,
      max: this.maxAngle
    };
  }
  
  /**
   * Set the camera's vertical angle limits
   */
  public setAngleLimits(min: number, max: number): void {
    this.minAngle = min;
    this.maxAngle = max;
    
    if (this.camera instanceof BABYLON.FreeCamera) {
      // Need to use any cast since these properties are on ArcRotateCamera
      (this.camera as any).upperBetaLimit = this.maxAngle;
      (this.camera as any).lowerBetaLimit = this.minAngle;
    }
  }
  
  /**
   * Get the camera's position offset from the target
   */
  public getPositionOffset(): BABYLON.Vector3 {
    return this.positionOffset.clone();
  }
  
  /**
   * Set the camera's position offset from the target
   */
  public setPositionOffset(offset: BABYLON.Vector3): void {
    this.positionOffset.copyFrom(offset);
  }
  
  /**
   * Enable/disable first-person camera controls
   */
  public enableControls(enabled: boolean): void {
    this.controlsEnabled = enabled;
    
    if (enabled) {
      this.attachControl();
    } else {
      this.detachControl();
    }
  }
  
  /**
   * Check if first-person camera controls are enabled
   */
  public isControlsEnabled(): boolean {
    return this.controlsEnabled;
  }
  
  /**
   * Setup specific configuration for first-person camera
   */
  private setupFirstPersonCamera(): void {
    // Replace with Universal Camera if needed for better controls
    if (!(this.camera instanceof BABYLON.UniversalCamera)) {
      const position = this.camera.position.clone();
      const rotation = (this.camera as any).rotation ? (this.camera as any).rotation.clone() : new BABYLON.Vector3();
      
      // Create a new universal camera for better first-person controls
      const universalCamera = new BABYLON.UniversalCamera(
        `firstperson-${Date.now()}`,
        position,
        this.scene
      );
      
      // Copy properties from the old camera
      universalCamera.fov = this.getFov();
      universalCamera.minZ = this.getNearClip();
      universalCamera.maxZ = this.getFarClip();
      universalCamera.rotation = rotation;
      
      // Additional first-person settings
      universalCamera.speed = this.movementSpeed;
      universalCamera.angularSensibility = 1 / this.rotationSpeed;
      universalCamera.inertia = this.inertia;
      
      // Set angle limits - need to use any cast since these properties are on ArcRotateCamera
      (universalCamera as any).upperBetaLimit = this.maxAngle;
      (universalCamera as any).lowerBetaLimit = this.minAngle;
      
      // Replace the camera
      this.setCamera(universalCamera);
      
      // Re-attach control if needed
      if (this.controlsEnabled) {
        this.attachControl();
      }
    }
  }
}

