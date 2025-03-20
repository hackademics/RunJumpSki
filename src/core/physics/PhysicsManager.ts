/**
 * @file src/core/physics/PhysicsManager.ts
 * @description Implementation of the PhysicsManager that provides higher-level physics functionality.
 */

import * as BABYLON from "babylonjs";
import { IPhysicsManager } from "./IPhysicsManager";
import { IPhysicsSystem } from "./IPhysicsSystem";
import { PhysicsSystem } from "./PhysicsSystem";

/**
 * Default physics configuration
 */
export interface PhysicsOptions {
  gravity: BABYLON.Vector3;
  defaultFriction: number;
  defaultRestitution: number;
  defaultMass: number;
}

/**
 * Default physics configuration values
 */
export const DEFAULT_PHYSICS_OPTIONS: PhysicsOptions = {
  gravity: new BABYLON.Vector3(0, -9.81, 0),
  defaultFriction: 0.5,
  defaultRestitution: 0.2,
  defaultMass: 1.0
};

/**
 * Implementation of the physics manager that provides higher-level physics functionality.
 */
export class PhysicsManager implements IPhysicsManager {
  private physicsSystem: IPhysicsSystem;
  private scene: BABYLON.Scene | null = null;
  private options: PhysicsOptions;
  private bodies: Map<string, BABYLON.PhysicsImpostor> = new Map();
  
  /**
   * Creates a new PhysicsManager.
   * @param physicsSystem - Optional physics system to use. If not provided, a new one will be created.
   * @param options - Optional physics configuration.
   */
  constructor(
    physicsSystem?: IPhysicsSystem,
    options: Partial<PhysicsOptions> = {}
  ) {
    this.physicsSystem = physicsSystem || new PhysicsSystem();
    this.options = { ...DEFAULT_PHYSICS_OPTIONS, ...options };
  }
  
  /**
   * Initializes the physics manager.
   * @param scene - The Babylon.js scene to use.
   */
  public initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
    this.physicsSystem.initialize(scene);
    this.configurePhysics(this.options.gravity);
    this.bodies.clear();
  }
  
  /**
   * Updates the physics simulation.
   * @param deltaTime - Time elapsed since the last update in seconds.
   */
  public update(deltaTime: number): void {
    this.physicsSystem.update(deltaTime);
  }
  
  /**
   * Gets the physics system.
   * @returns The physics system.
   */
  public getPhysicsSystem(): IPhysicsSystem {
    return this.physicsSystem;
  }
  
  /**
   * Configures the physics engine with game-specific settings.
   * @param gravity - The gravity vector to use.
   * @param options - Additional physics configuration options.
   */
  public configurePhysics(gravity: BABYLON.Vector3, options?: Partial<PhysicsOptions>): void {
    // Apply gravity
    this.physicsSystem.setGravity(gravity);
    
    // Update options if provided
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }
  
  /**
   * Creates a physics body for an object with appropriate properties.
   * @param mesh - The mesh to attach physics to.
   * @param type - The type of impostor to create.
   * @param options - Physics parameters for the impostor.
   * @returns The created physics impostor.
   */
  public createBody(
    mesh: BABYLON.AbstractMesh, 
    type: number, 
    options: BABYLON.PhysicsImpostorParameters
  ): BABYLON.PhysicsImpostor {
    const impostor = this.physicsSystem.createImpostor(mesh, type, options);
    this.bodies.set(mesh.uniqueId.toString(), impostor);
    return impostor;
  }
  
  /**
   * Creates a static collider (non-moving physics object).
   * @param mesh - The mesh to make into a collider.
   * @param type - The type of impostor to create.
   * @returns The created physics impostor.
   */
  public createStaticCollider(
    mesh: BABYLON.AbstractMesh, 
    type: number
  ): BABYLON.PhysicsImpostor {
    return this.createBody(mesh, type, {
      mass: 0,
      friction: this.options.defaultFriction,
      restitution: this.options.defaultRestitution
    });
  }
  
  /**
   * Creates a kinematic body (controlled through code, affects other objects).
   * @param mesh - The mesh to make into a kinematic body.
   * @param type - The type of impostor to create.
   * @param mass - The mass to use (typically a small non-zero value).
   * @returns The created physics impostor.
   */
  public createKinematicBody(
    mesh: BABYLON.AbstractMesh, 
    type: number,
    mass: number = 0.001
  ): BABYLON.PhysicsImpostor {
    const impostor = this.createBody(mesh, type, {
      mass,
      friction: this.options.defaultFriction,
      restitution: this.options.defaultRestitution,
    });
    
    // Set the impostor to be kinematic manually
    if (impostor.physicsBody) {
      // Set properties on the physics body to make it kinematic
      // This might depend on the physics engine being used
      impostor.executeNativeFunction((physicsBody) => {
        if (physicsBody.type !== undefined) {
          physicsBody.type = 2; // KINEMATIC_OBJECT in many physics engines
        }
      });
    }
    
    return impostor;
  }
  
  /**
   * Creates a dynamic body (fully physics-controlled).
   * @param mesh - The mesh to make into a dynamic body.
   * @param type - The type of impostor to create.
   * @param mass - The mass of the body.
   * @param restitution - The bounciness of the body.
   * @param friction - The friction of the body.
   * @returns The created physics impostor.
   */
  public createDynamicBody(
    mesh: BABYLON.AbstractMesh, 
    type: number,
    mass: number = this.options.defaultMass,
    restitution: number = this.options.defaultRestitution,
    friction: number = this.options.defaultFriction
  ): BABYLON.PhysicsImpostor {
    return this.createBody(mesh, type, {
      mass,
      friction,
      restitution
    });
  }
  
  /**
   * Registers a collision callback for two impostors.
   * @param impostor1 - The first impostor.
   * @param impostor2 - The second impostor (or null for any impostor).
   * @param callback - The callback to execute on collision.
   */
  public registerCollision(
    impostor1: BABYLON.PhysicsImpostor,
    impostor2: BABYLON.PhysicsImpostor | null,
    callback: (collider: BABYLON.PhysicsImpostor, collidedWith: BABYLON.PhysicsImpostor) => void
  ): void {
    if (impostor2) {
      this.physicsSystem.registerOnCollide(impostor1, impostor2, callback);
    } else {
      // Register collision with any other impostor
      impostor1.registerOnPhysicsCollide([], callback);
    }
  }
  
  /**
   * Creates a physics constraint/joint between objects.
   * @param type - The type of joint to create.
   * @param mainBody - The main physics body.
   * @param connectedBody - The body to connect to.
   * @param options - Options for the joint.
   * @returns The created joint.
   */
  public createConstraint(
    type: number,
    mainBody: BABYLON.PhysicsImpostor,
    connectedBody: BABYLON.PhysicsImpostor,
    options: any
  ): BABYLON.PhysicsJoint {
    return this.physicsSystem.createJoint(type, mainBody, connectedBody, options);
  }
  
  /**
   * Applies a force to a physical body.
   * @param body - The physics body.
   * @param force - The force vector to apply.
   * @param contactPoint - Optional point at which to apply the force.
   */
  public applyForce(
    body: BABYLON.PhysicsImpostor,
    force: BABYLON.Vector3,
    contactPoint?: BABYLON.Vector3
  ): void {
    this.physicsSystem.applyForce(body, force, contactPoint);
  }
  
  /**
   * Applies an impulse to a physical body.
   * @param body - The physics body.
   * @param impulse - The impulse vector to apply.
   * @param contactPoint - Optional point at which to apply the impulse.
   */
  public applyImpulse(
    body: BABYLON.PhysicsImpostor,
    impulse: BABYLON.Vector3,
    contactPoint?: BABYLON.Vector3
  ): void {
    this.physicsSystem.applyImpulse(body, impulse, contactPoint);
  }
  
  /**
   * Sets the linear velocity of a body directly.
   * @param body - The physics body.
   * @param velocity - The velocity vector to set.
   */
  public setLinearVelocity(
    body: BABYLON.PhysicsImpostor,
    velocity: BABYLON.Vector3
  ): void {
    body.setLinearVelocity(velocity);
  }
  
  /**
   * Sets the angular velocity of a body directly.
   * @param body - The physics body.
   * @param velocity - The angular velocity vector to set.
   */
  public setAngularVelocity(
    body: BABYLON.PhysicsImpostor,
    velocity: BABYLON.Vector3
  ): void {
    body.setAngularVelocity(velocity);
  }
  
  /**
   * Cleans up and releases all physics resources.
   */
  public dispose(): void {
    this.bodies.clear();
    this.physicsSystem.dispose();
    this.scene = null;
  }
} 
