import { GameError } from './GameError';

/**
 * Error specific to components
 */
export class ComponentError extends GameError {
    /**
     * Component type where the error occurred
     */
    public readonly componentType: string;
    
    /**
     * Entity ID where the error occurred
     */
    public readonly entityId: string | undefined;
    
    constructor(componentType: string, entityId: string | undefined, message: string) {
        super(componentType + (entityId ? ` (${entityId})` : '') + ': ' + message);
        this.name = 'ComponentError';
        this.componentType = componentType;
        this.entityId = entityId;
        
        // This is necessary for extending Error in TypeScript
        Object.setPrototypeOf(this, ComponentError.prototype);
    }
}
