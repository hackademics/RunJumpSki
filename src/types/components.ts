 
import { Vector3, Camera, PhysicsImpostor, Scene, Mesh } from '@babylonjs/core';
import { SurfaceType } from './physics';

/**
 * Available movement states
 */
export type MovementState = 'running' | 'skiing' | 'flying' | 'jetpacking';

/**
 * Terrain data for physics interactions
 */
export interface TerrainData {
    /**
     * Position on the terrain
     */
    position: Vector3;

    /**
     * Surface normal at the contact point
     */
    normal: Vector3;

    /**
     * Type of terrain surface
     */
    surfaceType: SurfaceType;

    /**
     * Friction coefficient of the surface
     */
    friction: number;

    /**
     * Height of the terrain at the position
     */
    height: number;
}

/**
 * Movement component interface
 */
export interface IMovementComponent {
    /**
     * Update movement
     * @param deltaTime Time since last update in seconds
     * @param terrainData Optional terrain data for skiing mechanics
     */
    update(deltaTime: number, terrainData?: TerrainData): void;

    /**
     * Apply a force to the object
     * @param force Force vector to apply
     * @param contactPoint Point to apply the force at (optional)
     */
    applyForce(force: Vector3, contactPoint?: Vector3): void;

    /**
     * Apply an impulse to the object
     * @param impulse Impulse vector to apply
     * @param contactPoint Point to apply the impulse at (optional)
     */
    applyImpulse(impulse: Vector3, contactPoint?: Vector3): void;
}

/**
 * Jetpack component interface
 */
export interface IJetpackComponent {
    /**
     * Update jetpack state
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;

    /**
     * Activate the jetpack
     */
    activate(): void;

    /**
     * Deactivate the jetpack
     */
    deactivate(): void;

    /**
     * Get current energy level
     */
    getEnergyLevel(): number;

    /**
     * Get maximum energy level
     */
    getMaxEnergy(): number;

    /**
     * Check if jetpack is active
     */
    isActive(): boolean;
}

/**
 * Camera component interface
 */
export interface ICameraComponent {
    /**
     * Update camera
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;

    /**
     * Get the Babylon.js camera
     */
    getCamera(): Camera;

    /**
     * Set the target to follow
     * @param target Target object to follow
     */
    setTarget(target: any): void;

    /**
     * Set camera offset from target
     * @param offset Offset vector
     */
    setOffset(offset: Vector3): void;

    /**
     * Apply camera shake effect
     * @param intensity Shake intensity
     * @param duration Shake duration in seconds
     */
    shake(intensity: number, duration: number): void;
}

/**
 * Collision component interface
 */
export interface ICollisionComponent {
    /**
     * Update collision detection
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;

    /**
     * Check if colliding with something
     */
    isColliding(): boolean;

    /**
     * Get terrain data at current position
     */
    getTerrainData(): TerrainData | undefined;

    /**
     * Get physics impostor
     */
    getImpostor(): PhysicsImpostor | undefined;

    /**
     * Create physics impostor for a mesh
     * @param mesh The mesh to create impostor for
     * @param scene The Babylon.js scene
     */
    createImpostor(mesh: Mesh, scene: Scene): void;
}

/**
 * Weapon component interface
 */
export interface IWeaponComponent {
    /**
     * Update weapon state
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;

    /**
     * Fire the weapon
     * @param direction Direction to fire in
     * @param velocity Additional initial velocity (e.g., from player)
     */
    fire(direction: Vector3, velocity?: Vector3): void;

    /**
     * Reload the weapon
     */
    reload(): void;

    /**
     * Get current ammo count
     */
    getAmmo(): number;

    /**
     * Get maximum ammo capacity
     */
    getMaxAmmo(): number;

    /**
     * Check if weapon is ready to fire
     */
    isReady(): boolean;
}

/**
 * Component base interface
 */
export interface IComponent {
    /**
     * Component initialization
     */
    init?(): void;

    /**
     * Update component state
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;

    /**
     * Clean up component resources
     */
    dispose?(): void;
}