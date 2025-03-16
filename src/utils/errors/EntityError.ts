/**
 * Error class for entity-related errors
 */
export class EntityError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'EntityError';
    }
} 