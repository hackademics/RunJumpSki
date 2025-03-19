/**
 * @file src/core/events/CollisionEvents.ts
 * @description Defines collision-related events for the event system.
 */

import * as BABYLON from 'babylonjs';
import { Event, DataEvent } from './Event';

/**
 * Collision event type constants
 */
export const CollisionEventTypes = {
  // Basic collision events
  COLLISION_START: 'collision.start',
  COLLISION_END: 'collision.end',
  COLLISION_STAY: 'collision.stay',
  
  // Trigger events
  TRIGGER_ENTER: 'trigger.enter',
  TRIGGER_EXIT: 'trigger.exit',
  TRIGGER_STAY: 'trigger.stay',
  
  // Raycast events
  RAYCAST_HIT: 'raycast.hit',
  
  // Specialized collision events
  COLLISION_GROUND: 'collision.ground',
  COLLISION_WALL: 'collision.wall',
  COLLISION_CEILING: 'collision.ceiling',
  COLLISION_DAMAGE: 'collision.damage',
  
  // Game-specific events
  PLAYER_HIT_TARGET: 'player.hit.target',
  PLAYER_HIT_TURRET: 'player.hit.turret',
  PROJECTILE_HIT: 'projectile.hit'
};

/**
 * Basic collision event data structure
 */
export interface CollisionEventData {
  /**
   * The entity ID that initiated the collision
   */
  entityId: string;
  
  /**
   * The entity ID that was collided with
   */
  collidedWithEntityId?: string;
  
  /**
   * The physics impostor that initiated the collision
   */
  impostor: BABYLON.PhysicsImpostor;
  
  /**
   * The physics impostor that was collided with
   */
  collidedWithImpostor?: BABYLON.PhysicsImpostor;
  
  /**
   * Point of collision in world space
   */
  collisionPoint: BABYLON.Vector3;
  
  /**
   * Normal vector of the collision
   */
  collisionNormal: BABYLON.Vector3;
  
  /**
   * Impulse of the collision
   */
  collisionImpulse: number;
  
  /**
   * Metadata about the collision
   */
  metadata?: Record<string, any>;
}

/**
 * Base class for all collision events
 */
export class CollisionEvent extends DataEvent<CollisionEventData> {
  /**
   * Create a new collision event
   * @param type The collision event type
   * @param entityId Entity that initiated the collision
   * @param impostor Physics impostor that initiated the collision
   * @param collisionPoint Point of collision in world space
   * @param collisionNormal Normal vector of the collision
   * @param collisionImpulse Impulse of the collision
   * @param options Additional collision options
   */
  constructor(
    type: string,
    entityId: string,
    impostor: BABYLON.PhysicsImpostor,
    collisionPoint: BABYLON.Vector3,
    collisionNormal: BABYLON.Vector3,
    collisionImpulse: number,
    options?: {
      collidedWithEntityId?: string;
      collidedWithImpostor?: BABYLON.PhysicsImpostor;
      metadata?: Record<string, any>;
    }
  ) {
    super(type, {
      entityId,
      impostor,
      collisionPoint,
      collisionNormal,
      collisionImpulse,
      collidedWithEntityId: options?.collidedWithEntityId,
      collidedWithImpostor: options?.collidedWithImpostor,
      metadata: options?.metadata
    });
  }
}

/**
 * Specialized event for trigger volumes
 */
export class TriggerEvent extends CollisionEvent {
  /**
   * Create a new trigger event
   * @param type The trigger event type
   * @param entityId Entity that triggered the event
   * @param impostor Physics impostor that triggered the event
   * @param triggerImpostor Physics impostor of the trigger volume
   * @param options Additional trigger options
   */
  constructor(
    type: string,
    entityId: string,
    impostor: BABYLON.PhysicsImpostor,
    triggerImpostor: BABYLON.PhysicsImpostor,
    options?: {
      collisionPoint?: BABYLON.Vector3;
      metadata?: Record<string, any>;
    }
  ) {
    // For triggers, we often don't have exact collision data,
    // so we estimate based on object positions
    const collisionPoint = options?.collisionPoint || estimateCollisionPoint(impostor, triggerImpostor);
    
    super(
      type,
      entityId,
      impostor,
      collisionPoint,
      new BABYLON.Vector3(0, 1, 0), // Default up vector
      0, // No impulse for triggers
      {
        collidedWithImpostor: triggerImpostor,
        metadata: {
          isTrigger: true,
          ...options?.metadata
        }
      }
    );
  }
}

/**
 * Specialized event for raycast hits
 */
export class RaycastEvent extends DataEvent<{
  origin: BABYLON.Vector3;
  direction: BABYLON.Vector3;
  distance: number;
  hitPoint: BABYLON.Vector3;
  hitNormal?: BABYLON.Vector3;
  entityId?: string;
  impostor?: BABYLON.PhysicsImpostor;
  metadata?: Record<string, any>;
}> {
  /**
   * Create a new raycast event
   * @param origin Origin of the ray
   * @param direction Direction of the ray
   * @param distance Distance to the hit
   * @param hitPoint Point where the ray hit
   * @param options Additional raycast options
   */
  constructor(
    origin: BABYLON.Vector3,
    direction: BABYLON.Vector3,
    distance: number,
    hitPoint: BABYLON.Vector3,
    options?: {
      hitNormal?: BABYLON.Vector3;
      entityId?: string;
      impostor?: BABYLON.PhysicsImpostor;
      metadata?: Record<string, any>;
    }
  ) {
    super(CollisionEventTypes.RAYCAST_HIT, {
      origin,
      direction,
      distance,
      hitPoint,
      hitNormal: options?.hitNormal,
      entityId: options?.entityId,
      impostor: options?.impostor,
      metadata: options?.metadata
    });
  }
}

/**
 * Helper to estimate collision point between two impostors
 */
function estimateCollisionPoint(
  impostor1: BABYLON.PhysicsImpostor,
  impostor2: BABYLON.PhysicsImpostor
): BABYLON.Vector3 {
  // Simple implementation that returns the midpoint between the two objects
  if (!impostor1.object || !impostor2.object) {
    return new BABYLON.Vector3(0, 0, 0);
  }
  
  const mesh1 = impostor1.object as BABYLON.AbstractMesh;
  const mesh2 = impostor2.object as BABYLON.AbstractMesh;
  
  // Calculate center points
  const center1 = mesh1.getBoundingInfo().boundingBox.centerWorld;
  const center2 = mesh2.getBoundingInfo().boundingBox.centerWorld;
  
  // Return the midpoint as an estimate
  return BABYLON.Vector3.Center(center1, center2);
}

/**
 * Create and dispatch a collision start event
 * @param entityId Entity that initiated the collision
 * @param impostor Physics impostor that initiated the collision
 * @param collidedWithImpostor Physics impostor that was collided with
 * @param collisionPoint Point of collision in world space
 * @param collisionNormal Normal vector of the collision
 * @param collisionImpulse Impulse of the collision
 * @param eventBus The event bus to dispatch the event on
 * @param options Additional collision options
 */
export function dispatchCollisionStartEvent(
  entityId: string,
  impostor: BABYLON.PhysicsImpostor,
  collidedWithImpostor: BABYLON.PhysicsImpostor,
  collisionPoint: BABYLON.Vector3,
  collisionNormal: BABYLON.Vector3,
  collisionImpulse: number,
  eventBus: { dispatch: (event: any) => void },
  options?: {
    collidedWithEntityId?: string;
    metadata?: Record<string, any>;
  }
): void {
  const event = new CollisionEvent(
    CollisionEventTypes.COLLISION_START,
    entityId,
    impostor,
    collisionPoint,
    collisionNormal,
    collisionImpulse,
    {
      collidedWithEntityId: options?.collidedWithEntityId,
      collidedWithImpostor,
      metadata: options?.metadata
    }
  );
  
  eventBus.dispatch(event);
}

/**
 * Create and dispatch a trigger enter event
 * @param entityId Entity that entered the trigger
 * @param impostor Physics impostor that entered the trigger
 * @param triggerImpostor Physics impostor of the trigger volume
 * @param eventBus The event bus to dispatch the event on
 * @param options Additional trigger options
 */
export function dispatchTriggerEnterEvent(
  entityId: string,
  impostor: BABYLON.PhysicsImpostor,
  triggerImpostor: BABYLON.PhysicsImpostor,
  eventBus: { dispatch: (event: any) => void },
  options?: {
    collisionPoint?: BABYLON.Vector3;
    metadata?: Record<string, any>;
  }
): void {
  const event = new TriggerEvent(
    CollisionEventTypes.TRIGGER_ENTER,
    entityId,
    impostor,
    triggerImpostor,
    options
  );
  
  eventBus.dispatch(event);
}
