/**
 * @file tests/unit/core/physics/TerrainColliderFactory.test.ts
 * @description Tests for the TerrainColliderFactory
 */

import * as BABYLON from 'babylonjs';
import { TerrainColliderFactory } from '../../../../src/core/physics/TerrainColliderFactory';
import { TerrainCollider } from '../../../../src/core/physics/TerrainCollider';
import { ITerrainCollider, HeightmapData } from '../../../../src/core/physics/ITerrainCollider';

// Mock dependencies
jest.mock('babylonjs');
jest.mock('../../../../src/core/physics/TerrainCollider');

describe('TerrainColliderFactory', () => {
  // Mock scene and mesh
  let mockScene: any;
  let mockMesh: any;
  
  // Mock TerrainCollider instance
  let mockTerrainCollider: any;
  
  // Sample heightmap data
  const sampleHeightmapData: HeightmapData = {
    width: 10,
    height: 10,
    heights: new Float32Array(100).fill(0.5),
    minHeight: 0,
    maxHeight: 100,
    scale: { x: 1, y: 1 } as BABYLON.Vector2,
    verticalScale: 1
  };
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock objects
    mockScene = {};
    mockMesh = {};
    
    // Set up mock TerrainCollider
    mockTerrainCollider = {
      initialize: jest.fn(),
      setHeightmapData: jest.fn(),
      setTerrainMesh: jest.fn(),
      addTerrainMaterial: jest.fn()
    };
    
    // Configure TerrainCollider constructor mock
    (TerrainCollider as jest.Mock).mockImplementation((scene) => {
      // Auto-call initialize with the scene parameter when the constructor is called
      if (scene) {
        mockTerrainCollider.initialize(scene);
      }
      return mockTerrainCollider;
    });
  });
  
  describe('create', () => {
    it('should create a terrain collider with the provided configuration', () => {
      // Arrange
      const config = {
        scene: mockScene,
        heightmapData: sampleHeightmapData,
        mesh: mockMesh,
        materials: [
          { name: 'snow', friction: 0.1 },
          { name: 'ice', friction: 0.05, region: { x1: 0, z1: 0, x2: 10, z2: 10 } }
        ]
      };
      
      // Act
      const terrainCollider = TerrainColliderFactory.create(config);
      
      // Assert
      expect(TerrainCollider).toHaveBeenCalledWith(mockScene);
      expect(mockTerrainCollider.initialize).toHaveBeenCalledWith(mockScene);
      expect(mockTerrainCollider.setHeightmapData).toHaveBeenCalledWith(sampleHeightmapData);
      expect(mockTerrainCollider.setTerrainMesh).toHaveBeenCalledWith(mockMesh);
      expect(mockTerrainCollider.addTerrainMaterial).toHaveBeenCalledTimes(2);
      expect(mockTerrainCollider.addTerrainMaterial).toHaveBeenCalledWith('snow', 0.1, undefined);
      expect(mockTerrainCollider.addTerrainMaterial).toHaveBeenCalledWith('ice', 0.05, { x1: 0, z1: 0, x2: 10, z2: 10 });
    });
    
    it('should create a terrain collider with minimal configuration', () => {
      // Arrange
      const config = {
        scene: mockScene
      };
      
      // Act
      const terrainCollider = TerrainColliderFactory.create(config);
      
      // Assert
      expect(TerrainCollider).toHaveBeenCalledWith(mockScene);
      expect(mockTerrainCollider.initialize).toHaveBeenCalledWith(mockScene);
      expect(mockTerrainCollider.setHeightmapData).not.toHaveBeenCalled();
      expect(mockTerrainCollider.setTerrainMesh).not.toHaveBeenCalled();
      expect(mockTerrainCollider.addTerrainMaterial).not.toHaveBeenCalled();
    });
  });
  
  describe('createFromMesh', () => {
    it('should create a terrain collider from a mesh', () => {
      // Arrange
      const materials = [
        { name: 'snow', friction: 0.1 },
        { name: 'ice', friction: 0.05, region: { x1: 0, z1: 0, x2: 10, z2: 10 } }
      ];
      
      // Act
      const terrainCollider = TerrainColliderFactory.createFromMesh(mockScene, mockMesh, materials);
      
      // Assert
      expect(TerrainCollider).toHaveBeenCalledWith(mockScene);
      expect(mockTerrainCollider.initialize).toHaveBeenCalledWith(mockScene);
      expect(mockTerrainCollider.setTerrainMesh).toHaveBeenCalledWith(mockMesh);
      expect(mockTerrainCollider.addTerrainMaterial).toHaveBeenCalledTimes(2);
    });
    
    it('should create a terrain collider from a mesh without materials', () => {
      // Act
      const terrainCollider = TerrainColliderFactory.createFromMesh(mockScene, mockMesh);
      
      // Assert
      expect(TerrainCollider).toHaveBeenCalledWith(mockScene);
      expect(mockTerrainCollider.initialize).toHaveBeenCalledWith(mockScene);
      expect(mockTerrainCollider.setTerrainMesh).toHaveBeenCalledWith(mockMesh);
      expect(mockTerrainCollider.addTerrainMaterial).not.toHaveBeenCalled();
    });
  });
  
  describe('createFromHeightmap', () => {
    // This would normally require more complex mocking of the Image and Canvas APIs
    // For simplicity, we'll just test the initialization part and mock the loadHeightmapFromUrl method
    
    beforeEach(() => {
      // Mock the loadHeightmapFromUrl method
      jest.spyOn(TerrainColliderFactory as any, 'loadHeightmapFromUrl').mockResolvedValue(sampleHeightmapData);
    });
    
    it('should create a terrain collider from a heightmap', async () => {
      // Arrange
      const options = {
        width: 100,
        height: 100,
        minHeight: 0,
        maxHeight: 100,
        scale: new BABYLON.Vector2(1, 1),
        verticalScale: 1,
        materials: [
          { name: 'snow', friction: 0.1 }
        ]
      };
      
      // Act
      const terrainCollider = await TerrainColliderFactory.createFromHeightmap(mockScene, 'heightmap.png', options);
      
      // Assert
      expect(TerrainCollider).toHaveBeenCalledWith(mockScene);
      expect(mockTerrainCollider.initialize).toHaveBeenCalledWith(mockScene);
      expect(mockTerrainCollider.setHeightmapData).toHaveBeenCalledWith(sampleHeightmapData);
      expect(mockTerrainCollider.addTerrainMaterial).toHaveBeenCalledWith('snow', 0.1, undefined);
    });
    
    it('should create a terrain collider from a heightmap with default options', async () => {
      // Act
      const terrainCollider = await TerrainColliderFactory.createFromHeightmap(mockScene, 'heightmap.png');
      
      // Assert
      expect(TerrainCollider).toHaveBeenCalledWith(mockScene);
      expect(mockTerrainCollider.initialize).toHaveBeenCalledWith(mockScene);
      expect(mockTerrainCollider.setHeightmapData).toHaveBeenCalledWith(sampleHeightmapData);
      expect(mockTerrainCollider.addTerrainMaterial).not.toHaveBeenCalled();
    });
  });
});
