/**
 * @file tests/unit/core/renderer/terrain/LODTerrainSystem.test.ts
 * @description Unit tests for LODTerrainSystem
 */

import * as BABYLON from 'babylonjs';
import { LODTerrainSystem, LODConfig, DEFAULT_LOD_CONFIG } from '../../../../../src/core/renderer/terrain/LODTerrainSystem';

// Mock BabylonJS classes
jest.mock('babylonjs');

describe('LODTerrainSystem', () => {
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockCamera: jest.Mocked<BABYLON.Camera>;
  let mockBeforeRenderObservable: jest.Mocked<BABYLON.Observable<BABYLON.Scene>>;
  let mockAfterRenderObservable: jest.Mocked<BABYLON.Observable<BABYLON.Scene>>;
  let lodSystem: LODTerrainSystem;
  let defaultConfig: LODConfig;
  
  // Mock Vector3 implementation
  class MockVector3 {
    constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}
    
    subtract(other: MockVector3): MockVector3 {
      return new MockVector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }
    
    length(): number {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    
    copyFrom(source: MockVector3): MockVector3 {
      this.x = source.x;
      this.y = source.y;
      this.z = source.z;
      return this;
    }
    
    equals(other: MockVector3): boolean {
      return this.x === other.x && this.y === other.y && this.z === other.z;
    }
    
    static Distance(a: MockVector3, b: MockVector3): number {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }
  
  beforeEach(() => {
    // Override Vector3 with our mock
    (BABYLON.Vector3 as any) = MockVector3;
    
    // Create mocks
    mockBeforeRenderObservable = {
      add: jest.fn().mockReturnValue(1), // Return a numeric observer id
      remove: jest.fn()
    } as unknown as jest.Mocked<BABYLON.Observable<BABYLON.Scene>>;
    
    mockAfterRenderObservable = {
      add: jest.fn().mockReturnValue(2), // Return a numeric observer id
      remove: jest.fn()
    } as unknown as jest.Mocked<BABYLON.Observable<BABYLON.Scene>>;
    
    const mockEngine = {
      getFps: jest.fn().mockReturnValue(60)
    } as unknown as jest.Mocked<BABYLON.Engine>;
    
    mockScene = {
      onBeforeRenderObservable: mockBeforeRenderObservable,
      onAfterRenderObservable: mockAfterRenderObservable,
      getEngine: jest.fn().mockReturnValue(mockEngine)
    } as unknown as jest.Mocked<BABYLON.Scene>;
    
    mockCamera = {
      position: new BABYLON.Vector3(0, 100, 0)
    } as unknown as jest.Mocked<BABYLON.Camera>;
    
    defaultConfig = { ...DEFAULT_LOD_CONFIG };
    
    // Create LODTerrainSystem instance
    lodSystem = new LODTerrainSystem(mockScene, mockCamera, defaultConfig);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  
  describe('constructor', () => {
    test('should initialize with default config when no config provided', () => {
      const lodSystemWithDefaultConfig = new LODTerrainSystem(mockScene, mockCamera);
      
      // Verify scene observer is registered
      expect(mockScene.onBeforeRenderObservable.add).toHaveBeenCalled();
    });
    
    test('should initialize with custom config', () => {
      const customConfig: Partial<LODConfig> = {
        enabled: false,
        maxLevel: 2,
        distances: [10, 50],
        bias: 2.0,
        transitionSize: 5,
        adaptiveQuality: false,
        targetFramerate: 60,
        performanceLevel: null,
        adaptationSpeed: 0.5,
        performanceCheckInterval: 1000
      };
      
      const lodSystemWithCustomConfig = new LODTerrainSystem(mockScene, mockCamera, customConfig);
      
      // Verify scene observer is registered
      expect(mockScene.onBeforeRenderObservable.add).toHaveBeenCalled();
    });
  });
  
  describe('calculateLODLevel', () => {
    test('should return 0 (highest quality) when LOD is disabled', () => {
      // Create with disabled LOD
      const disabledConfig: Partial<LODConfig> = {
        enabled: false
      };
      
      const lodSystemDisabled = new LODTerrainSystem(mockScene, mockCamera, disabledConfig);
      
      // Test various chunk centers and radiuses
      const chunkCenter = new BABYLON.Vector3(0, 0, 0);
      const chunkRadius = 50;
      
      const lodLevel = lodSystemDisabled.calculateLODLevel(chunkCenter, chunkRadius);
      
      // Should always return 0 when disabled
      expect(lodLevel).toBe(0);
    });
    
    test('should return appropriate LOD level based on distance', () => {
      // Setup a custom LOD configuration
      const customConfig: LODConfig = {
        enabled: true,
        maxLevel: 4, // Ensure this matches the highest LOD level
        distances: [500, 1000, 2000, 4000],
        bias: 1.0,
        transitionSize: 10,
        adaptiveQuality: false,
        targetFramerate: 60,
        performanceLevel: null,
        adaptationSpeed: 0.5,
        performanceCheckInterval: 1000
      };
      
      // Initialize system with our custom config
      const lodSystem = new LODTerrainSystem(mockScene, mockCamera, customConfig);
      
      // Create chunks at different distances
      const closeDistance = customConfig.distances[0] - 100;
      const mediumDistance = customConfig.distances[1] + 100;
      const farDistance = customConfig.distances[2] + 100;
      const veryFarDistance = customConfig.distances[3] + 100;
      
      // Position the camera at the origin
      mockCamera.position = new BABYLON.Vector3(0, 0, 0);
      
      // Calculate LOD levels for chunks at different distances
      const closeLOD = lodSystem.calculateLODLevel(new BABYLON.Vector3(closeDistance, 0, 0), 1);
      const mediumLOD = lodSystem.calculateLODLevel(new BABYLON.Vector3(mediumDistance, 0, 0), 1);
      const farLOD = lodSystem.calculateLODLevel(new BABYLON.Vector3(farDistance, 0, 0), 1);
      const veryFarLOD = lodSystem.calculateLODLevel(new BABYLON.Vector3(veryFarDistance, 0, 0), 1);
      
      // Verify that LOD levels increase as distance increases
      expect(closeLOD).toBeLessThanOrEqual(mediumLOD);
      expect(mediumLOD).toBeLessThanOrEqual(farLOD);
      expect(farLOD).toBeLessThanOrEqual(customConfig.maxLevel);
    });
    
    test('should apply chunk size bias to LOD calculation', () => {
      // Create with custom LOD config that has a high bias
      const highBiasConfig: LODConfig = {
        enabled: true,
        maxLevel: 3,
        distances: [100, 200, 300],
        bias: 2.0, // Higher bias means larger chunks get higher quality
        transitionSize: 10,
        adaptiveQuality: false,
        targetFramerate: 60,
        performanceLevel: null,
        adaptationSpeed: 0.5,
        performanceCheckInterval: 1000
      };
      
      const lodSystemHighBias = new LODTerrainSystem(mockScene, mockCamera, highBiasConfig);
      
      // Position camera at origin
      mockCamera.position = new BABYLON.Vector3(0, 0, 0);
      
      // Test with different sized chunks at the same distance
      const chunkPosition = new BABYLON.Vector3(0, 0, 150);
      const smallChunkRadius = 10;
      const largeChunkRadius = 20; // Double the size
      
      const smallLOD = lodSystemHighBias.calculateLODLevel(chunkPosition, smallChunkRadius);
      const largeLOD = lodSystemHighBias.calculateLODLevel(chunkPosition, largeChunkRadius);
      
      // Verify that larger chunks get better quality (lower LOD level)
      expect(largeLOD).toBeLessThanOrEqual(smallLOD);
    });
  });
  
  describe('getLODLevelInfo', () => {
    test('should return null for invalid LOD level', () => {
      // Test negative level
      expect(lodSystem.getLODLevelInfo(-1)).toBeNull();
      
      // Test level beyond max
      const maxLevel = DEFAULT_LOD_CONFIG.maxLevel;
      expect(lodSystem.getLODLevelInfo(maxLevel + 1)).toBeNull();
    });
    
    test('should return correct LOD level info', () => {
      // Test level 0 (highest quality)
      const level0Info = lodSystem.getLODLevelInfo(0);
      expect(level0Info).not.toBeNull();
      expect(level0Info?.level).toBe(0);
      expect(level0Info?.reduction).toBe(1); // No reduction at level 0
      
      // Test level 1
      const level1Info = lodSystem.getLODLevelInfo(1);
      expect(level1Info).not.toBeNull();
      expect(level1Info?.level).toBe(1);
      expect(level1Info?.reduction).toBe(2); // 1/2 the vertices
      
      // Test level 2
      const level2Info = lodSystem.getLODLevelInfo(2);
      expect(level2Info).not.toBeNull();
      expect(level2Info?.level).toBe(2);
      expect(level2Info?.reduction).toBe(4); // 1/4 the vertices
    });
  });
  
  describe('setEnabled', () => {
    test('should toggle enabled state', () => {
      // Start with enabled LOD
      expect(lodSystem['config'].enabled).toBe(true);
      
      // Disable LOD
      lodSystem.setEnabled(false);
      expect(lodSystem['config'].enabled).toBe(false);
      
      // Enable LOD
      lodSystem.setEnabled(true);
      expect(lodSystem['config'].enabled).toBe(true);
    });
  });
  
  describe('dispose', () => {
    test('should remove scene observer', () => {
      // Dispose LOD system
      lodSystem.dispose();
      
      // Verify observer was removed
      expect(mockScene.onBeforeRenderObservable.remove).toHaveBeenCalled();
    });
  });
}); 