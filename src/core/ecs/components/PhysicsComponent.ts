/**
 * @file src/core/ecs/components/PhysicsComponent.ts
 * @description Implementation of PhysicsComponent for physical behavior
 */

import * as BABYLON from 'babylonjs';
import { Component } from '../Component';
import { IEntity } from '../IEntity';
import { IPhysicsComponent } from './IPhysicsComponent';
import { ITransformComponent } from './ITransformComponent';
import { IMeshComponent } from './IMeshComponent';
import { Logger } from '../../utils/Logger';
import { ServiceLocator } from '../../base/ServiceLocator';

/**
 * Physics impostor types
 */
export enum PhysicsImpostorType {
  Box = BABYLON.PhysicsImpostor.BoxImpostor,
  Sphere = BABYLON.PhysicsImpostor.SphereImpostor,
  Cylinder = BABYLON.PhysicsImpostor.CylinderImpostor,
  Mesh = BABYLON.PhysicsImpostor.MeshImpostor,
  Plane = BABYLON.PhysicsImpostor.PlaneImpostor,
  Heightmap = BABYLON.PhysicsImpostor.HeightmapImpostor,
  Particle = BABYLON.PhysicsImpostor.ParticleImpostor,
  ConvexHull = BABYLON.PhysicsImpostor.ConvexHullImpostor
}

/**
 * Configuration options for PhysicsComponent
 */
export interface PhysicsComponentOptions {
  /**
   * The type of physics impostor to use
   */
  impostorType?: PhysicsImpostorType;
  
  /**
   * The mass of the physics body in kilograms
   */
  mass?: number;
  
  /**
   * The restitution (bounciness) value between 0 and 1
   */
  restitution?: number;
  
  /**
   * The friction value between 0 and 1
   */
  friction?: number;
  
  /**
   * Whether the physics body is affected by gravity
   */
  gravityEnabled?: boolean;
  
  /**
   * Whether the physics body is a trigger volume (no physical response)
   */
  isTrigger?: boolean;
  
  /**
   * Initial linear velocity
   */
  linearVelocity?: BABYLON.Vector3;
  
  /**
   * Initial angular velocity
   */
  angularVelocity?: BABYLON.Vector3;
  
  /**
   * Whether to automatically sync the transform when physics update
   */
  autoSyncTransform?: boolean;
  
  /**
   * Whether to create the impostor immediately on initialization
   */
  createImpostorOnInitialize?: boolean;
}

/**
 * Default options for PhysicsComponent
 */
export const DEFAULT_PHYSICS_OPTIONS: PhysicsComponentOptions = {
  impostorType: PhysicsImpostorType.Box,
  mass: 1.0,
  restitution: 0.2,
  friction: 0.2,
  gravityEnabled: true,
  isTrigger: false,
  linearVelocity: new BABYLON.Vector3(0, 0, 0),
  angularVelocity: new BABYLON.Vector3(0, 0, 0),
  autoSyncTransform: true,
  createImpostorOnInitialize: true
};

// Constant for trigger flag since it doesn't exist in BabylonJS typings
const DEFAULT_TRIGGER_FLAG = 4; // Value typically used for trigger detection in physics engines

/**
 * Implementation of Physics component
 * Handles physical interactions and forces
 */
export class PhysicsComponent extends Component implements IPhysicsComponent {
  /**
   * The component type
   */
  public readonly type: string = 'physics';
  
  /**
   * The physics impostor
   */
  private impostor: BABYLON.PhysicsImpostor | null = null;
  
  /**
   * The type of physics impostor
   */
  private impostorType: PhysicsImpostorType;
  
  /**
   * The mass of the physics body
   */
  private mass: number;
  
  /**
   * The restitution (bounciness) of the physics body
   */
  private restitution: number;
  
  /**
   * The friction of the physics body
   */
  private friction: number;
  
  /**
   * Whether gravity affects this physics body
   */
  private gravityEnabled: boolean;
  
  /**
   * Whether this is a trigger volume (no physical response)
   */
  private trigger: boolean;
  
  /**
   * Linear velocity
   */
  private linearVelocity: BABYLON.Vector3;
  
  /**
   * Angular velocity
   */
  private angularVelocity: BABYLON.Vector3;
  
  /**
   * Whether to automatically sync transform
   */
  private autoSyncTransform: boolean;
  
  /**
   * Whether to create impostor on initialization
   */
  private createImpostorOnInitialize: boolean;
  
  /**
   * Callback for collision events
   */
  private collisionCallback: ((collidedWith: BABYLON.PhysicsImpostor, point: BABYLON.Vector3) => void) | null = null;
  
  /**
   * Locked axes of motion (true = locked)
   */
  private lockedMotionAxes: { x: boolean, y: boolean, z: boolean } = { x: false, y: false, z: false };
  
  /**
   * Locked axes of rotation (true = locked)
   */
  private lockedRotationAxes: { x: boolean, y: boolean, z: boolean } = { x: false, y: false, z: false };
  
  /**
   * Logger instance
   */
  protected logger: Logger;
  
  /**
   * Create a new PhysicsComponent
   */
  constructor(options: Partial<PhysicsComponentOptions> = {}) {
    super({ type: 'physics' });
    
    // Initialize logger with default instance
    this.logger = new Logger('PhysicsComponent');
    
    // Try to get the logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        // Add context tag
        this.logger.addTag('PhysicsComponent');
      }
    } catch (e) {
      this.logger.warn(`Failed to get logger from ServiceLocator: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
    
    // Merge with default options
    const config = { ...DEFAULT_PHYSICS_OPTIONS, ...options };
    
    this.impostorType = config.impostorType!;
    this.mass = config.mass!;
    this.restitution = config.restitution!;
    this.friction = config.friction!;
    this.gravityEnabled = config.gravityEnabled!;
    this.trigger = config.isTrigger!;
    
    // Initialize vectors explicitly to avoid potential undefined issues
    this.linearVelocity = new BABYLON.Vector3(0, 0, 0);
    this.angularVelocity = new BABYLON.Vector3(0, 0, 0);
    
    // Copy values from config if provided
    if (config.linearVelocity) {
      this.linearVelocity.copyFrom(config.linearVelocity);
    }
    if (config.angularVelocity) {
      this.angularVelocity.copyFrom(config.angularVelocity);
    }
    
    this.autoSyncTransform = config.autoSyncTransform!;
    this.createImpostorOnInitialize = config.createImpostorOnInitialize!;
    
    this.logger.debug(`Physics component created with mass=${this.mass}, type=${this.impostorType}`);
  }
  
  /**
   * Initialize the component
   */
  public override initialize(entity: IEntity): void {
    super.initialize(entity);
    
    if (this.createImpostorOnInitialize) {
      this.createImpostor();
    }
  }
  
  /**
   * Update the component
   */
  public override update(deltaTime: number): void {
    if (!this.isEnabled() || !this.impostor) return;
    
    // Apply any locked axes constraints
    this.applyLockedAxesConstraints();
    
    // If auto-sync is enabled, update the transform from physics
    if (this.autoSyncTransform) {
      this.syncToTransform();
    }
  }
  
  /**
   * Clean up resources
   */
  public override dispose(): void {
    if (this.impostor) {
      this.impostor.dispose();
      this.impostor = null;
    }
    
    // Reset velocities and clear callbacks
    if (this.linearVelocity) {
      this.linearVelocity.set(0, 0, 0);
    } else {
      this.linearVelocity = new BABYLON.Vector3(0, 0, 0);
    }
    
    if (this.angularVelocity) {
      this.angularVelocity.set(0, 0, 0);
    } else {
      this.angularVelocity = new BABYLON.Vector3(0, 0, 0);
    }
    
    this.collisionCallback = null;
    
    super.dispose();
  }
  
  /**
   * Create the physics impostor
   */
  public createImpostor(): void {
    if (!this.entity) return;
    
    // Get required components
    const transformComponent = this.entity.getComponent<ITransformComponent>('transform');
    const meshComponent = this.entity.getComponent<IMeshComponent>('mesh');
    
    if (!transformComponent) {
      this.logger.error(`PhysicsComponent requires a TransformComponent on the entity ${this.entity.id}`);
      return;
    }
    
    // We need either a mesh component or at least world information from transform
    let impostorParams: any = {
      mass: this.mass,
      friction: this.friction,
      restitution: this.restitution
    };
    
    let mesh: BABYLON.AbstractMesh | null = null;
    
    // If we have a mesh component, use its mesh
    if (meshComponent && meshComponent.getMesh()) {
      mesh = meshComponent.getMesh();
    } 
    // If no mesh, create a dummy one based on transform
    else {
      const worldMatrix = transformComponent.getWorldMatrix();
      const position = new BABYLON.Vector3();
      const rotation = new BABYLON.Quaternion();
      const scaling = new BABYLON.Vector3();
      
      worldMatrix.decompose(scaling, rotation, position);
      
      // Create a hidden mesh using the transform
      const scene = BABYLON.Engine.Instances[0].scenes[0]; // Get current scene
      mesh = BABYLON.MeshBuilder.CreateBox('physics_' + this.entity.id, {
        width: scaling.x,
        height: scaling.y,
        depth: scaling.z
      }, scene);
      
      mesh.position = position;
      mesh.rotationQuaternion = rotation;
      mesh.isVisible = false; // Hide the mesh
    }
    
    if (!mesh) {
      this.logger.error(`Failed to get or create a mesh for physics impostor for entity ${this.entity.id}`);
      return;
    }
    
    // Create the impostor
    this.impostor = new BABYLON.PhysicsImpostor(
      mesh,
      this.impostorType,
      impostorParams
    );
    
    // Set initial state
    this.setGravityEnabled(this.gravityEnabled);
    this.setTrigger(this.trigger);
    
    if (!this.linearVelocity.equals(BABYLON.Vector3.Zero())) {
      this.setLinearVelocity(this.linearVelocity);
    }
    
    if (!this.angularVelocity.equals(BABYLON.Vector3.Zero())) {
      this.setAngularVelocity(this.angularVelocity);
    }
    
    // Register collision callback if one is set
    if (this.collisionCallback) {
      this.registerCollisionCallback();
    }
    
    // Initial sync
    this.syncTransform();
  }
  
  /**
   * Register the collision callback with the impostor
   */
  private registerCollisionCallback(): void {
    if (!this.impostor || !this.collisionCallback) return;
    
    // Use onCollideEvent instead of registerOnPhysicsCollide
    this.impostor.onCollideEvent = (otherImpostor) => {
      if (this.collisionCallback) {
        // Use the center of the object for collision point
        const collisionPoint = this.impostor?.object.getAbsolutePosition() || 
                               new BABYLON.Vector3(0, 0, 0);
        this.collisionCallback(otherImpostor, collisionPoint);
      }
      return true;
    };
  }
  
  /**
   * Get the physics impostor
   */
  public getImpostor(): BABYLON.PhysicsImpostor | null {
    return this.impostor;
  }
  
  /**
   * Set the physics impostor
   */
  public setImpostor(impostor: BABYLON.PhysicsImpostor | null): void {
    // Clean up existing impostor if there is one
    if (this.impostor) {
      this.impostor.dispose();
    }
    
    this.impostor = impostor;
    
    // Apply settings to the new impostor
    if (this.impostor) {
      // Set parameters
      this.impostor.setMass(this.mass);
      this.impostor.setLinearVelocity(this.linearVelocity);
      this.impostor.setAngularVelocity(this.angularVelocity);
      this.impostor.setParam('friction', this.friction);
      this.impostor.setParam('restitution', this.restitution);
      
      // Register collision callback if one is set
      if (this.collisionCallback) {
        this.registerCollisionCallback();
      }
    }
  }
  
  /**
   * Get the mass of the physics body
   */
  public getMass(): number {
    return this.mass;
  }
  
  /**
   * Set the mass of the physics body
   */
  public setMass(mass: number): void {
    this.mass = Math.max(0, mass); // Ensure mass is not negative
    
    if (this.impostor) {
      this.impostor.setMass(this.mass);
    }
  }
  
  /**
   * Get the restitution (bounciness) of the physics body
   */
  public getRestitution(): number {
    return this.restitution;
  }
  
  /**
   * Set the restitution (bounciness) of the physics body
   */
  public setRestitution(restitution: number): void {
    // Clamp restitution between 0 and 1
    this.restitution = Math.max(0, Math.min(1, restitution));
    
    if (this.impostor) {
      this.impostor.setParam('restitution', this.restitution);
    }
  }
  
  /**
   * Get the friction of the physics body
   */
  public getFriction(): number {
    return this.friction;
  }
  
  /**
   * Set the friction of the physics body
   */
  public setFriction(friction: number): void {
    // Clamp friction between 0 and 1
    this.friction = Math.max(0, Math.min(1, friction));
    
    if (this.impostor) {
      this.impostor.setParam('friction', this.friction);
    }
  }
  
  /**
   * Get the linear velocity of the physics body
   */
  public getLinearVelocity(): BABYLON.Vector3 {
    if (this.impostor) {
      return this.impostor.getLinearVelocity() || this.linearVelocity;
    }
    
    return this.linearVelocity;
  }
  
  /**
   * Set the linear velocity of the physics body
   */
  public setLinearVelocity(velocity: BABYLON.Vector3): void {
    this.linearVelocity = velocity.clone();
    
    if (this.impostor) {
      this.impostor.setLinearVelocity(this.linearVelocity);
    }
  }
  
  /**
   * Get the angular velocity of the physics body
   */
  public getAngularVelocity(): BABYLON.Vector3 {
    if (this.impostor) {
      return this.impostor.getAngularVelocity() || this.angularVelocity;
    }
    
    return this.angularVelocity;
  }
  
  /**
   * Set the angular velocity of the physics body
   */
  public setAngularVelocity(velocity: BABYLON.Vector3): void {
    this.angularVelocity = velocity.clone();
    
    if (this.impostor) {
      this.impostor.setAngularVelocity(this.angularVelocity);
    }
  }
  
  /**
   * Apply an impulse force to the physics body
   */
  public applyImpulse(force: BABYLON.Vector3, contactPoint?: BABYLON.Vector3): void {
    if (!this.impostor) return;
    
    if (contactPoint) {
      this.impostor.applyImpulse(force, contactPoint);
    } else {
      this.impostor.applyImpulse(force, this.impostor.getObjectCenter());
    }
  }
  
  /**
   * Apply a continuous force to the physics body
   */
  public applyForce(force: BABYLON.Vector3, contactPoint?: BABYLON.Vector3): void {
    if (!this.impostor) return;
    
    if (contactPoint) {
      this.impostor.applyForce(force, contactPoint);
    } else {
      this.impostor.applyForce(force, this.impostor.getObjectCenter());
    }
  }
  
  /**
   * Apply a torque impulse to the physics body
   * Note: BabylonJS doesn't have a direct method for this in its typings,
   * so we use a workaround. If this doesn't work, use applyImpulse() instead.
   */
  public applyTorqueImpulse(torque: BABYLON.Vector3): void {
    if (!this.impostor) return;
    
    // Apply torque using existing methods
    // Try to access the physics body's applyTorque method if available
    if (this.impostor.physicsBody) {
      const physicsBody = this.impostor.physicsBody;
      
      // Check if applyTorque exists on the physics body
      if ('applyTorque' in physicsBody) {
        // Cast to any to access the method without TypeScript errors
        (physicsBody as any).applyTorque(
          new BABYLON.Vector3(torque.x, torque.y, torque.z)
        );
        return;
      }
    }
    
    // Fallback: calculate torque as a force applied at an offset
    const center = this.impostor.getObjectCenter();
    const offset = new BABYLON.Vector3(1, 0, 0);
    const force = torque.cross(offset);
    this.impostor.applyImpulse(force, center.add(offset));
  }
  
  /**
   * Check if the physics body is affected by gravity
   */
  public isGravityEnabled(): boolean {
    return this.gravityEnabled;
  }
  
  /**
   * Set whether the physics body is affected by gravity
   */
  public setGravityEnabled(enabled: boolean): void {
    this.gravityEnabled = enabled;
    
    if (this.impostor) {
      this.impostor.physicsBody.setGravity(
        enabled ? BABYLON.Vector3.Zero() : new BABYLON.Vector3(0, 0, 0)
      );
    }
  }
  
  /**
   * Check if the physics body is a trigger volume
   */
  public isTrigger(): boolean {
    return this.trigger;
  }
  
  /**
   * Set whether the physics body is a trigger volume
   */
  public setTrigger(isTrigger: boolean): void {
    this.trigger = isTrigger;
    
    if (this.impostor) {
      this.impostor.physicsBody.setCollisionFlags(
        isTrigger ? DEFAULT_TRIGGER_FLAG : 0
      );
    }
  }
  
  /**
   * Lock specified axes of motion
   */
  public lockMotion(lockX: boolean, lockY: boolean, lockZ: boolean): void {
    this.lockedMotionAxes = { x: lockX, y: lockY, z: lockZ };
    
    // If any axis is locked, we need to apply constraints immediately
    if (this.impostor && (lockX || lockY || lockZ)) {
      this.applyLockedAxesConstraints();
    }
  }
  
  /**
   * Lock specified axes of rotation
   */
  public lockRotation(lockX: boolean, lockY: boolean, lockZ: boolean): void {
    this.lockedRotationAxes = { x: lockX, y: lockY, z: lockZ };
    
    // If any axis is locked, we need to apply constraints immediately
    if (this.impostor && (lockX || lockY || lockZ)) {
      this.applyLockedAxesConstraints();
    }
  }
  
  /**
   * Register a callback function for collision events
   */
  public onCollide(callbackFn: (collidedWith: BABYLON.PhysicsImpostor, point: BABYLON.Vector3) => void): void {
    this.collisionCallback = callbackFn;
    
    if (this.impostor) {
      this.registerCollisionCallback();
    }
  }
  
  /**
   * Explicitly update the physics body from the transform component
   */
  public syncTransform(): void {
    if (!this.entity || !this.impostor) return;
    
    const transformComponent = this.entity.getComponent<ITransformComponent>('transform');
    if (!transformComponent) return;
    
    const worldMatrix = transformComponent.getWorldMatrix();
    const position = new BABYLON.Vector3();
    const rotation = new BABYLON.Quaternion();
    const scaling = new BABYLON.Vector3();
    
    worldMatrix.decompose(scaling, rotation, position);
    
    // Update the physics body position and rotation
    // Directly update the mesh that's connected to the impostor
    const mesh = this.impostor.object as BABYLON.AbstractMesh;
    if (mesh) {
      mesh.position = position;
      mesh.rotationQuaternion = rotation;
    }
    
    // Only update scaling if needed (might require recreating the body)
    // TODO: Handle scaling changes properly
  }
  
  /**
   * Explicitly update the transform component from the physics body
   */
  public syncToTransform(): void {
    if (!this.entity || !this.impostor) return;
    
    const transformComponent = this.entity.getComponent<ITransformComponent>('transform');
    if (!transformComponent) return;
    
    // Get position and rotation from physics body's mesh
    const mesh = this.impostor.object as BABYLON.AbstractMesh;
    if (!mesh) return;
    
    const position = mesh.position;
    const rotation = mesh.rotationQuaternion;
    
    // Update the transform
    transformComponent.setPosition(position.x, position.y, position.z);
    
    // Handle rotation - convert quaternion to Euler angles since TransformComponent 
    // doesn't have setRotationQuaternion method
    if (rotation) {
      try {
        const euler = rotation.toEulerAngles();
        if (euler && typeof euler.x === 'number' && typeof euler.y === 'number' && typeof euler.z === 'number') {
          transformComponent.setRotation(euler.x, euler.y, euler.z);
        }
      } catch (e) {
        this.logger.warn(`Failed to convert quaternion to Euler angles: ${e}`);
      }
    }
  }
  
  /**
   * Apply constraints for locked axes
   */
  private applyLockedAxesConstraints(): void {
    if (!this.impostor) return;
    
    // Handle locked motion axes
    if (this.lockedMotionAxes.x || this.lockedMotionAxes.y || this.lockedMotionAxes.z) {
      const velocity = this.getLinearVelocity();
      let modified = false;
      
      if (this.lockedMotionAxes.x && velocity.x !== 0) {
        velocity.x = 0;
        modified = true;
      }
      
      if (this.lockedMotionAxes.y && velocity.y !== 0) {
        velocity.y = 0;
        modified = true;
      }
      
      if (this.lockedMotionAxes.z && velocity.z !== 0) {
        velocity.z = 0;
        modified = true;
      }
      
      if (modified) {
        this.setLinearVelocity(velocity);
      }
    }
    
    // Handle locked rotation axes
    if (this.lockedRotationAxes.x || this.lockedRotationAxes.y || this.lockedRotationAxes.z) {
      const angularVelocity = this.getAngularVelocity();
      let modified = false;
      
      if (this.lockedRotationAxes.x && angularVelocity.x !== 0) {
        angularVelocity.x = 0;
        modified = true;
      }
      
      if (this.lockedRotationAxes.y && angularVelocity.y !== 0) {
        angularVelocity.y = 0;
        modified = true;
      }
      
      if (this.lockedRotationAxes.z && angularVelocity.z !== 0) {
        angularVelocity.z = 0;
        modified = true;
      }
      
      if (modified) {
        this.setAngularVelocity(angularVelocity);
      }
    }
  }
}




