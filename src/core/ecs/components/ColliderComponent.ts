/**
 * @file src/core/ecs/components/ColliderComponent.ts
 * @description Implementation of ColliderComponent for collision detection
 */

import * as BABYLON from 'babylonjs';
import { Component } from '../Component';
import { IEntity } from '../IEntity';
import { IColliderComponent } from './IColliderComponent';
import { ITransformComponent } from './ITransformComponent';

/**
 * Collider types for different collision shapes
 */
export enum ColliderType {
  Box = 'box',
  Sphere = 'sphere',
  Capsule = 'capsule',
  Cylinder = 'cylinder',
  Mesh = 'mesh'
}

/**
 * Configuration options for ColliderComponent
 */
export interface ColliderComponentOptions {
  /**
   * The type of collider
   */
  type?: ColliderType;
  
  /**
   * The size of the collider
   */
  size?: BABYLON.Vector3;
  
  /**
   * The offset from the entity's position
   */
  offset?: BABYLON.Vector3;
  
  /**
   * Whether the collider is a trigger (no physical response)
   */
  isTrigger?: boolean;
  
  /**
   * Whether the collider is visible (for debugging)
   */
  isVisible?: boolean;
  
  /**
   * Material properties for the collider
   */
  material?: {
    /**
     * The material's friction
     */
    friction?: number;
    
    /**
     * The material's restitution (bounciness)
     */
    restitution?: number;
  };
  
  /**
   * An existing mesh to use for collision
   */
  collisionMesh?: BABYLON.AbstractMesh | null;
}

/**
 * Default options for ColliderComponent
 */
export const DEFAULT_COLLIDER_OPTIONS: ColliderComponentOptions = {
  type: ColliderType.Box,
  size: new BABYLON.Vector3(1, 1, 1),
  offset: new BABYLON.Vector3(0, 0, 0),
  isTrigger: false,
  isVisible: false,
  material: {
    friction: 0.3,
    restitution: 0.2
  },
  collisionMesh: null
};

// Constant for trigger flag since it doesn't exist in BabylonJS typings
const DEFAULT_TRIGGER_FLAG = 4; // Value typically used for trigger detection in physics engines

/**
 * Implementation of Collider component
 * Handles collision shapes and detection
 */
export class ColliderComponent extends Component implements IColliderComponent {
  /**
   * The component type
   */
  public readonly type: string = 'collider';
  
  /**
   * The type of collider
   */
  private colliderType: ColliderType;
  
  /**
   * The size of the collider
   */
  private size: BABYLON.Vector3;
  
  /**
   * The offset from the entity's position
   */
  private offset: BABYLON.Vector3;
  
  /**
   * Whether the collider is a trigger
   */
  private trigger: boolean;
  
  /**
   * Whether the collider is visible
   */
  private visible: boolean;
  
  /**
   * Material properties
   */
  private material: {
    friction: number;
    restitution: number;
  };
  
  /**
   * The collision mesh
   */
  private collisionMesh: BABYLON.AbstractMesh | null;
  
  /**
   * Callback for collision events
   */
  private collisionCallback: ((collidedWith: BABYLON.AbstractMesh, point: BABYLON.Vector3) => void) | null = null;
  
  /**
   * Create a new ColliderComponent
   */
  constructor(options: Partial<ColliderComponentOptions> = {}) {
    super({ type: 'collider' });
    
    // Merge with default options
    const config = { ...DEFAULT_COLLIDER_OPTIONS, ...options };
    
    this.colliderType = config.type!;
    this.size = config.size!.clone();
    this.offset = config.offset!.clone();
    this.trigger = config.isTrigger!;
    this.visible = config.isVisible!;
    this.material = {
      friction: config.material?.friction || DEFAULT_COLLIDER_OPTIONS.material!.friction!,
      restitution: config.material?.restitution || DEFAULT_COLLIDER_OPTIONS.material!.restitution!
    };
    this.collisionMesh = config.collisionMesh || null;
  }
  
  /**
   * Initialize the component
   */
  public override init(entity: IEntity): void {
    super.init(entity);
    
    // Create collision mesh if it doesn't exist
    if (!this.collisionMesh) {
      const scene = BABYLON.Engine.Instances[0].scenes[0]; // Get current scene
      this.createCollisionMesh(scene);
    }
    
    // Update transform initially
    this.updateTransform();
  }
  
  /**
   * Update the component
   */
  public override update(deltaTime: number): void {
    if (!this.isEnabled()) return;
    
    // Update transform on every frame
    this.updateTransform();
  }
  
  /**
   * Clean up resources
   */
  public override dispose(): void {
    if (this.collisionMesh) {
      this.collisionMesh.dispose();
      this.collisionMesh = null;
    }
    
    this.collisionCallback = null;
    
    super.dispose();
  }
  
  /**
   * Get the collider type
   */
  public getColliderType(): string {
    return this.colliderType;
  }
  
  /**
   * Get the collision mesh
   */
  public getCollisionMesh(): BABYLON.AbstractMesh | null {
    return this.collisionMesh;
  }
  
  /**
   * Set the collision mesh
   */
  public setCollisionMesh(mesh: BABYLON.AbstractMesh | null): void {
    // Clean up existing mesh if there is one
    if (this.collisionMesh) {
      this.collisionMesh.dispose();
    }
    
    this.collisionMesh = mesh;
    
    if (this.collisionMesh) {
      // Set up the new mesh with the current settings
      this.collisionMesh.isVisible = this.visible;
      this.collisionMesh.checkCollisions = true;
      
      // Set material properties
      if (this.collisionMesh.physicsImpostor) {
        this.collisionMesh.physicsImpostor.friction = this.material.friction;
        this.collisionMesh.physicsImpostor.restitution = this.material.restitution;
      }
      
      // Update transform
      this.updateTransform();
    }
  }
  
  /**
   * Check if the collider is a trigger
   */
  public isTrigger(): boolean {
    return this.trigger;
  }
  
  /**
   * Set whether the collider is a trigger
   */
  public setTrigger(isTrigger: boolean): void {
    this.trigger = isTrigger;
    
    if (this.collisionMesh && this.collisionMesh.physicsImpostor) {
      // Apply trigger property to physics impostor
      this.collisionMesh.physicsImpostor.physicsBody.setCollisionFlags(
        isTrigger ? DEFAULT_TRIGGER_FLAG : 0
      );
    }
  }
  
  /**
   * Get the size of the collider
   */
  public getSize(): BABYLON.Vector3 {
    return this.size.clone();
  }
  
  /**
   * Set the size of the collider
   */
  public setSize(size: BABYLON.Vector3): void {
    this.size = size.clone();
    
    // If we have a collision mesh, we need to update its size
    if (this.collisionMesh) {
      // For primitives, we can update the scaling
      this.collisionMesh.scaling = this.size.clone();
      
      // For more complex shapes, we might need to recreate the mesh
      if (this.collisionMesh.physicsImpostor) {
        // Remove the old impostor
        this.collisionMesh.physicsImpostor.dispose();
        
        // Create a new one with the updated size
        this.collisionMesh.physicsImpostor = new BABYLON.PhysicsImpostor(
          this.collisionMesh,
          this.getPhysicsImpostorType(),
          {
            mass: 0, // Colliders are typically static
            friction: this.material.friction,
            restitution: this.material.restitution
          }
        );
      }
    }
  }
  
  /**
   * Get the offset of the collider
   */
  public getOffset(): BABYLON.Vector3 {
    return this.offset.clone();
  }
  
  /**
   * Set the offset of the collider
   */
  public setOffset(offset: BABYLON.Vector3): void {
    this.offset = offset.clone();
    
    // Update the position based on the new offset
    this.updateTransform();
  }
  
  /**
   * Check if the collider is visible
   */
  public isVisible(): boolean {
    return this.visible;
  }
  
  /**
   * Set whether the collider is visible
   */
  public setVisible(visible: boolean): void {
    this.visible = visible;
    
    if (this.collisionMesh) {
      this.collisionMesh.isVisible = this.visible;
      
      // If visible, use a semi-transparent material for debugging
      if (this.visible && this.collisionMesh.material === null) {
        const scene = this.collisionMesh.getScene();
        const material = new BABYLON.StandardMaterial('collider_material', scene);
        material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
        material.alpha = 0.3; // Semi-transparent
        this.collisionMesh.material = material;
      }
    }
  }
  
  /**
   * Create a collision mesh with the current settings
   */
  public createCollisionMesh(scene: BABYLON.Scene): BABYLON.AbstractMesh {
    let mesh: BABYLON.AbstractMesh;
    
    // Create mesh based on collider type
    switch (this.colliderType) {
      case ColliderType.Box:
        mesh = BABYLON.MeshBuilder.CreateBox('collider_' + (this.entity?.id || 'unknown'), {
          width: 1,
          height: 1,
          depth: 1
        }, scene);
        break;
        
      case ColliderType.Sphere:
        mesh = BABYLON.MeshBuilder.CreateSphere('collider_' + (this.entity?.id || 'unknown'), {
          diameter: 1
        }, scene);
        break;
        
      case ColliderType.Capsule:
        mesh = BABYLON.MeshBuilder.CreateCapsule('collider_' + (this.entity?.id || 'unknown'), {
          radius: 0.5,
          height: 2
        }, scene);
        break;
        
      case ColliderType.Cylinder:
        mesh = BABYLON.MeshBuilder.CreateCylinder('collider_' + (this.entity?.id || 'unknown'), {
          diameter: 1,
          height: 1
        }, scene);
        break;
        
      case ColliderType.Mesh:
      default:
        // Default to box if mesh type is used without a custom mesh
        mesh = BABYLON.MeshBuilder.CreateBox('collider_' + (this.entity?.id || 'unknown'), {
          width: 1,
          height: 1,
          depth: 1
        }, scene);
        break;
    }
    
    // Set up the mesh
    mesh.scaling = this.size.clone();
    mesh.position = this.offset.clone();
    mesh.isVisible = this.visible;
    mesh.checkCollisions = true;
    
    // Create physics impostor
    mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
      mesh,
      this.getPhysicsImpostorType(),
      {
        mass: 0, // Colliders are typically static
        friction: this.material.friction,
        restitution: this.material.restitution
      }
    );
    
    // Set as trigger if needed
    if (this.trigger) {
      mesh.physicsImpostor.physicsBody.setCollisionFlags(DEFAULT_TRIGGER_FLAG);
    }
    
    // If visible, apply a semi-transparent material for debugging
    if (this.visible) {
      const material = new BABYLON.StandardMaterial('collider_material', scene);
      material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
      material.alpha = 0.3; // Semi-transparent
      mesh.material = material;
    }
    
    // Set the collision mesh
    this.collisionMesh = mesh;
    
    return mesh;
  }
  
  /**
   * Register a callback for collision events
   */
  public onCollision(callback: (collidedWith: BABYLON.AbstractMesh, point: BABYLON.Vector3) => void): void {
    this.collisionCallback = callback;
    
    if (this.collisionMesh && this.collisionCallback) {
      // Register collision callback via physics system
      if (this.collisionMesh.physicsImpostor) {
        // Use a proper EventData type with the physicsImpostor.onCollideEvent
        this.collisionMesh.physicsImpostor.onCollideEvent = (collider) => {
          if (collider.object instanceof BABYLON.AbstractMesh && this.collisionCallback) {
            // Create a dummy point at the center of the object
            const collisionPoint = collider.object.position.clone();
            this.collisionCallback(collider.object, collisionPoint);
          }
          return true;
        };
      }
      
      // Also register Babylon.js built-in collision system as fallback
      this.collisionMesh.actionManager = new BABYLON.ActionManager(this.collisionMesh.getScene());
      this.collisionMesh.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
          { trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger },
          (event) => {
            if (event.source instanceof BABYLON.AbstractMesh && this.collisionCallback) {
              this.collisionCallback(
                event.source,
                event.source.position.clone() // Approximate collision point
              );
            }
          }
        )
      );
    }
  }
  
  /**
   * Check if a point is inside the collider
   */
  public containsPoint(point: BABYLON.Vector3): boolean {
    if (!this.collisionMesh) return false;
    
    // Transform the point to local space of the collider
    const localPoint = BABYLON.Vector3.TransformCoordinates(
      point,
      this.collisionMesh.getWorldMatrix().clone().invert()
    );
    
    // Check based on collider type
    switch (this.colliderType) {
      case ColliderType.Box:
        return (
          localPoint.x >= -0.5 && localPoint.x <= 0.5 &&
          localPoint.y >= -0.5 && localPoint.y <= 0.5 &&
          localPoint.z >= -0.5 && localPoint.z <= 0.5
        );
        
      case ColliderType.Sphere:
        return localPoint.length() <= 0.5;
        
      case ColliderType.Cylinder:
        return (
          localPoint.y >= -0.5 && localPoint.y <= 0.5 &&
          Math.sqrt(localPoint.x * localPoint.x + localPoint.z * localPoint.z) <= 0.5
        );
        
      case ColliderType.Capsule:
        const height = 2;
        const radius = 0.5;
        
        // Check if point is in the cylindrical part
        if (localPoint.y >= -height/2 + radius && localPoint.y <= height/2 - radius) {
          return Math.sqrt(localPoint.x * localPoint.x + localPoint.z * localPoint.z) <= radius;
        }
        
        // Check if point is in either hemisphere
        if (localPoint.y < -height/2 + radius) {
          const center = new BABYLON.Vector3(0, -height/2 + radius, 0);
          return BABYLON.Vector3.Distance(localPoint, center) <= radius;
        }
        
        if (localPoint.y > height/2 - radius) {
          const center = new BABYLON.Vector3(0, height/2 - radius, 0);
          return BABYLON.Vector3.Distance(localPoint, center) <= radius;
        }
        
        return false;
        
      case ColliderType.Mesh:
        // Point-in-mesh test is complex - we'll use a simple bounding box check as approximation
        return (
          localPoint.x >= -0.5 && localPoint.x <= 0.5 &&
          localPoint.y >= -0.5 && localPoint.y <= 0.5 &&
          localPoint.z >= -0.5 && localPoint.z <= 0.5
        );
        
      default:
        return false;
    }
  }
  
  /**
   * Resize the collider based on a mesh
   */
  public fitToMesh(mesh: BABYLON.AbstractMesh, scale: number = 1.0): void {
    if (!mesh) return;
    
    // Get the mesh's bounding box
    const boundingBox = mesh.getBoundingInfo().boundingBox;
    
    // Calculate size based on the bounding box
    const boxSize = boundingBox.maximum.subtract(boundingBox.minimum);
    this.size = boxSize.scale(scale);
    
    // Calculate offset based on the bounding box center
    this.offset = boundingBox.center.clone();
    
    // Update or recreate the collision mesh
    if (this.collisionMesh) {
      this.collisionMesh.scaling = this.size.clone();
      this.collisionMesh.position = this.offset.clone();
      
      // Update the physics impostor
      if (this.collisionMesh.physicsImpostor) {
        this.collisionMesh.physicsImpostor.dispose();
        this.collisionMesh.physicsImpostor = new BABYLON.PhysicsImpostor(
          this.collisionMesh,
          this.getPhysicsImpostorType(),
          {
            mass: 0,
            friction: this.material.friction,
            restitution: this.material.restitution
          }
        );
      }
    } else {
      const scene = mesh.getScene();
      this.createCollisionMesh(scene);
    }
  }
  
  /**
   * Update the collider's transform from the entity
   */
  public updateTransform(): void {
    if (!this.entity || !this.collisionMesh) return;
    
    const transformComponent = this.entity.getComponent<ITransformComponent>('transform');
    if (!transformComponent) return;
    
    const worldMatrix = transformComponent.getWorldMatrix();
    
    // Apply offset in local space
    const offsetMatrix = BABYLON.Matrix.Translation(this.offset.x, this.offset.y, this.offset.z);
    const finalMatrix = offsetMatrix.multiply(worldMatrix);
    
    // Extract position and rotation
    const position = new BABYLON.Vector3();
    const rotation = new BABYLON.Quaternion();
    const scaling = new BABYLON.Vector3();
    
    finalMatrix.decompose(scaling, rotation, position);
    
    // Apply to collision mesh
    this.collisionMesh.position.copyFrom(position);
    this.collisionMesh.rotationQuaternion = rotation.clone();
    this.collisionMesh.scaling.copyFrom(this.size);
  }
  
  /**
   * Get the physics impostor type based on collider type
   */
  private getPhysicsImpostorType(): number {
    switch (this.colliderType) {
      case ColliderType.Box:
        return BABYLON.PhysicsImpostor.BoxImpostor;
        
      case ColliderType.Sphere:
        return BABYLON.PhysicsImpostor.SphereImpostor;
        
      case ColliderType.Cylinder:
        return BABYLON.PhysicsImpostor.CylinderImpostor;
        
      case ColliderType.Capsule:
        // Capsule isn't directly supported in all physics engines
        return BABYLON.PhysicsImpostor.CapsuleImpostor;
        
      case ColliderType.Mesh:
        return BABYLON.PhysicsImpostor.MeshImpostor;
        
      default:
        return BABYLON.PhysicsImpostor.BoxImpostor;
    }
  }
}

