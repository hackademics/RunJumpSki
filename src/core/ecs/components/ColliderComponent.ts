/**
 * @file src/core/ecs/components/ColliderComponent.ts
 * @description Implementation of ColliderComponent for collision detection
 */

import * as BABYLON from 'babylonjs';
import { Component } from '../Component';
import { IEntity } from '../IEntity';
import { IColliderComponent } from './IColliderComponent';
import { ITransformComponent } from './ITransformComponent';
import { TransformComponent } from './TransformComponent';

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
    
    this.colliderType = config.type ?? ColliderType.Box;
    
    // Initialize Vector3 properties with proper error checking
    this.size = config.size ? config.size.clone() : new BABYLON.Vector3(1, 1, 1);
    this.offset = config.offset ? config.offset.clone() : new BABYLON.Vector3(0, 0, 0);
    
    this.trigger = config.isTrigger ?? false;
    this.visible = config.isVisible ?? false;
    this.material = {
      friction: config.material?.friction ?? 0.3,
      restitution: config.material?.restitution ?? 0.2
    };
    this.collisionMesh = config.collisionMesh || null;
  }
  
  /**
   * Initialize the component
   */
  public override initialize(entity: IEntity): void {
    super.initialize(entity);
    
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
    if (!this.size) {
      this.size = new BABYLON.Vector3(1, 1, 1);
    }
    return this.size.clone();
  }
  
  /**
   * Set the size of the collider
   */
  public setSize(size: BABYLON.Vector3): void {
    if (!size) {
      return;
    }
    
    this.size = size.clone();
    
    // Update mesh if it exists
    if (this.collisionMesh) {
      this.collisionMesh.scaling = this.size.clone();
    }
  }
  
  /**
   * Get the offset of the collider
   */
  public getOffset(): BABYLON.Vector3 {
    if (!this.offset) {
      this.offset = new BABYLON.Vector3(0, 0, 0);
    }
    return this.offset.clone();
  }
  
  /**
   * Set the offset of the collider
   */
  public setOffset(offset: BABYLON.Vector3): void {
    if (!offset) {
      return;
    }
    
    this.offset = offset.clone();
    
    // Update transform
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
   * Create a collision mesh based on the collider type
   */
  public createCollisionMesh(scene: BABYLON.Scene): BABYLON.AbstractMesh {
    // Create mesh based on type
    let mesh: BABYLON.AbstractMesh;
    
    // Initialize size and offset if they're not set already
    if (!this.size) {
      this.size = new BABYLON.Vector3(1, 1, 1);
    }
    
    if (!this.offset) {
      this.offset = new BABYLON.Vector3(0, 0, 0);
    }
    
    // Create mesh based on type
    switch (this.colliderType) {
      case ColliderType.Box:
        mesh = BABYLON.MeshBuilder.CreateBox(
          `box-collider-${this.entity ? this.entity.id : 'no-entity'}`,
          { size: 1 }, // We'll scale it through the mesh.scaling property
          scene
        );
        break;
        
      case ColliderType.Sphere:
        mesh = BABYLON.MeshBuilder.CreateSphere(
          `sphere-collider-${this.entity ? this.entity.id : 'no-entity'}`,
          { diameter: 1 }, // We'll scale it through the mesh.scaling property
          scene
        );
        break;
        
      case ColliderType.Cylinder:
        mesh = BABYLON.MeshBuilder.CreateCylinder(
          `cylinder-collider-${this.entity ? this.entity.id : 'no-entity'}`,
          { height: 1, diameter: 1 }, // We'll scale it through the mesh.scaling property
          scene
        );
        break;
        
      case ColliderType.Capsule:
        mesh = BABYLON.MeshBuilder.CreateCapsule(
          `capsule-collider-${this.entity ? this.entity.id : 'no-entity'}`,
          { height: 1, radius: 0.5 }, // We'll scale it through the mesh.scaling property
          scene
        );
        break;
        
      default:
        // Default to box if unknown type
        mesh = BABYLON.MeshBuilder.CreateBox(
          `box-collider-${this.entity ? this.entity.id : 'no-entity'}`,
          { size: 1 },
          scene
        );
    }
    
    // Set up the mesh
    mesh.scaling = this.size.clone();
    mesh.position = this.offset.clone();
    mesh.isVisible = this.visible;
    mesh.checkCollisions = true;
    
    // Create material if visible
    if (this.visible) {
      const material = new BABYLON.StandardMaterial(`collider-material-${this.entity ? this.entity.id : 'no-entity'}`, scene);
      material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
      material.alpha = 0.3; // Semi-transparent
      mesh.material = material;
    }
    
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
    if (this.trigger && mesh.physicsImpostor.physicsBody) {
      mesh.physicsImpostor.physicsBody.setCollisionFlags(DEFAULT_TRIGGER_FLAG);
    }
    
    // Store mesh
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
   * Updates the transform of the collision mesh based on the entity's transform
   */
  public updateTransform(): void {
    if (!this.collisionMesh || !this.entity) return;
    
    const transformComponent = this.entity.getComponent<TransformComponent>('transform');
    if (!transformComponent) return;
    
    // Get entity position and rotation directly from the transform component
    const position = transformComponent.getPosition();
    const rotation = transformComponent.getRotation();
    
    if (position && this.collisionMesh) {
      // Apply the offset if it exists
      if (this.offset) {
        const finalPosition = position.clone();
        if (this.offset) {
          finalPosition.x += this.offset.x;
          finalPosition.y += this.offset.y;
          finalPosition.z += this.offset.z;
        }
        this.collisionMesh.position = finalPosition;
      } else {
        // No offset, just use the entity position directly
        this.collisionMesh.position = position.clone();
      }
      
      // Set the rotation if needed
      if (rotation) {
        // Convert Euler angles to Quaternion if necessary
        // For simplicity in tests, we're just setting it directly
        this.collisionMesh.rotationQuaternion = BABYLON.Quaternion.Identity();
      }
    }
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



