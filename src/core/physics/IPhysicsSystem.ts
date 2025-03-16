import { Scene, PhysicsImpostor, Mesh, Ray } from 'babylonjs';
import { Vector3 } from '../../types/core/MathTypes';

/**
 * Configuration options for the physics system
 */
export interface PhysicsConfig {
    gravity: Vector3;
    defaultFriction: number;
    defaultRestitution: number;
    defaultMass: number;
    maxSubSteps: number;
    fixedTimeStep: number;
    debugMode: boolean;
}

/**
 * Options for creating a rigid body
 */
export interface RigidBodyOptions {
    mass: number;
    type: 'box' | 'sphere' | 'cylinder' | 'capsule' | 'mesh';
    group: CollisionGroup;
    isKinematic?: boolean;
    friction?: number;
    restitution?: number;
}

/**
 * Result of a raycast hit
 */
export interface RaycastHit {
    point: Vector3;
    normal: Vector3;
    distance: number;
    body: PhysicsImpostor;
}

/**
 * Collision event data
 */
export interface CollisionEvent {
    bodyA: PhysicsImpostor;
    bodyB: PhysicsImpostor;
    point: Vector3;
    normal: Vector3;
    impulse: number;
}

/**
 * Predefined collision groups
 */
export enum CollisionGroup {
    DEFAULT = 1,
    STATIC = 2,
    DYNAMIC = 4,
    PLAYER = 8,
    TERRAIN = 16,
    PROJECTILE = 32,
    TRIGGER = 64
}

/**
 * Interface for the physics system
 */
export interface IPhysicsSystem {
    /**
     * Initialize the physics system
     */
    initialize(scene: Scene, config: PhysicsConfig): void;

    /**
     * Create a rigid body for a mesh
     */
    createRigidBody(mesh: Mesh, options: RigidBodyOptions): PhysicsImpostor;

    /**
     * Create a new collision group
     */
    createCollisionGroup(name: string): number;

    /**
     * Set collision mask for a group
     */
    setCollisionMask(group: number, collidesWithGroups: number[]): void;

    /**
     * Check if two groups can collide
     */
    checkCollision(groupA: number, groupB: number): boolean;

    /**
     * Apply a force to a rigid body
     */
    applyForce(body: PhysicsImpostor, force: Vector3, worldPoint?: Vector3): void;

    /**
     * Apply an impulse to a rigid body
     */
    applyImpulse(body: PhysicsImpostor, impulse: Vector3, worldPoint?: Vector3): void;

    /**
     * Apply torque to a rigid body
     */
    applyTorque(body: PhysicsImpostor, torque: Vector3): void;

    /**
     * Cast a ray and get the first hit
     */
    raycast(ray: Ray, maxDistance?: number, collisionGroup?: number): RaycastHit | null;

    /**
     * Cast a ray and get all hits
     */
    raycastAll(ray: Ray, maxDistance?: number, collisionGroup?: number): RaycastHit[];

    /**
     * Set the position of a rigid body
     */
    setPosition(body: PhysicsImpostor, position: Vector3): void;

    /**
     * Set the rotation of a rigid body
     */
    setRotation(body: PhysicsImpostor, rotation: Vector3): void;

    /**
     * Set the velocity of a rigid body
     */
    setLinearVelocity(body: PhysicsImpostor, velocity: Vector3): void;

    /**
     * Set the angular velocity of a rigid body
     */
    setAngularVelocity(body: PhysicsImpostor, velocity: Vector3): void;

    /**
     * Get the velocity of a rigid body
     */
    getLinearVelocity(body: PhysicsImpostor): Vector3;

    /**
     * Get the angular velocity of a rigid body
     */
    getAngularVelocity(body: PhysicsImpostor): Vector3;

    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled: boolean): void;

    /**
     * Dispose of the physics system
     */
    dispose(): void;
} 