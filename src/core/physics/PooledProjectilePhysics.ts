/**
 * @file src/core/physics/PooledProjectilePhysics.ts
 * @description Implementation of projectile physics system with object pooling
 */

import * as BABYLON from 'babylonjs';
import { IProjectilePhysics, ProjectileConfig, ProjectileState, ProjectileImpactCallback, DEFAULT_PROJECTILE_CONFIG } from './IProjectilePhysics';
import { IPhysicsSystem } from './IPhysicsSystem';
import { ICollisionSystem, CollisionInfo } from './ICollisionSystem';
import { ObjectPool, IPoolable, IPoolObjectFactory } from '../utils/ObjectPool';

/**
 * Internal projectile data structure
 */
class PoolableProjectile implements IPoolable {
  /** Unique ID of the projectile */
  public id: string = '';
  /** Configuration values for the projectile */
  public config: ProjectileConfig = { ...DEFAULT_PROJECTILE_CONFIG };
  /** Current state of the projectile */
  public state: ProjectileState = {
    position: new BABYLON.Vector3(),
    velocity: new BABYLON.Vector3(),
    acceleration: new BABYLON.Vector3(),
    distanceTraveled: 0,
    timeAlive: 0,
    isActive: false,
    hasExploded: false
  };
  /** Mesh representing the projectile */
  public mesh?: BABYLON.AbstractMesh;
  /** Physics impostor for the projectile */
  public impostor?: BABYLON.PhysicsImpostor;
  /** Starting position */
  public startPosition: BABYLON.Vector3 = new BABYLON.Vector3();
  /** Direction vector */
  public direction: BABYLON.Vector3 = new BABYLON.Vector3();
  /** Callback for impact events */
  public onImpact?: ProjectileImpactCallback;
  /** Scene reference */
  public scene?: BABYLON.Scene;
  /** Collision handler ID */
  public collisionHandlerId?: string;
  /** Reference to the physics system */
  public physicsSystem?: IPhysicsSystem;
  /** Reference to the collision system */
  public collisionSystem?: ICollisionSystem;
  
  /**
   * Reset the projectile state for reuse
   */
  public reset(): void {
    // Clean up resources
    if (this.impostor) {
      this.impostor.dispose();
      this.impostor = undefined;
    }
    
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = undefined;
    }
    
    if (this.collisionHandlerId && this.collisionSystem) {
      this.collisionSystem.unregisterCollisionHandler(this.collisionHandlerId);
      this.collisionHandlerId = undefined;
    }
    
    // Reset state
    this.id = '';
    this.config = { ...DEFAULT_PROJECTILE_CONFIG };
    this.state.position.set(0, 0, 0);
    this.state.velocity.set(0, 0, 0);
    this.state.acceleration.set(0, 0, 0);
    this.state.distanceTraveled = 0;
    this.state.timeAlive = 0;
    this.state.isActive = false;
    this.state.hasExploded = false;
    this.startPosition.set(0, 0, 0);
    this.direction.set(0, 0, 0);
    this.onImpact = undefined;
  }
  
  /**
   * Initialize the projectile with new values
   */
  public initialize(
    id: string,
    start: BABYLON.Vector3,
    direction: BABYLON.Vector3,
    config: ProjectileConfig,
    scene?: BABYLON.Scene,
    mesh?: BABYLON.AbstractMesh,
    onImpact?: ProjectileImpactCallback,
    physicsSystem?: IPhysicsSystem,
    collisionSystem?: ICollisionSystem
  ): void {
    this.id = id;
    this.config = config;
    this.scene = scene;
    this.onImpact = onImpact;
    this.physicsSystem = physicsSystem;
    this.collisionSystem = collisionSystem;
    
    // Initialize state
    this.state.position = start.clone();
    this.state.velocity = direction.normalize().scale(config.initialVelocity);
    this.state.acceleration = new BABYLON.Vector3(0, 0, 0);
    this.state.distanceTraveled = 0;
    this.state.timeAlive = 0;
    this.state.isActive = true;
    this.state.hasExploded = false;
    
    this.startPosition = start.clone();
    this.direction = direction.normalize();
    
    // Create or assign mesh
    this.createMesh(mesh);
    
    // Create physics if available
    if (this.physicsSystem && this.mesh && scene) {
      this.createPhysics();
    }
  }
  
  /**
   * Create the mesh for this projectile
   */
  private createMesh(existingMesh?: BABYLON.AbstractMesh): void {
    if (existingMesh) {
      this.mesh = existingMesh;
      this.mesh.position = this.state.position.clone();
      return;
    }
    
    if (!this.scene) return;
    
    // Create a simple sphere mesh
    this.mesh = BABYLON.MeshBuilder.CreateSphere(
      `projectile_mesh_${this.id}`,
      { diameter: this.config.radius * 2 },
      this.scene
    );
    
    this.mesh.position = this.state.position.clone();
    
    // Add a material
    const material = new BABYLON.StandardMaterial(`projectile_material_${this.id}`, this.scene);
    material.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
    this.mesh.material = material;
  }
  
  /**
   * Create physics impostor for this projectile
   */
  private createPhysics(): void {
    if (!this.mesh || !this.physicsSystem) return;
    
    this.impostor = this.physicsSystem.createImpostor(
      this.mesh,
      BABYLON.PhysicsImpostor.SphereImpostor,
      {
        mass: this.config.mass,
        restitution: this.config.restitution || 0.3,
        friction: 0.5
      }
    );
    
    // Set initial velocity
    this.impostor.setLinearVelocity(this.state.velocity);
    
    // Register collision handler if collision system is available
    if (this.collisionSystem) {
      this.collisionHandlerId = this.collisionSystem.registerCollisionHandler(
        this.impostor,
        null,
        (collisionInfo: CollisionInfo) => {
          if (this.onImpact) {
            this.onImpact(
              this.id,
              collisionInfo.point,
              collisionInfo.normal,
              collisionInfo.collider
            );
          }
        }
      );
    }
  }
  
  /**
   * Update this projectile's state
   */
  public update(deltaTime: number): boolean {
    if (!this.state.isActive) return false;
    
    // Update time alive
    this.state.timeAlive += deltaTime;
    
    // Check if lifetime expired
    if (this.state.timeAlive >= this.config.lifetime) {
      return false;
    }
    
    // If using impostor, get position and velocity from it
    if (this.impostor) {
      // Update from physics engine
      this.state.position = this.impostor.getObjectCenter().clone();
      this.state.velocity = this.impostor.getLinearVelocity()?.clone() || new BABYLON.Vector3();
      
      // Calculate distance traveled
      const distanceDelta = this.state.velocity.scale(deltaTime).length();
      this.state.distanceTraveled += distanceDelta;
      
      // Check max distance
      if (this.config.maxDistance && 
          this.state.distanceTraveled >= this.config.maxDistance) {
        return false;
      }
    } else {
      // Manual simulation if no impostor
      this.simulateProjectile(deltaTime);
      
      // Update mesh position if available
      if (this.mesh) {
        this.mesh.position = this.state.position.clone();
      }
    }
    
    return true;
  }
  
  /**
   * Simulates projectile physics when not using a physics impostor
   */
  private simulateProjectile(deltaTime: number): void {
    // Start with gravitational force if affected by gravity
    let acceleration = new BABYLON.Vector3(0, 0, 0);
    if (this.config.affectedByGravity && this.scene) {
      const gravity = this.scene.gravity || new BABYLON.Vector3(0, -9.81, 0);
      acceleration = gravity.clone();
    }
    
    // Calculate air resistance (drag force)
    if (this.state.velocity.length() > 0) {
      // F_drag = 0.5 * dragCoeff * velocity^2 * direction
      const velocitySquared = this.state.velocity.length() ** 2;
      const dragMagnitude = 0.5 * this.config.dragCoefficient * velocitySquared;
      
      const dragDirection = this.state.velocity.normalize().scale(-1);
      const dragForce = dragDirection.scale(dragMagnitude);
      
      // a = F/m
      acceleration.addInPlace(dragForce.scale(1 / this.config.mass));
    }
    
    // Update velocity: v = v0 + a*t
    this.state.velocity.addInPlace(acceleration.scale(deltaTime));
    
    // Update position: p = p0 + v*t
    const positionDelta = this.state.velocity.scale(deltaTime);
    this.state.position.addInPlace(positionDelta);
    
    // Update distance traveled
    this.state.distanceTraveled += positionDelta.length();
    
    // Store acceleration for reference
    this.state.acceleration = acceleration;
  }
}

/**
 * Factory for creating poolable projectiles
 */
class ProjectileFactory implements IPoolObjectFactory<PoolableProjectile> {
  create(): PoolableProjectile {
    return new PoolableProjectile();
  }
}

/**
 * Implementation of the projectile physics system with object pooling
 */
export class PooledProjectilePhysics implements IProjectilePhysics {
  private physicsSystem: IPhysicsSystem | null = null;
  private collisionSystem: ICollisionSystem | null = null;
  private scene: BABYLON.Scene | null = null;
  
  // Map of active projectiles by ID
  private activeProjectiles: Map<string, PoolableProjectile> = new Map();
  
  // Object pool for projectiles
  private projectilePool: ObjectPool<PoolableProjectile>;
  
  // Next ID for generating unique projectile identifiers
  private nextId: number = 0;
  
  /**
   * Constructor for the pooled projectile physics system
   * @param initialPoolSize Initial size of the projectile pool
   * @param maxPoolSize Maximum size of the pool (0 for unlimited)
   */
  constructor(initialPoolSize: number = 20, maxPoolSize: number = 100) {
    this.projectilePool = new ObjectPool<PoolableProjectile>(
      new ProjectileFactory(),
      initialPoolSize,
      maxPoolSize
    );
  }
  
  /**
   * Initializes the projectile physics system
   * @param physicsSystem The physics system to use
   * @param collisionSystem The collision system to use
   */
  public initialize(physicsSystem: IPhysicsSystem, collisionSystem: ICollisionSystem): void {
    this.physicsSystem = physicsSystem;
    this.collisionSystem = collisionSystem;
    
    // Get the scene from the physics system
    const physicsEngine = this.physicsSystem.getPhysicsEngine();
    if (physicsEngine) {
      this.scene = physicsEngine.getScene();
    }
    
    if (!this.scene) {
      console.error('PooledProjectilePhysics: Failed to get scene from physics system');
    }
  }
  
  /**
   * Updates all active projectiles
   * @param deltaTime Time elapsed since the last update in seconds
   */
  public update(deltaTime: number): void {
    if (!this.scene) return;
    
    // Update each projectile and collect IDs of expired ones
    const expiredProjectiles: string[] = [];
    
    this.activeProjectiles.forEach((projectile, id) => {
      const stillActive = projectile.update(deltaTime);
      
      if (!stillActive) {
        expiredProjectiles.push(id);
      }
    });
    
    // Clean up expired projectiles
    expiredProjectiles.forEach(id => {
      this.destroyProjectile(id, false);
    });
  }
  
  /**
   * Creates and launches a projectile
   * @param start Starting position
   * @param direction Direction vector (will be normalized)
   * @param config Projectile configuration
   * @param mesh Optional mesh to represent the projectile
   * @param onImpact Optional callback when projectile impacts something
   * @returns ID of the created projectile
   */
  public createProjectile(
    start: BABYLON.Vector3,
    direction: BABYLON.Vector3,
    config: Partial<ProjectileConfig>,
    mesh?: BABYLON.AbstractMesh,
    onImpact?: ProjectileImpactCallback
  ): string {
    if (!this.scene || !this.physicsSystem) {
      throw new Error('PooledProjectilePhysics: System not initialized');
    }
    
    // Create a unique ID for this projectile
    const id = `projectile_${this.nextId++}`;
    
    // Merge with default config
    const fullConfig: ProjectileConfig = {
      ...DEFAULT_PROJECTILE_CONFIG,
      ...config
    };
    
    // Get a projectile from the pool
    const projectile = this.projectilePool.get();
    
    // Initialize the projectile
    projectile.initialize(
      id,
      start,
      direction,
      fullConfig,
      this.scene,
      mesh,
      onImpact,
      this.physicsSystem,
      this.collisionSystem || undefined
    );
    
    // Store in active projectiles map
    this.activeProjectiles.set(id, projectile);
    
    return id;
  }
  
  /**
   * Destroys a projectile
   * @param id ID of the projectile to destroy
   * @param explode Whether to trigger explosion effects
   */
  public destroyProjectile(id: string, explode: boolean = false): void {
    const projectile = this.activeProjectiles.get(id);
    if (!projectile) return;
    
    // Mark as inactive
    projectile.state.isActive = false;
    
    // Handle explosion if needed
    if (explode && !projectile.state.hasExploded) {
      projectile.state.hasExploded = true;
      
      // Apply explosion force if radius and force are defined
      if (projectile.config.explosionRadius && projectile.config.explosionForce) {
        this.applyExplosionForce(
          projectile.state.position,
          projectile.config.explosionRadius,
          projectile.config.explosionForce,
          true
        );
      }
      
      // TODO: Add particle effects for explosion
    }
    
    // Remove from active projectiles
    this.activeProjectiles.delete(id);
    
    // Return to pool
    this.projectilePool.release(projectile);
  }
  
  /**
   * Gets the state of a projectile
   * @param id ID of the projectile
   * @returns Projectile state or null if not found
   */
  public getProjectileState(id: string): ProjectileState | null {
    const projectile = this.activeProjectiles.get(id);
    return projectile ? { ...projectile.state } : null;
  }
  
  /**
   * Applies an impulse to all objects within the explosion radius
   * @param position Center of explosion
   * @param radius Radius of explosion
   * @param force Force of explosion
   * @param falloff Whether force decreases with distance (true) or is constant (false)
   */
  public applyExplosionForce(
    position: BABYLON.Vector3,
    radius: number,
    force: number,
    falloff: boolean = true
  ): void {
    if (!this.scene || !this.physicsSystem) return;
    
    // Find all meshes with impostors in the scene
    const impostors: BABYLON.PhysicsImpostor[] = this.scene.meshes
      .filter(mesh => mesh.physicsImpostor != null)
      .map(mesh => mesh.physicsImpostor!);
    
    // Apply force to each impostor within radius
    for (const impostor of impostors) {
      const impCenter = impostor.getObjectCenter();
      const distanceVector = impCenter.subtract(position);
      const distance = distanceVector.length();
      
      // Skip if outside radius
      if (distance > radius) continue;
      
      // Calculate force based on distance
      let impulseForce = force;
      if (falloff) {
        // Linear falloff with distance
        impulseForce = force * (1 - distance / radius);
      }
      
      // Normalize direction and scale by force
      const direction = distanceVector.normalize();
      const impulse = direction.scale(impulseForce);
      
      // Apply impulse at center of mass
      impostor.applyImpulse(impulse, impCenter);
    }
  }
  
  /**
   * Get the number of projectiles currently in the pool
   * @returns Number of projectiles available in the pool
   */
  public getPoolSize(): number {
    return this.projectilePool.getSize();
  }
  
  /**
   * Get the number of projectiles currently available in the pool
   * @returns Number of projectiles available for immediate use
   */
  public getAvailableProjectiles(): number {
    return this.projectilePool.available();
  }
  
  /**
   * Get the number of active projectiles
   * @returns Number of active projectiles
   */
  public getActiveProjectileCount(): number {
    return this.activeProjectiles.size;
  }
  
  /**
   * Performs cleanup of the system
   */
  public destroy(): void {
    // Destroy all active projectiles
    const projectileIds = Array.from(this.activeProjectiles.keys());
    projectileIds.forEach(id => this.destroyProjectile(id, false));
    
    // Clear maps
    this.activeProjectiles.clear();
    
    // Reset references
    this.physicsSystem = null;
    this.collisionSystem = null;
    this.scene = null;
  }
} 