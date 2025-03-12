 
import { Scene, Vector3, PhysicsImpostor, Mesh, Ray, CannonJSPlugin } from '@babylonjs/core';
import { IEventEmitter } from '../types/events';
import { Logger } from '../utils/logger';
import { IPhysicsObject, PhysicsMaterial } from '../types/physics';

/**
 * Manages physics simulation for the game
 */
export class Physics {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private physicsObjects: Map<string, IPhysicsObject> = new Map();
    private gravity: Vector3 = new Vector3(0, -9.81, 0);

    /**
     * Initialize the physics system
     * @param scene The Babylon.js scene
     * @param events Event emitter for physics events
     */
    constructor(scene: Scene, events: IEventEmitter) {
        this.logger = new Logger('Physics');
        this.scene = scene;
        this.events = events;

        try {
            this.logger.info('Initializing physics system...');

            // Enable physics in the scene
            this.scene.enablePhysics(this.gravity, new CannonJSPlugin());

            // Subscribe to collision events
            this.scene.onBeforePhysicsObservable.add(() => {
                // Handle pre-physics update logic
            });

            this.scene.onAfterPhysicsObservable.add(() => {
                // Handle post-physics update logic
            });

            this.logger.info('Physics system initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize physics system', error);
            throw error;
        }
    }

    /**
     * Update physics simulation
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        try {
            // Update all physics objects
            this.physicsObjects.forEach((object) => {
                if (object.update) {
                    object.update(deltaTime);
                }
            });

            // Emit physics update event
            this.events.emit('physics:update', { deltaTime });
        } catch (error) {
            this.logger.error('Error updating physics', error);
        }
    }

    /**
     * Register a physics object with the system
     * @param id Unique identifier for the object
     * @param object The physics object to register
     */
    public registerObject(id: string, object: IPhysicsObject): void {
        if (this.physicsObjects.has(id)) {
            this.logger.warn(`Physics object with ID ${id} already exists`);
            return;
        }

        this.physicsObjects.set(id, object);
        this.logger.debug(`Registered physics object: ${id}`);
    }

    /**
     * Unregister a physics object from the system
     * @param id Unique identifier for the object
     */
    public unregisterObject(id: string): void {
        if (!this.physicsObjects.has(id)) {
            this.logger.warn(`Physics object with ID ${id} not found`);
            return;
        }

        this.physicsObjects.delete(id);
        this.logger.debug(`Unregistered physics object: ${id}`);
    }

    /**
     * Create a physics impostor for a mesh
     * @param mesh The mesh to apply physics to
     * @param type The type of physics impostor
     * @param material The material properties
     * @param options Additional options for the impostor
     */
    public createImpostor(
        mesh: Mesh,
        type: number,
        material: PhysicsMaterial,
        options: any = {}
    ): PhysicsImpostor {
        try {
            const impostor = new PhysicsImpostor(
                mesh,
                type,
                {
                    mass: material.mass,
                    friction: material.friction,
                    restitution: material.restitution,
                    ...options
                },
                this.scene
            );

            this.logger.debug(`Created physics impostor for mesh: ${mesh.name}`);
            return impostor;
        } catch (error) {
            this.logger.error(`Failed to create physics impostor for ${mesh.name}`, error);
            throw error;
        }
    }

    /**
     * Apply a force to a physics object
     * @param id The ID of the physics object
     * @param force The force vector to apply
     * @param contactPoint The point to apply the force at (optional)
     */
    public applyForce(id: string, force: Vector3, contactPoint?: Vector3): void {
        const object = this.physicsObjects.get(id);
        if (!object) {
            this.logger.warn(`Cannot apply force: physics object ${id} not found`);
            return;
        }

        if (object.impostor) {
            object.impostor.applyForce(force, contactPoint || object.impostor.getObjectCenter());
            this.logger.debug(`Applied force to ${id}: ${force.toString()}`);
        } else {
            this.logger.warn(`Cannot apply force: physics object ${id} has no impostor`);
        }
    }

    /**
     * Apply an impulse to a physics object
     * @param id The ID of the physics object
     * @param impulse The impulse vector to apply
     * @param contactPoint The point to apply the impulse at (optional)
     */
    public applyImpulse(id: string, impulse: Vector3, contactPoint?: Vector3): void {
        const object = this.physicsObjects.get(id);
        if (!object) {
            this.logger.warn(`Cannot apply impulse: physics object ${id} not found`);
            return;
        }

        if (object.impostor) {
            object.impostor.applyImpulse(impulse, contactPoint || object.impostor.getObjectCenter());
            this.logger.debug(`Applied impulse to ${id}: ${impulse.toString()}`);
        } else {
            this.logger.warn(`Cannot apply impulse: physics object ${id} has no impostor`);
        }
    }

    /**
     * Get the current gravity vector
     */
    public getGravity(): Vector3 {
        return this.gravity.clone();
    }

    /**
     * Set the gravity vector
     * @param gravity The new gravity vector
     */
    public setGravity(gravity: Vector3): void {
        this.gravity = gravity.clone();
        this.scene.getPhysicsEngine()?.setGravity(this.gravity);
        this.logger.debug(`Set gravity to ${this.gravity.toString()}`);
    }

    /**
     * Cast a ray and return information about what it hits
     * @param from Starting point of the ray
     * @param direction Direction of the ray
     * @param distance Maximum distance of the ray
     */
    public raycast(from: Vector3, direction: Vector3, distance: number = 100): any {
        const normalizedDirection = direction.normalize();
        const ray = new Ray(from, normalizedDirection, distance);

        const hit = this.scene.pickWithRay(ray);
        return hit;
    }

    /**
     * Perform a shape cast (like a raycast but with volume)
     * @param shape The shape to cast
     * @param from Starting position
     * @param direction Direction to cast
     * @param distance Maximum distance
     */
    public shapeCast(shape: Mesh, from: Vector3, direction: Vector3, distance: number): any {
        // This is a simplified version, a full implementation would use more complex physics queries
        // For now, we'll use a raycast from the center of the shape
        return this.raycast(from, direction, distance);
    }
}