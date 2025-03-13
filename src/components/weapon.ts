import { Scene, Vector3, Mesh, MeshBuilder, Material, StandardMaterial, Color3, TransformNode, Animation } from '@babylonjs/core';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { IWeaponComponent } from '../types/components';
import { Projectile, ProjectileOptions } from '../entities/projectile';

/**
 * Weapon configuration options
 */
export interface WeaponOptions {
    /**
     * Weapon name
     */
    name: string;

    /**
     * Maximum ammo capacity
     */
    maxAmmo: number;

    /**
     * Starting ammo
     */
    startAmmo?: number;

    /**
     * Shots per second
     */
    fireRate: number;

    /**
     * Projectile speed
     */
    projectileSpeed: number;

    /**
     * Projectile damage
     */
    damage: number;

    /**
     * Projectile lifetime in seconds
     */
    projectileLifetime: number;

    /**
     * Whether the weapon inherits shooter's velocity
     */
    inheritVelocity: boolean;

    /**
     * Force applied to shooter on firing (disk jumping)
     */
    recoilForce: number;

    /**
     * Cooldown between shots in seconds
     */
    cooldown?: number;

    /**
     * Reload time in seconds
     */
    reloadTime: number;

    /**
     * Projectile mesh scale
     */
    projectileScale: number;

    /**
     * Sound effect for firing
     */
    fireSound?: string;

    /**
     * Sound effect for reloading
     */
    reloadSound?: string;

    /**
     * Sound effect for empty weapon
     */
    emptySound?: string;

    /**
     * Custom projectile mesh name
     */
    projectileMesh?: string;

    /**
     * Custom projectile material
     */
    projectileMaterial?: Material;

    /**
     * Whether the weapon is automatic (holds fire)
     */
    automatic: boolean;
}

/**
 * Default weapon options
 */
const DefaultWeaponOptions: WeaponOptions = {
    name: 'Spinfusor',
    maxAmmo: 20,
    fireRate: 1.0,
    projectileSpeed: 40,
    damage: 100,
    projectileLifetime: 5,
    inheritVelocity: true,
    recoilForce: 10,
    reloadTime: 2,
    projectileScale: 0.5,
    automatic: false
};

/**
 * Weapon component for entities
 * Handles firing projectiles and ammunition management
 */
export class WeaponComponent implements IWeaponComponent {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private entity: any;
    private options: WeaponOptions;

    // Weapon state
    private ammo: number;
    private cooldownRemaining: number = 0;
    private reloadTimeRemaining: number = 0;
    private lastFireTime: number = 0;
    private isFiring: boolean = false;
    private isReloading: boolean = false;

    // Visuals
    private weaponMesh?: Mesh;
    private muzzleNode?: TransformNode;
    private weaponNode?: TransformNode;

    // Projectile pool
    private projectiles: Projectile[] = [];

    /**
     * Initialize a weapon component
     * @param entity The entity this weapon belongs to
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param options Weapon options
     */
    constructor(entity: any, scene: Scene, events: IEventEmitter, options: Partial<WeaponOptions> = {}) {
        this.logger = new Logger(`WeaponComponent:${entity.id || 'unknown'}`);
        this.scene = scene;
        this.events = events;
        this.entity = entity;
        this.options = { ...DefaultWeaponOptions, ...options };

        // Initialize ammo
        this.ammo = this.options.startAmmo !== undefined ? this.options.startAmmo : this.options.maxAmmo;

        // Set up event listeners
        this.setupEventListeners();

        this.logger.info(`Initialized ${this.options.name} weapon component`);
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Listen for input events if this is the player's weapon
        if (this.entity.getId && this.entity.getId() === 'player1') {
            this.events.on(GameEvent.MOUSE_DOWN, (data) => {
                if (data.button === 0) { // Left mouse button
                    this.startFiring();
                }
            });

            this.events.on(GameEvent.MOUSE_UP, (data) => {
                if (data.button === 0) { // Left mouse button
                    this.stopFiring();
                }
            });

            this.events.on(GameEvent.KEY_DOWN, (data) => {
                if (data.key.toLowerCase() === 'r') {
                    this.reload();
                }
            });
        }
    }

    /**
     * Update weapon state
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Update cooldown
        if (this.cooldownRemaining > 0) {
            this.cooldownRemaining -= deltaTime;
        }

        // Update reload timer
        if (this.isReloading) {
            this.reloadTimeRemaining -= deltaTime;

            if (this.reloadTimeRemaining <= 0) {
                this.completeReload();
            }
        }

        // Handle automatic firing
        if (this.isFiring && this.options.automatic && this.isReady()) {
            this.fire();
        }

        // Update projectiles
        for (const projectile of this.projectiles) {
            if (projectile.isActive()) {
                projectile.update(deltaTime);
            }
        }

        // Update weapon position and rotation based on entity
        this.updateWeaponTransform();
    }

    /**
     * Update weapon mesh position and rotation
     */
    private updateWeaponTransform(): void {
        if (!this.weaponNode) return;

        // If entity has a camera component, attach to camera
        if (this.entity.getFirstPersonNode) {
            const fpNode = this.entity.getFirstPersonNode();
            this.weaponNode.parent = fpNode;

            // Position slightly in front and to the right of camera
            this.weaponNode.position = new Vector3(0.5, -0.3, 1);
        }
        // Otherwise, just update position to entity position
        else if (this.entity.getPosition) {
            this.weaponNode.position = this.entity.getPosition().add(new Vector3(0, 1, 0));
        }
    }

    /**
     * Create the weapon mesh
     */
    public createWeaponMesh(): void {
        // Create weapon container node
        this.weaponNode = new TransformNode(`weapon_${this.entity.id || 'unknown'}_node`, this.scene);

        // Create muzzle node for projectile spawning
        this.muzzleNode = new TransformNode(`weapon_${this.entity.id || 'unknown'}_muzzle`, this.scene);
        this.muzzleNode.parent = this.weaponNode;
        this.muzzleNode.position = new Vector3(0, 0, 1); // Front of the weapon

        // Create a simple weapon mesh
        this.weaponMesh = MeshBuilder.CreateBox(
            `weapon_${this.entity.id || 'unknown'}_mesh`,
            { width: 0.2, height: 0.2, depth: 1 },
            this.scene
        );
        this.weaponMesh.parent = this.weaponNode;
        this.weaponMesh.position = new Vector3(0, 0, 0.5); // Center the mesh on the node

        // Create material
        const material = new StandardMaterial(`weapon_${this.entity.id || 'unknown'}_material`, this.scene);
        material.diffuseColor = new Color3(0.2, 0.2, 0.8);
        material.specularColor = new Color3(0.3, 0.3, 0.6);
        material.emissiveColor = new Color3(0, 0, 0.3);
        this.weaponMesh.material = material;

        // If this is player's weapon, hide it in first person
        if (this.entity.getId && this.entity.getId() === 'player1') {
            // We'd normally set up first-person view settings here
            // For now, just make it partially transparent
            material.alpha = 0.7;
        }

        this.logger.debug('Created weapon mesh');
    }

    /**
     * Start firing the weapon
     */
    public startFiring(): void {
        this.isFiring = true;

        if (this.isReady()) {
            this.fire();
        }
    }

    /**
     * Stop firing the weapon
     */
    public stopFiring(): void {
        this.isFiring = false;
    }

    /**
     * Fire a projectile
     * @param direction Optional direction to fire in, defaults to weapon forward
     * @param velocity Optional initial velocity, defaults to entity velocity
     */
    public fire(direction?: Vector3, velocity?: Vector3): boolean {
        // Check if weapon can fire
        if (!this.isReady()) {
            if (this.ammo <= 0) {
                this.events.emit(GameEvent.AUDIO_PLAY, { sound: this.options.emptySound || 'weaponEmpty' });
            }
            return false;
        }

        try {
            // Get firing direction
            if (!direction) {
                if (this.entity.getCamera && this.muzzleNode) {
                    // Use camera direction for player
                    const camera = this.entity.getCamera().getCamera();
                    direction = camera.getForwardRay().direction;
                } else if (this.muzzleNode) {
                    // Use muzzle forward direction
                    const worldMatrix = this.muzzleNode.getWorldMatrix();
                    direction = new Vector3(worldMatrix.m[8], worldMatrix.m[9], worldMatrix.m[10]).normalize();
                } else {
                    // Default to forward
                    direction = new Vector3(0, 0, 1);
                }
            }

            // Get initial velocity from entity if inheritance is enabled
            let initialVelocity = new Vector3(0, 0, 0);
            if (this.options.inheritVelocity && !velocity) {
                if (this.entity.getMovement) {
                    initialVelocity = this.entity.getMovement().getVelocity().clone();
                }
            } else if (velocity) {
                initialVelocity = velocity.clone();
            }

            // Get spawn position
            let spawnPosition: Vector3;
            if (this.muzzleNode) {
                spawnPosition = this.muzzleNode.getAbsolutePosition();
            } else if (this.entity.getPosition) {
                // Spawn in front of entity
                spawnPosition = this.entity.getPosition().add(new Vector3(0, 1, 0));
                spawnPosition.addInPlace(direction.scale(1));
            } else {
                spawnPosition = new Vector3(0, 0, 0);
            }

            // Create projectile options
            const projectileOptions: ProjectileOptions = {
                owner: this.entity,
                lifetime: this.options.projectileLifetime,
                speed: this.options.projectileSpeed,
                damage: this.options.damage,
                scale: this.options.projectileScale,
                material: this.options.projectileMaterial
            };

            // Find an inactive projectile to reuse or create a new one
            let projectile = this.projectiles.find(p => !p.isActive());
            if (!projectile) {
                projectile = new Projectile(this.scene, this.events, projectileOptions);
                this.projectiles.push(projectile);
            }

            // Set up and fire the projectile
            projectile.fire(spawnPosition, direction, initialVelocity);

            // Apply recoil to owner if it's a player with a movement component
            if (this.options.recoilForce > 0 && this.entity.getMovement) {
                const recoilDirection = direction.scale(-1); // Opposite of firing direction
                const recoilImpulse = recoilDirection.scale(this.options.recoilForce);
                this.entity.getMovement().applyImpulse(recoilImpulse);
            }

            // Reduce ammo
            this.ammo--;

            // Start cooldown
            this.cooldownRemaining = this.options.cooldown || (1 / this.options.fireRate);
            this.lastFireTime = this.scene.getEngine().getTimeStep();

            // Play sound
            this.events.emit(GameEvent.AUDIO_PLAY, { sound: this.options.fireSound || 'weaponFire' });

            // Emit event
            this.events.emit(GameEvent.WEAPON_FIRE, {
                entity: this.entity,
                weapon: this,
                projectile: projectile
            });

            // Start reload if out of ammo
            if (this.ammo <= 0) {
                this.reload();
            }

            this.logger.debug(`Fired projectile: ammo=${this.ammo}, cooldown=${this.cooldownRemaining.toFixed(2)}s`);
            return true;
        } catch (error) {
            this.logger.error('Error firing weapon', error);
            return false;
        }
    }

    /**
     * Start reloading the weapon
     */
    public reload(): void {
        if (this.isReloading || this.ammo >= this.options.maxAmmo) {
            return;
        }

        this.isReloading = true;
        this.reloadTimeRemaining = this.options.reloadTime;

        // Play reload sound
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: this.options.reloadSound || 'weaponReload' });

        // Emit reload event
        this.events.emit(GameEvent.WEAPON_RELOAD, {
            entity: this.entity,
            weapon: this
        });

        this.logger.debug(`Started reloading: time=${this.options.reloadTime.toFixed(2)}s`);
    }

    /**
     * Complete the reload process
     */
    private completeReload(): void {
        this.ammo = this.options.maxAmmo;
        this.isReloading = false;
        this.reloadTimeRemaining = 0;

        // Emit reload complete event
        this.events.emit(GameEvent.WEAPON_RELOAD, {
            entity: this.entity,
            weapon: this,
            complete: true
        });

        this.logger.debug(`Reload complete: ammo=${this.ammo}`);
    }

    /**
     * Check if the weapon is ready to fire
     */
    public isReady(): boolean {
        return this.ammo > 0 && !this.isReloading && this.cooldownRemaining <= 0;
    }

    /**
     * Get current ammo count
     */
    public getAmmo(): number {
        return this.ammo;
    }

    /**
     * Get maximum ammo capacity
     */
    public getMaxAmmo(): number {
        return this.options.maxAmmo;
    }

    /**
     * Get weapon name
     */
    public getName(): string {
        return this.options.name;
    }

    /**
     * Check if weapon is currently reloading
     */
    public isReloading(): boolean {
        return this.isReloading;
    }

    /**
     * Get reload progress as percentage (0-1)
     */
    public getReloadProgress(): number {
        if (!this.isReloading) return 1;
        return 1 - (this.reloadTimeRemaining / this.options.reloadTime);
    }

    /**
     * Get cooldown progress as percentage (0-1)
     */
    public getCooldownProgress(): number {
        const cooldownTime = this.options.cooldown || (1 / this.options.fireRate);
        return 1 - (this.cooldownRemaining / cooldownTime);
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Remove event listeners
        this.events.off(GameEvent.MOUSE_DOWN, this.startFiring);
        this.events.off(GameEvent.MOUSE_UP, this.stopFiring);
        this.events.off(GameEvent.KEY_DOWN, this.reload);

        // Dispose meshes
        if (this.weaponMesh) {
            this.weaponMesh.dispose();
        }

        if (this.weaponNode) {
            this.weaponNode.dispose();
        }

        if (this.muzzleNode) {
            this.muzzleNode.dispose();
        }

        // Dispose projectiles
        for (const projectile of this.projectiles) {
            projectile.dispose();
        }
        this.projectiles = [];

        this.logger.debug('Weapon component disposed');
    }
}