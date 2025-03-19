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

  public initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
    // Initialize the physics engine plugin.
    // For this example, we assume CannonJSPlugin is available.
    this.physicsPlugin = new BABYLON.CannonJSPlugin();
    scene.enablePhysics(this.gravity, this.physicsPlugin);
  }

  public update(deltaTime: number): void {
    if (this.scene && this.scene.getPhysicsEngine()) {
      // Babylon.js physics engine updates automatically each frame.
      // If manual stepping is needed, the deltaTime can be used here.
    }
  }

  public setGravity(gravity: BABYLON.Vector3): void {
    this.gravity = gravity;
    if (this.scene && this.scene.getPhysicsEngine()) {
      this.scene.getPhysicsEngine().setGravity(gravity);
    }
  }

  public destroy(): void {
    if (this.scene && this.scene.getPhysicsEngine()) {
      this.scene.getPhysicsEngine().dispose();
      this.scene = null;
    }
  }
}
