/**
 * @file src/core/ecs/components/PhysicsComponent.ts
 * @description Component that provides physics properties to an entity.
 * 
 * @dependencies IPhysicsComponent.ts
 * @relatedFiles IPhysicsComponent.ts
 */
import * as BABYLON from "babylonjs";
import { IPhysicsComponent } from "./IPhysicsComponent";

export class PhysicsComponent implements IPhysicsComponent {
  public mass: number;
  public friction: number;
  public restitution: number;
  public impostor: BABYLON.PhysicsImpostor | null;

  constructor(mass = 1, friction = 0.5, restitution = 0.7) {
    this.mass = mass;
    this.friction = friction;
    this.restitution = restitution;
    this.impostor = null;
  }

  public attachToMesh(mesh: BABYLON.AbstractMesh): void {
    // Attach a physics impostor to the mesh.
    // Here we use a BoxImpostor as a simple default.
    this.impostor = new BABYLON.PhysicsImpostor(
      mesh,
      BABYLON.PhysicsImpostor.BoxImpostor,
      {
        mass: this.mass,
        friction: this.friction,
        restitution: this.restitution,
      }
    );
    mesh.physicsImpostor = this.impostor;
  }
}
