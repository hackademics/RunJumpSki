/**
 * @file src/core/physics/SpatialPartitioningCollisionSystem.ts
 * @description Optimized collision detection system using spatial partitioning
 * 
 * @dependencies ICollisionSystem.ts, SpatialPartitioning.ts
 * @relatedFiles CollisionSystem.ts, SpatialPartitioning.ts
 */

import * as BABYLON from 'babylonjs';
import { CollisionSystem } from './CollisionSystem';
import { IPhysicsSystem } from './IPhysicsSystem';
import { SpatialPartitioning, SpatialPartitioningOptions } from '../ecs/SpatialPartitioning';
import { CollisionInfo, CollisionFilter } from './ICollisionSystem';
import { IEntity } from '../ecs/IEntity';
import { Logger } from '../utils/Logger';
import { ServiceLocator } from '../base/ServiceLocator';

/**
 * Configuration options for the spatial partitioning collision system
 */
export interface SpatialPartitioningCollisionSystemOptions {
  /** Size of each grid cell in the spatial partitioning grid */
  cellSize: number;
  /** Maximum number of objects per cell before subdivision */
  maxObjectsPerCell: number;
  /** Whether to use spatial partitioning or standard collision detection */
  useSpatialPartitioning: boolean;
  /** Maximum subdivision depth for spatial partitioning */
  maxSubdivisionDepth: number;
  /** Whether to optimize collision checks based on object velocity */
  velocityBasedOptimization: boolean;
  /** Whether to use simplified collision shapes for distant objects */
  useSimplifiedDistantCollisions: boolean;
  /** Distance threshold for simplified collision shapes */
  simplifiedCollisionDistance: number;
  /** Whether to use adaptive grid updates based on scene changes */
  useAdaptiveUpdating?: boolean;
  /** Threshold for adaptive updates (proportion of moved objects needed to trigger update) */
  adaptiveUpdateThreshold?: number;
  /** Whether to use frustum culling to optimize collision checks */
  useFrustumCulling?: boolean;
  /** Interval (in ms) between spatial grid full updates */
  spatialGridUpdateInterval?: number;
  /** Factor by which to expand the grid beyond object bounds */
  gridExpansionFactor?: number;
  /** Whether to visualize the broad phase of collision detection */
  visualizeBroadPhase?: boolean;
  /** Whether to visualize the spatial grid for debugging */
  visualize?: boolean;
}

/**
 * Default options for spatial partitioning collision system
 */
export const DEFAULT_SPATIAL_PARTITIONING_OPTIONS: SpatialPartitioningCollisionSystemOptions = {
  cellSize: 50,
  maxObjectsPerCell: 10,
  useSpatialPartitioning: true,
  maxSubdivisionDepth: 5,
  velocityBasedOptimization: true,
  useSimplifiedDistantCollisions: true,
  simplifiedCollisionDistance: 100,
  useAdaptiveUpdating: true,
  adaptiveUpdateThreshold: 0.5,
  useFrustumCulling: true,
  spatialGridUpdateInterval: 1000,
  gridExpansionFactor: 1.2,
  visualizeBroadPhase: false,
  visualize: false
};

/**
 * Performance level for the collision system
 */
export enum CollisionPerformanceLevel {
  ULTRA = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  VERY_LOW = 4
}

/**
 * Entity wrapper that holds physics impostor for spatial partitioning
 */
interface PhysicsEntity extends IEntity {
  impostor: BABYLON.PhysicsImpostor;
  id: string;
  getComponent<T>(componentType: string): T | undefined;
  addComponent<T>(component: T): T;
  removeComponent(componentType: string): boolean;
  update(deltaTime: number): void;
  dispose(): void;
}

/**
 * Enhanced collision system implementation that uses spatial partitioning
 * for optimized broad-phase collision detection
 */
export class SpatialPartitioningCollisionSystem extends CollisionSystem {
  private spatialPartitioning: SpatialPartitioning;
  private options: SpatialPartitioningCollisionSystemOptions;
  private impostorToPositionMap: Map<BABYLON.PhysicsImpostor, BABYLON.Vector3> = new Map();
  private lastSpatialUpdateTime: number = 0;
  private broadPhaseVisualization: BABYLON.Mesh[] = [];
  private scene: BABYLON.Scene | null = null;
  private activeCamera: BABYLON.Camera | null = null;
  private frustumPlanes: BABYLON.Plane[] = [];
  private impostorMovementMap: Map<BABYLON.PhysicsImpostor, number> = new Map();
  private needsFullUpdate: boolean = true;
  private logger: Logger;
  private grid: Map<string, BABYLON.AbstractMesh[]> = new Map();
  private currentPerformanceLevel: CollisionPerformanceLevel = CollisionPerformanceLevel.HIGH;
  private adaptiveQuality: boolean = false;
  private lastAdaptiveCheck: number = 0;
  private adaptiveCheckInterval: number = 2000; // ms

  /**
   * Creates a new collision system with spatial partitioning optimization
   * @param options Configuration options for spatial partitioning
   */
  constructor(options: Partial<SpatialPartitioningCollisionSystemOptions> = {}) {
    super();
    this.options = { ...DEFAULT_SPATIAL_PARTITIONING_OPTIONS, ...options };
    this.spatialPartitioning = new SpatialPartitioning({
      cellSize: this.options.cellSize,
      maxEntitiesPerCell: this.options.maxObjectsPerCell,
      maxDepth: this.options.maxSubdivisionDepth,
      visualize: false
    });
    this.impostorToPositionMap = new Map();
    this.impostorMovementMap = new Map();
    
    // Initialize logger
    this.logger = new Logger('SpatialPartitioningCollisionSystem');
    
    // Try to get the logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        this.logger.addTag('SpatialPartitioningCollisionSystem');
      }
    } catch (e) {
      // Use default logger if unavailable
    }
  }

  /**
   * Initializes the collision system with the physics system
   * @param physicsSystem The physics system to use
   */
  public override initialize(physicsSystem: IPhysicsSystem): void {
    super.initialize(physicsSystem);
    
    // Get the scene from the physics system 
    // We need to cast since not all IPhysicsSystem implementations have getScene
    const physicsSystemInstance = physicsSystem as unknown as { getScene: () => BABYLON.Scene };
    if (typeof physicsSystemInstance.getScene === 'function') {
      this.scene = physicsSystemInstance.getScene();
      
      // Get the active camera
      if (this.scene) {
        this.activeCamera = this.scene.activeCamera;
        
        // Listen for camera changes
        this.scene.onActiveCameraChanged.add(() => {
          this.activeCamera = this.scene?.activeCamera || null;
          this.updateFrustumPlanes();
        });
      }
    }
    
    // Initialize spatial partitioning with the scene
    if (this.scene) {
      this.spatialPartitioning.initialize(this.scene);
      this.updateFrustumPlanes();
    }
    
    this.logger.debug("SpatialPartitioningCollisionSystem initialized");
  }

  /**
   * Updates the collision detection system
   * @param deltaTime Time elapsed since the last update
   */
  public override update(deltaTime: number): void {
    // Update the spatial grid periodically
    this.lastSpatialUpdateTime += deltaTime * 1000; // Convert to ms
    
    // Clear previous visualizations if enabled
    if (this.options.useSpatialPartitioning) {
      this.clearBroadPhaseVisualization();
    }
    
    let updateGrid = false;
    
    // Check if it's time for a scheduled update
    if (this.lastSpatialUpdateTime >= (this.options.spatialGridUpdateInterval || 1000)) {
      updateGrid = true;
    }
    
    // If adaptive updating is enabled, check if any objects moved significantly
    if (this.options.useAdaptiveUpdating && !updateGrid) {
      updateGrid = this.checkForSignificantMovement();
    }
    
    // Update frustum planes if camera moved and we're using frustum culling
    if (this.options.useFrustumCulling && this.activeCamera) {
      // Always update frustum planes when using frustum culling since camera might have moved
      this.updateFrustumPlanes();
    }
    
    // Update the spatial grid if needed
    if (updateGrid) {
      this.updateSpatialGrid();
      this.lastSpatialUpdateTime = 0;
      this.needsFullUpdate = false;
    }
    
    // If spatial partitioning is enabled, use it for optimized collision detection
    if (this.options.useSpatialPartitioning) {
      this.performSpatialCollisionDetection();
    } else {
      // Fall back to base implementation
      super.update(deltaTime);
    }
  }

  /**
   * Check if any important objects have moved significantly
   */
  private checkForSignificantMovement(): boolean {
    let significantMovement = false;
    
    // Skip if there's no scene or the need for a full update is already determined
    if (!this.scene || this.needsFullUpdate) {
      return true;
    }
    
    // Get all physics impostors in the scene
    const physicsEngine = this.scene.getPhysicsEngine();
    if (!physicsEngine) {
      return false;
    }
    
    // Use a type assertion for the physics engine to access getImpostors
    const impostors: BABYLON.PhysicsImpostor[] = 
      (physicsEngine as any).getImpostors ? 
      (physicsEngine as any).getImpostors() : 
      [];
      
    const threshold = this.options.adaptiveUpdateThreshold || 0.5;
    
    // Check if any important objects moved significantly
    for (const impostor of impostors) {
      if (!impostor.object) continue;
      
      const currentPosition = this.getImpostorPosition(impostor);
      const lastPosition = this.impostorToPositionMap.get(impostor);
      
      if (lastPosition) {
        const distance = BABYLON.Vector3.Distance(currentPosition, lastPosition);
        
        // Update tracking of how much this object has moved
        const totalMovement = (this.impostorMovementMap.get(impostor) || 0) + distance;
        this.impostorMovementMap.set(impostor, totalMovement);
        
        // If this object has moved more than our threshold, we need an update
        if (totalMovement > threshold) {
          significantMovement = true;
          break;
        }
      }
    }
    
    return significantMovement;
  }
  
  /**
   * Updates the spatial grid with current object positions
   */
  private updateSpatialGrid(): void {
    // Skip if there's no scene
    if (!this.scene) {
      return;
    }
    
    // Clear existing spatial data
    this.spatialPartitioning.clear();
    this.impostorToPositionMap.clear();
    this.impostorMovementMap.clear();
    
    // Get all physics impostors in the scene
    const physicsEngine = this.scene.getPhysicsEngine();
    if (!physicsEngine) {
      return;
    }
    
    // Use a type assertion for the physics engine to access getImpostors
    const impostors: BABYLON.PhysicsImpostor[] = 
      (physicsEngine as any).getImpostors ? 
      (physicsEngine as any).getImpostors() : 
      [];
    
    // Add each impostor to the spatial partitioning
    for (const impostor of impostors) {
      if (!impostor.object) continue;
      
      const position = this.getImpostorPosition(impostor);
      const boundingInfo = this.getImpostorBoundingInfo(impostor);
      
      if (boundingInfo) {
        // Store current position for movement tracking
        this.impostorToPositionMap.set(impostor, position.clone());
        
        // Reset movement tracking
        this.impostorMovementMap.set(impostor, 0);
        
        // Calculate bounds for spatial partitioning
        const minPoint = boundingInfo.min;
        const maxPoint = boundingInfo.max;
        
        // Skip frustum culled objects if enabled
        if (this.options.useFrustumCulling && !this.isInFrustum(boundingInfo)) {
          continue;
        }
        
        // Create a wrapper entity that conforms to IEntity for spatial partitioning
        const entity: PhysicsEntity = {
          id: this.getImpostorId(impostor),
          getComponent: <T>(componentType: string): T | undefined => undefined,
          addComponent: <T>(component: T): T => component,
          removeComponent: (componentType: string): boolean => false,
          update: (deltaTime: number): void => {},
          dispose: (): void => {},
          impostor: impostor
        };
        
        // Add to spatial partitioning
        this.spatialPartitioning.insertEntity(entity, position);
      }
    }
  }

  /**
   * Updates the frustum planes based on the current camera
   */
  private updateFrustumPlanes(): void {
    if (this.scene && this.activeCamera) {
      // Extract frustum planes from the current camera view
      const matrix = this.activeCamera.getTransformationMatrix();
      if (matrix) {
        // For TypeScript compatibility, we'll extract the frustum planes manually
        // instead of using the static GetPlanes method which has type issues
        this.frustumPlanes = [];
        
        // Extract the planes from the camera's view projection matrix
        const viewProjection = matrix.clone();
        if (this.activeCamera.getProjectionMatrix) {
          const projection = this.activeCamera.getProjectionMatrix();
          viewProjection.multiplyToRef(projection, viewProjection);
        }
        
        // Near plane
        this.frustumPlanes.push(new BABYLON.Plane(
          viewProjection.m[3] + viewProjection.m[2],
          viewProjection.m[7] + viewProjection.m[6],
          viewProjection.m[11] + viewProjection.m[10],
          viewProjection.m[15] + viewProjection.m[14]
        ).normalize());
        
        // Far plane
        this.frustumPlanes.push(new BABYLON.Plane(
          viewProjection.m[3] - viewProjection.m[2],
          viewProjection.m[7] - viewProjection.m[6],
          viewProjection.m[11] - viewProjection.m[10],
          viewProjection.m[15] - viewProjection.m[14]
        ).normalize());
        
        // Left plane
        this.frustumPlanes.push(new BABYLON.Plane(
          viewProjection.m[3] + viewProjection.m[0],
          viewProjection.m[7] + viewProjection.m[4],
          viewProjection.m[11] + viewProjection.m[8],
          viewProjection.m[15] + viewProjection.m[12]
        ).normalize());
        
        // Right plane
        this.frustumPlanes.push(new BABYLON.Plane(
          viewProjection.m[3] - viewProjection.m[0],
          viewProjection.m[7] - viewProjection.m[4],
          viewProjection.m[11] - viewProjection.m[8],
          viewProjection.m[15] - viewProjection.m[12]
        ).normalize());
        
        // Top plane
        this.frustumPlanes.push(new BABYLON.Plane(
          viewProjection.m[3] - viewProjection.m[1],
          viewProjection.m[7] - viewProjection.m[5],
          viewProjection.m[11] - viewProjection.m[9],
          viewProjection.m[15] - viewProjection.m[13]
        ).normalize());
        
        // Bottom plane
        this.frustumPlanes.push(new BABYLON.Plane(
          viewProjection.m[3] + viewProjection.m[1],
          viewProjection.m[7] + viewProjection.m[5],
          viewProjection.m[11] + viewProjection.m[9],
          viewProjection.m[15] + viewProjection.m[13]
        ).normalize());
      }
    }
  }
  
  /**
   * Check if a bounding box is in the camera frustum
   */
  private isInFrustum(boundingInfo: { min: BABYLON.Vector3, max: BABYLON.Vector3 }): boolean {
    if (!this.activeCamera || this.frustumPlanes.length === 0) {
      return true;
    }
    
    // Create bounding box corners
    const corners = [
      new BABYLON.Vector3(boundingInfo.min.x, boundingInfo.min.y, boundingInfo.min.z),
      new BABYLON.Vector3(boundingInfo.max.x, boundingInfo.min.y, boundingInfo.min.z),
      new BABYLON.Vector3(boundingInfo.min.x, boundingInfo.max.y, boundingInfo.min.z),
      new BABYLON.Vector3(boundingInfo.max.x, boundingInfo.max.y, boundingInfo.min.z),
      new BABYLON.Vector3(boundingInfo.min.x, boundingInfo.min.y, boundingInfo.max.z),
      new BABYLON.Vector3(boundingInfo.max.x, boundingInfo.min.y, boundingInfo.max.z),
      new BABYLON.Vector3(boundingInfo.min.x, boundingInfo.max.y, boundingInfo.max.z),
      new BABYLON.Vector3(boundingInfo.max.x, boundingInfo.max.y, boundingInfo.max.z)
    ];
    
    // Check if any corner is in the frustum
    for (const plane of this.frustumPlanes) {
      let allOut = true;
      
      for (const corner of corners) {
        // Dot product for point-plane distance
        if (plane.signedDistanceTo(corner) >= 0) {
          allOut = false;
          break;
        }
      }
      
      if (allOut) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Gets a unique ID for an impostor
   */
  private getImpostorId(impostor: BABYLON.PhysicsImpostor): string {
    // Use the mesh's unique id if available
    if (impostor.object && 'uniqueId' in impostor.object) {
      return (impostor.object as any).uniqueId.toString();
    }
    
    // Fallback to a random ID
    return Math.random().toString();
  }

  /**
   * Gets an impostor's position
   */
  private getImpostorPosition(impostor: BABYLON.PhysicsImpostor): BABYLON.Vector3 {
    if (!impostor.object) {
      return new BABYLON.Vector3(0, 0, 0);
    }
    
    const mesh = impostor.object as BABYLON.AbstractMesh;
    return mesh.getAbsolutePosition();
  }

  /**
   * Performs spatial partitioning-based collision detection
   */
  private performSpatialCollisionDetection(): void {
    // Find potential collision pairs using spatial partitioning
    const potentialCollisions = this.findPotentialCollisions();
    
    // Process potential collisions
    for (const pair of potentialCollisions) {
      const [impostorA, impostorB] = pair;
      
      // Skip if they're the same object
      if (impostorA === impostorB) continue;
      
      // Visualize the potential collision pair if enabled
      if (this.options.visualizeBroadPhase) {
        this.visualizePotentialCollision(impostorA, impostorB);
      }
      
      // Perform narrow phase collision detection
      if (this.areColliding(impostorA, impostorB)) {
        // Create collision info
        const collisionPoint = this.estimateCollisionPointCustom(impostorA, impostorB);
        const normal = this.estimateCollisionNormal(impostorA, impostorB);
        const collisionInfo: CollisionInfo = {
          initiator: impostorA,
          collider: impostorB,
          point: collisionPoint,
          normal: normal,
          impulse: 0 // Estimated impulse, not accurate
        };
        
        // Notify handlers
        this.notifyCollisionHandlers(impostorA, impostorB, collisionInfo);
        
        // Check for trigger volume collisions
        this.checkTriggerVolumes(impostorA, impostorB, collisionInfo);
      }
    }
  }

  /**
   * Estimates the point of collision between two objects.
   * This reimplements the functionality of the private method in CollisionSystem.
   */
  private estimateCollisionPointCustom(objectA: BABYLON.PhysicsImpostor, objectB: BABYLON.PhysicsImpostor): BABYLON.Vector3 {
    // Simplified implementation - in reality, we should get this from the physics engine
    if (!objectA.object || !objectB.object) return new BABYLON.Vector3(0, 0, 0);
    
    const meshA = objectA.object as BABYLON.AbstractMesh;
    const meshB = objectB.object as BABYLON.AbstractMesh;
    
    // Calculate center points
    const centerA = meshA.getBoundingInfo().boundingBox.centerWorld;
    const centerB = meshB.getBoundingInfo().boundingBox.centerWorld;
    
    // Return the midpoint as an estimate
    return BABYLON.Vector3.Center(centerA, centerB);
  }

  /**
   * Finds potential collision pairs using spatial partitioning
   * @returns Array of potential collision pairs [impostorA, impostorB]
   */
  private findPotentialCollisions(): Array<[BABYLON.PhysicsImpostor, BABYLON.PhysicsImpostor]> {
    const potentialPairs: Array<[BABYLON.PhysicsImpostor, BABYLON.PhysicsImpostor]> = [];
    const processedPairs = new Set<string>();
    
    // For each impostor, query nearby impostors
    this.impostorToPositionMap.forEach((position, impostor) => {
      // Get the bounding box of the impostor
      const boundingInfo = this.getImpostorBoundingInfo(impostor);
      if (!boundingInfo) return;
      
      // Query spatial partitioning for entities in this area
      const nearbyEntities = this.spatialPartitioning.queryAABB(
        boundingInfo.min,
        boundingInfo.max
      );
      
      // For each nearby entity, create a potential collision pair
      for (const entity of nearbyEntities) {
        // Cast to our PhysicsEntity type which we know has the impostor property
        const physicsEntity = entity as PhysicsEntity;
        if (!physicsEntity.impostor) continue;
        
        const otherImpostor = physicsEntity.impostor;
        
        // Skip if it's the same impostor
        if (impostor === otherImpostor) continue;
        
        // Create a unique pair ID to avoid duplicates
        const pairId = this.createPairId(impostor, otherImpostor);
        
        // Skip if we've already processed this pair
        if (processedPairs.has(pairId)) continue;
        
        // Add to potential collisions
        potentialPairs.push([impostor, otherImpostor]);
        
        // Mark as processed
        processedPairs.add(pairId);
      }
    });
    
    return potentialPairs;
  }

  /**
   * Creates a unique ID for a collision pair
   */
  private createPairId(impostorA: BABYLON.PhysicsImpostor, impostorB: BABYLON.PhysicsImpostor): string {
    const idA = this.getImpostorId(impostorA);
    const idB = this.getImpostorId(impostorB);
    
    // Sort IDs to ensure the same pair always gets the same ID regardless of order
    return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
  }

  /**
   * Gets the bounding info for an impostor
   */
  private getImpostorBoundingInfo(impostor: BABYLON.PhysicsImpostor): { min: BABYLON.Vector3, max: BABYLON.Vector3 } | null {
    if (!impostor.object) return null;
    
    const mesh = impostor.object as BABYLON.AbstractMesh;
    const boundingInfo = mesh.getBoundingInfo();
    
    if (!boundingInfo) return null;
    
    return {
      min: boundingInfo.boundingBox.minimumWorld,
      max: boundingInfo.boundingBox.maximumWorld
    };
  }

  /**
   * Notifies registered collision handlers about a collision
   */
  private notifyCollisionHandlers(
    impostorA: BABYLON.PhysicsImpostor, 
    impostorB: BABYLON.PhysicsImpostor, 
    collisionInfo: CollisionInfo
  ): void {
    // Check all registered handlers
    for (const handler of this.getCollisionHandlers()) {
      // Skip if handler isn't active
      if (!handler || !handler.callback) continue;
      
      // Check if this collision pair matches the handler's criteria
      const matchesA = this.impostorMatchesHandlerCriteria(impostorA, handler.objectA);
      const matchesB = !handler.objectB || this.impostorMatchesHandlerCriteria(impostorB, handler.objectB);
      
      if (matchesA && matchesB) {
        // Call the handler
        handler.callback(collisionInfo);
      }
    }
  }

  /**
   * Checks if an impostor matches handler criteria
   */
  private impostorMatchesHandlerCriteria(
    impostor: BABYLON.PhysicsImpostor, 
    criteria: BABYLON.PhysicsImpostor | BABYLON.PhysicsImpostor[]
  ): boolean {
    if (Array.isArray(criteria)) {
      return criteria.includes(impostor);
    } else {
      return criteria === impostor;
    }
  }

  /**
   * Checks for trigger volume collisions
   */
  private checkTriggerVolumes(
    impostorA: BABYLON.PhysicsImpostor, 
    impostorB: BABYLON.PhysicsImpostor, 
    collisionInfo: CollisionInfo
  ): void {
    // Check all registered trigger zones
    for (const triggerZone of this.getTriggerZones()) {
      // Skip if not active
      if (!triggerZone || !triggerZone.triggerVolume) continue;
      
      // Check if either impostor is the trigger volume
      const isTriggerA = triggerZone.triggerVolume === impostorA;
      const isTriggerB = triggerZone.triggerVolume === impostorB;
      
      if (isTriggerA || isTriggerB) {
        // Determine which one is the trigger and which is the collider
        const triggerImpostor = isTriggerA ? impostorA : impostorB;
        const otherImpostor = isTriggerA ? impostorB : impostorA;
        
        // Check if it passes the filter
        if (this.passesCustomFilter(otherImpostor, triggerZone.filter)) {
          const collisionId = this.createPairId(triggerImpostor, otherImpostor);
          const wasColliding = this.isActiveTriggerCollision(triggerZone.id, collisionId);
          
          // Handle existing collision
          if (wasColliding) {
            // Call onStay callback if provided
            if (triggerZone.onStay) {
              triggerZone.onStay(collisionInfo);
            }
          } else {
            // New collision, call onEnter and add to active list
            if (triggerZone.onEnter) {
              triggerZone.onEnter(collisionInfo);
            }
            this.addActiveTriggerCollision(triggerZone.id, collisionId);
          }
        }
      }
    }
  }

  /**
   * Checks if an impostor passes a collision filter
   * This is our own implementation since the parent's method is private
   */
  private passesCustomFilter(impostor: BABYLON.PhysicsImpostor, filter?: CollisionFilter): boolean {
    if (!filter) return true;
    
    // Get tags from the mesh metadata
    const mesh = impostor.object as BABYLON.AbstractMesh;
    const tags: string[] = mesh?.metadata?.tags || [];
    
    // Check include tags
    if (filter.includeTags && filter.includeTags.length > 0) {
      const hasIncludedTag = filter.includeTags.some(tag => tags.includes(tag));
      if (!hasIncludedTag) return false;
    }
    
    // Check exclude tags
    if (filter.excludeTags && filter.excludeTags.length > 0) {
      const hasExcludedTag = filter.excludeTags.some(tag => tags.includes(tag));
      if (hasExcludedTag) return false;
    }
    
    // Check custom filter function
    if (filter.filterFunction && !filter.filterFunction(impostor)) {
      return false;
    }
    
    return true;
  }

  /**
   * Visualizes a potential collision pair for debugging
   */
  private visualizePotentialCollision(impostorA: BABYLON.PhysicsImpostor, impostorB: BABYLON.PhysicsImpostor): void {
    if (!this.scene) return;
    
    const posA = this.getImpostorPosition(impostorA);
    const posB = this.getImpostorPosition(impostorB);
    
    // Create a line to connect the objects
    const lines = BABYLON.MeshBuilder.CreateLines(
      "broadphase_line",
      { points: [posA, posB] },
      this.scene
    );
    
    // Set color (yellow for broad phase)
    lines.color = new BABYLON.Color3(1, 1, 0);
    
    // Add to visualization list for cleanup
    this.broadPhaseVisualization.push(lines);
  }

  /**
   * Clears the broad phase visualization
   */
  private clearBroadPhaseVisualization(): void {
    for (const mesh of this.broadPhaseVisualization) {
      mesh.dispose();
    }
    this.broadPhaseVisualization = [];
  }

  /**
   * Estimates the collision normal between two objects
   */
  private estimateCollisionNormal(objectA: BABYLON.PhysicsImpostor, objectB: BABYLON.PhysicsImpostor): BABYLON.Vector3 {
    const posA = this.getImpostorPosition(objectA);
    const posB = this.getImpostorPosition(objectB);
    
    // Direction from B to A
    const normal = posA.subtract(posB);
    
    // Normalize to get direction vector
    if (normal.length() > 0) {
      normal.normalize();
    } else {
      // If objects are exactly at same position, use Y-axis as default
      normal.set(0, 1, 0);
    }
    
    return normal;
  }

  /**
   * Destroys the collision system and cleans up resources
   */
  public override dispose(): void {
    // Clear visualizations
    this.clearBroadPhaseVisualization();
    
    // Clear maps
    this.impostorToPositionMap.clear();
    
    super.dispose();
  }

  // The following methods are for internal testing/debugging
  
  /**
   * Gets the internal spatial partitioning instance
   * @internal 
   */
  public getSpatialPartitioning(): SpatialPartitioning {
    return this.spatialPartitioning;
  }
  
  /**
   * Sets whether to use spatial partitioning
   * @param use Whether to use spatial partitioning
   * @internal
   */
  public setUseSpatialPartitioning(use: boolean): void {
    this.options.useSpatialPartitioning = use;
  }
  
  /**
   * Gets collision handlers - abstracted to support unit testing
   * @internal
   */
  protected getCollisionHandlers(): Array<any> {
    // TypeScript doesn't know about the private property in the base class
    // so we need to use a type assertion to access it
    const self = this as any;
    return self.collisionHandlers || [];
  }
  
  /**
   * Gets trigger zones - abstracted to support unit testing
   * @internal
   */
  protected getTriggerZones(): Array<any> {
    // TypeScript doesn't know about the private property in the base class
    // so we need to use a type assertion to access it
    const self = this as any;
    return self.triggerZones || [];
  }
  
  /**
   * Checks if a trigger collision is active
   * @param triggerId Trigger ID
   * @param collisionId Collision ID
   * @returns True if the collision is active
   */
  protected isActiveTriggerCollision(triggerId: string, collisionId: string): boolean {
    // TypeScript doesn't know about the private property in the base class
    // so we need to use a type assertion to access it
    const self = this as any;
    const activeTriggerCollisions = self.activeTriggerCollisions || new Map();
    return activeTriggerCollisions.has(`${triggerId}-${collisionId}`);
  }
  
  /**
   * Adds an active trigger collision - abstracted to support unit testing
   * @internal
   */
  protected addActiveTriggerCollision(triggerId: string, collisionId: string): void {
    // TypeScript doesn't know about the private property in the base class
    // so we need to use a type assertion to access it
    const self = this as any;
    if (self.activeTriggerCollisions) {
      self.activeTriggerCollisions.set(`${triggerId}-${collisionId}`, true);
    }
  }
} 
