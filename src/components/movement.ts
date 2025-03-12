import { Vector3, Mesh, Scene, PhysicsImpostor } from '@babylonjs/core';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { IPhysicsObject, PhysicsMaterial, DefaultMaterials, SurfaceType } from '../types/physics';
import { IMovementComponent, MovementState, TerrainData } from '../types/components';

/**
 * Movement component for entities
 * Handles movement states and physics interactions for skiing mechanics
 */
export class MovementComponent implements IMovementComponent, IPhysicsObject {
    private logger: Logger;
    public impostor?: PhysicsImpostor;
    public mesh?: Mesh;
    public position: Vector3;
    public velocity: Vector3 = new Vector3(0, 0, 0);
    private acceleration: Vector3 = new Vector3(0, 0, 0);
    private direction: Vector3 = new Vector3(0, 0, 0);
    private state: MovementState = 'running';
    private grounded: boolean = false;
    private terrainData?: TerrainData;
    private jumpForce: number = 7;
    private runSpeed: number = 7;
    private airControl: number = 0.3;
    private maxSpeed: number = 50;
    private friction: number = 0.1;
    private gravity: Vector3;
    private scene: Scene;
    private events: IEventEmitter;
    private material: PhysicsMaterial;

    // Input state
    private inputMove: Vector3 = new Vector3(0, 0, 0);
    private wantsToJump: boolean = false;
    private wantsToSki: boolean = false;
    private wantsToJetpack: boolean = false;

    // Skiing specific properties
    private skiingActive: boolean = false;
    private slopeDirection: Vector3 = new Vector3(0, 0, 0);
    private slopeAngle: number = 0;
    private minSkiAngle: number = 10 * Math.PI / 180; // 10 degrees in radians

    // Jetpack specific properties
    private jetpackActive: boolean = false;
    private jetpackForce: number = 15;
    private energyLevel: number = 100;
    private maxEnergy: number = 100;
    private energyRegenRate: number = 15; // per second
    private energyUseRate: number = 30; // per second

    /**
     * Initialize a movement component for an entity
     * @param entity The entity to attach to
     * @param scene The Babylon.js scene
     * @param events The event emitter
     * @param options Optional configuration parameters
     */
    constructor(
        private entity: any,
        scene: Scene,
        events: IEventEmitter,
        options: {
            mass?: number;
            initialState?: MovementState;
            maxEnergy?: number;
            runSpeed?: number;
            jumpForce?: number;
            jetpackForce?: number;
            maxSpeed?: number;
        } = {}
    ) {
        this.logger = new Logger(`MovementComponent:${entity.id || 'unknown'}`);
        this.scene = scene;
        this.events = events;
        this.position = new Vector3(0, 0, 0);
        this.gravity = scene.gravity || new Vector3(0, -9.81, 0);

        // Initialize with options or defaults
        this.state = options.initialState || 'running';
        this.maxEnergy = options.maxEnergy || this.maxEnergy;
        this.energyLevel = this.maxEnergy;
        this.runSpeed = options.runSpeed || this.runSpeed;
        this.jumpForce = options.jumpForce || this.jumpForce;
        this.jetpackForce = options.jetpackForce || this.jetpackForce;
        this.maxSpeed = options.maxSpeed || this.maxSpeed;

        // Set up physics material based on state
        this.material = DefaultMaterials.PLAYER;

        // Set up event listeners
        this.setupEventListeners();

        this.logger.info(`Movement component initialized with state: ${this.state}`);
    }

    /**
     * Set up event listeners for input and physics
     */
    private setupEventListeners(): void {
        // Listen for input events
        this.events.on(GameEvent.KEY_DOWN, (data) => this.handleKeyDown(data));
        this.events.on(GameEvent.KEY_UP, (data) => this.handleKeyUp(data));

        // Listen for collision events
        this.events.on(GameEvent.COLLISION_START, (data) => {
            if (data.entity === this.entity) {
                this.handleCollisionStart(data);
            }
        });

        this.events.on(GameEvent.COLLISION_END, (data) => {
            if (data.entity === this.entity) {
                this.handleCollisionEnd(data);
            }
        });
    }

    /**
     * Update movement based on current state and input
     * @param deltaTime Time since last update in seconds
     * @param terrainData Optional terrain data for skiing mechanics
     */
    public update(deltaTime: number, terrainData?: TerrainData): void {
        // Store terrain data for skiing calculations
        this.terrainData = terrainData;

        // Update based on current state
        switch (this.state) {
            case 'running':
                this.updateRunning(deltaTime);
                break;
            case 'skiing':
                this.updateSkiing(deltaTime);
                break;
            case 'flying':
                this.updateFlying(deltaTime);
                break;
            case 'jetpacking':
                this.updateJetpacking(deltaTime);
                break;
        }

        // Apply forces and update position
        this.applyForces(deltaTime);

        // Update energy levels
        this.updateEnergy(deltaTime);

        // Check for state transitions
        this.checkStateTransitions();

        // Apply velocity clamping to prevent extreme speeds
        this.clampVelocity();

        // Update position from physics
        if (this.impostor) {
            const physicsPosition = this.impostor.getObjectCenter();
            this.position.copyFrom(physicsPosition);

            // Update velocity from physics
            const linearVelocity = this.impostor.getLinearVelocity();
            if (linearVelocity) {
                this.velocity.copyFrom(linearVelocity);
            }
        } else if (this.mesh) {
            this.position.copyFrom(this.mesh.position);
        }
    }

    /**
     * Update movement in running state
     * @param deltaTime Time since last update in seconds
     */
    private updateRunning(deltaTime: number): void {
        // Apply movement based on input
        if (this.inputMove.lengthSquared() > 0) {
            // Calculate movement direction in world space
            const moveDirection = this.inputMove.normalize();

            // Apply acceleration based on run speed
            const targetVelocity = moveDirection.scale(this.runSpeed);

            // Smoothly interpolate to target velocity on the horizontal plane
            const currentHorizontalVelocity = new Vector3(this.velocity.x, 0, this.velocity.z);
            const newHorizontalVelocity = Vector3.Lerp(
                currentHorizontalVelocity,
                targetVelocity,
                deltaTime * 10 // Adjust for responsiveness
            );

            // Update velocity, preserving vertical component
            this.velocity.x = newHorizontalVelocity.x;
            this.velocity.z = newHorizontalVelocity.z;
        } else {
            // Apply friction when not actively moving
            this.velocity.x *= (1 - this.friction * deltaTime * 10);
            this.velocity.z *= (1 - this.friction * deltaTime * 10);
        }

        // Handle jumping
        if (this.wantsToJump && this.grounded) {
            this.velocity.y = this.jumpForce;
            this.grounded = false;
            this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'jump' });
        }

        // Check if player wants to start skiing
        if (this.wantsToSki && this.grounded) {
            this.startSkiing();
        }

        // Check if player wants to use jetpack
        if (this.wantsToJetpack && this.energyLevel > 0) {
            this.startJetpack();
        }
    }

    /**
     * Update movement in skiing state
     * @param deltaTime Time since last update in seconds
     */
    private updateSkiing(deltaTime: number): void {
        if (!this.terrainData) {
            // If we don't have terrain data, fall back to running
            this.logger.warn('No terrain data available for skiing, reverting to running');
            this.setState('running');
            return;
        }

        // Calculate slope direction and angle
        this.calculateSlopeProperties();

        // Calculate acceleration based on slope
        const slopeAcceleration = this.calculateSlopeAcceleration();

        // Apply slope acceleration
        this.acceleration.addInPlace(this.slopeDirection.scale(slopeAcceleration));

        // Apply minimal friction during skiing
        const frictionFactor = 1 - (this.terrainData.friction * deltaTime);
        this.velocity.scaleInPlace(frictionFactor);

        // Apply turning forces based on input
        this.applySkiingTurningForces(deltaTime);

        // Check if player wants to stop skiing
        if (!this.wantsToSki) {
            this.stopSkiing();
        }

        // Check if player wants to use jetpack
        if (this.wantsToJetpack && this.energyLevel > 0) {
            this.startJetpack();
        }

        // Check if player wants to jump
        if (this.wantsToJump && this.grounded) {
            // Add upward velocity while preserving horizontal momentum
            this.velocity.y = this.jumpForce;
            this.grounded = false;
            this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'jump' });
        }

        // Check if we're still on a skiable surface
        if (this.grounded && this.terrainData.surfaceType !== SurfaceType.SKIABLE &&
            this.terrainData.surfaceType !== SurfaceType.ICE) {
            this.logger.debug('Not on skiable surface, reverting to running');
            this.stopSkiing();
        }
    }

    /**
     * Update movement in flying state (after jump, before landing)
     * @param deltaTime Time since last update in seconds
     */
    private updateFlying(deltaTime: number): void {
        // Apply air control (limited horizontal movement)
        if (this.inputMove.lengthSquared() > 0) {
            const airMoveDirection = this.inputMove.normalize();
            const airAcceleration = airMoveDirection.scale(this.airControl * this.runSpeed * deltaTime);

            // Only apply air control to horizontal movement
            this.velocity.x += airAcceleration.x;
            this.velocity.z += airAcceleration.z;
        }

        // Check if player wants to start jetpack
        if (this.wantsToJetpack && this.energyLevel > 0) {
            this.startJetpack();
        }

        // Check if player wants to start skiing when landing
        if (this.wantsToSki && this.grounded) {
            this.startSkiing();
        } else if (this.grounded) {
            // If we've landed and not skiing, transition to running
            this.setState('running');
        }
    }

    /**
     * Update movement in jetpacking state
     * @param deltaTime Time since last update in seconds
     */
    private updateJetpacking(deltaTime: number): void {
        // Apply jetpack force (upward)
        const jetpackAcceleration = new Vector3(0, this.jetpackForce, 0);
        this.acceleration.addInPlace(jetpackAcceleration);

        // Apply directional control
        if (this.inputMove.lengthSquared() > 0) {
            const moveDirection = this.inputMove.normalize();
            const controlForce = moveDirection.scale(this.runSpeed * deltaTime * 2);

            // Apply horizontal control
            this.velocity.x += controlForce.x;
            this.velocity.z += controlForce.z;
        }

        // Use energy
        this.useJetpackEnergy(deltaTime);

        // Check if we should stop jetpacking
        if (!this.wantsToJetpack || this.energyLevel <= 0) {
            this.stopJetpack();
        }

        // Check if player wants to start skiing when landing
        if (this.wantsToSki && this.grounded) {
            this.startSkiing();
        } else if (this.grounded) {
            this.setState('running');
        }
    }

    /**
     * Apply forces to the physics object
     * @param deltaTime Time since last update in seconds
     */
    private applyForces(deltaTime: number): void {
        if (!this.impostor) {
            // If no physics impostor, manually update velocity and position
            this.velocity.addInPlace(this.acceleration.scale(deltaTime));
            this.position.addInPlace(this.velocity.scale(deltaTime));

            // Reset acceleration for next frame
            this.acceleration.scaleInPlace(0);

            // Apply gravity if not on ground
            if (!this.grounded) {
                this.velocity.addInPlace(this.gravity.scale(deltaTime));
            }
        } else {
            // If we have a physics impostor, let the physics engine handle it
            this.impostor.setLinearVelocity(this.velocity);
        }
    }

    /**
     * Calculate slope properties for skiing
     */
    private calculateSlopeProperties(): void {
        if (!this.terrainData || !this.terrainData.normal) {
            return;
        }

        // Calculate angle between surface normal and up vector
        const upVector = new Vector3(0, 1, 0);
        const normal = this.terrainData.normal;
        const dotProduct = Vector3.Dot(normal, upVector);
        this.slopeAngle = Math.acos(dotProduct);

        // Calculate slope direction (down the slope)
        // Project the gravity vector onto the surface plane
        const gravityProjection = this.gravity.subtract(
            normal.scale(Vector3.Dot(this.gravity, normal))
        );

        if (gravityProjection.lengthSquared() > 0.001) {
            this.slopeDirection = gravityProjection.normalize();
        } else {
            // If we're on a flat surface, use the current velocity direction
            if (this.velocity.lengthSquared() > 0.001) {
                this.slopeDirection = new Vector3(this.velocity.x, 0, this.velocity.z).normalize();
            } else {
                // Default to forward direction if no velocity
                this.slopeDirection = new Vector3(0, 0, 1);
            }
        }
    }

    /**
     * Calculate acceleration due to slope for skiing
     */
    private calculateSlopeAcceleration(): number {
        // No acceleration on flat ground
        if (this.slopeAngle < this.minSkiAngle) {
            return 0;
        }

        // Basic slope acceleration: g * sin(angle)
        const gravity = this.gravity.length();
        return gravity * Math.sin(this.slopeAngle);
    }

    /**
     * Apply turning forces while skiing
     * @param deltaTime Time since last update in seconds
     */
    private applySkiingTurningForces(deltaTime: number): void {
        if (this.inputMove.lengthSquared() > 0.001) {
            // Get the input direction
            const inputDirection = this.inputMove.normalize();

            // Calculate perpendicular direction to slope for turning
            // This is a simplified version, a more complex version would take into account 
            // the current velocity direction and input direction
            const right = Vector3.Cross(this.slopeDirection, new Vector3(0, 1, 0)).normalize();

            // Calculate turning force based on input
            const turnForce = right.scale(Vector3.Dot(inputDirection, right) * deltaTime * 5);

            // Apply turning force to velocity
            this.velocity.addInPlace(turnForce);
        }
    }

    /**
     * Update energy level for jetpack
     * @param deltaTime Time since last update in seconds
     */
    private updateEnergy(deltaTime: number): void {
        if (this.state === 'jetpacking') {
            // Energy consumption handled in updateJetpacking()
        } else {
            // Regenerate energy when not jetpacking
            this.energyLevel = Math.min(
                this.maxEnergy,
                this.energyLevel + this.energyRegenRate * deltaTime
            );
        }

        // Emit energy update event
        this.events.emit(GameEvent.PLAYER_STATE_CHANGE, {
            entity: this.entity,
            state: this.state,
            energyLevel: this.energyLevel,
            maxEnergy: this.maxEnergy
        });
    }

    /**
     * Use jetpack energy
     * @param deltaTime Time since last update in seconds
     */
    private useJetpackEnergy(deltaTime: number): void {
        this.energyLevel = Math.max(0, this.energyLevel - this.energyUseRate * deltaTime);

        // Emit energy usage event
        if (this.energyLevel <= 0) {
            this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'jetpackEmpty' });
        }
    }

    /**
     * Check for state transitions based on current conditions
     */
    private checkStateTransitions(): void {
        // If we're in the air and not jetpacking, we should be flying
        if (!this.grounded && this.state !== 'jetpacking' && this.state !== 'flying') {
            this.setState('flying');
        }

        // If we're skiing but no longer on a slope, transition to running
        if (this.state === 'skiing' && this.slopeAngle < this.minSkiAngle) {
            this.stopSkiing();
        }
    }

    /**
     * Clamp velocity to prevent excessive speed
     */
    private clampVelocity(): void {
        const speedSquared = this.velocity.lengthSquared();
        if (speedSquared > this.maxSpeed * this.maxSpeed) {
            this.velocity.scaleInPlace(this.maxSpeed / Math.sqrt(speedSquared));
        }
    }

    /**
     * Start skiing mode
     */
    private startSkiing(): void {
        if (this.state === 'skiing') {
            return;
        }

        if (!this.terrainData) {
            this.logger.warn('Cannot start skiing: no terrain data');
            return;
        }

        // Check if we're on a skiable surface
        if (this.terrainData.surfaceType !== SurfaceType.SKIABLE &&
            this.terrainData.surfaceType !== SurfaceType.ICE) {
            this.logger.debug('Cannot start skiing: not on skiable surface');
            return;
        }

        // Check if the slope is steep enough
        this.calculateSlopeProperties();
        if (this.slopeAngle < this.minSkiAngle) {
            this.logger.debug('Cannot start skiing: slope not steep enough');
            return;
        }

        this.setState('skiing');
        this.skiingActive = true;

        // Update physics material for lower friction
        if (this.impostor) {
            this.impostor.setParam('friction', DefaultMaterials.SKI.friction);
        }

        this.events.emit(GameEvent.PLAYER_SKI_START, { entity: this.entity });
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'skiStart' });

        this.logger.debug('Started skiing');
    }

    /**
     * Stop skiing mode
     */
    private stopSkiing(): void {
        if (this.state !== 'skiing') {
            return;
        }

        this.setState(this.grounded ? 'running' : 'flying');
        this.skiingActive = false;

        // Restore normal physics material
        if (this.impostor) {
            this.impostor.setParam('friction', DefaultMaterials.PLAYER.friction);
        }

        this.events.emit(GameEvent.PLAYER_SKI_STOP, { entity: this.entity });
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'skiStop' });

        this.logger.debug('Stopped skiing');
    }

    /**
     * Start jetpack mode
     */
    private startJetpack(): void {
        if (this.state === 'jetpacking' || this.energyLevel <= 0) {
            return;
        }

        this.setState('jetpacking');
        this.jetpackActive = true;

        this.events.emit(GameEvent.PLAYER_JETPACK_START, { entity: this.entity });
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'jetpackStart' });

        this.logger.debug('Started jetpack');
    }

    /**
     * Stop jetpack mode
     */
    private stopJetpack(): void {
        if (this.state !== 'jetpacking') {
            return;
        }

        this.setState(this.grounded ? 'running' : 'flying');
        this.jetpackActive = false;

        this.events.emit(GameEvent.PLAYER_JETPACK_STOP, { entity: this.entity });
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'jetpackStop' });

        this.logger.debug('Stopped jetpack');
    }

    /**
     * Set the movement state and emit event
     * @param state New movement state
     */
    private setState(state: MovementState): void {
        if (this.state === state) {
            return;
        }

        const oldState = this.state;
        this.state = state;

        this.events.emit(GameEvent.PLAYER_STATE_CHANGE, {
            entity: this.entity,
            oldState,
            newState: state,
            energyLevel: this.energyLevel,
            maxEnergy: this.maxEnergy
        });

        this.logger.debug(`State changed: ${oldState} -> ${state}`);
    }

    /**
     * Handle collision start events
     * @param data Collision event data
     */
    private handleCollisionStart(data: any): void {
        // Check if collision is with the ground
        if (data.normal && data.normal.y > 0.7) { // Consider it ground if normal points up
            this.grounded = true;

            // Store terrain data if available
            if (data.terrainData) {
                this.terrainData = data.terrainData;
            }

            // Check if we should automatically enter skiing mode
            if (this.wantsToSki && this.terrainData &&
                (this.terrainData.surfaceType === SurfaceType.SKIABLE ||
                    this.terrainData.surfaceType === SurfaceType.ICE)) {
                this.startSkiing();
            } else if (this.state === 'flying' || this.state === 'jetpacking') {
                // Transition to running if we've landed
                this.setState('running');
            }
        }
    }

    /**
     * Handle collision end events
     * @param data Collision event data
     */
    private handleCollisionEnd(data: any): void {
        // Check if we've left the ground
        if (data.normal && data.normal.y > 0.7) {
            this.grounded = false;

            // Check if we need to leave skiing mode
            if (this.state === 'skiing') {
                this.setState('flying');
            }
        }
    }

    /**
     * Handle key down events
     * @param data Key event data
     */
    private handleKeyDown(data: any): void {
        const { key } = data;

        // Convert key presses to movement input
        switch (key.toLowerCase()) {
            case 'w':
                this.inputMove.z = 1;
                break;
            case 's':
                this.inputMove.z = -1;
                break;
            case 'a':
                this.inputMove.x = -1;
                break;
            case 'd':
                this.inputMove.x = 1;
                break;
            case ' ': // Space for jump
                this.wantsToJump = true;
                break;
            case 'shift': // Shift for skiing
                this.wantsToSki = true;
                break;
            case 'control': // Control for jetpack
                this.wantsToJetpack = true;
                break;
        }
    }

    /**
     * Handle key up events
     * @param data Key event data
     */
    private handleKeyUp(data: any): void {
        const { key } = data;

        // Reset movement input
        switch (key.toLowerCase()) {
            case 'w':
                if (this.inputMove.z > 0) this.inputMove.z = 0;
                break;
            case 's':
                if (this.inputMove.z < 0) this.inputMove.z = 0;
                break;
            case 'a':
                if (this.inputMove.x < 0) this.inputMove.x = 0;
                break;
            case 'd':
                if (this.inputMove.x > 0) this.inputMove.x = 0;
                break;
            case ' ': // Space for jump
                this.wantsToJump = false;
                break;
            case 'shift': // Shift for skiing
                this.wantsToSki = false;
                break;
            case 'control': // Control for jetpack
                this.wantsToJetpack = false;
                break;
        }
    }

    /**
     * Apply a force to the object
     * @param force Force vector to apply
     * @param contactPoint Point to apply the force at (optional)
     */
    public applyForce(force: Vector3, contactPoint?: Vector3): void {
        if (this.impostor) {
            this.impostor.applyForce(force, contactPoint || this.impostor.getObjectCenter());
        } else {
            // If no impostor, apply directly to velocity
            this.velocity.addInPlace(force);
        }
    }

    /**
     * Apply an impulse to the object
     * @param impulse Impulse vector to apply
     * @param contactPoint Point to apply the impulse at (optional)
     */
    public applyImpulse(impulse: Vector3, contactPoint?: Vector3): void {
        if (this.impostor) {
            this.impostor.applyImpulse(impulse, contactPoint || this.impostor.getObjectCenter());
        } else {
            // If no impostor, apply directly to velocity
            this.velocity.addInPlace(impulse);
        }
    }

    /**
     * Initialize physics for this component
     * @param mesh The mesh to attach physics to
     */
    public initPhysics(mesh: Mesh): void {
        this.mesh = mesh;
        this.position = mesh.position.clone();

        // Create physics impostor
        try {
            this.impostor = new PhysicsImpostor(
                mesh,
                PhysicsImpostor.BoxImpostor,
                {
                    mass: this.material.mass,
                    friction: this.material.friction,
                    restitution: this.material.restitution
                },
                this.scene
            );

            this.logger.debug('Physics impostor created for movement component');
        } catch (error) {
            this.logger.error('Failed to create physics impostor', error);
        }
    }

    /**
     * Get the current movement state
     */
    public getState(): MovementState {
        return this.state;
    }

    /**
     * Set input movement vector directly (for external control)
     * @param move Input movement vector
     */
    public setInputMove(move: Vector3): void {
        this.inputMove = move.clone();
    }

    /**
     * Set jump input
     * @param jump Whether the entity wants to jump
     */
    public setJump(jump: boolean): void {
        this.wantsToJump = jump;
    }

    /**
     * Set ski input
     * @param ski Whether the entity wants to ski
     */
    public setSki(ski: boolean): void {
        this.wantsToSki = ski;
    }

    /**
     * Set jetpack input
     * @param jetpack Whether the entity wants to use jetpack
     */
    public setJetpack(jetpack: boolean): void {
        this.wantsToJetpack = jetpack;
    }

    /**
     * Check if entity is on the ground
     */
    public isGrounded(): boolean {
        return this.grounded;
    }

    /**
     * Get current energy level
     */
    public getEnergyLevel(): number {
        return this.energyLevel;
    }

    /**
     * Get maximum energy level
     */
    public getMaxEnergy(): number {
        return this.maxEnergy;
    }

    /**
     * Get current velocity
     */
    public getVelocity(): Vector3 {
        return this.velocity.clone();
    }

    /**
     * Get current speed (velocity magnitude)
     */
    public getSpeed(): number {
        return this.velocity.length();
    }

    /**
     * Set velocity directly
     * @param velocity New velocity vector
     */
    public setVelocity(velocity: Vector3): void {
        this.velocity = velocity.clone();

        if (this.impostor) {
            this.impostor.setLinearVelocity(this.velocity);
        }
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Remove event listeners
        this.events.removeAllListeners();

        // Clean up physics
        if (this.impostor) {
            this.impostor.dispose();
            this.impostor = undefined;
        }

        this.logger.debug('Movement component disposed');
    }
}