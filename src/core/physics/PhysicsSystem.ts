/**
 * @file src/core/physics/PhysicsSystem.ts
 * @description Core physics system that integrates Babylon.js physics engine.
 * 
 * @dependencies IPhysicsSystem.ts
 * @relatedFiles IPhysicsSystem.ts, CollisionSystem.ts, ICollisionSystem.ts
 */

import * as BABYLON from "babylonjs";
import { IPhysicsSystem } from "./IPhysicsSystem";

export class PhysicsSystem implements IPhysicsSystem {
  private scene: BABYLON.Scene | null = null;
  private gravity: BABYLON.Vector3 = new BABYLON.Vector3(0, -9.81, 0);
  private physicsPlugin: BABYLON.IPhysicsEnginePlugin | null = null;
  private physicsEngine: any | null = null;
  private impostors: Map<string, BABYLON.PhysicsImpostor> = new Map();
  private joints: BABYLON.PhysicsJoint[] = [];
  private defaultFriction: number = 0.2;
  private defaultRestitution: number = 0.2;
  private timeScale: number = 1.0;
  private enabled: boolean = true;
  private deterministic: boolean = false;
  private showWireframes: boolean = false;

  /**
   * Initializes the physics system with the given scene.
   * @param scene - The Babylon.js scene to enable physics on.
   */
  public initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
    
    // Initialize the physics engine plugin.
    // For this example, we assume CannonJSPlugin is available.
    this.physicsPlugin = new BABYLON.CannonJSPlugin();
    
    // Enable physics on the scene
    scene.enablePhysics(this.gravity, this.physicsPlugin);
    
    // Store a reference to the physics engine
    this.physicsEngine = scene.getPhysicsEngine();
    
    // Reset collections
    this.impostors = new Map();
    this.joints = [];
  }

  /**
   * Updates the physics simulation.
   * @param deltaTime - Time elapsed since the last update in seconds.
   */
  public update(deltaTime: number): void {
    if (this.physicsEngine) {
      // Babylon.js physics engine updates automatically each frame.
      // If manual stepping is needed, uncomment the following line:
      // this.physicsEngine.setTimeStep(deltaTime);
    }
  }

  /**
   * Sets the gravity for the physics simulation.
   * @param gravity - The gravity vector.
   */
  public setGravity(gravity: BABYLON.Vector3): void {
    this.gravity = gravity;
    if (this.physicsEngine) {
      this.physicsEngine.setGravity(gravity);
    }
  }

  /**
   * Gets the current physics engine instance.
   * @returns The Babylon.js physics engine or null if not initialized.
   */
  public getPhysicsEngine(): any | null {
    return this.physicsEngine;
  }

  /**
   * Creates a physics impostor for a mesh.
   * @param mesh - The mesh to create an impostor for.
   * @param type - The type of impostor (box, sphere, etc.).
   * @param options - The physics parameters for the impostor.
   * @returns The created physics impostor.
   */
  public createImpostor(
    mesh: BABYLON.AbstractMesh, 
    type: number, 
    options: BABYLON.PhysicsImpostorParameters
  ): BABYLON.PhysicsImpostor {
    if (!this.scene) {
      throw new Error("Physics system not initialized - scene is null");
    }
    
    // Create the impostor
    const impostor = new BABYLON.PhysicsImpostor(mesh, type, options, this.scene);
    
    // Store a reference to the impostor
    this.impostors.set(mesh.uniqueId.toString(), impostor);
    
    return impostor;
  }

  /**
   * Applies a force to a physics impostor.
   * @param impostor - The impostor to apply force to.
   * @param force - The force vector to apply.
   * @param contactPoint - The point at which to apply the force (optional).
   */
  public applyForce(
    impostor: BABYLON.PhysicsImpostor,
    force: BABYLON.Vector3,
    contactPoint?: BABYLON.Vector3
  ): void {
    impostor.applyForce(force, contactPoint || impostor.getObjectCenter());
  }

  /**
   * Applies an impulse to a physics impostor.
   * @param impostor - The impostor to apply impulse to.
   * @param impulse - The impulse vector to apply.
   * @param contactPoint - The point at which to apply the impulse (optional).
   */
  public applyImpulse(
    impostor: BABYLON.PhysicsImpostor,
    impulse: BABYLON.Vector3,
    contactPoint?: BABYLON.Vector3
  ): void {
    impostor.applyImpulse(impulse, contactPoint || impostor.getObjectCenter());
  }

  /**
   * Creates a joint between two impostors.
   * @param type - The type of joint.
   * @param mainImpostor - The main impostor.
   * @param connectedImpostor - The connected impostor.
   * @param options - Joint creation options.
   * @returns The created physics joint.
   */
  public createJoint(
    type: number,
    mainImpostor: BABYLON.PhysicsImpostor,
    connectedImpostor: BABYLON.PhysicsImpostor,
    options: any
  ): BABYLON.PhysicsJoint {
    let joint: BABYLON.PhysicsJoint;
    
    switch (type) {
      case BABYLON.PhysicsJoint.BallAndSocketJoint:
        joint = new BABYLON.PhysicsJoint(BABYLON.PhysicsJoint.BallAndSocketJoint, options);
        break;
      case BABYLON.PhysicsJoint.DistanceJoint:
        joint = new BABYLON.PhysicsJoint(BABYLON.PhysicsJoint.DistanceJoint, options);
        break;
      case BABYLON.PhysicsJoint.HingeJoint:
        joint = new BABYLON.PhysicsJoint(BABYLON.PhysicsJoint.HingeJoint, options);
        break;
      case BABYLON.PhysicsJoint.SliderJoint:
        joint = new BABYLON.PhysicsJoint(BABYLON.PhysicsJoint.SliderJoint, options);
        break;
      case BABYLON.PhysicsJoint.WheelJoint:
        joint = new BABYLON.PhysicsJoint(BABYLON.PhysicsJoint.WheelJoint, options);
        break;
      default:
        throw new Error(`Unsupported joint type: ${type}`);
    }
    
    mainImpostor.addJoint(connectedImpostor, joint);
    this.joints.push(joint);
    
    return joint;
  }

  /**
   * Registers a collision callback between two impostors.
   * @param impostor1 - The first impostor.
   * @param impostor2 - The second impostor.
   * @param callback - The callback function to execute on collision.
   */
  public registerOnCollide(
    impostor1: BABYLON.PhysicsImpostor,
    impostor2: BABYLON.PhysicsImpostor,
    callback: (collider: BABYLON.PhysicsImpostor, collidedWith: BABYLON.PhysicsImpostor) => void
  ): void {
    impostor1.registerOnPhysicsCollide(impostor2, callback);
  }

  /**
   * Destroys the physics system and cleans up resources.
   */
  public dispose(): void {
    // Dispose all impostors
    this.impostors.forEach((impostor) => {
      impostor.dispose();
    });
    this.impostors.clear();
    
    // Clear joints
    this.joints = [];
    
    // Dispose physics engine
    if (this.physicsEngine) {
      this.physicsEngine.dispose();
    }
    
    this.physicsEngine = null;
    this.scene = null;
    this.physicsPlugin = null;
  }

  /**
   * Gets the current gravity vector
   * @returns Current gravity vector
   */
  public getGravity(): BABYLON.Vector3 {
    return this.gravity.clone();
  }

  /**
   * Gets the default friction value
   * @returns Default friction value
   */
  public getDefaultFriction(): number {
    return this.defaultFriction;
  }

  /**
   * Sets the default friction value
   * @param friction New default friction value
   */
  public setDefaultFriction(friction: number): void {
    this.defaultFriction = friction;
    
    // Update all existing impostors
    this.impostors.forEach((impostor) => {
      const params = impostor.getParam("friction");
      if (params !== undefined) {
        impostor.setParam("friction", friction);
      }
    });
  }

  /**
   * Gets the default restitution (bounciness) value
   * @returns Default restitution value
   */
  public getDefaultRestitution(): number {
    return this.defaultRestitution;
  }

  /**
   * Sets the default restitution (bounciness) value
   * @param restitution New default restitution value
   */
  public setDefaultRestitution(restitution: number): void {
    this.defaultRestitution = restitution;
    
    // Update all existing impostors
    this.impostors.forEach((impostor) => {
      const params = impostor.getParam("restitution");
      if (params !== undefined) {
        impostor.setParam("restitution", restitution);
      }
    });
  }

  /**
   * Gets the current time scale for physics
   * @returns Current time scale
   */
  public getTimeScale(): number {
    return this.timeScale;
  }

  /**
   * Sets the time scale for physics simulation
   * @param scale New time scale
   */
  public setTimeScale(scale: number): void {
    this.timeScale = scale;
    
    // Apply time scale to the physics engine if available
    if (this.physicsEngine) {
      // This depends on how the specific physics engine handles time scaling
      if (this.physicsEngine.setTimeStep) {
        // Adjust the time step based on the scale
        const baseTimeStep = 1/60; // Default time step
        this.physicsEngine.setTimeStep(baseTimeStep * scale);
      }
    }
  }

  /**
   * Checks if physics is enabled
   * @returns Whether physics is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enables physics simulation
   */
  public enable(): void {
    this.enabled = true;
    
    if (this.physicsEngine) {
      this.physicsEngine.setEnabled(true);
    }
  }

  /**
   * Disables physics simulation
   */
  public disable(): void {
    this.enabled = false;
    
    if (this.physicsEngine) {
      this.physicsEngine.setEnabled(false);
    }
  }

  /**
   * Checks if deterministic mode is enabled
   * @returns Whether deterministic mode is enabled
   */
  public isDeterministic(): boolean {
    return this.deterministic;
  }

  /**
   * Sets deterministic mode
   * @param value Whether to enable deterministic mode
   */
  public setDeterministic(value: boolean): void {
    this.deterministic = value;
    
    if (this.physicsEngine) {
      // This depends on the specific physics engine implementation
      if (this.physicsEngine.setDeterministic) {
        this.physicsEngine.setDeterministic(value);
      }
    }
  }

  /**
   * Shows or hides collision wireframes
   * @param show Whether to show wireframes
   */
  public showCollisionWireframes(show: boolean): void {
    this.showWireframes = show;
    
    if (this.scene && this.physicsEngine) {
      // Enable debug mode in the physics engine
      if (show) {
        this.scene.debugLayer.show({
          embedMode: true
        });
      } else {
        this.scene.debugLayer.hide();
      }
      
      // Set wireframe mode for impostors
      this.impostors.forEach((impostor) => {
        if (impostor.object instanceof BABYLON.AbstractMesh) {
          (impostor.object as BABYLON.AbstractMesh).showBoundingBox = show;
        }
      });
    }
  }
}

