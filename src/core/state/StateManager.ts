import { EventBus } from '../events/EventBus';
import { Logger } from '../logger/Logger';
import { StateError } from '../../utils/errors/StateError';
import {
    IStateManager,
    StateManagerConfig,
    StateTransitionConfig,
    StateHistoryEntry,
    StateChangeEvent
} from './IStateManager';

/**
 * Implementation of the state management system
 */
export class StateManager<TState extends string> implements IStateManager<TState> {
    private static instance: StateManager<any>;
    private initialized: boolean = false;
    private currentState!: TState;
    private initialState!: TState;
    private transitions: Map<TState, Set<TState>> = new Map();
    private transitionHandlers: Map<string, StateTransitionConfig<TState>> = new Map();
    private history: StateHistoryEntry<TState>[] = [];
    private maxHistorySize: number = 100;
    private validateTransitions: boolean = true;
    private enableLogging: boolean = true;
    private preTransitionMiddleware: Array<(from: TState, to: TState, data?: any) => Promise<boolean> | boolean> = [];
    private postTransitionMiddleware: Array<(event: StateChangeEvent<TState>) => Promise<void> | void> = [];
    private eventBus: EventBus;
    private logger: Logger;

    private constructor() {
        this.eventBus = EventBus.getInstance();
        this.logger = Logger.getInstance();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance<T extends string>(): StateManager<T> {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager<T>();
        }
        return StateManager.instance;
    }

    public initialize(config: StateManagerConfig<TState>): void {
        if (this.initialized) {
            throw new StateError('State manager has already been initialized');
        }

        this.currentState = config.initialState;
        this.initialState = config.initialState;
        this.maxHistorySize = config.maxHistorySize ?? 100;
        this.validateTransitions = config.validateTransitions ?? true;
        this.enableLogging = config.enableLogging ?? true;

        // Initialize transitions
        config.transitions.forEach(transition => this.addTransition(transition));

        this.addHistoryEntry(this.currentState);
        this.initialized = true;

        if (this.enableLogging) {
            this.logger.info('State manager initialized', {
                initialState: this.initialState,
                maxHistorySize: this.maxHistorySize,
                validateTransitions: this.validateTransitions
            });
        }
    }

    public getCurrentState(): TState {
        this.ensureInitialized();
        return this.currentState;
    }

    public getHistory(): StateHistoryEntry<TState>[] {
        this.ensureInitialized();
        return [...this.history];
    }

    public canTransition(from: TState, to: TState): boolean {
        this.ensureInitialized();
        return this.transitions.get(from)?.has(to) ?? false;
    }

    public async transitionTo(state: TState, data?: any): Promise<void> {
        this.ensureInitialized();

        if (state === this.currentState) {
            return;
        }

        if (this.validateTransitions && !this.canTransition(this.currentState, state)) {
            throw new StateError(
                `Invalid state transition from '${this.currentState}' to '${state}'`
            );
        }

        const transitionKey = this.getTransitionKey(this.currentState, state);
        const transitionConfig = this.transitionHandlers.get(transitionKey);

        try {
            // Run validation if configured
            if (transitionConfig?.validate) {
                const isValid = await transitionConfig.validate(data);
                if (!isValid) {
                    throw new StateError(
                        `Transition validation failed from '${this.currentState}' to '${state}'`
                    );
                }
            }

            // Run pre-transition middleware
            for (const middleware of this.preTransitionMiddleware) {
                const shouldProceed = await middleware(this.currentState, state, data);
                if (!shouldProceed) {
                    throw new StateError(
                        `Transition blocked by middleware from '${this.currentState}' to '${state}'`
                    );
                }
            }

            const previousState = this.currentState;

            // Run transition handler if configured
            if (transitionConfig?.onTransition) {
                await transitionConfig.onTransition(data);
            }

            // Update state
            this.currentState = state;
            this.addHistoryEntry(state, data);

            // Create event data
            const eventData: StateChangeEvent<TState> = {
                previousState,
                newState: state,
                timestamp: Date.now(),
                data
            };

            // Run post-transition middleware
            for (const middleware of this.postTransitionMiddleware) {
                await middleware(eventData);
            }

            // Emit state change event
            this.eventBus.emit('state:changed', eventData);

            if (this.enableLogging) {
                this.logger.info('State transition completed', {
                    from: previousState,
                    to: state,
                    data
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (this.enableLogging) {
                this.logger.error('State transition failed', error as Error, {
                    from: this.currentState,
                    to: state,
                    data
                });
            }
            throw new StateError(`State transition failed: ${message}`);
        }
    }

    public addTransition(config: StateTransitionConfig<TState>): void {
        this.ensureInitialized();

        const fromStates = Array.isArray(config.from) ? config.from : [config.from];

        fromStates.forEach(fromState => {
            // Initialize set for from state if it doesn't exist
            if (!this.transitions.has(fromState)) {
                this.transitions.set(fromState, new Set());
            }

            // Add transition
            this.transitions.get(fromState)!.add(config.to);

            // Store transition handler
            const key = this.getTransitionKey(fromState, config.to);
            this.transitionHandlers.set(key, config);
        });
    }

    public removeTransition(from: TState, to: TState): void {
        this.ensureInitialized();

        const transitions = this.transitions.get(from);
        if (transitions) {
            transitions.delete(to);
            const key = this.getTransitionKey(from, to);
            this.transitionHandlers.delete(key);
        }
    }

    public addPreTransitionMiddleware(
        middleware: (from: TState, to: TState, data?: any) => Promise<boolean> | boolean
    ): void {
        this.ensureInitialized();
        this.preTransitionMiddleware.push(middleware);
    }

    public addPostTransitionMiddleware(
        middleware: (event: StateChangeEvent<TState>) => Promise<void> | void
    ): void {
        this.ensureInitialized();
        this.postTransitionMiddleware.push(middleware);
    }

    public async reset(): Promise<void> {
        this.ensureInitialized();
        await this.transitionTo(this.initialState);
        this.history = [];
        this.addHistoryEntry(this.initialState);
    }

    public dispose(): void {
        this.transitions.clear();
        this.transitionHandlers.clear();
        this.history = [];
        this.preTransitionMiddleware = [];
        this.postTransitionMiddleware = [];
        this.initialized = false;
    }

    private addHistoryEntry(state: TState, data?: any): void {
        const entry: StateHistoryEntry<TState> = {
            state,
            timestamp: Date.now(),
            data
        };

        this.history.push(entry);

        // Trim history if needed
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }

    private getTransitionKey(from: TState, to: TState): string {
        return `${from}->${to}`;
    }

    private ensureInitialized(): void {
        if (!this.initialized) {
            throw new StateError('State manager has not been initialized');
        }
    }
} 