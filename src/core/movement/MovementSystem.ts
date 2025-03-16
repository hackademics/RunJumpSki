import { PhysicsImpostor, Vector3 as BabylonVector3, Ray, IPhysicsCollisionEvent } from 'babylonjs';
import { IMovementSystem, MovementConfig, MovementState, MovementInput } from './IMovementSystem';
import { Vector3 } from '../../types/core/MathTypes';
import { EventBus } from '../events/EventBus';
import { PhysicsSystem } from '../physics/PhysicsSystem';

/**
 * Implementation of the movement system
 */
export class MovementSystem implements IMovementSystem {
    private static instance: MovementSystem;
    private config: MovementConfig | null = null;
    private body: PhysicsImpostor | null = null;
    private state: MovementState;
    private physics: PhysicsSystem;
    private groundCheckDistance = 0.1;
    private initialized = false;

    private constructor() {
        this.physics = PhysicsSystem.getInstance();
        this.state = this.createInitialState();
    }

    public static getInstance(): MovementSystem {
        if (!MovementSystem.instance) {
            MovementSystem.instance = new MovementSystem();
        }
        return MovementSystem.instance;
    }

    public initialize(config: MovementConfig): void {
        if (this.initialized) {
            throw new Error('Movement system already initialized');
        }
        this.config = config;
        this.initialized = true;
    }

    public attachBody(body: PhysicsImpostor): void {
        this.body = body;
        // Set up collision callback
        const impostors = [PhysicsImpostor.BoxImpostor];
        body.registerOnPhysicsCollide(impostors, (collider: PhysicsImpostor, collidedWith: IPhysicsCollisionEvent) => {
            if (collidedWith.normal) {
                const normal = collidedWith.normal;
                if (normal.y > 0.7) { // Consider it ground if normal points mostly up
                    this.handleGroundContact({ x: normal.x, y: normal.y, z: normal.z });
                }
            }
        });
    }

    public update(input: MovementInput, deltaTime: number): void {
        if (!this.initialized || !this.config || !this.body) {
            return;
        }

        this.updateGroundCheck();
        this.updateMovement(input, deltaTime);
        this.updateSkiing(input, deltaTime);
        this.updateJetpack(input, deltaTime);
    }

    public getState(): MovementState {
        return { ...this.state };
    }

    public setPosition(position: Vector3): void {
        if (this.body) {
            this.physics.setPosition(this.body, position);
        }
    }

    public setRotation(rotation: Vector3): void {
        if (this.body) {
            this.physics.setRotation(this.body, rotation);
        }
    }

    public reset(): void {
        this.state = this.createInitialState();
        if (this.body) {
            this.physics.setLinearVelocity(this.body, { x: 0, y: 0, z: 0 });
            this.physics.setAngularVelocity(this.body, { x: 0, y: 0, z: 0 });
        }
    }

    public dispose(): void {
        this.body = null;
        this.config = null;
        this.initialized = false;
    }

    // Event handlers
    public onGroundContact(callback: (normal: Vector3) => void): void {
        EventBus.getInstance().on('movement:groundContact', callback);
    }

    public onJumpStart(callback: () => void): void {
        EventBus.getInstance().on('movement:jumpStart', callback);
    }

    public onJumpEnd(callback: () => void): void {
        EventBus.getInstance().on('movement:jumpEnd', callback);
    }

    public onSkiStart(callback: () => void): void {
        EventBus.getInstance().on('movement:skiStart', callback);
    }

    public onSkiEnd(callback: () => void): void {
        EventBus.getInstance().on('movement:skiEnd', callback);
    }

    public onJetpackStart(callback: () => void): void {
        EventBus.getInstance().on('movement:jetpackStart', callback);
    }

    public onJetpackEnd(callback: () => void): void {
        EventBus.getInstance().on('movement:jetpackEnd', callback);
    }

    private createInitialState(): MovementState {
        return {
            isGrounded: false,
            isJumping: false,
            isRunning: false,
            velocity: { x: 0, y: 0, z: 0 },
            isSkiing: false,
            skiSpeed: 0,
            skiDirection: { x: 0, y: 0, z: 0 },
            slopeAngle: 0,
            isJetpackActive: false,
            jetpackFuel: 100,
            jetpackForce: { x: 0, y: 0, z: 0 }
        };
    }

    private updateGroundCheck(): void {
        if (!this.body) return;

        const position = this.body.getObjectCenter();
        const ray = new Ray(position, new BabylonVector3(0, -1, 0), this.groundCheckDistance);
        const hit = this.physics.raycast(ray);

        const wasGrounded = this.state.isGrounded;
        this.state.isGrounded = hit !== null;

        if (this.state.isGrounded && !wasGrounded) {
            this.handleGroundContact(hit!.normal);
        }
    }

    private updateMovement(input: MovementInput, deltaTime: number): void {
        if (!this.body || !this.config) return;

        const speed = input.run ? this.config.runSpeed : this.config.walkSpeed;
        const moveForce = new BabylonVector3(
            input.moveDirection.x * speed,
            0,
            input.moveDirection.z * speed
        );

        // Apply movement force
        if (this.state.isGrounded) {
            this.physics.applyForce(this.body, {
                x: moveForce.x,
                y: 0,
                z: moveForce.z
            });
        } else {
            // Reduced control in air
            this.physics.applyForce(this.body, {
                x: moveForce.x * this.config.airControl,
                y: 0,
                z: moveForce.z * this.config.airControl
            });
        }

        // Handle jumping
        if (input.jump && this.state.isGrounded && !this.state.isJumping) {
            this.physics.applyImpulse(this.body, {
                x: 0,
                y: this.config.jumpForce,
                z: 0
            });
            this.state.isJumping = true;
            EventBus.getInstance().emit('movement:jumpStart', undefined);
        }

        // Update state
        this.state.isRunning = input.run;
        const velocity = this.physics.getLinearVelocity(this.body);
        this.state.velocity = velocity;
    }

    private updateSkiing(input: MovementInput, deltaTime: number): void {
        if (!this.body || !this.config) return;

        if (input.ski && this.state.isGrounded) {
            if (!this.state.isSkiing) {
                this.state.isSkiing = true;
                EventBus.getInstance().emit('movement:skiStart', undefined);
            }

            // Calculate slope angle
            const position = this.body.getObjectCenter();
            const ray = new Ray(position, new BabylonVector3(0, -1, 0), this.groundCheckDistance);
            const hit = this.physics.raycast(ray);
            
            if (hit) {
                const normal = hit.normal;
                this.state.slopeAngle = Math.acos(normal.y);

                // Apply skiing forces based on slope
                if (this.state.slopeAngle > this.config.skiMinSlope) {
                    const slopeFactor = Math.min(
                        (this.state.slopeAngle - this.config.skiMinSlope) /
                        (this.config.skiMaxSlope - this.config.skiMinSlope),
                        1
                    );

                    // Calculate ski direction based on input and current direction
                    const targetDirection = new BabylonVector3(
                        input.moveDirection.x,
                        0,
                        input.moveDirection.z
                    ).normalize();

                    const currentDirection = new BabylonVector3(
                        this.state.skiDirection.x,
                        0,
                        this.state.skiDirection.z
                    );

                    // Interpolate towards target direction using Babylon's lerp
                    BabylonVector3.LerpToRef(
                        currentDirection,
                        targetDirection,
                        this.config.skiTurnRate * deltaTime,
                        currentDirection
                    );

                    // Apply ski force
                    const skiForce = currentDirection.scale(
                        this.config.skiAcceleration * slopeFactor
                    );

                    this.physics.applyForce(this.body, {
                        x: skiForce.x,
                        y: 0,
                        z: skiForce.z
                    });

                    // Update state
                    this.state.skiDirection = {
                        x: currentDirection.x,
                        y: 0,
                        z: currentDirection.z
                    };
                    this.state.skiSpeed = this.state.velocity.y;
                }
            }
        } else if (this.state.isSkiing) {
            this.state.isSkiing = false;
            EventBus.getInstance().emit('movement:skiEnd', undefined);
        }
    }

    private updateJetpack(input: MovementInput, deltaTime: number): void {
        if (!this.body || !this.config) return;

        // Update fuel
        if (!this.state.isJetpackActive) {
            this.state.jetpackFuel = Math.min(
                this.state.jetpackFuel + this.config.jetpackFuelRegenRate * deltaTime,
                this.config.jetpackFuelCapacity
            );
        }

        if (input.jetpack && this.state.jetpackFuel > this.config.jetpackMinFuelToActivate) {
            if (!this.state.isJetpackActive) {
                this.state.isJetpackActive = true;
                EventBus.getInstance().emit('movement:jetpackStart', undefined);
            }

            // Calculate jetpack force
            const jetpackForce = new BabylonVector3(0, 1, 0).scale(
                Math.min(
                    this.config.jetpackMaxForce,
                    this.config.jetpackAcceleration * deltaTime
                )
            );

            // Apply force
            this.physics.applyForce(this.body, {
                x: jetpackForce.x,
                y: jetpackForce.y,
                z: jetpackForce.z
            });

            // Consume fuel
            this.state.jetpackFuel = Math.max(
                0,
                this.state.jetpackFuel - this.config.jetpackFuelConsumption * deltaTime
            );

            // Update state
            this.state.jetpackForce = {
                x: jetpackForce.x,
                y: jetpackForce.y,
                z: jetpackForce.z
            };
        } else if (this.state.isJetpackActive) {
            this.state.isJetpackActive = false;
            this.state.jetpackForce = { x: 0, y: 0, z: 0 };
            EventBus.getInstance().emit('movement:jetpackEnd', undefined);
        }
    }

    private handleGroundContact(normal: Vector3): void {
        if (this.state.isJumping) {
            this.state.isJumping = false;
            EventBus.getInstance().emit('movement:jumpEnd', undefined);
        }
        EventBus.getInstance().emit('movement:groundContact', normal);
    }
} 