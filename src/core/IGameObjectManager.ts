/**
 * @file src/core/IGameObjectManager.ts
 * @description Interface for game object managers that handle specific types of game objects
 */

/**
 * Interface for a game object manager that manages a specific type of game object
 */
export interface IGameObjectManager {
  /**
   * Initializes the manager
   */
  initialize(): Promise<void>;
  
  /**
   * Updates the managed objects
   * @param deltaTime Time elapsed since the last update
   */
  update(deltaTime: number): void;
  
  /**
   * Cleans up resources used by the manager
   */
  dispose(): void;
}
