/**
 * MovementStateMachine.ts
 * Implements a state machine for player movement states
 */

import { Logger } from '../../utils/Logger';
import { MovementState, MovementStateHandler, MovementStateContext, StateTransitionResult } from './MovementState';
import { EventSystem } from '../../core/EventSystem';
import { GameEventType, MovementStateType } from '../../types/events/EventTypes';

/**
 * Transition definition between movement states
 */
export interface StateTransition {
    /**
     * Source state
     */
    from: MovementState;
    
    /**
     * Target state
     */
    to: MovementState;
    
    /**
     * Condition function that determines if transition is valid
     */
    condition: (context: MovementStateContext) => boolean;
    
    /**
     * Priority of this transition (higher numbers take precedence)
     */
    priority: number;
    
    /**
     * Name of the transition for debugging
     */
    name: string;
}

/**
 * Movement state machine that manages transitions between movement states
 */
export class MovementStateMachine {
    private logger: Logger;
    private eventSystem: EventSystem;
    private currentState: MovementState;
    private stateHandlers: Map<MovementState, MovementStateHandler>;
    private transitions: StateTransition[];
    private stateContext: MovementStateContext;
    private entityId: string;
    
    /**
     * Create a new MovementStateMachine
     * @param initialState Initial movement state
     * @param stateHandlers Map of state handlers
     * @param stateContext Shared state context
     * @param entityId Entity ID for events
     */
    constructor(
        initialState: MovementState,
        stateHandlers: Map<MovementState, MovementStateHandler>,
        stateContext: MovementStateContext,
        entityId: string
    ) {
        this.logger = new Logger('MovementStateMachine');
        this.eventSystem = EventSystem.getInstance();
        this.currentState = initialState;
        this.stateHandlers = stateHandlers;
        this.transitions = [];
        this.stateContext = stateContext;
        this.entityId = entityId;
        
        // Initialize with default transitions
        this.setupDefaultTransitions();
    }
    
    /**
     * Set up default transitions between states
     */
    private setupDefaultTransitions(): void {
        // Running -> Flying (when not grounded)
        this.addTransition({
            from: MovementState.RUNNING,
            to: MovementState.FLYING,
            condition: (context) => !context.grounded,
            priority: 3,
            name: 'RunningToFlying_NotGrounded'
        });
        
        // Running -> Skiing (when ski input is active)
        this.addTransition({
            from: MovementState.RUNNING,
            to: MovementState.SKIING,
            condition: (context) => context.input.ski && context.grounded,
            priority: 2,
            name: 'RunningToSkiing_SkiInput'
        });
        
        // Running -> Jetpacking (when jetpack input is active and has energy)
        this.addTransition({
            from: MovementState.RUNNING,
            to: MovementState.JETPACKING,
            condition: (context) => context.input.jetpack && context.energy > 0,
            priority: 2,
            name: 'RunningToJetpacking_JetpackInput'
        });
        
        // Skiing -> Flying (when not grounded)
        this.addTransition({
            from: MovementState.SKIING,
            to: MovementState.FLYING,
            condition: (context) => !context.grounded,
            priority: 3,
            name: 'SkiingToFlying_NotGrounded'
        });
        
        // Skiing -> Running (when ski input is released)
        this.addTransition({
            from: MovementState.SKIING,
            to: MovementState.RUNNING,
            condition: (context) => !context.input.ski && context.grounded,
            priority: 2,
            name: 'SkiingToRunning_SkiInputReleased'
        });
        
        // Skiing -> Jetpacking (when jetpack input is active and has energy)
        this.addTransition({
            from: MovementState.SKIING,
            to: MovementState.JETPACKING,
            condition: (context) => context.input.jetpack && context.energy > 0,
            priority: 2,
            name: 'SkiingToJetpacking_JetpackInput'
        });
        
        // Skiing -> Running (when slope is too flat and player has slowed down)
        this.addTransition({
            from: MovementState.SKIING,
            to: MovementState.RUNNING,
            condition: (context) => {
                const minSkiAngle = 0.17; // ~10 degrees in radians
                return context.grounded && 
                       context.terrainData !== undefined && 
                       context.terrainData.slopeAngle < minSkiAngle && 
                       context.velocity.length() < 2.0 &&
                       context.timeInState > 1.0;
            },
            priority: 1,
            name: 'SkiingToRunning_FlatSlope'
        });
        
        // Flying -> Running (when grounded without ski input)
        this.addTransition({
            from: MovementState.FLYING,
            to: MovementState.RUNNING,
            condition: (context) => context.grounded && !context.input.ski,
            priority: 3,
            name: 'FlyingToRunning_Landed'
        });
        
        // Flying -> Skiing (when grounded with ski input)
        this.addTransition({
            from: MovementState.FLYING,
            to: MovementState.SKIING,
            condition: (context) => context.grounded && context.input.ski,
            priority: 3,
            name: 'FlyingToSkiing_LandedWithSki'
        });
        
        // Flying -> Jetpacking (when jetpack input is active and has energy)
        this.addTransition({
            from: MovementState.FLYING,
            to: MovementState.JETPACKING,
            condition: (context) => context.input.jetpack && context.energy > 0,
            priority: 2,
            name: 'FlyingToJetpacking_JetpackInput'
        });
        
        // Jetpacking -> Flying (when jetpack input is released or out of energy)
        this.addTransition({
            from: MovementState.JETPACKING,
            to: MovementState.FLYING,
            condition: (context) => !context.input.jetpack || context.energy <= 0,
            priority: 3,
            name: 'JetpackingToFlying_InputReleasedOrNoEnergy'
        });
        
        // Jetpacking -> Running (when grounded without ski input)
        this.addTransition({
            from: MovementState.JETPACKING,
            to: MovementState.RUNNING,
            condition: (context) => context.grounded && !context.input.ski,
            priority: 2,
            name: 'JetpackingToRunning_Landed'
        });
        
        // Jetpacking -> Skiing (when grounded with ski input)
        this.addTransition({
            from: MovementState.JETPACKING,
            to: MovementState.SKIING,
            condition: (context) => context.grounded && context.input.ski,
            priority: 2,
            name: 'JetpackingToSkiing_LandedWithSki'
        });
    }
    
    /**
     * Add a new state transition
     * @param transition State transition to add
     */
    public addTransition(transition: StateTransition): void {
        this.transitions.push(transition);
        this.logger.debug(`Added transition: ${transition.name} (${transition.from} -> ${transition.to})`);
    }
    
    /**
     * Remove a transition by name
     * @param name Name of the transition to remove
     * @returns Whether the transition was found and removed
     */
    public removeTransition(name: string): boolean {
        const initialLength = this.transitions.length;
        this.transitions = this.transitions.filter(t => t.name !== name);
        return this.transitions.length < initialLength;
    }
    
    /**
     * Get the current state
     * @returns Current movement state
     */
    public getCurrentState(): MovementState {
        return this.currentState;
    }
    
    /**
     * Get the handler for the current state
     * @returns Current state handler
     */
    public getCurrentStateHandler(): MovementStateHandler {
        return this.stateHandlers.get(this.currentState)!;
    }
    
    /**
     * Update the state machine
     * @param deltaTime Time since last update in seconds
     * @returns Whether a state transition occurred
     */
    public update(deltaTime: number): boolean {
        // Update time in state
        this.stateContext.timeInState += deltaTime;
        
        // Update current state
        const currentHandler = this.getCurrentStateHandler();
        currentHandler.update(this.stateContext, deltaTime);
        
        // Check for transitions
        return this.checkTransitions();
    }
    
    /**
     * Check if any transitions should be triggered
     * @returns Whether a transition occurred
     */
    private checkTransitions(): boolean {
        // Get all valid transitions from current state
        const validTransitions = this.transitions
            .filter(t => t.from === this.currentState && t.condition(this.stateContext))
            .sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)
        
        // If no valid transitions, stay in current state
        if (validTransitions.length === 0) {
            return false;
        }
        
        // Get highest priority transition
        const transition = validTransitions[0];
        
        // Perform the transition
        this.transitionTo(transition.to, transition.name);
        return true;
    }
    
    /**
     * Force a transition to a specific state
     * @param newState State to transition to
     * @param reason Reason for the transition
     * @returns Whether the transition was successful
     */
    public transitionTo(newState: MovementState, reason: string): boolean {
        // Skip if already in the target state
        if (this.currentState === newState) {
            return false;
        }
        
        // Get handlers
        const currentHandler = this.getCurrentStateHandler();
        const newHandler = this.stateHandlers.get(newState);
        
        // Validate new state
        if (!newHandler) {
            this.logger.error(`Cannot transition to invalid state: ${newState}`);
            return false;
        }
        
        // Store previous state for event
        const previousState = this.currentState;
        
        // Exit current state
        currentHandler.exit(this.stateContext, newState);
        
        // Change state
        this.currentState = newState;
        
        // Enter new state
        newHandler.enter(this.stateContext, previousState);
        
        // Reset time in state
        this.stateContext.timeInState = 0;
        
        // Log transition
        this.logger.debug(`Transitioned from ${previousState} to ${newState} (${reason})`);
        
        // Emit state change event
        this.eventSystem.emit(GameEventType.MOVEMENT_STATE_CHANGE, {
            entityId: Number(this.entityId),
            previousState: previousState as unknown as MovementStateType,
            newState: newState as unknown as MovementStateType
        });
        
        return true;
    }
    
    /**
     * Get all possible transitions from the current state
     * @returns Array of possible transitions
     */
    public getPossibleTransitions(): StateTransition[] {
        return this.transitions.filter(t => t.from === this.currentState);
    }
    
    /**
     * Get all transitions in the state machine
     * @returns Array of all transitions
     */
    public getAllTransitions(): StateTransition[] {
        return [...this.transitions];
    }
    
    /**
     * Generate a debug visualization of the state machine
     * @returns String representation of the state machine
     */
    public visualize(): string {
        let result = 'Movement State Machine:\n';
        
        // Add current state
        result += `Current State: ${this.currentState}\n\n`;
        
        // Add transitions grouped by source state
        const stateNames = Object.values(MovementState);
        
        for (const state of stateNames) {
            const stateTransitions = this.transitions.filter(t => t.from === state);
            if (stateTransitions.length === 0) continue;
            
            result += `From ${state}:\n`;
            
            for (const transition of stateTransitions) {
                result += `  → ${transition.to} (${transition.name}, priority: ${transition.priority})\n`;
            }
            
            result += '\n';
        }
        
        return result;
    }
} 