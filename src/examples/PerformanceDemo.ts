/**
 * @file src/examples/PerformanceDemo.ts
 * @description Demo showing the performance optimizations working together
 */

import * as BABYLON from 'babylonjs';
import { ServiceLocator } from '../core/ServiceLocator';
import { IPhysicsSystem } from '../core/physics/IPhysicsSystem';
import { ICollisionSystem } from '../core/physics/ICollisionSystem';
import { PooledProjectilePhysics } from '../core/physics/PooledProjectilePhysics';
import { PooledParticleSystemManager } from '../core/renderer/particles/PooledParticleSystemManager';
import { ParticleEffectType } from '../core/renderer/particles/IParticleSystemManager';
import { AdaptiveRenderingSystem, QualityLevel } from '../core/renderer/AdaptiveRenderingSystem';
import { PerformanceMetricsManager } from '../core/debug/metrics/PerformanceMetricsManager';
import { ITerrainRenderer } from '../core/renderer/terrain/ITerrainRenderer';
import { IPostProcessingManager } from '../core/renderer/effects/IPostProcessingManager';

/**
 * Demo class showing all performance optimizations working together
 */
export class PerformanceDemo {
  private canvas: HTMLCanvasElement;
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private camera: BABYLON.FreeCamera;
  
  // Systems
  private physicsSystem: IPhysicsSystem;
  private collisionSystem: ICollisionSystem;
  private pooledProjectilePhysics: PooledProjectilePhysics;
  private pooledParticleManager: PooledParticleSystemManager;
  private metricsManager: PerformanceMetricsManager;
  private adaptiveRenderingSystem: AdaptiveRenderingSystem;
  
  // References for optional systems
  private terrainRenderer?: ITerrainRenderer;
  private postProcessingManager?: IPostProcessingManager;
  
  // Variables
  private projectileCount: number = 0;
  private explosionCount: number = 0;
  private statsElement: HTMLElement | null = null;
  private stressLevel: number = 0;
  private qualityLabels: Record<QualityLevel, string> = {
    [QualityLevel.VERY_LOW]: 'Very Low',
    [QualityLevel.LOW]: 'Low',
    [QualityLevel.MEDIUM]: 'Medium',
    [QualityLevel.HIGH]: 'High',
    [QualityLevel.ULTRA]: 'Ultra'
  };
  
  /**
   * Constructor
   * @param canvasId ID of the canvas element
   */
  constructor(canvasId: string) {
    // Get the canvas
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas with ID ${canvasId} not found`);
    }
    
    // Create engine and scene
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = new BABYLON.Scene(this.engine);
    
    // Set up basic scene
    this.camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 5, -10), this.scene);
    this.camera.setTarget(BABYLON.Vector3.Zero());
    this.camera.attachControl(this.canvas, true);
    
    // Add light
    const light = new BABYLON.DirectionalLight('light', new BABYLON.Vector3(0, -1, 1), this.scene);
    light.intensity = 0.8;
    
    // Add ground
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 100, height: 100 }, this.scene);
    const groundMaterial = new BABYLON.StandardMaterial('groundMaterial', this.scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    ground.material = groundMaterial;
    
    // Get required systems from ServiceLocator if available,
    // otherwise create them directly for the demo
    this.physicsSystem = ServiceLocator.resolve<IPhysicsSystem>('IPhysicsSystem') || 
      this.createPhysicsSystem();
    
    this.collisionSystem = ServiceLocator.resolve<ICollisionSystem>('ICollisionSystem') || 
      this.createCollisionSystem();
    
    // Create performance metrics manager
    this.metricsManager = new PerformanceMetricsManager(this.scene);
    this.metricsManager.initialize();
    this.metricsManager.startRecording();
    
    // Create the pooled systems
    this.pooledProjectilePhysics = new PooledProjectilePhysics(100, 500);
    this.pooledProjectilePhysics.initialize(this.physicsSystem, this.collisionSystem);
    
    this.pooledParticleManager = new PooledParticleSystemManager(50, 200);
    this.pooledParticleManager.initialize(this.scene);
    
    // Resolve optional systems
    this.terrainRenderer = ServiceLocator.resolve<ITerrainRenderer>('ITerrainRenderer');
    this.postProcessingManager = ServiceLocator.resolve<IPostProcessingManager>('IPostProcessingManager');
    
    // Create adaptive rendering system
    this.adaptiveRenderingSystem = new AdaptiveRenderingSystem(
      this.scene,
      this.metricsManager,
      {
        // Override default config if needed
        showQualityChangeNotifications: true,
        samplesBeforeAdjustment: 10
      }
    );
    
    // Initialize adaptive rendering system
    this.adaptiveRenderingSystem.initialize(
      this.terrainRenderer,
      this.pooledParticleManager,
      this.postProcessingManager
    );
    
    // Set up quality change callback
    this.adaptiveRenderingSystem.onQualityChange((newLevel, oldLevel) => {
      console.log(`Quality changed from ${this.qualityLabels[oldLevel]} to ${this.qualityLabels[newLevel]}`);
      this.updateStats();
    });
    
    // Create UI
    this.createUI();
    
    // Start the render loop
    this.engine.runRenderLoop(() => {
      const deltaTime = this.engine.getDeltaTime() / 1000;
      this.update(deltaTime);
      this.scene.render();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }
  
  /**
   * Create a physics system for the demo if not available from ServiceLocator
   */
  private createPhysicsSystem(): IPhysicsSystem {
    console.warn('Creating minimal physics system for demo - full functionality may not be available');
    
    // Initialize Babylon.js CannonJS plugin
    const gravityVector = new BABYLON.Vector3(0, -9.81, 0);
    const physicsPlugin = new BABYLON.CannonJSPlugin();
    this.scene.enablePhysics(gravityVector, physicsPlugin);
    
    // Return a minimal implementation
    return {
      initialize: () => {},
      createImpostor: (mesh, type, options) => {
        return new BABYLON.PhysicsImpostor(mesh, type, options, this.scene);
      },
      getImpostor: () => undefined,
      removeImpostor: () => {},
      applyForce: () => {},
      applyImpulse: () => {},
      setLinearVelocity: () => {},
      setAngularVelocity: () => {},
      getPhysicsEngine: () => this.scene.getPhysicsEngine() || null,
      isEnabled: () => true,
      setEnabled: () => {},
      update: () => {},
      raycast: () => null,
      dispose: () => {}
    };
  }
  
  /**
   * Create a collision system for the demo if not available from ServiceLocator
   */
  private createCollisionSystem(): ICollisionSystem {
    console.warn('Creating minimal collision system for demo - full functionality may not be available');
    
    // Return a minimal implementation
    return {
      initialize: () => {},
      registerCollisionHandler: () => 'handler-id',
      unregisterCollisionHandler: () => {},
      checkCollision: () => false,
      getColliding: () => [],
      isEnabled: () => true,
      setEnabled: () => {},
      update: () => {},
      dispose: () => {}
    };
  }
  
  /**
   * Create the UI
   */
  private createUI(): void {
    // Create container div
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '10px';
    container.style.left = '10px';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    container.style.color = 'white';
    container.style.padding = '10px';
    container.style.borderRadius = '5px';
    container.style.fontFamily = 'monospace';
    container.style.fontSize = '14px';
    container.style.userSelect = 'none';
    document.body.appendChild(container);
    
    // Create stats element
    this.statsElement = document.createElement('div');
    container.appendChild(this.statsElement);
    
    // Create controls
    const controlsContainer = document.createElement('div');
    controlsContainer.style.marginTop = '10px';
    container.appendChild(controlsContainer);
    
    // Spawn projectile button
    const spawnButton = document.createElement('button');
    spawnButton.textContent = 'Spawn Projectile';
    spawnButton.style.marginRight = '5px';
    spawnButton.onclick = () => this.spawnProjectile();
    controlsContainer.appendChild(spawnButton);
    
    // Spawn 10 projectiles button
    const spawn10Button = document.createElement('button');
    spawn10Button.textContent = 'Spawn 10';
    spawn10Button.style.marginRight = '5px';
    spawn10Button.onclick = () => {
      for (let i = 0; i < 10; i++) {
        this.spawnProjectile();
      }
    };
    controlsContainer.appendChild(spawn10Button);
    
    // Clear all button
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear All';
    clearButton.onclick = () => this.clearAll();
    controlsContainer.appendChild(clearButton);
    
    // Stress test slider
    const stressContainer = document.createElement('div');
    stressContainer.style.marginTop = '10px';
    container.appendChild(stressContainer);
    
    const stressLabel = document.createElement('label');
    stressLabel.textContent = 'Stress Level: ';
    stressContainer.appendChild(stressLabel);
    
    const stressValue = document.createElement('span');
    stressValue.textContent = '0';
    stressValue.style.marginRight = '10px';
    stressContainer.appendChild(stressValue);
    
    const stressSlider = document.createElement('input');
    stressSlider.type = 'range';
    stressSlider.min = '0';
    stressSlider.max = '10';
    stressSlider.value = '0';
    stressSlider.oninput = (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.stressLevel = value;
      stressValue.textContent = value.toString();
    };
    stressContainer.appendChild(stressSlider);
    
    // Quality controls
    const qualityContainer = document.createElement('div');
    qualityContainer.style.marginTop = '10px';
    container.appendChild(qualityContainer);
    
    const qualityLabel = document.createElement('label');
    qualityLabel.textContent = 'Quality: ';
    qualityContainer.appendChild(qualityLabel);
    
    // Dropdown for quality selection
    const qualitySelect = document.createElement('select');
    Object.entries(this.qualityLabels).forEach(([level, label]) => {
      const option = document.createElement('option');
      option.value = level;
      option.textContent = label;
      if (parseInt(level) === QualityLevel.MEDIUM) {
        option.selected = true;
      }
      qualitySelect.appendChild(option);
    });
    
    qualitySelect.onchange = (e) => {
      const level = parseInt((e.target as HTMLSelectElement).value) as QualityLevel;
      this.adaptiveRenderingSystem.setQualityLevel(level);
    };
    qualityContainer.appendChild(qualitySelect);
    
    // Adaptive toggle
    const adaptiveContainer = document.createElement('div');
    adaptiveContainer.style.marginTop = '10px';
    container.appendChild(adaptiveContainer);
    
    const adaptiveCheckbox = document.createElement('input');
    adaptiveCheckbox.type = 'checkbox';
    adaptiveCheckbox.id = 'adaptiveCheckbox';
    adaptiveCheckbox.checked = true;
    adaptiveContainer.appendChild(adaptiveCheckbox);
    
    const adaptiveLabel = document.createElement('label');
    adaptiveLabel.htmlFor = 'adaptiveCheckbox';
    adaptiveLabel.textContent = ' Enable Adaptive Quality';
    adaptiveContainer.appendChild(adaptiveLabel);
    
    adaptiveCheckbox.onchange = (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      this.adaptiveRenderingSystem.setEnabled(enabled);
    };
    
    // Initial update
    this.updateStats();
  }
  
  /**
   * Update function, called every frame
   * @param deltaTime Time elapsed since last frame in seconds
   */
  private update(deltaTime: number): void {
    // Update performance metrics
    this.metricsManager.update(deltaTime);
    
    // Update pooled systems
    this.pooledProjectilePhysics.update(deltaTime);
    
    // Update adaptive rendering system
    this.adaptiveRenderingSystem.update(deltaTime);
    
    // Spawn projectiles based on stress level
    if (this.stressLevel > 0 && Math.random() < this.stressLevel * 0.02) {
      this.spawnProjectile();
    }
    
    // Update stats every 30 frames
    if (this.scene.getFrameId() % 30 === 0) {
      this.updateStats();
    }
  }
  
  /**
   * Spawn a single projectile
   */
  private spawnProjectile(): void {
    // Create random position slightly above the ground
    const x = (Math.random() - 0.5) * 20;
    const y = 5;
    const z = (Math.random() - 0.5) * 20;
    const position = new BABYLON.Vector3(x, y, z);
    
    // Create random direction
    const dx = (Math.random() - 0.5) * 2;
    const dy = Math.random() * -0.5;
    const dz = (Math.random() - 0.5) * 2;
    const direction = new BABYLON.Vector3(dx, dy, dz).normalize();
    
    // Create projectile
    const projectileId = this.pooledProjectilePhysics.createProjectile(
      position,
      direction,
      {
        radius: 0.2,
        mass: 1,
        initialVelocity: 10 + Math.random() * 5,
        lifetime: 3 + Math.random() * 2,
        explosionRadius: 3,
        explosionForce: 10
      },
      undefined,
      (id, point, normal, collider) => {
        // Create explosion effect on impact
        this.createExplosion(point);
        
        // Destroy projectile
        this.pooledProjectilePhysics.destroyProjectile(id, true);
      }
    );
    
    // Create trail effect
    if (this.pooledProjectilePhysics.getProjectileState(projectileId)?.mesh) {
      const mesh = this.pooledProjectilePhysics.getProjectileState(projectileId)?.mesh;
      
      if (mesh) {
        this.pooledParticleManager.createProjectileTrailEffect(mesh, {
          emitRate: 50,
          lifetime: 1.0
        });
      }
    }
    
    this.projectileCount++;
  }
  
  /**
   * Create an explosion effect
   * @param position Position of the explosion
   */
  private createExplosion(position: BABYLON.Vector3): void {
    this.pooledParticleManager.createExplosion(position, {
      emitRate: 300,
      minSize: 0.2,
      maxSize: 0.8,
      minLifeTime: 0.5,
      maxLifeTime: 1.5,
      minEmitPower: 1,
      maxEmitPower: 3
    });
    
    this.explosionCount++;
  }
  
  /**
   * Clear all projectiles and effects
   */
  private clearAll(): void {
    // The projectiles will be automatically recycled as they expire
    this.pooledParticleManager.disposeAll();
    this.projectileCount = 0;
    this.explosionCount = 0;
    this.updateStats();
  }
  
  /**
   * Update the stats display
   */
  private updateStats(): void {
    if (!this.statsElement) return;
    
    const metrics = this.metricsManager.getCurrentMetrics();
    const poolStats = this.pooledParticleManager.getPoolStats ? this.pooledParticleManager.getPoolStats() : { total: 0, available: 0, active: 0 };
    
    this.statsElement.innerHTML = `
      <div>FPS: ${metrics.fps.toFixed(1)}</div>
      <div>Frame Time: ${metrics.frameTime.toFixed(2)} ms</div>
      <div>Active Projectiles: ${this.pooledProjectilePhysics.getActiveProjectileCount()}</div>
      <div>Projectile Pool: ${this.pooledProjectilePhysics.getAvailableProjectiles()}/${this.pooledProjectilePhysics.getPoolSize()}</div>
      <div>Particle Systems: ${poolStats.active}/${poolStats.total}</div>
      <div>Quality Level: ${this.qualityLabels[this.adaptiveRenderingSystem.getQualityLevel()]}</div>
      <div>Adaptive Rendering: ${this.adaptiveRenderingSystem.isEnabled() ? 'Enabled' : 'Disabled'}</div>
    `;
  }
  
  /**
   * Dispose the demo and clean up resources
   */
  public dispose(): void {
    this.pooledProjectilePhysics.destroy();
    this.pooledParticleManager.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}

// Initialize the demo when the window loads
window.addEventListener('DOMContentLoaded', () => {
  try {
    const demo = new PerformanceDemo('renderCanvas');
    
    // Store for access in console
    (window as any).performanceDemo = demo;
    
    console.log('Performance Demo initialized! Use the UI to control the demo or access the demo through console as window.performanceDemo');
  } catch (e) {
    console.error('Failed to initialize Performance Demo:', e);
  }
}); 