/**
 * Base error class for the game
 */
export class GameError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GameError';
        
        // This is necessary for extending Error in TypeScript
        Object.setPrototypeOf(this, GameError.prototype);
    }
}
