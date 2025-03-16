import { IEntity } from '../../core/base/IEntity';
import { Vector3 } from '../common/Vector3';
import { PhysicsImpostor } from 'babylonjs';

/**
 * Game event types
 */
export interface GameEvents {
    'player:move': {
        entityId: string;
        position: Vector3;
        velocity: Vector3;
    };
    
    'player:jump': {
        entityId: string;
        force: number;
    };
    
    'player:landed': {
        entityId: string;
        position: Vector3;
    };
    
    'player:skiing': {
        entityId: string;
        isSkiing: boolean;
        surfaceAngle?: number;
    };
    
    'player:jetpack': {
        entityId: string;
        isActive: boolean;
        energy: number;
    };
    
    'entity:moved': {
        entityId: string;
        position: Vector3;
        velocity: Vector3;
    };
    
    'entity:collision': {
        entityId: string;
        collidedWith: string;
        point: Vector3;
        normal: Vector3;
    };
    
    'movement:stateChanged': {
        entityId: string;
        prevState: string;
        newState: string;
    };
    
    'weapon:fire': {
        entityId: string;
        weaponType: string;
        origin: Vector3;
        direction: Vector3;
    };
    
    'target:hit': {
        entityId: string;
        targetId: string;
        damage: number;
    };
}

/**
 * Strongly-typed event definitions for the game
 * This provides type safety for event names and payloads
 */
export enum EventType {
  // System events
  SYSTEM_INITIALIZED = 'system:initialized',
  SYSTEM_DISPOSED = 'system:disposed',
  SYSTEM_ERROR = 'system:error',
  
  // Physics events
  PHYSICS_INITIALIZED = 'physics:initialized',
  PHYSICS_COLLISION = 'physics:collision',
  PHYSICS_TRIGGER_ENTER = 'physics:triggerEnter',
  PHYSICS_TRIGGER_EXIT = 'physics:triggerExit',
  
  // Input events
  INPUT_KEY = 'input:key',
  INPUT_MOUSE = 'input:mouse',
  INPUT_GAMEPAD = 'input:gamepad',
  INPUT_MOVEMENT = 'input:movement',
  INPUT_JUMP = 'input:jump',
  INPUT_ACTION = 'input:action',
  
  // Entity events
  ENTITY_CREATED = 'entity:created',
  ENTITY_DESTROYED = 'entity:destroyed',
  ENTITY_COLLISION = 'entity:collision',
  
  // Renderer events
  RENDERER_INITIALIZED = 'renderer:initialized',
  RENDERER_FRAME_START = 'renderer:frameStart',
  RENDERER_FRAME_END = 'renderer:frameEnd',
  
  // Asset events
  ASSET_LOADED = 'asset:loaded',
  ASSET_ERROR = 'asset:error',
  
  // Audio events
  AUDIO_PLAY = 'audio:play',
  AUDIO_STOP = 'audio:stop',
  AUDIO_VOLUME_CHANGE = 'audio:volumeChange',
  
  // Game state events
  STATE_CHANGE = 'state:change',
  GAME_PAUSE = 'game:pause',
  GAME_RESUME = 'game:resume',
  GAME_RESET = 'game:reset'
}

/**
 * System initialization event payload
 */
export interface SystemInitializedEvent {
  systemId: string;
  timestamp: number;
}

/**
 * System error event payload
 */
export interface SystemErrorEvent {
  systemId: string;
  error: Error;
  fatal: boolean;
  timestamp: number;
}

/**
 * Physics collision event payload
 */
export interface PhysicsCollisionEvent {
  bodyA: PhysicsImpostor;
  bodyB: PhysicsImpostor;
  point: Vector3;
  normal: Vector3;
  impulse: number;
  timestamp: number;
}

/**
 * Input key event payload
 */
export interface InputKeyEvent {
  key: string;
  code: string;
  pressed: boolean;
  repeat: boolean;
  timestamp: number;
}

/**
 * Input movement event payload
 */
export interface InputMovementEvent {
  direction: Vector3;
  magnitude: number;
  timestamp: number;
}

/**
 * Input jump event payload
 */
export interface InputJumpEvent {
  entityId: string;
  timestamp: number;
}

/**
 * Entity collision event payload
 */
export interface EntityCollisionEvent {
  entityIdA: string;
  entityIdB: string;
  point: Vector3;
  normal: Vector3;
  impulse: number;
  timestamp: number;
}

/**
 * Asset loaded event payload
 */
export interface AssetLoadedEvent {
  assetId: string;
  assetType: string;
  timestamp: number;
}

/**
 * State change event payload
 */
export interface StateChangeEvent {
  previousState: string;
  newState: string;
  data?: any;
  timestamp: number;
}

/**
 * Complete event map type that maps event types to their payload types
 */
export interface GameEventMap {
  [EventType.SYSTEM_INITIALIZED]: SystemInitializedEvent;
  [EventType.SYSTEM_DISPOSED]: { systemId: string; timestamp: number };
  [EventType.SYSTEM_ERROR]: SystemErrorEvent;
  
  [EventType.PHYSICS_INITIALIZED]: { success: boolean; timestamp: number };
  [EventType.PHYSICS_COLLISION]: PhysicsCollisionEvent;
  [EventType.PHYSICS_TRIGGER_ENTER]: { triggerBody: PhysicsImpostor; otherBody: PhysicsImpostor; timestamp: number };
  [EventType.PHYSICS_TRIGGER_EXIT]: { triggerBody: PhysicsImpostor; otherBody: PhysicsImpostor; timestamp: number };
  
  [EventType.INPUT_KEY]: InputKeyEvent;
  [EventType.INPUT_MOUSE]: { x: number; y: number; buttons: number; timestamp: number };
  [EventType.INPUT_GAMEPAD]: { index: number; buttons: number[]; axes: number[]; timestamp: number };
  [EventType.INPUT_MOVEMENT]: InputMovementEvent;
  [EventType.INPUT_JUMP]: InputJumpEvent;
  [EventType.INPUT_ACTION]: { action: string; pressed: boolean; timestamp: number };
  
  [EventType.ENTITY_CREATED]: { entityId: string; timestamp: number };
  [EventType.ENTITY_DESTROYED]: { entityId: string; timestamp: number };
  [EventType.ENTITY_COLLISION]: EntityCollisionEvent;
  
  [EventType.RENDERER_INITIALIZED]: { success: boolean; timestamp: number };
  [EventType.RENDERER_FRAME_START]: { frameNumber: number; timestamp: number };
  [EventType.RENDERER_FRAME_END]: { frameNumber: number; frameTime: number; timestamp: number };
  
  [EventType.ASSET_LOADED]: AssetLoadedEvent;
  [EventType.ASSET_ERROR]: { assetId: string; error: Error; timestamp: number };
  
  [EventType.AUDIO_PLAY]: { soundId: string; options?: any; timestamp: number };
  [EventType.AUDIO_STOP]: { soundId: string; timestamp: number };
  [EventType.AUDIO_VOLUME_CHANGE]: { volume: number; timestamp: number };
  
  [EventType.STATE_CHANGE]: StateChangeEvent;
  [EventType.GAME_PAUSE]: { reason: string; timestamp: number };
  [EventType.GAME_RESUME]: { timestamp: number };
  [EventType.GAME_RESET]: { timestamp: number };
}

/**
 * Helper function to create a typed event with timestamp
 */
export function createEvent<T extends EventType>(
  type: T, 
  data: Omit<GameEventMap[T], 'timestamp'>
): GameEventMap[T] {
  return {
    ...data,
    timestamp: Date.now()
  } as GameEventMap[T];
}
