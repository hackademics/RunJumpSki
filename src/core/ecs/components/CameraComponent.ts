/**
 * @file src/core/ecs/components/CameraComponent.ts
 * @description Implementation of the Camera Component that manages camera functionality
 */

import * as BABYLON from 'babylonjs';
import { Component } from '../Component';
import { IEntity } from '../IEntity';
import { ICameraComponent } from './ICameraComponent';
import { ITransformComponent } from './ITransformComponent';

/**
 * Configuration options for CameraComponent
 */
export interface CameraComponentOptions {
  /**
   * Babylon camera instance
   */
  camera?: BABYLON.Camera;
  
  /**
   * Scene to attach the camera to
   */
  scene: BABYLON.Scene;
  
  /**
   * Field of view in radians (only for perspective cameras)
   */
  fov?: number;
  
  /**
   * Aspect ratio (width/height)
   */
  aspectRatio?: number;
  
  /**
   * Near clip plane distance
   */
  nearClip?: number;
  
  /**
   * Far clip plane distance
   */
  farClip?: number;
  
  /**
   * Target transform to follow
   */
  targetTransform?: ITransformComponent | null;
  
  /**
   * Whether to attach control immediately
   */
  attachControl?: boolean;
  
  /**
   * Whether to set as active camera
   */
  setAsActive?: boolean;
}

/**
 * Default options for CameraComponent
 */
export const DEFAULT_CAMERACOMPONENT_OPTIONS: Partial<CameraComponentOptions> = {
  fov: Math.PI / 4, // 45 degrees
  aspectRatio: 16 / 9,
  nearClip: 0.1,
  farClip: 1000,
  attachControl: true,
  setAsActive: false
};

/**
 * Implementation of Camera component
 * Base class for camera components
 */
export class CameraComponent extends Component implements ICameraComponent {
  public readonly type: string = 'camera';
  
  /**
   * Babylon camera instance
   */
  protected camera: BABYLON.Camera;
  
  /**
   * Scene the camera belongs to
   */
  protected scene: BABYLON.Scene;
  
  /**
   * Target transform the camera should follow
   */
  protected targetTransform: ITransformComponent | null = null;
  
  /**
   * Create a new CameraComponent
   */
  constructor(options: CameraComponentOptions) {
    super({ type: 'camera' });
    
    // Merge with default options
    const config = { ...DEFAULT_CAMERACOMPONENT_OPTIONS, ...options };
    
    this.scene = config.scene;
    
    // If a camera is provided, use it; otherwise create a default
    if (config.camera) {
      this.camera = config.camera;
    } else {
      // Create a default free camera
      this.camera = new BABYLON.FreeCamera(
        `camera-${Date.now()}`,
        new BABYLON.Vector3(0, 0, 0),
        this.scene
      );
      
      // Apply camera settings if it's a perspective camera
      if (this.camera instanceof BABYLON.FreeCamera) {
        if (config.fov !== undefined) {
          this.camera.fov = config.fov;
        }
        
        if (config.aspectRatio !== undefined) {
          // Need to cast to any because aspectRatio exists on UniversalCamera but not FreeCamera
          (this.camera as any).aspectRatio = config.aspectRatio;
        }
      }
      
      // Apply common settings
      this.camera.minZ = config.nearClip !== undefined ? config.nearClip : DEFAULT_CAMERACOMPONENT_OPTIONS.nearClip!;
      this.camera.maxZ = config.farClip !== undefined ? config.farClip : DEFAULT_CAMERACOMPONENT_OPTIONS.farClip!;
    }
    
    // Set target transform if provided
    if (config.targetTransform !== undefined) {
      this.targetTransform = config.targetTransform;
    }
    
    // Attach control if needed
    if (config.attachControl) {
      this.attachControl();
    }
    
    // Set as active camera if needed
    if (config.setAsActive) {
      this.setAsActiveCamera();
    }
  }
  
  /**
   * Initialize the component
   */
  public override init(entity: IEntity): void {
    super.init(entity);
    
    // Try to get a transform component if no target transform is set
    if (!this.targetTransform && entity) {
      const transformComponent = entity.getComponent<ITransformComponent>('transform');
      if (transformComponent) {
        this.targetTransform = transformComponent;
      }
    }
  }
  
  /**
   * Update the component
   */
  public override update(deltaTime: number): void {
    if (!this.isEnabled()) return;
    
    // Update camera position to follow target transform if available
    if (this.targetTransform) {
      const targetPosition = this.targetTransform.getPosition();
      this.camera.position.copyFrom(targetPosition);
      
      // For a basic camera, we just update position
      // Derived classes will override this with more complex behavior
    }
  }
  
  /**
   * Clean up resources
   */
  public override dispose(): void {
    this.detachControl();
    this.targetTransform = null;
    
    // Only dispose the camera if it's not being used by something else
    if (this.camera && !this.camera.isDisposed()) {
      this.camera.dispose();
    }
    
    super.dispose();
  }
  
  /**
   * Get the Babylon camera instance
   */
  public getCamera(): BABYLON.Camera {
    return this.camera;
  }
  
  /**
   * Set the Babylon camera instance
   */
  public setCamera(camera: BABYLON.Camera): void {
    // Clean up the old camera if we created it
    if (this.camera && !this.camera.isDisposed()) {
      this.camera.dispose();
    }
    
    this.camera = camera;
  }
  
  /**
   * Get the aspect ratio of the camera
   */
  public getAspectRatio(): number {
    if (this.camera instanceof BABYLON.FreeCamera) {
      // Need to cast to any because aspectRatio exists on UniversalCamera but not FreeCamera
      return (this.camera as any).aspectRatio || this.scene.getEngine().getAspectRatio(this.camera);
    }
    
    return this.scene.getEngine().getAspectRatio(this.camera);
  }
  
  /**
   * Set the aspect ratio of the camera
   */
  public setAspectRatio(ratio: number): void {
    if (this.camera instanceof BABYLON.FreeCamera) {
      // Need to cast to any because aspectRatio exists on UniversalCamera but not FreeCamera
      (this.camera as any).aspectRatio = ratio;
    }
    // Some camera types don't directly expose aspectRatio
  }
  
  /**
   * Get the field of view of the camera
   */
  public getFov(): number {
    if (this.camera instanceof BABYLON.FreeCamera) {
      return this.camera.fov;
    }
    
    return DEFAULT_CAMERACOMPONENT_OPTIONS.fov!;
  }
  
  /**
   * Set the field of view of the camera
   */
  public setFov(fov: number): void {
    if (this.camera instanceof BABYLON.FreeCamera) {
      this.camera.fov = fov;
    }
    // Some camera types don't have FOV
  }
  
  /**
   * Get the near clip plane distance
   */
  public getNearClip(): number {
    return this.camera.minZ;
  }
  
  /**
   * Set the near clip plane distance
   */
  public setNearClip(near: number): void {
    this.camera.minZ = near;
  }
  
  /**
   * Get the far clip plane distance
   */
  public getFarClip(): number {
    return this.camera.maxZ;
  }
  
  /**
   * Set the far clip plane distance
   */
  public setFarClip(far: number): void {
    this.camera.maxZ = far;
  }
  
  /**
   * Get the target transform
   */
  public getTargetTransform(): ITransformComponent | null {
    return this.targetTransform;
  }
  
  /**
   * Set the target transform
   */
  public setTargetTransform(transform: ITransformComponent | null): void {
    this.targetTransform = transform;
  }
  
  /**
   * Get the scene
   */
  public getScene(): BABYLON.Scene {
    return this.scene;
  }
  
  /**
   * Attach camera control to the canvas
   */
  public attachControl(forceAttach: boolean = false): void {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (canvas) {
      this.camera.attachControl(canvas, true);
    }
  }
  
  /**
   * Detach camera control from the canvas
   */
  public detachControl(): void {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (canvas) {
      this.camera.detachControl();
    }
  }
  
  /**
   * Set this camera as the active camera
   */
  public setAsActiveCamera(): void {
    this.scene.activeCamera = this.camera;
  }
}

