/**
 * TerrainConfig.ts
 * Configuration constants for the terrain system
 */

import { SurfaceType } from '../types/events/EventTypes';

/**
 * Terrain configuration
 */
export const TerrainConfig = {
    /**
     * Default terrain dimensions
     */
    dimensions: {
        /**
         * Width of the terrain in world units
         */
        width: 1000,
        
        /**
         * Depth of the terrain in world units
         */
        depth: 1000,
        
        /**
         * Maximum height of the terrain
         */
        maxHeight: 200,
        
        /**
         * Resolution of the terrain (vertices per unit)
         * Higher values create more detailed terrain but are more performance-intensive
         */
        resolution: 0.2
    },
    
    /**
     * Noise generation parameters
     */
    noise: {
        /**
         * Number of octaves for noise generation
         * Higher values create more detailed terrain
         */
        octaves: 6,
        
        /**
         * Persistence for noise generation
         * Controls how quickly the amplitude decreases for each octave
         */
        persistence: 0.5,
        
        /**
         * Scale for noise generation
         * Controls the overall size of terrain features
         */
        scale: 0.01,
        
        /**
         * Seed for random generation
         * Same seed will generate the same terrain
         */
        seed: 12345
    },
    
    /**
     * Surface type parameters
     */
    surfaces: {
        /**
         * Surface type probabilities by height
         * These determine which surface type is assigned based on terrain height
         */
        heightProbabilities: {
            /**
             * Low areas (0-0.3 normalized height)
             */
            low: {
                [SurfaceType.SNOW]: 0.7,
                [SurfaceType.ICE]: 0.2,
                [SurfaceType.ROCK]: 0.1
            },
            
            /**
             * Medium areas (0.3-0.7 normalized height)
             */
            medium: {
                [SurfaceType.SNOW]: 0.5,
                [SurfaceType.ROCK]: 0.4,
                [SurfaceType.ICE]: 0.1
            },
            
            /**
             * High areas (0.7-1.0 normalized height)
             */
            high: {
                [SurfaceType.ROCK]: 0.6,
                [SurfaceType.SNOW]: 0.3,
                [SurfaceType.ICE]: 0.1
            }
        },
        
        /**
         * Surface type probabilities by slope
         * These determine which surface type is assigned based on terrain slope
         */
        slopeProbabilities: {
            /**
             * Flat areas (0-15 degrees)
             */
            flat: {
                [SurfaceType.SNOW]: 0.7,
                [SurfaceType.ICE]: 0.2,
                [SurfaceType.ROCK]: 0.1
            },
            
            /**
             * Medium slopes (15-30 degrees)
             */
            medium: {
                [SurfaceType.SNOW]: 0.6,
                [SurfaceType.ICE]: 0.3,
                [SurfaceType.ROCK]: 0.1
            },
            
            /**
             * Steep slopes (30-45 degrees)
             */
            steep: {
                [SurfaceType.SNOW]: 0.4,
                [SurfaceType.ICE]: 0.5,
                [SurfaceType.ROCK]: 0.1
            },
            
            /**
             * Very steep slopes (45+ degrees)
             */
            verysteep: {
                [SurfaceType.ROCK]: 0.7,
                [SurfaceType.ICE]: 0.2,
                [SurfaceType.SNOW]: 0.1
            }
        }
    },
    
    /**
     * Visual parameters
     */
    visual: {
        /**
         * Surface colors for visualization
         */
        surfaceColors: {
            [SurfaceType.DEFAULT]: { r: 0.5, g: 0.5, b: 0.5 }, // Gray
            [SurfaceType.SNOW]: { r: 0.9, g: 0.9, b: 0.95 },   // White
            [SurfaceType.ICE]: { r: 0.8, g: 0.9, b: 1.0 },     // Light blue
            [SurfaceType.ROCK]: { r: 0.6, g: 0.5, b: 0.4 },    // Brown
            [SurfaceType.METAL]: { r: 0.7, g: 0.7, b: 0.8 }    // Silver
        },
        
        /**
         * Whether to show surface colors
         */
        showSurfaceColors: true,
        
        /**
         * Whether to show wireframe
         */
        showWireframe: false
    },
    
    /**
     * Forest map specific settings
     */
    forestMap: {
        /**
         * Dimensions
         */
        dimensions: {
            width: 800,
            depth: 800,
            maxHeight: 150
        },
        
        /**
         * Noise parameters
         */
        noise: {
            octaves: 5,
            persistence: 0.6,
            scale: 0.008,
            seed: 54321
        },
        
        /**
         * Surface distribution
         */
        surfaceDistribution: {
            [SurfaceType.SNOW]: 0.6,
            [SurfaceType.ICE]: 0.2,
            [SurfaceType.ROCK]: 0.2
        },
        
        /**
         * Features
         */
        features: {
            /**
             * Number of ski paths
             */
            skiPaths: 3,
            
            /**
             * Number of jumps
             */
            jumps: 5,
            
            /**
             * Number of valleys
             */
            valleys: 2
        }
    }
}; 