/**
 * @file tests/unit/core/debug/visual/TerrainVisualizer.test.ts
 * @description Unit tests for the TerrainVisualizer class
 */

import * as BABYLON from 'babylonjs';
import { TerrainVisualizer, TerrainVisualizerOptions } from '../../../../../src/core/debug/visual/TerrainVisualizer';
import { DebugRenderer } from '../../../../../src/core/debug/DebugRenderer';

// Mock dependencies
jest.mock('../../../../../src/core/debug/DebugRenderer');
jest.mock('babylonjs');

describe('TerrainVisualizer', () => {
  let mockDebugRenderer: jest.Mocked<DebugRenderer>;
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockTerrainMesh: jest.Mocked<BABYLON.Mesh>;
  let terrainVisualizer: TerrainVisualizer;
  
  beforeEach(() => {
    // Setup mocks
    mockDebugRenderer = {
      showVector: jest.fn().mockReturnValue({}),
      showBox: jest.fn().mockReturnValue({}),
      removeDebugVector: jest.fn(),
      removeDebugMesh: jest.fn(),
      clear: jest.fn()
    } as unknown as jest.Mocked<DebugRenderer>;
    
    mockScene = {} as jest.Mocked<BABYLON.Scene>;
    
    // Create mock terrain mesh
    const positions = new Float32Array([
      0, 0, 0,  // vertex 0
      1, 0, 0,  // vertex 1
      0, 0, 1,  // vertex 2
      1, 0, 1,  // vertex 3
      0, 1, 0,  // vertex 4
      1, 1, 0,  // vertex 5
      0, 1, 1,  // vertex 6
      1, 1, 1   // vertex 7
    ]);
    
    const normals = new Float32Array([
      0, 1, 0,  // normal 0
      0, 1, 0,  // normal 1
      0, 1, 0,  // normal 2
      0, 1, 0,  // normal 3
      0, 1, 0,  // normal 4
      0, 1, 0,  // normal 5
      0, 1, 0,  // normal 6
      0, 1, 0   // normal 7
    ]);
    
    mockTerrainMesh = {
      getVerticesData: jest.fn((kind) => {
        if (kind === BABYLON.VertexBuffer.PositionKind) {
          return positions;
        }
        if (kind === BABYLON.VertexBuffer.NormalKind) {
          return normals;
        }
        return null;
      }),
      getWorldMatrix: jest.fn().mockReturnValue(BABYLON.Matrix.Identity())
    } as unknown as jest.Mocked<BABYLON.Mesh>;
    
    // Create the visualizer with mocked dependencies
    terrainVisualizer = new TerrainVisualizer(
      mockDebugRenderer,
      mockScene as unknown as BABYLON.Scene
    );
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Initialization', () => {
    test('should initialize with default options', () => {
      expect(terrainVisualizer).toBeDefined();
    });
    
    test('should initialize with custom options', () => {
      const customOptions: Partial<TerrainVisualizerOptions> = {
        showNormals: false,
        showHeightMap: false,
        normalDensity: 4,
        gridSize: 5
      };
      
      const customVisualizer = new TerrainVisualizer(
        mockDebugRenderer,
        mockScene as unknown as BABYLON.Scene,
        customOptions
      );
      
      expect(customVisualizer).toBeDefined();
    });
  });
  
  describe('Setting Terrain', () => {
    test('should extract terrain data when terrain is set', () => {
      terrainVisualizer.setTerrain(mockTerrainMesh as unknown as BABYLON.Mesh);
      
      // Can't directly test private property terrain data,
      // but we can test that the mesh methods were called
      expect(mockTerrainMesh.getVerticesData).toHaveBeenCalledWith(BABYLON.VertexBuffer.PositionKind);
      expect(mockTerrainMesh.getVerticesData).toHaveBeenCalledWith(BABYLON.VertexBuffer.NormalKind);
      expect(mockTerrainMesh.getWorldMatrix).toHaveBeenCalled();
    });
    
    test('should throw if terrain mesh has no position or normal data', () => {
      const invalidMesh = {
        getVerticesData: jest.fn().mockReturnValue(null),
        getWorldMatrix: jest.fn().mockReturnValue(BABYLON.Matrix.Identity())
      } as unknown as BABYLON.Mesh;
      
      expect(() => {
        terrainVisualizer.setTerrain(invalidMesh);
      }).toThrow();
    });
  });
  
  describe('Enabling and Disabling', () => {
    test('should be disabled by default', () => {
      expect(terrainVisualizer.isEnabled()).toBe(false);
    });
    
    test('should be enabled after enable() is called', () => {
      terrainVisualizer.enable();
      expect(terrainVisualizer.isEnabled()).toBe(true);
    });
    
    test('should update visualization when enabled and terrain is set', () => {
      terrainVisualizer.setTerrain(mockTerrainMesh as unknown as BABYLON.Mesh);
      terrainVisualizer.enable();
      
      // Should update visualization based on terrain data
      expect(mockDebugRenderer.showVector).toHaveBeenCalled();
    });
    
    test('should be disabled after disable() is called', () => {
      terrainVisualizer.enable();
      terrainVisualizer.disable();
      expect(terrainVisualizer.isEnabled()).toBe(false);
    });
    
    test('should toggle between enabled and disabled states', () => {
      expect(terrainVisualizer.isEnabled()).toBe(false);
      
      terrainVisualizer.toggle();
      expect(terrainVisualizer.isEnabled()).toBe(true);
      
      terrainVisualizer.toggle();
      expect(terrainVisualizer.isEnabled()).toBe(false);
    });
  });
  
  describe('Terrain Analysis', () => {
    beforeEach(() => {
      terrainVisualizer.setTerrain(mockTerrainMesh as unknown as BABYLON.Mesh);
    });
    
    test('should return normal at position', () => {
      const normal = terrainVisualizer.getNormalAtPosition(0.5, 0.5);
      
      expect(normal).toBeDefined();
      expect(normal.y).toBeGreaterThan(0); // Default normals are up (0,1,0)
    });
    
    test('should calculate slope angle at position', () => {
      const slope = terrainVisualizer.getSlopeAtPosition(0.5, 0.5);
      
      expect(slope).toBeDefined();
      expect(typeof slope).toBe('number');
    });
  });
  
  describe('Cleanup and Disposal', () => {
    test('should clean up resources when disposed', () => {
      terrainVisualizer.setTerrain(mockTerrainMesh as unknown as BABYLON.Mesh);
      terrainVisualizer.enable();
      terrainVisualizer.dispose();
      
      expect(terrainVisualizer.isEnabled()).toBe(false);
    });
  });
}); 