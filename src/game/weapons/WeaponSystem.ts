/**
 * @file src/game/weapons/WeaponSystem.ts
 * @description Weapon system that integrates pooled projectile physics for performance optimization
 */

import * as BABYLON from 'babylonjs';
import { System } from '../../core/base/System';
import { ISystem } from '../../core/base/ISystem';
import { ServiceLocator } from '../../core/base/ServiceLocator';
import { ILogger } from '../../core/utils/ILogger';
import { IPhysicsSystem } from '../../core/physics/IPhysicsSystem';
import { ICollisionSystem } from '../../core/physics/ICollisionSystem';
import { PooledProjectilePhysics } from '../../core/physics/PooledProjectilePhysics';
import { ISceneManager } from '../../core/renderer/ISceneManager';
import { EventEmitter } from '../../core/events/EventEmitter';
import { SpinfusorProjectile } from './SpinfusorProjectile';
import { GrenadeProjectile } from './GrenadeProjectile';

/**
 * Configuration options for the weapon system
 */
export interface WeaponSystemOptions {
  /** Initial size of the projectile pool */
  initialPoolSize: number;
  /** Maximum size of the projectile pool */
  maxPoolSize: number;
  /** Whether to enable performance monitoring */
  enablePerformanceMonitoring: boolean;
}

/**
 * Default configuration for the weapon system
 */
export const DEFAULT_WEAPON_SYSTEM_OPTIONS: WeaponSystemOptions = {
  initialPoolSize: 30,
  maxPoolSize: 150,
  enablePerformanceMonitoring: true
};

/**
 * Weapon system that integrates pooled projectile physics for performance
 */
export class WeaponSystem extends System implements ISystem {
  /** System type identifier */
  public readonly type: string = 'weaponSystem';

  /** Pooled projectile physics engine */
  private pooledProjectilePhysics: PooledProjectilePhysics;

  /** Spinfusor weapon instance */
  private spinfusorWeapon: SpinfusorProjectile | null = null;
  
  /** Grenade weapon instance */
  private grenadeWeapon: GrenadeProjectile | null = null;

  /** Physics system reference */
  private physicsSystem: IPhysicsSystem | null = null;
  
  /** Collision system reference */
  private collisionSystem: ICollisionSystem | null = null;
  
  /** Scene manager reference */
  private sceneManager: ISceneManager | null = null;
  
  /** Logger instance */
  private logger: ILogger | null = null;
  
  /** Event emitter for weapon events */
  private eventEmitter: EventEmitter | null = null;
  
  /** Options for the weapon system */
  private options: WeaponSystemOptions;

  /** Performance monitoring data */
  private performanceData = {
    activeProjectiles: 0,
    pooledProjectiles: 0,
    projectileCreationTimeMs: 0,
    lastUpdateTimeMs: 0
  };

  /**
   * Create a new weapon system
   */
  constructor(options: Partial<WeaponSystemOptions> = {}) {
    super();
    this.options = { ...DEFAULT_WEAPON_SYSTEM_OPTIONS, ...options };
    
    // Create pooled projectile physics with configured pool sizes
    this.pooledProjectilePhysics = new PooledProjectilePhysics(
      this.options.initialPoolSize,
      this.options.maxPoolSize
    );
  }

  /**
   * Initialize the weapon system
   */
  public async initialize(): Promise<void> {
    // Get services using ServiceLocator.getInstance().get() method
    const serviceLocator = ServiceLocator.getInstance();
    this.logger = serviceLocator.get<ILogger>('logger');
    this.logger?.info('[WeaponSystem] Initializing weapon system with pooled projectile physics');
    
    // Retrieve required systems
    this.physicsSystem = serviceLocator.get<IPhysicsSystem>('physicsSystem');
    this.collisionSystem = serviceLocator.get<ICollisionSystem>('collisionSystem');
    this.sceneManager = serviceLocator.get<ISceneManager>('sceneManager');
    this.eventEmitter = serviceLocator.get<EventEmitter>('eventEmitter');
    
    if (!this.physicsSystem) {
      this.logger?.error('[WeaponSystem] Physics system not found');
      throw new Error('Physics system not found');
    }
    
    if (!this.collisionSystem) {
      this.logger?.error('[WeaponSystem] Collision system not found');
      throw new Error('Collision system not found');
    }
    
    if (!this.sceneManager) {
      this.logger?.error('[WeaponSystem] Scene manager not found');
      throw new Error('Scene manager not found');
    }
    
    // Initialize pooled projectile physics
    this.pooledProjectilePhysics.initialize(this.physicsSystem, this.collisionSystem);
    
    // Get the current active scene
    const scene = this.sceneManager.getActiveScene();
    if (!scene) {
      this.logger?.error('[WeaponSystem] No active scene found');
      throw new Error('No active scene found');
    }
    
    // Initialize weapon instances
    this.spinfusorWeapon = new SpinfusorProjectile(scene, this.pooledProjectilePhysics);
    this.grenadeWeapon = new GrenadeProjectile(scene, this.pooledProjectilePhysics);
    
    this.logger?.info('[WeaponSystem] Weapon system initialized');
    this.logger?.info(`[WeaponSystem] Pooled projectiles available: ${this.pooledProjectilePhysics.getAvailableProjectiles()}`);
  }
  
  /**
   * Update the weapon system
   */
  public update(deltaTime: number): void {
    const startTime = performance.now();
    
    // Update pooled projectile physics
    this.pooledProjectilePhysics.update(deltaTime);
    
    // Update performance monitoring data if enabled
    if (this.options.enablePerformanceMonitoring) {
      this.performanceData.activeProjectiles = this.pooledProjectilePhysics.getActiveProjectileCount();
      this.performanceData.pooledProjectiles = this.pooledProjectilePhysics.getAvailableProjectiles();
      this.performanceData.lastUpdateTimeMs = performance.now() - startTime;
      
      // Log performance data every few seconds (not every frame)
      if (Math.random() < 0.01) { // ~1% chance per frame to log
        this.logger?.debug(`[WeaponSystem] Performance: ` +
          `Active: ${this.performanceData.activeProjectiles}, ` +
          `Pooled: ${this.performanceData.pooledProjectiles}, ` +
          `Update: ${this.performanceData.lastUpdateTimeMs.toFixed(2)}ms`);
      }
    }
  }
  
  /**
   * Fire a spinfusor projectile
   */
  public fireSpinfusor(startPosition: BABYLON.Vector3, direction: BABYLON.Vector3): string | null {
    if (!this.spinfusorWeapon) {
      this.logger?.error('[WeaponSystem] Spinfusor weapon not initialized');
      return null;
    }
    
    const startTime = performance.now();
    const projectileId = this.spinfusorWeapon.fire(startPosition, direction);
    
    if (this.options.enablePerformanceMonitoring) {
      this.performanceData.projectileCreationTimeMs = performance.now() - startTime;
    }
    
    return projectileId;
  }
  
  /**
   * Fire a grenade projectile
   */
  public fireGrenade(startPosition: BABYLON.Vector3, direction: BABYLON.Vector3, power: number = 1.0): string | null {
    if (!this.grenadeWeapon) {
      this.logger?.error('[WeaponSystem] Grenade weapon not initialized');
      return null;
    }
    
    const startTime = performance.now();
    // GrenadeProjectile uses throw method instead of fire
    const projectileId = this.grenadeWeapon.throw(startPosition, direction, power);
    
    if (this.options.enablePerformanceMonitoring) {
      this.performanceData.projectileCreationTimeMs = performance.now() - startTime;
    }
    
    return projectileId;
  }
  
  /**
   * Get current weapon system performance data
   */
  public getPerformanceData() {
    return { ...this.performanceData };
  }
  
  /**
   * Clean up resources
   */
  public async dispose(): Promise<void> {
    this.logger?.info('[WeaponSystem] Disposing weapon system');
    
    if (this.spinfusorWeapon) {
      this.spinfusorWeapon.dispose();
      this.spinfusorWeapon = null;
    }
    
    if (this.grenadeWeapon) {
      this.grenadeWeapon.dispose();
      this.grenadeWeapon = null;
    }
    
    // Clean up pooled projectile physics
    this.pooledProjectilePhysics.dispose();
    
    this.logger?.info('[WeaponSystem] Weapon system disposed');
  }
} 

