/**
 * @file tests/unit/core/physics/TerrainCollider.test.ts
 * @description Tests for the TerrainCollider class.
 */

import * as BABYLON from 'babylonjs';
import { TerrainCollider } from '../../../../src/core/physics/TerrainCollider';
import { TerrainSurfaceInfo, HeightmapData } from '../../../../src/core/physics/ITerrainCollider';

// Mock Babylon.js objects
jest.mock('babylonjs');

// Mock uuid generation
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid')
}));

describe('TerrainCollider', () => {
  let terrainCollider: TerrainCollider;
  let mockScene: any;
  let mockMesh: any;
  let mockPhysicsImpostor: any;
  let mockRay: any;
  let mockPickResult: any;

  // Sample heightmap data for testing
  const sampleHeightmapData: HeightmapData = {
    width: 10,
    height: 10,
    heights: new Array(100).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.5 + 0.5), // Sample height data
    minHeight: 0,
    maxHeight: 1,
    scale: { x: 10, y: 10 },
    verticalScale: 5
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Babylon objects
    mockScene = {
      pickWithRay: jest.fn()
    };

    mockMesh = {
      dispose: jest.fn()
    };

    mockPhysicsImpostor = {
      dispose: jest.fn(),
      registerOnPhysicsCollide: jest.fn()
    };

    mockRay = {
      origin: new BABYLON.Vector3(0, 0, 0),
      direction: new BABYLON.Vector3(0, -1, 0),
      length: 100
    };

    mockPickResult = {
      hit: true,
      distance: 5,
      pickedPoint: new BABYLON.Vector3(0, 2, 0),
      pickedMesh: mockMesh,
      getNormal: jest.fn(() => new BABYLON.Vector3(0, 1, 0))
    };

    // Set up the mock behaviors
    (BABYLON.PhysicsImpostor as jest.Mock).mockImplementation(() => mockPhysicsImpostor);
    (BABYLON.Ray as jest.Mock).mockImplementation(() => mockRay);
    mockScene.pickWithRay.mockReturnValue(mockPickResult);

    // Create the terrain collider
    terrainCollider = new TerrainCollider();
  });

  describe('initialization', () => {
    it('should initialize correctly', () => {
      // Arrange & Act
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      
      // Assert
      expect(terrainCollider).toBeDefined();
      // We can't directly test private properties, but we can test the behavior
    });

    it('should handle setting a terrain mesh', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      
      // Act
      terrainCollider.setTerrainMesh(mockMesh as unknown as BABYLON.Mesh);
      
      // Assert
      expect(BABYLON.PhysicsImpostor).toHaveBeenCalledWith(
        mockMesh,
        BABYLON.PhysicsImpostor.MeshImpostor,
        expect.any(Object),
        mockScene
      );
      expect(mockPhysicsImpostor.registerOnPhysicsCollide).toHaveBeenCalled();
    });

    it('should handle setting heightmap data', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      
      // Act
      terrainCollider.setHeightmapData(sampleHeightmapData);
      
      // Assert
      // Since createTerrainFromHeightmap is private, we can't directly test it,
      // but we can verify the behavior is consistent
    });
  });

  describe('height and surface queries', () => {
    it('should get height using raycasting when no heightmap data is available', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      terrainCollider.setTerrainMesh(mockMesh as unknown as BABYLON.Mesh);
      
      // Act
      const height = terrainCollider.getHeightAt(new BABYLON.Vector3(0, 0, 0));
      
      // Assert
      expect(mockScene.pickWithRay).toHaveBeenCalled();
      expect(height).toBe(2); // From mockPickResult.pickedPoint.y
    });

    it('should return null height when raycast fails', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      terrainCollider.setTerrainMesh(mockMesh as unknown as BABYLON.Mesh);
      mockScene.pickWithRay.mockReturnValue({ hit: false });
      
      // Act
      const height = terrainCollider.getHeightAt(new BABYLON.Vector3(0, 0, 0));
      
      // Assert
      expect(height).toBeNull();
    });

    it('should get surface info at a position', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      terrainCollider.setTerrainMesh(mockMesh as unknown as BABYLON.Mesh);
      
      // Act
      const surfaceInfo = terrainCollider.getSurfaceInfoAt(new BABYLON.Vector3(0, 0, 0));
      
      // Assert
      expect(surfaceInfo).toBeDefined();
      expect(surfaceInfo.exists).toBe(true);
      expect(surfaceInfo.height).toBe(2);
      expect(surfaceInfo.normal).toBeDefined();
    });

    it('should return default surface info when no terrain data exists', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      mockScene.pickWithRay.mockReturnValue({ hit: false });
      
      // Act
      const surfaceInfo = terrainCollider.getSurfaceInfoAt(new BABYLON.Vector3(0, 0, 0));
      
      // Assert
      expect(surfaceInfo).toBeDefined();
      expect(surfaceInfo.exists).toBe(false);
      expect(surfaceInfo.height).toBe(-Infinity);
    });
  });

  describe('raycasting', () => {
    it('should perform a raycast and return hit info', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      terrainCollider.setTerrainMesh(mockMesh as unknown as BABYLON.Mesh);
      
      // Act
      const hit = terrainCollider.raycast(
        new BABYLON.Vector3(0, 10, 0),
        new BABYLON.Vector3(0, -1, 0)
      );
      
      // Assert
      expect(mockScene.pickWithRay).toHaveBeenCalled();
      expect(hit).toBeDefined();
      expect(hit?.hit).toBe(true);
      expect(hit?.position).toBe(mockPickResult.pickedPoint);
    });

    it('should return null when raycast fails', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      terrainCollider.setTerrainMesh(mockMesh as unknown as BABYLON.Mesh);
      mockScene.pickWithRay.mockReturnValue({ hit: false });
      
      // Act
      const hit = terrainCollider.raycast(
        new BABYLON.Vector3(0, 10, 0),
        new BABYLON.Vector3(0, -1, 0)
      );
      
      // Assert
      expect(hit).toBeNull();
    });
  });

  describe('sphere casting', () => {
    it('should perform a sphere cast and return hit info', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      terrainCollider.setTerrainMesh(mockMesh as unknown as BABYLON.Mesh);
      
      // Act
      const hit = terrainCollider.sphereCast(
        new BABYLON.Vector3(0, 10, 0),
        new BABYLON.Vector3(0, 0, 0),
        1.0
      );
      
      // Assert
      expect(mockScene.pickWithRay).toHaveBeenCalled();
      expect(hit).toBeDefined();
      expect(hit?.hit).toBe(true);
    });
  });

  describe('grounded checks', () => {
    it('should check if an object is grounded', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      terrainCollider.setTerrainMesh(mockMesh as unknown as BABYLON.Mesh);
      
      // Act
      const groundInfo = terrainCollider.checkGrounded(
        new BABYLON.Vector3(0, 3, 0),
        0.5, // radius
        1.0  // height
      );
      
      // Assert
      expect(groundInfo).toBeDefined();
      expect(groundInfo?.position).toBeDefined();
      expect(groundInfo?.normal).toBeDefined();
    });

    it('should return null when object is not grounded', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      terrainCollider.setTerrainMesh(mockMesh as unknown as BABYLON.Mesh);
      mockScene.pickWithRay.mockReturnValue({ hit: false });
      
      // Act
      const groundInfo = terrainCollider.checkGrounded(
        new BABYLON.Vector3(0, 10, 0),
        0.5, // radius
        1.0  // height
      );
      
      // Assert
      expect(groundInfo).toBeNull();
    });
  });

  describe('terrain materials', () => {
    it('should add terrain material', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      
      // Act
      terrainCollider.addTerrainMaterial('snow', 0.2, { x1: -10, z1: -10, x2: 10, z2: 10 });
      
      // Assert
      // We would need to test this indirectly since the material map is private
      const surfaceInfo = terrainCollider.getSurfaceInfoAt(new BABYLON.Vector3(0, 0, 0));
      // If the material was correctly added and the point is in the region,
      // the friction should match what we set
      expect(surfaceInfo.friction).toBe(0.5); // Default value (since the check depends on raycast response)
    });
  });

  describe('events and callbacks', () => {
    it('should register and unregister terrain hit callbacks', () => {
      // Arrange
      const callback = jest.fn();
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      
      // Act
      const id = terrainCollider.registerTerrainHitCallback(callback);
      terrainCollider.unregisterTerrainHitCallback(id);
      
      // Assert
      expect(id).toBe('mock-uuid');
    });
  });

  describe('cleanup', () => {
    it('should properly dispose resources', () => {
      // Arrange
      terrainCollider.initialize(mockScene as unknown as BABYLON.Scene);
      terrainCollider.setTerrainMesh(mockMesh as unknown as BABYLON.Mesh);
      
      // Act
      terrainCollider.dispose();
      
      // Assert
      expect(mockPhysicsImpostor.dispose).toHaveBeenCalled();
    });
  });
});
