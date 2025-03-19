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
  let mockObservable: jest.Mocked<BABYLON.Observable<BABYLON.Scene>>;
  let lodSystem: LODTerrainSystem;
  let defaultConfig: LODConfig;
  
  beforeEach(() => {
    // Create mocks
    mockObservable = {
      add: jest.fn(),
      remove: jest.fn()
    } as unknown as jest.Mocked<BABYLON.Observable<BABYLON.Scene>>;
    
    mockScene = {
      onBeforeRenderObservable: mockObservable
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
        transitionSize: 5
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
      // Create with custom LOD config
      const customConfig: LODConfig = {
        enabled: true,
        maxLevel: 3,
        distances: [100, 200, 300],
        bias: 1.0,
        transitionSize: 10
      };
      
      const lodSystemCustom = new LODTerrainSystem(mockScene, mockCamera, customConfig);
      
      // Position camera at origin
      mockCamera.position = new BABYLON.Vector3(0, 0, 0);
      
      // Test close chunk (should be LOD level 0)
      const closeChunk = new BABYLON.Vector3(0, 0, 50);
      expect(lodSystemCustom.calculateLODLevel(closeChunk, 10)).toBe(0);
      
      // Test medium distance chunk (should be LOD level 1)
      const mediumChunk = new BABYLON.Vector3(0, 0, 150);
      expect(lodSystemCustom.calculateLODLevel(mediumChunk, 10)).toBe(1);
      
      // Test far chunk (should be LOD level 2)
      const farChunk = new BABYLON.Vector3(0, 0, 250);
      expect(lodSystemCustom.calculateLODLevel(farChunk, 10)).toBe(2);
      
      // Test very far chunk (should be max LOD level)
      const veryFarChunk = new BABYLON.Vector3(0, 0, 1000);
      expect(lodSystemCustom.calculateLODLevel(veryFarChunk, 10)).toBe(3);
    });
    
    test('should apply chunk size bias to LOD calculation', () => {
      // Create with custom LOD config that has a high bias
      const highBiasConfig: LODConfig = {
        enabled: true,
        maxLevel: 3,
        distances: [100, 200, 300],
        bias: 2.0, // Higher bias means larger chunks get higher quality
        transitionSize: 10
      };
      
      const lodSystemHighBias = new LODTerrainSystem(mockScene, mockCamera, highBiasConfig);
      
      // Position camera at origin
      mockCamera.position = new BABYLON.Vector3(0, 0, 0);
      
      // Test with normal sized chunk
      const normalChunk = new BABYLON.Vector3(0, 0, 150);
      const normalChunkRadius = 10;
      const normalLOD = lodSystemHighBias.calculateLODLevel(normalChunk, normalChunkRadius);
      
      // Test with larger chunk at same distance
      const largeChunkRadius = 20; // Double the size
      const largeLOD = lodSystemHighBias.calculateLODLevel(normalChunk, largeChunkRadius);
      
      // The larger chunk should have a lower LOD level (higher quality)
      expect(largeLOD).toBeLessThan(normalLOD);
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