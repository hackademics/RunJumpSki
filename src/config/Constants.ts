/**
 * Constants.ts
 * Game-wide constants
 */

/**
 * Game constants
 */
export const GameConstants = {
    /**
     * Game title
     */
    TITLE: 'RunJumpSki',

    /**
     * Game version
     */
    VERSION: '0.1.0',

    /**
     * Default canvas width
     */
    DEFAULT_WIDTH: 1280,

    /**
     * Default canvas height
     */
    DEFAULT_HEIGHT: 720,

    /**
     * Target frame rate
     */
    TARGET_FPS: 60,

    /**
     * Fixed update interval (ms)
     */
    FIXED_UPDATE_INTERVAL: 1000 / 60, // 16.67ms

    /**
     * Maximum delta time for physics (s)
     * Prevents physics issues when frame rate drops too low
     */
    MAX_DELTA_TIME: 0.1,

    /**
     * Default field of view (degrees)
     */
    DEFAULT_FOV: 90,

    /**
     * Near clipping plane
     */
    NEAR_CLIP: 0.1,

    /**
     * Far clipping plane
     */
    FAR_CLIP: 1000,

    /**
     * Default mouse sensitivity
     */
    DEFAULT_MOUSE_SENSITIVITY: 0.2,

    /**
     * Default gamepad sensitivity
     */
    DEFAULT_GAMEPAD_SENSITIVITY: 3.0,

    /**
     * Maximum number of targets per level
     */
    MAX_TARGETS: 50,

    /**
     * Maximum number of turrets per level
     */
    MAX_TURRETS: 20,

    /**
     * Default number of grenades per level
     */
    DEFAULT_GRENADES: 5,

    /**
     * Spinfusor cooldown time (ms)
     */
    SPINFUSOR_COOLDOWN: 800,

    /**
     * Spinfusor projectile speed (units/s)
     */
    SPINFUSOR_PROJECTILE_SPEED: 40,

    /**
     * Spinfusor damage
     */
    SPINFUSOR_DAMAGE: 50,

    /**
     * Grenade damage
     */
    GRENADE_DAMAGE: 100,

    /**
     * Grenade throw speed (units/s)
     */
    GRENADE_THROW_SPEED: 20,

    /**
     * Grenade explosion radius (units)
     */
    GRENADE_EXPLOSION_RADIUS: 5,

    /**
     * Grenade fuse time (s)
     */
    GRENADE_FUSE_TIME: 2.5,
    
    /**
     * Grenade bounce factor (0-1)
     */
    GRENADE_BOUNCE_FACTOR: 0.5,
    
    /**
     * Maximum number of grenade bounces
     */
    GRENADE_MAX_BOUNCES: 3,
    
    /**
     * Grenade impulse force
     */
    GRENADE_IMPULSE_FORCE: 3000,
    
    /**
     * Grenade cooldown time (ms)
     */
    GRENADE_COOLDOWN: 1200,

    /**
     * Target hit time bonus (s)
     */
    TARGET_HIT_TIME_BONUS: 2,

    /**
     * Target destroyed time bonus (s)
     */
    TARGET_DESTROYED_TIME_BONUS: 5,
    
    /**
     * Target default health
     */
    TARGET_DEFAULT_HEALTH: 100,
    
    /**
     * Target default point value
     */
    TARGET_DEFAULT_POINTS: 10,
    
    /**
     * Target default size
     */
    TARGET_DEFAULT_SIZE: 1.0,
    
    /**
     * Target hit sound
     */
    TARGET_HIT_SOUND: 'sounds/targets/target_hit.mp3',
    
    /**
     * Target destroyed sound
     */
    TARGET_DESTROYED_SOUND: 'sounds/targets/target_destroyed.mp3',

    /**
     * Turret hit penalty (s)
     */
    TURRET_HIT_PENALTY: 5,

    /**
     * Turret detection radius (units)
     */
    TURRET_DETECTION_RADIUS: 30,

    /**
     * Turret rotation speed (degrees/s)
     */
    TURRET_ROTATION_SPEED: 45,

    /**
     * Turret fire rate (shots/s)
     */
    TURRET_FIRE_RATE: 1,

    /**
     * Turret projectile speed (units/s)
     */
    TURRET_PROJECTILE_SPEED: 30,

    /**
     * Turret damage
     */
    TURRET_DAMAGE: 20,

    /**
     * Turret health
     */
    TURRET_HEALTH: 100,

    /**
     * Player respawn time (s)
     */
    PLAYER_RESPAWN_TIME: 3,

    /**
     * Debug overlay update interval (ms)
     */
    DEBUG_UPDATE_INTERVAL: 500,

    // Physics constants
    GRAVITY: 9.81,
    TERMINAL_VELOCITY: 50,
    
    // Game world reference (to be set at runtime)
    GAME_WORLD: null as any,
};
