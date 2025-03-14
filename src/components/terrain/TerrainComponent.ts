/**
 * TerrainComponent.ts
 * Component for terrain interaction
 */

import { Component } from '../../components/Component';
import { Vector3 } from '../../types/common/Vector3';
import { SurfaceType } from '../../types/events/EventTypes';
import { ITerrainComponent, TerrainPoint } from '../../types/terrain/TerrainTypes';
import { TerrainSystem } from '../../core/terrain/TerrainSystem';
import { TerrainData } from '../../components/movement/MovementState';
import { PhysicsConfig } from '../../config/PhysicsConfig';

/**
 * Component for terrain interaction
 */
export class TerrainComponent extends Component implements ITerrainComponent {
    /**
     * Reference to the terrain system
     */
    private terrainSystem: TerrainSystem;
    
    /**
     * Creates a new TerrainComponent
     * @param terrainSystem Reference to the terrain system
     */
    constructor(terrainSystem: TerrainSystem) {
        super('terrain');
        this.terrainSystem = terrainSystem;
    }
    
    /**
     * Get the terrain height at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns Height at the specified position, or null if out of bounds
     */
    public getHeightAt(x: number, z: number): number | null {
        return this.terrainSystem.getHeightAt(x, z);
    }
    
    /**
     * Get the terrain normal at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns Normal vector at the specified position, or null if out of bounds
     */
    public getNormalAt(x: number, z: number): Vector3 | null {
        return this.terrainSystem.getNormalAt(x, z);
    }
    
    /**
     * Get the surface type at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns Surface type at the specified position, or DEFAULT if out of bounds
     */
    public getSurfaceTypeAt(x: number, z: number): SurfaceType {
        return this.terrainSystem.getSurfaceTypeAt(x, z);
    }
    
    /**
     * Get complete terrain data at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns TerrainPoint with position, normal, and surface information, or null if out of bounds
     */
    public getTerrainPointAt(x: number, z: number): TerrainPoint | null {
        return this.terrainSystem.getTerrainPointAt(x, z);
    }
    
    /**
     * Convert a TerrainPoint to TerrainData for the movement system
     * @param point TerrainPoint from the terrain system
     * @returns TerrainData for the movement system
     */
    public getTerrainDataFromPoint(point: TerrainPoint): TerrainData {
        if (!point) {
            // Return default terrain data if no point is provided
            return {
                normal: Vector3.up(),
                surfaceType: SurfaceType.DEFAULT,
                friction: PhysicsConfig.friction[SurfaceType.DEFAULT],
                slopeAngle: 0,
                slopeDirection: Vector3.forward()
            };
        }
        
        // Calculate slope direction (perpendicular to normal in the XZ plane)
        const slopeDirection = new Vector3();
        if (point.normal.y < 0.999) {
            // Project normal onto XZ plane and rotate 90 degrees
            slopeDirection.x = -point.normal.z;
            slopeDirection.y = 0;
            slopeDirection.z = point.normal.x;
            slopeDirection.normalize();
        } else {
            // If normal is pointing straight up, use forward direction
            slopeDirection.set(0, 0, 1);
        }
        
        // Ensure the surface type exists in PhysicsConfig.friction
        let surfaceType = point.surfaceType;
        if (!(surfaceType in PhysicsConfig.friction)) {
            surfaceType = SurfaceType.DEFAULT;
        }
        
        return {
            normal: point.normal.clone(),
            surfaceType: surfaceType,
            friction: PhysicsConfig.friction[surfaceType],
            slopeAngle: point.slope * (Math.PI / 180), // Convert to radians
            slopeDirection: slopeDirection
        };
    }
    
    /**
     * Get terrain data at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns TerrainData for the movement system, or default data if out of bounds
     */
    public getTerrainDataAt(x: number, z: number): TerrainData {
        const point = this.getTerrainPointAt(x, z);
        if (!point) {
            // Return default terrain data if no point is found
            return {
                normal: Vector3.up(),
                surfaceType: SurfaceType.DEFAULT,
                friction: PhysicsConfig.friction[SurfaceType.DEFAULT],
                slopeAngle: 0,
                slopeDirection: Vector3.forward()
            };
        }
        return this.getTerrainDataFromPoint(point);
    }
} 