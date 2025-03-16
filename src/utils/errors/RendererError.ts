/**
 * Custom error class for renderer-related errors
 */
export class RendererError extends Error {
    /**
     * Creates a new RendererError
     * @param operation - The operation that failed (e.g., 'initialization', 'mesh creation')
     * @param message - Detailed error message
     * @param cause - Optional underlying cause of the error
     */
    constructor(
        public readonly operation: string,
        message: string,
        public readonly cause?: Error
    ) {
        super(`Renderer error during ${operation}: ${message}${cause ? ` (Caused by: ${cause.message})` : ''}`);
        this.name = 'RendererError';
        
        // Ensure proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);
    }

    /**
     * Get a string representation of the error
     */
    public toString(): string {
        return `${this.name}: [${this.operation}] ${this.message}`;
    }
} 