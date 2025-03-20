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
  private performanceBenchmark: PerformanceBenchmark;
  
  private playerEntity: Entity;
  
  private config: PerformanceBenchmarkConfig;
  private benchmarkResults: BenchmarkResult[] = [];
  private isRunning: boolean = false;
  
  /**
   * Create a new gameplay benchmark
   * @param config Benchmark configuration
   */
  constructor(config: Partial<PerformanceBenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_BENCHMARK_CONFIG, ...config };
    
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
    
    // Create performance benchmark
    this.performanceBenchmark = new PerformanceBenchmark({
      scene: this.scene,
      engine: this.engine,
      showUI: this.config.showUI
    });
    
    // Register service locator for scene manager
    this.serviceLocator.register('scene', this.scene);
    
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
    this.performanceBenchmark.defineScenario({
      name: 'weapon_firing_basic',
      displayName: 'Basic Weapon Firing',
      description: 'Tests performance with periodic firing of weapons',
      setup: async () => {
        await this.weaponSystem.init();
        
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
        'Shots Fired': (result) => result.progress,
        'Avg FPS': (result) => result.avgFps,
        'Min FPS': (result) => result.minFps,
        'Max Memory (MB)': (result) => Math.round(result.maxMemory / (1024 * 1024))
      }
    });
    
    // Intensive weapon firing scenario
    this.performanceBenchmark.defineScenario({
      name: 'weapon_firing_intensive',
      displayName: 'Intensive Weapon Firing',
      description: 'Tests performance with rapid-fire weapons and explosions',
      setup: async () => {
        await this.weaponSystem.init();
        await this.particleEffectsSystem.init();
        
        // Create targets
        const targets = [];
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
        let explosionsCreated = 0;
        
        // Fast firing
        const firingInterval = setInterval(() => {
          // Pick a random target
          const targetIndex = Math.floor(Math.random() * targets.length);
          const target = targets[targetIndex];
          
          // Direction to target
          const direction = target.position.subtract(this.camera.position).normalize();
          
          // Fire weapon
          this.weaponSystem.fireSpinfusor(
            this.camera.position.clone(),
            direction
          );
          
          shotsFired++;
          
          // Create explosion at target position
          setTimeout(() => {
            this.particleEffectsSystem.createExplosion(
              target.position.clone(),
              2.0 + Math.random() * 3.0, // Random radius
              0.8 + Math.random() * 0.4   // Random intensity
            );
            explosionsCreated++;
          }, 500); // Explosion after 500ms
          
          // Update progress as total effects
          onProgress(shotsFired + explosionsCreated);
        }, 200); // Very rapid firing
        
        // Occasionally throw grenades too
        const grenadeInterval = setInterval(() => {
          // Random direction
          const direction = new BABYLON.Vector3(
            (Math.random() - 0.5) * 0.5,
            0.2 + Math.random() * 0.3,
            0.8 + Math.random() * 0.2
          ).normalize();
          
          // Fire grenade
          this.weaponSystem.fireGrenade(
            this.camera.position.clone(),
            direction,
            0.7 + Math.random() * 0.6 // Random power
          );
          
          shotsFired++;
          
          // Update progress
          onProgress(shotsFired + explosionsCreated);
        }, 1000); // Every second
        
        return () => {
          clearInterval(firingInterval);
          clearInterval(grenadeInterval);
          
          // Dispose targets
          targets.forEach(target => target.dispose());
        };
      },
      teardown: async () => {
        // Cleanup
      },
      metrics: {
        'Effects Created': (result) => result.progress,
        'Avg FPS': (result) => result.avgFps,
        'Min FPS': (result) => result.minFps,
        'Max Memory (MB)': (result) => Math.round(result.maxMemory / (1024 * 1024))
      }
    });
    
    // Combined jetpack and ski trail scenario
    this.performanceBenchmark.defineScenario({
      name: 'player_movement_effects',
      displayName: 'Player Movement Effects',
      description: 'Tests performance with combined jetpack and ski trail effects',
      setup: async () => {
        await this.particleEffectsSystem.init();
        
        // Initialize effects for player
        this.particleEffectsSystem.initializeJetpackForEntity(this.playerEntity);
        this.particleEffectsSystem.initializeSkiTrailForEntity(this.playerEntity);
        
        // Create a movement path
        const path = [];
        for (let i = 0; i < 100; i++) {
          // Create a winding path
          const x = Math.sin(i * 0.1) * 20;
          const z = i * -1.0;
          const y = 1 + Math.sin(i * 0.2) * 3;
          path.push(new BABYLON.Vector3(x, y, z));
        }
        
        return { path, pathIndex: 0 };
      },
      run: async (context, onProgress) => {
        const { path } = context;
        let pathIndex = 0;
        let frame = 0;
        
        // Animate player along path
        const interval = setInterval(() => {
          // Move to next path point
          pathIndex = (pathIndex + 1) % path.length;
          const position = path[pathIndex];
          
          // Calculate direction
          const nextPoint = path[(pathIndex + 1) % path.length];
          const direction = nextPoint.subtract(position).normalize();
          
          // Update player position
          const transformComponent = this.playerEntity.getComponent<TransformComponent>('transform');
          if (transformComponent) {
            transformComponent.setPosition(position);
          }
          
          // Calculate speed based on height (higher = faster for skiing down)
          const speed = 10 + (5 - position.y) * 2;
          
          // Use jetpack when going up, ski when going down
          const isGoingUp = nextPoint.y > position.y;
          
          if (isGoingUp) {
            // Use jetpack when going up
            this.particleEffectsSystem.setJetpackState(JetpackEffectState.HIGH);
            this.particleEffectsSystem.updateJetpackEffect(0.8, true);
            
            // Less ski effect when using jetpack
            this.particleEffectsSystem.updateSkiTrail(
              direction,
              speed * 0.3,
              true, 
              SurfaceType.SNOW,
              0.1
            );
          } else {
            // Ski when going down
            this.particleEffectsSystem.setJetpackState(JetpackEffectState.OFF);
            
            // Determine surface type based on position
            let surfaceType = SurfaceType.SNOW;
            const xPos = Math.abs(position.x);
            if (xPos > 15) {
              surfaceType = SurfaceType.ICE;
            } else if (xPos > 10) {
              surfaceType = SurfaceType.DIRT;
            } else if (xPos > 5) {
              surfaceType = SurfaceType.GRASS;
            }
            
            // Full ski effect
            this.particleEffectsSystem.updateSkiTrail(
              direction,
              speed,
              true,
              surfaceType,
              0.05
            );
          }
          
          // Update frame counter and progress
          frame++;
          onProgress(frame);
          
          // Update camera to follow player
          this.camera.position = position.subtract(direction.scale(10)).add(new BABYLON.Vector3(0, 3, 0));
          this.camera.setTarget(position);
          
        }, 50); // Update at 20 times per second
        
        return () => {
          clearInterval(interval);
          
          // Turn off effects
          this.particleEffectsSystem.setJetpackState(JetpackEffectState.OFF);
          this.particleEffectsSystem.updateSkiTrail(
            new BABYLON.Vector3(0, 0, 1),
            0,
            false,
            SurfaceType.SNOW,
            0
          );
        };
      },
      teardown: async () => {
        // Reset camera
        this.camera.position = new BABYLON.Vector3(0, 5, -10);
        this.camera.setTarget(BABYLON.Vector3.Zero());
      },
      metrics: {
        'Frames': (result) => result.progress,
        'Avg FPS': (result) => result.avgFps,
        'Min FPS': (result) => result.minFps,
        'Max Memory (MB)': (result) => Math.round(result.maxMemory / (1024 * 1024))
      }
    });
  }
  
  /**
   * Run all benchmarks in sequence
   */
  public async runAllBenchmarks(): Promise<BenchmarkResult[]> {
    if (this.isRunning) {
      console.warn('Benchmark already running');
      return [];
    }
    
    this.isRunning = true;
    this.benchmarkResults = [];
    
    const scenarios = this.config.scenarios || this.performanceBenchmark.getScenarioNames();
    
    for (const scenarioName of scenarios) {
      console.log(`Running benchmark: ${scenarioName}`);
      
      try {
        const result = await this.performanceBenchmark.runScenario(scenarioName, {
          minDuration: this.config.minDuration,
          maxDuration: this.config.maxDuration
        });
        
        this.benchmarkResults.push(result);
        console.log(`Benchmark ${scenarioName} completed:`, result);
      } catch (error) {
        console.error(`Error running benchmark ${scenarioName}:`, error);
      }
    }
    
    this.isRunning = false;
    return this.benchmarkResults;
  }
  
  /**
   * Run a specific benchmark scenario
   * @param scenarioName Name of the scenario to run
   */
  public async runBenchmark(scenarioName: string): Promise<BenchmarkResult | null> {
    if (this.isRunning) {
      console.warn('Benchmark already running');
      return null;
    }
    
    this.isRunning = true;
    
    try {
      const result = await this.performanceBenchmark.runScenario(scenarioName, {
        minDuration: this.config.minDuration,
        maxDuration: this.config.maxDuration
      });
      
      this.benchmarkResults.push(result);
      console.log(`Benchmark ${scenarioName} completed:`, result);
      this.isRunning = false;
      
      return result;
    } catch (error) {
      console.error(`Error running benchmark ${scenarioName}:`, error);
      this.isRunning = false;
      return null;
    }
  }
  
  /**
   * Get the results of all completed benchmarks
   */
  public getBenchmarkResults(): BenchmarkResult[] {
    return [...this.benchmarkResults];
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    this.engine.stopRenderLoop();
    this.scene.dispose();
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