/**
 * @file src/core/debug/visual/TerrainVisualizer.ts
 * @description Provides visualization of terrain properties using the DebugRenderer.
 */

import * as BABYLON from 'babylonjs';
import { DebugRenderer } from '../DebugRenderer';
import { Scene } from 'babylonjs';

/**
 * Options for terrain visualization
 */
export interface TerrainVisualizerOptions {
  /**
   * Whether to visualize terrain normals
   */
  showNormals?: boolean;
  
  /**
   * Whether to visualize terrain height map
   */
  showHeightMap?: boolean;
  
  /**
   * Whether to visualize terrain slope
   */
  showSlopes?: boolean;
  
  /**
   * Whether to visualize terrain grid
   */
  showGrid?: boolean;
  
  /**
   * Density of normal vectors to show (1 = every vertex, 2 = every other vertex, etc.)
   */
  normalDensity?: number;
  
  /**
   * Length of normal vectors
   */
  normalLength?: number;
  
  /**
   * Size of grid cells
   */
  gridSize?: number;
  
  /**
   * Color for normal vectors
   */
  normalColor?: BABYLON.Color3;
  
  /**
   * Color ramp for height visualization (low height)
   */
  heightColorLow?: BABYLON.Color3;
  
  /**
   * Color ramp for height visualization (high height)
   */
  heightColorHigh?: BABYLON.Color3;
  
  /**
   * Color ramp for slope visualization (flat areas)
   */
  slopeColorFlat?: BABYLON.Color3;
  
  /**
   * Color ramp for slope visualization (steep areas)
   */
  slopeColorSteep?: BABYLON.Color3;
  
  /**
   * Color for grid lines
   */
  gridColor?: BABYLON.Color3;
  
  /**
   * Threshold angle (in degrees) for considering a slope as "steep"
   */
  steepSlopeThreshold?: number;
}

/**
 * Default options for terrain visualization
 */
const DEFAULT_OPTIONS: TerrainVisualizerOptions = {
  showNormals: true,
  showHeightMap: true,
  showSlopes: true,
  showGrid: true,
  normalDensity: 8,
  normalLength: 1.0,
  gridSize: 10,
  normalColor: new BABYLON.Color3(0, 0, 1),
  heightColorLow: new BABYLON.Color3(0, 0, 1),
  heightColorHigh: new BABYLON.Color3(1, 0, 0),
  slopeColorFlat: new BABYLON.Color3(0, 1, 0),
  slopeColorSteep: new BABYLON.Color3(1, 0, 0),
  gridColor: new BABYLON.Color3(0.5, 0.5, 0.5),
  steepSlopeThreshold: 30
};

/**
 * Data structure to store terrain information
 */
interface TerrainData {
  /**
   * Terrain mesh
   */
  mesh: BABYLON.Mesh;
  
  /**
   * Vertex positions
   */
  vertices: BABYLON.Vector3[];
  
  /**
   * Vertex normals
   */
  normals: BABYLON.Vector3[];
  
  /**
   * Terrain bounds
   */
  bounds: {
    min: BABYLON.Vector3;
    max: BABYLON.Vector3;
  };
  
  /**
   * Minimum height
   */
  minHeight: number;
  
  /**
   * Maximum height
   */
  maxHeight: number;
}

/**
 * Visualizes terrain properties
 */
export class TerrainVisualizer {
  private debugRenderer: DebugRenderer;
  private options: TerrainVisualizerOptions;
  private scene: Scene;
  private enabled: boolean = false;
  private terrainData: TerrainData | null = null;
  private normalVectors: string[] = [];
  private heightMapMeshes: string[] = [];
  private slopeMeshes: string[] = [];
  private gridLines: string[] = [];
  
  /**
   * Creates a new terrain visualizer
   * @param debugRenderer Debug renderer to use for visualization
   * @param scene The Babylon.js scene
   * @param options Visualization options
   */
  constructor(
    debugRenderer: DebugRenderer,
    scene: Scene,
    options: Partial<TerrainVisualizerOptions> = {}
  ) {
    this.debugRenderer = debugRenderer;
    this.scene = scene;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Sets the terrain mesh to visualize
   * @param terrainMesh The terrain mesh
   */
  public setTerrain(terrainMesh: BABYLON.Mesh): void {
    // Clear previous terrain data
    this.clearVisualization();
    
    // Extract terrain data
    this.terrainData = this.extractTerrainData(terrainMesh);
    
    // Update visualization if enabled
    if (this.enabled) {
      this.updateVisualization();
    }
  }
  
  /**
   * Extracts terrain data from a mesh
   * @param terrainMesh The terrain mesh
   * @returns Extracted terrain data
   */
  private extractTerrainData(terrainMesh: BABYLON.Mesh): TerrainData {
    // Get vertices and normals from the mesh
    const positions = terrainMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const normals = terrainMesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
    
    if (!positions || !normals) {
      throw new Error("Terrain mesh does not have position or normal data");
    }
    
    // Convert flat arrays to Vector3 arrays
    const vertices: BABYLON.Vector3[] = [];
    const vertexNormals: BABYLON.Vector3[] = [];
    
    // Calculate terrain bounds and height range
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let minZ = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;
    let maxZ = Number.MIN_VALUE;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const vertex = new BABYLON.Vector3(x, y, z);
      vertices.push(vertex);
      
      // Update bounds
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
      
      // Extract normal
      const nx = normals[i];
      const ny = normals[i + 1];
      const nz = normals[i + 2];
      
      const normal = new BABYLON.Vector3(nx, ny, nz);
      vertexNormals.push(normal);
    }
    
    // Transform vertices and normals to world space
    const worldMatrix = terrainMesh.getWorldMatrix();
    for (let i = 0; i < vertices.length; i++) {
      vertices[i] = BABYLON.Vector3.TransformCoordinates(vertices[i], worldMatrix);
      vertexNormals[i] = BABYLON.Vector3.TransformNormal(vertexNormals[i], worldMatrix);
      vertexNormals[i].normalize();
    }
    
    // Create terrain data
    return {
      mesh: terrainMesh,
      vertices,
      normals: vertexNormals,
      bounds: {
        min: new BABYLON.Vector3(minX, minY, minZ),
        max: new BABYLON.Vector3(maxX, maxY, maxZ)
      },
      minHeight: minY,
      maxHeight: maxY
    };
  }
  
  /**
   * Enables terrain visualization
   */
  public enable(): void {
    if (this.enabled) return;
    
    this.enabled = true;
    
    // Update visualization if terrain data exists
    if (this.terrainData) {
      this.updateVisualization();
    }
  }
  
  /**
   * Disables terrain visualization
   */
  public disable(): void {
    if (!this.enabled) return;
    
    this.enabled = false;
    this.clearVisualization();
  }
  
  /**
   * Toggles terrain visualization
   */
  public toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }
  
  /**
   * Check if visualization is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Updates the terrain visualization
   */
  private updateVisualization(): void {
    if (!this.enabled || !this.terrainData) return;
    
    // Clear previous visualization
    this.clearVisualization();
    
    // Visualize terrain normals
    if (this.options.showNormals) {
      this.visualizeNormals();
    }
    
    // Visualize height map
    if (this.options.showHeightMap) {
      this.visualizeHeightMap();
    }
    
    // Visualize slopes
    if (this.options.showSlopes) {
      this.visualizeSlopes();
    }
    
    // Visualize grid
    if (this.options.showGrid) {
      this.visualizeGrid();
    }
  }
  
  /**
   * Visualizes terrain normals as vectors
   */
  private visualizeNormals(): void {
    if (!this.terrainData) return;
    
    const { vertices, normals } = this.terrainData;
    const density = this.options.normalDensity || 1;
    
    // Visualize normal vectors at specified density
    for (let i = 0; i < vertices.length; i += density) {
      const vertex = vertices[i];
      const normal = normals[i];
      
      // Create a vector to visualize the normal
      const vectorId = `terrain_normal_${i}`;
      this.debugRenderer.showVector(
        vectorId,
        vertex,
        normal.scale(this.options.normalLength!),
        this.options.normalColor
      );
      
      this.normalVectors.push(vectorId);
    }
  }
  
  /**
   * Visualizes terrain height using color coding
   */
  private visualizeHeightMap(): void {
    if (!this.terrainData) return;
    
    const { vertices, bounds, minHeight, maxHeight } = this.terrainData;
    const heightRange = maxHeight - minHeight;
    
    // Sample points across the terrain
    const gridSize = this.options.gridSize || 10;
    const xStep = (bounds.max.x - bounds.min.x) / gridSize;
    const zStep = (bounds.max.z - bounds.min.z) / gridSize;
    
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const xPos = bounds.min.x + x * xStep;
        const zPos = bounds.min.z + z * zStep;
        
        // Find height at this position (simple implementation - would be more accurate with raycasting)
        // This is just an approximation - find closest vertex
        let closestVertex = vertices[0];
        let minDist = Number.MAX_VALUE;
        
        for (const vertex of vertices) {
          const dist = (vertex.x - xPos) * (vertex.x - xPos) + (vertex.z - zPos) * (vertex.z - zPos);
          if (dist < minDist) {
            minDist = dist;
            closestVertex = vertex;
          }
        }
        
        // Normalize height between 0 and 1
        const normalizedHeight = heightRange > 0 ? 
          (closestVertex.y - minHeight) / heightRange : 0;
        
        // Interpolate color based on height
        const color = BABYLON.Color3.Lerp(
          this.options.heightColorLow!,
          this.options.heightColorHigh!,
          normalizedHeight
        );
        
        // Create a small box to represent the height
        const boxSize = Math.min(xStep, zStep) * 0.3;
        const min = new BABYLON.Vector3(
          xPos - boxSize / 2,
          closestVertex.y - boxSize / 2,
          zPos - boxSize / 2
        );
        const max = new BABYLON.Vector3(
          xPos + boxSize / 2,
          closestVertex.y + boxSize / 2,
          zPos + boxSize / 2
        );
        
        const boxId = `terrain_height_${x}_${z}`;
        this.debugRenderer.showBox(boxId, min, max, color);
        this.heightMapMeshes.push(boxId);
      }
    }
  }
  
  /**
   * Visualizes terrain slopes using color coding
   */
  private visualizeSlopes(): void {
    if (!this.terrainData) return;
    
    const { vertices, normals, bounds } = this.terrainData;
    const threshold = Math.cos(this.options.steepSlopeThreshold! * Math.PI / 180);
    
    // Sample points across the terrain
    const gridSize = this.options.gridSize || 10;
    const xStep = (bounds.max.x - bounds.min.x) / gridSize;
    const zStep = (bounds.max.z - bounds.min.z) / gridSize;
    
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const xPos = bounds.min.x + x * xStep;
        const zPos = bounds.min.z + z * zStep;
        
        // Find normal at this position (approximate)
        let closestIndex = 0;
        let minDist = Number.MAX_VALUE;
        
        for (let i = 0; i < vertices.length; i++) {
          const vertex = vertices[i];
          const dist = (vertex.x - xPos) * (vertex.x - xPos) + (vertex.z - zPos) * (vertex.z - zPos);
          if (dist < minDist) {
            minDist = dist;
            closestIndex = i;
          }
        }
        
        const normal = normals[closestIndex];
        const vertex = vertices[closestIndex];
        
        // Calculate slope as dot product with up vector
        const slopeValue = normal.y; // Dot product with (0,1,0)
        
        // Determine steepness (0 = steep, 1 = flat)
        const flatness = Math.max(0, slopeValue);
        
        // Interpolate color based on steepness
        const color = BABYLON.Color3.Lerp(
          this.options.slopeColorSteep!,
          this.options.slopeColorFlat!,
          flatness
        );
        
        // Create a small box to represent the slope
        const boxSize = Math.min(xStep, zStep) * 0.3;
        const min = new BABYLON.Vector3(
          xPos - boxSize / 2,
          vertex.y + boxSize, // Position slightly above terrain to avoid z-fighting
          zPos - boxSize / 2
        );
        const max = new BABYLON.Vector3(
          xPos + boxSize / 2,
          vertex.y + boxSize * 2,
          zPos + boxSize / 2
        );
        
        const boxId = `terrain_slope_${x}_${z}`;
        this.debugRenderer.showBox(boxId, min, max, color);
        this.slopeMeshes.push(boxId);
      }
    }
  }
  
  /**
   * Visualizes a grid over the terrain
   */
  private visualizeGrid(): void {
    if (!this.terrainData) return;
    
    const { bounds } = this.terrainData;
    const gridSize = this.options.gridSize || 10;
    const xStep = (bounds.max.x - bounds.min.x) / gridSize;
    const zStep = (bounds.max.z - bounds.min.z) / gridSize;
    
    // Create grid lines along X axis
    for (let z = 0; z <= gridSize; z++) {
      const zPos = bounds.min.z + z * zStep;
      
      const lineId = `terrain_grid_x_${z}`;
      const start = new BABYLON.Vector3(bounds.min.x, 0, zPos);
      const end = new BABYLON.Vector3(bounds.max.x, 0, zPos);
      
      // Project points onto terrain (simplified approach)
      start.y = this.getHeightAtPosition(start.x, start.z);
      end.y = this.getHeightAtPosition(end.x, end.z);
      
      // Create line
      const line = this.createGridLine(lineId, start, end);
      this.gridLines.push(lineId);
    }
    
    // Create grid lines along Z axis
    for (let x = 0; x <= gridSize; x++) {
      const xPos = bounds.min.x + x * xStep;
      
      const lineId = `terrain_grid_z_${x}`;
      const start = new BABYLON.Vector3(xPos, 0, bounds.min.z);
      const end = new BABYLON.Vector3(xPos, 0, bounds.max.z);
      
      // Project points onto terrain (simplified approach)
      start.y = this.getHeightAtPosition(start.x, start.z);
      end.y = this.getHeightAtPosition(end.x, end.z);
      
      // Create line
      const line = this.createGridLine(lineId, start, end);
      this.gridLines.push(lineId);
    }
  }
  
  /**
   * Creates a grid line
   * @param id Line identifier
   * @param start Start point
   * @param end End point
   * @returns The line mesh
   */
  private createGridLine(id: string, start: BABYLON.Vector3, end: BABYLON.Vector3): BABYLON.LinesMesh {
    // Create points with slight elevation to avoid z-fighting
    const elevatedStart = start.clone();
    const elevatedEnd = end.clone();
    elevatedStart.y += 0.05;
    elevatedEnd.y += 0.05;
    
    return this.debugRenderer.showVector(id, elevatedStart, elevatedEnd.subtract(elevatedStart), this.options.gridColor);
  }
  
  /**
   * Gets the height of the terrain at a specific position
   * @param x X coordinate
   * @param z Z coordinate
   * @returns The height at the position
   */
  private getHeightAtPosition(x: number, z: number): number {
    if (!this.terrainData) return 0;
    
    const { vertices } = this.terrainData;
    
    // Find closest vertex (simplified approach)
    let closestVertex = vertices[0];
    let minDist = Number.MAX_VALUE;
    
    for (const vertex of vertices) {
      const dist = (vertex.x - x) * (vertex.x - x) + (vertex.z - z) * (vertex.z - z);
      if (dist < minDist) {
        minDist = dist;
        closestVertex = vertex;
      }
    }
    
    return closestVertex.y;
  }
  
  /**
   * Gets the normal of the terrain at a specific position
   * @param x X coordinate
   * @param z Z coordinate
   * @returns The normal at the position
   */
  public getNormalAtPosition(x: number, z: number): BABYLON.Vector3 {
    if (!this.terrainData) return BABYLON.Vector3.Up();
    
    const { vertices, normals } = this.terrainData;
    
    // Find closest vertex
    let closestIndex = 0;
    let minDist = Number.MAX_VALUE;
    
    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];
      const dist = (vertex.x - x) * (vertex.x - x) + (vertex.z - z) * (vertex.z - z);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }
    
    return normals[closestIndex].clone();
  }
  
  /**
   * Gets the slope angle at a specific position (in degrees)
   * @param x X coordinate
   * @param z Z coordinate
   * @returns The slope angle in degrees
   */
  public getSlopeAtPosition(x: number, z: number): number {
    const normal = this.getNormalAtPosition(x, z);
    
    // Calculate angle between normal and up vector
    const dotProduct = BABYLON.Vector3.Dot(normal, BABYLON.Vector3.Up());
    return Math.acos(dotProduct) * 180 / Math.PI;
  }
  
  /**
   * Clears all visualizations
   */
  private clearVisualization(): void {
    // Clear normal vectors
    this.normalVectors.forEach(id => {
      this.debugRenderer.removeDebugVector(id);
    });
    this.normalVectors = [];
    
    // Clear height map meshes
    this.heightMapMeshes.forEach(id => {
      this.debugRenderer.removeDebugMesh(id);
    });
    this.heightMapMeshes = [];
    
    // Clear slope meshes
    this.slopeMeshes.forEach(id => {
      this.debugRenderer.removeDebugMesh(id);
    });
    this.slopeMeshes = [];
    
    // Clear grid lines
    this.gridLines.forEach(id => {
      this.debugRenderer.removeDebugVector(id);
    });
    this.gridLines = [];
  }
  
  /**
   * Cleans up resources
   */
  public dispose(): void {
    this.disable();
    this.terrainData = null;
  }
} 