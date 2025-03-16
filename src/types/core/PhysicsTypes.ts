import * as BABYLON from 'babylonjs';

/**
 * Extended physics-enabled object with metadata
 */
export interface IPhysicsEnabledObjectWithMetadata extends BABYLON.IPhysicsEnabledObject {
    metadata?: {
        entityId?: string;
        [key: string]: any;
    };
}

/**
 * Physics material properties
 */
export interface PhysicsMaterial {
    friction: number;
    restitution: number;
    density: number;
}

/**
 * Supported physics shape types
 */
export enum PhysicsShapeType {
    BOX = 'box',
    SPHERE = 'sphere',
    CAPSULE = 'capsule',
    CYLINDER = 'cylinder',
    MESH = 'mesh'
}

/**
 * Physics shape configuration
 */
export interface PhysicsShapeConfig {
    type: PhysicsShapeType;
    size?: BABYLON.Vector3; // For box
    radius?: number; // For sphere, capsule, cylinder
    height?: number; // For capsule, cylinder
    mesh?: BABYLON.Mesh; // For mesh type
}

/**
 * Physics body configuration
 */
export interface PhysicsBodyConfig {
    mass: number;
    material: PhysicsMaterial;
    shape: PhysicsShapeConfig;
    kinematic?: boolean;
    fixedRotation?: boolean;
    group?: number;
    mask?: number;
}

/**
 * Ray hit result from physics raycasts
 */
export interface PhysicsRayHitResult {
    point: BABYLON.Vector3;
    normal: BABYLON.Vector3;
    distance: number;
    body?: BABYLON.PhysicsImpostor;
    entity?: string; // Entity ID if hit a physics body
}

/**
 * Physics events that can be emitted
 */
export interface PhysicsEvents {
    'physics:collision': {
        bodyA: string; // Entity ID
        bodyB: string; // Entity ID
        point: BABYLON.Vector3;
        normal: BABYLON.Vector3;
        impulse: number;
    };
    'physics:trigger': {
        trigger: string; // Entity ID
        entity: string; // Entity ID
        entering: boolean;
    };
} 