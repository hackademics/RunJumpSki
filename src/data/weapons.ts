import { Vector3 } from '@babylonjs/core';

/**
 * Weapon categories
 */
export type WeaponCategory =
    'disk_launcher' |
    'hitscan' |
    'explosive' |
    'special';

/**
 * Weapon firing modes
 */
export type WeaponFiringMode =
    'single_shot' |
    'burst' |
    'automatic';

/**
 * Damage types
 */
export type DamageType =
    'direct' |
    'splash' |
    'impact';

/**
 * Weapon modification types
 */
export type WeaponMod =
    'damage_boost' |
    'reload_speed' |
    'energy_efficiency' |
    'spread_reduction';

/**
 * Weapon sound configuration
 */
export interface WeaponSounds {
    /**
     * Sound when firing
     */
    fire: string;

    /**
     * Sound when reloading
     */
    reload?: string;

    /**
     * Sound when out of ammo
     */
    outOfAmmo?: string;
}

/**
 * Weapon physics properties
 */
export interface ProjectilePhysics {
    /**
     * Initial velocity of the projectile
     */
    initialVelocity: number;

    /**
     * Gravity affect on projectile
     */
    gravityMultiplier: number;

    /**
     * Air resistance
     */
    drag: number;

    /**
     * Maximum lifetime of projectile
     */
    maxLifetime: number;
}

/**
 * Weapon modification
 */
export interface WeaponModification {
    /**
     * Type of modification
     */
    type: WeaponMod;

    /**
     * Modification value
     */
    value: number;
}

/**
 * Complete weapon definition
 */
export interface WeaponDefinition {
    /**
     * Unique identifier for the weapon
     */
    id: string;

    /**
     * Display name of the weapon
     */
    name: string;

    /**
     * Weapon category
     */
    category: WeaponCategory;

    /**
     * Firing mode
     */
    firingMode: WeaponFiringMode;

    /**
     * Damage characteristics
     */
    damage: {
        /**
         * Base damage amount
         */
        base: number;

        /**
         * Damage type
         */
        type: DamageType;

        /**
         * Splash damage radius (if applicable)
         */
        splashRadius?: number;
    };

    /**
     * Ammunition properties
     */
    ammo: {
        /**
         * Maximum ammo capacity
         */
        max: number;

        /**
         * Current ammo
         */
        current: number;

        /**
         * Reload time in seconds
         */
        reloadTime: number;
    };

    /**
     * Firing properties
     */
    firing: {
        /**
         * Rate of fire (shots per second)
         */
        rateOfFire: number;

        /**
         * Spread/accuracy
         */
        spread: number;

        /**
         * Energy cost per shot
         */
        energyCost: number;
    };

    /**
     * Projectile physics
     */
    projectile: ProjectilePhysics;

    /**
     * Sound effects
     */
    sounds: WeaponSounds;

    /**
     * Available modifications
     */
    modifications?: WeaponModification[];

    /**
     * Visual effects path
     */
    visualEffects?: {
        /**
         * Muzzle flash effect
         */
        muzzleFlash?: string;

        /**
         * Projectile trail effect
         */
        projectileTrail?: string;

        /**
         * Impact effect
         */
        impactEffect?: string;
    };
}

/**
 * Predefined weapon definitions
 */
export const Weapons: WeaponDefinition[] = [
    {
        id: 'spinfusor_mk1',
        name: 'Spinfusor MK1',
        category: 'disk_launcher',
        firingMode: 'single_shot',
        damage: {
            base: 50,
            type: 'splash',
            splashRadius: 3
        },
        ammo: {
            max: 20,
            current: 20,
            reloadTime: 2
        },
        firing: {
            rateOfFire: 1,
            spread: 0.1,
            energyCost: 10
        },
        projectile: {
            initialVelocity: 50,
            gravityMultiplier: 1,
            drag: 0.01,
            maxLifetime: 5
        },
        sounds: {
            fire: 'weapons/spinfusor_fire.wav',
            reload: 'weapons/spinfusor_reload.wav',
            outOfAmmo: 'weapons/out_of_ammo.wav'
        },
        modifications: [
            {
                type: 'damage_boost',
                value: 0.2
            },
            {
                type: 'reload_speed',
                value: -0.5
            }
        ],
        visualEffects: {
            muzzleFlash: 'effects/muzzle_flash.png',
            projectileTrail: 'effects/disk_trail.png',
            impactEffect: 'effects/disk_impact.png'
        }
    },
    {
        id: 'blaster_1',
        name: 'Blaster',
        category: 'hitscan',
        firingMode: 'automatic',
        damage: {
            base: 15,
            type: 'direct'
        },
        ammo: {
            max: 100,
            current: 100,
            reloadTime: 1.5
        },
        firing: {
            rateOfFire: 5,
            spread: 0.3,
            energyCost: 5
        },
        projectile: {
            initialVelocity: 100,
            gravityMultiplier: 0,
            drag: 0,
            maxLifetime: 2
        },
        sounds: {
            fire: 'weapons/blaster_fire.wav',
            reload: 'weapons/blaster_reload.wav'
        },
        modifications: [
            {
                type: 'spread_reduction',
                value: -0.2
            }
        ]
    }
];

/**
 * Get a weapon definition by its ID
 * @param id Weapon identifier
 */
export function getWeaponById(id: string): WeaponDefinition | undefined {
    return Weapons.find(weapon => weapon.id === id);
}

/**
 * Calculate damage after modifications
 * @param weapon Weapon definition
 * @param mods Optional modifications to apply
 */
export function calculateDamage(
    weapon: WeaponDefinition,
    mods: WeaponModification[] = []
): number {
    let baseDamage = weapon.damage.base;

    // Apply damage boost modifications
    const damageBoosts = mods.filter(mod => mod.type === 'damage_boost');
    damageBoosts.forEach(mod => {
        baseDamage *= (1 + mod.value);
    });

    return baseDamage;
}

/**
 * Simulate weapon firing
 * @param weapon Weapon to fire
 * @param position Initial position
 * @param direction Firing direction
 */
export function fireWeapon(
    weapon: WeaponDefinition,
    position: Vector3,
    direction: Vector3
): { success: boolean; remainingAmmo: number } {
    // Check if can fire
    if (weapon.ammo.current <= 0) {
        return { success: false, remainingAmmo: 0 };
    }

    // Reduce ammo
    weapon.ammo.current--;

    // TODO: Implement actual projectile spawning logic
    // This would typically involve:
    // - Creating a projectile with given physics
    // - Applying initial velocity
    // - Setting up collision detection

    return {
        success: true,
        remainingAmmo: weapon.ammo.current
    };
}

/**
 * Reload weapon
 * @param weapon Weapon to reload
 */
export function reloadWeapon(weapon: WeaponDefinition): number {
    const previousAmmo = weapon.ammo.current;
    weapon.ammo.current = weapon.ammo.max;
    return previousAmmo;
}
