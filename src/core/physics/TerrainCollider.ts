/**
 * @file src/core/physics/TerrainCollider.ts
 * @description Implements terrain collision detection and surface information.
 */

import * as BABYLON from 'babylonjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  ITerrainCollider,
  TerrainSurfaceInfo, 
  TerrainRaycastHit, 
  HeightmapData 
} from './ITerrainCollider';

/**
 * Represents a terrain material type
 */
interface TerrainMaterial {
  name: string;
  friction: number;
  region?: { x1: number; z1: number; x2: number; z2: number };
}

/**
 * Callback registration for terrain collision events
 */
interface TerrainHitCallbackRegistration {
  id: string;
  callback: (hit: { object: BABYLON.AbstractMesh; surfaceInfo: TerrainSurfaceInfo }) => void;
}

/**
 * Implementation of the ITerrainCollider interface for terrain collision detection
 */
export class TerrainCollider implements ITerrainCollider {
  private scene: BABYLON.Scene | null = null;
  private terrainMesh: BABYLON.Mesh | null = null;
  private terrainImpostor: BABYLON.PhysicsImpostor | null = null;
  private heightmapData: HeightmapData | null = null;
  private terrainMaterials: Map<string, TerrainMaterial> = new Map();
  private hitCallbacks: Map<string, TerrainHitCallbackRegistration> = new Map();
  private defaultMaterial: TerrainMaterial = { name: 'default', friction: 0.5 };
  
  /**
   * Creates a new terrain collider.
   */
  constructor() {
    this.terrainMaterials = new Map();
    this.hitCallbacks = new Map();
    
    // Set up default material
    this.terrainMaterials.set('default', this.defaultMaterial);
  }
  
  /**
   * Initializes the terrain collider.
   * @param scene The Babylon.js scene
   */
  public initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
    
    console.log("TerrainCollider initialized");
  }
  
  /**
   * Updates the terrain collider.
   * @param deltaTime Time elapsed since the last update
   */
  public update(deltaTime: number): void {
    // No per-frame updates required for a static terrain
  }
  
  /**
   * Sets the terrain heightmap data.
   * @param heightmapData The heightmap data
   */
  public setHeightmapData(heightmapData: HeightmapData): void {
    this.heightmapData = heightmapData;
    
    // If a terrain mesh already exists, update or recreate it based on the new heightmap
    if (this.scene && !this.terrainMesh) {
      this.createTerrainFromHeightmap();
    }
  }
  
  /**
   * Creates a terrain mesh from the heightmap data.
   */
  private createTerrainFromHeightmap(): void {
    if (!this.scene || !this.heightmapData) return;
    
    const { width, height: mapHeight, heights, scale, verticalScale } = this.heightmapData;
    
    // Create a ground mesh from the heightmap data
    const ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
      "terrain",
      "heightmap", // This is a placeholder; we're using the raw data from heights
      {
        width: width * scale.x,
        height: mapHeight * scale.y,
        subdivisions: Math.min(width, mapHeight),
        minHeight: this.heightmapData.minHeight * verticalScale,
        maxHeight: this.heightmapData.maxHeight * verticalScale
      },
      this.scene
    );
    
    // Manually update the vertex data since we're using raw height data
    // Note: In a real implementation, you'd probably use a shader or compute process
    // to convert the raw heights into a proper heightmap texture
    
    // Set the terrain mesh
    this.setTerrainMesh(ground);
  }
  
  /**
   * Sets the terrain mesh.
   * @param terrainMesh The terrain mesh to use for collision
   */
  public setTerrainMesh(terrainMesh: BABYLON.Mesh): void {
    if (!this.scene) {
      throw new Error("TerrainCollider: Must initialize before setting terrain mesh");
    }
    
    // Clean up previous mesh if it exists
    if (this.terrainMesh && this.terrainImpostor) {
      this.terrainImpostor.dispose();
      // Don't dispose the mesh itself, as it might be used elsewhere
    }
    
    this.terrainMesh = terrainMesh;
    
    // Create a physics impostor for the terrain
    this.terrainImpostor = new BABYLON.PhysicsImpostor(
      terrainMesh,
      BABYLON.PhysicsImpostor.MeshImpostor,
      { mass: 0, friction: 0.5, restitution: 0.3 },
      this.scene
    );
    
    // Register for collision events
    this.registerTerrainCollisionEvents();
    
    console.log("TerrainCollider: Terrain mesh set");
  }
  
  /**
   * Registers for collision events with the terrain.
   */
  private registerTerrainCollisionEvents(): void {
    if (!this.terrainImpostor || !this.scene) return;
    
    // Register for collision events
    this.terrainImpostor.registerOnPhysicsCollide([], (collider, collidedWith) => {
      if (!collider.object) return;
      
      // Get the position of the collision
      const collisionPoint = (collider.object as BABYLON.AbstractMesh).position.clone();
      
      // Get surface info at the collision point
      const surfaceInfo = this.getSurfaceInfoAt(collisionPoint);
      
      // Call all registered callbacks
      for (const registration of this.hitCallbacks.values()) {
        registration.callback({
          object: collider.object as BABYLON.AbstractMesh,
          surfaceInfo
        });
      }
    });
  }
  
  /**
   * Gets the height of the terrain at the given position.
   * @param position The position to check
   * @returns The height at the given position, or null if outside terrain bounds
   */
  public getHeightAt(position: BABYLON.Vector2 | BABYLON.Vector3): number | null {
    // If we have heightmap data, use that for accurate height
    if (this.heightmapData) {
      return this.getHeightFromHeightmap(position);
    }
    
    // Otherwise, use raycasting to get the height
    if (this.terrainMesh) {
      const ray = this.createVerticalRay(position);
      const hit = this.scene?.pickWithRay(ray);
      
      if (hit && hit.hit && hit.pickedMesh === this.terrainMesh) {
        return hit.pickedPoint?.y ?? null;
      }
    }
    
    return null;
  }
  
  /**
   * Gets the height from the heightmap data.
   * @param position The position to check
   * @returns The height at the given position, or null if outside terrain bounds
   */
  private getHeightFromHeightmap(position: BABYLON.Vector2 | BABYLON.Vector3): number | null {
    if (!this.heightmapData) return null;
    
    const { width, height: mapHeight, heights, scale, verticalScale } = this.heightmapData;
    
    // Convert from world to heightmap coordinates
    let x: number, z: number;
    
    if ('z' in position) {
      // Vector3
      x = position.x / scale.x + width / 2;
      z = position.z / scale.y + mapHeight / 2;
    } else {
      // Vector2
      x = position.x / scale.x + width / 2;
      z = position.y / scale.y + mapHeight / 2;
    }
    
    // Check bounds
    if (x < 0 || x >= width - 1 || z < 0 || z >= mapHeight - 1) {
      return null;
    }
    
    // Get the indices of the surrounding heightmap points
    const x1 = Math.floor(x);
    const x2 = Math.ceil(x);
    const z1 = Math.floor(z);
    const z2 = Math.ceil(z);
    
    // Get the heights at the surrounding points
    const h11 = heights[z1 * width + x1];
    const h21 = heights[z1 * width + x2];
    const h12 = heights[z2 * width + x1];
    const h22 = heights[z2 * width + x2];
    
    // Calculate the fractional position within the grid cell
    const fx = x - x1;
    const fz = z - z1;
    
    // Bilinear interpolation
    const h1 = h11 * (1 - fx) + h21 * fx;
    const h2 = h12 * (1 - fx) + h22 * fx;
    const terrainHeight = h1 * (1 - fz) + h2 * fz;
    
    // Convert to world height
    return terrainHeight * verticalScale;
  }
  
  /**
   * Creates a vertical ray for height checking.
   * @param position The position to check
   * @returns A ray pointing downward from high above the position
   */
  private createVerticalRay(position: BABYLON.Vector2 | BABYLON.Vector3): BABYLON.Ray {
    let rayX: number, rayZ: number;
    
    if ('z' in position) {
      // Vector3
      rayX = position.x;
      rayZ = position.z;
    } else {
      // Vector2
      rayX = position.x;
      rayZ = position.y;
    }
    
    const rayOrigin = new BABYLON.Vector3(
      rayX,
      1000, // Start from high above
      rayZ
    );
    
    return new BABYLON.Ray(
      rayOrigin,
      new BABYLON.Vector3(0, -1, 0), // Pointing down
      2000 // Long enough to reach below ground level
    );
  }
  
  /**
   * Gets terrain surface information at the given position.
   * @param position The position to check
   * @returns Surface information at the given position
   */
  public getSurfaceInfoAt(position: BABYLON.Vector2 | BABYLON.Vector3): TerrainSurfaceInfo {
    // Get the height at the position
    const height = this.getHeightAt(position);
    
    // If no height data, return a default "no terrain" response
    if (height === null) {
      return {
        exists: false,
        height: -Infinity,
        normal: new BABYLON.Vector3(0, 1, 0),
        slope: 0,
        friction: this.defaultMaterial.friction
      };
    }
    
    // Get the surface normal
    const normal = this.getSurfaceNormal(position);
    
    // Calculate the slope angle (angle between normal and up vector)
    const slope = Math.acos(BABYLON.Vector3.Dot(normal, BABYLON.Vector3.Up()));
    
    // Determine the material type
    const materialType = this.getMaterialTypeAt(position);
    
    // Get the friction for this material
    const material = this.terrainMaterials.get(materialType) || this.defaultMaterial;
    
    return {
      exists: true,
      height,
      normal,
      slope,
      materialType,
      friction: material.friction
    };
  }
  
  /**
   * Gets the surface normal at the given position.
   * @param position The position to check
   * @returns The surface normal vector
   */
  private getSurfaceNormal(position: BABYLON.Vector2 | BABYLON.Vector3): BABYLON.Vector3 {
    if (this.heightmapData) {
      return this.getNormalFromHeightmap(position);
    }
    
    // Use raycasting for mesh-based terrain
    if (this.terrainMesh && this.scene) {
      const ray = this.createVerticalRay(position);
      const hit = this.scene.pickWithRay(ray);
      
      if (hit && hit.hit && hit.getNormal()) {
        return hit.getNormal() as BABYLON.Vector3;
      }
    }
    
    // Default to up vector if we can't determine the normal
    return new BABYLON.Vector3(0, 1, 0);
  }
  
  /**
   * Gets the surface normal from the heightmap data.
   * @param position The position to check
   * @returns The surface normal vector
   */
  private getNormalFromHeightmap(position: BABYLON.Vector2 | BABYLON.Vector3): BABYLON.Vector3 {
    if (!this.heightmapData) return new BABYLON.Vector3(0, 1, 0);
    
    const { width, height: mapHeight, heights, scale, verticalScale } = this.heightmapData;
    
    // Convert from world to heightmap coordinates
    let x: number, z: number;
    
    if ('z' in position) {
      // Vector3
      x = position.x / scale.x + width / 2;
      z = position.z / scale.y + mapHeight / 2;
    } else {
      // Vector2
      x = position.x / scale.x + width / 2;
      z = position.y / scale.y + mapHeight / 2;
    }
    
    // Check bounds
    if (x < 1 || x >= width - 1 || z < 1 || z >= mapHeight - 1) {
      return new BABYLON.Vector3(0, 1, 0);
    }
    
    // Get the indices of the center point
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    
    // Get heights at surrounding points
    const hL = heights[cz * width + (cx - 1)];
    const hR = heights[cz * width + (cx + 1)];
    const hU = heights[(cz - 1) * width + cx];
    const hD = heights[(cz + 1) * width + cx];
    
    // Calculate the slope in x and z directions
    const slopeX = (hR - hL) / (2 * scale.x);
    const slopeZ = (hD - hU) / (2 * scale.y);
    
    // Create a normal vector perpendicular to the slopes
    const normal = new BABYLON.Vector3(-slopeX * verticalScale, 1, -slopeZ * verticalScale);
    
    // Normalize the vector
    return normal.normalize();
  }
  
  /**
   * Gets the material type at the given position.
   * @param position The position to check
   * @returns The material type name
   */
  private getMaterialTypeAt(position: BABYLON.Vector2 | BABYLON.Vector3): string {
    // Extract x/z coordinates
    let posX: number, posZ: number;
    
    if ('z' in position) {
      // Vector3
      posX = position.x;
      posZ = position.z;
    } else {
      // Vector2
      posX = position.x;
      posZ = position.y;
    }
    
    // Check if the position is within any defined region
    for (const [name, material] of this.terrainMaterials.entries()) {
      if (material.region) {
        const { x1, z1, x2, z2 } = material.region;
        if (posX >= x1 && posX <= x2 && posZ >= z1 && posZ <= z2) {
          return name;
        }
      }
    }
    
    // Return the default material type
    return this.defaultMaterial.name;
  }
  
  /**
   * Performs a raycast against the terrain.
   * @param from The starting position of the ray
   * @param direction The direction of the ray
   * @param maxDistance The maximum distance of the ray
   * @returns Information about the hit, or null if no hit occurred
   */
  public raycast(from: BABYLON.Vector3, direction: BABYLON.Vector3, maxDistance: number = 100): TerrainRaycastHit | null {
    if (!this.scene || (!this.terrainMesh && !this.heightmapData)) {
      return null;
    }
    
    // Create a ray
    const ray = new BABYLON.Ray(from, direction.normalize(), maxDistance);
    
    // Try heightmap-based raycast first if available
    if (this.heightmapData) {
      const hit = this.raycastHeightmap(ray);
      if (hit) return hit;
    }
    
    // Fall back to mesh-based raycast
    if (this.terrainMesh) {
      const hit = this.scene.pickWithRay(ray, (mesh) => mesh === this.terrainMesh);
      
      if (hit && hit.hit && hit.pickedPoint) {
        const position = hit.pickedPoint;
        const surfaceInfo = this.getSurfaceInfoAt(position);
        
        return {
          hit: true,
          position,
          normal: hit.getNormal() as BABYLON.Vector3 || surfaceInfo.normal,
          distance: hit.distance,
          surfaceInfo
        };
      }
    }
    
    return null;
  }
  
  /**
   * Performs a raycast against the heightmap.
   * @param ray The ray to use for the raycast
   * @returns Information about the hit, or null if no hit occurred
   */
  private raycastHeightmap(ray: BABYLON.Ray): TerrainRaycastHit | null {
    if (!this.heightmapData) return null;
    
    const { width, height: mapHeight, heights, scale, verticalScale } = this.heightmapData;
    
    // Convert the heightmap to a simple mesh representation for ray testing
    // In a real implementation, you'd use a more efficient algorithm
    
    // For demonstration purposes, we'll do a simplistic approach here
    // by stepping along the ray and checking against the heightmap
    
    const maxSteps = 100;
    const stepSize = ray.length / maxSteps;
    
    for (let i = 0; i < maxSteps; i++) {
      const distance = i * stepSize;
      const point = ray.origin.add(ray.direction.scale(distance));
      
      // Get height at this point
      const terrainHeight = this.getHeightAt(point);
      
      if (terrainHeight !== null && point.y <= terrainHeight) {
        // We've hit the terrain
        // Find more accurate intersection point by binary search
        const refinedDistance = this.refineRayHitDistance(ray, distance - stepSize, distance);
        const hitPoint = ray.origin.add(ray.direction.scale(refinedDistance));
        
        // Get surface info
        const surfaceInfo = this.getSurfaceInfoAt(hitPoint);
        
        return {
          hit: true,
          position: hitPoint,
          normal: surfaceInfo.normal,
          distance: refinedDistance,
          surfaceInfo
        };
      }
    }
    
    return null;
  }
  
  /**
   * Refines the exact distance at which a ray hits the terrain using binary search.
   * @param ray The ray being cast
   * @param minDist The minimum distance where the ray is above terrain
   * @param maxDist The maximum distance where the ray is below terrain
   * @param iterations The number of refinement iterations
   * @returns The refined distance
   */
  private refineRayHitDistance(ray: BABYLON.Ray, minDist: number, maxDist: number, iterations: number = 10): number {
    let minDistance = minDist;
    let maxDistance = maxDist;
    
    for (let i = 0; i < iterations; i++) {
      const midDistance = (minDistance + maxDistance) / 2;
      const midPoint = ray.origin.add(ray.direction.scale(midDistance));
      
      const terrainHeight = this.getHeightAt(midPoint);
      
      if (terrainHeight === null) {
        // No valid height data at this point, abort refinement
        return midDistance;
      }
      
      if (midPoint.y <= terrainHeight) {
        // Below terrain, set new max
        maxDistance = midDistance;
      } else {
        // Above terrain, set new min
        minDistance = midDistance;
      }
    }
    
    return maxDistance;
  }
  
  /**
   * Checks if an object is on the ground.
   * @param position The position to check
   * @param radius The radius of the object
   * @param height The height of the object above its center
   * @returns The ground position and normal if on ground, null otherwise
   */
  public checkGrounded(
    position: BABYLON.Vector3,
    radius: number,
    height: number
  ): { position: BABYLON.Vector3; normal: BABYLON.Vector3; surfaceInfo: TerrainSurfaceInfo } | null {
    // Calculate the bottom of the object
    const bottomPosition = position.clone();
    bottomPosition.y -= height / 2;
    
    // Check multiple points around the base for better ground detection
    const checkPoints = [
      bottomPosition.clone(), // Center
      bottomPosition.clone().add(new BABYLON.Vector3(radius * 0.7, 0, 0)), // Right
      bottomPosition.clone().add(new BABYLON.Vector3(-radius * 0.7, 0, 0)), // Left
      bottomPosition.clone().add(new BABYLON.Vector3(0, 0, radius * 0.7)), // Front
      bottomPosition.clone().add(new BABYLON.Vector3(0, 0, -radius * 0.7)) // Back
    ];
    
    // Check each point
    let lowestPoint: { 
      position: BABYLON.Vector3; 
      normal: BABYLON.Vector3;
      surfaceInfo: TerrainSurfaceInfo; 
    } | null = null;
    
    for (const point of checkPoints) {
      // Cast a ray downward to find the ground
      const ray = new BABYLON.Ray(
        point.add(new BABYLON.Vector3(0, 0.1, 0)), // Slight offset to avoid self-collision
        new BABYLON.Vector3(0, -1, 0),
        radius + 0.2 // Check slightly beyond the object's height
      );
      
      const hit = this.raycast(ray.origin, ray.direction, ray.length);
      
      if (hit && hit.hit) {
        // Update the lowest point
        if (!lowestPoint || hit.position.y < lowestPoint.position.y) {
          lowestPoint = {
            position: hit.position,
            normal: hit.normal,
            surfaceInfo: hit.surfaceInfo
          };
        }
      }
    }
    
    return lowestPoint;
  }
  
  /**
   * Gets the physics impostor for the terrain.
   * @returns The physics impostor for the terrain, if any
   */
  public getTerrainImpostor(): BABYLON.PhysicsImpostor | null {
    return this.terrainImpostor;
  }
  
  /**
   * Performs a sphere cast against the terrain.
   * @param from The starting position of the sphere
   * @param to The end position of the sphere
   * @param radius The radius of the sphere
   * @returns Information about the hit, or null if no hit occurred
   */
  public sphereCast(from: BABYLON.Vector3, to: BABYLON.Vector3, radius: number): TerrainRaycastHit | null {
    // Direction of the sphere cast
    const direction = to.subtract(from).normalize();
    const distance = BABYLON.Vector3.Distance(from, to);
    
    // Start with a regular raycast
    const rayHit = this.raycast(from, direction, distance);
    
    if (rayHit && rayHit.hit) {
      // We have a hit with the ray, but we need to check if the sphere would hit sooner
      
      // For a sphere, we need to offset the hit position by the radius along the normal
      const earlierHitDistance = rayHit.distance - radius / Math.abs(BABYLON.Vector3.Dot(direction, rayHit.normal));
      
      if (earlierHitDistance < 0) {
        // The sphere is already intersecting at the start position
        // Find the actual intersection point
        const surfaceInfo = this.getSurfaceInfoAt(from);
        
        return {
          hit: true,
          position: from.clone(),
          normal: surfaceInfo.normal,
          distance: 0,
          surfaceInfo
        };
      }
      
      // Calculate the adjusted hit position
      const hitPosition = from.add(direction.scale(Math.max(0, earlierHitDistance)));
      const surfaceInfo = this.getSurfaceInfoAt(hitPosition);
      
      return {
        hit: true,
        position: hitPosition,
        normal: rayHit.normal,
        distance: earlierHitDistance,
        surfaceInfo
      };
    }
    
    // No direct ray hit, but the sphere might still hit if we're casting near the surface
    // For a complete implementation, you would check perpendicular rays as well
    
    return null;
  }
  
  /**
   * Registers a callback for when an object hits the terrain.
   * @param callback The callback to invoke
   * @returns An ID that can be used to unregister the callback
   */
  public registerTerrainHitCallback(
    callback: (hit: { object: BABYLON.AbstractMesh; surfaceInfo: TerrainSurfaceInfo }) => void
  ): string {
    const id = uuidv4();
    
    this.hitCallbacks.set(id, {
      id,
      callback
    });
    
    return id;
  }
  
  /**
   * Unregisters a terrain hit callback.
   * @param id The ID of the callback to unregister
   */
  public unregisterTerrainHitCallback(id: string): void {
    this.hitCallbacks.delete(id);
  }
  
  /**
   * Adds a terrain material type with its properties.
   * @param name The name of the material type
   * @param friction The friction coefficient of the material
   * @param region The region in the terrain where this material applies (x1, z1, x2, z2) or null for texture-based
   */
  public addTerrainMaterial(name: string, friction: number, region?: { x1: number; z1: number; x2: number; z2: number }): void {
    this.terrainMaterials.set(name, {
      name,
      friction,
      region
    });
  }
  
  /**
   * Cleans up resources used by the terrain collider.
   */
  public dispose(): void {
    if (this.terrainImpostor) {
      this.terrainImpostor.dispose();
      this.terrainImpostor = null;
    }
    
    this.terrainMesh = null;
    this.heightmapData = null;
    this.terrainMaterials.clear();
    this.hitCallbacks.clear();
    this.scene = null;
    
    console.log("TerrainCollider disposed");
  }
}
