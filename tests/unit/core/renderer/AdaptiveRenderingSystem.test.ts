/**
 * @file tests/unit/core/renderer/AdaptiveRenderingSystem.test.ts
 * @description Tests for the adaptive rendering quality system
 */

import * as BABYLON from 'babylonjs';
import { 
  AdaptiveRenderingSystem, 
  QualityLevel,
  DEFAULT_ADAPTIVE_RENDERING_CONFIG 
} from '../../../../src/core/renderer/AdaptiveRenderingSystem';
import { IPerformanceMetricsManager, PerformanceMetrics, MetricsTimePoint } from '../../../../src/core/debug/metrics/IPerformanceMetricsManager';
import { ITerrainRenderer } from '../../../../src/core/renderer/terrain/ITerrainRenderer';
import { 
  IParticleSystemManager, 
  ParticleEffectType, 
  ParticleEffectOptions, 
  ExplosionEffectOptions, 
  JetpackEffectOptions, 
  SkiTrailEffectOptions, 
  ProjectileTrailEffectOptions,
  ParticleSystemFromPresetOptions
} from '../../../../src/core/renderer/particles/IParticleSystemManager';
import { 
  IPostProcessingManager, 
  PostProcessEffectType, 
  PostProcessEffectOptions 
} from '../../../../src/core/renderer/effects/IPostProcessingManager';
import { TerrainQuality } from '../../../../src/core/renderer/terrain/TerrainRenderer';

// Mock classes
class MockScene {
  public lights: BABYLON.Light[] = [];
  public shadowsEnabled: boolean = true;
  
  getEngine() {
    return {
      setHardwareScalingLevel: jest.fn()
    };
  }
}

class MockPerformanceMetricsManager implements IPerformanceMetricsManager {
  private currentFPS: number = 60;
  
  initialize(): void {}
  update(deltaTime: number): void {}
  startRecording(maxDataPoints?: number): void {}
  stopRecording(): void {}
  clearHistory(): void {}
  
  getCurrentMetrics(): PerformanceMetrics {
    return {
      fps: this.currentFPS,
      frameTime: 1000 / this.currentFPS,
      custom: {}
    };
  }
  
  getMetricsHistory(count?: number): MetricsTimePoint[] { return []; }
  registerCustomMetric(name: string, initialValue: number): void {}
  updateCustomMetric(name: string, value: number): void {}
  getAverageMetrics(seconds: number): PerformanceMetrics { 
    return this.getCurrentMetrics();
  }
  exportMetricsToJSON(): string { return '{}'; }
  
  // Helper method for testing to simulate different FPS values
  setFPS(fps: number): void {
    this.currentFPS = fps;
  }
}

class MockTerrainRenderer implements ITerrainRenderer {
  public quality: TerrainQuality = TerrainQuality.MEDIUM;
  public viewDistance: number = 2000;
  
  // Fixed initialize method to return Promise
  async initialize(
    heightData: Float32Array,
    width: number,
    height: number,
    terrainSize: BABYLON.Vector3
  ): Promise<void> {
    // Just resolve immediately
    return Promise.resolve();
  }
  
  getHeightAtPosition(position: BABYLON.Vector3): number | null {
    return 0;
  }
  
  applyTexturesBySlope(
    textures: string[],
    slopeThresholds: number[],
    heightThresholds: number[],
    tiling?: number
  ): void {
    // Mock implementation
  }
  
  updateConfig(config: Record<string, any>): void {
    // Mock implementation
  }
  
  getStats(): Record<string, any> {
    return { triangles: 1000, drawCalls: 5 };
  }
  
  setQuality(quality: TerrainQuality): void {
    this.quality = quality;
  }
  
  setViewDistance(distance: number): void {
    this.viewDistance = distance;
  }
  
  getDefaultViewDistance(): number {
    return 2000;
  }
  
  // Other required methods with minimal implementation
  createTerrain(): void {}
  update(deltaTime: number): void {}
  setWireframe(enabled: boolean): void {}
  isWireframe(): boolean { return false; }
  getHeightAt(x: number, z: number): number { return 0; }
  getNormalAt(x: number, z: number): BABYLON.Vector3 { 
    return new BABYLON.Vector3(0, 1, 0); 
  }
  getSlopeAt(x: number, z: number): number { return 0; }
  dispose(): void {}
}

class MockParticleSystemManager implements IParticleSystemManager {
  public qualityMultiplier: number = 1.0;
  
  // Helper method for testing
  setQualityMultiplier(multiplier: number): void {
    this.qualityMultiplier = multiplier;
  }
  
  // Required interface methods with minimal implementation
  initialize(scene: BABYLON.Scene): void {}
  createEffect(
    type: ParticleEffectType, 
    emitter: BABYLON.AbstractMesh | BABYLON.Vector3, 
    options?: ParticleEffectOptions
  ): string | null { 
    return null; 
  }
  registerExternalParticleSystem(name: string, particleSystem: BABYLON.ParticleSystem): string { 
    return ''; 
  }
  setEmitting(id: string, emitting: boolean): boolean { 
    return false; 
  }
  getParticleSystem(id: string): BABYLON.IParticleSystem | null { 
    return null; 
  }
  getParticleSystemsByType(type: ParticleEffectType): BABYLON.IParticleSystem[] { 
    return []; 
  }
  startEffect(id: string): boolean { 
    return false; 
  }
  stopEffect(id: string, immediate?: boolean): boolean { 
    return false; 
  }
  updateEffect(id: string, options: ParticleEffectOptions): boolean { 
    return false; 
  }
  createExplosion(position: BABYLON.Vector3, options?: ExplosionEffectOptions): string | null { 
    return null; 
  }
  createJetpackEffect(emitter: BABYLON.AbstractMesh, options?: JetpackEffectOptions): string | null { 
    return null; 
  }
  createSkiTrailEffect(emitter: BABYLON.AbstractMesh, options?: SkiTrailEffectOptions): string | null { 
    return null; 
  }
  createProjectileTrailEffect(emitter: BABYLON.AbstractMesh, options?: ProjectileTrailEffectOptions): string | null { 
    return null; 
  }
  disposeEffect(id: string): boolean { 
    return false; 
  }
  disposeAll(): void {}
  updateEmitterPosition(id: string, position: BABYLON.Vector3): boolean { 
    return false; 
  }
  updateEmitRate(id: string, emitRate: number): boolean { 
    return false; 
  }
  setSystemVisible(id: string, visible: boolean): boolean { 
    return false; 
  }
  removeParticleSystem(id: string): boolean { 
    return false; 
  }
  dispose(): void {}
  createParticleSystemFromPreset(options: ParticleSystemFromPresetOptions): string | null { 
    return null; 
  }
}

class MockPostProcessingManager implements IPostProcessingManager {
  public bloomEnabled: boolean = true;
  public dofEnabled: boolean = false;
  public aoEnabled: boolean = true;
  
  enableBloom(enabled: boolean): boolean {
    this.bloomEnabled = enabled;
    return true;
  }
  
  enableDepthOfField(enabled: boolean): boolean {
    this.dofEnabled = enabled;
    return true;
  }
  
  enableAmbientOcclusion(enabled: boolean): boolean {
    this.aoEnabled = enabled;
    return true;
  }
  
  // Other required methods with minimal implementation
  initialize(scene: BABYLON.Scene): void {}
  createDefaultPipeline(): void {}
  setPipelineEnabled(enabled: boolean): boolean { return true; }
  setBloomIntensity(intensity: number): boolean { return true; }
  setDepthOfFieldFocalLength(focalLength: number): boolean { return true; }
  setAmbientOcclusionRadius(radius: number): boolean { return true; }
  dispose(): void {}
  
  // Additional required methods from interface
  addEffect(type: PostProcessEffectType, options?: PostProcessEffectOptions): boolean { return true; }
  removeEffect(type: PostProcessEffectType): boolean { return true; }
  getEffect(type: PostProcessEffectType): BABYLON.PostProcess | null { return null; }
  enableEffect(type: PostProcessEffectType): boolean { return true; }
  disableEffect(type: PostProcessEffectType): boolean { return true; }
  updateEffectOptions(type: PostProcessEffectType, options: PostProcessEffectOptions): boolean { return true; }
  configureBloom(options: any): boolean { return true; }
  configureMotionBlur(options: any): boolean { return true; }
  configureDepthOfField(options: any): boolean { return true; }
  configureColorCorrection(options: any): boolean { return true; }
  resetEffects(): void {}
}

describe('AdaptiveRenderingSystem', () => {
  let scene: BABYLON.Scene;
  let metricsManager: MockPerformanceMetricsManager;
  let terrainRenderer: MockTerrainRenderer;
  let particleSystemManager: MockParticleSystemManager;
  let postProcessingManager: MockPostProcessingManager;
  let adaptiveSystem: AdaptiveRenderingSystem;
  
  beforeEach(() => {
    // Set up mocks
    scene = new MockScene() as unknown as BABYLON.Scene;
    metricsManager = new MockPerformanceMetricsManager();
    terrainRenderer = new MockTerrainRenderer();
    particleSystemManager = new MockParticleSystemManager();
    postProcessingManager = new MockPostProcessingManager();
    
    // Create system with default config
    adaptiveSystem = new AdaptiveRenderingSystem(
      scene,
      metricsManager
    );
    
    // Initialize with mock components
    adaptiveSystem.initialize(
      terrainRenderer,
      particleSystemManager,
      postProcessingManager
    );
  });
  
  test('should initialize with default medium quality', () => {
    expect(adaptiveSystem.getQualityLevel()).toBe(QualityLevel.MEDIUM);
  });
  
  test('should be enabled by default', () => {
    expect(adaptiveSystem.isEnabled()).toBe(true);
  });
  
  test('should allow enabling and disabling', () => {
    adaptiveSystem.setEnabled(false);
    expect(adaptiveSystem.isEnabled()).toBe(false);
    
    adaptiveSystem.setEnabled(true);
    expect(adaptiveSystem.isEnabled()).toBe(true);
  });
  
  test('should allow manual quality level setting', () => {
    adaptiveSystem.setQualityLevel(QualityLevel.LOW);
    expect(adaptiveSystem.getQualityLevel()).toBe(QualityLevel.LOW);
    
    adaptiveSystem.setQualityLevel(QualityLevel.HIGH);
    expect(adaptiveSystem.getQualityLevel()).toBe(QualityLevel.HIGH);
  });
  
  test('should apply settings to terrain renderer when quality changes', () => {
    // Set to LOW quality
    adaptiveSystem.setQualityLevel(QualityLevel.LOW);
    
    // Check terrain renderer settings
    expect(terrainRenderer.quality).toBe(TerrainQuality.LOW);
    expect(terrainRenderer.viewDistance).toBeLessThan(2000); // Should be reduced
  });
  
  test('should apply settings to post-processing manager when quality changes', () => {
    // Set to VERY_LOW quality
    adaptiveSystem.setQualityLevel(QualityLevel.VERY_LOW);
    
    // Check post-processing settings
    expect(postProcessingManager.bloomEnabled).toBe(false);
    expect(postProcessingManager.dofEnabled).toBe(false);
    expect(postProcessingManager.aoEnabled).toBe(false);
    
    // Set to HIGH quality
    adaptiveSystem.setQualityLevel(QualityLevel.HIGH);
    
    // Check post-processing settings
    expect(postProcessingManager.bloomEnabled).toBe(true);
    expect(postProcessingManager.dofEnabled).toBe(true);
    expect(postProcessingManager.aoEnabled).toBe(true);
  });
  
  test('should allow configuration updates', () => {
    const newConfig = {
      thresholds: {
        targetFPS: 50,
        lowThresholdFPS: 40,
        highThresholdFPS: 60,
        criticalThresholdFPS: 25
      }
    };
    
    adaptiveSystem.updateConfig(newConfig);
    const config = adaptiveSystem.getConfig();
    
    expect(config.thresholds.targetFPS).toBe(50);
    expect(config.thresholds.lowThresholdFPS).toBe(40);
    expect(config.thresholds.highThresholdFPS).toBe(60);
    expect(config.thresholds.criticalThresholdFPS).toBe(25);
  });
  
  test('should automatically decrease quality when FPS is low', () => {
    // Set to MEDIUM quality to start
    adaptiveSystem.setQualityLevel(QualityLevel.MEDIUM);
    
    // Simulate low FPS
    metricsManager.setFPS(20); // Well below critical threshold
    
    // Manually fill the samples buffer to trigger adjustment
    for (let i = 0; i < DEFAULT_ADAPTIVE_RENDERING_CONFIG.samplesBeforeAdjustment; i++) {
      adaptiveSystem.update(0.016); // ~60fps update rate
    }
    
    // Should have decreased quality to LOW due to critical FPS
    expect(adaptiveSystem.getQualityLevel()).toBe(QualityLevel.LOW);
  });
  
  test('should automatically increase quality when FPS is high', () => {
    // Set to LOW quality to start
    adaptiveSystem.setQualityLevel(QualityLevel.LOW);
    
    // Override cooldown to enable immediate adjustment
    adaptiveSystem.updateConfig({ adjustmentCooldown: 0 });
    
    // Simulate high FPS
    metricsManager.setFPS(90); // Well above high threshold
    
    // Manually fill the samples buffer to trigger adjustment
    for (let i = 0; i < DEFAULT_ADAPTIVE_RENDERING_CONFIG.samplesBeforeAdjustment; i++) {
      adaptiveSystem.update(0.016); // ~60fps update rate
    }
    
    // Should have increased quality to MEDIUM due to high FPS
    expect(adaptiveSystem.getQualityLevel()).toBe(QualityLevel.MEDIUM);
  });
  
  test('should call the quality change callback when quality changes', () => {
    const callback = jest.fn();
    adaptiveSystem.onQualityChange(callback);
    
    // Change quality
    adaptiveSystem.setQualityLevel(QualityLevel.HIGH);
    
    // Callback should have been called with new and old level
    expect(callback).toHaveBeenCalledWith(QualityLevel.HIGH, QualityLevel.MEDIUM);
  });
  
  test('should reset to medium quality when reset is called', () => {
    // Change to a different quality
    adaptiveSystem.setQualityLevel(QualityLevel.HIGH);
    
    // Reset
    adaptiveSystem.reset();
    
    // Should be back to MEDIUM
    expect(adaptiveSystem.getQualityLevel()).toBe(QualityLevel.MEDIUM);
  });
}); 