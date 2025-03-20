/**
 * Options for the SpatialPartitioningCollisionSystem
 */
export interface SpatialPartitioningCollisionSystemOptions {
    /**
     * Cell size for the spatial grid
     */
    cellSize: number;
    
    /**
     * Maximum number of objects per cell before subdivision
     */
    maxObjectsPerCell: number;
    
    /**
     * Whether to use spatial partitioning or standard collision detection
     */
    useSpatialPartitioning: boolean;
    
    /**
     * Maximum subdivision depth for spatial partitioning
     */
    maxSubdivisionDepth: number;
    
    /**
     * Whether to optimize collision checks based on object velocity
     */
    velocityBasedOptimization: boolean;
    
    /**
     * Whether to use simplified collision shapes for distant objects
     */
    useSimplifiedDistantCollisions: boolean;
    
    /**
     * Distance threshold for simplified collision shapes
     */
    simplifiedCollisionDistance: number;
    
    /**
     * Whether to use adaptive grid updates based on scene changes
     */
    useAdaptiveUpdating?: boolean;
    
    /**
     * Threshold for adaptive updates (proportion of moved objects needed to trigger update)
     */
    adaptiveUpdateThreshold?: number;
    
    /**
     * Whether to use frustum culling to optimize collision checks
     */
    useFrustumCulling?: boolean;
    
    /**
     * Interval (in ms) between spatial grid full updates
     */
    spatialGridUpdateInterval?: number;
    
    /**
     * Factor by which to expand the grid beyond object bounds
     */
    gridExpansionFactor?: number;
    
    /**
     * Whether to visualize the broad phase of collision detection
     */
    visualizeBroadPhase?: boolean;
    
    /**
     * Whether to visualize the spatial grid for debugging
     */
    visualize?: boolean;
} 