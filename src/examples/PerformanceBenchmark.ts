/**
 * @file src/examples/PerformanceBenchmark.ts
 * @description Performance benchmark for testing optimized systems under common gameplay scenarios
 */

import * as BABYLON from 'babylonjs';
import { ServiceLocator } from '../core/base/ServiceLocator';
import { WeaponSystem } from '../game/weapons/WeaponSystem';
import { ParticleEffectsSystem } from '../game/renderer/ParticleEffectsSystem';
import { JetpackEffectState } from '../game/renderer/particles/JetpackParticleEffect';
import { SurfaceType } from '../game/renderer/particles/SkiTrailParticleEffect';
import { PerformanceBenchmark, BenchmarkScenario, BenchmarkResult } from '../core/debug/PerformanceBenchmark';
import { Entity } from '../core/ecs/Entity';
import { TransformComponent } from '../core/ecs/components/TransformComponent';
import { Logger } from '../core/utils/Logger';
import { ISceneManager, SceneCreateOptions, SceneTransitionOptions } from '../core/renderer/ISceneManager';

/**
 * Performance benchmark configuration
 */
export interface PerformanceBenchmarkConfig {
  /** Canvas element ID to render to */
  canvasId: string;
  /** Whether to show benchmark UI */
  showUI: boolean;
  /** Minimum duration of each benchmark in milliseconds */
  minDuration: number;
  /** Maximum duration of each benchmark in milliseconds */
  maxDuration: number;
  /** Whether to run all benchmarks in sequence */
  autoRun: boolean;
  /** Which scenarios to run (if not all) */
  scenarios?: string[];
}

/**
 * Default benchmark configuration
 */
const DEFAULT_BENCHMARK_CONFIG: PerformanceBenchmarkConfig = {
  canvasId: 'renderCanvas',
  showUI: true,
  minDuration: 5000,  // 5 seconds minimum
  maxDuration: 30000, // 30 seconds maximum
  autoRun: false
};

/**
 * Extended scene manager interface for our benchmark with additional helpers
 */
interface IBenchmarkSceneManager extends ISceneManager {
  // Additional helpers specific to the benchmark
  getCameraPosition(): BABYLON.Vector3;
  getCameraDirection(): BABYLON.Vector3;
  getCanvas(): HTMLCanvasElement;
}

/**
 * Context data for weapon firing scenario
 */
interface WeaponFiringScenarioContext {
  targetSphere?: BABYLON.Mesh;
}

/**
 * Context data for intensive weapon scenario
 */
interface IntensiveWeaponScenarioContext {
  targets: BABYLON.Mesh[];
}

/**
 * Context data for particle effects scenario
 */
interface ParticleEffectsScenarioContext {
  emitters: BABYLON.Mesh[];
}

/**
 * Performance benchmark class for testing weapons and particle effects
 */
export class GameplayBenchmark {
  private canvas: HTMLCanvasElement;
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private camera: BABYLON.FreeCamera;
  
  private serviceLocator: ServiceLocator;
  private weaponSystem: WeaponSystem;
  private particleEffectsSystem: ParticleEffectsSystem;
  public performanceBenchmark: PerformanceBenchmark;
  
  private playerEntity: Entity;
  
  private config: PerformanceBenchmarkConfig;
  private benchmarkResults: BenchmarkResult[] = [];
  private isRunning: boolean = false;
  
  // Logger
  private logger: Logger;
  
  /**
   * Create a new gameplay benchmark
   * @param config Benchmark configuration
   */
  constructor(config: Partial<PerformanceBenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_BENCHMARK_CONFIG, ...config };
    
    // Initialize logger with default instance
    this.logger = new Logger('GameplayBenchmark');
    
    // Try to get the logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        // Add context tag
        this.logger.addTag('GameplayBenchmark');
      }
    } catch (e) {
      this.logger.warn(`Failed to get logger from ServiceLocator: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
    
    // Get canvas
    const canvasElement = document.getElementById(this.config.canvasId);
    if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element with ID "${this.config.canvasId}" not found`);
    }
    this.canvas = canvasElement;
    
    // Initialize Babylon.js
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = new BABYLON.Scene(this.engine);
    
    // Initialize services
    this.serviceLocator = ServiceLocator.getInstance();
    
    // Create camera
    this.camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 5, -10), this.scene);
    this.camera.setTarget(BABYLON.Vector3.Zero());
    this.camera.attachControl(this.canvas, true);
    
    // Create light
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), this.scene);
    light.intensity = 0.7;
    
    // Create ground
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 100, height: 100 }, this.scene);
    const groundMaterial = new BABYLON.StandardMaterial('groundMat', this.scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.6, 0.4);
    ground.material = groundMaterial;
    
    // Create player entity
    this.playerEntity = new Entity('player');
    this.playerEntity.addComponent(new TransformComponent());
    
    // Create mock scene manager for dependency injection
    const mockSceneManager: IBenchmarkSceneManager = {
      initialize: (engine: BABYLON.Engine) => {},
      getActiveScene: () => this.scene,
      createScene: (options: SceneCreateOptions) => this.scene,
      getScene: (nameOrId: string) => this.scene,
      getAllScenes: () => [this.scene],
      setActiveScene: async (nameOrId: string, transitionOptions?: SceneTransitionOptions) => {},
      transitionBetweenScenes: async (from: BABYLON.Scene, to: BABYLON.Scene, options: SceneTransitionOptions) => {},
      disposeScene: (nameOrId?: string) => {},
      disposeAll: () => {},
      
      // Additional convenience methods for our benchmark
      getCameraPosition: () => this.camera.position,
      getCameraDirection: () => this.camera.getDirection(BABYLON.Vector3.Forward()),
      getCanvas: () => this.canvas
    };
    
    // Register service locator for scene manager
    this.serviceLocator.register('scene', this.scene as any);
    this.serviceLocator.register('sceneManager', mockSceneManager);
    
    // Create performance benchmark
    this.performanceBenchmark = new PerformanceBenchmark({
      scene: this.scene as any,
      engine: this.engine as any,
      showUI: this.config.showUI,
      minDuration: this.config.minDuration,
      maxDuration: this.config.maxDuration
    });
    
    // Initialize systems
    this.weaponSystem = new WeaponSystem({
      initialPoolSize: 30,
      maxPoolSize: 150,
      enablePerformanceMonitoring: true
    });
    
    this.particleEffectsSystem = new ParticleEffectsSystem({
      initialPoolSize: 20,
      maxPoolSize: 100,
      defaultParticleLimit: 2000,
      enablePerformanceMonitoring: true,
      enableAdaptiveQuality: true
    });
    
    // Define benchmark scenarios
    this.defineBenchmarkScenarios();
    
    // Start rendering
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
    
    // Handle resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
    
    // Autorun if configured
    if (this.config.autoRun) {
      setTimeout(() => this.runAllBenchmarks(), 1000);
    }
  }
  
  /**
   * Define benchmark scenarios
   */
  private defineBenchmarkScenarios(): void {
    // Basic weapon firing scenario
    this.performanceBenchmark.defineScenario<WeaponFiringScenarioContext>({
      name: 'weapon_firing_basic',
      displayName: 'Basic Weapon Firing',
      description: 'Tests performance with periodic firing of weapons',
      setup: async () => {
        await this.weaponSystem.initialize();
        
        // Setup scene for weapon firing
        const targetSphere = BABYLON.MeshBuilder.CreateSphere('target', { diameter: 2 }, this.scene);
        targetSphere.position = new BABYLON.Vector3(0, 2, 20);
        
        return { targetSphere };
      },
      run: async (context, onProgress) => {
        const { targetSphere } = context;
        let shotsFired = 0;
        
        // Fire weapons periodically
        const interval = setInterval(() => {
          // Fire in a slightly random direction
          const direction = new BABYLON.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            1
          ).normalize();
          
          // Fire from camera position
          this.weaponSystem.fireSpinfusor(
            this.camera.position.clone(),
            direction
          );
          
          shotsFired++;
          
          // Update progress
          onProgress(shotsFired);
        }, 500); // Fire every 500ms
        
        return () => {
          clearInterval(interval);
          if (targetSphere) {
            targetSphere.dispose();
          }
        };
      },
      teardown: async () => {
        // Cleanup
      },
      metrics: {
        'Shots Fired': (result) => result.progress || 0,
        'Avg FPS': (result) => result.avgFps || 0,
        'Min FPS': (result) => result.minFps || 0,
        'Max Memory (MB)': (result) => Math.round((result.maxMemory || 0) / (1024 * 1024))
      }
    });
    
    // Intensive weapon firing scenario
    this.performanceBenchmark.defineScenario<IntensiveWeaponScenarioContext>({
      name: 'weapon_firing_intensive',
      displayName: 'Intensive Weapon Firing',
      description: 'Tests performance with rapid-fire weapons and explosions',
      setup: async () => {
        await this.weaponSystem.initialize();
        await this.particleEffectsSystem.initialize();
        
        // Create targets
        const targets: BABYLON.Mesh[] = [];
        for (let i = 0; i < 5; i++) {
          const target = BABYLON.MeshBuilder.CreateBox('target' + i, { size: 1 }, this.scene);
          target.position = new BABYLON.Vector3(
            (i - 2) * 4,
            2,
            15
          );
          targets.push(target);
        }
        
        return { targets };
      },
      run: async (context, onProgress) => {
        const { targets } = context;
        let shotsFired = 0;
        let interval: NodeJS.Timeout;
        
        // Fire weapons rapidly
        interval = setInterval(() => {
          // Choose a random target
          const targetIndex = Math.floor(Math.random() * targets.length);
          const target = targets[targetIndex];
          
          // Calculate direction to target
          const direction = target.position.subtract(this.camera.position).normalize();
          
          // Add some randomization
          direction.x += (Math.random() - 0.5) * 0.1;
          direction.y += (Math.random() - 0.5) * 0.1;
          direction.z += (Math.random() - 0.5) * 0.1;
          direction.normalize();
          
          // Alternate between weapons
          if (shotsFired % 2 === 0) {
            this.weaponSystem.fireSpinfusor(this.camera.position.clone(), direction);
          } else {
            this.weaponSystem.fireGrenade(this.camera.position.clone(), direction, 1.0);
          }
          
          shotsFired++;
          
          // Create explosions occasionally
          if (shotsFired % 5 === 0) {
            const randomPosition = new BABYLON.Vector3(
              (Math.random() - 0.5) * 20,
              1 + Math.random() * 3,
              10 + Math.random() * 10
            );
            
            this.particleEffectsSystem.createExplosion(
              randomPosition,
              2 + Math.random() * 3,
              0.5 + Math.random() * 0.5
            );
          }
          
          // Update progress
          onProgress(shotsFired);
        }, 200); // Fire every 200ms
        
        return () => {
          clearInterval(interval);
        };
      },
      teardown: async () => {
        // Dispose targets
        await this.disposeIntensiveWeaponScenarioTargets();
      },
      metrics: {
        'Shots Fired': (result) => result.progress || 0,
        'Avg FPS': (result) => result.avgFps || 0,
        'Min FPS': (result) => result.minFps || 0,
        'Max Memory (MB)': (result) => Math.round((result.maxMemory || 0) / (1024 * 1024))
      }
    });
    
    // Particle effects stress test scenario
    this.performanceBenchmark.defineScenario<ParticleEffectsScenarioContext>({
      name: 'particle_effects_stress',
      displayName: 'Particle Effects Stress Test',
      description: 'Tests performance with many simultaneous particle effects',
      setup: async () => {
        await this.particleEffectsSystem.initialize();
        
        // Create emitter meshes
        const emitters: BABYLON.Mesh[] = [];
        for (let i = 0; i < 10; i++) {
          const emitter = BABYLON.MeshBuilder.CreateSphere('emitter' + i, { diameter: 0.2 }, this.scene);
          emitter.position = new BABYLON.Vector3(
            (i - 5) * 2,
            1 + Math.sin(i) * 2,
            10 + Math.cos(i) * 5
          );
          emitter.isVisible = false;
          emitters.push(emitter);
        }
        
        this.particleEffectsSystem.initializeJetpackForEntity(this.playerEntity);
        this.particleEffectsSystem.initializeSkiTrailForEntity(this.playerEntity);
        
        return { emitters };
      },
      run: async (context, onProgress) => {
        const { emitters } = context;
        let effectsCreated = 0;
        let interval: NodeJS.Timeout;
        
        // Create particle effects periodically
        interval = setInterval(() => {
          // Cycle through different effect types
          const effectType = effectsCreated % 3;
          
          if (effectType === 0) {
            // Create explosions
            const emitterIndex = Math.floor(Math.random() * emitters.length);
            const emitter = emitters[emitterIndex];
            
            this.particleEffectsSystem.createExplosion(
              emitter.position,
              1 + Math.random() * 2,
              0.5 + Math.random() * 0.5
            );
          } else if (effectType === 1) {
            // Update jetpack
            this.particleEffectsSystem.setJetpackState(
              Math.random() > 0.3 ? JetpackEffectState.MEDIUM : JetpackEffectState.IDLE
            );
            
            this.particleEffectsSystem.updateJetpackEffect(
              0.5 + Math.random() * 0.5,
              true
            );
          } else if (effectType === 2) {
            // Update ski trail
            this.particleEffectsSystem.updateSkiTrail(
              new BABYLON.Vector3(Math.random() - 0.5, 0, 1).normalize(),
              10 + Math.random() * 20,
              true,
              Math.random() > 0.5 ? SurfaceType.SNOW : SurfaceType.DIRT,
              0.1 + Math.random() * 0.2
            );
          }
          
          effectsCreated++;
          
          // Update progress
          onProgress(effectsCreated);
        }, 100); // Create effects every 100ms
        
        return () => {
          clearInterval(interval);
        };
      },
      teardown: async () => {
        // Dispose emitters
        await this.disposeParticleEffectsScenarioEmitters();
      },
      metrics: {
        'Effects Created': (result) => result.progress || 0,
        'Avg FPS': (result) => result.avgFps || 0,
        'Min FPS': (result) => result.minFps || 0,
        'Max Memory (MB)': (result) => Math.round((result.maxMemory || 0) / (1024 * 1024))
      }
    });
  }
  
  /**
   * Helper method to dispose intensive weapon scenario targets
   */
  private async disposeIntensiveWeaponScenarioTargets(): Promise<void> {
    try {
      const scenario = this.performanceBenchmark.getScenario<IntensiveWeaponScenarioContext>('weapon_firing_intensive');
      if (scenario) {
        const contextData = await scenario.setup();
        if (contextData && contextData.targets) {
          contextData.targets.forEach(target => target.dispose());
        }
      }
    } catch (error) {
      this.logger.warn(`Error disposing weapon scenario targets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Helper method to dispose particle effects scenario emitters
   */
  private async disposeParticleEffectsScenarioEmitters(): Promise<void> {
    try {
      const scenario = this.performanceBenchmark.getScenario<ParticleEffectsScenarioContext>('particle_effects_stress');
      if (scenario) {
        const contextData = await scenario.setup();
        if (contextData && contextData.emitters) {
          contextData.emitters.forEach(emitter => emitter.dispose());
        }
      }
    } catch (error) {
      this.logger.warn(`Error disposing particle effects scenario emitters: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Run all benchmark scenarios
   * @returns Promise resolving to the benchmark results
   */
  public async runAllBenchmarks(): Promise<BenchmarkResult[]> {
    if (this.isRunning) {
      this.logger.warn('Benchmark is already running');
      return [];
    }
    
    this.isRunning = true;
    this.benchmarkResults = [];
    
    try {
      const scenarios = this.config.scenarios || this.performanceBenchmark.getScenarioNames();
      
      for (const scenarioName of scenarios) {
        this.logger.info(`Running benchmark scenario: ${scenarioName}`);
        
        try {
          const result = await this.runBenchmark(scenarioName);
          if (result) {
            this.benchmarkResults.push(result);
          }
        } catch (error) {
          this.logger.error(`Error running benchmark scenario ${scenarioName}:`, error instanceof Error ? error.message : String(error));
        }
      }
      
      this.logger.info('All benchmarks completed');
      return this.benchmarkResults;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Run a specific benchmark scenario
   * @param scenarioName Name of the scenario to run
   * @returns Promise resolving to the benchmark result, or null if the scenario wasn't found
   */
  public async runBenchmark(scenarioName: string): Promise<BenchmarkResult | null> {
    if (this.isRunning) {
      this.logger.warn('Benchmark is already running');
      return null;
    }
    
    this.isRunning = true;
    
    try {
      const result = await this.performanceBenchmark.runScenario(
        scenarioName,
        this.config.minDuration
      );
      
      this.benchmarkResults.push(result);
      return result;
    } catch (error) {
      this.logger.error(`Error running benchmark ${scenarioName}:`, error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Get the results of all benchmarks run in this session
   * @returns Array of benchmark results
   */
  public getBenchmarkResults(): BenchmarkResult[] {
    return [...this.benchmarkResults];
  }
  
  /**
   * Dispose the benchmark and clean up resources
   */
  public dispose(): void {
    this.weaponSystem.dispose();
    this.particleEffectsSystem.dispose();
    this.engine.dispose();
  }
}

/**
 * Create and run the benchmark when the page loads
 */
window.addEventListener('DOMContentLoaded', () => {
  // Check if canvas exists
  const canvas = document.getElementById('renderCanvas');
  if (!canvas) {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100vh';
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.overflow = 'hidden';
    
    const newCanvas = document.createElement('canvas');
    newCanvas.id = 'renderCanvas';
    newCanvas.style.width = '100%';
    newCanvas.style.height = '100%';
    
    container.appendChild(newCanvas);
    document.body.appendChild(container);
  }
  
  // Create benchmark
  const benchmark = new GameplayBenchmark({
    canvasId: 'renderCanvas',
    showUI: true,
    autoRun: false
  });
  
  // Add UI controls for running benchmarks
  const ui = document.createElement('div');
  ui.style.position = 'absolute';
  ui.style.top = '10px';
  ui.style.left = '10px';
  ui.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  ui.style.color = 'white';
  ui.style.padding = '10px';
  ui.style.borderRadius = '5px';
  ui.style.fontFamily = 'Arial, sans-serif';
  
  const title = document.createElement('h3');
  title.textContent = 'Performance Benchmarks';
  title.style.margin = '0 0 10px 0';
  ui.appendChild(title);
  
  const runAllButton = document.createElement('button');
  runAllButton.textContent = 'Run All Benchmarks';
  runAllButton.style.display = 'block';
  runAllButton.style.margin = '5px 0';
  runAllButton.style.padding = '5px 10px';
  runAllButton.addEventListener('click', () => {
    benchmark.runAllBenchmarks();
  });
  ui.appendChild(runAllButton);
  
  // Add buttons for individual scenarios
  const scenarios = benchmark.performanceBenchmark.getScenarioNames();
  for (const scenarioName of scenarios) {
    const scenario = benchmark.performanceBenchmark.getScenario(scenarioName);
    if (!scenario) continue;
    
    const button = document.createElement('button');
    button.textContent = `Run: ${scenario.displayName}`;
    button.style.display = 'block';
    button.style.margin = '5px 0';
    button.style.padding = '5px 10px';
    button.addEventListener('click', () => {
      benchmark.runBenchmark(scenarioName);
    });
    ui.appendChild(button);
  }
  
  document.body.appendChild(ui);
  
  // Make benchmark globally accessible for debugging
  (window as any).performanceBenchmark = benchmark;
}); 
