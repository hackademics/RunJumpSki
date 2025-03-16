import { EventBus } from '../events/EventBus';

/**
 * Represents a middleware function that can intercept state transitions
 */
export type StateMiddleware<TState extends string, TData = any> = (
    from: TState | null,
    to: TState,
    data?: TData
) => boolean | Promise<boolean>;

/**
 * Configuration options for the state machine
 */
export interface StateMachineConfig<TState extends string, TData = any> {
    /**
     * Initial state of the machine
     */
    initialState?: TState;

    /**
     * Initial state data
     */
    initialData?: TData;

    /**
     * Maximum number of state transitions to keep in history
     * @default 10
     */
    maxHistorySize?: number;

    /**
     * Whether to emit events on state changes
     * @default true
     */
    emitEvents?: boolean;

    /**
     * Array of middleware functions to run before state transitions
     */
    middleware?: StateMiddleware<TState, TData>[];

    /**
     * Valid state transitions map
     * If provided, only transitions defined in this map will be allowed
     */
    validTransitions?: Partial<Record<TState, TState[]>>;
}

/**
 * Represents a state transition event
 */
export interface StateTransitionEvent<TState extends string, TData = any> {
    from: TState | null;
    to: TState;
    data?: TData;
    timestamp: number;
}

/**
 * Interface for the state machine
 */
export interface IStateMachine<TState extends string, TData = any> {
    /**
     * Initialize the state machine
     * @param config Configuration options
     * @throws {StateError} If already initialized
     */
    initialize(config?: StateMachineConfig<TState, TData>): void;

    /**
     * Get the current state
     * @returns Current state
     * @throws {StateError} If not initialized
     */
    getCurrentState(): TState;

    /**
     * Get the current state data
     * @returns Current state data or undefined
     * @throws {StateError} If not initialized
     */
    getCurrentData(): TData | undefined;

    /**
     * Transition to a new state
     * @param state State to transition to
     * @param data Optional data to associate with the state
     * @throws {StateError} If transition is invalid or middleware rejects
     */
    transitionTo(state: TState, data?: TData): Promise<void>;

    /**
     * Check if a transition is valid
     * @param from Source state
     * @param to Target state
     * @returns Whether the transition is valid
     */
    isValidTransition(from: TState, to: TState): boolean;

    /**
     * Get the state history
     * @returns Array of state transition events
     */
    getHistory(): StateTransitionEvent<TState, TData>[];

    /**
     * Add a middleware function
     * @param middleware Middleware function to add
     */
    addMiddleware(middleware: StateMiddleware<TState, TData>): void;

    /**
     * Remove a middleware function
     * @param middleware Middleware function to remove
     */
    removeMiddleware(middleware: StateMiddleware<TState, TData>): void;

    /**
     * Reset the state machine to its initial state
     * @throws {StateError} If not initialized
     */
    reset(): void;

    /**
     * Dispose of the state machine and clean up resources
     */
    dispose(): void;
}

/**
 * Events emitted by the state machine
 */
export interface StateEvents<TState extends string, TData = any> {
    'state:transitioning': StateTransitionEvent<TState, TData>;
    'state:transitioned': StateTransitionEvent<TState, TData>;
    'state:error': {
        error: Error;
        from: TState | null;
        to: TState;
        data?: TData;
    };
    'state:reset': {
        previousState: TState;
        newState: TState;
    };
    'state:disposed': void;
} 