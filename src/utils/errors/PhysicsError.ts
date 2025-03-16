/**
 * Custom error class for physics-related errors
 */
export class PhysicsError extends Error {
    constructor(message: string) {
        super(`[Physics] ${message}`);
        this.name = 'PhysicsError';
        Object.setPrototypeOf(this, PhysicsError.prototype);
    }
} 