 
import { Vector3, PhysicsImpostor, Mesh } from '@babylonjs/core';

/**
 * Material properties for physics objects
 */
export interface PhysicsMaterial {
    /**
     * Mass of the object in kg
     */
    mass: number;

    /**
     * Friction coefficient (0-1)
     */
    friction: number;

    /**
     * Restitution/bounciness coefficient (0-1)
     */
    restitution: number;
}

/**
 * Default physics materials for common scenarios
 */
export const DefaultMaterials = {
    /**
     * Default material for static environment objects
     */
    STATIC: {
        mass: 0,
        friction: 0.5,
        restitution: 0.2
    } as PhysicsMaterial,

    /**
     * Default material for the player
     */
    PLAYER: {
        mass: 80, // 80kg player
        friction: 0.3,
        restitution: 0.1
    } as PhysicsMaterial,

    /**
     * Low friction material for skiing
     */
    SKI: {
        mass: 80,
        friction: 0.05,
        restitution: 0.1
    } as PhysicsMaterial,

    /**
     * Material for projectiles
     */
    PROJECTILE: {
        mass: 5,
        friction: 0.3,
        restitution: 0.8
    } as PhysicsMaterial
};

/**
 * Interface for objects that can be affected by physics
 */
export interface IPhysicsObject {
    /**
     * The physics impostor that handles the object's physics
     */
    impostor?: PhysicsImpostor;

    /**
     * The mesh associated with this physics object
     */
    mesh?: Mesh;

    /**
     * Current position of the object
     */
    position: Vector3;

    /**
     * Current velocity of the object
     */
    velocity: Vector3;

    /**
     * Update the physics state
     * @param deltaTime Time since last update in seconds
     */
    update?(deltaTime: number): void;

    /**
     * Apply a force to the object
     * @param force Force vector to apply
     * @param contactPoint Point to apply the force at (optional)
     */
    applyForce?(force: Vector3, contactPoint?: Vector3): void;

    /**
     * Apply an impulse to the object
     * @param impulse Impulse vector to apply
     * @param contactPoint Point to apply the impulse at (optional)
     */
    applyImpulse?(impulse: Vector3, contactPoint?: Vector3): void;
}

/**
 * Raycast hit information
 */
export interface RaycastHit {
    /**
     * Whether the ray hit something
     */
    hit: boolean;

    /**
     * The position of the hit
     */
    position?: Vector3;

    /**
     * The normal at the hit point
     */
    normal?: Vector3;

    /**
     * The distance to the hit
     */
    distance?: number;

    /**
     * The object that was hit
     */
    object?: any;
}

/**
 * Types of collision shapes
 */
export enum CollisionShapeType {
    BOX = 0,
    SPHERE = 1,
    CYLINDER = 2,
    CAPSULE = 3,
    CONVEX_HULL = 4,
    MESH = 5
}

/**
 * Surface types for terrain
 */
export enum SurfaceType {
    DEFAULT = 0,
    SKIABLE = 1,
    ICE = 2,
    ROUGH = 3,
    BOUNCE = 4
}

/**
 * Surface properties for terrain interaction
 */
export interface SurfaceProperties {
    /**
     * Type of surface
     */
    type: SurfaceType;

    /**
     * Friction coefficient (0-1)
     */
    friction: number;

    /**
     * Restitution/bounciness coefficient (0-1)
     */
    restitution: number;

    /**
     * Whether the surface is skiable
     */
    skiable: boolean;
}

/**
 * Default surface properties for different surface types
 */
export const DefaultSurfaces: { [key in SurfaceType]: SurfaceProperties } = {
    [SurfaceType.DEFAULT]: {
        type: SurfaceType.DEFAULT,
        friction: 0.5,
        restitution: 0.2,
        skiable: false
    },
    [SurfaceType.SKIABLE]: {
        type: SurfaceType.SKIABLE,
        friction: 0.05,
        restitution: 0.2,
        skiable: true
    },
    [SurfaceType.ICE]: {
        type: SurfaceType.ICE,
        friction: 0.01,
        restitution: 0.1,
        skiable: true
    },
    [SurfaceType.ROUGH]: {
        type: SurfaceType.ROUGH,
        friction: 0.8,
        restitution: 0.1,
        skiable: false
    },
    [SurfaceType.BOUNCE]: {
        type: SurfaceType.BOUNCE,
        friction: 0.5,
        restitution: 0.9,
        skiable: false
    }
};