/**
 * IPhysicsComponent.ts
 * Interface for physics components
 */

import { IComponent } from '../IComponent';
import { Vector3 } from '../../types/common/Vector3';

/**
 * Interface for physics components
 */
export interface IPhysicsComponent extends IComponent {
    /**
     * Get the current velocity
     * @returns Current velocity vector
     */
    getVelocity(): Vector3;
    
    /**
     * Set the velocity
     * @param velocity New velocity vector
     */
    setVelocity(velocity: Vector3): void;
    
    /**
     * Apply a force to the entity
     * @param force Force vector
     * @param point Point of application (optional)
     */
    applyForce(force: Vector3, point?: Vector3): void;
    
    /**
     * Apply an impulse to the entity
     * @param impulse Impulse vector
     * @param point Point of application (optional)
     */
    applyImpulse(impulse: Vector3, point?: Vector3): void;
    
    /**
     * Get the mass of the entity
     * @returns Mass in kg
     */
    getMass(): number;
    
    /**
     * Set the mass of the entity
     * @param mass Mass in kg
     */
    setMass(mass: number): void;
    
    /**
     * Check if the entity is static (immovable)
     * @returns Whether the entity is static
     */
    isEntityStatic(): boolean;
    
    /**
     * Set whether the entity is static
     * @param isStatic Whether the entity is static
     */
    setStatic(isStatic: boolean): void;
    
    /**
     * Check if the entity is kinematic (moved by code, not physics)
     * @returns Whether the entity is kinematic
     */
    isKinematic?(): boolean;
    
    /**
     * Set whether the entity is kinematic
     * @param isKinematic Whether the entity is kinematic
     */
    setKinematic?(isKinematic: boolean): void;
    
    /**
     * Check if gravity is enabled for this entity
     * @returns Whether gravity is enabled
     */
    isGravityEnabled(): boolean;
    
    /**
     * Set whether gravity is enabled for this entity
     * @param enabled Whether gravity is enabled
     */
    setGravityEnabled(enabled: boolean): void;
    
    /**
     * Get the friction coefficient
     * @returns Friction coefficient
     */
    getFriction(): number;
    
    /**
     * Set the friction coefficient
     * @param friction Friction coefficient
     */
    setFriction(friction: number): void;
    
    /**
     * Get the restitution (bounciness)
     * @returns Restitution coefficient
     */
    getRestitution(): number;
    
    /**
     * Set the restitution (bounciness)
     * @param restitution Restitution coefficient
     */
    setRestitution(restitution: number): void;
    
    /**
     * Check if collision is enabled for this entity
     * @returns Whether collision is enabled
     */
    isCollisionEnabled(): boolean;
    
    /**
     * Set whether collision is enabled for this entity
     * @param enabled Whether collision is enabled
     */
    setCollisionEnabled(enabled: boolean): void;
    
    /**
     * Get the physics component type
     * This is already defined in IComponent, so we don't need to redefine it here
     */
    // type: string; // Inherited from IComponent
}
