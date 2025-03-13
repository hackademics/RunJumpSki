import {
    Scene,
    Vector3,
    Ray,
    Mesh,
    AbstractMesh,
    MeshBuilder,
    StandardMaterial,
    Color3,
    PhysicsImpostor,
    PickingInfo
} from '@babylonjs/core';
import { Logger } from '../utils/logger';
import { TerrainGenerator } from './generator';
import { IEventEmitter, GameEvent } from '../types/events';
import { RaycastHit, SurfaceType, DefaultSurfaces } from '../types/physics';
import { TerrainData } from '../types/components';

/**
 * Manages terrain collision detection and response
 */
export class TerrainCollision {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private terrain: TerrainGenerator;
    private terrainMesh?: Mesh;
    private debugMode: boolean = false;
    private debugMarkers: Mesh[] = [];
    private maxRayDistance: number = 100;
    private raysPerFrame: number = 5;
    private rayQueue: Ray[] = [];
    private rayResults: Map<string, RaycastHit> = new Map();

    /**
     * Initialize terrain collision system
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param terrain Terrain generator
     */
    constructor(scene: Scene, events: IEventEmitter, terrain: TerrainGenerator) {
        this.logger = new Logger('TerrainCollision');
        this.scene = scene;
        this.events = events;
        this.terrain = terrain;

        // Get the terrain mesh for precise collision detection
        this.terrainMesh = terrain.getMesh();

        if (!this.terrainMesh) {
            this.logger.warn('Terrain mesh not available for collision detection');
        }

        this.logger.info('Terrain collision system initialized');
    }

    /**
     * Perform a raycast against the terrain
     * @param origin Ray origin point
     * @param direction Ray direction
     * @param distance Maximum ray distance
     * @param debugColor Optional color for debug visualization
     */
    public raycast(
        origin: Vector3,
        direction: Vector3,
        distance: number = this.maxRayDistance,
        debugColor?: Color3
    ): RaycastHit {
        if (!this.terrainMesh) {
            return { hit: false };
        }

        try {
            // Create a ray
            const ray = new Ray(origin, direction.normalize(), distance);

            // Perform raycast against terrain mesh
            const hit = this.scene.pickWithRay(ray, (mesh) => {
                return mesh === this.terrainMesh;
            });

            // Process hit results
            if (hit && hit.hit && hit.pickedPoint) {
                const result = this.processHitResult(hit, ray);

                // Visualize ray for debugging
                if (this.debugMode && debugColor) {
                    this.visualizeRay(ray, hit, debugColor);
                }

                return result;
            }

            return { hit: false };
        } catch (error) {
            this.logger.error('Error performing terrain raycast', error);
            return { hit: false };
        }
    }

    /**
     * Process hit result to extract terrain data
     * @param hit Picking info from raycast
     * @param ray The ray used for casting
     */
    private processHitResult(hit: PickingInfo, ray: Ray): RaycastHit {
        if (!hit.pickedPoint || !hit.getNormal) {
            return { hit: true, distance: hit.distance };
        }

        // Get hit point
        const hitPoint = hit.pickedPoint;

        // Get normal at hit point
        const normal = hit.getNormal() || this.terrain.getNormalAt(hitPoint.x, hitPoint.z);

        // Get surface type
        const surfaceType = this.terrain.getSurfaceTypeAt(hitPoint.x, hitPoint.z);

        // Get surface properties
        const surfaceProps = DefaultSurfaces[surfaceType];

        // Calculate distance
        const distance = hit.distance !== undefined ? hit.distance : Vector3.Distance(ray.origin, hitPoint);

        // Return hit information
        return {
            hit: true,
            position: hitPoint,
            normal: normal,
            distance: distance,
            object: hit.pickedMesh,
            surfaceType: surfaceType,
            surfaceProperties: surfaceProps
        };
    }

    /**
     * Perform a spherecast against the terrain (like a raycast but with volume)
     * @param origin Sphere center origin point
     * @param direction Cast direction
     * @param radius Sphere radius
     * @param distance Maximum cast distance
     * @param debugColor Optional color for debug visualization
     */
    public spherecast(
        origin: Vector3,
        direction: Vector3,
        radius: number,
        distance: number = this.maxRayDistance,
        debugColor?: Color3
    ): RaycastHit {
        if (!this.terrainMesh) {
            return { hit: false };
        }

        try {
            // Normalize direction
            const normalizedDir = direction.normalize();

            // Create multiple rays for better approximation
            // One center ray
            const centerRay = new Ray(origin, normalizedDir, distance);

            // Four rays at cardinal points of the sphere perpendicular to direction
            const perpendicularRays: Ray[] = [];

            // Find perpendicular vectors
            const up = new Vector3(0, 1, 0);
            let right = Vector3.Cross(normalizedDir, up).normalize();

            // Handle case where direction is parallel to up
            if (right.lengthSquared() < 0.001) {
                right = new Vector3(1, 0, 0);
            }

            const forward = Vector3.Cross(right, up).normalize();

            // Create rays at the edge of the sphere
            perpendicularRays.push(new Ray(
                origin.add(right.scale(radius)),
                normalizedDir,
                distance
            ));

            perpendicularRays.push(new Ray(
                origin.add(right.scale(-radius)),
                normalizedDir,
                distance
            ));

            perpendicularRays.push(new Ray(
                origin.add(forward.scale(radius)),
                normalizedDir,
                distance
            ));

            perpendicularRays.push(new Ray(
                origin.add(forward.scale(-radius)),
                normalizedDir,
                distance
            ));

            // Also cast a ray downward to detect ground
            perpendicularRays.push(new Ray(
                origin,
                new Vector3(0, -1, 0),
                radius * 2
            ));

            // Cast all rays and find closest hit
            let closestHit: PickingInfo | null = null;
            let closestRay: Ray | null = null;

            // Check center ray first
            const centerHit = this.scene.pickWithRay(centerRay, (mesh) => {
                return mesh === this.terrainMesh;
            });

            if (centerHit && centerHit.hit) {
                closestHit = centerHit;
                closestRay = centerRay;
            }

            // Check perpendicular rays
            for (const ray of perpendicularRays) {
                const hit = this.scene.pickWithRay(ray, (mesh) => {
                    return mesh === this.terrainMesh;
                });

                if (hit && hit.hit && hit.distance !== undefined &&
                    (!closestHit || !closestHit.distance || hit.distance < closestHit.distance)) {
                    closestHit = hit;
                    closestRay = ray;
                }
            }

            // Process hit results
            if (closestHit && closestHit.hit && closestHit.pickedPoint && closestRay) {
                // Adjust distance by radius for spherecast
                if (closestHit.distance !== undefined) {
                    closestHit.distance = Math.max(0, closestHit.distance - radius);
                }

                const result = this.processHitResult(closestHit, closestRay);

                // Visualize for debugging
                if (this.debugMode && debugColor && closestRay) {
                    this.visualizeRay(closestRay, closestHit, debugColor);
                }

                return result;
            }

            return { hit: false };
        } catch (error) {
            this.logger.error('Error performing terrain spherecast', error);
            return { hit: false };
        }
    }

    /**
     * Get terrain data at a specific world position
     * @param position World position
     */
    public getTerrainDataAt(position: Vector3): TerrainData | undefined {
        try {
            return this.terrain.getTerrainDataAt(position.x, position.z);
        } catch (error) {
            this.logger.error('Error getting terrain data', error);
            return undefined;
        }
    }

    /**
     * Queue a raycast to be processed over multiple frames
     * @param origin Ray origin
     * @param direction Ray direction
     * @param distance Maximum ray distance
     * @param id Unique identifier for this ray
     */
    public queueRaycast(
        origin: Vector3,
        direction: Vector3,
        distance: number = this.maxRayDistance,
        id: string
    ): void {
        const ray = new Ray(origin, direction.normalize(), distance);
        ray.updateToWithLength(origin, direction, distance);
        ray.metadata = { id };
        this.rayQueue.push(ray);
    }

    /**
     * Get the result of a queued raycast
     * @param id Raycast identifier
     */
    public getQueuedRaycastResult(id: string): RaycastHit | undefined {
        return this.rayResults.get(id);
    }

    /**
     * Process queued raycasts over multiple frames
     */
    public processPendingRaycasts(): void {
        // Process a limited number of rays per frame
        const raysToProcess = Math.min(this.raysPerFrame, this.rayQueue.length);

        for (let i = 0; i < raysToProcess; i++) {
            const ray = this.rayQueue.shift();
            if (!ray || !ray.metadata || !ray.metadata.id) continue;

            const hit = this.raycast(ray.origin, ray.direction, ray.length);
            this.rayResults.set(ray.metadata.id, hit);

            // Expire results after some time to prevent memory leaks
            setTimeout(() => {
                this.rayResults.delete(ray.metadata.id);
            }, 5000);
        }
    }

    /**
     * Check if a position is above the terrain
     * @param position Position to check
     * @param heightThreshold Optional height threshold
     */
    public isAboveTerrain(position: Vector3, heightThreshold: number = 0.1): boolean {
        try {
            const terrainHeight = this.terrain.getHeightAt(position.x, position.z);
            return position.y >= terrainHeight + heightThreshold;
        } catch (error) {
            this.logger.error('Error checking if position is above terrain', error);
            return true; // Assume above terrain on error to prevent falling through
        }
    }

    /**
     * Check if a point is on a skiable surface
     * @param position Position to check
     */
    public isSkiableSurface(position: Vector3): boolean {
        try {
            const surfaceType = this.terrain.getSurfaceTypeAt(position.x, position.z);
            return surfaceType === SurfaceType.SKIABLE || surfaceType === SurfaceType.ICE;
        } catch (error) {
            this.logger.error('Error checking if surface is skiable', error);
            return false;
        }
    }

    /**
     * Calculate the slope angle at a position
     * @param position Position to check
     */
    public getSlopeAngle(position: Vector3): number {
        try {
            const normal = this.terrain.getNormalAt(position.x, position.z);
            const upVector = new Vector3(0, 1, 0);

            // Calculate angle between normal and up vector
            const dotProduct = Vector3.Dot(normal, upVector);
            return Math.acos(dotProduct);
        } catch (error) {
            this.logger.error('Error calculating slope angle', error);
            return 0;
        }
    }

    /**
     * Calculate slope direction vector at a position
     * @param position Position to check
     */
    public getSlopeDirection(position: Vector3): Vector3 {
        try {
            const normal = this.terrain.getNormalAt(position.x, position.z);
            const gravity = new Vector3(0, -9.81, 0);

            // Project gravity onto the surface plane
            const gravityProjection = gravity.subtract(
                normal.scale(Vector3.Dot(gravity, normal))
            );

            // Normalize and return
            if (gravityProjection.lengthSquared() > 0.001) {
                return gravityProjection.normalize();
            } else {
                // If on flat surface, return zero vector
                return new Vector3(0, 0, 0);
            }
        } catch (error) {
            this.logger.error('Error calculating slope direction', error);
            return new Vector3(0, 0, 0);
        }
    }

    /**
     * Check if a mesh collides with the terrain
     * @param mesh Mesh to check
     * @param predictedPosition Optional: check at a future position instead of current
     */
    public checkMeshTerrainCollision(
        mesh: AbstractMesh,
        predictedPosition?: Vector3
    ): boolean {
        if (!this.terrainMesh || !mesh) {
            return false;
        }

        try {
            // Get mesh bounding box
            const boundingInfo = mesh.getBoundingInfo();
            const center = predictedPosition || mesh.position;

            // Get terrain height at center position
            const terrainHeight = this.terrain.getHeightAt(center.x, center.z);

            // Check if bottom of mesh is below terrain height
            const bottomY = center.y - boundingInfo.boundingBox.extendSize.y;
            return bottomY <= terrainHeight;
        } catch (error) {
            this.logger.error('Error checking mesh terrain collision', error);
            return false;
        }
    }

    /**
     * Visualize a ray for debugging
     * @param ray Ray to visualize
     * @param hit Hit result
     * @param color Color for visualization
     */
    private visualizeRay(ray: Ray, hit: PickingInfo, color: Color3): void {
        // Create a sphere at hit point
        if (hit.pickedPoint) {
            const marker = MeshBuilder.CreateSphere(
                'rayMarker',
                { diameter: 0.2 },
                this.scene
            );

            marker.position = hit.pickedPoint.clone();

            const material = new StandardMaterial('rayMarkerMat', this.scene);
            material.diffuseColor = color;
            material.emissiveColor = color.scale(0.5);
            material.specularColor = new Color3(0.1, 0.1, 0.1);
            marker.material = material;

            // Store for cleanup
            this.debugMarkers.push(marker);

            // Auto-remove after a few seconds
            setTimeout(() => {
                const index = this.debugMarkers.indexOf(marker);
                if (index !== -1) {
                    this.debugMarkers.splice(index, 1);
                }
                marker.dispose();
            }, 3000);
        }
    }

    /**
     * Enable or disable debug visualization
     * @param enabled Whether debug visualization is enabled
     */
    public setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;

        // Clean up existing markers if disabling
        if (!enabled) {
            this.clearDebugMarkers();
        }
    }

    /**
     * Clear all debug visualization markers
     */
    private clearDebugMarkers(): void {
        for (const marker of this.debugMarkers) {
            marker.dispose();
        }
        this.debugMarkers = [];
    }

    /**
     * Update terrain collision (process pending raycasts)
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Process any pending raycasts
        this.processPendingRaycasts();

        // Clean up old raycast results
        if (this.rayResults.size > 100) {
            // If too many results accumulated, clean up oldest
            const keysToDelete = Array.from(this.rayResults.keys()).slice(0, 50);
            for (const key of keysToDelete) {
                this.rayResults.delete(key);
            }
        }
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Clear debug markers
        this.clearDebugMarkers();

        // Clear cached results
        this.rayResults.clear();
        this.rayQueue = [];

        this.logger.debug('Terrain collision system disposed');
    }
}
