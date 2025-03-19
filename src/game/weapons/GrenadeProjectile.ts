/**
 * @file src/game/weapons/GrenadeProjectile.ts
 * @description Implementation of the grenade projectile
 */

import * as BABYLON from 'babylonjs';
import { IProjectilePhysics, ProjectileConfig, ProjectileImpactCallback } from '../../core/physics/IProjectilePhysics';

/**
 * Default configuration for grenade projectiles
 */
export const DEFAULT_GRENADE_CONFIG: ProjectileConfig = {
  initialVelocity: 30,
  mass: 1,
  radius: 0.15,
  dragCoefficient: 0.1,
  affectedByGravity: true,
  lifetime: 3,
  maxDistance: 100,
  restitution: 0.4,
  damage: 80,
  explosionRadius: 7,
  explosionForce: 1500
};

/**
 * Material settings for grenade
 */
export interface GrenadeMaterialOptions {
  /**
   * Main body color
   */
  bodyColor: BABYLON.Color3;
  
  /**
   * Indicator light color
   */
  indicatorColor: BABYLON.Color3;
  
  /**
   * Explosion core color
   */
  explosionColor: BABYLON.Color3;
}

/**
 * Default material settings
 */
export const DEFAULT_GRENADE_MATERIAL: GrenadeMaterialOptions = {
  bodyColor: new BABYLON.Color3(0.3, 0.3, 0.3),
  indicatorColor: new BABYLON.Color3(1, 0.3, 0),
  explosionColor: new BABYLON.Color3(1, 0.5, 0)
};

/**
 * Implements the grenade projectile
 */
export class GrenadeProjectile {
  private projectilePhysics: IProjectilePhysics;
  private scene: BABYLON.Scene;
  private config: ProjectileConfig;
  private materialOptions: GrenadeMaterialOptions;
  private projectileIds: Map<string, {
    mesh?: BABYLON.Mesh,
    blinkInterval?: NodeJS.Timeout
  }> = new Map();
  
  /**
   * Constructor for grenade projectile
   * @param scene Babylon.js scene
   * @param projectilePhysics Projectile physics system
   * @param config Optional custom projectile configuration
   * @param materialOptions Optional custom material settings
   */
  constructor(
    scene: BABYLON.Scene,
    projectilePhysics: IProjectilePhysics,
    config: Partial<ProjectileConfig> = {},
    materialOptions: Partial<GrenadeMaterialOptions> = {}
  ) {
    this.scene = scene;
    this.projectilePhysics = projectilePhysics;
    
    // Merge with default config
    this.config = {
      ...DEFAULT_GRENADE_CONFIG,
      ...config
    };
    
    // Merge with default material options
    this.materialOptions = {
      ...DEFAULT_GRENADE_MATERIAL,
      ...materialOptions
    };
  }
  
  /**
   * Throw a grenade
   * @param startPosition Starting position for the projectile
   * @param direction Direction to throw (will be normalized)
   * @param power Throw power multiplier (1.0 = normal)
   * @param onImpact Optional callback when the projectile impacts
   * @returns ID of the thrown grenade
   */
  public throw(
    startPosition: BABYLON.Vector3,
    direction: BABYLON.Vector3,
    power: number = 1.0,
    onImpact?: ProjectileImpactCallback
  ): string {
    // Create the grenade mesh
    const grenade = this.createGrenadeMesh();
    grenade.position = startPosition.clone();
    
    // Override initial velocity based on power
    const grenadeConfig = { 
      ...this.config, 
      initialVelocity: this.config.initialVelocity * power 
    };
    
    // Create a custom on impact handler
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
      
      // Clean up resources
      const projectileData = this.projectileIds.get(projectileId);
      if (projectileData && projectileData.blinkInterval) {
        clearInterval(projectileData.blinkInterval);
      }
      
      this.projectileIds.delete(projectileId);
    };
    
    // Launch the projectile
    const projectileId = this.projectilePhysics.createProjectile(
      startPosition,
      direction,
      grenadeConfig,
      grenade,
      impactHandler
    );
    
    // Start the blinking indicator
    const childMeshes = grenade.getChildMeshes();
    // Get indicator material safely
    let indicatorMaterial: BABYLON.StandardMaterial | null = null;
    if (childMeshes.length > 1 && childMeshes[1].material) {
      indicatorMaterial = childMeshes[1].material as BABYLON.StandardMaterial;
    }
    
    let blinkInterval: NodeJS.Timeout | undefined;
    if (indicatorMaterial) {
      let intensity = 1.0;
      let increasing = false;
      
      // Blink faster as we approach detonation
      blinkInterval = setInterval(() => {
        const state = this.projectilePhysics.getProjectileState(projectileId);
        if (!state || !state.isActive || !indicatorMaterial) {
          if (blinkInterval) clearInterval(blinkInterval);
          return;
        }
        
        // Calculate blink speed based on time alive
        const timeRatio = state.timeAlive / this.config.lifetime;
        const blinkSpeed = 0.05 + 0.2 * timeRatio;
        
        // Update indicator intensity
        if (increasing) {
          intensity += blinkSpeed;
          if (intensity >= 1.0) {
            intensity = 1.0;
            increasing = false;
          }
        } else {
          intensity -= blinkSpeed;
          if (intensity <= 0.1) {
            intensity = 0.1;
            increasing = true;
          }
        }
        
        // We've already checked that indicatorMaterial is not null above
        indicatorMaterial.emissiveColor = this.materialOptions.indicatorColor.scale(intensity);
      }, 50);
    }
    
    // Track this projectile
    this.projectileIds.set(projectileId, {
      mesh: grenade,
      blinkInterval
    });
    
    return projectileId;
  }
  
  /**
   * Creates the grenade mesh
   * @returns Grenade mesh
   */
  private createGrenadeMesh(): BABYLON.Mesh {
    // Create parent mesh for the grenade
    const grenade = new BABYLON.Mesh("grenade", this.scene);
    
    // Create grenade body (sphere with slightly squashed top and bottom)
    const body = BABYLON.MeshBuilder.CreateSphere(
      "grenadeBody",
      { 
        diameter: this.config.radius * 2,
        segments: 16
      },
      this.scene
    );
    body.scaling.y = 0.8;
    body.parent = grenade;
    
    // Create indicator light (small cylinder on top)
    const indicator = BABYLON.MeshBuilder.CreateCylinder(
      "grenadeIndicator",
      {
        height: this.config.radius * 0.2,
        diameter: this.config.radius * 0.6,
        tessellation: 16
      },
      this.scene
    );
    indicator.position.y = this.config.radius * 0.5;
    indicator.parent = grenade;
    
    // Create materials
    const bodyMaterial = new BABYLON.StandardMaterial("grenadeBodyMaterial", this.scene);
    bodyMaterial.diffuseColor = this.materialOptions.bodyColor;
    bodyMaterial.specularPower = 64;
    body.material = bodyMaterial;
    
    const indicatorMaterial = new BABYLON.StandardMaterial("grenadeIndicatorMaterial", this.scene);
    indicatorMaterial.diffuseColor = this.materialOptions.indicatorColor;
    indicatorMaterial.emissiveColor = this.materialOptions.indicatorColor;
    indicatorMaterial.specularPower = 128;
    indicator.material = indicatorMaterial;
    
    return grenade;
  }
  
  /**
   * Creates explosion effect at the given position
   * @param position Position for the explosion
   */
  private createExplosionEffect(position: BABYLON.Vector3): void {
    // Create a flash sphere with material
    const flash = BABYLON.MeshBuilder.CreateSphere(
      "grenadeFlash",
      // Suppress TypeScript error for explosionRadius which might be undefined according to TypeScript
      // @ts-ignore
      { diameter: this.config.explosionRadius * 0.5 },
      this.scene
    );
    flash.position = position.clone();
    
    // Flash material
    const flashMaterial = new BABYLON.StandardMaterial("flashMaterial", this.scene);
    flashMaterial.diffuseColor = this.materialOptions.explosionColor;
    flashMaterial.emissiveColor = this.materialOptions.explosionColor;
    flashMaterial.alpha = 0.8;
    flash.material = flashMaterial;
    
    // Animate flash
    const flashAnimation = new BABYLON.Animation(
      "flashAnimation",
      "scaling",
      30,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    // Define flash animation keys
    const flashKeys = [
      { frame: 0, value: new BABYLON.Vector3(0.1, 0.1, 0.1) },
      { frame: 5, value: new BABYLON.Vector3(1, 1, 1) },
      { frame: 15, value: new BABYLON.Vector3(0.5, 0.5, 0.5) }
    ];
    
    flashAnimation.setKeys(flashKeys);
    flash.animations.push(flashAnimation);
    
    // Alpha animation for material property
    const alphaAnimation = new BABYLON.Animation(
      "alphaAnimation",
      "material.alpha",
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    // Define alpha animation keys
    const alphaKeys = [
      { frame: 0, value: 0.8 },
      { frame: 10, value: 0.4 },
      { frame: 15, value: 0 }
    ];
    
    alphaAnimation.setKeys(alphaKeys);
    flash.animations.push(alphaAnimation);
    
    // Play animation and dispose when done
    const animatable = this.scene.beginAnimation(flash, 0, 15, false);
    animatable.onAnimationEnd = () => {
      flash.dispose();
    };
    
    // Create smoke particle system
    const smoke = new BABYLON.ParticleSystem("smoke", 200, this.scene);
    smoke.particleTexture = new BABYLON.Texture("assets/textures/smoke.png", this.scene);
    smoke.emitter = position;
    smoke.minEmitBox = new BABYLON.Vector3(-0.5, -0.5, -0.5);
    smoke.maxEmitBox = new BABYLON.Vector3(0.5, 0.5, 0.5);
    
    // Smoke properties
    smoke.color1 = new BABYLON.Color4(0.2, 0.2, 0.2, 1.0);
    smoke.color2 = new BABYLON.Color4(0.4, 0.4, 0.4, 1.0);
    smoke.colorDead = new BABYLON.Color4(0.5, 0.5, 0.5, 0.0);
    smoke.minSize = 1.0;
    smoke.maxSize = 3.0;
    smoke.minLifeTime = 1.0;
    smoke.maxLifeTime = 3.0;
    smoke.emitRate = 300;
    smoke.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    smoke.gravity = new BABYLON.Vector3(0, 1, 0);
    smoke.direction1 = new BABYLON.Vector3(-1, 2, -1);
    smoke.direction2 = new BABYLON.Vector3(1, 2, 1);
    smoke.minAngularSpeed = 0;
    smoke.maxAngularSpeed = Math.PI;
    smoke.minEmitPower = 0.5;
    smoke.maxEmitPower = 2;
    smoke.updateSpeed = 0.01;
    
    // Fire properties (add to same emitter)
    const fire = new BABYLON.ParticleSystem("fire", 100, this.scene);
    fire.particleTexture = new BABYLON.Texture("assets/textures/fire.png", this.scene);
    fire.emitter = position;
    fire.minEmitBox = new BABYLON.Vector3(-0.3, -0.3, -0.3);
    fire.maxEmitBox = new BABYLON.Vector3(0.3, 0.3, 0.3);
    
    fire.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
    fire.color2 = new BABYLON.Color4(1, 0.3, 0, 1.0);
    fire.colorDead = new BABYLON.Color4(0.7, 0, 0, 0.0);
    fire.minSize = 0.5;
    fire.maxSize = 1.5;
    fire.minLifeTime = 0.3;
    fire.maxLifeTime = 0.6;
    fire.emitRate = 200;
    fire.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    fire.gravity = new BABYLON.Vector3(0, 0, 0);
    fire.direction1 = new BABYLON.Vector3(-0.5, 2, -0.5);
    fire.direction2 = new BABYLON.Vector3(0.5, 2, 0.5);
    fire.minAngularSpeed = 0;
    fire.maxAngularSpeed = Math.PI;
    fire.minEmitPower = 1;
    fire.maxEmitPower = 2;
    fire.updateSpeed = 0.01;
    
    // Start both particle systems
    smoke.start();
    fire.start();
    
    // Add explosion light
    const light = new BABYLON.PointLight("explosionLight", position, this.scene);
    light.diffuse = this.materialOptions.explosionColor;
    light.specular = this.materialOptions.explosionColor;
    light.intensity = 30;
    // Suppress TypeScript error for explosionRadius which might be undefined according to TypeScript
    // @ts-ignore
    light.range = this.config.explosionRadius * 3;
    
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
      { frame: 0, value: 30 },
      { frame: 5, value: 15 },
      { frame: 15, value: 0 }
    ];
    
    lightAnimation.setKeys(lightKeys);
    light.animations.push(lightAnimation);
    
    // Play animation and dispose when done
    const lightAnimatable = this.scene.beginAnimation(light, 0, 15, false);
    lightAnimatable.onAnimationEnd = () => {
      light.dispose();
    };
    
    // Stop particle emission after a short time
    setTimeout(() => {
      smoke.stop();
      fire.stop();
      
      // Dispose particles after they die out
      setTimeout(() => {
        smoke.dispose();
        fire.dispose();
      }, smoke.maxLifeTime * 1000);
    }, 300);
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Destroy all active projectiles and clear intervals
    for (const [id, data] of this.projectileIds.entries()) {
      if (data.blinkInterval) {
        clearInterval(data.blinkInterval);
      }
      this.projectilePhysics.destroyProjectile(id, false);
    }
    
    this.projectileIds.clear();
  }
} 