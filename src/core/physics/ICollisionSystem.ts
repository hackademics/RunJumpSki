/**
 * @file src/core/physics/ICollisionSystem.ts
 * @description Interface for the CollisionSystem.
 */

export interface ICollisionSystem {
    /**
     * Initializes the collision system.
     */
    initialize(): void;
  
    /**
     * Updates collision detection and response.
     */
    update(): void;
  
    /**
     * Destroys the collision system and cleans up resources.
     */
    destroy(): void;
  }
  