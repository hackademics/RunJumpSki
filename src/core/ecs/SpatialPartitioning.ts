/**
 * @file src/core/ecs/SpatialPartitioning.ts
 * @description Spatial partitioning system for efficiently querying entities by position
 */

import * as BABYLON from 'babylonjs';
import { IEntity } from './IEntity';

/**
 * Options for configuring the spatial partitioning system
 */
export interface SpatialPartitioningOptions {
  /** Width of a single cell */
  cellSize: number;
  /** Maximum number of entities per cell before subdivision (0 for no subdivision) */
  maxEntitiesPerCell: number;
  /** Maximum subdivision depth */
  maxDepth: number;
  /** Whether to visualize the grid for debugging */
  visualize: boolean;
}

/**
 * Default options for spatial partitioning
 */
export const DEFAULT_SPATIAL_PARTITIONING_OPTIONS: SpatialPartitioningOptions = {
  cellSize: 10,
  maxEntitiesPerCell: 10,
  maxDepth: 5,
  visualize: false
};

/**
 * Represents a 3D cell in the spatial grid
 */
export class SpatialCell {
  /** Entities contained in this cell */
  public entities: IEntity[] = [];
  /** 3D grid coordinate of this cell */
  public readonly gridX: number;
  public readonly gridY: number;
  public readonly gridZ: number;
  /** AABB for quick bounds checking */
  public readonly min: BABYLON.Vector3;
  public readonly max: BABYLON.Vector3;

  /**
   * Creates a new spatial cell
   * @param gridX X-coordinate of the cell in the grid
   * @param gridY Y-coordinate of the cell in the grid
   * @param gridZ Z-coordinate of the cell in the grid
   * @param size Size of the cell
   */
  constructor(gridX: number, gridY: number, gridZ: number, size: number) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.gridZ = gridZ;
    
    // Calculate world-space bounds of this cell
    this.min = new BABYLON.Vector3(
      gridX * size,
      gridY * size,
      gridZ * size
    );
    
    this.max = new BABYLON.Vector3(
      (gridX + 1) * size,
      (gridY + 1) * size,
      (gridZ + 1) * size
    );
  }

  /**
   * Check if this cell contains a position
   * @param position Position to check
   * @returns True if the position is within this cell
   */
  public containsPosition(position: BABYLON.Vector3): boolean {
    return (
      position.x >= this.min.x && position.x < this.max.x &&
      position.y >= this.min.y && position.y < this.max.y &&
      position.z >= this.min.z && position.z < this.max.z
    );
  }

  /**
   * Check if this cell intersects with an AABB
   * @param min Minimum point of the AABB
   * @param max Maximum point of the AABB
   * @returns True if the AABB intersects this cell
   */
  public intersectsAABB(min: BABYLON.Vector3, max: BABYLON.Vector3): boolean {
    return (
      this.min.x <= max.x && this.max.x >= min.x &&
      this.min.y <= max.y && this.max.y >= min.y &&
      this.min.z <= max.z && this.max.z >= min.z
    );
  }
}

/**
 * Spatial partitioning system for efficiently querying entities by position
 */
export class SpatialPartitioning {
  /** Map of cell coordinates to cell instances */
  private cells: Map<string, SpatialCell> = new Map();
  /** Map of entity IDs to their current cell keys */
  private entityCells: Map<string, string> = new Map();
  /** Configuration options */
  private options: SpatialPartitioningOptions;
  /** Debug visualization meshes */
  private debugMeshes: BABYLON.Mesh[] = [];
  /** Whether visualization is currently enabled */
  private visualizationEnabled: boolean = false;
  /** Scene for debug visualization */
  private scene: BABYLON.Scene | null = null;

  /**
   * Creates a new spatial partitioning system
   * @param options Configuration options
   */
  constructor(options: Partial<SpatialPartitioningOptions> = {}) {
    this.options = { ...DEFAULT_SPATIAL_PARTITIONING_OPTIONS, ...options };
    this.visualizationEnabled = this.options.visualize;
  }

  /**
   * Initialize the spatial partitioning system with a scene
   * @param scene Babylon.js scene for visualization
   */
  public initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
    
    // Create debug visualization if enabled
    if (this.visualizationEnabled) {
      this.createDebugVisualization();
    }
  }

  /**
   * Insert an entity into the spatial partitioning system
   * @param entity Entity to insert
   * @param position Entity's position
   */
  public insertEntity(entity: IEntity, position: BABYLON.Vector3): void {
    // Calculate grid coordinates
    const gridX = Math.floor(position.x / this.options.cellSize);
    const gridY = Math.floor(position.y / this.options.cellSize);
    const gridZ = Math.floor(position.z / this.options.cellSize);
    
    // Get or create the appropriate cell
    const cellKey = this.getCellKey(gridX, gridY, gridZ);
    let cell = this.cells.get(cellKey);
    
    if (!cell) {
      cell = new SpatialCell(gridX, gridY, gridZ, this.options.cellSize);
      this.cells.set(cellKey, cell);
    }
    
    // Remove from previous cell if needed
    const previousCellKey = this.entityCells.get(entity.id);
    if (previousCellKey && previousCellKey !== cellKey) {
      const previousCell = this.cells.get(previousCellKey);
      if (previousCell) {
        const index = previousCell.entities.findIndex(e => e.id === entity.id);
        if (index >= 0) {
          previousCell.entities.splice(index, 1);
        }
      }
    }
    
    // Add to new cell
    if (!cell.entities.some(e => e.id === entity.id)) {
      cell.entities.push(entity);
    }
    
    // Update entity cell mapping
    this.entityCells.set(entity.id, cellKey);
    
    // Update visualization if enabled
    if (this.visualizationEnabled) {
      this.updateDebugVisualization();
    }
  }

  /**
   * Remove an entity from the spatial partitioning system
   * @param entity Entity to remove
   */
  public removeEntity(entity: IEntity): void {
    const cellKey = this.entityCells.get(entity.id);
    if (cellKey) {
      const cell = this.cells.get(cellKey);
      if (cell) {
        const index = cell.entities.findIndex(e => e.id === entity.id);
        if (index >= 0) {
          cell.entities.splice(index, 1);
        }
      }
      this.entityCells.delete(entity.id);
    }
  }

  /**
   * Query entities within a radius of a point
   * @param position Center position of the query
   * @param radius Radius to search within
   * @returns Array of entities within the radius
   */
  public queryRadius(position: BABYLON.Vector3, radius: number): IEntity[] {
    const result: IEntity[] = [];
    const radiusSquared = radius * radius;
    
    // Find all cells that could intersect with the sphere
    const minGridX = Math.floor((position.x - radius) / this.options.cellSize);
    const maxGridX = Math.floor((position.x + radius) / this.options.cellSize);
    const minGridY = Math.floor((position.y - radius) / this.options.cellSize);
    const maxGridY = Math.floor((position.y + radius) / this.options.cellSize);
    const minGridZ = Math.floor((position.z - radius) / this.options.cellSize);
    const maxGridZ = Math.floor((position.z + radius) / this.options.cellSize);
    
    // Query each potentially intersecting cell
    for (let x = minGridX; x <= maxGridX; x++) {
      for (let y = minGridY; y <= maxGridY; y++) {
        for (let z = minGridZ; z <= maxGridZ; z++) {
          const cellKey = this.getCellKey(x, y, z);
          const cell = this.cells.get(cellKey);
          
          if (cell) {
            // Check each entity in the cell
            for (const entity of cell.entities) {
              // Get entity position - this assumes the entity has a position component
              // This should be adapted to your specific component system
              const entityPosition = this.getEntityPosition(entity);
              
              if (entityPosition) {
                // Check if within radius
                const distanceSquared = BABYLON.Vector3.DistanceSquared(position, entityPosition);
                if (distanceSquared <= radiusSquared) {
                  // Avoid duplicates
                  if (!result.some(e => e.id === entity.id)) {
                    result.push(entity);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Query entities within an axis-aligned bounding box
   * @param min Minimum point of the AABB
   * @param max Maximum point of the AABB
   * @returns Array of entities within the AABB
   */
  public queryAABB(min: BABYLON.Vector3, max: BABYLON.Vector3): IEntity[] {
    const result: IEntity[] = [];
    
    // Find all cells that could intersect with the AABB
    const minGridX = Math.floor(min.x / this.options.cellSize);
    const maxGridX = Math.floor(max.x / this.options.cellSize);
    const minGridY = Math.floor(min.y / this.options.cellSize);
    const maxGridY = Math.floor(max.y / this.options.cellSize);
    const minGridZ = Math.floor(min.z / this.options.cellSize);
    const maxGridZ = Math.floor(max.z / this.options.cellSize);
    
    // Query each potentially intersecting cell
    for (let x = minGridX; x <= maxGridX; x++) {
      for (let y = minGridY; y <= maxGridY; y++) {
        for (let z = minGridZ; z <= maxGridZ; z++) {
          const cellKey = this.getCellKey(x, y, z);
          const cell = this.cells.get(cellKey);
          
          if (cell) {
            // Check each entity in the cell
            for (const entity of cell.entities) {
              // Get entity AABB - this should be adapted to your specific component system
              const entityBounds = this.getEntityBounds(entity);
              
              if (entityBounds) {
                // Check if AABBs intersect
                if (
                  entityBounds.min.x <= max.x && entityBounds.max.x >= min.x &&
                  entityBounds.min.y <= max.y && entityBounds.max.y >= min.y &&
                  entityBounds.min.z <= max.z && entityBounds.max.z >= min.z
                ) {
                  // Avoid duplicates
                  if (!result.some(e => e.id === entity.id)) {
                    result.push(entity);
                  }
                }
              } else {
                // If we can't get bounds, use position as a fallback
                const entityPosition = this.getEntityPosition(entity);
                if (entityPosition &&
                    entityPosition.x >= min.x && entityPosition.x <= max.x &&
                    entityPosition.y >= min.y && entityPosition.y <= max.y &&
                    entityPosition.z >= min.z && entityPosition.z <= max.z) {
                  if (!result.some(e => e.id === entity.id)) {
                    result.push(entity);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Update the spatial partitioning system
   * This should be called periodically to update entity positions
   * @param entities All entities to update
   */
  public update(entities: IEntity[]): void {
    for (const entity of entities) {
      const position = this.getEntityPosition(entity);
      if (position) {
        this.insertEntity(entity, position);
      }
    }
  }

  /**
   * Generate a unique key for a cell based on its grid coordinates
   * @param x X-coordinate in the grid
   * @param y Y-coordinate in the grid
   * @param z Z-coordinate in the grid
   * @returns String key for the cell
   */
  private getCellKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  /**
   * Get the position of an entity
   * This is a simple implementation - should be adapted to your component system
   * @param entity Entity to get position for
   * @returns Entity position or null if not available
   */
  private getEntityPosition(entity: IEntity): BABYLON.Vector3 | null {
    // This is just a sample implementation
    // In a real system, this would get the position from a transform component
    const transformComponent = entity.getComponent('transform');
    if (transformComponent && 'position' in transformComponent) {
      return (transformComponent as any).position as BABYLON.Vector3;
    }
    return null;
  }

  /**
   * Get the bounds of an entity
   * This is a simple implementation - should be adapted to your component system
   * @param entity Entity to get bounds for
   * @returns Entity AABB or null if not available
   */
  private getEntityBounds(entity: IEntity): { min: BABYLON.Vector3, max: BABYLON.Vector3 } | null {
    // This is just a sample implementation
    // In a real system, this would get bounds from collision or mesh component
    const colliderComponent = entity.getComponent('collider');
    if (colliderComponent && 'bounds' in colliderComponent) {
      return (colliderComponent as any).bounds as { min: BABYLON.Vector3, max: BABYLON.Vector3 };
    }
    
    // Fallback to position with a small box around it
    const position = this.getEntityPosition(entity);
    if (position) {
      const halfSize = 0.5; // Default half-size if no bounds
      return {
        min: new BABYLON.Vector3(
          position.x - halfSize,
          position.y - halfSize,
          position.z - halfSize
        ),
        max: new BABYLON.Vector3(
          position.x + halfSize,
          position.y + halfSize,
          position.z + halfSize
        )
      };
    }
    
    return null;
  }

  /**
   * Create debug visualization for the grid
   */
  private createDebugVisualization(): void {
    if (!this.scene) return;
    
    // Clear any existing debug meshes
    this.clearDebugVisualization();
    
    // We'll create visualization meshes on demand when cells are created
  }

  /**
   * Update debug visualization based on current cells
   */
  private updateDebugVisualization(): void {
    if (!this.scene || !this.visualizationEnabled) return;
    
    // Clear previous visualization
    this.clearDebugVisualization();
    
    // Create wire box for each non-empty cell
    for (const [key, cell] of this.cells.entries()) {
      if (cell.entities.length > 0) {
        const cellCenter = BABYLON.Vector3.Lerp(cell.min, cell.max, 0.5);
        const cellSize = this.options.cellSize;
        
        // Create a wireframe box for the cell
        const box = BABYLON.MeshBuilder.CreateBox(`cell_${key}`, { 
          width: cellSize, 
          height: cellSize, 
          depth: cellSize
        }, this.scene);
        
        box.position = cellCenter;
        
        // Create wireframe material
        const material = new BABYLON.StandardMaterial(`cell_material_${key}`, this.scene);
        material.wireframe = true;
        material.emissiveColor = new BABYLON.Color3(0.1, 0.6, 0.1);
        material.alpha = 0.3 + Math.min(0.7, cell.entities.length / 10);
        
        box.material = material;
        
        this.debugMeshes.push(box);
      }
    }
  }

  /**
   * Clear all debug visualization meshes
   */
  private clearDebugVisualization(): void {
    for (const mesh of this.debugMeshes) {
      mesh.dispose();
    }
    this.debugMeshes = [];
  }

  /**
   * Enable or disable debug visualization
   * @param enabled Whether visualization should be enabled
   */
  public setVisualization(enabled: boolean): void {
    this.visualizationEnabled = enabled;
    
    if (enabled) {
      this.createDebugVisualization();
      this.updateDebugVisualization();
    } else {
      this.clearDebugVisualization();
    }
  }

  /**
   * Clear all cells and entity mappings
   */
  public clear(): void {
    this.cells.clear();
    this.entityCells.clear();
    this.clearDebugVisualization();
  }

  /**
   * Get the current number of cells
   * @returns Number of cells in the grid
   */
  public getCellCount(): number {
    return this.cells.size;
  }

  /**
   * Dispose of resources used by the spatial partitioning system
   */
  public dispose(): void {
    this.clear();
    this.debugMeshes = [];
  }
} 