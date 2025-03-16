import { EventBus } from '../events/EventBus';
import { IStateMachine, StateMachineConfig, StateMiddleware, StateTransitionEvent, StateEvents } from './IStateMachine';
import { StateError } from '../../utils/errors/StateError';

/**
 * Implementation of the state machine
 */
export class StateMachine<TState extends string, TData = any> implements IStateMachine<TState, TData> {
    private static instance: StateMachine<any, any>;
    private initialized: boolean = false;
    private disposed: boolean = false;
    private currentState: TState | null = null;
    private currentData: TData | undefined;
    private history: StateTransitionEvent<TState, TData>[] = [];
    private middleware: StateMiddleware<TState, TData>[] = [];
    private config: StateMachineConfig<TState, TData> = {
        maxHistorySize: 10,
        emitEvents: true
    };
    private eventBus: EventBus;

    private constructor() {
        this.eventBus = EventBus.getInstance();
    }

    /**
     * Get the singleton instance of the state machine
     */
    public static getInstance<T extends string, D = any>(): StateMachine<T, D> {
        if (!StateMachine.instance) {
            StateMachine.instance = new StateMachine<T, D>();
        }
        return StateMachine.instance as StateMachine<T, D>;
    }

    public initialize(config?: StateMachineConfig<TState, TData>): void {
        if (this.initialized) {
            throw StateError.alreadyInitialized();
        }

        if (this.disposed) {
            throw StateError.disposed();
        }

        // Merge provided config with defaults
        this.config = {
            ...this.config,
            ...config
        };

        // Validate config
        if (this.config.maxHistorySize !== undefined && this.config.maxHistorySize < 1) {
            throw StateError.invalidConfig('maxHistorySize must be greater than 0');
        }

        // Set initial state if provided
        if (this.config.initialState) {
            this.currentState = this.config.initialState;
            this.currentData = this.config.initialData;

            // Add to history
            this.addToHistory(null, this.config.initialState, this.config.initialData);
        }

        // Add middleware if provided
        if (this.config.middleware) {
            this.middleware.push(...this.config.middleware);
        }

        this.initialized = true;
    }

    public getCurrentState(): TState {
        this.ensureInitialized();
        if (this.currentState === null) {
            throw StateError.invalidConfig('No current state');
        }
        return this.currentState;
    }

    public getCurrentData(): TData | undefined {
        this.ensureInitialized();
        return this.currentData;
    }

    public async transitionTo(state: TState, data?: TData): Promise<void> {
        this.ensureInitialized();

        const fromState = this.currentState;

        // Check if transition is valid
        if (fromState !== null && !this.isValidTransition(fromState, state)) {
            throw StateError.invalidTransition(fromState, state);
        }

        try {
            // Create transition event
            const transitionEvent: StateTransitionEvent<TState, TData> = {
                from: fromState,
                to: state,
                data,
                timestamp: Date.now()
            };

            // Emit transitioning event
            if (this.config.emitEvents) {
                this.eventBus.emit('state:transitioning', transitionEvent);
            }

            // Run middleware
            for (const mw of this.middleware) {
                const result = await mw(fromState, state, data);
                if (!result) {
                    throw StateError.middlewareRejected(fromState, state);
                }
            }

            // Update state
            this.currentState = state;
            this.currentData = data;

            // Add to history
            this.addToHistory(fromState, state, data);

            // Emit transitioned event
            if (this.config.emitEvents) {
                this.eventBus.emit('state:transitioned', transitionEvent);
            }
        } catch (error) {
            // Emit error event
            if (this.config.emitEvents) {
                this.eventBus.emit('state:error', {
                    error: error instanceof Error ? error : new Error(String(error)),
                    from: fromState,
                    to: state,
                    data
                });
            }
            throw error;
        }
    }

    public isValidTransition(from: TState, to: TState): boolean {
        if (!this.config.validTransitions) {
            return true;
        }

        const validTransitions = this.config.validTransitions[from];
        return validTransitions ? validTransitions.includes(to) : false;
    }

    public getHistory(): StateTransitionEvent<TState, TData>[] {
        this.ensureInitialized();
        return [...this.history];
    }

    public addMiddleware(middleware: StateMiddleware<TState, TData>): void {
        this.ensureInitialized();
        this.middleware.push(middleware);
    }

    public removeMiddleware(middleware: StateMiddleware<TState, TData>): void {
        this.ensureInitialized();
        const index = this.middleware.indexOf(middleware);
        if (index !== -1) {
            this.middleware.splice(index, 1);
        }
    }

    public reset(): void {
        this.ensureInitialized();

        if (!this.config.initialState) {
            throw StateError.invalidConfig('No initial state defined');
        }

        const previousState = this.currentState;
        this.currentState = this.config.initialState;
        this.currentData = this.config.initialData;
        this.history = [];
        this.addToHistory(null, this.config.initialState, this.config.initialData);

        if (this.config.emitEvents && previousState) {
            this.eventBus.emit('state:reset', {
                previousState,
                newState: this.config.initialState
            });
        }
    }

    public dispose(): void {
        if (this.disposed) {
            return;
        }

        if (this.config.emitEvents) {
            this.eventBus.emit('state:disposed', undefined);
        }

        this.currentState = null;
        this.currentData = undefined;
        this.history = [];
        this.middleware = [];
        this.initialized = false;
        this.disposed = true;
    }

    private ensureInitialized(): void {
        if (!this.initialized) {
            throw StateError.notInitialized();
        }
        if (this.disposed) {
            throw StateError.disposed();
        }
    }

    private addToHistory(from: TState | null, to: TState, data?: TData): void {
        const event: StateTransitionEvent<TState, TData> = {
            from,
            to,
            data,
            timestamp: Date.now()
        };

        this.history.push(event);

        // Trim history if needed
        if (this.config.maxHistorySize && this.history.length > this.config.maxHistorySize) {
            this.history = this.history.slice(-this.config.maxHistorySize);
        }
    }
} 