/**
 * Player-related settings and constants
 */
export const PlayerSettings = {
    /**
     * Default player movement parameters
     */
    movement: {
        runSpeed: 7,
        maxSpeed: 50,
        jumpForce: 7,
        airControl: 0.3,
        jetpackForce: 15,
        defaultMass: 80
    },

    /**
     * Jetpack settings
     */
    jetpack: {
        maxEnergy: 100,
        energyRegenRate: 15,
        energyUseRate: 30,
        minEnergyForUse: 10
    },

    /**
     * Skiing mechanics
     */
    skiing: {
        minSkiAngle: 10, // degrees
        minSlopeForSkiing: 0.2,
        maxSlopeForSkiing: 1.5
    }
};

/**
 * Weapon-related settings
 */
export const WeaponSettings = {
    /**
     * Spinfusor (primary disk launcher)
     */
    spinfusor: {
        baseDamage: 50,
        projectileSpeed: 50,
        fireRate: 1, // shots per second
        maxAmmo: 20,
        reloadTime: 2 // seconds
    },

    /**
     * Projectile physics
     */
    projectile: {
        gravity: 9.81,
        airResistance: 0.01,
        maxLifetime: 5 // seconds
    }
};

/**
 * Terrain-related settings
 */
export const TerrainSettings = {
    /**
     * Terrain generation parameters
     */
    generation: {
        baseWidth: 1000,
        baseDepth: 1000,
        maxHeight: 200,
        resolution: 0.2,
        octaves: 6,
        persistence: 0.5
    },

    /**
     * Surface type probabilities
     */
    surfaceTypeProbabilities: {
        skiable: 0.4,
        ice: 0.2,
        rough: 0.2,
        bounce: 0.1,
        default: 0.1
    }
};

/**
 * Level and progression settings
 */
export const LevelSettings = {
    /**
     * Initial levels
     */
    initialLevels: [
        {
            name: 'Tutorial',
            difficulty: 'easy',
            unlocked: true,
            objectiveType: 'time_trial',
            targetTime: 120 // seconds
        },
        {
            name: 'Mountain Pass',
            difficulty: 'medium',
            unlocked: false,
            objectiveType: 'target_destruction',
            targetCount: 5
        },
        {
            name: 'Canyon Run',
            difficulty: 'hard',
            unlocked: false,
            objectiveType: 'speed_run',
            targetTime: 90 // seconds
        }
    ],

    /**
     * Progression rules
     */
    progression: {
        minScoreToUnlockNextLevel: 500,
        timeMultiplier: 10, // points per second under target time
        targetDestructionPoints: 100
    }
};

/**
 * Performance and optimization settings
 */
export const PerformanceSettings = {
    /**
     * Rendering optimization
     */
    rendering: {
        maxDrawDistance: 1000,
        lodLevels: 3,
        shadowQualityLevels: {
            low: 512,
            medium: 1024,
            high: 2048
        }
    },

    /**
     * Physics optimization
     */
    physics: {
        maxPhysicsObjects: 100,
        physicsUpdateRate: 60, // updates per second
        collisionOptimization: true
    }
};

/**
 * Audio settings
 */
export const AudioSettings = {
    /**
     * Sound effect volumes
     */
    sfx: {
        jump: 0.5,
        ski: 0.4,
        jetpack: 0.6,
        projectileFire: 0.7,
        hit: 0.8,
        levelComplete: 1.0
    },

    /**
     * Music tracks
     */
    musicTracks: [
        {
            name: 'Menu Theme',
            path: 'assets/music/menu.mp3',
            volume: 0.5
        },
        {
            name: 'Action Track 1',
            path: 'assets/music/action1.mp3',
            volume: 0.6
        }
    ]
};

/**
 * Debugging and development settings
 */
export const DebugSettings = {
    /**
     * Enable various debug features
     */
    enabled: false,

    /**
     * Debug rendering options
     */
    rendering: {
        showPhysicsBounds: false,
        showTerrainNormals: false,
        showCollisionBoxes: false
    },

    /**
     * Logging levels
     */
    logging: {
        physics: false,
        input: false,
        rendering: false,
        audio: false
    },

    /**
     * Cheat/test modes
     */
    cheats: {
        infiniteJetpack: false,
        unlockAllLevels: false,
        godMode: false
    }
};

/**
 * Utility to get a deep clone of settings
 * @param settings Settings object to clone
 */
export function cloneSettings<T>(settings: T): T {
    return JSON.parse(JSON.stringify(settings));
} 
