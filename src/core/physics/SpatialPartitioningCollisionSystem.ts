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

/**
 * Options for configuring the spatial partitioning collision system
 */
export interface SpatialPartitioningCollisionOptions extends SpatialPartitioningOptions {
  /**
   * Whether to use spatial partitioning for broad phase collision detection
   * Can be disabled for debug purposes to compare performance
   */
  useSpatialPartitioning: boolean;
  
  /**
   * Whether to visualize potential collision pairs during the broad phase
   */
  visualizeBroadPhase: boolean;
  
  /**
   * How frequently (in ms) to update the spatial grid with object positions
   * Lower values provide more accuracy but higher CPU cost
   */
  spatialGridUpdateInterval: number;
}

/**
 * Default options for spatial partitioning collision system
 */
export const DEFAULT_SPATIAL_COLLISION_OPTIONS: SpatialPartitioningCollisionOptions = {
  cellSize: 20,
  maxEntitiesPerCell: 10,
  maxDepth: 5,
  visualize: false,
  useSpatialPartitioning: true,
  visualizeBroadPhase: false,
  spatialGridUpdateInterval: 100 // Update spatial grid every 100ms
};

/**
 * Entity wrapper that holds physics impostor for spatial partitioning
 */
interface PhysicsEntity extends IEntity {
  impostor: BABYLON.PhysicsImpostor;
}

/**
 * Enhanced collision system implementation that uses spatial partitioning
 * for optimized broad-phase collision detection
 */
export class SpatialPartitioningCollisionSystem extends CollisionSystem {
  private spatialPartitioning: SpatialPartitioning;
  private options: SpatialPartitioningCollisionOptions;
  private impostorToPositionMap: Map<BABYLON.PhysicsImpostor, BABYLON.Vector3> = new Map();
  private lastSpatialUpdateTime: number = 0;
  private broadPhaseVisualization: BABYLON.Mesh[] = [];
  private scene: BABYLON.Scene | null = null;

  /**
   * Creates a new collision system with spatial partitioning optimization
   * @param options Configuration options for spatial partitioning
   */
  constructor(options: Partial<SpatialPartitioningCollisionOptions> = {}) {
    super();
    this.options = { ...DEFAULT_SPATIAL_COLLISION_OPTIONS, ...options };
    this.spatialPartitioning = new SpatialPartitioning({
      cellSize: this.options.cellSize,
      maxEntitiesPerCell: this.options.maxEntitiesPerCell,
      maxDepth: this.options.maxDepth,
      visualize: this.options.visualize
    });
    this.impostorToPositionMap = new Map();
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
    }
    
    // Initialize spatial partitioning with the scene
    if (this.scene) {
      this.spatialPartitioning.initialize(this.scene);
    }
  }

  /**
   * Updates the collision detection system
   * @param deltaTime Time elapsed since the last update
   */
  public override update(deltaTime: number): void {
    // Update the spatial grid periodically
    this.lastSpatialUpdateTime += deltaTime * 1000; // Convert to ms
    
    // Clear previous visualizations if enabled
    if (this.options.visualizeBroadPhase) {
      this.clearBroadPhaseVisualization();
    }
    
    // Update spatial grid if it's time
    if (this.lastSpatialUpdateTime >= this.options.spatialGridUpdateInterval) {
      this.updateSpatialGrid();
      this.lastSpatialUpdateTime = 0;
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
   * Updates the spatial grid with current object positions
   */
  private updateSpatialGrid(): void {
    // Clear the grid
    this.spatialPartitioning = new SpatialPartitioning({
      cellSize: this.options.cellSize,
      maxEntitiesPerCell: this.options.maxEntitiesPerCell,
      maxDepth: this.options.maxDepth,
      visualize: this.options.visualize
    });
    
    if (this.scene) {
      this.spatialPartitioning.initialize(this.scene);
    }
    
    // Get all physics impostors in the scene and add them to the grid
    if (this.scene && this.scene.physicsEnabled) {
      const physicsEngine = this.scene.getPhysicsEngine();
      if (physicsEngine) {
        const impostors = physicsEngine.getImpostors ? physicsEngine.getImpostors() : [];
        
        impostors.forEach(impostor => {
          const position = this.getImpostorPosition(impostor);
          this.impostorToPositionMap.set(impostor, position);
          
          // Create a wrapper entity that our spatial partitioning can use
          const entity: PhysicsEntity = {
            id: this.getImpostorId(impostor),
            impostor: impostor,
            getComponent: () => null,
            addComponent: () => null,
            removeComponent: () => {},
            update: () => {},
            dispose: () => {}
          };
          
          this.spatialPartitioning.insertEntity(entity, position);
        });
      }
    }
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
  public override destroy(): void {
    // Clear visualizations
    this.clearBroadPhaseVisualization();
    
    // Clear maps
    this.impostorToPositionMap.clear();
    
    super.destroy();
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
    // @ts-ignore - accessing private field for testing purposes
    return Array.from(this.collisionHandlers.values());
  }
  
  /**
   * Gets trigger zones - abstracted to support unit testing
   * @internal
   */
  protected getTriggerZones(): Array<any> {
    // @ts-ignore - accessing private field for testing purposes
    return Array.from(this.triggerZones.values());
  }
  
  /**
   * Checks if a collision is already active - abstracted to support unit testing
   * @internal
   */
  protected isActiveTriggerCollision(triggerId: string, collisionId: string): boolean {
    // @ts-ignore - accessing private field for testing purposes
    const collisions = this.activeTriggerCollisions.get(triggerId);
    return collisions ? collisions.has(collisionId) : false;
  }
  
  /**
   * Adds an active trigger collision - abstracted to support unit testing
   * @internal
   */
  protected addActiveTriggerCollision(triggerId: string, collisionId: string): void {
    // @ts-ignore - accessing private field for testing purposes
    let collisions = this.activeTriggerCollisions.get(triggerId);
    
    if (!collisions) {
      collisions = new Set<string>();
      // @ts-ignore - accessing private field for testing purposes
      this.activeTriggerCollisions.set(triggerId, collisions);
    }
    
    collisions.add(collisionId);
  }
} 