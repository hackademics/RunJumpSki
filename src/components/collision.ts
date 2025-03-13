import {
    Scene,
    Mesh,
    Vector3,
    PhysicsImpostor,
    Ray,
    RayHelper,
    AbstractMesh,
    MeshBuilder,
    PickingInfo,
    Material,
    StandardMaterial,
    Color3
} from '@babylonjs/core';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { ICollisionComponent, TerrainData } from '../types/components';
import { SurfaceType, DefaultSurfaces, RaycastHit } from '../types/physics';
import { TerrainGenerator } from '../terrain/generator';

/**
 * Collision component options
 */
export interface CollisionComponentOptions {
    /**
     * Offset from entity position for ground checks
     */
    groundCheckOffset?: Vector3;

    /**
     * Distance to check for ground
     */
    groundCheckDistance?: number;

    /**
     * Maximum slope angle to be considered "ground" (in radians)
     */
    maxGroundAngle?: number;

    /**
     * Whether to show debug visuals
     */
    debug?: boolean;

    /**
     * Collision groups to check against
     */
    collisionGroups?: number[];

    /**
     * Whether to use continuous collision detection
     */
    continuousCollision?: boolean;
}

/**
 * Default collision component options
 */
const DefaultOptions: CollisionComponentOptions = {
    groundCheckOffset: new Vector3(0, 0.1, 0),
    groundCheckDistance: 2,
    maxGroundAngle: Math.PI / 3, // 60 degrees
    debug: false,
    collisionGroups: [0],
    continuousCollision: true
};

/**
 * Collision component for entities
 */
export class CollisionComponent implements ICollisionComponent {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private entity: any;
    private options: CollisionComponentOptions;
    private mesh?: Mesh;
    private impostor?: PhysicsImpostor;
    private isGrounded: boolean = false;
    private terrainData?: TerrainData;
    private terrain?: TerrainGenerator;
    private debugRay?: Ray;
    private debugRayHelper?: RayHelper;
    private lastCollisions: Set<AbstractMesh> = new Set();
    private continuousCollisionVelocity: Vector3 = Vector3.Zero();
    private collisionNormal: Vector3 = new Vector3(0, 1, 0);

    /**
     * Create a new collision component
     * @param entity The entity this component belongs to
     * @param scene The scene
     * @param events The event emitter
     * @param options Configuration options
     */
    constructor(
        entity: any,
        scene: Scene,
        events: IEventEmitter,
        options: CollisionComponentOptions = {}
    ) {
        this.logger = new Logger(`CollisionComponent:${entity.id || 'unknown'}`);
        this.scene = scene;
        this.events = events;
        this.entity = entity;
        this.options = { ...DefaultOptions, ...options };

        this.logger.debug('Collision component created');

        // Set up event subscriptions
        this.setupEventHandlers();
    }

    /**
     * Initialize the collision component with a mesh
     * @param mesh The mesh to use for collision
     */
    public init(mesh: Mesh): void {
        this.mesh = mesh;
        this.logger.debug(`Initialized with mesh: ${mesh.name}`);

        // If debug mode is enabled, create visualization for ground check ray
        if (this.options.debug) {
            this.setupDebugVisuals();
        }
    }

    /**
     * Setup event handlers
     */
    private setupEventHandlers(): void {
        // Listen for level load events to get terrain reference
        this.events.on(GameEvent.LEVEL_LOAD, (data) => {
            if (data.terrain) {
                this.terrain = data.terrain;
                this.logger.debug('Terrain reference acquired');
            }
        });
    }

    /**
     * Set up debug visualizations
     */
    private setupDebugVisuals(): void {
        // Create a ray for ground checking visualization
        this.debugRay = new Ray(Vector3.Zero(), new Vector3(0, -1, 0), this.options.groundCheckDistance!);
        this.debugRayHelper = new RayHelper(this.debugRay);
        this.debugRayHelper.show(this.scene, new Color3(1, 0, 0));

        this.logger.debug('Debug visualizations initialized');
    }

    /**
     * Create physics impostor for a mesh
     * @param mesh The mesh to create impostor for
     * @param scene The Babylon.js scene
     */
    public createImpostor(mesh: Mesh, scene: Scene): void {
        if (!mesh) {
            this.logger.error('Cannot create impostor: No mesh provided');
            return;
        }

        try {
            // Create physics impostor
            this.impostor = new PhysicsImpostor(
                mesh,
                PhysicsImpostor.BoxImpostor,
                {
                    mass: 1,
                    friction: 0.5,
                    restitution: 0.2
                },
                scene
            );

            // Set up collision callbacks
            this.impostor.registerOnPhysicsCollide(this.options.collisionGroups!, (collider, collidedWith) => {
                this.handleCollision(collider, collidedWith);
            });

            this.mesh = mesh;
            this.logger.debug(`Created physics impostor for ${mesh.name}`);
        } catch (error) {
            this.logger.error('Failed to create impostor', error);
        }
    }

    /**
     * Handle physics collision
     * @param collider The collider
     * @param collidedWith The object that was collided with
     */
    private handleCollision(collider: PhysicsImpostor, collidedWith: PhysicsImpostor): void {
        if (!this.mesh || !collidedWith.object) return;

        // Get collision normal (approximate)
        const collidedMesh = collidedWith.object as AbstractMesh;
        const position = this.mesh.position;
        const otherPosition = collidedMesh.position;

        // Calculate direction from other object to this one
        // This is a simplified approximation of the collision normal
        const direction = position.subtract(otherPosition);
        direction.normalize();

        // Check if this is a "ground" collision
        const upDot = Vector3.Dot(direction, Vector3.Up());
        const isGroundCollision = upDot > Math.cos(this.options.maxGroundAngle!);

        if (isGroundCollision) {
            this.isGrounded = true;
            this.collisionNormal = direction.clone();
        }

        // Store collision normal for use by other components
        this.collisionNormal = direction.clone();

        // If this is a terrain mesh, get terrain data
        if (this.terrain && collidedMesh.name.startsWith('terrain')) {
            this.updateTerrainData();
        }

        // Track collisions for this frame
        this.lastCollisions.add(collidedMesh);

        // Emit collision event
        this.events.emit(GameEvent.COLLISION_START, {
            entity: this.entity,
            collidedWith: collidedMesh,
            normal: direction,
            terrainData: this.terrainData
        });
    }

    /**
     * Perform a ground check using raycasting
     */
    private checkGround(): boolean {
        if (!this.mesh) return false;

        const origin = this.mesh.position.add(this.options.groundCheckOffset!);
        const direction = new Vector3(0, -1, 0);
        const length = this.options.groundCheckDistance!;

        // Update debug ray if enabled
        if (this.debugRay && this.debugRayHelper) {
            this.debugRay.origin = origin;
            this.debugRay.direction = direction;
            this.debugRay.length = length;
            this.debugRayHelper.update();
        }

        // Cast ray from slightly above the entity straight down
        const pickInfo = this.scene.pickWithRay(
            new Ray(origin, direction, length),
            (mesh) => {
                // Exclude the entity's own mesh
                return mesh !== this.mesh;
            }
        );

        // If we hit something, check if it's ground
        if (pickInfo && pickInfo.hit) {
            const hitNormal = pickInfo.getNormal(true);
            if (hitNormal) {
                // Check angle against up vector to determine if we're on ground
                const upDot = Vector3.Dot(hitNormal, Vector3.Up());
                const isGround = upDot > Math.cos(this.options.maxGroundAngle!);

                // If it's ground, update terrain data and emit event
                if (isGround) {
                    this.isGrounded = true;
                    this.collisionNormal = hitNormal;

                    // If this is terrain, update terrain data
                    if (this.terrain && pickInfo.pickedMesh?.name.startsWith('terrain')) {
                        this.updateTerrainData();
                    }

                    // Add to collision list
                    if (pickInfo.pickedMesh) {
                        this.lastCollisions.add(pickInfo.pickedMesh);
                    }

                    // Emit collision event only if not already colliding
                    if (pickInfo.pickedMesh && !this.lastCollisions.has(pickInfo.pickedMesh)) {
                        this.events.emit(GameEvent.COLLISION_START, {
                            entity: this.entity,
                            collidedWith: pickInfo.pickedMesh,
                            normal: hitNormal,
                            terrainData: this.terrainData
                        });
                    }

                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Update terrain data based on current position
     */
    private updateTerrainData(): void {
        if (!this.terrain || !this.mesh) return;

        // Get position
        const position = this.mesh.position;

        // Get terrain data at current position
        this.terrainData = this.terrain.getTerrainDataAt(position.x, position.z);

        // If debug is enabled, create a visualization of the surface normal
        if (this.options.debug && this.terrainData) {
            // Create a temporary mesh to visualize the normal
            const normalLine = MeshBuilder.CreateLines('normalLine',
                {
                    points: [
                        position,
                        position.add(this.terrainData.normal.scale(2))
                    ]
                },
                this.scene
            );

            // Set color based on surface type
            let color = new Color3(1, 1, 1);
            if (this.terrainData.surfaceType === SurfaceType.SKIABLE) {
                color = new Color3(0, 0, 1);
            } else if (this.terrainData.surfaceType === SurfaceType.ICE) {
                color = new Color3(0, 1, 1);
            }

            const material = new StandardMaterial('normalMaterial', this.scene);
            material.emissiveColor = color;
            normalLine.material = material;

            // Dispose after a short time
            setTimeout(() => {
                normalLine.dispose();
            }, 100);
        }
    }

    /**
     * Perform continuous collision detection for high-speed movement
     */
    private performContinuousCollision(): void {
        if (!this.mesh || !this.options.continuousCollision) return;

        // Get current velocity
        const velocity = this.continuousCollisionVelocity;
        if (velocity.lengthSquared() < 0.01) return;

        // Calculate ray length based on velocity
        const speed = velocity.length();
        const rayLength = Math.max(1, speed * 0.1); // Adjust based on physics timestep

        // Cast ray in direction of movement
        const direction = velocity.normalize();
        const origin = this.mesh.position;

        const ray = new Ray(origin, direction, rayLength);
        const pickInfo = this.scene.pickWithRay(ray, (mesh) => mesh !== this.mesh);

        // Handle potential collisions
        if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
            // Calculate collision normal and impact position
            const hitNormal = pickInfo.getNormal(true) || new Vector3(0, 1, 0);

            // Calculate reflection vector
            const reflection = velocity.subtract(
                hitNormal.scale(2 * Vector3.Dot(velocity, hitNormal))
            );

            // Trigger collision event
            this.events.emit(GameEvent.COLLISION_START, {
                entity: this.entity,
                collidedWith: pickInfo.pickedMesh,
                normal: hitNormal,
                terrainData: this.terrainData,
                velocity: velocity.clone(),
                reflection: reflection
            });

            // Add to collision list
            this.lastCollisions.add(pickInfo.pickedMesh);
        }
    }

    /**
     * Update the collision component
     * @param deltaTime Time since last update
     */
    public update(deltaTime: number): void {
        if (!this.mesh) return;

        // Clear last collisions
        const prevCollisions = new Set(this.lastCollisions);
        this.lastCollisions.clear();

        // Check if grounded using raycasting
        const wasGrounded = this.isGrounded;
        this.isGrounded = this.checkGround();

        // If we were grounded but aren't anymore, emit event
        if (wasGrounded && !this.isGrounded) {
            this.events.emit(GameEvent.COLLISION_END, {
                entity: this.entity,
                normal: new Vector3(0, 1, 0),
                wasGrounded: true
            });
        }

        // Perform continuous collision detection for high speeds
        this.performContinuousCollision();

        // Check for collision end events
        for (const mesh of prevCollisions) {
            if (!this.lastCollisions.has(mesh)) {
                this.events.emit(GameEvent.COLLISION_END, {
                    entity: this.entity,
                    collidedWith: mesh
                });
            }
        }
    }

    /**
     * Set velocity for continuous collision detection
     * @param velocity Current velocity vector
     */
    public setVelocity(velocity: Vector3): void {
        this.continuousCollisionVelocity = velocity.clone();
    }

    /**
     * Perform a raycast
     * @param origin Origin position
     * @param direction Direction vector
     * @param distance Maximum distance
     * @param predicate Optional mesh filter function
     */
    public raycast(
        origin: Vector3,
        direction: Vector3,
        distance: number,
        predicate?: (mesh: AbstractMesh) => boolean
    ): RaycastHit {
        // Normalize direction
        const normalizedDirection = direction.normalize();

        // Create ray
        const ray = new Ray(origin, normalizedDirection, distance);

        // Cast ray
        const pickInfo = this.scene.pickWithRay(ray, predicate);

        // Convert to standard return format
        const result: RaycastHit = {
            hit: pickInfo?.hit || false
        };

        if (pickInfo?.hit) {
            result.position = pickInfo.pickedPoint?.clone();
            result.normal = pickInfo.getNormal(true)?.clone();
            result.distance = pickInfo.distance;
            result.object = pickInfo.pickedMesh;
        }

        return result;
    }

    /**
     * Check if currently colliding with something
     */
    public isColliding(): boolean {
        return this.lastCollisions.size > 0;
    }

    /**
     * Check if entity is on the ground
     */
    public isOnGround(): boolean {
        return this.isGrounded;
    }

    /**
     * Get terrain data at current position
     */
    public getTerrainData(): TerrainData | undefined {
        return this.terrainData;
    }

    /**
     * Get collision normal
     */
    public getCollisionNormal(): Vector3 {
        return this.collisionNormal.clone();
    }

    /**
     * Get physics impostor
     */
    public getImpostor(): PhysicsImpostor | undefined {
        return this.impostor;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.debugRayHelper) {
            this.debugRayHelper.dispose();
        }

        if (this.impostor) {
            this.impostor.dispose();
        }

        this.logger.debug('Collision component disposed');
    }
}
