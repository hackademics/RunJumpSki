/**
 * @file src/core/ecs/components/IPhysicsComponent.ts
 * @description Interface for the PhysicsComponent, which adds physics properties to an entity.
 */

import * as BABYLON from "babylonjs";

export interface IPhysicsComponent {
  /**
   * The mass of the entity.
   */
  mass: number;

  /**
   * The friction coefficient of the entity.
   */
  friction: number;

  /**
   * The restitution (bounciness) of the entity.
   */
  restitution: number;

  /**
   * The physics impostor attached to the entity's mesh.
   */
  impostor: BABYLON.PhysicsImpostor | null;

  /**
   * Attaches the physics impostor to the given mesh.
   * @param mesh - The Babylon.js mesh to attach the impostor to.
   */
  attachToMesh(mesh: BABYLON.AbstractMesh): void;
}
