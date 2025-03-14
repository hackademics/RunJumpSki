/**
 * EventTypes.ts
 * Defines event types used throughout the game
 */

import { Vector3 } from '../common/Vector3';

/**
 * Game event types
 */
export enum GameEventType {
    // Core game events
    GAME_INIT = 'game:init',
    GAME_START = 'game:start',
    GAME_PAUSE = 'game:pause',
    GAME_RESUME = 'game:resume',
    GAME_RESET = 'game:reset',
    GAME_OVER = 'game:over',
    
    // Player events
    PLAYER_SPAWN = 'player:spawn',
    PLAYER_DEATH = 'player:death',
    PLAYER_RESPAWN = 'player:respawn',
    PLAYER_MOVE = 'player:move',
    PLAYER_JUMP = 'player:jump',
    PLAYER_LAND = 'player:land',
    PLAYER_JETPACK = 'player:jetpack',
    PLAYER_SKI = 'player:ski',
    PLAYER_STOP_SKI = 'player:stopSki',
    PLAYER_ENERGY_CHANGE = 'player:energyChange',
    PLAYER_HEALTH_CHANGE = 'player:healthChange',
    
    // Movement events
    MOVEMENT_STATE_CHANGE = 'movement:stateChange',
    MOVEMENT_JUMP = 'movement:jump',
    MOVEMENT_LAND = 'movement:land',
    MOVEMENT_START_SKIING = 'movement:startSkiing',
    MOVEMENT_STOP_SKIING = 'movement:stopSkiing',
    MOVEMENT_SKI_START = 'movement:skiStart',
    MOVEMENT_START_JETPACK = 'movement:startJetpack',
    MOVEMENT_STOP_JETPACK = 'movement:stopJetpack',
    JETPACK_START = 'jetpack:start',
    ENERGY_CHANGED = 'energy:changed',
    
    // Physics events
    PHYSICS_COLLISION = 'physics:collision',
    PHYSICS_TRIGGER_ENTER = 'physics:triggerEnter',
    PHYSICS_TRIGGER_EXIT = 'physics:triggerExit',
    
    // Weapon events
    WEAPON_FIRE = 'weapon:fire',
    WEAPON_RELOAD = 'weapon:reload',
    WEAPON_SWITCH = 'weapon:switch',
    WEAPON_PICKUP = 'weapon:pickup',
    WEAPON_DROP = 'weapon:drop',
    WEAPON_HIT = 'weapon:hit',
    WEAPON_FIRED = 'weapon:fired',
    WEAPON_RELOAD_STARTED = 'weapon:reload:started',
    WEAPON_RELOAD_COMPLETED = 'weapon:reload:completed',
    WEAPON_AMMO_CHANGED = 'weapon:ammo:changed',
    WEAPON_EQUIPPED = 'weapon:equipped',
    WEAPON_UNEQUIPPED = 'weapon:unequipped',
    
    // UI events
    UI_SHOW_MENU = 'ui:showMenu',
    UI_HIDE_MENU = 'ui:hideMenu',
    UI_UPDATE_HUD = 'ui:updateHud',
    UI_BUTTON_CLICK = 'ui:buttonClick',
    
    // Input events
    INPUT_KEY_DOWN = 'input:keyDown',
    INPUT_KEY_UP = 'input:keyUp',
    INPUT_MOUSE_MOVE = 'input:mouseMove',
    INPUT_MOUSE_DOWN = 'input:mouseDown',
    INPUT_MOUSE_UP = 'input:mouseUp',
    
    // Audio events
    AUDIO_PLAY = 'audio:play',
    AUDIO_STOP = 'audio:stop',
    AUDIO_VOLUME_CHANGE = 'audio:volumeChange',
    
    // Visual effects events
    VISUAL_EFFECT = 'visual:effect',
    
    // Level events
    LEVEL_LOAD = 'level:load',
    LEVEL_UNLOAD = 'level:unload',
    LEVEL_COMPLETE = 'level:complete',
    LEVEL_START = 'level:start',
    
    // Target events
    TARGET_HIT = 'target:hit',
    TARGET_DESTROYED = 'target:destroyed',
    
    // Turret events
    TURRET_FIRE = 'turret:fire',
    TURRET_DESTROYED = 'turret:destroyed',
    
    // Debug events
    DEBUG_TOGGLE = 'debug:toggle',
    DEBUG_LOG = 'debug:log',
    DEBUG_WARNING = 'debug:warning',
    DEBUG_ERROR = 'debug:error',
    PERFORMANCE_REPORT = 'performance:report',
    
    // Map boundary events
    BOUNDARY_WARNING = 'boundary:warning',
    ENTITY_OUT_OF_BOUNDS = 'entity:outOfBounds',
    ENTITY_IN_BOUNDS = 'entity:inBounds',
    ENTITY_RESET = 'entity:reset',
    
    // Marker events
    MARKER_START_CROSSED = 'marker:startCrossed',
    MARKER_FINISH_CROSSED = 'marker:finishCrossed',
    MARKER_CHECKPOINT_CROSSED = 'marker:checkpointCrossed',
    
    // Projectile events
    PROJECTILE_CREATED = 'projectile:created',
    PROJECTILE_HIT = 'projectile:hit',
    PROJECTILE_DESTROYED = 'projectile:destroyed',
    PROJECTILE_BOUNCE = 'projectile:bounce',
    PROJECTILE_SPAWN = 'projectile:spawn',
    PROJECTILE_EXPLODE = 'projectile:explode',
    EXPLOSION = 'explosion',
    
    // Race events
    RACE_START = 'race:start',
    RACE_CHECKPOINT = 'race:checkpoint',
    RACE_FINISH = 'race:finish',
    RACE_BEST_TIME = 'race:bestTime',
    
    // Collision events
    REGISTER_COLLIDER = 'register:collider',
    UNREGISTER_COLLIDER = 'unregister:collider',
    COLLISION_ENTER = 'collision:enter',
    COLLISION_EXIT = 'collision:exit',
    TRIGGER_ENTER = 'trigger:enter',
    TRIGGER_EXIT = 'trigger:exit',
    
    // Score events
    SCORE_UPDATE = 'score:update',
    SCORE_RESET = 'score:reset',
    HIGH_SCORE = 'score:highScore'
}

/**
 * Input event types
 */
export enum InputEventType {
    KEY_DOWN = 'input:keyDown',
    KEY_UP = 'input:keyUp',
    MOUSE_MOVE = 'input:mouseMove',
    MOUSE_DOWN = 'input:mouseDown',
    MOUSE_UP = 'input:mouseUp'
}

/**
 * Movement state types
 */
export enum MovementStateType {
    RUNNING = 'running',
    SKIING = 'skiing',
    FLYING = 'flying',
    JETPACKING = 'jetpacking'
}

/**
 * Surface types for terrain
 */
export enum SurfaceType {
    DEFAULT = 'default',
    SNOW = 'snow',
    ICE = 'ice',
    ROCK = 'rock',
    METAL = 'metal'
}

/**
 * Base event interface
 */
export interface IEvent {
    type: string;
    [key: string]: any;
}

/**
 * Marker start event data
 */
export interface MarkerStartEvent extends IEvent {
    type: GameEventType.MARKER_START_CROSSED;
    entityId: string;
    markerId: string;
    time: number;
}

/**
 * Marker finish event data
 */
export interface MarkerFinishEvent extends IEvent {
    type: GameEventType.MARKER_FINISH_CROSSED;
    entityId: string;
    markerId: string;
    time: number;
}

/**
 * Marker checkpoint event data
 */
export interface MarkerCheckpointEvent extends IEvent {
    type: GameEventType.MARKER_CHECKPOINT_CROSSED;
    entityId: string;
    markerId: string;
    checkpointNumber: number;
    time: number;
}

/**
 * Map boundary event data
 */
export interface BoundaryWarningEvent extends IEvent {
    type: GameEventType.BOUNDARY_WARNING;
    entityId: string;
    distance: number;
    direction: string;
}

/**
 * Entity out of bounds event data
 */
export interface EntityOutOfBoundsEvent extends IEvent {
    type: GameEventType.ENTITY_OUT_OF_BOUNDS;
    entityId: string;
    position: any; // Vector3
    boundaryType: string;
}

/**
 * Entity in bounds event data
 */
export interface EntityInBoundsEvent extends IEvent {
    type: GameEventType.ENTITY_IN_BOUNDS;
    entityId: string;
}

/**
 * Entity reset event data
 */
export interface EntityResetEvent extends IEvent {
    type: GameEventType.ENTITY_RESET;
    entityId: string;
    oldPosition: any; // Vector3
    newPosition: any; // Vector3
}

/**
 * Weapon fired event
 */
export interface WeaponFiredEvent {
    /**
     * Entity ID that fired the weapon
     */
    entityId?: string;
    
    /**
     * Weapon type
     */
    weaponType: string;
    
    /**
     * Origin position
     */
    origin: Vector3;
    
    /**
     * Direction vector
     */
    direction: Vector3;
    
    /**
     * Projectile speed
     */
    projectileSpeed: number;
    
    /**
     * Damage
     */
    damage: number;
}

/**
 * Weapon reload started event
 */
export interface WeaponReloadStartedEvent {
    /**
     * Entity ID that is reloading
     */
    entityId?: string;
    
    /**
     * Weapon type
     */
    weaponType: string;
    
    /**
     * Reload time in seconds
     */
    reloadTime: number;
}

/**
 * Weapon reload completed event
 */
export interface WeaponReloadCompletedEvent {
    /**
     * Entity ID that completed reloading
     */
    entityId?: string;
    
    /**
     * Weapon type
     */
    weaponType: string;
    
    /**
     * Current ammo count
     */
    currentAmmo: number;
    
    /**
     * Maximum ammo capacity
     */
    maxAmmo: number;
}

/**
 * Projectile hit event
 */
export interface ProjectileHitEvent {
    /**
     * Projectile ID
     */
    projectileId: string;
    
    /**
     * Owner entity ID
     */
    ownerEntityId?: string;
    
    /**
     * Hit entity ID
     */
    hitEntityId?: string;
    
    /**
     * Hit point
     */
    hitPoint: Vector3;
    
    /**
     * Hit normal
     */
    hitNormal: Vector3;
    
    /**
     * Damage
     */
    damage: number;
    
    /**
     * Explosion radius
     */
    explosionRadius: number;
    
    /**
     * Impulse force
     */
    impulseForce: number;
}

/**
 * Explosion event
 */
export interface ExplosionEvent {
    /**
     * Explosion position
     */
    position: Vector3;
    
    /**
     * Explosion radius
     */
    radius: number;
    
    /**
     * Damage
     */
    damage: number;
    
    /**
     * Impulse force
     */
    impulseForce: number;
    
    /**
     * Owner entity ID
     */
    ownerEntityId?: string;
}

/**
 * Projectile destroyed event
 */
export interface ProjectileDestroyedEvent {
    /**
     * Projectile ID
     */
    projectileId: string;
    
    /**
     * Owner entity ID
     */
    ownerEntityId?: string;
}

/**
 * Projectile bounce event
 */
export interface ProjectileBounceEvent {
    /**
     * Projectile ID
     */
    projectileId: string;
    
    /**
     * Bounce count
     */
    bounceCount: number;
    
    /**
     * Hit point
     */
    hitPoint: Vector3;
    
    /**
     * Hit normal
     */
    hitNormal: Vector3;
    
    /**
     * New velocity after bounce
     */
    newVelocity: Vector3;
}

/**
 * Target hit event
 */
export interface TargetHitEvent extends IEvent {
    /**
     * ID of the target that was hit
     */
    targetId: string;
    
    /**
     * Position where the hit occurred
     */
    position: { x: number, y: number, z: number };
    
    /**
     * Point value for hitting the target
     */
    pointValue: number;
    
    /**
     * Time bonus for hitting the target (seconds)
     */
    timeBonus: number;
}

/**
 * Target destroyed event
 */
export interface TargetDestroyedEvent extends TargetHitEvent {
    // Same as TargetHitEvent but with a different type
}

/**
 * Register collider event
 */
export interface RegisterColliderEvent extends IEvent {
    /**
     * ID of the entity that owns the collider
     */
    entityId: string;
    
    /**
     * The collider component
     */
    collider: any;
}

/**
 * Unregister collider event
 */
export interface UnregisterColliderEvent extends IEvent {
    /**
     * ID of the entity that owns the collider
     */
    entityId: string;
}

/**
 * Collision event
 */
export interface CollisionEvent extends IEvent {
    /**
     * ID of the first entity in the collision
     */
    entityIdA: string;
    
    /**
     * ID of the second entity in the collision
     */
    entityIdB: string;
    
    /**
     * Contact point
     */
    contactPoint: { x: number, y: number, z: number };
    
    /**
     * Contact normal
     */
    contactNormal: { x: number, y: number, z: number };
}

/**
 * Score update event
 */
export interface ScoreUpdateEvent extends IEvent {
    /**
     * Current score
     */
    score: number;
    
    /**
     * Number of targets hit
     */
    targetsHit: number;
    
    /**
     * Number of targets destroyed
     */
    targetsDestroyed: number;
}
