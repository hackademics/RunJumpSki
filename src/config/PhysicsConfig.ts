/**
 * PhysicsConfig.ts
 * Configuration constants for the physics system
 */

import { SurfaceType } from '../types/events/EventTypes';

/**
 * Physics configuration
 */
export const PhysicsConfig = {
    /**
     * Gravity force (units/s²)
     */
    gravity: 9.8,

    /**
     * Friction coefficients by surface type
     */
    friction: {
        [SurfaceType.DEFAULT]: 0.5,
        [SurfaceType.SNOW]: 0.1,
        [SurfaceType.ICE]: 0.05,
        [SurfaceType.ROCK]: 0.7,
        [SurfaceType.METAL]: 0.3
    },

    /**
     * Player physics parameters
     */
    player: {
        /**
         * Player mass (kg)
         */
        mass: 80,

        /**
         * Player collision radius (units)
         */
        radius: 0.5,

        /**
         * Player height (units)
         */
        height: 1.8,

        /**
         * Player eye height (units)
         */
        eyeHeight: 1.7,

        /**
         * Player movement parameters
         */
        movement: {
            /**
             * Running speed (units/s)
             */
            runSpeed: 7,

            /**
             * Maximum speed (units/s)
             */
            maxSpeed: 50,

            /**
             * Jump force (units)
             */
            jumpForce: 7,

            /**
             * Air control factor (0-1)
             */
            airControl: 0.3,

            /**
             * Jetpack force (units)
             */
            jetpackForce: 15,

            /**
             * Ground acceleration (units/s²)
             */
            groundAcceleration: 20,

            /**
             * Ground deceleration (units/s²)
             */
            groundDeceleration: 10,

            /**
             * Air acceleration (units/s²)
             */
            airAcceleration: 5,

            /**
             * Air deceleration (units/s²)
             */
            airDeceleration: 2
        }
    },

    /**
     * Skiing parameters
     */
    skiing: {
        /**
         * Minimum angle for skiing (degrees)
         */
        minSkiAngle: 10,

        /**
         * Minimum slope for skiing (0-1)
         */
        minSlopeForSkiing: 0.2,

        /**
         * Maximum slope for skiing (0-1)
         */
        maxSlopeForSkiing: 1.5,

        /**
         * Slope factor by surface type (multiplier for acceleration)
         */
        slopeFactor: {
            [SurfaceType.DEFAULT]: 1.0,
            [SurfaceType.SNOW]: 1.2,
            [SurfaceType.ICE]: 1.5,
            [SurfaceType.ROCK]: 0.8,
            [SurfaceType.METAL]: 1.0
        }
    },

    /**
     * Jetpack parameters
     */
    jetpack: {
        /**
         * Maximum energy
         */
        maxEnergy: 100,

        /**
         * Energy regeneration rate (units/s)
         */
        energyRegenRate: 15,

        /**
         * Energy use rate (units/s)
         */
        energyUseRate: 30,

        /**
         * Minimum energy required to activate
         */
        minEnergyForUse: 10,

        /**
         * Regeneration delay after use (s)
         */
        regenDelay: 1.0
    },

    /**
     * Disk jumping parameters
     */
    diskJump: {
        /**
         * Vertical force (units)
         */
        verticalForce: 10,

        /**
         * Horizontal force (units)
         */
        horizontalForce: 5,

        /**
         * Self-damage percentage (0-1)
         */
        selfDamagePercent: 0.25
    },

    /**
     * Momentum conservation parameters
     */
    momentum: {
        /**
         * Momentum conservation factor for state transitions (0-1)
         * Higher values preserve more momentum when changing states
         */
        stateTransitionFactor: 0.85,
        
        /**
         * Momentum conservation factors for specific state transitions
         */
        stateTransitions: {
            /**
             * Running to skiing transition factor
             */
            runningToSkiing: 0.9,
            
            /**
             * Skiing to running transition factor
             */
            skiingToRunning: 0.7,
            
            /**
             * Flying to running transition factor
             */
            flyingToRunning: 0.6,
            
            /**
             * Flying to skiing transition factor
             */
            flyingToSkiing: 0.8,
            
            /**
             * Jetpacking to flying transition factor
             */
            jetpackingToFlying: 0.95
        },
        
        /**
         * Momentum conservation factors for different surfaces
         */
        surfaceFactors: {
            [SurfaceType.DEFAULT]: 0.8,
            [SurfaceType.SNOW]: 0.95,
            [SurfaceType.ICE]: 0.98,
            [SurfaceType.ROCK]: 0.7,
            [SurfaceType.METAL]: 0.85
        },
        
        /**
         * Minimum speed to maintain momentum (units/s)
         */
        minSpeedThreshold: 2.0,
        
        /**
         * Maximum speed boost from momentum (units/s)
         */
        maxMomentumBoost: 15.0,
        
        /**
         * Momentum decay rate when not actively moving (per second)
         */
        decayRate: 0.2,
        
        /**
         * Directional change penalty (0-1)
         * How much momentum is lost when changing direction
         * 0 = no loss, 1 = complete loss
         */
        directionChangePenalty: 0.3,
        
        /**
         * Uphill momentum conservation factor (0-1)
         */
        uphillFactor: 0.7,
        
        /**
         * Downhill momentum boost factor (multiplier)
         */
        downhillBoostFactor: 1.2
    },

    /**
     * Collision parameters
     */
    collision: {
        /**
         * Restitution (bounciness) by surface type
         */
        restitution: {
            [SurfaceType.DEFAULT]: 0.3,
            [SurfaceType.SNOW]: 0.1,
            [SurfaceType.ICE]: 0.4,
            [SurfaceType.ROCK]: 0.2,
            [SurfaceType.METAL]: 0.5
        },

        /**
         * Minimum impact force for bounce effect
         */
        minBounceImpact: 10,

        /**
         * Maximum impact force (clamped)
         */
        maxImpactForce: 100
    },

    /**
     * Landing impact parameters
     */
    landingImpact: {
        /**
         * Minimum height for minor impact (units)
         */
        minorImpactHeight: 20,

        /**
         * Minimum height for major impact (units)
         */
        majorImpactHeight: 40,

        /**
         * Minor impact control reduction duration (s)
         */
        minorImpactDuration: 0.2,

        /**
         * Major impact control reduction duration (s)
         */
        majorImpactDuration: 0.5
    }
};
