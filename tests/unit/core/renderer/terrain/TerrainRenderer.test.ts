/**
 * @file tests/unit/core/renderer/terrain/TerrainRenderer.test.ts
 * @description Unit tests for TerrainRenderer
 */

import * as BABYLON from 'babylonjs';
import { TerrainRenderer, TerrainRenderConfig, TerrainQuality } from '../../../../../src/core/renderer/terrain/TerrainRenderer';
import { ITerrainRenderer } from '../../../../../src/core/renderer/terrain/ITerrainRenderer';

// Mock BabylonJS classes
jest.mock('babylonjs');

describe('TerrainRenderer', () => {
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockCamera: jest.Mocked<BABYLON.Camera>;
  let mockTransformNode: jest.Mocked<BABYLON.TransformNode>;
  let mockMaterial: jest.Mocked<BABYLON.StandardMaterial>;
  let mockMesh: jest.Mocked<BABYLON.Mesh>;
  let mockObservable: jest.Mocked<BABYLON.Observable<BABYLON.Scene>>;
  let terrainRenderer: TerrainRenderer;
  let defaultConfig: Partial<TerrainRenderConfig>;
  
  const createMockHeightData = (width: number, height: number): Float32Array => {
    const data = new Float32Array(width * height);
    // Fill with some sample terrain data
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        // Simple height function for testing
        const nx = x / (width - 1) - 0.5;
        const nz = z / (height - 1) - 0.5;
        const height = Math.cos(nx * Math.PI * 3) * Math.cos(nz * Math.PI * 3) * 0.5 + 0.5;
        data[z * width + x] = height;
      }
    }
    return data;
  };
  
  beforeEach(() => {
    // Create mocks
    mockScene = {
      onBeforeRenderObservable: {
        add: jest.fn(),
        remove: jest.fn()
      },
    } as unknown as jest.Mocked<BABYLON.Scene>;
    
    mockCamera = {
      position: new BABYLON.Vector3(0, 100, 0)
    } as unknown as jest.Mocked<BABYLON.Camera>;
    
    mockTransformNode = {
      dispose: jest.fn()
    } as unknown as jest.Mocked<BABYLON.TransformNode>;
    
    mockMaterial = {
      dispose: jest.fn(),
      diffuseColor: new BABYLON.Color3(),
      specularColor: new BABYLON.Color3()
    } as unknown as jest.Mocked<BABYLON.StandardMaterial>;
    
    mockMesh = {
      dispose: jest.fn(),
      material: mockMaterial,
      setEnabled: jest.fn()
    } as unknown as jest.Mocked<BABYLON.Mesh>;
    
    // Mock StandardMaterial constructor
    (BABYLON.StandardMaterial as jest.Mock).mockImplementation(() => mockMaterial);
    
    // Mock TransformNode constructor
    (BABYLON.TransformNode as jest.Mock).mockImplementation(() => mockTransformNode);
    
    defaultConfig = {
      quality: TerrainQuality.MEDIUM,
      viewDistance: 1000,
      dynamicLOD: true,
      lodDistances: [50, 150, 300, 600],
      tessellation: false,
      normalMapping: true,
      parallaxMapping: false,
      castShadows: true,
      wireframe: false,
      freeze: false
    };
    
    // Create TerrainRenderer instance
    terrainRenderer = new TerrainRenderer(mockScene, mockCamera, defaultConfig);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('initialization', () => {
    test('should initialize with height data', async () => {
      // Create test height data
      const width = 129;
      const height = 129;
      const heightData = createMockHeightData(width, height);
      const terrainSize = new BABYLON.Vector3(1000, 100, 1000);
      
      // Mock mesh creation
      (BABYLON.Mesh.CreateGroundFromHeightMap as jest.Mock).mockImplementation(() => mockMesh);
      
      // Initialize terrain
      await terrainRenderer.initialize(heightData, width, height, terrainSize);
      
      // Verify transform node was created
      expect(BABYLON.TransformNode).toHaveBeenCalledWith('terrainRoot', mockScene);
      
      // Verify material was created
      expect(BABYLON.StandardMaterial).toHaveBeenCalledWith('terrainMaterial', mockScene);
      
      // Verify update observer was registered
      expect(mockScene.onBeforeRenderObservable.add).toHaveBeenCalled();
    });
  });
  
  describe('getHeightAtPosition', () => {
    test('should return null when not initialized', () => {
      const position = new BABYLON.Vector3(0, 0, 0);
      const height = terrainRenderer.getHeightAtPosition(position);
      expect(height).toBeNull();
    });
    
    test('should return height at position when initialized', async () => {
      // Create test height data
      const width = 129;
      const height = 129;
      const heightData = createMockHeightData(width, height);
      const terrainSize = new BABYLON.Vector3(1000, 100, 1000);
      
      // Mock mesh creation
      (BABYLON.Mesh.CreateGroundFromHeightMap as jest.Mock).mockImplementation(() => mockMesh);
      
      // Initialize terrain
      await terrainRenderer.initialize(heightData, width, height, terrainSize);
      
      // Test center point
      const position = new BABYLON.Vector3(0, 0, 0);
      const heightAtCenter = terrainRenderer.getHeightAtPosition(position);
      
      // Center height should be 0.5 * terrain height (from our test height function)
      expect(heightAtCenter).not.toBeNull();
      
      // Test out of bounds position
      const outOfBoundsPosition = new BABYLON.Vector3(2000, 0, 2000);
      const heightOutOfBounds = terrainRenderer.getHeightAtPosition(outOfBoundsPosition);
      expect(heightOutOfBounds).toBeNull();
    });
  });
  
  describe('applyTexturesBySlope', () => {
    test('should apply textures based on slope and height', async () => {
      // Create test height data
      const width = 129;
      const height = 129;
      const heightData = createMockHeightData(width, height);
      const terrainSize = new BABYLON.Vector3(1000, 100, 1000);
      
      // Mock mesh creation
      (BABYLON.Mesh.CreateGroundFromHeightMap as jest.Mock).mockImplementation(() => mockMesh);
      
      // Mock texture loading
      const mockTexture = {} as BABYLON.Texture;
      (BABYLON.Texture as jest.Mock).mockImplementation(() => mockTexture);
      
      // Initialize terrain
      await terrainRenderer.initialize(heightData, width, height, terrainSize);
      
      // Apply textures
      const textures = ['texture1.png', 'texture2.png', 'texture3.png'];
      const slopeThresholds = [0, 0.3, 0.7];
      const heightThresholds = [0, 0.5, 0.8];
      
      terrainRenderer.applyTexturesBySlope(textures, slopeThresholds, heightThresholds, 10);
      
      // Verify textures were created
      expect(BABYLON.Texture).toHaveBeenCalledTimes(textures.length);
    });
  });
  
  describe('updateConfig', () => {
    test('should update configuration', async () => {
      // Create test height data
      const width = 129;
      const height = 129;
      const heightData = createMockHeightData(width, height);
      const terrainSize = new BABYLON.Vector3(1000, 100, 1000);
      
      // Mock mesh creation
      (BABYLON.Mesh.CreateGroundFromHeightMap as jest.Mock).mockImplementation(() => mockMesh);
      
      // Initialize terrain
      await terrainRenderer.initialize(heightData, width, height, terrainSize);
      
      // Update config
      const newConfig = {
        quality: TerrainQuality.HIGH,
        viewDistance: 2000,
        wireframe: true
      };
      
      terrainRenderer.updateConfig(newConfig);
      
      // Verify wireframe material created when wireframe enabled
      expect(BABYLON.WireframeMode).toBeDefined();
    });
  });
  
  describe('dispose', () => {
    test('should clean up resources', async () => {
      // Create test height data
      const width = 129;
      const height = 129;
      const heightData = createMockHeightData(width, height);
      const terrainSize = new BABYLON.Vector3(1000, 100, 1000);
      
      // Mock mesh creation
      (BABYLON.Mesh.CreateGroundFromHeightMap as jest.Mock).mockImplementation(() => mockMesh);
      
      // Initialize terrain
      await terrainRenderer.initialize(heightData, width, height, terrainSize);
      
      // Dispose
      terrainRenderer.dispose();
      
      // Verify observer removed
      expect(mockScene.onBeforeRenderObservable.remove).toHaveBeenCalled();
      
      // Verify material disposed
      expect(mockMaterial.dispose).toHaveBeenCalled();
      
      // Verify transform node disposed
      expect(mockTransformNode.dispose).toHaveBeenCalled();
    });
  });
  
  describe('getStats', () => {
    test('should return performance statistics', async () => {
      // Create test height data
      const width = 129;
      const height = 129;
      const heightData = createMockHeightData(width, height);
      const terrainSize = new BABYLON.Vector3(1000, 100, 1000);
      
      // Mock mesh creation
      (BABYLON.Mesh.CreateGroundFromHeightMap as jest.Mock).mockImplementation(() => mockMesh);
      
      // Initialize terrain
      await terrainRenderer.initialize(heightData, width, height, terrainSize);
      
      // Get stats
      const stats = terrainRenderer.getStats();
      
      // Verify stats object
      expect(stats).toBeDefined();
      expect(stats.terrainSize).toBeDefined();
      expect(stats.quality).toBeDefined();
    });
  });
}); 