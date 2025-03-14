/**
 * MovementState.ts
 * Movement state enum and state handlers
 */

import { Vector3 } from '../../types/common/Vector3';
import { SurfaceType } from '../../types/events/EventTypes';
import { MathUtils } from '../../utils/MathUtils';
import { Logger } from '../../utils/Logger';
import { PhysicsConfig } from '../../config/PhysicsConfig';
import { Transform } from '../../types/common/Transform';

/**
 * Movement state enum
 */
export enum MovementState {
    RUNNING = 'running',
    SKIING = 'skiing',
    FLYING = 'flying',
    JETPACKING = 'jetpacking'
}

/**
 * Movement input data
 */
export interface MovementInput {
    /**
     * Forward input (-1 to 1)
     */
    forward: number;

    /**
     * Right input (-1 to 1)
     */
    right: number;

    /**
     * Jump input (pressed)
     */
    jump: boolean;

    /**
     * Ski input (held)
     */
    ski: boolean;

    /**
     * Jetpack input (held)
     */
    jetpack: boolean;
}

/**
 * Terrain data for movement calculations
 */
export interface TerrainData {
    /**
     * Surface normal
     */
    normal: Vector3;

    /**
     * Surface type
     */
    surfaceType: SurfaceType;

    /**
     * Surface friction
     */
    friction: number;

    /**
     * Slope angle in radians
     */
    slopeAngle: number;

    /**
     * Slope direction
     */
    slopeDirection: Vector3;
}

/**
 * Movement state context
 */
export interface MovementStateContext {
    /**
     * Current position
     */
    position: Vector3;

    /**
     * Current velocity
     */
    velocity: Vector3;

    /**
     * Current acceleration
     */
    acceleration: Vector3;

    /**
     * Whether the entity is grounded
     */
    grounded: boolean;

    /**
     * Current terrain data (if grounded)
     */
    terrainData?: TerrainData;

    /**
     * Current movement input
     */
    input: MovementInput;

    /**
     * Current energy level (0-100)
     */
    energy: number;

    /**
     * Maximum energy level
     */
    maxEnergy: number;

    /**
     * Energy use rate (per second)
     */
    energyUseRate: number;

    /**
     * Energy regeneration rate (per second)
     */
    energyRegenRate: number;

    /**
     * Gravity force
     */
    gravity: number;

    /**
     * Jump force
     */
    jumpForce: number;

    /**
     * Run speed
     */
    runSpeed: number;

    /**
     * Air control factor
     */
    airControl: number;

    /**
     * Jetpack force
     */
    jetpackForce: number;

    /**
     * Maximum speed
     */
    maxSpeed: number;

    /**
     * Time spent in current state
     */
    timeInState: number;
}

/**
 * State transition result
 */
export interface StateTransitionResult {
    /**
     * Next state to transition to, or null if no transition
     */
    nextState: MovementState | null;
    
    /**
     * Reason for transition
     */
    reason: string;
    
    /**
     * Priority of transition (higher numbers take precedence)
     */
    priority: number;
}

/**
 * Base movement state handler
 */
export abstract class MovementStateHandler {
    protected logger: Logger;
    protected tempVector: Vector3 = new Vector3();
    protected context: MovementStateContext;
    
    /**
     * Create a new MovementStateHandler
     */
    constructor() {
        this.logger = new Logger(`MovementState`);
        this.context = {
            position: new Vector3(),
            velocity: new Vector3(),
            acceleration: new Vector3(),
            grounded: false,
            input: {
                forward: 0,
                right: 0,
                jump: false,
                ski: false,
                jetpack: false
            },
            energy: 100,
            maxEnergy: 100,
            energyUseRate: 20,
            energyRegenRate: 10,
            gravity: 9.81,
            jumpForce: 5,
            runSpeed: 5,
            airControl: 0.3,
            jetpackForce: 10,
            maxSpeed: 40,
            timeInState: 0
        };
    }
    
    /**
     * Get the name of this state
     */
    public abstract getStateName(): string;

    /**
     * Update the movement state
     * @param context Movement state context
     * @param deltaTime Time since last update in seconds
     */
    public abstract update(context: MovementStateContext, deltaTime: number): void;

    /**
     * Enter the movement state
     * @param context Movement state context
     * @param previousState Previous movement state
     */
    public enter(context: MovementStateContext, previousState: MovementState): void {
        this.logger.debug(`Entering state from ${previousState}`);
        context.timeInState = 0;
    }

    /**
     * Exit the movement state
     * @param context Movement state context
     * @param nextState Next movement state
     */
    public exit(context: MovementStateContext, nextState: MovementState): void {
        this.logger.debug(`Exiting state to ${nextState} after ${context.timeInState.toFixed(2)}s`);
    }

    /**
     * Check if the state should transition to another state
     * @param context Movement state context
     * @returns State transition result
     */
    public abstract checkTransition(context: MovementStateContext): StateTransitionResult;
    
    /**
     * Regenerate energy
     * @param context Movement state context
     * @param deltaTime Time since last update in seconds
     */
    protected regenerateEnergy(context: MovementStateContext, deltaTime: number): void {
        if (context.energy < context.maxEnergy) {
            context.energy = Math.min(
                context.maxEnergy,
                context.energy + context.energyRegenRate * deltaTime
            );
        }
    }
    
    /**
     * Calculate movement direction from input
     * @param context Movement state context
     * @returns Normalized movement direction vector
     */
    protected calculateMoveDirection(context: MovementStateContext): Vector3 {
        // Return zero vector if no input
        if (context.input.forward === 0 && context.input.right === 0) {
            return Vector3.zero();
        }
        
        // Calculate movement direction from input
        return new Vector3(
            context.input.right,
            0,
            context.input.forward
        ).normalize();
    }
    
    /**
     * Apply friction to horizontal velocity
     * @param context Movement state context
     * @param friction Friction coefficient
     * @param deltaTime Time since last update in seconds
     */
    protected applyFriction(context: MovementStateContext, friction: number, deltaTime: number): void {
        const frictionFactor = 1 - friction * deltaTime * 10;
        context.velocity.x *= frictionFactor;
        context.velocity.z *= frictionFactor;
    }
    
    /**
     * Enforce maximum speed
     * @param context Movement state context
     */
    protected enforceMaxSpeed(context: MovementStateContext): void {
        const speedSquared = context.velocity.lengthSquared();
        if (speedSquared > context.maxSpeed * context.maxSpeed) {
            const speed = Math.sqrt(speedSquared);
            const scaleFactor = context.maxSpeed / speed;
            context.velocity.x *= scaleFactor;
            context.velocity.y *= scaleFactor;
            context.velocity.z *= scaleFactor;
        }
    }
    
    /**
     * Create a no transition result
     */
    protected noTransition(): StateTransitionResult {
        return {
            nextState: null,
            reason: "No transition",
            priority: 0
        };
    }
    
    /**
     * Create a transition result
     * @param nextState Next state
     * @param reason Reason for transition
     * @param priority Priority of transition
     */
    protected createTransition(
        nextState: MovementState, 
        reason: string, 
        priority: number = 1
    ): StateTransitionResult {
        return {
            nextState,
            reason,
            priority
        };
    }

    /**
     * Calculate the velocity for this state
     * @returns The calculated velocity
     */
    protected calculateVelocity(): Vector3 {
        // Default implementation returns zero velocity
        return Vector3.zero();
    }

    /**
     * Calculate the new horizontal velocity based on input and current velocity
     * @param input Movement input vector
     * @param currentVelocity Current velocity
     * @param acceleration Acceleration to apply
     * @param maxSpeed Maximum speed
     * @param deltaTime Time since last update
     * @returns New horizontal velocity
     */
    protected calculateHorizontalVelocity(
        input: Vector3,
        currentVelocity: Vector3,
        acceleration: number,
        maxSpeed: number,
        deltaTime: number
    ): Vector3 {
        // Create a horizontal version of the current velocity
        const horizontalVelocity = new Vector3(
            currentVelocity.x,
            0,
            currentVelocity.z
        );
        
        // If no input, return current horizontal velocity
        if (input.lengthSquared() < 0.01) {
            return horizontalVelocity;
        }
        
        // Calculate target velocity based on input direction and max speed
        const targetVelocity = input.normalize().scale(maxSpeed);
        
        // Interpolate between current velocity and target velocity
        const newHorizontalVelocity = Vector3.Lerp(
            horizontalVelocity,
            targetVelocity,
            acceleration * deltaTime
        );
        
        return newHorizontalVelocity;
    }

    /**
     * Calculate the slope-aligned movement direction
     * @param input Movement input
     * @param transform Entity transform
     * @returns Slope-aligned movement direction
     */
    protected calculateSlopeAlignedMovement(input: Vector3, transform: Transform): Vector3 {
        // If no terrain data or not on a slope, use regular movement
        if (!this.context.terrainData || this.context.terrainData.slopeAngle < 5) {
            const forward = transform.getForwardVector().scale(input.z);
            const right = transform.getRightVector().scale(input.x);
            return forward.add(right);
        }
        
        // Get slope direction from terrain data
        const slopeDirection = this.context.terrainData.slopeDirection;
        
        // Get up vector
        const up = Vector3.up();
        
        // Calculate right vector (perpendicular to slope direction and up)
        const right = slopeDirection.cross(up).normalize();
        
        // Calculate movement direction along the slope
        const moveDirection = slopeDirection.scale(input.z).add(right.scale(input.x));
        
        return moveDirection.normalize();
    }

    /**
     * Calculate jetpack force
     * @param input Movement input
     * @param transform Entity transform
     * @returns Jetpack force
     */
    protected calculateJetpackForce(input: Vector3, transform: Transform): Vector3 {
        // Default jetpack direction is up
        let jetpackDirection = Vector3.up();
        
        // If moving forward, blend jetpack direction with forward direction
        if (input.z > 0) {
            const forwardDir = transform.getForwardVector();
            jetpackDirection = Vector3.Lerp(
                jetpackDirection,
                forwardDir,
                input.z * 0.5 // Blend factor based on forward input
            );
        }
        
        // Calculate force based on jetpack force from context
        const jetpackPower = this.context.jetpackForce;
        return jetpackDirection.scale(jetpackPower);
    }
}

/**
 * Running state handler
 */
export class RunningStateHandler extends MovementStateHandler {
    /**
     * Get the name of this state
     */
    public getStateName(): string {
        return MovementState.RUNNING;
    }
    
    /**
     * Update the running state
     * @param context Movement state context
     * @param deltaTime Time since last update in seconds
     */
    public update(context: MovementStateContext, deltaTime: number): void {
        // Update time in state
        context.timeInState += deltaTime;
        
        // Apply movement based on input
        const moveDirection = this.calculateMoveDirection(context);
        
        // Calculate target velocity based on input and run speed
        const targetVelocity = moveDirection.scale(context.runSpeed);
        
        // Get current horizontal velocity
        const currentHorizontalVelocity = new Vector3(
            context.velocity.x,
            0,
            context.velocity.z
        );
        
        // Calculate friction based on surface
        let friction = PhysicsConfig.friction.default;
        if (context.terrainData) {
            friction = context.terrainData.friction;
        }
        
        // Apply friction to slow down when not actively moving
        if (moveDirection.lengthSquared() < 0.01) {
            // Apply stronger friction when not moving
            friction *= 2.0;
        } else {
            // Preserve some momentum when actively moving
            friction *= PhysicsConfig.momentum.surfaceFactors[SurfaceType.DEFAULT];
        }
        
        // Interpolate current velocity towards target velocity
        const t = Math.min(friction * deltaTime, 1);
        const newHorizontalVelocity = Vector3.Lerp(
            currentHorizontalVelocity,
            targetVelocity,
            t
        );
        
        // Update velocity
        context.velocity.x = newHorizontalVelocity.x;
        context.velocity.z = newHorizontalVelocity.z;
        
        // Apply gravity
        context.velocity.y -= context.gravity * deltaTime;
        
        // Regenerate energy
        this.regenerateEnergy(context, deltaTime);
    }

    /**
     * Check if the running state should transition to another state
     * @param context Movement state context
     * @returns State transition result
     */
    public checkTransition(context: MovementStateContext): StateTransitionResult {
        // Check if player is no longer grounded (highest priority)
        if (!context.grounded) {
            return this.createTransition(
                MovementState.FLYING, 
                "No longer grounded", 
                3
            );
        }

        // Check if player wants to ski
        if (context.input.ski && context.grounded) {
            return this.createTransition(
                MovementState.SKIING, 
                "Ski input while grounded", 
                2
            );
        }

        // Check if player wants to use jetpack
        if (context.input.jetpack && context.energy > 0) {
            return this.createTransition(
                MovementState.JETPACKING, 
                "Jetpack input with energy", 
                2
            );
        }

        // Note: Jump handling is now delegated to MovementComponent.tryJump()
        // which will handle the transition to FLYING state if successful

        return this.noTransition();
    }

    /**
     * Enter the running state
     * @param context Movement state context
     * @param previousState Previous movement state
     */
    public enter(context: MovementStateContext, previousState: MovementState): void {
        super.enter(context, previousState);
        
        // If transitioning from flying or jetpacking, apply landing logic
        if (previousState === MovementState.FLYING || previousState === MovementState.JETPACKING) {
            // Reset vertical velocity
            context.velocity.y = 0;
        }
    }
}

/**
 * Skiing state handler
 */
export class SkiingStateHandler extends MovementStateHandler {
    // Minimum slope angle for skiing (in radians)
    private minSkiAngle: number;
    
    // Maximum slope angle for skiing (in radians)
    private maxSkiAngle: number;
    
    /**
     * Create a new SkiingStateHandler
     */
    constructor() {
        super();
        
        // Convert degrees to radians
        this.minSkiAngle = MathUtils.toRadians(PhysicsConfig.skiing.minSkiAngle);
        this.maxSkiAngle = MathUtils.toRadians(90); // Maximum possible slope
    }
    
    /**
     * Get the name of this state
     */
    public getStateName(): string {
        return MovementState.SKIING;
    }
    
    /**
     * Update the skiing state
     * @param context Movement state context
     * @param deltaTime Time since last update in seconds
     */
    public update(context: MovementStateContext, deltaTime: number): void {
        // Update time in state
        context.timeInState += deltaTime;
        
        // Only apply skiing physics if on ground
        if (context.grounded && context.terrainData) {
            // Get slope data
            const slopeAngle = context.terrainData.slopeAngle;
            const slopeDirection = context.terrainData.slopeDirection;
            
            // Calculate acceleration due to gravity on slope
            const slopeAcceleration = Math.sin(slopeAngle) * context.gravity;
            
            // Apply acceleration down the slope
            this.tempVector.copyFrom(slopeDirection).scale(slopeAcceleration * deltaTime);
            context.velocity.addInPlace(this.tempVector);
            
            // Apply steering input (reduced effect on steeper slopes)
            const steeringFactor = Math.max(0.1, 1.0 - Math.sin(slopeAngle) * 0.8);
            const moveDirection = this.calculateMoveDirection(context);
            
            // Apply steering force (perpendicular to slope direction)
            if (moveDirection.lengthSquared() > 0.01) {
                // Calculate steering direction (perpendicular to slope)
                const up = Vector3.up();
                const steeringDirection = slopeDirection.cross(up).normalize();
                
                // Calculate steering input (-1 to 1)
                const steeringInput = moveDirection.dot(steeringDirection);
                
                // Apply steering force
                const steeringForce = steeringDirection.scale(
                    steeringInput * 5.0 * steeringFactor * deltaTime // Default steering force of 5.0
                );
                context.velocity.addInPlace(steeringForce);
            }
            
            // Apply friction based on surface type and slope angle
            let friction = context.terrainData.friction;
            
            // Reduce friction based on slope angle (steeper = less friction)
            friction *= Math.max(0.2, 1.0 - Math.sin(slopeAngle) * 0.8);
            
            // Apply momentum conservation factor based on surface
            friction *= PhysicsConfig.momentum.surfaceFactors[context.terrainData.surfaceType];
            
            // Apply friction
            context.velocity.scaleInPlace(1.0 - friction * deltaTime);
            
            // Enforce maximum speed
            const speed = context.velocity.length();
            if (speed > context.maxSpeed) {
                context.velocity.scaleInPlace(context.maxSpeed / speed);
            }
        } else {
            // In air, apply gravity
            context.velocity.y -= context.gravity * deltaTime;
            
            // Apply minimal air control
            const moveDirection = this.calculateMoveDirection(context);
            if (moveDirection.lengthSquared() > 0.01) {
                const airControlForce = moveDirection.scale(
                    context.airControl * 0.5 * deltaTime // Default air control factor of 0.5
                );
                context.velocity.x += airControlForce.x;
                context.velocity.z += airControlForce.z;
            }
        }
        
        // Regenerate energy
        this.regenerateEnergy(context, deltaTime);
    }
    
    /**
     * Check if the skiing state should transition to another state
     * @param context Movement state context
     * @returns State transition result
     */
    public checkTransition(context: MovementStateContext): StateTransitionResult {
        // Check if player is no longer grounded (highest priority)
        if (!context.grounded) {
            return this.createTransition(
                MovementState.FLYING, 
                "No longer grounded", 
                3
            );
        }
        
        // Check if player wants to stop skiing
        if (!context.input.ski && context.grounded) {
            return this.createTransition(
                MovementState.RUNNING, 
                "Released ski input while grounded", 
                2
            );
        }
        
        // Check if player wants to use jetpack
        if (context.input.jetpack && context.energy > 0) {
            return this.createTransition(
                MovementState.JETPACKING, 
                "Jetpack input with energy", 
                2
            );
        }
        
        // Check if slope is too flat for skiing and player has slowed down
        if (context.terrainData && 
            context.terrainData.slopeAngle < this.minSkiAngle && 
            context.velocity.length() < 2.0 &&
            context.timeInState > 1.0) {
            return this.createTransition(
                MovementState.RUNNING,
                "Slope too flat for skiing and player has slowed down",
                1
            );
        }
        
        // Note: Jump handling is now delegated to MovementComponent.tryJump()
        // which will handle the transition to FLYING state if successful
        
        return this.noTransition();
    }
    
    /**
     * Enter the skiing state
     * @param context Movement state context
     * @param previousState Previous movement state
     */
    public enter(context: MovementStateContext, previousState: MovementState): void {
        super.enter(context, previousState);
        
        // If transitioning from flying or jetpacking, apply landing logic
        if (previousState === MovementState.FLYING || previousState === MovementState.JETPACKING) {
            // Preserve horizontal momentum
            // Reset vertical velocity
            context.velocity.y = 0;
            
            // Apply a small boost when landing on a slope
            if (context.terrainData && context.terrainData.slopeAngle > this.minSkiAngle) {
                const slopeBoost = 2.0 * Math.sin(context.terrainData.slopeAngle);
                this.tempVector.copyFrom(context.terrainData.slopeDirection)
                    .scaleInPlace(slopeBoost);
                context.velocity.addInPlace(this.tempVector);
                
                this.logger.debug(`Applied slope landing boost: ${slopeBoost.toFixed(2)}`);
            }
        }
        
        // If transitioning from running, apply a small initial push
        if (previousState === MovementState.RUNNING && 
            context.terrainData && 
            context.terrainData.slopeAngle > this.minSkiAngle) {
            const initialPush = 1.0;
            this.tempVector.copyFrom(context.terrainData.slopeDirection)
                .scaleInPlace(initialPush);
            context.velocity.addInPlace(this.tempVector);
            
            this.logger.debug('Applied initial skiing push');
        }
    }
}

/**
 * Flying state handler
 */
export class FlyingStateHandler extends MovementStateHandler {
    /**
     * Get the name of this state
     */
    public getStateName(): string {
        return MovementState.FLYING;
    }
    
    /**
     * Update the flying state
     * @param context Movement state context
     * @param deltaTime Time since last update in seconds
     */
    public update(context: MovementStateContext, deltaTime: number): void {
        // Update time in state
        context.timeInState += deltaTime;
        
        // Apply gravity
        context.velocity.y -= context.gravity * deltaTime;
        
        // Apply air control
        const moveDirection = this.calculateMoveDirection(context);
        if (moveDirection.lengthSquared() > 0.01) {
            // Calculate air control force
            const airControlForce = moveDirection.scale(
                context.airControl * context.runSpeed * deltaTime
            );
            
            // Apply air control with momentum conservation
            const momentumFactor = 0.85; // Default momentum factor for flying
            context.velocity.x += airControlForce.x * momentumFactor;
            context.velocity.z += airControlForce.z * momentumFactor;
        }
        
        // Apply air resistance
        const airResistance = 0.1; // Default air resistance
        context.velocity.scaleInPlace(1.0 - airResistance * deltaTime);
        
        // Enforce maximum speed
        const horizontalSpeed = new Vector3(
            context.velocity.x,
            0,
            context.velocity.z
        ).length();
        
        if (horizontalSpeed > context.maxSpeed) {
            const scaleFactor = context.maxSpeed / horizontalSpeed;
            context.velocity.x *= scaleFactor;
            context.velocity.z *= scaleFactor;
        }
        
        // Regenerate energy
        this.regenerateEnergy(context, deltaTime);
    }

    /**
     * Check if the flying state should transition to another state
     * @param context Movement state context
     * @returns State transition result
     */
    public checkTransition(context: MovementStateContext): StateTransitionResult {
        // Check if player wants to use jetpack (high priority)
        if (context.input.jetpack && context.energy > 0) {
            return this.createTransition(
                MovementState.JETPACKING, 
                "Jetpack input with energy", 
                2
            );
        }

        // Check if player has landed (highest priority)
        if (context.grounded) {
            // Check if player wants to ski when landing
            if (context.input.ski) {
                return this.createTransition(
                    MovementState.SKIING, 
                    "Landed while holding ski input", 
                    3
                );
            } else {
                return this.createTransition(
                    MovementState.RUNNING, 
                    "Landed without ski input", 
                    3
                );
            }
        }

        return this.noTransition();
    }

    /**
     * Enter the flying state
     * @param context Movement state context
     * @param previousState Previous movement state
     */
    public enter(context: MovementStateContext, previousState: MovementState): void {
        super.enter(context, previousState);
        
        // If transitioning from running or skiing, apply jump force
        if (previousState === MovementState.RUNNING || previousState === MovementState.SKIING) {
            context.velocity.y = context.jumpForce;
        }
    }
}

/**
 * Jetpacking state handler
 */
export class JetpackingStateHandler extends MovementStateHandler {
    // Jetpack control parameters
    private readonly jetpackControlFactor: number = 0.8; // How much directional control player has while jetpacking
    private readonly jetpackHoverThreshold: number = 2.0; // Vertical speed threshold for hover mode
    private readonly jetpackHoverEnergyFactor: number = 0.5; // Energy use multiplier when hovering
    private readonly jetpackBoostFactor: number = 1.2; // Boost factor when first activating jetpack
    
    /**
     * Get the name of this state
     */
    public getStateName(): string {
        return MovementState.JETPACKING;
    }
    
    /**
     * Update the jetpacking state
     * @param context Movement state context
     * @param deltaTime Time since last update in seconds
     */
    public update(context: MovementStateContext, deltaTime: number): void {
        // Update time in state
        context.timeInState += deltaTime;
        
        // Calculate jetpack force direction
        let jetpackDirection = Vector3.up();
        
        // Apply movement input to jetpack direction for control
        const moveDirection = this.calculateMoveDirection(context);
        if (moveDirection.lengthSquared() > 0.01) {
            // Blend up vector with move direction for angled thrust
            jetpackDirection = Vector3.Lerp(
                jetpackDirection,
                moveDirection,
                0.3 // Default control factor of 0.3
            ).normalize();
        }
        
        // Apply jetpack force
        const jetpackForce = jetpackDirection.scale(context.jetpackForce * deltaTime);
        context.velocity.addInPlace(jetpackForce);
        
        // Apply gravity (reduced while jetpacking)
        const reducedGravity = context.gravity * 0.5; // Default gravity reduction of 0.5
        context.velocity.y -= reducedGravity * deltaTime;
        
        // Apply air resistance
        const airResistance = 0.1; // Default air resistance
        context.velocity.scaleInPlace(1.0 - airResistance * deltaTime);
        
        // Enforce maximum speed with momentum conservation
        const horizontalSpeed = new Vector3(
            context.velocity.x,
            0,
            context.velocity.z
        ).length();
        
        // Allow higher speeds when transitioning from skiing to preserve momentum
        const momentumBoost = context.timeInState < 0.5 ? 
            PhysicsConfig.momentum.maxMomentumBoost : 1.0;
        
        const effectiveMaxSpeed = context.maxSpeed * momentumBoost;
        
        if (horizontalSpeed > effectiveMaxSpeed) {
            const scaleFactor = effectiveMaxSpeed / horizontalSpeed;
            context.velocity.x *= scaleFactor;
            context.velocity.z *= scaleFactor;
        }
        
        // Consume energy
        context.energy = Math.max(0, context.energy - context.energyUseRate * deltaTime);
    }

    /**
     * Check if the jetpacking state should transition to another state
     * @param context Movement state context
     * @returns State transition result
     */
    public checkTransition(context: MovementStateContext): StateTransitionResult {
        // Check if we should stop jetpacking (highest priority)
        if (!context.input.jetpack || context.energy <= 0) {
            const reason = !context.input.jetpack ? "Jetpack input released" : "Out of energy";
            return this.createTransition(
                MovementState.FLYING, 
                reason, 
                3
            );
        }

        // Check if player has landed
        if (context.grounded) {
            // Check if player wants to ski when landing
            if (context.input.ski) {
                return this.createTransition(
                    MovementState.SKIING, 
                    "Landed while holding ski input", 
                    2
                );
            } else {
                return this.createTransition(
                    MovementState.RUNNING, 
                    "Landed without ski input", 
                    2
                );
            }
        }

        return this.noTransition();
    }
    
    /**
     * Enter the jetpacking state
     * @param context Movement state context
     * @param previousState Previous movement state
     */
    public enter(context: MovementStateContext, previousState: MovementState): void {
        super.enter(context, previousState);
        
        // Apply initial upward boost
        if (context.velocity.y < 0) {
            // If falling, cancel downward velocity and add upward boost
            context.velocity.y = context.jetpackForce * 0.2;
        } else {
            // If already moving upward, add to existing velocity
            context.velocity.y += context.jetpackForce * 0.1;
        }
    }
    
    /**
     * Exit the jetpacking state
     * @param context Movement state context
     * @param nextState Next movement state
     */
    public exit(context: MovementStateContext, nextState: MovementState): void {
        super.exit(context, nextState);
        
        // Preserve some momentum when transitioning to flying
        if (nextState === MovementState.FLYING) {
            // Add a small upward boost to give a smoother transition
            context.velocity.y += context.jetpackForce * 0.05;
        }
    }
}
