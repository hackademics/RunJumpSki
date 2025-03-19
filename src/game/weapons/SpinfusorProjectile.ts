/**
 * @file src/game/weapons/SpinfusorProjectile.ts
 * @description Implementation of the Spinfusor disc projectile
 */

import * as BABYLON from 'babylonjs';
import { IProjectilePhysics, ProjectileConfig, ProjectileImpactCallback } from '../../core/physics/IProjectilePhysics';

/**
 * Default configuration for Spinfusor projectiles
 */
export const DEFAULT_SPINFUSOR_CONFIG: ProjectileConfig = {
  initialVelocity: 75,
  mass: 0.5,
  radius: 0.3,
  dragCoefficient: 0.05,
  affectedByGravity: true,
  lifetime: 5,
  maxDistance: 300,
  restitution: 0.1,
  damage: 40,
  explosionRadius: 5,
  explosionForce: 1000
};

/**
 * Material settings for Spinfusor disc
 */
export interface SpinfusorMaterialOptions {
  /**
   * Main disc color
   */
  discColor: BABYLON.Color3;
  
  /**
   * Glow color
   */
  glowColor: BABYLON.Color3;
  
  /**
   * Glow intensity
   */
  glowIntensity: number;
}

/**
 * Default material settings
 */
export const DEFAULT_SPINFUSOR_MATERIAL: SpinfusorMaterialOptions = {
  discColor: new BABYLON.Color3(0.2, 0.2, 0.8),
  glowColor: new BABYLON.Color3(0, 0.5, 1),
  glowIntensity: 1.5
};

/**
 * Implements the Spinfusor disc projectile
 */
export class SpinfusorProjectile {
  private projectilePhysics: IProjectilePhysics;
  private scene: BABYLON.Scene;
  private config: ProjectileConfig;
  private materialOptions: SpinfusorMaterialOptions;
  private projectileIds: Set<string> = new Set();
  
  /**
   * Constructor for Spinfusor projectile
   * @param scene Babylon.js scene
   * @param projectilePhysics Projectile physics system
   * @param config Optional custom projectile configuration
   * @param materialOptions Optional custom material settings
   */
  constructor(
    scene: BABYLON.Scene,
    projectilePhysics: IProjectilePhysics,
    config: Partial<ProjectileConfig> = {},
    materialOptions: Partial<SpinfusorMaterialOptions> = {}
  ) {
    this.scene = scene;
    this.projectilePhysics = projectilePhysics;
    
    // Merge with default config
    this.config = {
      ...DEFAULT_SPINFUSOR_CONFIG,
      ...config
    };
    
    // Merge with default material options
    this.materialOptions = {
      ...DEFAULT_SPINFUSOR_MATERIAL,
      ...materialOptions
    };
  }
  
  /**
   * Fire a Spinfusor disc
   * @param startPosition Starting position for the projectile
   * @param direction Direction to fire (will be normalized)
   * @param onImpact Optional callback when the projectile impacts
   * @returns ID of the fired projectile
   */
  public fire(
    startPosition: BABYLON.Vector3,
    direction: BABYLON.Vector3,
    onImpact?: ProjectileImpactCallback
  ): string {
    // Create the disc mesh
    const disc = this.createDiscMesh();
    disc.position = startPosition.clone();
    
    // Create a custom on impact handler to add visual effects
    const impactHandler: ProjectileImpactCallback = (
      projectileId: string,
      position: BABYLON.Vector3,
      normal: BABYLON.Vector3,
      targetImpostor?: BABYLON.PhysicsImpostor
    ) => {
      // Create explosion effect
      this.createExplosionEffect(position);
      
      // Call the original impact handler if provided
      if (onImpact) {
        onImpact(projectileId, position, normal, targetImpostor);
      }
      
      // Remove from tracked projectiles
      this.projectileIds.delete(projectileId);
    };
    
    // Launch the projectile
    const projectileId = this.projectilePhysics.createProjectile(
      startPosition,
      direction,
      this.config,
      disc,
      impactHandler
    );
    
    // Track this projectile
    this.projectileIds.add(projectileId);
    
    return projectileId;
  }
  
  /**
   * Creates the disc mesh for the projectile
   * @returns Disc mesh
   */
  private createDiscMesh(): BABYLON.Mesh {
    // Create a disc (cylinder with small height)
    const disc = BABYLON.MeshBuilder.CreateCylinder(
      "spinfusorDisc",
      {
        height: 0.05,
        diameter: this.config.radius * 2,
        tessellation: 24
      },
      this.scene
    );
    
    // Create material for the disc
    const material = new BABYLON.StandardMaterial("spinfusorMaterial", this.scene);
    material.diffuseColor = this.materialOptions.discColor;
    material.emissiveColor = this.materialOptions.glowColor;
    material.specularPower = 128;
    
    disc.material = material;
    
    // Add rotation for spinning effect
    const rotationAnimation = new BABYLON.Animation(
      "discRotation",
      "rotation.y",
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );
    
    // Define rotation keyframes
    const rotationKeys = [
      { frame: 0, value: 0 },
      { frame: 30, value: Math.PI * 2 }
    ];
    
    rotationAnimation.setKeys(rotationKeys);
    disc.animations.push(rotationAnimation);
    this.scene.beginAnimation(disc, 0, 30, true);
    
    // Add glow effect to the disc
    this.addGlowEffect(disc);
    
    return disc;
  }
  
  /**
   * Adds glow effect to a mesh
   * @param mesh The mesh to add glow to
   */
  private addGlowEffect(mesh: BABYLON.Mesh): void {
    // Check for existing glow layer
    const existingGlow = this.scene.getGlowLayerByName("spinfusorGlow");
    
    if (existingGlow) {
      // Suppress TypeScript error since we've already checked for null
      // @ts-ignore
      existingGlow.addIncludedOnlyMesh(mesh);
    } else {
      // Create a new glow layer if none exists
      const glowLayer = new BABYLON.GlowLayer("spinfusorGlow", this.scene);
      glowLayer.intensity = this.materialOptions.glowIntensity;
      glowLayer.addIncludedOnlyMesh(mesh);
    }
  }
  
  /**
   * Creates explosion effect at the given position
   * @param position Position for the explosion
   */
  private createExplosionEffect(position: BABYLON.Vector3): void {
    // Create explosion particle system
    const explosion = new BABYLON.ParticleSystem("explosion", 100, this.scene);
    explosion.particleTexture = new BABYLON.Texture("assets/textures/explosion.png", this.scene);
    explosion.emitter = position;
    explosion.minEmitBox = new BABYLON.Vector3(-0.5, -0.5, -0.5);
    explosion.maxEmitBox = new BABYLON.Vector3(0.5, 0.5, 0.5);
    
    // Particle properties
    explosion.color1 = new BABYLON.Color4(1, 0.5, 0.1, 1.0);
    explosion.color2 = new BABYLON.Color4(1, 0.2, 0.0, 1.0);
    explosion.colorDead = new BABYLON.Color4(0.1, 0.1, 0.1, 0.0);
    explosion.minSize = 0.3;
    explosion.maxSize = 2.0;
    explosion.minLifeTime = 0.2;
    explosion.maxLifeTime = 0.8;
    explosion.emitRate = 300;
    explosion.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    explosion.gravity = new BABYLON.Vector3(0, 0, 0);
    explosion.direction1 = new BABYLON.Vector3(-1, 1, -1);
    explosion.direction2 = new BABYLON.Vector3(1, 1, 1);
    explosion.minAngularSpeed = 0;
    explosion.maxAngularSpeed = Math.PI;
    explosion.minEmitPower = 1;
    explosion.maxEmitPower = 3;
    explosion.updateSpeed = 0.01;
    
    // Start the particle system
    explosion.start();
    
    // Stop emission after 0.2 seconds
    setTimeout(() => {
      explosion.stop();
      // Dispose after particles die out
      setTimeout(() => {
        explosion.dispose();
      }, 1000);
    }, 200);
    
    // Add explosion light
    const light = new BABYLON.PointLight("explosionLight", position, this.scene);
    light.diffuse = this.materialOptions.glowColor;
    light.specular = this.materialOptions.glowColor;
    light.intensity = 20;
    light.range = this.config.explosionRadius! * 2;
    
    // Animate light intensity
    const lightAnimation = new BABYLON.Animation(
      "lightAnimation",
      "intensity",
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    // Define light animation keys
    const lightKeys = [
      { frame: 0, value: 20 },
      { frame: 10, value: 10 },
      { frame: 20, value: 0 }
    ];
    
    lightAnimation.setKeys(lightKeys);
    light.animations.push(lightAnimation);
    
    // Play animation and dispose when done
    const animatable = this.scene.beginAnimation(light, 0, 20, false);
    animatable.onAnimationEnd = () => {
      light.dispose();
    };
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Destroy all active projectiles
    for (const id of this.projectileIds) {
      this.projectilePhysics.destroyProjectile(id, false);
    }
    
    this.projectileIds.clear();
  }
} 