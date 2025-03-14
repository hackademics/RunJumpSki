/**
 * MovementComponent.ts
 * Handles entity movement
 * 
 * This component manages all aspects of entity movement including:
 * - Basic movement (running, walking)
 * - Jumping and falling
 * - Skiing on slopes
 * - Jetpack flight
 * - State transitions between movement modes
 * - Physics integration
 */

import { Vector3 } from '../../types/common/Vector3';
import { IEntity } from '../../entities/IEntity';
import { Component } from '../Component';
import { IMovementComponent } from './IMovementComponent';
import { MovementState, MovementStateHandler, MovementStateContext, TerrainData, RunningStateHandler, SkiingStateHandler, FlyingStateHandler, JetpackingStateHandler } from './MovementState';
import { PhysicsConfig } from '../../config/PhysicsConfig';
import { Logger } from '../../utils/Logger';
import { EventSystem } from '../../core/EventSystem';
import { GameEventType, MovementStateType, SurfaceType } from '../../types/events/EventTypes';
import { PhysicsSystem } from '../../core/PhysicsSystem';
import { MathUtils } from '../../utils/MathUtils';
import { MovementStateMachine } from './MovementStateMachine';

// Debug flag to enable/disable verbose logging
const DEBUG_MOVEMENT = false;

/**
 * Movement component implementation
 * 
 * @implements {IMovementComponent}
 */
export class MovementComponent implements IMovementComponent {
    /**
     * The entity this component belongs to
     */
    public entity?: IEntity;
    
    private logger: Logger;
    private eventSystem: EventSystem;
    private physicsSystem: PhysicsSystem;
    
    private currentState: MovementState;
    private stateHandlers: Map<MovementState, MovementStateHandler>;
    private stateContext: MovementStateContext;
    private stateMachine: MovementStateMachine;
    private timeInState: number;
    
    // Jump cooldown properties
    private jumpCooldownTime: number = 0.2; // 200ms cooldown between jumps
    private lastJumpTime: number = 0;
    
    // Jetpack properties
    private lastJetpackUseTime: number = 0;
    
    // Temporary vector for calculations to avoid creating new objects
    private tempVector: Vector3 = new Vector3();
    
    //--------------------------------------------------------------------------
    // INITIALIZATION & LIFECYCLE
    //--------------------------------------------------------------------------
    
    /**
     * Create a new MovementComponent
     */
    constructor() {
        this.logger = new Logger('MovementComponent');
        this.eventSystem = EventSystem.getInstance();
        this.physicsSystem = PhysicsSystem.getInstance();
        
        // Initialize state
        this.currentState = MovementState.RUNNING;
        this.timeInState = 0;
        
        // Create state handlers
        this.stateHandlers = new Map();
        this.stateHandlers.set(MovementState.RUNNING, new RunningStateHandler());
        this.stateHandlers.set(MovementState.SKIING, new SkiingStateHandler());
        this.stateHandlers.set(MovementState.FLYING, new FlyingStateHandler());
        this.stateHandlers.set(MovementState.JETPACKING, new JetpackingStateHandler());
        
        // Initialize state context
        this.stateContext = {
            position: new Vector3(),
            velocity: new Vector3(),
            acceleration: new Vector3(),
            grounded: true,
            terrainData: undefined,
            input: {
                forward: 0,
                right: 0,
                jump: false,
                ski: false,
                jetpack: false
            },
            energy: PhysicsConfig.jetpack.maxEnergy,
            maxEnergy: PhysicsConfig.jetpack.maxEnergy,
            energyUseRate: PhysicsConfig.jetpack.energyUseRate,
            energyRegenRate: PhysicsConfig.jetpack.energyRegenRate,
            gravity: PhysicsConfig.gravity,
            jumpForce: PhysicsConfig.player.movement.jumpForce,
            runSpeed: PhysicsConfig.player.movement.runSpeed,
            airControl: PhysicsConfig.player.movement.airControl,
            jetpackForce: PhysicsConfig.player.movement.jetpackForce,
            maxSpeed: PhysicsConfig.player.movement.maxSpeed,
            timeInState: 0
        };
        
        // Create state machine (will be properly initialized in init)
        this.stateMachine = new MovementStateMachine(
            MovementState.RUNNING,
            this.stateHandlers,
            this.stateContext,
            "0" // Temporary ID, will be updated in init
        );
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component is attached to
     */
    public init(entity: IEntity): void {
        this.logger.debug('Initializing movement component');
        
        // Set entity reference
        this.entity = entity;
        
        // Initialize position from entity
        this.stateContext.position = entity.getPosition().clone();
        
        // Register with physics system
        this.physicsSystem.addEntity(
            entity.id.toString(),
            entity.transform,
            PhysicsConfig.player.mass,
            {
                friction: PhysicsConfig.friction[SurfaceType.DEFAULT],
                restitution: 0.3,
                density: 1.0
            }
        );
        
        // Add skiing state
        this.physicsSystem.addSkiingState(entity.id.toString());
        
        // Initialize state machine with proper entity ID
        this.stateMachine = new MovementStateMachine(
            MovementState.RUNNING,
            this.stateHandlers,
            this.stateContext,
            this.entity.id.toString()
        );
        
        // Enter initial state
        this.getCurrentStateHandler().enter(this.stateContext, this.currentState);
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        if (!this.entity) {
            return;
        }
        
        // Performance tracking for debugging
        const startTime = DEBUG_MOVEMENT ? performance.now() : 0;
        
        // Update time in state
        this.timeInState += deltaTime;
        this.stateContext.timeInState = this.timeInState;
        
        // Update position from entity
        this.stateContext.position = this.entity.getPosition().clone();
        
        // Get physics state
        const physicsState = this.physicsSystem.getPhysicsState(this.entity.id.toString());
        if (physicsState) {
            // Update grounded state from physics
            const wasGrounded = this.stateContext.grounded;
            this.stateContext.grounded = physicsState.isOnGround;
            
            // Log ground state changes for debugging
            if (DEBUG_MOVEMENT && wasGrounded !== this.stateContext.grounded) {
                this.logger.debug(`Ground state changed: ${wasGrounded ? 'grounded → airborne' : 'airborne → grounded'}`);
            }
            
            // Update velocity from physics
            this.stateContext.velocity = physicsState.velocity.clone();
        }
        
        // Update state machine
        this.stateMachine.update(deltaTime);
        
        // Update current state from state machine
        this.currentState = this.stateMachine.getCurrentState();
        
        // Handle energy regeneration when not jetpacking
        if (this.currentState !== MovementState.JETPACKING) {
            // Check if we need to wait for regeneration delay
            const currentTime = performance.now() / 1000;
            const timeSinceLastJetpack = currentTime - this.lastJetpackUseTime;
            
            if (timeSinceLastJetpack >= PhysicsConfig.jetpack.regenDelay) {
                // Regenerate energy
                this.addEnergy(this.stateContext.energyRegenRate * deltaTime);
            } else {
                // Update last jetpack use time
                this.lastJetpackUseTime = performance.now() / 1000;
            }
        }
        
        // Check for state transitions
        const transition = this.getCurrentStateHandler().checkTransition(this.stateContext);
        if (transition.nextState !== null) {
            this.transitionToState(transition.nextState, transition.reason);
        }
        
        // Apply velocity to position
        const movement = this.stateContext.velocity.scale(deltaTime);
        this.stateContext.position.addInPlace(movement);
        
        // Update entity position
        this.entity.setPosition(this.stateContext.position);
        
        // Update physics state
        if (physicsState) {
            physicsState.velocity = this.stateContext.velocity.clone();
            physicsState.position = this.stateContext.position.clone();
        }
        
        // Performance tracking for debugging
        if (DEBUG_MOVEMENT) {
            const endTime = performance.now();
            const updateTime = (endTime - startTime).toFixed(2);
            
            // Only log if update took more than 1ms
            if (endTime - startTime > 1) {
                this.logger.debug(`Movement update took ${updateTime}ms`);
            }
        }
    }
    
    /**
     * Clean up the component
     */
    public dispose(): void {
        this.logger.debug('Disposing movement component');
        
        // Unregister from physics system
        if (this.entity) {
            this.physicsSystem.removeEntity(this.entity.id.toString());
        }
        
        // Properly unsubscribe from events to prevent memory leaks
        // Create a bound function reference that matches what we used when subscribing
        const boundHandleLandEvent = this.handleLandEvent.bind(this);
        this.eventSystem.off(GameEventType.MOVEMENT_LAND, boundHandleLandEvent);
        
        // Clear references to help garbage collection
        this.stateHandlers.clear();
        this.stateContext.velocity.set(0, 0, 0);
        this.stateContext.acceleration.set(0, 0, 0);
        this.stateContext.position.set(0, 0, 0);
        this.stateContext.terrainData = undefined;
        
        this.logger.debug('Movement component disposed');
    }
    
    /**
     * Reset the movement component to its default state
     */
    public reset(): void {
        this.stateContext.velocity = new Vector3(0, 0, 0);
        this.stateContext.acceleration = new Vector3(0, 0, 0);
        this.stateContext.grounded = true;
        this.stateContext.energy = this.stateContext.maxEnergy;
        this.transitionToState(MovementState.RUNNING, 'Reset');
        
        // Reset terrain data
        this.stateContext.terrainData = {
            normal: Vector3.up(),
            surfaceType: SurfaceType.DEFAULT,
            friction: PhysicsConfig.friction[SurfaceType.DEFAULT],
            slopeAngle: 0,
            slopeDirection: Vector3.forward()
        };
    }
    
    //--------------------------------------------------------------------------
    // STATE MANAGEMENT
    //--------------------------------------------------------------------------
    
    /**
     * Get the current movement state
     * @returns Current movement state
     */
    public getState(): MovementState {
        return this.currentState;
    }
    
    /**
     * Get the state handler for a specific state
     * @param state Movement state
     * @returns State handler for the specified state
     */
    public getStateHandler(state: MovementState): MovementStateHandler {
        return this.stateHandlers.get(state)!;
    }
    
    /**
     * Get the current state handler
     * @returns Current state handler
     */
    public getCurrentStateHandler(): MovementStateHandler {
        return this.stateMachine.getCurrentStateHandler();
    }
    
    /**
     * Transition to a new state
     * @param newState New state
     * @param reason Reason for transition
     * @returns Whether the transition was successful
     */
    public transitionToState(newState: MovementState, reason: string): boolean {
        return this.stateMachine.transitionTo(newState, reason);
    }
    
    /**
     * Get the time spent in the current state
     * @returns Time in seconds
     */
    public getTimeInState(): number {
        return this.timeInState;
    }
    
    //--------------------------------------------------------------------------
    // PHYSICS & MOVEMENT
    //--------------------------------------------------------------------------
    
    /**
     * Get the current velocity
     * @returns Current velocity
     */
    public getVelocity(): Vector3 {
        return this.stateContext.velocity.clone();
    }
    
    /**
     * Get the current speed (magnitude of velocity)
     * @returns Current speed
     */
    public getSpeed(): number {
        return this.stateContext.velocity.length();
    }
    
    /**
     * Apply a force to the entity
     * @param force Force vector
     */
    public applyForce(force: Vector3): void {
        if (!this.entity) return;
        
        // Get physics system
        const physicsSystem = PhysicsSystem.getInstance();
        if (!physicsSystem) return;
        
        // Apply force to entity
        physicsSystem.applyForce(this.entity.id.toString(), force);
    }
    
    /**
     * Apply an impulse to the entity
     * @param impulse Impulse vector
     */
    public applyImpulse(impulse: Vector3): void {
        if (!this.entity) return;
        
        // Get physics system
        const physicsSystem = PhysicsSystem.getInstance();
        if (!physicsSystem) return;
        
        // Apply impulse to entity
        physicsSystem.applyImpulse(this.entity.id.toString(), impulse);
    }
    
    /**
     * Set the velocity directly
     * @param velocity New velocity
     */
    public setVelocity(velocity: Vector3): void {
        this.stateContext.velocity = velocity.clone();
    }
    
    /**
     * Check if the entity is grounded
     * @returns Whether the entity is grounded
     */
    public isGrounded(): boolean {
        return this.stateContext.grounded;
    }
    
    /**
     * Set the grounded state
     * @param grounded Whether the entity is grounded
     */
    public setGrounded(grounded: boolean): void {
        this.stateContext.grounded = grounded;
        
        // Update physics system
        if (this.entity) {
            this.physicsSystem.setGroundState(
                this.entity.id.toString(),
                grounded
            );
        }
    }
    
    /**
     * Get the current terrain data
     * @returns Current terrain data or undefined if not grounded
     */
    public getTerrainData(): TerrainData | undefined {
        return this.stateContext.terrainData;
    }
    
    /**
     * Update terrain data for movement calculations
     * @param terrainData Terrain data
     */
    public updateTerrainData(terrainData: TerrainData): void {
        this.stateContext.terrainData = terrainData;
    }
    
    //--------------------------------------------------------------------------
    // INPUT HANDLING
    //--------------------------------------------------------------------------
    
    /**
     * Set the movement input
     * @param forward Forward input (-1 to 1)
     * @param right Right input (-1 to 1)
     */
    public setMovementInput(forward: number, right: number): void {
        this.stateContext.input.forward = Math.max(-1, Math.min(1, forward));
        this.stateContext.input.right = Math.max(-1, Math.min(1, right));
    }
    
    /**
     * Set the jump input
     * @param jumping Whether jump is pressed
     */
    public setJumpInput(jumping: boolean): void {
        // Store previous jump state to detect when jump is first pressed
        const wasJumping = this.stateContext.input.jump;
        
        // Update jump input state
        this.stateContext.input.jump = jumping;
        
        // If jump was just pressed and we're in a state that can jump, perform jump
        if (jumping && !wasJumping) {
            this.tryJump();
        }
    }
    
    /**
     * Set the ski input
     * @param skiing Whether ski is held
     */
    public setSkiInput(skiing: boolean): void {
        // Store previous ski state to detect changes
        const wasSkiing = this.stateContext.input.ski;
        
        // Update ski input state
        this.stateContext.input.ski = skiing;
        
        // If ski was just pressed, try to transition to skiing state
        if (skiing && !wasSkiing) {
            this.tryStartSkiing();
        }
        
        // If ski was just released and we're in skiing state, transition to running
        if (!skiing && wasSkiing && this.currentState === MovementState.SKIING) {
            this.transitionToState(MovementState.RUNNING, 'Ski input released');
        }
        
        // Update skiing state in physics system
        if (this.entity) {
            this.physicsSystem.setSkiing(
                this.entity.id.toString(),
                skiing && this.currentState === MovementState.SKIING
            );
        }
    }
    
    /**
     * Set the jetpack input
     * @param jetpacking Whether jetpack is held
     */
    public setJetpackInput(jetpacking: boolean): void {
        // Store previous jetpack state to detect changes
        const wasJetpacking = this.stateContext.input.jetpack;
        
        // Update jetpack input state
        this.stateContext.input.jetpack = jetpacking;
        
        // If jetpack was just activated and we have enough energy, try to start jetpacking
        if (jetpacking && !wasJetpacking && this.stateContext.energy >= PhysicsConfig.jetpack.minEnergyForUse) {
            this.tryStartJetpacking();
        }
    }
    
    //--------------------------------------------------------------------------
    // JUMPING
    //--------------------------------------------------------------------------
    
    /**
     * Try to perform a jump
     * @returns Whether the jump was successful
     */
    public tryJump(): boolean {
        // Can only jump if grounded and in RUNNING or SKIING state
        if (!this.stateContext.grounded) {
            if (DEBUG_MOVEMENT) {
                this.logger.debug('Jump failed: Not grounded');
            }
            return false;
        }
        
        if (this.currentState !== MovementState.RUNNING && this.currentState !== MovementState.SKIING) {
            if (DEBUG_MOVEMENT) {
                this.logger.debug(`Jump failed: Invalid state ${this.currentState}`);
            }
            return false;
        }
        
        // Check jump cooldown
        const currentTime = performance.now() / 1000; // Convert to seconds
        if (currentTime - this.lastJumpTime < this.jumpCooldownTime) {
            const remainingCooldown = (this.jumpCooldownTime - (currentTime - this.lastJumpTime)).toFixed(2);
            this.logger.debug(`Jump on cooldown. Remaining: ${remainingCooldown}s`);
            return false;
        }
        
        // Apply jump force
        this.jump();
        
        // Update last jump time
        this.lastJumpTime = currentTime;
        
        // Transition to flying state
        this.transitionToState(MovementState.FLYING, 'Jump initiated');
        
        // Emit jump event
        this.eventSystem.emit(GameEventType.MOVEMENT_JUMP, {
            entityId: this.entity?.id || 0,
            position: this.stateContext.position.clone(),
            velocity: this.stateContext.velocity.clone(),
            force: this.stateContext.jumpForce
        });
        
        if (DEBUG_MOVEMENT) {
            this.logger.debug(`Jump successful: velocity=${this.stateContext.velocity.toString()}`);
        }
        
        return true;
    }
    
    /**
     * Perform a jump
     */
    private jump(): void {
        // Apply jump force to velocity
        this.stateContext.velocity.y = this.stateContext.jumpForce;
        
        // Add a boost in the direction of movement for better feel
        if (this.stateContext.input.forward !== 0 || this.stateContext.input.right !== 0) {
            // Reuse tempVector for calculations to avoid creating new Vector3 objects
            const moveDir = this.getTempVector().set(
                this.stateContext.input.right,
                0,
                this.stateContext.input.forward
            ).normalizeInPlace();
            
            // Calculate horizontal boost based on current speed
            // Use squared length for performance when possible
            const currentHorizontalSpeedSquared = 
                this.stateContext.velocity.x * this.stateContext.velocity.x + 
                this.stateContext.velocity.z * this.stateContext.velocity.z;
            
            const currentHorizontalSpeed = Math.sqrt(currentHorizontalSpeedSquared);
            
            // Scale boost based on current speed (more boost at higher speeds)
            // but with a minimum boost even at low speeds
            const minBoost = 2.0;
            const speedFactor = 0.2; // How much current speed affects boost
            const horizontalBoost = Math.max(minBoost, currentHorizontalSpeed * speedFactor);
            
            this.logger.debug(`Jump horizontal boost: ${horizontalBoost.toFixed(2)} based on speed: ${currentHorizontalSpeed.toFixed(2)}`);
            
            // Apply horizontal boost
            this.stateContext.velocity.x += moveDir.x * horizontalBoost;
            this.stateContext.velocity.z += moveDir.z * horizontalBoost;
        }
        
        // Set grounded to false immediately
        this.stateContext.grounded = false;
        
        // Apply jump in physics system
        if (this.entity) {
            this.physicsSystem.jump(
                this.entity.id.toString(),
                this.stateContext.jumpForce
            );
        }
        
        this.logger.debug(`Jump performed with force: ${this.stateContext.jumpForce}`);
    }
    
    /**
     * Check if jump is on cooldown
     * @returns Object with isOnCooldown status and remainingTime in seconds
     */
    public getJumpCooldownStatus(): { isOnCooldown: boolean; remainingTime: number } {
        const currentTime = performance.now() / 1000;
        const timeSinceLastJump = currentTime - this.lastJumpTime;
        const isOnCooldown = timeSinceLastJump < this.jumpCooldownTime;
        const remainingTime = isOnCooldown ? this.jumpCooldownTime - timeSinceLastJump : 0;
        
        return {
            isOnCooldown,
            remainingTime
        };
    }
    
    /**
     * Set the jump cooldown time
     * @param cooldownTime Cooldown time in seconds
     */
    public setJumpCooldownTime(cooldownTime: number): void {
        this.jumpCooldownTime = Math.max(0, cooldownTime);
    }
    
    //--------------------------------------------------------------------------
    // ENERGY MANAGEMENT
    //--------------------------------------------------------------------------
    
    /**
     * Get the current energy level
     * @returns Current energy level
     */
    public getEnergy(): number {
        return this.stateContext.energy;
    }
    
    /**
     * Get the maximum energy level
     * @returns Maximum energy level
     */
    public getMaxEnergy(): number {
        return this.stateContext.maxEnergy;
    }
    
    /**
     * Set the energy level
     * @param energy New energy level
     */
    public setEnergy(energy: number): void {
        this.stateContext.energy = Math.max(0, Math.min(this.stateContext.maxEnergy, energy));
    }
    
    /**
     * Add energy
     * @param amount Amount to add
     * @returns New energy level
     */
    public addEnergy(amount: number): number {
        this.setEnergy(this.stateContext.energy + amount);
        return this.stateContext.energy;
    }
    
    /**
     * Use energy
     * @param amount Amount to use
     * @returns Whether there was enough energy
     */
    public useEnergy(amount: number): boolean {
        if (this.stateContext.energy < amount) {
            return false;
        }
        
        this.setEnergy(this.stateContext.energy - amount);
        return true;
    }
    
    //--------------------------------------------------------------------------
    // CONFIGURATION
    //--------------------------------------------------------------------------
    
    /**
     * Get the movement parameters
     * @returns Movement parameters
     */
    public getMovementParams(): {
        runSpeed: number;
        jumpForce: number;
        airControl: number;
        jetpackForce: number;
        maxSpeed: number;
        gravity: number;
    } {
        return {
            runSpeed: this.stateContext.runSpeed,
            jumpForce: this.stateContext.jumpForce,
            airControl: this.stateContext.airControl,
            jetpackForce: this.stateContext.jetpackForce,
            maxSpeed: this.stateContext.maxSpeed,
            gravity: this.stateContext.gravity
        };
    }
    
    /**
     * Set a movement parameter
     * @param param Parameter name
     * @param value New value
     */
    public setMovementParam(
        param: 'runSpeed' | 'jumpForce' | 'airControl' | 'jetpackForce' | 'maxSpeed' | 'gravity',
        value: number
    ): void {
        this.stateContext[param] = value;
    }
    
    //--------------------------------------------------------------------------
    // SPECIAL MOVEMENT
    //--------------------------------------------------------------------------
    
    /**
     * Apply weapon recoil
     * @param direction Direction of recoil
     * @param force Force of recoil
     */
    public applyWeaponRecoil(direction: Vector3, force: number): void {
        this.applyImpulse(direction.normalize().scale(force));
    }
    
    /**
     * Perform a disk jump
     * @param direction Direction to jump
     * @returns Whether the disk jump was successful
     */
    public diskJump(direction: Vector3): boolean {
        // Apply vertical and horizontal force
        const normalizedDir = direction.normalize();
        const verticalForce = new Vector3(0, PhysicsConfig.diskJump.verticalForce, 0);
        const horizontalForce = normalizedDir.scale(PhysicsConfig.diskJump.horizontalForce);
        
        this.applyImpulse(verticalForce.add(horizontalForce));
        
        return true;
    }
    
    //--------------------------------------------------------------------------
    // EVENT HANDLING
    //--------------------------------------------------------------------------
    
    /**
     * Handle landing event
     * @param event Landing event
     */
    private handleLandEvent(event: any): void {
        // Validate event and entity
        if (!event || !this.entity || event.entityId !== this.entity.id) {
            return;
        }
        
        // Validate required event properties
        if (event.impactForce === undefined || event.surfaceType === undefined) {
            this.logger.warn('Received incomplete landing event');
            return;
        }
        
        this.logger.debug(`Landed with impact force: ${event.impactForce.toFixed(2)}`);
        
        // Set grounded state
        this.stateContext.grounded = true;
        
        // Reset jump cooldown when landing
        this.lastJumpTime = 0;
        
        // Update terrain data
        try {
            let surfaceType = event.surfaceType as SurfaceType;
            
            // Validate that the surfaceType exists in PhysicsConfig.friction
            if (!(surfaceType in PhysicsConfig.friction)) {
                this.logger.warn(`Unknown surface type: ${surfaceType}, using DEFAULT`);
                surfaceType = SurfaceType.DEFAULT;
            }
            
            this.stateContext.terrainData = {
                normal: event.normal ? event.normal.clone() : Vector3.up(),
                surfaceType: surfaceType,
                friction: PhysicsConfig.friction[surfaceType],
                slopeAngle: event.slopeAngle || 0,
                slopeDirection: event.slopeDirection ? event.slopeDirection.clone() : Vector3.forward()
            };
        } catch (error) {
            this.logger.error(`Error updating terrain data: ${error}`);
            // Fallback to default terrain data
            this.stateContext.terrainData = {
                normal: Vector3.up(),
                surfaceType: SurfaceType.DEFAULT,
                friction: PhysicsConfig.friction[SurfaceType.DEFAULT],
                slopeAngle: 0,
                slopeDirection: Vector3.forward()
            };
        }
        
        // Transition to appropriate state if currently flying
        if (this.currentState === MovementState.FLYING) {
            if (this.stateContext.input.ski) {
                this.transitionToState(MovementState.SKIING, 'Landed while holding ski');
            } else {
                this.transitionToState(MovementState.RUNNING, 'Landed');
            }
        }
    }
    
    //--------------------------------------------------------------------------
    // UTILITY METHODS
    //--------------------------------------------------------------------------
    
    /**
     * Get a temporary vector for calculations
     * @returns Temporary vector
     */
    private getTempVector(): Vector3 {
        return this.tempVector;
    }
    
    /**
     * Try to start skiing
     * @returns Whether skiing was successfully started
     */
    public tryStartSkiing(): boolean {
        // Can only start skiing if grounded and in RUNNING state
        if (!this.stateContext.grounded || this.currentState !== MovementState.RUNNING) {
            return false;
        }
        
        // Check if we're on a skiable slope
        let canSki = false;
        
        if (this.entity) {
            // Check with physics system if we're on a skiable slope
            canSki = this.physicsSystem.isOnSkiableSlope(this.entity.id.toString());
            
            // If not on a skiable slope, we can still ski but with higher friction
            if (!canSki) {
                // Get slope data from physics system
                const slopeData = this.physicsSystem.getSlopeData(this.entity.id.toString());
                
                // Update terrain data with slope information
                if (slopeData) {
                    if (!this.stateContext.terrainData) {
                        // Create new terrain data if none exists
                        this.stateContext.terrainData = {
                            normal: Vector3.up(),
                            surfaceType: SurfaceType.DEFAULT,
                            friction: PhysicsConfig.friction[SurfaceType.DEFAULT],
                            slopeAngle: slopeData.angle,
                            slopeDirection: slopeData.direction.clone()
                        };
                    } else {
                        // Update existing terrain data
                        this.stateContext.terrainData.slopeAngle = slopeData.angle;
                        this.stateContext.terrainData.slopeDirection = slopeData.direction.clone();
                    }
                    
                    // Allow skiing on any slope, but it will be less effective on flat ground
                    canSki = true;
                    
                    if (DEBUG_MOVEMENT) {
                        this.logger.debug(`Starting skiing on slope with angle: ${MathUtils.toDegrees(slopeData.angle).toFixed(1)}° (min: ${PhysicsConfig.skiing.minSkiAngle}°)`);
                    }
                }
            }
        }
        
        if (!canSki) {
            if (DEBUG_MOVEMENT) {
                this.logger.debug('Cannot start skiing: Not on a skiable slope');
            }
            return false;
        }
        
        // Transition to skiing state
        this.transitionToState(MovementState.SKIING, 'Started skiing');
        
        // Emit skiing event
        this.eventSystem.emit(GameEventType.MOVEMENT_SKI_START, {
            entityId: this.entity?.id || 0,
            position: this.stateContext.position.clone(),
            velocity: this.stateContext.velocity.clone()
        });
        
        return true;
    }
    
    /**
     * Try to start jetpacking
     * @returns Whether jetpacking was successfully started
     */
    public tryStartJetpacking(): boolean {
        // Can't start jetpacking if already jetpacking
        if (this.currentState === MovementState.JETPACKING) {
            return false;
        }
        
        // Check if we have enough energy
        if (this.stateContext.energy < PhysicsConfig.jetpack.minEnergyForUse) {
            if (DEBUG_MOVEMENT) {
                this.logger.debug(`Cannot start jetpacking: Not enough energy (${this.stateContext.energy.toFixed(1)}/${PhysicsConfig.jetpack.minEnergyForUse})`);
            }
            return false;
        }
        
        // Transition to jetpacking state
        this.transitionToState(MovementState.JETPACKING, 'Started jetpacking');
        
        // Emit jetpack start event
        this.eventSystem.emit(GameEventType.JETPACK_START, {
            entityId: this.entity?.id || 0,
            position: this.stateContext.position.clone(),
            velocity: this.stateContext.velocity.clone()
        });
        
        // Update last jetpack use time
        this.lastJetpackUseTime = performance.now() / 1000;
        
        return true;
    }
    
    /**
     * Get the current jetpack energy level
     * @returns Current energy level
     */
    public getJetpackEnergy(): number {
        return this.stateContext.energy;
    }
    
    /**
     * Get the maximum jetpack energy level
     * @returns Maximum energy level
     */
    public getJetpackMaxEnergy(): number {
        return this.stateContext.maxEnergy;
    }
    
    /**
     * Get the jetpack energy percentage
     * @returns Energy percentage (0-1)
     */
    public getJetpackEnergyPercentage(): number {
        return this.stateContext.energy / this.stateContext.maxEnergy;
    }
    
    /**
     * Check if the entity is currently jetpacking
     * @returns Whether the entity is jetpacking
     */
    public isJetpacking(): boolean {
        return this.currentState === MovementState.JETPACKING;
    }
    
    /**
     * Get the string representation of a movement state
     * @param state Movement state
     * @returns String representation of the state
     */
    private getStateNameString(state: MovementState): string {
        switch (state) {
            case MovementState.RUNNING:
                return 'running';
            case MovementState.SKIING:
                return 'skiing';
            case MovementState.FLYING:
                return 'flying';
            case MovementState.JETPACKING:
                return 'jetpacking';
            default:
                return 'unknown';
        }
    }
    
    /**
     * Get a visualization of the state machine
     * @returns String representation of the state machine
     */
    public visualizeStateMachine(): string {
        return this.stateMachine.visualize();
    }
}
