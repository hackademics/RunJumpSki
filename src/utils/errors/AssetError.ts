/**
 * Custom error class for asset-related errors
 */
export class AssetError extends Error {
    constructor(
        public readonly operation: string,
        message: string,
        public readonly cause?: Error
    ) {
        super(`[Asset] ${operation}: ${message}${cause ? ` (Cause: ${cause.message})` : ''}`);
        this.name = 'AssetError';
        
        // Maintain proper prototype chain
        Object.setPrototypeOf(this, AssetError.prototype);
    }
} 