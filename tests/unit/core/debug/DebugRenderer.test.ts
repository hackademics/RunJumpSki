/**
 * @file tests/unit/core/debug/DebugRenderer.test.ts
 * @description Unit tests for the DebugRenderer class
 */

import * as BABYLON from 'babylonjs';
import { DebugRenderer, DebugRendererOptions } from '../../../../src/core/debug/DebugRenderer';

// Mock dependencies
jest.mock('babylonjs');

describe('DebugRenderer', () => {
  let debugRenderer: DebugRenderer;
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockMesh: jest.Mocked<BABYLON.Mesh>;
  let mockLinesMesh: jest.Mocked<BABYLON.LinesMesh>;
  let mockMaterial: jest.Mocked<BABYLON.StandardMaterial>;
  let mockTransformNode: jest.Mocked<BABYLON.TransformNode>;
  
  beforeEach(() => {
    // Create mock objects
    mockMesh = {
      name: 'mock-mesh',
      dispose: jest.fn(),
      setEnabled: jest.fn(),
      isVisible: true,
      createInstance: jest.fn().mockImplementation((name) => ({
        name,
        position: new BABYLON.Vector3(),
        parent: null,
        dispose: jest.fn()
      }))
    } as unknown as jest.Mocked<BABYLON.Mesh>;
    
    // Setup Vector3 prototype methods for vector operations
    jest.spyOn(BABYLON.Vector3.prototype, 'normalize').mockReturnThis();
    jest.spyOn(BABYLON.Vector3.prototype, 'length').mockReturnValue(1);
    jest.spyOn(BABYLON.Vector3.prototype, 'cross').mockImplementation(() => {
      const result = new BABYLON.Vector3();
      jest.spyOn(result, 'length').mockReturnValue(1);
      jest.spyOn(result, 'normalize').mockReturnThis();
      jest.spyOn(result, 'scale').mockImplementation(() => {
        const scaled = new BABYLON.Vector3();
        jest.spyOn(scaled, 'add').mockReturnValue(new BABYLON.Vector3());
        return scaled;
      });
      return result;
    });
    jest.spyOn(BABYLON.Vector3.prototype, 'scale').mockImplementation(() => {
      const result = new BABYLON.Vector3();
      jest.spyOn(result, 'add').mockReturnValue(new BABYLON.Vector3());
      return result;
    });
    jest.spyOn(BABYLON.Vector3.prototype, 'add').mockReturnValue(new BABYLON.Vector3());
    jest.spyOn(BABYLON.Vector3.prototype, 'subtract').mockImplementation(() => {
      const result = new BABYLON.Vector3();
      jest.spyOn(result, 'normalize').mockReturnThis();
      return result;
    });
    jest.spyOn(BABYLON.Vector3.prototype, 'copyFrom').mockReturnThis();
    
    // Add static methods to Vector3
    BABYLON.Vector3.Up = jest.fn().mockReturnValue(new BABYLON.Vector3(0, 1, 0));
    BABYLON.Vector3.Forward = jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 1));
    BABYLON.Vector3.Cross = jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0));
    BABYLON.Vector3.Dot = jest.fn().mockReturnValue(0);
    BABYLON.Mesh.MergeMeshes = jest.fn().mockReturnValue(mockMesh);
    
    mockLinesMesh = {
      name: 'mock-lines-mesh',
      dispose: jest.fn(),
      setEnabled: jest.fn(),
      isVisible: true
    } as unknown as jest.Mocked<BABYLON.LinesMesh>;
    
    mockMaterial = {
      name: 'mock-material',
      diffuseColor: new BABYLON.Color3(1, 1, 1),
      alpha: 1,
      wireframe: false,
      dispose: jest.fn(),
      clone: jest.fn().mockReturnThis()
    } as unknown as jest.Mocked<BABYLON.StandardMaterial>;
    
    mockTransformNode = {
      name: 'debug-root',
      dispose: jest.fn(),
      getChildMeshes: jest.fn().mockReturnValue([]),
      setEnabled: jest.fn()
    } as unknown as jest.Mocked<BABYLON.TransformNode>;
    
    // Mock necessary Babylon.js static methods and constructors
    (BABYLON.StandardMaterial as unknown as jest.MockedClass<typeof BABYLON.StandardMaterial>).mockImplementation(() => mockMaterial);
    (BABYLON.TransformNode as unknown as jest.MockedClass<typeof BABYLON.TransformNode>).mockImplementation(() => mockTransformNode);
    (BABYLON.MeshBuilder.CreateBox as jest.Mock) = jest.fn().mockImplementation(() => mockMesh);
    (BABYLON.MeshBuilder.CreateSphere as jest.Mock) = jest.fn().mockImplementation(() => mockMesh);
    (BABYLON.MeshBuilder.CreateLines as jest.Mock) = jest.fn().mockImplementation(() => mockLinesMesh);
    (BABYLON.MeshBuilder.CreateCapsule as jest.Mock) = jest.fn().mockImplementation(() => mockMesh);
    
    // Mock VertexData for creating meshes
    (BABYLON.VertexData as any) = jest.fn().mockImplementation(() => {
      return {
        positions: [],
        indices: [],
        applyToMesh: jest.fn()
      };
    });
    
    // Create mock scene
    mockScene = {
      getEngine: jest.fn().mockReturnValue({
        getRenderWidth: jest.fn().mockReturnValue(1920),
        getRenderHeight: jest.fn().mockReturnValue(1080)
      }),
      onBeforeRenderObservable: {
        add: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn()
      }
    } as unknown as jest.Mocked<BABYLON.Scene>;
    
    // Create debug renderer with default options
    debugRenderer = new DebugRenderer(mockScene as unknown as BABYLON.Scene);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Initialization', () => {
    test('should initialize with default options', () => {
      expect(debugRenderer).toBeDefined();
      expect(BABYLON.TransformNode).toHaveBeenCalledWith('debugRoot', mockScene);
      expect(BABYLON.StandardMaterial).toHaveBeenCalled();
    });
    
    test('should initialize with custom options', () => {
      const customOptions: Partial<DebugRendererOptions> = {
        enabled: true,
        collisionColor: new BABYLON.Color3(1, 0, 0),
        alpha: 0.5,
        wireframe: true
      };
      
      const customRenderer = new DebugRenderer(
        mockScene as unknown as BABYLON.Scene,
        customOptions
      );
      
      expect(customRenderer).toBeDefined();
      expect(customRenderer.isEnabled()).toBe(true);
    });
  });
  
  describe('Visualization Methods', () => {
    test('should create a debug box', () => {
      const min = new BABYLON.Vector3(0, 0, 0);
      const max = new BABYLON.Vector3(1, 1, 1);
      
      const result = debugRenderer.showBox('test-box', min, max);
      
      expect(BABYLON.MeshBuilder.CreateBox).toHaveBeenCalled();
      expect(result).toBe(mockMesh);
    });
    
    test('should create a debug sphere', () => {
      const center = new BABYLON.Vector3(0, 0, 0);
      const radius = 1;
      
      const result = debugRenderer.showSphere('test-sphere', center, radius);
      
      expect(BABYLON.MeshBuilder.CreateSphere).toHaveBeenCalled();
      expect(result).toBe(mockMesh);
    });
    
    test('should create a debug vector', () => {
      const start = new BABYLON.Vector3(0, 0, 0);
      const direction = new BABYLON.Vector3(1, 0, 0);
      
      const result = debugRenderer.showVector('test-vector', start, direction);
      
      expect(BABYLON.MeshBuilder.CreateLines).toHaveBeenCalled();
      expect(result).toBe(mockLinesMesh);
    });
    
    test('should create a collision point visualization', () => {
      const position = new BABYLON.Vector3(0, 0, 0);
      
      const result = debugRenderer.showCollisionPoint('test-point', position);
      
      expect(BABYLON.MeshBuilder.CreateSphere).toHaveBeenCalled();
      expect(result).toBe(mockMesh);
    });
    
    test('should create multiple collision points', () => {
      const positions = [
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(1, 1, 1)
      ];
      
      debugRenderer.showCollisionPoints(positions);
      
      expect(BABYLON.MeshBuilder.CreateSphere).toHaveBeenCalled();
    });
    
    test('should create a capsule visualization', () => {
      const start = new BABYLON.Vector3(0, 0, 0);
      const end = new BABYLON.Vector3(0, 1, 0);
      const radius = 0.5;
      
      // Mock the necessary vector operations
      const mockDirection = {
        normalize: jest.fn().mockReturnThis()
      };
      jest.spyOn(end, 'subtract').mockReturnValue(mockDirection as any);
      
      // Mock the add-scale operation for the center calculation
      const mockSum = {
        scale: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0.5, 0))
      };
      jest.spyOn(start, 'add').mockReturnValue(mockSum as any);
      
      const result = debugRenderer.showCapsule('test-capsule', start, end, radius);
      
      expect(BABYLON.MeshBuilder.CreateCylinder).toHaveBeenCalled();
      expect(result).toBe(mockMesh);
    });
  });
  
  describe('Management Methods', () => {
    test('should register an updatable function', () => {
      const updateFn = jest.fn();
      
      debugRenderer.registerUpdatable(updateFn);
      
      // Check that the function was added to the updatables array
      expect(debugRenderer['updatables']).toContain(updateFn);
    });
    
    test('should remove a debug mesh', () => {
      // Mock the debugMeshes map with a test entry
      debugRenderer['debugMeshes'].set('test-mesh', mockMesh);
      
      debugRenderer.removeDebugMesh('test-mesh');
      
      expect(mockMesh.dispose).toHaveBeenCalled();
      expect(debugRenderer['debugMeshes'].has('test-mesh')).toBe(false);
    });
    
    test('should remove a debug vector', () => {
      // First create a vector
      const start = new BABYLON.Vector3(0, 0, 0);
      const direction = new BABYLON.Vector3(1, 0, 0);
      
      const vector = debugRenderer.showVector('test-vector', start, direction);
      
      // Then remove it
      debugRenderer.removeDebugVector('test-vector');
      
      expect(vector.dispose).toHaveBeenCalled();
    });
    
    test('should remove a debug sphere', () => {
      // First create a sphere and ensure it's added to the debugSpheres map
      const sphere = debugRenderer.showSphere('test-sphere', new BABYLON.Vector3(0, 0, 0), 1);
      
      // Ensure the sphere is in the debug spheres map 
      debugRenderer['debugSpheres'].set('test-sphere', sphere);
      
      // Reset mock counts to ensure we can tell the new call
      jest.clearAllMocks();
      
      // Then remove it
      debugRenderer.removeDebugSphere('test-sphere');
      
      // Verify the mesh was disposed
      expect(sphere.dispose).toHaveBeenCalled();
      expect(debugRenderer['debugSpheres'].has('test-sphere')).toBe(false);
    });
    
    test('should clear all visualizations', () => {
      // Create various visualizations
      const box = debugRenderer.showBox('test-box', new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(1, 1, 1));
      const sphere = debugRenderer.showSphere('test-sphere', new BABYLON.Vector3(0, 0, 0), 1);
      const vector = debugRenderer.showVector('test-vector', new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(1, 0, 0));
      
      // Reset mocks to ensure we can detect new calls
      jest.clearAllMocks();
      
      // Clear all
      debugRenderer.clear();
      
      // Verify each mesh was disposed
      expect(box.dispose).toHaveBeenCalled();
      expect(sphere.dispose).toHaveBeenCalled();
      expect(vector.dispose).toHaveBeenCalled();
      
      // Check that the maps are empty
      expect(debugRenderer['debugMeshes'].size).toBe(0);
      expect(debugRenderer['debugSpheres'].size).toBe(0);
      expect(debugRenderer['debugVectors'].size).toBe(0);
    });
  });
  
  describe('Enabling and Disabling', () => {
    test('should be disabled by default', () => {
      expect(debugRenderer.isEnabled()).toBe(false);
    });
    
    test('should be enabled after enable() is called', () => {
      debugRenderer.enable();
      expect(debugRenderer.isEnabled()).toBe(true);
    });
    
    test('should be disabled after disable() is called', () => {
      debugRenderer.enable();
      debugRenderer.disable();
      expect(debugRenderer.isEnabled()).toBe(false);
    });
    
    test('should toggle between enabled and disabled states', () => {
      expect(debugRenderer.isEnabled()).toBe(false);
      
      debugRenderer.toggle();
      expect(debugRenderer.isEnabled()).toBe(true);
      
      debugRenderer.toggle();
      expect(debugRenderer.isEnabled()).toBe(false);
    });
  });
  
  describe('Rendering and Updating', () => {
    test('should call update functions when update() is called', () => {
      const updateFunction1 = jest.fn();
      const updateFunction2 = jest.fn();
      
      debugRenderer.registerUpdatable(updateFunction1);
      debugRenderer.registerUpdatable(updateFunction2);
      
      // Enable debug renderer
      debugRenderer.enable();
      
      // Call update
      debugRenderer.update();
      
      expect(updateFunction1).toHaveBeenCalled();
      expect(updateFunction2).toHaveBeenCalled();
    });
    
    test('should render debug info', () => {
      // This is mostly a placeholder test since renderDebugInfo is a complex method
      // that would need a more sophisticated test setup to verify fully
      
      debugRenderer.renderDebugInfo();
      
      // Just verify it doesn't throw errors
      expect(true).toBe(true);
    });
  });
  
  describe('Cleanup', () => {
    test('should clean up resources when disposed', () => {
      // We don't need to access the private property directly
      // Just verify that the dispose method doesn't throw an error
      debugRenderer.dispose();
      
      expect(mockTransformNode.dispose).toHaveBeenCalled();
      expect(mockMaterial.dispose).toHaveBeenCalled();
      // The clear method was called internally by the dispose method
      expect(mockScene.onBeforeRenderObservable.clear).toHaveBeenCalled();
    });
  });
}); 