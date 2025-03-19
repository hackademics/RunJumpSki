/**
 * @file src/core/physics/ProjectilePhysics.ts
 * @description Implementation of projectile physics system
 */

import * as BABYLON from 'babylonjs';
import { IProjectilePhysics, ProjectileConfig, ProjectileState, ProjectileImpactCallback, DEFAULT_PROJECTILE_CONFIG } from './IProjectilePhysics';
import { IPhysicsSystem } from './IPhysicsSystem';
import { ICollisionSystem, CollisionInfo } from './ICollisionSystem';

/**
 * Internal projectile data structure
 */
interface ProjectileData {
  id: string;
  config: ProjectileConfig;
  state: ProjectileState;
  mesh?: BABYLON.AbstractMesh;
  impostor?: BABYLON.PhysicsImpostor;
  startPosition: BABYLON.Vector3;
  direction: BABYLON.Vector3;
  onImpact?: ProjectileImpactCallback;
}

/**
 * Implementation of the projectile physics system
 */
export class ProjectilePhysics implements IProjectilePhysics {
  private physicsSystem: IPhysicsSystem | null = null;
  private collisionSystem: ICollisionSystem | null = null;
  private projectiles: Map<string, ProjectileData> = new Map();
  private nextId: number = 0;
  private scene: BABYLON.Scene | null = null;
  
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
      console.error('ProjectilePhysics: Failed to get scene from physics system');
    }
  }
  
  /**
   * Updates all active projectiles
   * @param deltaTime Time elapsed since the last update in seconds
   */
  public update(deltaTime: number): void {
    if (!this.scene) return;
    
    // Update each projectile
    for (const [id, projectile] of this.projectiles.entries()) {
      if (!projectile.state.isActive) continue;
      
      // Update time alive
      projectile.state.timeAlive += deltaTime;
      
      // Check if lifetime expired
      if (projectile.state.timeAlive >= projectile.config.lifetime) {
        this.destroyProjectile(id, false);
        continue;
      }
      
      // If using impostor, get position and velocity from it
      if (projectile.impostor) {
        // Update from physics engine
        projectile.state.position = projectile.impostor.getObjectCenter().clone();
        projectile.state.velocity = projectile.impostor.getLinearVelocity()?.clone() || new BABYLON.Vector3();
        
        // Calculate distance traveled
        const distanceDelta = projectile.state.velocity.scale(deltaTime).length();
        projectile.state.distanceTraveled += distanceDelta;
        
        // Check max distance
        if (projectile.config.maxDistance && 
            projectile.state.distanceTraveled >= projectile.config.maxDistance) {
          this.destroyProjectile(id, false);
          continue;
        }
      } else {
        // Manually simulate projectile physics
        this.simulateProjectile(projectile, deltaTime);
        
        // Update mesh position if it exists
        if (projectile.mesh) {
          projectile.mesh.position = projectile.state.position.clone();
          
          // Orient mesh along velocity direction
          if (projectile.state.velocity.length() > 0.001) {
            const forward = projectile.state.velocity.normalize();
            const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up()).normalize();
            const up = BABYLON.Vector3.Cross(right, forward).normalize();
            
            // Create rotation matrix directly without using non-existent method
            const rotationMatrix = new BABYLON.Matrix();
            BABYLON.Matrix.FromXYZAxesToRef(right, up, forward, rotationMatrix);
            projectile.mesh.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
          }
        }
        
        // Check for collisions with ray casting
        this.checkCollisionsWithRayCast(projectile);
      }
    }
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
      throw new Error('ProjectilePhysics: System not initialized');
    }
    
    // Create a unique ID for this projectile
    const id = `projectile_${this.nextId++}`;
    
    // Normalize the direction
    const normalizedDirection = direction.normalize();
    
    // Merge with default config
    const fullConfig: ProjectileConfig = {
      ...DEFAULT_PROJECTILE_CONFIG,
      ...config
    };
    
    // Create initial state
    const state: ProjectileState = {
      position: start.clone(),
      velocity: normalizedDirection.scale(fullConfig.initialVelocity),
      acceleration: new BABYLON.Vector3(0, 0, 0),
      distanceTraveled: 0,
      timeAlive: 0,
      isActive: true,
      hasExploded: false
    };
    
    let projectileMesh = mesh;
    let impostor: BABYLON.PhysicsImpostor | undefined;
    
    // If no mesh is provided, create a simple sphere
    if (!projectileMesh && this.scene) {
      projectileMesh = BABYLON.MeshBuilder.CreateSphere(
        `projectile_mesh_${id}`,
        { diameter: fullConfig.radius * 2 },
        this.scene
      );
      projectileMesh.position = start.clone();
      
      // Add a material
      const material = new BABYLON.StandardMaterial(`projectile_material_${id}`, this.scene);
      material.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
      projectileMesh.material = material;
    }
    
    // Create physics impostor if physics system is available
    if (projectileMesh && this.physicsSystem) {
      impostor = this.physicsSystem.createImpostor(
        projectileMesh,
        BABYLON.PhysicsImpostor.SphereImpostor,
        {
          mass: fullConfig.mass,
          restitution: fullConfig.restitution || 0.3,
          friction: 0.5
        }
      );
      
      // Set initial velocity
      impostor.setLinearVelocity(state.velocity);
      
      // Register collision handler if collision system is available
      if (this.collisionSystem) {
        const handlerId = this.collisionSystem.registerCollisionHandler(
          impostor,
          null,
          (collisionInfo: CollisionInfo) => this.handleCollision(id, collisionInfo)
        );
      }
    }
    
    // Store the projectile data
    const projectileData: ProjectileData = {
      id,
      config: fullConfig,
      state,
      mesh: projectileMesh,
      impostor,
      startPosition: start.clone(),
      direction: normalizedDirection.clone(),
      onImpact
    };
    
    this.projectiles.set(id, projectileData);
    
    return id;
  }
  
  /**
   * Destroys a projectile
   * @param id ID of the projectile to destroy
   * @param explode Whether to trigger explosion effects
   */
  public destroyProjectile(id: string, explode: boolean = false): void {
    const projectile = this.projectiles.get(id);
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
    
    // Clean up physics
    if (projectile.impostor) {
      projectile.impostor.dispose();
    }
    
    // Clean up mesh
    if (projectile.mesh) {
      projectile.mesh.dispose();
    }
    
    // Remove from map
    this.projectiles.delete(id);
  }
  
  /**
   * Gets the state of a projectile
   * @param id ID of the projectile
   * @returns Projectile state or null if not found
   */
  public getProjectileState(id: string): ProjectileState | null {
    const projectile = this.projectiles.get(id);
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
    
    // Get all impostors in the scene
    const impostors: BABYLON.PhysicsImpostor[] = [];
    this.scene.meshes.forEach(mesh => {
      if (mesh.physicsImpostor) {
        impostors.push(mesh.physicsImpostor);
      }
    });
    
    // Apply force to each impostor within radius
    for (const impostor of impostors) {
      const impostorPosition = impostor.getObjectCenter();
      const distance = BABYLON.Vector3.Distance(position, impostorPosition);
      
      // Skip if outside radius
      if (distance > radius) continue;
      
      // Calculate direction from explosion to object
      const direction = impostorPosition.subtract(position).normalize();
      
      // Calculate force magnitude based on distance (with optional falloff)
      let forceMagnitude = force;
      if (falloff) {
        forceMagnitude = force * (1 - distance / radius);
      }
      
      // Apply impulse (force scaled by mass)
      const impulse = direction.scale(forceMagnitude * impostor.mass);
      this.physicsSystem.applyImpulse(impostor, impulse, impostorPosition);
    }
  }
  
  /**
   * Handles collision events for projectiles
   * @param id ID of the projectile
   * @param collisionInfo Collision information
   */
  private handleCollision(id: string, collisionInfo: CollisionInfo): void {
    const projectile = this.projectiles.get(id);
    if (!projectile || !projectile.state.isActive) return;
    
    // Call impact callback if provided
    if (projectile.onImpact) {
      projectile.onImpact(
        id,
        collisionInfo.point,
        collisionInfo.normal,
        collisionInfo.collider
      );
    }
    
    // Destroy the projectile with explosion if it has an explosion radius
    const shouldExplode = !!projectile.config.explosionRadius && 
                        projectile.config.explosionRadius > 0;
    this.destroyProjectile(id, shouldExplode);
  }
  
  /**
   * Simulates projectile physics when not using a physics impostor
   * @param projectile Projectile to simulate
   * @param deltaTime Time elapsed since last update
   */
  private simulateProjectile(projectile: ProjectileData, deltaTime: number): void {
    // Start with gravitational force if affected by gravity
    let acceleration = new BABYLON.Vector3(0, 0, 0);
    if (projectile.config.affectedByGravity && this.scene) {
      const gravity = this.scene.gravity || new BABYLON.Vector3(0, -9.81, 0);
      acceleration = gravity.clone();
    }
    
    // Calculate air resistance (drag force)
    if (projectile.state.velocity.length() > 0) {
      // F_drag = 0.5 * dragCoeff * velocity^2 * direction
      const velocitySquared = projectile.state.velocity.length() ** 2;
      const dragMagnitude = 0.5 * projectile.config.dragCoefficient * velocitySquared;
      
      const dragDirection = projectile.state.velocity.normalize().scale(-1);
      const dragForce = dragDirection.scale(dragMagnitude);
      
      // a = F/m
      acceleration.addInPlace(dragForce.scale(1 / projectile.config.mass));
    }
    
    // Update velocity: v = v0 + a*t
    projectile.state.velocity.addInPlace(acceleration.scale(deltaTime));
    
    // Update position: p = p0 + v*t
    const positionDelta = projectile.state.velocity.scale(deltaTime);
    projectile.state.position.addInPlace(positionDelta);
    
    // Update distance traveled
    projectile.state.distanceTraveled += positionDelta.length();
    
    // Store acceleration for reference
    projectile.state.acceleration = acceleration;
    
    // Check max distance
    if (projectile.config.maxDistance && 
        projectile.state.distanceTraveled >= projectile.config.maxDistance) {
      this.destroyProjectile(projectile.id, false);
    }
  }
  
  /**
   * Checks for collisions using ray casting
   * @param projectile Projectile to check collisions for
   */
  private checkCollisionsWithRayCast(projectile: ProjectileData): void {
    if (!this.collisionSystem || !projectile.state.isActive) return;
    
    // Calculate ray from current position to next position
    // Use velocity direction and a small distance for the ray
    const rayDirection = projectile.state.velocity.normalize();
    const rayLength = Math.max(projectile.state.velocity.length() * 0.05, projectile.config.radius * 2);
    const rayTo = projectile.state.position.add(rayDirection.scale(rayLength));
    
    // Cast ray
    const hitResult = this.collisionSystem.raycast(
      projectile.state.position,
      rayTo
    );
    
    if (hitResult) {
      // Simulate a collision event
      const collisionInfo: CollisionInfo = {
        initiator: { id: projectile.id } as any, // Mock impostor
        collider: hitResult as unknown as BABYLON.PhysicsImpostor, // Cast as PhysicsImpostor as a workaround
        point: hitResult.hitPointWorld,
        normal: hitResult.hitNormalWorld,
        impulse: projectile.state.velocity.length() * projectile.config.mass
      };
      
      this.handleCollision(projectile.id, collisionInfo);
    }
  }
  
  /**
   * Cleans up resources
   */
  public destroy(): void {
    // Destroy all projectiles
    for (const id of this.projectiles.keys()) {
      this.destroyProjectile(id, false);
    }
    
    this.projectiles.clear();
    this.physicsSystem = null;
    this.collisionSystem = null;
    this.scene = null;
  }
} 