import { Engine } from './engine';
import { EventSystem, EventType } from './events';
import { Logger } from './logger';
import { Vector3, Quaternion } from './math';
import { Entity } from './entity';
import { MovementComponent, MovementState } from './movement';
import { TerrainSystem, SurfaceType } from './terrain';

export interface PhysicsConfig {
    gravity: number;
    friction: {
        [SurfaceType.Default]: number;
        [SurfaceType.Snow]: number;
        [SurfaceType.Ice]: number;
        [SurfaceType.Rock]: number;
        [SurfaceType.Metal]: number;
    };
    airResistance: number;
    maxSkiingSpeed: number;
    maxRunningSpeed: number;
    maxJetpackSpeed: number;
    jetpackAcceleration: number;
    jetpackEnergyMax: number;
    jetpackEnergyUsage: number;
    jetpackEnergyRecharge: number;
    jetpackEnergyRechargeDelay: number;
}

export class PhysicsSystem {
    private engine: Engine;
    private eventSystem: EventSystem;
    private terrainSystem: TerrainSystem;
    private logger: Logger;
    private entities: Map<number, Entity> = new Map();
    private config: PhysicsConfig;

    constructor(engine: Engine) {
        this.engine = engine;
        this.eventSystem = engine.getEventSystem();
        this.terrainSystem = engine.getTerrainSystem();
        this.logger = new Logger('PhysicsSystem');

        // Default physics configuration - can be tuned for game feel
        this.config = {
            gravity: 9.8,
            friction: {
                [SurfaceType.Default]: 0.5,
                [SurfaceType.Snow]: 0.1,
                [SurfaceType.Ice]: 0.05,
                [SurfaceType.Rock]: 0.7,
                [SurfaceType.Metal]: 0.3
            },
            airResistance: 0.01,
            maxSkiingSpeed: 30.0,
            maxRunningSpeed: 7.0,
            maxJetpackSpeed: 20.0,
            jetpackAcceleration: 15.0,
            jetpackEnergyMax: 100.0,
            jetpackEnergyUsage: 25.0, // per second
            jetpackEnergyRecharge: 20.0, // per second
            jetpackEnergyRechargeDelay: 1.0 // seconds
        };

        this.registerEvents();
    }

    private registerEvents(): void {
        this.eventSystem.subscribe(EventType.ENTITY_CREATED, (entity: Entity) => {
            if (entity.hasComponent('movement')) {
                this.entities.set(entity.getId(), entity);
                this.logger.debug(`Registered entity ${entity.getId()} with physics system`);
            }
        });

        this.eventSystem.subscribe(EventType.ENTITY_DESTROYED, (entityId: number) => {
            this.entities.delete(entityId);
            this.logger.debug(`Unregistered entity ${entityId} from physics system`);
        });
    }

    public update(deltaTime: number): void {
        this.entities.forEach((entity) => {
            const movementComponent = entity.getComponent<MovementComponent>('movement');
            if (!movementComponent) return;

            // Get current state
            const position = movementComponent.getPosition();
            const velocity = movementComponent.getVelocity();
            const currentState = movementComponent.getCurrentState();
            const orientation = movementComponent.getOrientation();
            const input = movementComponent.getInput();
            const jetpackEnergy = movementComponent.getJetpackEnergy();
            const lastJetpackUseTime = movementComponent.getLastJetpackUseTime();

            // Get terrain information at current position
            const surfaceInfo = this.terrainSystem.getSurfaceInfoAt(position);
            const surfaceNormal = surfaceInfo.normal;
            const surfaceType = surfaceInfo.type;
            const friction = this.config.friction[surfaceType];
            const height = surfaceInfo.height;

            // Calculate new position and velocity based on physics
            let newVelocity = new Vector3(velocity.x, velocity.y, velocity.z);
            let newPosition = new Vector3(position.x, position.y, position.z);
            let newState = currentState;
            let newJetpackEnergy = jetpackEnergy;

            // Apply gravity if not grounded
            const distanceToGround = position.y - height;
            const isGrounded = distanceToGround <= 0.1;

            if (!isGrounded) {
                newVelocity.y -= this.config.gravity * deltaTime;
            }

            // Handle movement state transitions and physics
            switch (currentState) {
                case MovementState.RUNNING:
                    this.handleRunningPhysics(movementComponent, newVelocity, newPosition, deltaTime, input, isGrounded, surfaceNormal, friction);
                    // Check for ski mode activation
                    if (input.ski && isGrounded) {
                        newState = MovementState.SKIING;
                        this.eventSystem.emit(EventType.MOVEMENT_STATE_CHANGED, { entity: entity, oldState: currentState, newState: newState });
                    }
                    // Check for jetpack activation
                    if (input.jetpack && jetpackEnergy > 0) {
                        newState = MovementState.JETPACKING;
                        this.eventSystem.emit(EventType.MOVEMENT_STATE_CHANGED, { entity: entity, oldState: currentState, newState: newState });
                    }
                    break;

                case MovementState.SKIING:
                    this.handleSkiingPhysics(movementComponent, newVelocity, newPosition, deltaTime, input, isGrounded, surfaceNormal, friction);
                    // Check for ski mode deactivation
                    if (!input.ski || !isGrounded) {
                        if (!isGrounded) {
                            newState = MovementState.FLYING;
                        } else {
                            newState = MovementState.RUNNING;
                        }
                        this.eventSystem.emit(EventType.MOVEMENT_STATE_CHANGED, { entity: entity, oldState: currentState, newState: newState });
                    }
                    // Check for jetpack activation
                    if (input.jetpack && jetpackEnergy > 0) {
                        newState = MovementState.JETPACKING;
                        this.eventSystem.emit(EventType.MOVEMENT_STATE_CHANGED, { entity: entity, oldState: currentState, newState: newState });
                    }
                    break;

                case MovementState.FLYING:
                    this.handleFlyingPhysics(movementComponent, newVelocity, newPosition, deltaTime, input, surfaceNormal);
                    // Check for landing
                    if (isGrounded) {
                        if (input.ski) {
                            newState = MovementState.SKIING;
                        } else {
                            newState = MovementState.RUNNING;
                        }
                        this.eventSystem.emit(EventType.MOVEMENT_STATE_CHANGED, { entity: entity, oldState: currentState, newState: newState });
                    }
                    // Check for jetpack activation
                    if (input.jetpack && jetpackEnergy > 0) {
                        newState = MovementState.JETPACKING;
                        this.eventSystem.emit(EventType.MOVEMENT_STATE_CHANGED, { entity: entity, oldState: currentState, newState: newState });
                    }
                    break;

                case MovementState.JETPACKING:
                    this.handleJetpackPhysics(movementComponent, newVelocity, newPosition, deltaTime, input, orientation);
                    // Consume jetpack energy
                    newJetpackEnergy -= this.config.jetpackEnergyUsage * deltaTime;
                    if (newJetpackEnergy <= 0 || !input.jetpack) {
                        newJetpackEnergy = Math.max(0, newJetpackEnergy);
                        if (isGrounded) {
                            if (input.ski) {
                                newState = MovementState.SKIING;
                            } else {
                                newState = MovementState.RUNNING;
                            }
                        } else {
                            newState = MovementState.FLYING;
                        }
                        this.eventSystem.emit(EventType.MOVEMENT_STATE_CHANGED, { entity: entity, oldState: currentState, newState: newState });
                    }
                    break;
            }

            // Handle jetpack energy recharge when not using jetpack
            if (newState !== MovementState.JETPACKING) {
                const currentTime = performance.now() / 1000;
                if (currentTime - lastJetpackUseTime > this.config.jetpackEnergyRechargeDelay) {
                    newJetpackEnergy += this.config.jetpackEnergyRecharge * deltaTime;
                    newJetpackEnergy = Math.min(newJetpackEnergy, this.config.jetpackEnergyMax);
                }
            } else {
                movementComponent.setLastJetpackUseTime(performance.now() / 1000);
            }

            // Update position based on velocity
            newPosition.x += newVelocity.x * deltaTime;
            newPosition.y += newVelocity.y * deltaTime;
            newPosition.z += newVelocity.z * deltaTime;

            // Prevent falling through the ground
            if (newPosition.y < height && newVelocity.y < 0) {
                newPosition.y = height;
                newVelocity.y = 0;
            }

            // Update movement component with new values
            movementComponent.setPosition(newPosition);
            movementComponent.setVelocity(newVelocity);
            movementComponent.setCurrentState(newState);
            movementComponent.setJetpackEnergy(newJetpackEnergy);
            movementComponent.setIsGrounded(isGrounded);

            // Emit physics update event for other systems to respond to
            this.eventSystem.emit(EventType.PHYSICS_UPDATED, {
                entity: entity,
                position: newPosition,
                velocity: newVelocity,
                state: newState
            });

            // Apply collision detection and response
            this.handleCollisions(entity, movementComponent);
        });
    }

    private handleRunningPhysics(
        movementComponent: MovementComponent,
        velocity: Vector3,
        position: Vector3,
        deltaTime: number,
        input: any,
        isGrounded: boolean,
        surfaceNormal: Vector3,
        friction: number
    ): void {
        // Get the forward and right vectors from orientation
        const orientation = movementComponent.getOrientation();
        const forward = orientation.getForwardVector();
        const right = orientation.getRightVector();

        // Apply input to velocity
        const inputDirection = new Vector3(0, 0, 0);
        if (input.forward) inputDirection.add(forward);
        if (input.backward) inputDirection.subtract(forward);
        if (input.left) inputDirection.subtract(right);
        if (input.right) inputDirection.add(right);

        // Normalize input direction if any input is present
        if (inputDirection.length() > 0) {
            inputDirection.normalize();

            // Project movement along the surface
            const projectedDirection = this.projectOnSurface(inputDirection, surfaceNormal);

            // Apply acceleration
            const acceleration = 10.0; // Running acceleration
            velocity.x += projectedDirection.x * acceleration * deltaTime;
            velocity.z += projectedDirection.z * acceleration * deltaTime;
        }

        // Apply friction when grounded
        if (isGrounded) {
            const horizontalVelocity = new Vector3(velocity.x, 0, velocity.z);
            const horizontalSpeed = horizontalVelocity.length();

            if (horizontalSpeed > 0) {
                const frictionFactor = Math.max(0, 1 - friction * deltaTime);
                velocity.x *= frictionFactor;
                velocity.z *= frictionFactor;
            }
        }

        // Limit maximum running speed
        const horizontalVelocity = new Vector3(velocity.x, 0, velocity.z);
        const horizontalSpeed = horizontalVelocity.length();

        if (horizontalSpeed > this.config.maxRunningSpeed) {
            horizontalVelocity.normalize();
            horizontalVelocity.multiply(this.config.maxRunningSpeed);
            velocity.x = horizontalVelocity.x;
            velocity.z = horizontalVelocity.z;
        }
    }

    private handleSkiingPhysics(
        movementComponent: MovementComponent,
        velocity: Vector3,
        position: Vector3,
        deltaTime: number,
        input: any,
        isGrounded: boolean,
        surfaceNormal: Vector3,
        friction: number
    ): void {
        // In ski mode, we want to slide down slopes
        if (isGrounded) {
            // Calculate the slope vector (points downhill)
            const slopeDirection = new Vector3(surfaceNormal.x, 0, surfaceNormal.z);
            if (slopeDirection.length() > 0) {
                slopeDirection.normalize();

                // Calculate the slope angle
                const slopeAngle = Math.acos(surfaceNormal.y);

                // Apply gravity force along the slope
                const slopeForce = Math.sin(slopeAngle) * this.config.gravity;

                // Apply force in the downhill direction
                velocity.x += slopeDirection.x * slopeForce * deltaTime;
                velocity.z += slopeDirection.z * slopeForce * deltaTime;
            }

            // Apply minimal friction when skiing (much less than running)
            const skiingFriction = friction * 0.2; // Reduced friction while skiing
            const frictionFactor = Math.max(0, 1 - skiingFriction * deltaTime);
            velocity.x *= frictionFactor;
            velocity.z *= frictionFactor;
        }

        // Get orientation for input-based steering
        const orientation = movementComponent.getOrientation();
        const right = orientation.getRightVector();

        // Allow player to steer while skiing
        if (input.left) {
            velocity.x -= right.x * 2.0 * deltaTime;
            velocity.z -= right.z * 2.0 * deltaTime;
        }

        if (input.right) {
            velocity.x += right.x * 2.0 * deltaTime;
            velocity.z += right.z * 2.0 * deltaTime;
        }

        // Limit maximum skiing speed
        const horizontalVelocity = new Vector3(velocity.x, 0, velocity.z);
        const horizontalSpeed = horizontalVelocity.length();

        if (horizontalSpeed > this.config.maxSkiingSpeed) {
            horizontalVelocity.normalize();
            horizontalVelocity.multiply(this.config.maxSkiingSpeed);
            velocity.x = horizontalVelocity.x;
            velocity.z = horizontalVelocity.z;
        }
    }

    private handleFlyingPhysics(
        movementComponent: MovementComponent,
        velocity: Vector3,
        position: Vector3,
        deltaTime: number,
        input: any,
        surfaceNormal: Vector3
    ): void {
        // In flying state, player has minimal air control
        const orientation = movementComponent.getOrientation();
        const forward = orientation.getForwardVector();
        const right = orientation.getRightVector();

        // Apply limited air control
        const airControlFactor = 0.3;

        if (input.forward) {
            velocity.x += forward.x * airControlFactor * deltaTime;
            velocity.z += forward.z * airControlFactor * deltaTime;
        }

        if (input.backward) {
            velocity.x -= forward.x * airControlFactor * deltaTime;
            velocity.z -= forward.z * airControlFactor * deltaTime;
        }

        if (input.left) {
            velocity.x -= right.x * airControlFactor * deltaTime;
            velocity.z -= right.z * airControlFactor * deltaTime;
        }

        if (input.right) {
            velocity.x += right.x * airControlFactor * deltaTime;
            velocity.z += right.z * airControlFactor * deltaTime;
        }

        // Apply air resistance
        const airResistanceFactor = Math.max(0, 1 - this.config.airResistance * deltaTime);
        velocity.x *= airResistanceFactor;
        velocity.y *= airResistanceFactor;
        velocity.z *= airResistanceFactor;
    }

    private handleJetpackPhysics(
        movementComponent: MovementComponent,
        velocity: Vector3,
        position: Vector3,
        deltaTime: number,
        input: any,
        orientation: Quaternion
    ): void {
        // Get the forward and right vectors from orientation
        const forward = orientation.getForwardVector();
        const right = orientation.getRightVector();
        const up = orientation.getUpVector();

        // Apply jetpack thrust in the up direction
        velocity.y += this.config.jetpackAcceleration * deltaTime;

        // Apply directional control
        const jetpackControlFactor = 5.0;

        if (input.forward) {
            velocity.x += forward.x * jetpackControlFactor * deltaTime;
            velocity.z += forward.z * jetpackControlFactor * deltaTime;
        }

        if (input.backward) {
            velocity.x -= forward.x * jetpackControlFactor * deltaTime;
            velocity.z -= forward.z * jetpackControlFactor * deltaTime;
        }

        if (input.left) {
            velocity.x -= right.x * jetpackControlFactor * deltaTime;
            velocity.z -= right.z * jetpackControlFactor * deltaTime;
        }

        if (input.right) {
            velocity.x += right.x * jetpackControlFactor * deltaTime;
            velocity.z += right.z * jetpackControlFactor * deltaTime;
        }

        // Apply air resistance
        const airResistanceFactor = Math.max(0, 1 - this.config.airResistance * 2 * deltaTime);
        velocity.x *= airResistanceFactor;
        velocity.z *= airResistanceFactor;

        // Limit maximum jetpack speed
        const speed = velocity.length();
        if (speed > this.config.maxJetpackSpeed) {
            velocity.normalize();
            velocity.multiply(this.config.maxJetpackSpeed);
        }
    }

    private handleCollisions(entity: Entity, movementComponent: MovementComponent): void {
        // Simple collision detection with static objects in the scene
        // This would be expanded for more complex collision handling
        const position = movementComponent.getPosition();
        const radius = 1.0; // Player collision radius

        // Get nearby entities that could be collided with
        const nearbyEntities = this.engine.getSpatialIndex().getNearbyEntities(position, radius * 2);

        for (const otherEntity of nearbyEntities) {
            if (otherEntity.getId() === entity.getId()) continue;

            // Simple sphere collision
            const otherPosition = otherEntity.getComponent('transform')?.getPosition();
            if (!otherPosition) continue;

            const distance = position.distanceTo(otherPosition);
            const minDistance = radius + (otherEntity.getComponent('collision')?.getRadius() || 0);

            if (distance < minDistance) {
                // Simple collision response - push away from object
                const direction = new Vector3(
                    position.x - otherPosition.x,
                    position.y - otherPosition.y,
                    position.z - otherPosition.z
                );

                if (direction.length() > 0) {
                    direction.normalize();

                    // Push away
                    const pushDistance = minDistance - distance;
                    const newPosition = new Vector3(
                        position.x + direction.x * pushDistance,
                        position.y + direction.y * pushDistance,
                        position.z + direction.z * pushDistance
                    );

                    movementComponent.setPosition(newPosition);

                    // Reflect velocity
                    const velocity = movementComponent.getVelocity();
                    const reflection = this.reflect(velocity, direction);
                    movementComponent.setVelocity(reflection);

                    // Emit collision event
                    this.eventSystem.emit(EventType.COLLISION, {
                        entity: entity,
                        otherEntity: otherEntity,
                        position: newPosition,
                        normal: direction
                    });
                }
            }
        }
    }

    private projectOnSurface(vector: Vector3, normal: Vector3): Vector3 {
        // Project a vector onto a surface defined by its normal
        const dot = vector.dot(normal);
        return new Vector3(
            vector.x - normal.x * dot,
            vector.y - normal.y * dot,
            vector.z - normal.z * dot
        );
    }

    private reflect(vector: Vector3, normal: Vector3): Vector3 {
        // Reflect a vector off a surface defined by its normal
        const dot = vector.dot(normal);
        return new Vector3(
            vector.x - 2 * normal.x * dot,
            vector.y - 2 * normal.y * dot,
            vector.z - 2 * normal.z * dot
        );
    }

    public setConfig(config: Partial<PhysicsConfig>): void {
        this.config = { ...this.config, ...config };
    }

    public getConfig(): PhysicsConfig {
        return this.config;
    }
}