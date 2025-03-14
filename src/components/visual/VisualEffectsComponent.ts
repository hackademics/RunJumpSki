/**
 * VisualEffectsComponent.ts
 * Handles visual effects for different entity states
 */

import { Component } from '../Component';
import { IEntity } from '../../entities/IEntity';
import { EventSystem } from '../../core/EventSystem';
import { GameEventType } from '../../types/events/EventTypes';
import { MovementState } from '../movement/MovementState';
import { Logger } from '../../utils/Logger';
import { Vector3 } from '../../types/common/Vector3';

/**
 * Visual effects configuration
 */
export interface VisualEffectsConfig {
    // Skiing effects
    skiTrailEnabled: boolean;
    skiTrailColor: string;
    skiTrailWidth: number;
    skiTrailDuration: number;
    
    // Jetpack effects
    jetpackEnabled: boolean;
    jetpackFlameColor: string;
    jetpackSmokeColor: string;
    
    // Jump/land effects
    jumpEffectEnabled: boolean;
    landEffectEnabled: boolean;
    landEffectThreshold: number; // Minimum impact force to show effect
}

/**
 * Default visual effects configuration
 */
export const DEFAULT_VISUAL_EFFECTS_CONFIG: VisualEffectsConfig = {
    skiTrailEnabled: true,
    skiTrailColor: '#80C0FF',
    skiTrailWidth: 0.2,
    skiTrailDuration: 1.5,
    
    jetpackEnabled: true,
    jetpackFlameColor: '#FF8040',
    jetpackSmokeColor: '#808080',
    
    jumpEffectEnabled: true,
    landEffectEnabled: true,
    landEffectThreshold: 5.0
};

/**
 * Component that handles visual effects for different entity states
 */
export class VisualEffectsComponent extends Component {
    private config: VisualEffectsConfig;
    private logger: Logger;
    private eventSystem: EventSystem;
    
    // Effect state tracking
    private isSkiing: boolean = false;
    private isUsingJetpack: boolean = false;
    private skiTrailPoints: Vector3[] = [];
    private lastTrailTime: number = 0;
    private lastPosition: Vector3 = new Vector3();
    
    /**
     * Create a new VisualEffectsComponent
     * @param config Visual effects configuration
     */
    constructor(config: Partial<VisualEffectsConfig> = {}) {
        super('visualEffects');
        
        this.config = { ...DEFAULT_VISUAL_EFFECTS_CONFIG, ...config };
        this.logger = new Logger('VisualEffectsComponent');
        this.eventSystem = EventSystem.getInstance();
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component is attached to
     */
    public init(entity: IEntity): void {
        super.init(entity);
        
        // Subscribe to events
        this.eventSystem.subscribe(GameEventType.MOVEMENT_STATE_CHANGE, this.handleStateChange.bind(this));
        this.eventSystem.subscribe(GameEventType.MOVEMENT_SKI_START, this.handleSkiStart.bind(this));
        this.eventSystem.subscribe(GameEventType.MOVEMENT_STOP_SKIING, this.handleSkiStop.bind(this));
        this.eventSystem.subscribe(GameEventType.MOVEMENT_START_JETPACK, this.handleJetpackStart.bind(this));
        this.eventSystem.subscribe(GameEventType.MOVEMENT_STOP_JETPACK, this.handleJetpackStop.bind(this));
        this.eventSystem.subscribe(GameEventType.MOVEMENT_JUMP, this.handleJump.bind(this));
        this.eventSystem.subscribe(GameEventType.MOVEMENT_LAND, this.handleLand.bind(this));
        
        // Initialize last position
        if (this.entity) {
            this.lastPosition = this.entity.transform.position.clone();
        }
        
        this.logger.debug('VisualEffectsComponent initialized');
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        if (!this.entity) return;
        
        const currentPosition = this.entity.transform.position;
        
        // Update skiing effects
        if (this.isSkiing && this.config.skiTrailEnabled) {
            this.updateSkiTrail(deltaTime, currentPosition);
        }
        
        // Update jetpack effects
        if (this.isUsingJetpack && this.config.jetpackEnabled) {
            this.updateJetpackEffects(deltaTime);
        }
        
        // Store last position
        this.lastPosition = currentPosition.clone();
    }
    
    /**
     * Clean up the component
     */
    public dispose(): void {
        // Unsubscribe from events
        this.eventSystem.unsubscribe(GameEventType.MOVEMENT_STATE_CHANGE, this.handleStateChange.bind(this));
        this.eventSystem.unsubscribe(GameEventType.MOVEMENT_SKI_START, this.handleSkiStart.bind(this));
        this.eventSystem.unsubscribe(GameEventType.MOVEMENT_STOP_SKIING, this.handleSkiStop.bind(this));
        this.eventSystem.unsubscribe(GameEventType.MOVEMENT_START_JETPACK, this.handleJetpackStart.bind(this));
        this.eventSystem.unsubscribe(GameEventType.MOVEMENT_STOP_JETPACK, this.handleJetpackStop.bind(this));
        this.eventSystem.unsubscribe(GameEventType.MOVEMENT_JUMP, this.handleJump.bind(this));
        this.eventSystem.unsubscribe(GameEventType.MOVEMENT_LAND, this.handleLand.bind(this));
        
        // Clear trail points
        this.skiTrailPoints = [];
        
        this.logger.debug('VisualEffectsComponent disposed');
    }
    
    /**
     * Handle movement state changes
     * @param event State change event
     */
    private handleStateChange(event: any): void {
        if (!this.entity || event.entityId !== this.entity.id) return;
        
        const { previousState, newState } = event;
        
        // Update skiing state
        if (newState === MovementState.SKIING && previousState !== MovementState.SKIING) {
            this.startSkiingEffects();
        } else if (previousState === MovementState.SKIING && newState !== MovementState.SKIING) {
            this.stopSkiingEffects();
        }
        
        // Update jetpack state
        if (newState === MovementState.JETPACKING && previousState !== MovementState.JETPACKING) {
            this.startJetpackEffects();
        } else if (previousState === MovementState.JETPACKING && newState !== MovementState.JETPACKING) {
            this.stopJetpackEffects();
        }
    }
    
    /**
     * Handle ski start event
     * @param event Ski start event
     */
    private handleSkiStart(event: any): void {
        if (!this.entity || event.entityId !== this.entity.id) return;
        this.startSkiingEffects();
    }
    
    /**
     * Handle ski stop event
     * @param event Ski stop event
     */
    private handleSkiStop(event: any): void {
        if (!this.entity || event.entityId !== this.entity.id) return;
        this.stopSkiingEffects();
    }
    
    /**
     * Handle jetpack start event
     * @param event Jetpack start event
     */
    private handleJetpackStart(event: any): void {
        if (!this.entity || event.entityId !== this.entity.id) return;
        this.startJetpackEffects();
    }
    
    /**
     * Handle jetpack stop event
     * @param event Jetpack stop event
     */
    private handleJetpackStop(event: any): void {
        if (!this.entity || event.entityId !== this.entity.id) return;
        this.stopJetpackEffects();
    }
    
    /**
     * Handle jump event
     * @param event Jump event
     */
    private handleJump(event: any): void {
        if (!this.entity || event.entityId !== this.entity.id || !this.config.jumpEffectEnabled) return;
        this.createJumpEffect(event.force);
    }
    
    /**
     * Handle land event
     * @param event Land event
     */
    private handleLand(event: any): void {
        if (!this.entity || event.entityId !== this.entity.id || !this.config.landEffectEnabled) return;
        
        // Only show landing effect if impact force is above threshold
        if (event.impactForce >= this.config.landEffectThreshold) {
            this.createLandEffect(event.impactForce, event.surfaceType);
        }
    }
    
    /**
     * Start skiing visual effects
     */
    private startSkiingEffects(): void {
        if (this.isSkiing) return;
        
        this.isSkiing = true;
        this.skiTrailPoints = [];
        this.lastTrailTime = 0;
        
        this.logger.debug('Started skiing effects');
    }
    
    /**
     * Stop skiing visual effects
     */
    private stopSkiingEffects(): void {
        if (!this.isSkiing) return;
        
        this.isSkiing = false;
        
        // Clear trail after duration
        setTimeout(() => {
            this.skiTrailPoints = [];
        }, this.config.skiTrailDuration * 1000);
        
        this.logger.debug('Stopped skiing effects');
    }
    
    /**
     * Start jetpack visual effects
     */
    private startJetpackEffects(): void {
        if (this.isUsingJetpack) return;
        
        this.isUsingJetpack = true;
        
        this.logger.debug('Started jetpack effects');
    }
    
    /**
     * Stop jetpack visual effects
     */
    private stopJetpackEffects(): void {
        if (!this.isUsingJetpack) return;
        
        this.isUsingJetpack = false;
        
        this.logger.debug('Stopped jetpack effects');
    }
    
    /**
     * Update ski trail
     * @param deltaTime Time since last update in seconds
     * @param currentPosition Current entity position
     */
    private updateSkiTrail(deltaTime: number, currentPosition: Vector3): void {
        // Add trail points periodically based on movement
        this.lastTrailTime += deltaTime;
        
        // Only add points if we've moved enough and enough time has passed
        const distanceMoved = Vector3.Distance(currentPosition, this.lastPosition);
        if (distanceMoved > 0.2 && this.lastTrailTime > 0.05) {
            // Add current position to trail
            this.skiTrailPoints.push(currentPosition.clone());
            
            // Limit trail length
            if (this.skiTrailPoints.length > 100) {
                this.skiTrailPoints.shift();
            }
            
            this.lastTrailTime = 0;
        }
    }
    
    /**
     * Update jetpack effects
     * @param deltaTime Time since last update in seconds
     */
    private updateJetpackEffects(deltaTime: number): void {
        if (!this.entity) return;
        
        // Get entity position and velocity
        const position = this.entity.getPosition();
        
        // In a real implementation with a rendering engine, we would:
        // 1. Create flame particles at the jetpack position (offset from player)
        // 2. Create smoke particles that trail behind
        // 3. Scale effects based on velocity and energy level
        // 4. Add light effects for the flame
        
        // For this implementation, we'll log the effect and emit events that could be
        // handled by a rendering system
        
        // Calculate jetpack position (slightly behind and below player)
        const jetpackOffset = new Vector3(0, -0.5, -0.3);
        const jetpackPosition = position.clone().add(jetpackOffset);
        
        // Get movement component to check energy level
        const movementComponent = this.entity.getComponent<any>('movement');
        let energyPercentage = 1.0;
        
        if (movementComponent && typeof movementComponent.getJetpackEnergyPercentage === 'function') {
            energyPercentage = movementComponent.getJetpackEnergyPercentage();
        }
        
        // Scale effects based on energy level
        const effectIntensity = Math.max(0.3, energyPercentage);
        
        // Emit event for rendering system
        this.eventSystem.emit(GameEventType.VISUAL_EFFECT, {
            effectType: 'jetpackFlame',
            position: jetpackPosition,
            color: this.config.jetpackFlameColor,
            intensity: effectIntensity,
            duration: deltaTime
        });
        
        // Create smoke effect with slight randomness
        if (Math.random() < 0.7 * effectIntensity) {
            const smokeOffset = new Vector3(
                (Math.random() - 0.5) * 0.2,
                -0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            const smokePosition = jetpackPosition.clone().add(smokeOffset);
            
            this.eventSystem.emit(GameEventType.VISUAL_EFFECT, {
                effectType: 'jetpackSmoke',
                position: smokePosition,
                color: this.config.jetpackSmokeColor,
                intensity: effectIntensity * 0.7,
                duration: 0.8 + Math.random() * 0.4
            });
        }
        
        // Log effect for debugging
        if (Math.random() < 0.05) { // Only log occasionally to avoid spam
            this.logger.debug(`Jetpack effect at ${jetpackPosition.toString()} with intensity ${effectIntensity.toFixed(2)}`);
        }
    }
    
    /**
     * Create jump effect
     * @param force Jump force
     */
    private createJumpEffect(force: number): void {
        // Create jump effect
        // In a real implementation, this would create particles or other visual effects
        this.logger.debug(`Jump effect with force: ${force}`);
    }
    
    /**
     * Create land effect
     * @param impactForce Impact force
     * @param surfaceType Surface type
     */
    private createLandEffect(impactForce: number, surfaceType: number): void {
        // Create landing effect based on surface type and impact force
        // In a real implementation, this would create particles or other visual effects
        this.logger.debug(`Land effect with force: ${impactForce} on surface type: ${surfaceType}`);
    }
    
    /**
     * Get ski trail points
     * @returns Array of trail points
     */
    public getSkiTrailPoints(): Vector3[] {
        return this.skiTrailPoints;
    }
    
    /**
     * Check if entity is skiing
     * @returns True if skiing
     */
    public isEntitySkiing(): boolean {
        return this.isSkiing;
    }
    
    /**
     * Check if entity is using jetpack
     * @returns True if using jetpack
     */
    public isEntityUsingJetpack(): boolean {
        return this.isUsingJetpack;
    }
} 