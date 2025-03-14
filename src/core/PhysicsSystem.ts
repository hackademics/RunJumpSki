/**
 * PhysicsSystem.ts
 * Handles physics simulation for the game, including general movement and skiing mechanics
 */

import { Vector3 } from '../types/common/Vector3';
import { Transform } from '../types/common/Transform';
import { MathUtils } from '../utils/MathUtils';
import { EventSystem } from './EventSystem';
import { IEvent } from '../types/events/GameEvents';
import { Logger } from '../utils/Logger';
import { GameEventType, SurfaceType } from '../types/events/EventTypes';
import { PhysicsConfig } from '../config/PhysicsConfig';
import { ICollisionComponent } from '../components/collision/ICollisionComponent';
import { IEntity } from '../entities/IEntity';

/**
 * Game update event interface
 */
interface GameUpdateEvent extends IEvent {
    deltaTime: number;
}

/**
 * Physics material properties
 */
interface PhysicsMaterial {
    friction: number;      // Coefficient of friction
    restitution: number;   // Bounciness (0-1)
    density: number;       // Material density (kg/m³)
    surfaceType?: SurfaceType;
}

/**
 * Physics state for an entity
 */
interface PhysicsState {
    position: Vector3;
    velocity: Vector3;
    acceleration: Vector3;
    mass: number;
    material: PhysicsMaterial;
    isOnGround: boolean;
    groundNormal: Vector3;
    transform: Transform;
    slopeData?: {
        angle: number;         // Slope angle in radians
        direction: Vector3;    // Direction of the slope (downhill)
        steepness: number;     // Normalized steepness (0-1)
    };
    // Momentum-related properties
    momentum: number;          // Current momentum magnitude
    momentumDirection: Vector3; // Direction of momentum
    lastMoveDirection: Vector3; // Last movement direction for direction change calculations
    momentumFactor: number;    // Current momentum conservation factor (0-1)
    lastStateChangeTime: number; // Time of last state change for momentum calculations
}

/**
 * Skiing-specific state
 */
interface SkiingState {
    isSkiing: boolean;
    edgeAngle: number;     // Angle of ski edges relative to slope
    turnRadius: number;    // Current turn radius
    speed: number;         // Current speed
    slopeAngle: number;    // Current slope angle
}

/**
 * Collision data interface
 */
interface CollisionData {
    entityIdA: string;
    entityIdB: string;
    normal: Vector3;
    penetrationDepth: number;
    collisionPoint: Vector3;
    stateA: PhysicsState;
    stateB: PhysicsState;
    collisionA: ICollisionComponent;
    collisionB: ICollisionComponent;
}

export class PhysicsSystem {
    private static instance: PhysicsSystem;
    private eventSystem: EventSystem;
    private physicsStates: Map<string, PhysicsState>;
    private skiingStates: Map<string, SkiingState>;
    private gravity: Vector3;
    private airDensity: number;
    private timeStep: number;
    private maxSteps: number;
    private logger: Logger;

    private constructor() {
        this.logger = new Logger('PhysicsSystem');
        this.eventSystem = EventSystem.getInstance();
        
        this.physicsStates = new Map();
        this.skiingStates = new Map();
        this.gravity = Vector3.down().scale(MathUtils.GRAVITY);
        this.airDensity = 1.225; // kg/m³ at sea level
        this.timeStep = 1/60;    // Fixed time step
        this.maxSteps = 3;       // Maximum physics steps per frame

        // Subscribe to game events
        this.eventSystem.on('game:update', (event: IEvent) => {
            // Cast to GameUpdateEvent if it has deltaTime, otherwise use default time step
            const gameEvent = event as GameUpdateEvent;
            const deltaTime = gameEvent.deltaTime || this.timeStep;
            this.update(deltaTime);
        });
    }

    /**
     * Get the singleton instance of PhysicsSystem
     */
    public static getInstance(): PhysicsSystem {
        if (!PhysicsSystem.instance) {
            PhysicsSystem.instance = new PhysicsSystem();
        }
        return PhysicsSystem.instance;
    }

    /**
     * Add a physics state for an entity
     * @param entityId Unique identifier for the entity
     * @param transform Entity's transform
     * @param mass Mass in kg
     * @param material Physics material properties
     */
    public addEntity(
        entityId: string,
        transform: Transform,
        mass: number,
        material: PhysicsMaterial
    ): void {
        const state: PhysicsState = {
            position: transform.position.clone(),
            velocity: Vector3.zero(),
            acceleration: Vector3.zero(),
            mass,
            material,
            isOnGround: false,
            groundNormal: Vector3.up(),
            transform,
            // Initialize momentum properties
            momentum: 0,
            momentumDirection: Vector3.forward(),
            lastMoveDirection: Vector3.forward(),
            momentumFactor: 1.0,
            lastStateChangeTime: performance.now() / 1000
        };

        this.physicsStates.set(entityId, state);
    }

    /**
     * Add skiing state for an entity
     * @param entityId Unique identifier for the entity
     */
    public addSkiingState(entityId: string): void {
        const skiingState: SkiingState = {
            isSkiing: false,
            edgeAngle: 0,
            turnRadius: 0,
            speed: 0,
            slopeAngle: 0
        };

        this.skiingStates.set(entityId, skiingState);
    }

    /**
     * Remove physics state for an entity
     * @param entityId Unique identifier for the entity
     */
    public removeEntity(entityId: string): void {
        this.physicsStates.delete(entityId);
        this.skiingStates.delete(entityId);
    }

    /**
     * Update physics simulation
     * @param deltaTime Time since last update in seconds
     */
    private update(deltaTime: number): void {
        // Cap delta time to prevent large jumps
        deltaTime = Math.min(deltaTime, this.timeStep * this.maxSteps);

        // Update each entity's physics
        this.physicsStates.forEach((state, entityId) => {
            this.updateEntityPhysics(state, entityId, deltaTime);
        });
        
        // Handle collisions between entities
        this.handleCollisions(deltaTime);
    }

    /**
     * Update physics for a single entity
     * @param state Physics state
     * @param entityId Entity identifier
     * @param deltaTime Time step
     */
    private updateEntityPhysics(
        state: PhysicsState,
        entityId: string,
        deltaTime: number
    ): void {
        // Get skiing state if it exists
        const skiingState = this.skiingStates.get(entityId);

        // Store previous ground state for transition detection
        const wasOnGround = state.isOnGround;
        
        // Store previous velocity for momentum calculations
        const previousVelocity = state.velocity.clone();
        const previousSpeed = previousVelocity.length();

        // Check if entity is on ground
        this.checkGroundContact(state, entityId);

        // Calculate forces
        const forces = this.calculateForces(state, skiingState);

        // Update acceleration (F = ma)
        state.acceleration = forces.scale(1 / state.mass);

        // Update velocity (v = v0 + at)
        state.velocity = state.velocity.add(state.acceleration.scale(deltaTime));

        // Apply momentum conservation
        this.applyMomentumConservation(state, previousVelocity, deltaTime);

        // Update position (x = x0 + vt)
        state.position = state.position.add(state.velocity.scale(deltaTime));

        // Update transform
        state.transform.position.copyFrom(state.position);

        // Update skiing state if applicable
        if (skiingState) {
            this.updateSkiingState(skiingState, state, deltaTime);
        }

        // Update momentum properties
        this.updateMomentum(state, previousSpeed, deltaTime);

        // Emit landing event if just landed
        if (!wasOnGround && state.isOnGround) {
            this.handleLanding(state, entityId);
        }

        // Emit physics update event
        this.eventSystem.emit('physics:update', {
            entityId,
            position: state.position,
            velocity: state.velocity,
            isOnGround: state.isOnGround,
            momentum: state.momentum
        });
    }

    /**
     * Check if an entity is in contact with the ground
     * @param state Physics state
     * @param entityId Entity identifier
     */
    private checkGroundContact(state: PhysicsState, entityId: string): void {
        // For now, use a simple height-based check
        // In a more complex implementation, this would use raycasting or collision detection
        const groundHeight = 0; // Assume ground is at y=0
        const entityHeight = 1.0; // Assume entity height is 1 unit
        const groundCheckThreshold = 0.1; // Small threshold to account for floating point errors
        
        // Check if entity is close to the ground
        if (state.position.y <= groundHeight + entityHeight + groundCheckThreshold) {
            // Only consider grounded if moving downward or already on ground
            if (state.velocity.y <= 0 || state.isOnGround) {
                // Set ground state
                state.isOnGround = true;
                state.position.y = groundHeight + entityHeight; // Snap to ground
                
                // In a real implementation, we would get the actual ground normal from collision
                // For now, we'll simulate some slopes based on position for testing
                this.calculateGroundNormal(state);
                
                // Calculate slope data
                this.calculateSlopeData(state, entityId);
                
                // Zero out vertical velocity when grounded
                if (state.velocity.y < 0) {
                    state.velocity.y = 0;
                }
            }
        } else {
            // Not on ground
            state.isOnGround = false;
            state.slopeData = undefined;
        }
    }

    /**
     * Calculate the ground normal based on position (simulated for testing)
     * @param state Physics state
     */
    private calculateGroundNormal(state: PhysicsState): void {
        // In a real implementation, this would come from collision detection
        // For testing, we'll create some artificial slopes based on position
        
        // Default to flat ground
        let normal = Vector3.up();
        
        // Create a gentle slope in the X direction
        const x = state.position.x;
        const z = state.position.z;
        
        // Create a circular hill at the origin
        const distFromOrigin = Math.sqrt(x * x + z * z);
        if (distFromOrigin < 20) {
            // Create a hill with steeper slopes near the center
            const hillFactor = Math.max(0, 1 - distFromOrigin / 20);
            const slopeX = -x * hillFactor * 0.2;
            const slopeZ = -z * hillFactor * 0.2;
            normal = new Vector3(slopeX, 1, slopeZ).normalizeInPlace();
        }
        // Create a valley along the X axis
        else if (Math.abs(z) < 10 && Math.abs(x) > 10) {
            const valleyFactor = Math.max(0, 1 - Math.abs(z) / 10);
            const slopeZ = Math.sign(z) * valleyFactor * 0.3;
            normal = new Vector3(0, 1, slopeZ).normalizeInPlace();
        }
        // Create a ridge along the Z axis
        else if (Math.abs(x) < 10 && Math.abs(z) > 10) {
            const ridgeFactor = Math.max(0, 1 - Math.abs(x) / 10);
            const slopeX = Math.sign(x) * ridgeFactor * 0.3;
            normal = new Vector3(slopeX, 1, 0).normalizeInPlace();
        }
        
        state.groundNormal = normal;
    }

    /**
     * Calculate slope data based on ground normal
     * @param state Physics state
     * @param entityId Entity identifier
     */
    private calculateSlopeData(state: PhysicsState, entityId: string): void {
        if (!state.isOnGround) {
            state.slopeData = undefined;
            return;
        }
        
        // Calculate slope angle (angle between normal and up vector)
        const angle = MathUtils.angleBetween(state.groundNormal, Vector3.up());
        
        // Calculate slope direction (points downhill)
        // Project the normal onto the XZ plane and invert it
        const slopeX = -state.groundNormal.x;
        const slopeZ = -state.groundNormal.z;
        const direction = new Vector3(slopeX, 0, slopeZ);
        
        // If the slope is too flat, default to forward direction
        if (direction.lengthSquared() < MathUtils.EPSILON) {
            direction.z = 1;
        } else {
            direction.normalizeInPlace();
        }
        
        // Calculate normalized steepness (0 = flat, 1 = 45 degrees or steeper)
        const maxSlopeAngle = MathUtils.toRadians(45); // Consider 45 degrees as maximum steepness
        const steepness = Math.min(angle / maxSlopeAngle, 1);
        
        state.slopeData = {
            angle,
            direction,
            steepness
        };
        
        // Update skiing state with slope data
        const skiingState = this.skiingStates.get(entityId);
        if (skiingState) {
            skiingState.slopeAngle = angle;
        }
    }

    /**
     * Handle entity landing on the ground
     * @param state Physics state
     * @param entityId Entity identifier
     */
    private handleLanding(state: PhysicsState, entityId: string): void {
        // Calculate impact velocity (how hard the entity hit the ground)
        const impactForce = Math.abs(state.velocity.y);
        
        this.logger.debug(`Entity ${entityId} landed with impact force: ${impactForce.toFixed(2)}`);
        
        // Emit landing event
        this.eventSystem.emit(GameEventType.MOVEMENT_LAND, {
            entityId: Number(entityId),
            position: state.position.clone(),
            velocity: state.velocity.clone(),
            impactForce: impactForce,
            surfaceType: SurfaceType.DEFAULT // For now, assume default surface type
        });
    }

    /**
     * Calculate forces acting on an entity
     * @param state Physics state
     * @param skiingState Optional skiing state
     * @returns Total force vector
     */
    private calculateForces(
        state: PhysicsState,
        skiingState?: SkiingState
    ): Vector3 {
        let totalForce = Vector3.zero();

        // Add gravity
        totalForce = totalForce.add(this.gravity.scale(state.mass));

        // Add ground reaction force if on ground
        if (state.isOnGround) {
            const groundForce = this.calculateGroundReactionForce(state);
            totalForce = totalForce.add(groundForce);
        }

        // Add skiing forces if applicable
        if (skiingState?.isSkiing) {
            const skiingForces = this.calculateSkiingForces(state, skiingState);
            totalForce = totalForce.add(skiingForces);
        }

        // Add air resistance
        const dragForce = this.calculateDragForce(state);
        totalForce = totalForce.add(dragForce);

        return totalForce;
    }

    /**
     * Calculate ground reaction force
     * @param state Physics state
     * @returns Ground reaction force
     */
    private calculateGroundReactionForce(state: PhysicsState): Vector3 {
        // Calculate normal force (N = mg * cos(θ))
        const slopeAngle = MathUtils.angleBetween(state.groundNormal, Vector3.up());
        const normalForce = state.mass * MathUtils.GRAVITY * Math.cos(slopeAngle);

        // Calculate friction force
        const frictionForce = MathUtils.calculateFrictionForce(
            normalForce,
            state.material.friction,
            state.velocity.normalize()
        );

        // Calculate ground reaction force
        const groundForce = state.groundNormal.scale(normalForce);
        return groundForce.add(frictionForce);
    }

    /**
     * Calculate skiing-specific forces
     * @param state Physics state
     * @param skiingState Skiing state
     * @returns Skiing forces
     */
    private calculateSkiingForces(
        state: PhysicsState,
        skiingState: SkiingState
    ): Vector3 {
        let skiingForces = Vector3.zero();
        
        if (!state.slopeData) {
            return skiingForces;
        }
        
        // Get slope data
        const { angle, direction, steepness } = state.slopeData;
        
        // Only apply skiing forces if the slope is steep enough
        const minSkiAngle = MathUtils.toRadians(PhysicsConfig.skiing.minSkiAngle);
        if (angle < minSkiAngle) {
            return skiingForces;
        }
        
        // Calculate slope force based on gravity, mass, and slope angle
        const slopeForce = Math.sin(angle) * state.mass * MathUtils.GRAVITY;
        
        // Apply force in the downhill direction
        skiingForces = direction.scale(slopeForce);
        
        // Apply surface-specific slope factor
        const surfaceType = state.material.surfaceType || SurfaceType.DEFAULT;
        const slopeFactor = PhysicsConfig.skiing.slopeFactor[surfaceType] || 1.0;
        skiingForces.scaleInPlace(slopeFactor);
        
        // Calculate turn force based on edge angle and speed
        if (skiingState.edgeAngle !== 0) {
            const turnForce = this.calculateTurnForce(state, skiingState);
            skiingForces.addInPlace(turnForce);
        }
        
        return skiingForces;
    }

    /**
     * Calculate force from ski turns
     * @param state Physics state
     * @param skiingState Skiing state
     * @returns Turn force
     */
    private calculateTurnForce(
        state: PhysicsState,
        skiingState: SkiingState
    ): Vector3 {
        // Calculate centripetal force (F = mv²/r)
        const speed = state.velocity.length();
        const turnRadius = this.calculateTurnRadius(skiingState.edgeAngle, speed);
        const centripetalForce = state.mass * speed * speed / turnRadius;

        // Calculate turn direction (perpendicular to velocity in the slope plane)
        const turnDirection = state.velocity
            .cross(state.groundNormal)
            .normalize()
            .scale(Math.sign(skiingState.edgeAngle));

        return turnDirection.scale(centripetalForce);
    }

    /**
     * Calculate turn radius based on edge angle and speed
     * @param edgeAngle Angle of ski edges
     * @param speed Current speed
     * @returns Turn radius
     */
    private calculateTurnRadius(edgeAngle: number, speed: number): number {
        // Simplified turn radius calculation
        // In reality, this would be more complex and depend on various factors
        const baseRadius = 10; // Base turn radius in meters
        const speedFactor = speed / 20; // Normalize speed
        const angleFactor = Math.abs(Math.sin(edgeAngle));
        return baseRadius / (speedFactor * angleFactor);
    }

    /**
     * Calculate drag force
     * @param state Physics state
     * @returns Drag force
     */
    private calculateDragForce(state: PhysicsState): Vector3 {
        // Approximate cross-sectional area based on entity size
        const area = 1.0; // m²
        const dragCoefficient = 0.5; // Typical drag coefficient for a person

        return MathUtils.calculateDragForce(
            state.velocity,
            dragCoefficient,
            area,
            this.airDensity
        );
    }

    /**
     * Update skiing-specific state
     * @param skiingState Skiing state
     * @param physicsState Physics state
     * @param deltaTime Time step
     */
    private updateSkiingState(
        skiingState: SkiingState,
        physicsState: PhysicsState,
        deltaTime: number
    ): void {
        // Update speed
        skiingState.speed = physicsState.velocity.length();
        
        // Update slope angle from physics state
        if (physicsState.slopeData) {
            skiingState.slopeAngle = physicsState.slopeData.angle;
        } else {
            skiingState.slopeAngle = 0;
        }
        
        // Update turn radius
        skiingState.turnRadius = this.calculateTurnRadius(
            skiingState.edgeAngle,
            skiingState.speed
        );
    }

    /**
     * Set whether an entity is skiing
     * @param entityId Entity identifier
     * @param isSkiing Whether the entity is skiing
     */
    public setSkiing(entityId: string, isSkiing: boolean): void {
        const skiingState = this.skiingStates.get(entityId);
        if (skiingState) {
            skiingState.isSkiing = isSkiing;
        }
    }

    /**
     * Set the edge angle for skiing
     * @param entityId Entity identifier
     * @param angle Edge angle in radians
     */
    public setEdgeAngle(entityId: string, angle: number): void {
        const skiingState = this.skiingStates.get(entityId);
        if (skiingState) {
            skiingState.edgeAngle = angle;
        }
    }

    /**
     * Get the current physics state for an entity
     * @param entityId Entity identifier
     * @returns Physics state
     */
    public getPhysicsState(entityId: string): PhysicsState | undefined {
        return this.physicsStates.get(entityId);
    }

    /**
     * Get the current skiing state for an entity
     * @param entityId Entity identifier
     * @returns Skiing state
     */
    public getSkiingState(entityId: string): SkiingState | undefined {
        return this.skiingStates.get(entityId);
    }

    /**
     * Set the ground state for an entity
     * @param entityId Entity identifier
     * @param isOnGround Whether the entity is on the ground
     * @param groundNormal Normal vector of the ground surface
     */
    public setGroundState(
        entityId: string,
        isOnGround: boolean,
        groundNormal: Vector3 = Vector3.up()
    ): void {
        const state = this.physicsStates.get(entityId);
        if (state) {
            state.isOnGround = isOnGround;
            state.groundNormal = groundNormal;
        }
    }

    /**
     * Apply an impulse to an entity
     * @param entityId Entity identifier
     * @param impulse Impulse vector
     */
    public applyImpulse(entityId: string, impulse: Vector3): void {
        const state = this.physicsStates.get(entityId);
        if (state) {
            // v = v0 + impulse/m
            state.velocity = state.velocity.add(impulse.scale(1 / state.mass));
        }
    }

    /**
     * Apply a jump impulse to an entity
     * @param entityId Entity identifier
     * @param jumpForce Jump force magnitude
     * @returns Whether the jump was successful
     */
    public jump(entityId: string, jumpForce: number): boolean {
        const state = this.physicsStates.get(entityId);
        if (!state || !state.isOnGround) {
            return false;
        }
        
        // Apply vertical impulse
        const jumpImpulse = new Vector3(0, jumpForce, 0);
        this.applyImpulse(entityId, jumpImpulse);
        
        // Set ground state to false
        state.isOnGround = false;
        
        this.logger.debug(`Entity ${entityId} jumped with force: ${jumpForce}`);
        
        return true;
    }

    /**
     * Get slope data for an entity
     * @param entityId Entity identifier
     * @returns Slope data or undefined if not on ground
     */
    public getSlopeData(entityId: string): { angle: number; direction: Vector3; steepness: number } | undefined {
        const state = this.physicsStates.get(entityId);
        if (state && state.isOnGround && state.slopeData) {
            return state.slopeData;
        }
        return undefined;
    }

    /**
     * Check if a slope is skiable
     * @param entityId Entity identifier
     * @returns Whether the entity is on a skiable slope
     */
    public isOnSkiableSlope(entityId: string): boolean {
        const slopeData = this.getSlopeData(entityId);
        if (!slopeData) {
            return false;
        }
        
        const minSkiAngle = MathUtils.toRadians(PhysicsConfig.skiing.minSkiAngle);
        return slopeData.angle >= minSkiAngle;
    }

    /**
     * Apply momentum conservation to velocity
     * @param state Physics state
     * @param previousVelocity Previous velocity
     * @param deltaTime Time step
     */
    private applyMomentumConservation(
        state: PhysicsState,
        previousVelocity: Vector3,
        deltaTime: number
    ): void {
        // Get horizontal components (x-z plane)
        const horizontalVelocity = new Vector3(state.velocity.x, 0, state.velocity.z);
        const horizontalPrevVelocity = new Vector3(previousVelocity.x, 0, previousVelocity.z);
        
        // Calculate current speed and previous speed
        const currentSpeed = horizontalVelocity.length();
        const prevSpeed = horizontalPrevVelocity.length();
        
        // Skip if speeds are too low
        if (prevSpeed < PhysicsConfig.momentum.minSpeedThreshold && 
            currentSpeed < PhysicsConfig.momentum.minSpeedThreshold) {
            return;
        }
        
        // Calculate direction change
        let directionChangePenalty = 0;
        if (prevSpeed > 0.1 && currentSpeed > 0.1) {
            const prevDir = horizontalPrevVelocity.normalize();
            const currentDir = horizontalVelocity.normalize();
            
            // Calculate dot product to determine direction change
            const dotProduct = prevDir.dot(currentDir);
            
            // Convert to angle and normalize to 0-1 range
            // 1 = same direction, 0 = perpendicular, -1 = opposite direction
            const directionChange = (1 - dotProduct) / 2;
            
            // Apply direction change penalty
            directionChangePenalty = directionChange * PhysicsConfig.momentum.directionChangePenalty;
        }
        
        // Get surface-specific momentum factor if grounded
        let surfaceMomentumFactor = 1.0;
        if (state.isOnGround && state.material) {
            const surfaceType = state.material.surfaceType || SurfaceType.DEFAULT;
            surfaceMomentumFactor = PhysicsConfig.momentum.surfaceFactors[surfaceType] || 
                                   PhysicsConfig.momentum.surfaceFactors[SurfaceType.DEFAULT];
        }
        
        // Apply slope-based momentum factors if slope data is available
        if (state.isOnGround && state.slopeData) {
            const slopeAngle = state.slopeData.angle;
            const slopeDirection = state.slopeData.direction;
            
            // Check if moving uphill or downhill
            const movementDirection = horizontalVelocity.normalize();
            const dotProduct = movementDirection.dot(slopeDirection);
            
            if (dotProduct > 0.2) {
                // Moving downhill - boost momentum
                surfaceMomentumFactor *= PhysicsConfig.momentum.downhillBoostFactor;
            } else if (dotProduct < -0.2) {
                // Moving uphill - reduce momentum
                surfaceMomentumFactor *= PhysicsConfig.momentum.uphillFactor;
            }
        }
        
        // Calculate final momentum factor
        const momentumFactor = state.momentumFactor * surfaceMomentumFactor * (1 - directionChangePenalty);
        
        // Apply momentum conservation to velocity
        if (momentumFactor > 0 && prevSpeed > PhysicsConfig.momentum.minSpeedThreshold) {
            // Calculate momentum contribution
            const momentumContribution = horizontalPrevVelocity.scale(momentumFactor * deltaTime);
            
            // Add to current velocity (only horizontal components)
            state.velocity.x += momentumContribution.x;
            state.velocity.z += momentumContribution.z;
            
            // Enforce maximum speed
            const newHorizontalSpeed = new Vector3(state.velocity.x, 0, state.velocity.z).length();
            if (newHorizontalSpeed > PhysicsConfig.player.movement.maxSpeed) {
                const scaleFactor = PhysicsConfig.player.movement.maxSpeed / newHorizontalSpeed;
                state.velocity.x *= scaleFactor;
                state.velocity.z *= scaleFactor;
            }
        }
    }

    /**
     * Update momentum properties
     * @param state Physics state
     * @param previousSpeed Previous speed
     * @param deltaTime Time step
     */
    private updateMomentum(
        state: PhysicsState,
        previousSpeed: number,
        deltaTime: number
    ): void {
        // Calculate current horizontal speed
        const horizontalVelocity = new Vector3(state.velocity.x, 0, state.velocity.z);
        const currentSpeed = horizontalVelocity.length();
        
        // Update momentum magnitude
        state.momentum = currentSpeed;
        
        // Update momentum direction if moving
        if (currentSpeed > 0.1) {
            state.momentumDirection = horizontalVelocity.normalize();
            state.lastMoveDirection = state.momentumDirection.clone();
        }
        
        // Apply momentum decay when not actively moving
        if (currentSpeed < previousSpeed) {
            state.momentumFactor = Math.max(
                0, 
                state.momentumFactor - PhysicsConfig.momentum.decayRate * deltaTime
            );
        } else {
            // Gradually increase momentum factor when accelerating
            state.momentumFactor = Math.min(
                1.0,
                state.momentumFactor + 0.5 * deltaTime
            );
        }
    }

    /**
     * Handle state transition for momentum conservation
     * @param entityId Entity identifier
     * @param previousState Previous movement state
     * @param newState New movement state
     */
    public handleStateTransition(
        entityId: string,
        previousState: string,
        newState: string
    ): void {
        const state = this.physicsStates.get(entityId);
        if (!state) return;
        
        // Record state change time
        const currentTime = performance.now() / 1000;
        state.lastStateChangeTime = currentTime;
        
        // Get appropriate momentum conservation factor based on state transition
        let transitionFactor = PhysicsConfig.momentum.stateTransitionFactor;
        
        // Check for specific state transitions
        const transition = `${previousState}To${newState.charAt(0).toUpperCase() + newState.slice(1)}`;
        if (transition in PhysicsConfig.momentum.stateTransitions) {
            transitionFactor = PhysicsConfig.momentum.stateTransitions[transition as keyof typeof PhysicsConfig.momentum.stateTransitions];
        }
        
        // Apply transition factor to momentum
        state.momentumFactor *= transitionFactor;
        
        // Special case: landing transitions
        if ((previousState === 'flying' || previousState === 'jetpacking') && 
            (newState === 'running' || newState === 'skiing')) {
            // Preserve horizontal momentum but zero vertical velocity
            const horizontalVelocity = new Vector3(state.velocity.x, 0, state.velocity.z);
            state.velocity = horizontalVelocity.scale(transitionFactor);
            
            // Add a small upward component to prevent immediate falling
            state.velocity.y = 0.1;
        }
    }

    /**
     * Apply a force to an entity
     * @param entityId Entity identifier
     * @param force Force vector
     */
    public applyForce(entityId: string, force: Vector3): void {
        const state = this.physicsStates.get(entityId);
        if (!state) return;
        
        // Calculate acceleration from force (F = ma)
        const acceleration = force.scale(1 / state.mass);
        
        // Add to current acceleration
        state.acceleration.addInPlace(acceleration);
    }

    /**
     * Detect and handle collisions between entities
     * @param deltaTime Time step
     */
    private handleCollisions(deltaTime: number): void {
        // Get all entities with physics states
        const entityIds = Array.from(this.physicsStates.keys());
        
        // Check for collisions between all pairs of entities
        for (let i = 0; i < entityIds.length; i++) {
            const entityIdA = entityIds[i];
            const stateA = this.physicsStates.get(entityIdA);
            
            if (!stateA) continue;
            
            for (let j = i + 1; j < entityIds.length; j++) {
                const entityIdB = entityIds[j];
                const stateB = this.physicsStates.get(entityIdB);
                
                if (!stateB) continue;
                
                // Check for collision between these two entities
                const collision = this.checkCollision(stateA, stateB, entityIdA, entityIdB);
                
                if (collision) {
                    // Handle the collision
                    this.resolveCollision(collision, deltaTime);
                }
            }
        }
    }

    /**
     * Check for collision between two entities
     * @param stateA Physics state of entity A
     * @param stateB Physics state of entity B
     * @param entityIdA ID of entity A
     * @param entityIdB ID of entity B
     * @returns Collision data or null if no collision
     */
    private checkCollision(
        stateA: PhysicsState,
        stateB: PhysicsState,
        entityIdA: string,
        entityIdB: string
    ): CollisionData | null {
        // For now, implement simple sphere-sphere collision detection
        // This can be expanded to handle more complex shapes later
        
        // Calculate distance between entities
        const distance = Vector3.Distance(stateA.position, stateB.position);
        
        // Get collision components if available
        const entityA = this.getEntityById(entityIdA);
        const entityB = this.getEntityById(entityIdB);
        
        if (!entityA || !entityB) return null;
        
        // Get collision components by name instead of type
        const collisionA = entityA.getComponent<ICollisionComponent>('collision');
        const collisionB = entityB.getComponent<ICollisionComponent>('collision');
        
        // If either entity doesn't have a collision component, skip
        if (!collisionA || !collisionB) return null;
        
        // Check if these entities should collide based on collision groups
        if (!this.shouldCollide(collisionA, collisionB)) return null;
        
        // Get collision radii
        const radiusA = collisionA.getRadius();
        const radiusB = collisionB.getRadius();
        
        // Check for collision
        const minDistance = radiusA + radiusB;
        
        if (distance < minDistance) {
            // Calculate collision normal (from B to A)
            const normal = stateA.position.subtract(stateB.position).normalize();
            
            // Calculate penetration depth
            const penetrationDepth = minDistance - distance;
            
            // Calculate collision point (halfway between the entities)
            const collisionPoint = stateB.position.add(normal.scale(radiusB + penetrationDepth * 0.5));
            
            return {
                entityIdA,
                entityIdB,
                normal,
                penetrationDepth,
                collisionPoint,
                stateA,
                stateB,
                collisionA,
                collisionB
            };
        }
        
        return null;
    }

    /**
     * Check if two entities should collide based on their collision groups
     * @param collisionA Collision component of entity A
     * @param collisionB Collision component of entity B
     * @returns Whether the entities should collide
     */
    private shouldCollide(collisionA: ICollisionComponent, collisionB: ICollisionComponent): boolean {
        // Check if A's group is in B's mask and vice versa
        return (
            collisionA.collidesWithGroup(collisionB.getCollisionGroup()) &&
            collisionB.collidesWithGroup(collisionA.getCollisionGroup())
        );
    }

    /**
     * Resolve a collision between two entities
     * @param collision Collision data
     * @param deltaTime Time step
     */
    private resolveCollision(collision: CollisionData, deltaTime: number): void {
        const {
            entityIdA,
            entityIdB,
            normal,
            penetrationDepth,
            collisionPoint,
            stateA,
            stateB,
            collisionA,
            collisionB
        } = collision;
        
        // Calculate masses
        const massA = stateA.mass;
        const massB = stateB.mass;
        const totalMass = massA + massB;
        
        // Calculate mass ratios for position correction
        const ratioA = massB / totalMass;
        const ratioB = massA / totalMass;
        
        // Separate the entities (position correction)
        const separation = normal.scale(penetrationDepth);
        stateA.position.addInPlace(separation.scale(ratioA));
        stateB.position.subtractInPlace(separation.scale(ratioB));
        
        // Update transforms
        stateA.transform.position.copyFrom(stateA.position);
        stateB.transform.position.copyFrom(stateB.position);
        
        // Calculate relative velocity
        const relativeVelocity = stateB.velocity.subtract(stateA.velocity);
        
        // Calculate velocity along the normal
        const normalVelocity = relativeVelocity.dot(normal);
        
        // If objects are moving away from each other, don't apply impulse
        if (normalVelocity > 0) return;
        
        // Calculate restitution (bounciness)
        const restitution = Math.min(
            stateA.material.restitution,
            stateB.material.restitution
        );
        
        // Calculate impulse scalar
        let impulseScalar = -(1 + restitution) * normalVelocity;
        impulseScalar /= (1 / massA) + (1 / massB);
        
        // Apply impulse
        const impulse = normal.scale(impulseScalar);
        stateA.velocity.subtractInPlace(impulse.scale(1 / massA));
        stateB.velocity.addInPlace(impulse.scale(1 / massB));
        
        // Apply friction
        this.applyFriction(stateA, stateB, normal, impulseScalar, deltaTime);
        
        // Notify collision components
        collisionA.handleCollision(entityIdB, collisionPoint, normal.scale(-1), penetrationDepth);
        collisionB.handleCollision(entityIdA, collisionPoint, normal, penetrationDepth);
        
        // Check if this is a ground collision
        this.checkGroundCollision(collision);
    }

    /**
     * Apply friction to colliding entities
     * @param stateA Physics state of entity A
     * @param stateB Physics state of entity B
     * @param normal Collision normal
     * @param impulseScalar Impulse scalar
     * @param deltaTime Time step
     */
    private applyFriction(
        stateA: PhysicsState,
        stateB: PhysicsState,
        normal: Vector3,
        impulseScalar: number,
        deltaTime: number
    ): void {
        // Calculate tangent vector (perpendicular to normal)
        const relativeVelocity = stateB.velocity.subtract(stateA.velocity);
        const normalVelocity = relativeVelocity.dot(normal);
        const normalComponent = normal.scale(normalVelocity);
        const tangent = relativeVelocity.subtract(normalComponent);
        
        // Skip if tangential velocity is very small
        if (tangent.lengthSquared() < 0.001) return;
        
        // Normalize tangent
        tangent.normalizeInPlace();
        
        // Calculate friction coefficient (average of both materials)
        const friction = (stateA.material.friction + stateB.material.friction) * 0.5;
        
        // Calculate friction impulse
        const frictionImpulse = tangent.scale(-friction * impulseScalar);
        
        // Apply friction impulse
        stateA.velocity.subtractInPlace(frictionImpulse.scale(1 / stateA.mass));
        stateB.velocity.addInPlace(frictionImpulse.scale(1 / stateB.mass));
    }

    /**
     * Check if a collision is a ground collision and update grounded state
     * @param collision Collision data
     */
    private checkGroundCollision(collision: CollisionData): void {
        const { normal, collisionA, collisionB } = collision;
        
        // Check if normal is pointing upward (ground collision)
        const upDot = normal.dot(Vector3.up());
        const groundThreshold = Math.cos(Math.PI / 4); // 45 degrees
        
        if (upDot > groundThreshold) {
            // B is below A, so A is grounded on B
            collisionA.setGrounded(true, normal.scale(-1));
        } else if (upDot < -groundThreshold) {
            // A is below B, so B is grounded on A
            collisionB.setGrounded(true, normal);
        }
    }

    /**
     * Get an entity by ID
     * @param entityId Entity ID
     * @returns Entity or undefined if not found
     */
    private getEntityById(entityId: string): IEntity | undefined {
        // This is a placeholder - in a real implementation, you would have a way to get entities by ID
        // For now, we'll return undefined
        return undefined;
    }

    /**
     * Determines if a collision is a ground collision
     * @param normal Collision normal
     * @returns Whether this is a ground collision
     */
    private isGroundCollision(normal: Vector3): boolean {
        // Check if normal is pointing upward (dot product with up vector > threshold)
        const upDot = normal.dot(Vector3.up());
        return upDot > 0.7; // Approximately 45 degrees or less from vertical
    }
}
