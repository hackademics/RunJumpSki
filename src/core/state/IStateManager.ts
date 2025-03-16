import { Scene } from 'babylonjs';

/**
 * Configuration for state transitions
 */
export interface StateTransitionConfig<TState extends string> {
    from: TState | TState[];
    to: TState;
    onTransition?: (data?: any) => Promise<void> | void;
    validate?: (data?: any) => boolean | Promise<boolean>;
}

/**
 * State history entry
 */
export interface StateHistoryEntry<TState extends string> {
    state: TState;
    timestamp: number;
    data?: any;
}

/**
 * State manager configuration
 */
export interface StateManagerConfig<TState extends string> {
    initialState: TState;
    transitions: StateTransitionConfig<TState>[];
    maxHistorySize?: number;
    enableLogging?: boolean;
    validateTransitions?: boolean;
}

/**
 * State change event data
 */
export interface StateChangeEvent<TState extends string> {
    previousState: TState;
    newState: TState;
    timestamp: number;
    data?: any;
}

/**
 * Interface for the state management system
 */
export interface IStateManager<TState extends string> {
    /**
     * Initialize the state manager
     * @param config Configuration options
     */
    initialize(config: StateManagerConfig<TState>): void;

    /**
     * Get the current state
     */
    getCurrentState(): TState;

    /**
     * Get the state history
     */
    getHistory(): StateHistoryEntry<TState>[];

    /**
     * Check if a transition is valid
     * @param from Current state
     * @param to Target state
     */
    canTransition(from: TState, to: TState): boolean;

    /**
     * Transition to a new state
     * @param state Target state
     * @param data Optional data to pass to transition handlers
     * @throws {StateError} If transition is invalid
     */
    transitionTo(state: TState, data?: any): Promise<void>;

    /**
     * Add a new valid transition
     * @param config Transition configuration
     */
    addTransition(config: StateTransitionConfig<TState>): void;

    /**
     * Remove a transition
     * @param from Source state
     * @param to Target state
     */
    removeTransition(from: TState, to: TState): void;

    /**
     * Add middleware to be called before state changes
     * @param middleware Middleware function
     */
    addPreTransitionMiddleware(
        middleware: (from: TState, to: TState, data?: any) => Promise<boolean> | boolean
    ): void;

    /**
     * Add middleware to be called after state changes
     * @param middleware Middleware function
     */
    addPostTransitionMiddleware(
        middleware: (event: StateChangeEvent<TState>) => Promise<void> | void
    ): void;

    /**
     * Reset to initial state
     */
    reset(): Promise<void>;

    /**
     * Clean up resources
     */
    dispose(): void;
} 