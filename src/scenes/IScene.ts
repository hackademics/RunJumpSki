/**
 * IScene.ts
 * Interface for game scenes
 */

/**
 * Interface for game scenes
 */
export interface IScene {
    /**
     * Initialize the scene
     */
    init(): void;
    
    /**
     * Start the scene
     */
    start(): void;
    
    /**
     * Stop the scene
     */
    stop(): void;
    
    /**
     * Update the scene
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;
    
    /**
     * Clean up resources
     */
    dispose(): void;
}
