 
/**
 * File: src/entities/projectile.ts
 * Projectile entity implementation for weapons
 */

import {
    Scene,
    Vector3,
    Mesh,
    MeshBuilder,
    TrailMesh,
    Material,
    StandardMaterial,
    Color3,
    Color4,
    PhysicsImpostor,
    ParticleSystem,
    Texture,
    PointLight,
    SphereDirectedParticleEmitter
} from '@babylonjs/core';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { IPhysicsObject, DefaultMaterials, RaycastHit } from '../types/physics';

/**
 * Projectile configuration options
 */
export interface ProjectileOptions {
    /**
     * Owner entity of the projectile
     */
    owner: any;

    /**
     * Projectile lifetime in seconds
     */
    lifetime: number;

    /**
     * Projectile speed in units per second
     */
    speed: number;

    /**
     * Damage amount
     */
    damage: number;

    /**
     * Size scale of the projectile
     */
    scale?: number;

    /**
     * Custom mesh name to use
     */
    meshName?: string;

    /**
     * Custom material for the projectile
     */
    material?: Material;

    /**
     * Gravity multiplier (0 = no gravity)
     */
    gravityMultiplier?: number;

    /**
     * Whether to create a trail effect
     */
    createTrail?: boolean;

    /**
     * Explosion radius (0 = no explosion)
     */
    explosionRadius?: number;

    /**
     * Impact force applied to hit objects
     */
    impactForce?: number;
}

/**
 * Default projectile options
 */
const DefaultProjectileOptions: Partial<ProjectileOptions> = {
    scale: 0.5,
    gravityMultiplier: 0.1,
    createTrail: true,
    explosionRadius: 3,
    impactForce: 15
};

/**
 * Projectile entity for weapons
 */
export class Projectile implements IPhysicsObject {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private options: ProjectileOptions;

    // State
    private active: boolean = false;
    private lifeRemaining: number = 0;
    private id: string = '';
    private ownerEntity: any;

    // Physics
    public impostor?: PhysicsImpostor;
    public mesh?: Mesh;
    public position: Vector3 = new Vector3(0, 0, 0);
    public velocity: Vector3 = new Vector3(0, 0, 0);

    // Visual effects
    private trailMesh?: TrailMesh;
    private particleSystem?: ParticleSystem;
    private light?: PointLight;

    // Hit detection
    private lastPosition: Vector3 = new Vector3(0, 0, 0);
    private collisionCheckDistance: number = 0.5; // How frequently to check for collisions in distance units
    private collisionChecked: boolean = false;

    // Instance counter for unique IDs
    private static nextId: number = 0;

    /**
     * Initialize a projectile entity
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param options Projectile options
     */
    constructor(scene: Scene, events: IEventEmitter, options: ProjectileOptions) {
        this.id = `projectile_${Projectile.nextId++}`;
        this.logger = new Logger(`Projectile:${this.id}`);
        this.scene = scene;
        this.events = events;
        this.options = { ...DefaultProjectileOptions, ...options };
        this.ownerEntity = options.owner;

        // Create mesh
        this.createMesh();

        this.logger.debug('Projectile created');
    }

    /**
     * Create the projectile mesh
     */
    private createMesh(): void {
        // Create main projectile mesh
        if (this.options.meshName) {
            // Use custom mesh if specified
            const customMesh = this.scene.getMeshByName(this.options.meshName);
            if (customMesh) {
                this.mesh = customMesh.clone(this.id, null) as Mesh;
            } else {
                this.logger.warn(`Custom mesh ${this.options.meshName} not found. Using default.`);
                this.createDefaultMesh();
            }
        } else {
            this.createDefaultMesh();
        }

        // Set initial visibility
        if (this.mesh) {
            this.mesh.isVisible = false; // Hide until fired
        }
    }

    /**
     * Create the default projectile mesh
     */
    private createDefaultMesh(): void {
        // Create a disc-shaped mesh for the spinfusor projectile
        this.mesh = MeshBuilder.CreateCylinder(
            this.id,
            {
                height: 0.2,
                diameter: 1.0,
                tessellation: 24
            },
            this.scene
        );

        // Scale mesh
        if (this.options.scale) {
            this.mesh.scaling = new Vector3(
                this.options.scale,
                this.options.scale,
                this.options.scale
            );
        }

        // Apply material
        if (this.options.material) {
            this.mesh.material = this.options.material;
        } else {
            const material = new StandardMaterial(`${this.id}_material`, this.scene);
            material.diffuseColor = new Color3(0.1, 0.6, 1.0);
            material.specularColor = new Color3(0.2, 0.2, 0.2);
            material.emissiveColor = new Color3(0.1, 0.4, 0.8);

            // Make it glow
            material.emissiveFresnelParameters = null;
            material.disableLighting = true;

            this.mesh.material = material;
        }
    }

    /**
     * Create visual effects for the projectile
     */
    private createVisualEffects(): void {
        if (!this.mesh) return;

        // Create light
        this.light = new PointLight(
            `${this.id}_light`,
            this.mesh.position.clone(),
            this.scene
        );
        this.light.intensity = 0.7;
        this.light.diffuse = new Color3(0.1, 0.5, 1.0);
        this.light.specular = new Color3(0.1, 0.5, 1.0);
        this.light.range = 10;

        // Create trail if enabled
        if (this.options.createTrail && this.mesh) {
            this.trailMesh = new TrailMesh(
                `${this.id}_trail`,
                this.mesh,
                this.scene,
                0.2,  // trail width
                30,   // trail length
                true  // update regularly
            );

            const trailMaterial = new StandardMaterial(`${this.id}_trail_material`, this.scene);
            trailMaterial.emissiveColor = new Color3(0.1, 0.5, 1.0);
            trailMaterial.diffuseColor = new Color3(0.1, 0.3, 0.6);
            trailMaterial.alpha = 0.7;
            trailMaterial.backFaceCulling = false;
            trailMaterial.disableLighting = true;

            this.trailMesh.material = trailMaterial;
        }

        // Create particle system for engine effect
        this.particleSystem = new ParticleSystem(`${this.id}_particles`, 100, this.scene);
        this.particleSystem.particleTexture = new Texture("/textures/flare.png", this.scene);

        // Set emitter to mesh position
        this.particleSystem.emitter = this.mesh;
        this.particleSystem.minEmitBox = new Vector3(0, 0, 0);
        this.particleSystem.maxEmitBox = new Vector3(0, 0, 0);

        // Configure particle behavior
        this.particleSystem.color1 = new Color4(0.1, 0.6, 1.0, 1.0);
        this.particleSystem.color2 = new Color4(0.2, 0.4, 0.8, 1.0);
        this.particleSystem.colorDead = new Color4(0.1, 0.1, 0.5, 0.0);

        this.particleSystem.minSize = 0.1;
        this.particleSystem.maxSize = 0.3;

        this.particleSystem.minLifeTime = 0.1;
        this.particleSystem.maxLifeTime = 0.3;

        this.particleSystem.emitRate = 50;

        this.particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

        this.particleSystem.direction1 = new Vector3(-1, -1, -1);
        this.particleSystem.direction2 = new Vector3(1, 1, 1);

        this.particleSystem.minEmitPower = 0.5;
        this.particleSystem.maxEmitPower = 1.5;

        // Use a sphere emitter for better effect
        const sphereEmitter = new SphereDirectedParticleEmitter(
            0.1, // radius
            new Vector3(0, 0, -1), // direction1
            new Vector3(0, 0, -1)  // direction2
        );
        this.particleSystem.particleEmitterType = sphereEmitter;

        // Start the particle system
        this.particleSystem.start();
    }

    /**
     * Fire the projectile
     * @param position Starting position
     * @param direction Direction to fire in
     * @param initialVelocity Initial velocity to inherit
     */
    public fire(position: Vector3, direction: Vector3, initialVelocity: Vector3 = new Vector3(0, 0, 0)): void {
        if (!this.mesh) {
            this.logger.error('Cannot fire: mesh not created');
            return;
        }

        // Set position and make visible
        this.mesh.position = position.clone();
        this.position = position.clone();
        this.lastPosition = position.clone();
        this.mesh.isVisible = true;

        // Orient to direction
        if (direction.length() > 0) {
            // Look at the direction vector
            const targetPosition = position.add(direction);
            const upVector = new Vector3(0, 1, 0);

            // Ensure direction and up aren't parallel
            const dot = Vector3.Dot(direction.normalize(), upVector);
            const lookAt = Math.abs(dot) > 0.99
                ? position.add(new Vector3(direction.z, 0, -direction.x)) // Alternative look target
                : targetPosition;

            this.mesh.lookAt(lookAt, 0, 0, 0);

            // Rotate disc to face direction
            this.mesh.rotate(new Vector3(1, 0, 0), Math.PI / 2);
        }

        // Calculate velocity
        const normalizedDirection = direction.normalize();
        this.velocity = normalizedDirection.scale(this.options.speed);

        // Add initial velocity if inheriting
        if (initialVelocity.length() > 0) {
            this.velocity.addInPlace(initialVelocity);
        }

        // If using physics, create impostor
        if (this.scene.getPhysicsEngine()) {
            try {
                this.impostor = new PhysicsImpostor(
                    this.mesh,
                    PhysicsImpostor.SphereImpostor,
                    {
                        mass: DefaultMaterials.PROJECTILE.mass,
                        friction: DefaultMaterials.PROJECTILE.friction,
                        restitution: DefaultMaterials.PROJECTILE.restitution
                    },
                    this.scene
                );

                // Set initial velocity
                this.impostor.setLinearVelocity(this.velocity);
            } catch (error) {
                this.logger.error('Failed to create physics impostor', error);
            }
        }

        // Create visual effects
        this.createVisualEffects();

        // Activate and set lifetime
        this.active = true;
        this.lifeRemaining = this.options.lifetime;

        this.logger.debug(`Fired: pos=${position.toString()}, vel=${this.velocity.toString()}`);
    }

    /**
     * Update projectile state
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        if (!this.active || !this.mesh) {
            return;
        }

        // Update lifetime
        this.lifeRemaining -= deltaTime;
        if (this.lifeRemaining <= 0) {
            this.deactivate();
            return;
        }

        // Update position from physics if available
        if (this.impostor) {
            const physicsPosition = this.impostor.getObjectCenter();
            this.position.copyFrom(physicsPosition);

            // Update velocity from physics
            const linearVelocity = this.impostor.getLinearVelocity();
            if (linearVelocity) {
                this.velocity.copyFrom(linearVelocity);
            }
        } else {
            // Manually update position using velocity
            const positionDelta = this.velocity.scale(deltaTime);
            this.position.addInPlace(positionDelta);

            // Apply gravity if specified
            if (this.options.gravityMultiplier && this.options.gravityMultiplier > 0) {
                const gravity = this.scene.gravity || new Vector3(0, -9.81, 0);
                const gravityEffect = gravity.scale(this.options.gravityMultiplier * deltaTime);
                this.velocity.addInPlace(gravityEffect);
            }

            // Update mesh position
            if (this.mesh) {
                this.mesh.position.copyFrom(this.position);
            }
        }

        // Update light position if exists
        if (this.light) {
            this.light.position.copyFrom(this.position);
        }

        // Check for collisions
        this.checkCollisions();
    }

    /**
     * Check for collisions with the environment and entities
     */
    private checkCollisions(): void {
        // Skip if using physics impostor (it will handle collisions)
        if (this.impostor) {
            return;
        }

        // Calculate distance moved since last check
        const distanceMoved = Vector3.Distance(this.position, this.lastPosition);

        // Only check periodically based on distance moved
        if (distanceMoved < this.collisionCheckDistance && this.collisionChecked) {
            return;
        }

        this.collisionChecked = true;

        // Store current position for next check
        this.lastPosition.copyFrom(this.position);

        // Create ray from last position to current position
        const direction = this.position.subtract(this.lastPosition);
        const length = direction.length();

        if (length < 0.001) {
            return; // No movement
        }

        const rayDirection = direction.normalize();

        // Cast ray for environment collision
        const ray = this.scene.createPickingRay(
            this.lastPosition.x,
            this.lastPosition.y,
            this.lastPosition.z,
            rayDirection.x,
            rayDirection.y,
            rayDirection.z,
            undefined,
            false
        );

        const hit = this.scene.pickWithRay(ray, mesh => {
            // Skip collision with owner and this projectile
            if (mesh === this.mesh) return false;

            if (this.ownerEntity && this.ownerEntity.getMesh &&
                mesh === this.ownerEntity.getMesh()) {
                return false;
            }

            return true;
        });

        if (hit && hit.hit && hit.distance <= length) {
            // We hit something!
            this.onCollision({
                hit: true,
                position: hit.pickedPoint,
                normal: hit.getNormal(true),
                distance: hit.distance,
                object: hit.pickedMesh
            });
        }
    }

    /**
     * Handle collision with an object
     * @param hit Raycast hit information
     */
    private onCollision(hit: RaycastHit): void {
        if (!hit.hit || !hit.position) {
            return;
        }

        // Create explosion if radius > 0
        if (this.options.explosionRadius && this.options.explosionRadius > 0) {
            this.createExplosion(hit.position);
        }

        // Apply impact force if specified
        if (hit.object && this.options.impactForce && this.options.impactForce > 0) {
            this.applyImpactForce(hit.object, hit.position);
        }

        // Apply damage to hit object if it has health
        if (hit.object && hit.object.parent && hit.object.parent.getHealth) {
            hit.object.parent.getHealth().applyDamage(this.options.damage, {
                source: this.ownerEntity,
                position: hit.position,
                normal: hit.normal
            });
        }

        // Emit hit event
        this.events.emit(GameEvent.PROJECTILE_HIT, {
            projectile: this,
            position: hit.position,
            normal: hit.normal,
            object: hit.object,
            owner: this.ownerEntity,
            damage: this.options.damage
        });

        // Deactivate the projectile
        this.deactivate();
    }

    /**
     * Create explosion effect at the impact point
     * @param position Position to create explosion
     */
    private createExplosion(position: Vector3): void {
        // Create explosion particle system
        const explosion = new ParticleSystem(`explosion_${this.id}`, 200, this.scene);
        explosion.particleTexture = new Texture("/textures/explosion.png", this.scene);

        // Set emitter position
        explosion.emitter = position;
        explosion.minEmitBox = new Vector3(0, 0, 0);
        explosion.maxEmitBox = new Vector3(0, 0, 0);

        // Configure particles
        explosion.color1 = new Color4(1, 0.5, 0.2, 1.0);
        explosion.color2 = new Color4(0.7, 0.3, 0.1, 1.0);
        explosion.colorDead = new Color4(0.2, 0.2, 0.2, 0.0);

        explosion.minSize = 0.5;
        explosion.maxSize = 3.0 * (this.options.explosionRadius / 5);

        explosion.minLifeTime = 0.2;
        explosion.maxLifeTime = 0.8;

        explosion.emitRate = 300;
        explosion.blendMode = ParticleSystem.BLENDMODE_ADD;

        explosion.direction1 = new Vector3(-1, 1, -1);
        explosion.direction2 = new Vector3(1, 1, 1);

        explosion.minEmitPower = 1;
        explosion.maxEmitPower = 3 * (this.options.explosionRadius / 5);

        explosion.updateSpeed = 0.01;

        // Create a one-shot effect
        explosion.targetStopDuration = 0.2;
        explosion.disposeOnStop = true;

        // Start the explosion
        explosion.start();

        // Play explosion sound
        this.events.emit(GameEvent.AUDIO_PLAY, {
            sound: 'explosion',
            position: position,
            volume: Math.min(1.0, this.options.explosionRadius / 5)
        });

        // Create temporary light for the explosion
        const light = new PointLight(
            `explosion_light_${this.id}`,
            position.clone(),
            this.scene
        );
        light.intensity = 5 * (this.options.explosionRadius / 5);
        light.diffuse = new Color3(1, 0.7, 0.3);
        light.specular = new Color3(1, 0.7, 0.3);
        light.range = this.options.explosionRadius * 2;

        // Fade out and dispose the light
        this.scene.beginAnimation(light, 0, 30, false, 1, () => {
            light.dispose();
        });
    }

    /**
     * Apply impact force to hit object
     * @param object Object that was hit
     * @param position Impact position
     */
    private applyImpactForce(object: any, position: Vector3): void {
        // If the object has a physics impostor
        if (object.physicsImpostor) {
            // Calculate impulse direction (from impact to object center)
            let impulseDir: Vector3;
            if (object.getAbsolutePosition) {
                impulseDir = object.getAbsolutePosition().subtract(position).normalize();
            } else {
                impulseDir = this.velocity.scale(-1).normalize();
            }

            // Scale by impact force
            const impulse = impulseDir.scale(this.options.impactForce || 10);

            // Apply the impulse
            object.physicsImpostor.applyImpulse(impulse, position);
        }
        // If the object has a movement component
        else if (object.parent && object.parent.getMovement) {
            const movement = object.parent.getMovement();

            // Calculate impulse direction
            let impulseDir: Vector3;
            if (object.getAbsolutePosition) {
                impulseDir = object.getAbsolutePosition().subtract(position).normalize();
            } else {
                impulseDir = this.velocity.scale(-1).normalize();
            }

            // Scale by impact force
            const impulse = impulseDir.scale(this.options.impactForce || 10);

            // Apply the impulse
            movement.applyImpulse(impulse, position);
        }
    }

    /**
     * Apply a force to the projectile
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
     * Apply an impulse to the projectile
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
     * Deactivate the projectile
     */
    public deactivate(): void {
        if (!this.active) return;

        this.active = false;

        // Hide mesh
        if (this.mesh) {
            this.mesh.isVisible = false;
        }

        // Stop particle system
        if (this.particleSystem) {
            this.particleSystem.stop();
        }

        // Dispose trail
        if (this.trailMesh) {
            this.trailMesh.dispose();
            this.trailMesh = undefined;
        }

        // Dispose light
        if (this.light) {
            this.light.dispose();
            this.light = undefined;
        }

        // Remove physics impostor
        if (this.impostor) {
            this.impostor.dispose();
            this.impostor = undefined;
        }

        this.logger.debug('Projectile deactivated');
    }

    /**
     * Check if the projectile is active
     */
    public isActive(): boolean {
        return this.active;
    }

    /**
     * Get projectile owner
     */
    public getOwner(): any {
        return this.ownerEntity;
    }

    /**
     * Get projectile damage
     */
    public getDamage(): number {
        return this.options.damage;
    }

    /**
     * Get projectile position
     */
    public getPosition(): Vector3 {
        return this.position.clone();
    }

    /**
     * Get projectile velocity
     */
    public getVelocity(): Vector3 {
        return this.velocity.clone();
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.deactivate();

        // Dispose mesh
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = undefined;
        }

        // Dispose particle system
        if (this.particleSystem) {
            this.particleSystem.dispose();
            this.particleSystem = undefined;
        }

        this.logger.debug('Projectile disposed');
    }
}