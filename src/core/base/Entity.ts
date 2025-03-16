import { IEntity, EntityState } from './IEntity';
import { IComponent } from './IComponent';
import { EntityError } from '@utils/errors/EntityError';
import { EventBus } from '@core/events/EventBus';

/**
 * Base entity class that manages components
 */
export class Entity implements IEntity {
    private readonly _id: string;
    private readonly _components: Map<string, IComponent>;
    private readonly _eventBus: EventBus;
    private _state: EntityState;
    private _enabled: boolean;

    constructor(id: string) {
        this._id = id;
        this._components = new Map();
        this._eventBus = EventBus.getInstance();
        this._state = EntityState.Created;
        this._enabled = true;
    }

    get id(): string {
        return this._id;
    }

    get state(): EntityState {
        return this._state;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    init(): void {
        try {
            if (this._state !== EntityState.Created) {
                throw new EntityError(`Entity ${this._id} has already been initialized`);
            }

            // Initialize all components
            for (const component of this._components.values()) {
                component.init(this);
            }

            this._state = EntityState.Initialized;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error during entity initialization';
            throw new EntityError(`Failed to initialize entity ${this._id}: ${message}`);
        }
    }

    start(): void {
        try {
            if (this._state !== EntityState.Initialized) {
                throw new EntityError(`Entity ${this._id} must be initialized before starting`);
            }

            // Start all components
            for (const component of this._components.values()) {
                component.onStart();
            }

            this._state = EntityState.Active;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error during entity start';
            throw new EntityError(`Failed to start entity ${this._id}: ${message}`);
        }
    }

    addComponent<T extends IComponent>(component: T): T {
        const type = component.constructor.name;
        if (this._components.has(type)) {
            throw new EntityError(`Component ${type} already exists on entity ${this._id}`);
        }

        this._components.set(type, component);
        return component;
    }

    getComponent<T extends IComponent>(type: string): T | undefined {
        return this._components.get(type) as T | undefined;
    }

    getRequiredComponent<T extends IComponent>(type: string): T {
        const component = this.getComponent<T>(type);
        if (!component) {
            throw new EntityError(`Required component ${type} not found on entity ${this._id}`);
        }
        return component;
    }

    hasComponent(type: string): boolean {
        return this._components.has(type);
    }

    removeComponent(type: string): boolean {
        const component = this._components.get(type);
        if (component) {
            component.dispose();
            return this._components.delete(type);
        }
        return false;
    }

    update(deltaTime: number): void {
        if (!this._enabled || this._state !== EntityState.Active) return;

        for (const component of this._components.values()) {
            if (component.isEnabled()) {
                component.update(deltaTime);
            }
        }
    }

    lateUpdate(deltaTime: number): void {
        if (!this._enabled || this._state !== EntityState.Active) return;

        for (const component of this._components.values()) {
            if (component.isEnabled()) {
                component.lateUpdate(deltaTime);
            }
        }
    }

    fixedUpdate(fixedDeltaTime: number): void {
        if (!this._enabled || this._state !== EntityState.Active) return;

        for (const component of this._components.values()) {
            if (component.isEnabled()) {
                component.fixedUpdate(fixedDeltaTime);
            }
        }
    }

    enable(): void {
        if (this._enabled) return;
        
        this._enabled = true;
        for (const component of this._components.values()) {
            component.onEnable();
        }
    }

    disable(): void {
        if (!this._enabled) return;
        
        this._enabled = false;
        for (const component of this._components.values()) {
            component.onDisable();
        }
        this._state = EntityState.Disabled;
    }

    isEnabled(): boolean {
        return this._enabled;
    }

    dispose(): void {
        try {
            if (this._state === EntityState.Disposed) {
                return;
            }

            for (const component of this._components.values()) {
                component.dispose();
            }
            this._components.clear();
            this._state = EntityState.Disposed;
            this._enabled = false;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error during entity disposal';
            throw new EntityError(`Failed to dispose entity ${this._id}: ${message}`);
        }
    }

    getAllComponents(): ReadonlyMap<string, IComponent> {
        return this._components;
    }

    getState(): EntityState {
        return this._state;
    }
}
