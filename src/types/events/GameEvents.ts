/**
 * GameEvents.ts
 * Defines event data structures for the event system
 */

import { Vector3 } from '../common/Vector3';
import { MovementStateType, SurfaceType, GameEventType, MarkerStartEvent, MarkerFinishEvent, MarkerCheckpointEvent, BoundaryWarningEvent, EntityOutOfBoundsEvent, EntityInBoundsEvent, EntityResetEvent } from './EventTypes';

/**
 * Base event interface
 */
export interface IEvent {
    type: string;
    timestamp?: number;
}

/**
 * Movement state change event
 */
export interface MovementStateChangeEvent extends IEvent {
    entityId: number;
    previousState: MovementStateType;
    newState: MovementStateType;
}

/**
 * Movement jump event
 */
export interface MovementJumpEvent extends IEvent {
    entityId: number;
    position: Vector3;
    velocity: Vector3;
    force: number;
}

/**
 * Movement land event
 */
export interface MovementLandEvent extends IEvent {
    entityId: number;
    position: Vector3;
    velocity: Vector3;
    impactForce: number;
    surfaceType: SurfaceType;
}

/**
 * Movement ski start event
 */
export interface MovementSkiStartEvent extends IEvent {
    entityId: number;
    position: Vector3;
    velocity: Vector3;
}

/**
 * Jetpack start event
 */
export interface JetpackStartEvent extends IEvent {
    entityId: number;
    position: Vector3;
    velocity: Vector3;
}

/**
 * Energy changed event
 */
export interface EnergyChangedEvent extends IEvent {
    entityId: number;
    energy: number;
    maxEnergy: number;
}

/**
 * Physics collision event
 */
export interface PhysicsCollisionEvent extends IEvent {
    entityIdA: number;
    entityIdB: number;
    position: Vector3;
    normal: Vector3;
    impulse: number;
    surfaceType?: SurfaceType;
}

/**
 * Weapon fire event
 */
export interface WeaponFireEvent extends IEvent {
    entityId: number;
    weaponType: string;
    position: Vector3;
    direction: Vector3;
    velocity: Vector3;
}

/**
 * Weapon hit event
 */
export interface WeaponHitEvent extends IEvent {
    projectileId: number;
    targetId: number;
    position: Vector3;
    normal: Vector3;
    damage: number;
}

/**
 * Input key event
 */
export interface InputKeyEvent extends IEvent {
    key: string;
    code: string;
    repeat: boolean;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
}

/**
 * Input mouse move event
 */
export interface InputMouseMoveEvent extends IEvent {
    x: number;
    y: number;
    movementX: number;
    movementY: number;
}

/**
 * Input mouse button event
 */
export interface InputMouseButtonEvent extends IEvent {
    button: number;
    x: number;
    y: number;
}

/**
 * Audio play event
 */
export interface AudioPlayEvent extends IEvent {
    sound: string;
    position?: Vector3;
    volume?: number;
    loop?: boolean;
}

/**
 * Target hit event
 */
export interface TargetHitEvent extends IEvent {
    targetId: number;
    position: Vector3;
    damage: number;
    destroyed: boolean;
}

/**
 * Debug log event
 */
export interface DebugLogEvent extends IEvent {
    message: string;
    data?: any;
    level?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Visual effect event
 */
export interface VisualEffectEvent extends IEvent {
    effectType: string; // Effect type (e.g., 'jetpackFlame', 'jetpackSmoke', etc.)
    position: Vector3;
    color: string;
    intensity: number;
    duration: number;
}

/**
 * Event data type mapping
 */
export interface EventDataMap {
    'movement:stateChange': MovementStateChangeEvent;
    'movement:jump': MovementJumpEvent;
    'movement:land': MovementLandEvent;
    'movement:skiStart': MovementSkiStartEvent;
    'jetpack:start': JetpackStartEvent;
    'energy:changed': EnergyChangedEvent;
    'physics:collision': PhysicsCollisionEvent;
    'weapon:fire': WeaponFireEvent;
    'weapon:hit': WeaponHitEvent;
    'input:keyDown': InputKeyEvent;
    'input:keyUp': InputKeyEvent;
    'input:mouseMove': InputMouseMoveEvent;
    'input:mouseDown': InputMouseButtonEvent;
    'input:mouseUp': InputMouseButtonEvent;
    'audio:play': AudioPlayEvent;
    'visual:effect': VisualEffectEvent;
    'target:hit': TargetHitEvent;
    'debug:log': DebugLogEvent;
    
    // Marker events
    'marker:startCrossed': MarkerStartEvent;
    'marker:finishCrossed': MarkerFinishEvent;
    'marker:checkpointCrossed': MarkerCheckpointEvent;
    
    // Boundary events
    'boundary:warning': BoundaryWarningEvent;
    'entity:outOfBounds': EntityOutOfBoundsEvent;
    'entity:inBounds': EntityInBoundsEvent;
    'entity:reset': EntityResetEvent;
    
    [key: string]: IEvent;
}
