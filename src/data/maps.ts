import { Vector3 } from '@babylonjs/core';

/**
 * Difficulty levels for maps
 */
export type MapDifficulty = 'tutorial' | 'easy' | 'medium' | 'hard' | 'extreme';

/**
 * Objective types for levels
 */
export type MapObjectiveType =
    'time_trial' |
    'target_destruction' |
    'point_collection' |
    'survival' |
    'race';

/**
 * Terrain characteristics for a map
 */
export interface TerrainCharacteristics {
    /**
     * Width of the terrain
     */
    width: number;

    /**
     * Depth of the terrain
     */
    depth: number;

    /**
     * Maximum height of terrain
     */
    maxHeight: number;

    /**
     * Seed for procedural generation
     */
    seed?: number;

    /**
     * Predominant surface types
     */
    surfaceTypes: {
        skiable: number;
        ice: number;
        rough: number;
        bounce: number;
    };
}

/**
 * Objective definition for a map
 */
export interface MapObjective {
    /**
     * Type of objective
     */
    type: MapObjectiveType;

    /**
     * Target to achieve (e.g., time, score, targets)
     */
    target: number;

    /**
     * Optional description
     */
    description?: string;
}

/**
 * Player spawn point with additional information
 */
export interface SpawnPoint {
    /**
     * Position in world space
     */
    position: Vector3;

    /**
     * Initial orientation (rotation)
     */
    rotation?: Vector3;

    /**
     * Optional spawn type (player, checkpoint, etc.)
     */
    type?: 'start' | 'checkpoint' | 'respawn';
}

/**
 * Target definition for destruction or collection
 */
export interface MapTarget {
    /**
     * Position of the target
     */
    position: Vector3;

    /**
     * Type of target
     */
    type: 'destruction' | 'collection' | 'checkpoint';

    /**
     * Points awarded for hitting/collecting
     */
    points: number;

    /**
     * Optional health for destructible targets
     */
    health?: number;
}

/**
 * Turret or enemy definition
 */
export interface MapEnemy {
    /**
     * Position of the enemy/turret
     */
    position: Vector3;

    /**
     * Type of enemy
     */
    type: 'turret' | 'moving' | 'stationary';

    /**
     * Difficulty or aggression level
     */
    difficulty: number;

    /**
     * Weapon or attack type
     */
    weapon?: string;
}

/**
 * Complete map/level definition
 */
export interface MapDefinition {
    /**
     * Unique identifier for the map
     */
    id: string;

    /**
     * Display name of the map
     */
    name: string;

    /**
     * Difficulty level
     */
    difficulty: MapDifficulty;

    /**
     * Whether the map is initially unlocked
     */
    unlocked: boolean;

    /**
     * Terrain characteristics
     */
    terrain: TerrainCharacteristics;

    /**
     * Primary objective
     */
    objective: MapObjective;

    /**
     * Spawn points
     */
    spawnPoints: SpawnPoint[];

    /**
     * Targets in the map
     */
    targets: MapTarget[];

    /**
     * Enemies or obstacles
     */
    enemies: MapEnemy[];

    /**
     * Recommended player skills or techniques
     */
    recommendedSkills?: string[];

    /**
     * Par time for completion
     */
    parTime?: number;

    /**
     * Recommended loadout or equipment
     */
    recommendedLoadout?: string[];
}

/**
 * Collection of predefined maps
 */
export const GameMaps: MapDefinition[] = [
    {
        id: 'tutorial',
        name: 'Tutorial Valley',
        difficulty: 'tutorial',
        unlocked: true,
        terrain: {
            width: 800,
            depth: 800,
            maxHeight: 150,
            seed: 12345,
            surfaceTypes: {
                skiable: 0.6,
                ice: 0.2,
                rough: 0.1,
                bounce: 0.1
            }
        },
        objective: {
            type: 'time_trial',
            target: 120, // 2 minutes
            description: 'Complete the course within 2 minutes'
        },
        spawnPoints: [
            {
                position: new Vector3(0, 100, 0),
                type: 'start'
            }
        ],
        targets: [
            {
                position: new Vector3(100, 50, 100),
                type: 'destruction',
                points: 50
            },
            {
                position: new Vector3(-100, 50, -100),
                type: 'destruction',
                points: 50
            }
        ],
        enemies: [
            {
                position: new Vector3(200, 50, 200),
                type: 'turret',
                difficulty: 1,
                weapon: 'basic_cannon'
            }
        ],
        recommendedSkills: ['skiing', 'momentum control'],
        parTime: 180,
        recommendedLoadout: ['default_disk_launcher']
    },
    {
        id: 'mountain_pass',
        name: 'Mountain Pass',
        difficulty: 'medium',
        unlocked: false,
        terrain: {
            width: 1200,
            depth: 1200,
            maxHeight: 300,
            seed: 67890,
            surfaceTypes: {
                skiable: 0.5,
                ice: 0.3,
                rough: 0.15,
                bounce: 0.05
            }
        },
        objective: {
            type: 'target_destruction',
            target: 5,
            description: 'Destroy 5 enemy targets'
        },
        spawnPoints: [
            {
                position: new Vector3(0, 200, 0),
                type: 'start'
            },
            {
                position: new Vector3(300, 150, 300),
                type: 'checkpoint'
            }
        ],
        targets: [
            {
                position: new Vector3(200, 100, 200),
                type: 'destruction',
                points: 100
            },
            {
                position: new Vector3(-200, 100, -200),
                type: 'destruction',
                points: 100
            },
            {
                position: new Vector3(400, 150, 400),
                type: 'destruction',
                points: 100
            }
        ],
        enemies: [
            {
                position: new Vector3(300, 100, 300),
                type: 'turret',
                difficulty: 2,
                weapon: 'advanced_cannon'
            },
            {
                position: new Vector3(-300, 100, -300),
                type: 'turret',
                difficulty: 2,
                weapon: 'advanced_cannon'
            }
        ],
        recommendedSkills: ['advanced skiing', 'target leading'],
        parTime: 240,
        recommendedLoadout: ['disk_launcher', 'energy_pack']
    }
];

/**
 * Get a map definition by its ID
 * @param id Map identifier
 */
export function getMapById(id: string): MapDefinition | undefined {
    return GameMaps.find(map => map.id === id);
}

/**
 * Get all unlocked maps
 */
export function getUnlockedMaps(): MapDefinition[] {
    return GameMaps.filter(map => map.unlocked);
}

/**
 * Check if a map is unlocked
 * @param id Map identifier
 */
export function isMapUnlocked(id: string): boolean {
    const map = getMapById(id);
    return map ? map.unlocked : false;
}

/**
 * Unlock a map
 * @param id Map identifier
 */
export function unlockMap(id: string): boolean {
    const map = getMapById(id);
    if (map && !map.unlocked) {
        map.unlocked = true;
        return true;
    }
    return false;
}
