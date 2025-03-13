import {
    Scene,
    Vector3,
    Mesh,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Animation,
    ParticleSystem,
    Texture,
    Color4,
    TransformNode,
    PhysicsImpostor
} from '@babylonjs/core';
import { ITarget, TargetOptions } from '../types/entities';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { CollisionComponent } from '../components/collision';

/**
 * Default target options
 */
const DefaultTargetOptions: TargetOptions = {
    position: new Vector3(0, 0, 0),
    health: 100,
    pointValue: 100,
    size: 1.0,
    moving: false,
    movementPattern: 'circle',
    movementSpeed: 2.0
};

/**
 * Target entity that can be shot and destroyed
 */
export class Target implements ITarget {
    public id: string;
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private options: TargetOptions;

    // Meshes and nodes
    private rootNode: TransformNode;
    private mesh: Mesh;
    private outerRing?: Mesh;

    // Components
    private collision: CollisionComponent;

    // State
    private health: number;
    private destroyed: boolean = false;
    private timeAlive: number = 0;
    private animationTime: number = 0;

    // Movement
    private initialPosition: Vector3;
    private movementCenter: Vector3;
    private movementRadius: number = 5;
    private movementHeight: number = 2;

    // Effects
    private hitParticles?: ParticleSystem;
    private destroyParticles?: ParticleSystem;

    /**
     * Create a new target entity
     * @param id Unique identifier
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param options Target options
     */
    constructor(id: string, scene: Scene, events: IEventEmitter, options: Partial<TargetOptions> = {}) {
        this.id = id;
        this.logger = new Logger(`Target:${id}`);
        this.scene = scene;
        this.events = events;
        this.options = { ...DefaultTargetOptions, ...options };

        // Initialize state
        this.health = this.options.health!;
        this.initialPosition = this.options.position!.clone();
        this.movementCenter = this.initialPosition.clone();

        // Create meshes
        this.rootNode = new TransformNode(`target_${id}_root`, this.scene);
        this.rootNode.position = this.options.position!.clone();

        this.mesh = this.createTargetMesh();
        this.mesh.parent = this.rootNode;

        if (this.options.moving) {
            this.createOuterRing();
        }

        // Create components
        this.collision = new CollisionComponent(this, this.scene, this.events, {
            groundCheckDistance: 0,
            debug: false
        });
        this.collision.init(this.mesh);

        // Set up physics if needed
        this.setupPhysics();

        // Create effects
        this.createEffects();

        // Set up event handlers
        this.setupEventHandlers();

        this.logger.debug('Target created');
    }

    /**
     * Create the target mesh
     */
    private createTargetMesh(): Mesh {
        // Create a disk/cylinder mesh for the target
        const targetMesh = MeshBuilder.CreateCylinder(
            `target_${this.id}_mesh`,
            {
                height: 0.2,
                diameter: this.options.size! * 2,
                tessellation: 32
            },
            this.scene
        );

        // Create material with target appearance
        const material = new StandardMaterial(`target_${this.id}_material`, this.scene);
        material.diffuseColor = new Color3(1, 0.2, 0.2);
        material.emissiveColor = new Color3(0.5, 0.1, 0.1);
        material.specularColor = new Color3(1, 1, 1);

        targetMesh.material = material;

        // Create a pattern on the target (rings)
        this.createTargetPattern(targetMesh);

        return targetMesh;
    }

    /**
     * Create a pattern on the target surface
     * @param targetMesh The target mesh
     */
    private createTargetPattern(targetMesh: Mesh): void {
        // Create inner ring
        const innerRing = MeshBuilder.CreateTorus(
            `target_${this.id}_inner_ring`,
            {
                diameter: this.options.size! * 1.2,
                thickness: 0.1,
                tessellation: 32
            },
            this.scene
        );

        const innerMaterial = new StandardMaterial(`target_${this.id}_inner_material`, this.scene);
        innerMaterial.diffuseColor = new Color3(1, 1, 1);
        innerMaterial.emissiveColor = new Color3(0.2, 0.2, 0.2);
        innerRing.material = innerMaterial;

        // Position it just above the target
        innerRing.parent = targetMesh;
        innerRing.position.y = 0.05;
        innerRing.rotation.x = Math.PI / 2;

        // Create center point (bullseye)
        const bullseye = MeshBuilder.CreateCylinder(
            `target_${this.id}_bullseye`,
            {
                height: 0.25,
                diameter: this.options.size! * 0.4,
                tessellation: 32
            },
            this.scene
        );

        const bullseyeMaterial = new StandardMaterial(`target_${this.id}_bullseye_material`, this.scene);
        bullseyeMaterial.diffuseColor = new Color3(1, 0.9, 0.1);
        bullseyeMaterial.emissiveColor = new Color3(0.5, 0.45, 0.05);
        bullseye.material = bullseyeMaterial;

        // Position it just above the target
        bullseye.parent = targetMesh;
        bullseye.position.y = 0.15;
    }

    /**
     * Create outer ring for moving targets
     */
    private createOuterRing(): void {
        // Create a ring to show the movement path
        this.outerRing = MeshBuilder.CreateTorus(
            `target_${this.id}_outer_ring`,
            {
                diameter: this.movementRadius * 2,
                thickness: 0.1,
                tessellation: 64
            },
            this.scene
        );

        const ringMaterial = new StandardMaterial(`target_${this.id}_ring_material`, this.scene);
        ringMaterial.diffuseColor = new Color3(0.2, 0.2, 0.8);
        ringMaterial.emissiveColor = new Color3(0.1, 0.1, 0.4);
        ringMaterial.alpha = 0.5;
        this.outerRing.material = ringMaterial;

        // Position it at the center of the movement
        this.outerRing.position = this.movementCenter.clone();

        // Adjust rotation based on movement pattern
        if (this.options.movementPattern === 'circle') {
            this.outerRing.rotation.x = Math.PI / 2;
        } else if (this.options.movementPattern === 'vertical') {
            this.outerRing.rotation.z = Math.PI / 2;
        }
    }

    /**
     * Set up physics for the target
     */
    private setupPhysics(): void {
        // Add physics impostor
        this.mesh.physicsImpostor = new PhysicsImpostor(
            this.mesh,
            PhysicsImpostor.CylinderImpostor,
            { mass: 0, restitution: 0.5, friction: 0.5 },
            this.scene
        );

        // Set up collision detection
        if (this.mesh.physicsImpostor) {
            this.collision.createImpostor(this.mesh, this.scene);
        }
    }

    /**
     * Create particle effects for the target
     */
    private createEffects(): void {
        // Create hit particle system
        this.hitParticles = new ParticleSystem(`target_${this.id}_hit_particles`, 50, this.scene);
        this.hitParticles.particleTexture = new Texture("textures/flare.png", this.scene);
        this.hitParticles.emitter = this.mesh;
        this.hitParticles.minEmitBox = new Vector3(-0.5, 0, -0.5).scaleInPlace(this.options.size!);
        this.hitParticles.maxEmitBox = new Vector3(0.5, 0.5, 0.5).scaleInPlace(this.options.size!);
        this.hitParticles.color1 = new Color4(1, 0.5, 0, 1);
        this.hitParticles.color2 = new Color4(1, 0.2, 0, 1);
        this.hitParticles.colorDead = new Color4(0, 0, 0, 0);
        this.hitParticles.minSize = 0.1;
        this.hitParticles.maxSize = 0.3;
        this.hitParticles.minLifeTime = 0.2;
        this.hitParticles.maxLifeTime = 0.6;
        this.hitParticles.emitRate = 100;
        this.hitParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        this.hitParticles.gravity = new Vector3(0, 5, 0);
        this.hitParticles.direction1 = new Vector3(-1, 2, -1);
        this.hitParticles.direction2 = new Vector3(1, 2, 1);
        this.hitParticles.minEmitPower = 1;
        this.hitParticles.maxEmitPower = 3;

        // Create destruction particle system
        this.destroyParticles = new ParticleSystem(`target_${this.id}_destroy_particles`, 200, this.scene);
        this.destroyParticles.particleTexture = new Texture("textures/flare.png", this.scene);
        this.destroyParticles.emitter = this.mesh;
        this.destroyParticles.minEmitBox = new Vector3(-0.5, -0.1, -0.5).scaleInPlace(this.options.size!);
        this.destroyParticles.maxEmitBox = new Vector3(0.5, 0.1, 0.5).scaleInPlace(this.options.size!);
        this.destroyParticles.color1 = new Color4(1, 0.5, 0, 1);
        this.destroyParticles.color2 = new Color4(1, 0.2, 0, 1);
        this.destroyParticles.colorDead = new Color4(0.2, 0.2, 0.2, 0);
        this.destroyParticles.minSize = 0.1;
        this.destroyParticles.maxSize = 0.5;
        this.destroyParticles.minLifeTime = 0.5;
        this.destroyParticles.maxLifeTime = 2.0;
        this.destroyParticles.emitRate = 200;
        this.destroyParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        this.destroyParticles.gravity = new Vector3(0, -1, 0);
        this.destroyParticles.direction1 = new Vector3(-3, 5, -3);
        this.destroyParticles.direction2 = new Vector3(3, 8, 3);
        this.destroyParticles.minEmitPower = 2;
        this.destroyParticles.maxEmitPower = 6;
    }

    /**
     * Set up event handlers
     */
    private setupEventHandlers(): void {
        // Listen for collision events
        this.events.on(GameEvent.COLLISION_START, (data) => {
            if (data.collidedWith === this.mesh) {
                this.handleCollision(data);
            }
        });
    }

    /**
     * Handle collision events
     * @param data Collision data
     */
    private handleCollision(data: any): void {
        // Check if we were hit by a projectile
        if (data.entity && data.entity.isDiskProjectile) {
            const damage = data.entity.getDamage ? data.entity.getDamage() : 25;
            this.applyDamage(damage, data.entity);
        }
    }

    /**
     * Update target state
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Update timers
        this.timeAlive += deltaTime;
        this.animationTime += deltaTime;

        // Skip updates if destroyed
        if (this.destroyed) {
            return;
        }

        // Update movement if this is a moving target
        if (this.options.moving) {
            this.updateMovement(deltaTime);
        }

        // Update pulsing animation
        this.updatePulseAnimation();

        // Update collision component
        this.collision.update(deltaTime);
    }

    /**
     * Update target movement
     * @param deltaTime Time since last update
     */
    private updateMovement(deltaTime: number): void {
        const time = this.timeAlive * this.options.movementSpeed!;

        // Calculate new position based on movement pattern
        let newPosition = this.movementCenter.clone();

        if (this.options.movementPattern === 'circle') {
            // Circular movement in XZ plane
            newPosition.x += Math.sin(time) * this.movementRadius;
            newPosition.z += Math.cos(time) * this.movementRadius;
        } else if (this.options.movementPattern === 'vertical') {
            // Vertical movement in Y axis
            newPosition.y += Math.sin(time) * this.movementHeight;
        } else if (this.options.movementPattern === 'figure8') {
            // Figure 8 pattern
            newPosition.x += Math.sin(time) * this.movementRadius;
            newPosition.z += Math.sin(time * 2) * this.movementRadius / 2;
        } else if (this.options.movementPattern === 'random') {
            // Random movement (using noise)
            const noiseX = Math.sin(time * 0.7) * Math.cos(time * 0.4);
            const noiseZ = Math.sin(time * 0.5) * Math.cos(time * 0.3);
            newPosition.x += noiseX * this.movementRadius;
            newPosition.z += noiseZ * this.movementRadius;
        }

        // Update position
        this.rootNode.position = newPosition;
    }

    /**
     * Update pulsing animation for the target
     */
    private updatePulseAnimation(): void {
        // Make the target pulse slightly (scale up and down)
        const scale = 1 + Math.sin(this.animationTime * 2) * 0.05;
        this.mesh.scaling.y = scale;

        // Rotate the inner rings
        const children = this.mesh.getChildMeshes();
        for (const child of children) {
            if (child.name.includes('inner_ring')) {
                child.rotation.y += 0.01;
            } else if (child.name.includes('bullseye')) {
                child.rotation.y -= 0.02;
            }
        }
    }

    /**
     * Apply damage to the target
     * @param damage Amount of damage to apply
     * @param source Source of the damage
     */
    public applyDamage(damage: number, source?: any): void {
        if (this.destroyed) return;

        // Reduce health
        this.health -= damage;

        // Play hit effect
        this.playHitEffect();

        // Check if destroyed
        if (this.health <= 0) {
            this.destroy(source);
        }

        // Emit event
        this.events.emit(GameEvent.TARGET_HIT, {
            target: this,
            damage,
            source,
            healthRemaining: this.health,
            destroyed: this.destroyed
        });
    }

    /**
     * Play hit effect
     */
    private playHitEffect(): void {
        // Flash the material
        const material = this.mesh.material as StandardMaterial;
        if (material) {
            const originalEmissive = material.emissiveColor.clone();
            material.emissiveColor = new Color3(1, 1, 1);

            // Reset after a short time
            setTimeout(() => {
                if (material) {
                    material.emissiveColor = originalEmissive;
                }
            }, 100);
        }

        // Play hit particles
        if (this.hitParticles) {
            this.hitParticles.start();

            // Stop after a short time
            setTimeout(() => {
                if (this.hitParticles) {
                    this.hitParticles.stop();
                }
            }, 200);
        }

        // Play sound
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'targetHit' });
    }

    /**
     * Destroy the target
     * @param source Source of the destruction
     */
    private destroy(source?: any): void {
        if (this.destroyed) return;

        this.destroyed = true;

        // Play destruction effect
        if (this.destroyParticles) {
            this.destroyParticles.start();

            // Stop after effect is done
            setTimeout(() => {
                if (this.destroyParticles) {
                    this.destroyParticles.stop();
                }
            }, 2000);
        }

        // Play sound
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'targetDestroy' });

        // Hide the mesh but keep particles visible
        this.mesh.visibility = 0;
        if (this.outerRing) {
            this.outerRing.visibility = 0;
        }

        // Disable physics
        if (this.mesh.physicsImpostor) {
            this.mesh.physicsImpostor.dispose();
        }

        // Emit destruction event
        this.events.emit(GameEvent.TARGET_DESTROYED, {
            target: this,
            source,
            pointValue: this.options.pointValue
        });

        // Remove from scene after particles finish
        setTimeout(() => {
            this.dispose();
        }, 5000);
    }

    /**
     * Get target position
     */
    public getPosition(): Vector3 {
        return this.rootNode.position.clone();
    }

    /**
     * Set target position
     * @param position New position
     */
    public setPosition(position: Vector3): void {
        this.rootNode.position = position.clone();

        // Update movement center if this is a moving target
        if (this.options.moving) {
            this.movementCenter = position.clone();
            if (this.outerRing) {
                this.outerRing.position = this.movementCenter.clone();
            }
        }
    }

    /**
     * Get target mesh
     */
    public getMesh(): Mesh {
        return this.mesh;
    }

    /**
     * Get target health
     */
    public getHealth(): number {
        return this.health;
    }

    /**
     * Check if target is destroyed
     */
    public isDestroyed(): boolean {
        return this.destroyed;
    }

    /**
     * Get target point value
     */
    public getPointValue(): number {
        return this.options.pointValue!;
    }

    /**
     * Set target movement pattern
     * @param pattern Movement pattern
     * @param radius Movement radius
     */
    public setMovementPattern(pattern: string, radius?: number): void {
        this.options.movementPattern = pattern;
        if (radius !== undefined) {
            this.movementRadius = radius;
        }

        // Update outer ring if it exists
        if (this.outerRing) {
            this.outerRing.dispose();
            this.createOuterRing();
        }
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Dispose meshes
        if (!this.mesh.isDisposed()) {
            this.mesh.dispose(true, true);
        }

        if (this.outerRing && !this.outerRing.isDisposed()) {
            this.outerRing.dispose();
        }

        // Dispose particle systems
        if (this.hitParticles) {
            this.hitParticles.dispose();
        }

        if (this.destroyParticles) {
            this.destroyParticles.dispose();
        }

        // Dispose root node
        this.rootNode.dispose();

        this.logger.debug('Target disposed');
    }
}
