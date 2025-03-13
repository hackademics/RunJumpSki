import { Vector3, Mesh, TransformNode, Camera, Scene } from '@babylonjs/core';
import { TerrainGenerator } from '../terrain/generator';
import { MovementComponent } from '../components/movement';
import { JetpackComponent } from '../components/jetpack';
import { CollisionComponent } from '../components/collision';
import { CameraComponent } from '../components/camera';
import { IEventEmitter } from './events';

/**
 * Base entity interface
 */
export interface IEntity {
    /**
     * Unique identifier for the entity
     */
    id: string;

    /**
     * Get entity position
     */
    getPosition(): Vector3;

    /**
     * Set entity position
     */
    setPosition(position: Vector3): void;

    /**
     * Update entity state
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;

    /**
     * Clean up entity resources
     */
    dispose(): void;
}

/**
 * Player entity interface
 */
export interface IPlayer extends IEntity {
    /**
     * Get player mesh
     */
    getMesh(): Mesh;

    /**
     * Get player root node
     */
    getRootNode(): TransformNode;

    /**
     * Get player first-person node
     */
    getFirstPersonNode(): TransformNode;

    /**
     * Get player movement component
     */
    getMovement(): MovementComponent;

    /**
     * Get player camera component
     */
    getCamera(): CameraComponent;

    /**
     * Initialize player camera
     */
    initCamera(): void;

    /**
     * Set terrain reference
     */
    setTerrain(terrain: TerrainGenerator): void;
}

/**
 * Projectile entity interface
 */
export interface IProjectile extends IEntity {
    /**
     * Get projectile mesh
     */
    getMesh(): Mesh;

    /**
     * Get projectile velocity
     */
    getVelocity(): Vector3;

    /**
     * Set projectile velocity
     */
    setVelocity(velocity: Vector3): void;

    /**
     * Get projectile owner
     */
    getOwner(): IEntity | null;

    /**
     * Get projectile damage amount
     */
    getDamage(): number;

    /**
     * Get projectile explosion radius
     */
    getExplosionRadius(): number;

    /**
     * Apply explosion force
     */
    explode(): void;

    /**
     * Check if projectile has exploded
     */
    hasExploded(): boolean;
}

/**
 * Target entity interface
 */
export interface ITarget extends IEntity {
    /**
     * Get target mesh
     */
    getMesh(): Mesh;

    /**
     * Get target health
     */
    getHealth(): number;

    /**
     * Apply damage to target
     * @param damage Damage amount
     * @param source Source of the damage
     */
    applyDamage(damage: number, source?: IEntity): void;

    /**
     * Check if target is destroyed
     */
    isDestroyed(): boolean;

    /**
     * Get target point value
     */
    getPointValue(): number;
}

/**
 * Turret entity interface
 */
export interface ITurret extends IEntity {
    /**
     * Get turret mesh
     */
    getMesh(): Mesh;

    /**
     * Get turret health
     */
    getHealth(): number;

    /**
     * Apply damage to turret
     * @param damage Damage amount
     * @param source Source of the damage
     */
    applyDamage(damage: number, source?: IEntity): void;

    /**
     * Check if turret is destroyed
     */
    isDestroyed(): boolean;

    /**
     * Set turret target
     * @param target Target entity
     */
    setTarget(target: IEntity | null): void;

    /**
     * Get current target
     */
    getTarget(): IEntity | null;

    /**
     * Get detection range
     */
    getDetectionRange(): number;

    /**
     * Get firing range
     */
    getFiringRange(): number;
}

/**
 * Base entity factory interface
 */
export interface IEntityFactory {
    /**
     * Create an entity
     * @param type Entity type
     * @param options Creation options
     */
    create(type: string, options: any): IEntity;
}

/**
 * Options for entity creation
 */
export interface EntityOptions {
    /**
     * Entity position
     */
    position?: Vector3;

    /**
     * Entity scale
     */
    scale?: Vector3;

    /**
     * Entity rotation (euler angles in radians)
     */
    rotation?: Vector3;

    /**
     * Additional entity-specific options
     */
    [key: string]: any;
}

/**
 * Player entity options
 */
export interface PlayerOptions extends EntityOptions {
    /**
     * Player height
     */
    height?: number;

    /**
     * Player radius
     */
    radius?: number;

    /**
     * Maximum energy level
     */
    maxEnergy?: number;

    /**
     * Maximum speed
     */
    maxSpeed?: number;

    /**
     * Run speed
     */
    runSpeed?: number;

    /**
     * Jump force
     */
    jumpForce?: number;

    /**
     * Jetpack force
     */
    jetpackForce?: number;
}

/**
 * Projectile entity options
 */
export interface ProjectileOptions extends EntityOptions {
    /**
     * Projectile speed
     */
    speed?: number;

    /**
     * Projectile lifetime in seconds
     */
    lifetime?: number;

    /**
     * Projectile damage
     */
    damage?: number;

    /**
     * Projectile explosion radius
     */
    explosionRadius?: number;

    /**
     * Projectile owner
     */
    owner?: IEntity;

    /**
     * Explosion force multiplier
     */
    explosionForce?: number;

    /**
     * Initial velocity
     */
    initialVelocity?: Vector3;
}

/**
 * Target entity options
 */
export interface TargetOptions extends EntityOptions {
    /**
     * Target health
     */
    health?: number;

    /**
     * Target point value
     */
    pointValue?: number;

    /**
     * Target size
     */
    size?: number;

    /**
     * Whether target moves
     */
    moving?: boolean;

    /**
     * Movement pattern
     */
    movementPattern?: string;

    /**
     * Movement speed
     */
    movementSpeed?: number;
}

/**
 * Turret entity options
 */
export interface TurretOptions extends EntityOptions {
    /**
     * Turret health
     */
    health?: number;

    /**
     * Detection range
     */
    detectionRange?: number;

    /**
     * Firing range
     */
    firingRange?: number;

    /**
     * Firing rate (shots per second)
     */
    firingRate?: number;

    /**
     * Projectile damage
     */
    projectileDamage?: number;

    /**
     * Rotation speed (radians per second)
     */
    rotationSpeed?: number;
}

/**
 * Entity factory for creating game entities
 */
export class EntityFactory implements IEntityFactory {
    private scene: Scene;
    private events: IEventEmitter;
    private nextId: number = 0;

    /**
     * Create a new entity factory
     * @param scene Babylon.js scene
     * @param events Event emitter
     */
    constructor(scene: Scene, events: IEventEmitter) {
        this.scene = scene;
        this.events = events;
    }

    /**
     * Generate a unique entity ID
     * @param prefix Optional prefix for the ID
     */
    public generateId(prefix: string = 'entity'): string {
        return `${prefix}_${this.nextId++}`;
    }

    /**
     * Create an entity
     * @param type Entity type
     * @param options Creation options
     */
    public create(type: string, options: any): IEntity {
        switch (type.toLowerCase()) {
            case 'player':
                return this.createPlayer(options);
            case 'projectile':
                return this.createProjectile(options);
            case 'target':
                return this.createTarget(options);
            case 'turret':
                return this.createTurret(options);
            default:
                throw new Error(`Unknown entity type: ${type}`);
        }
    }

    /**
     * Create a player entity
     * @param options Player options
     */
    private createPlayer(options: PlayerOptions): IPlayer {
        // This is a placeholder - the actual implementation would be in the Player class
        throw new Error('Player creation not implemented in entity factory');
    }

    /**
     * Create a projectile entity
     * @param options Projectile options
     */
    private createProjectile(options: ProjectileOptions): IProjectile {
        // This is a placeholder - the actual implementation would be in the Projectile class
        throw new Error('Projectile creation not implemented in entity factory');
    }

    /**
     * Create a target entity
     * @param options Target options
     */
    private createTarget(options: TargetOptions): ITarget {
        // This is a placeholder - the actual implementation would be in the Target class
        throw new Error('Target creation not implemented in entity factory');
    }

    /**
     * Create a turret entity
     * @param options Turret options
     */
    private createTurret(options: TurretOptions): ITurret {
        // This is a placeholder - the actual implementation would be in the Turret class
        throw new Error('Turret creation not implemented in entity factory');
    }
}
