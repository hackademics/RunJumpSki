/**
 * @file tests/unit/core/debug/DebugRenderer.test.ts
 * @description Unit tests for the DebugRenderer class
 */

import * as BABYLON from 'babylonjs';
import { DebugRenderer, DebugRendererOptions } from '../../../../src/core/debug/DebugRenderer';

// Mock dependencies
jest.mock('babylonjs');

describe('DebugRenderer', () => {
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockMesh: jest.Mocked<BABYLON.Mesh>;
  let mockMaterial: jest.Mocked<BABYLON.StandardMaterial>;
  let mockTransformNode: jest.Mocked<BABYLON.TransformNode>;
  let mockLinesMesh: jest.Mocked<BABYLON.LinesMesh>;
  let debugRenderer: DebugRenderer;
  
  beforeEach(() => {
    // Setup Babylon.js mocks
    mockMesh = {
      name: 'mock-mesh',
      dispose: jest.fn(),
      setEnabled: jest.fn(),
      isVisible: true
    } as unknown as jest.Mocked<BABYLON.Mesh>;
    
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
      dispose: jest.fn()
    } as unknown as jest.Mocked<BABYLON.StandardMaterial>;
    
    mockTransformNode = {
      name: 'debug-root',
      dispose: jest.fn(),
      getChildMeshes: jest.fn().mockReturnValue([])
    } as unknown as jest.Mocked<BABYLON.TransformNode>;
    
    // Mock necessary Babylon.js static methods and constructors
    (BABYLON.StandardMaterial as unknown as jest.MockedClass<typeof BABYLON.StandardMaterial>).mockImplementation(() => mockMaterial);
    (BABYLON.TransformNode as unknown as jest.MockedClass<typeof BABYLON.TransformNode>).mockImplementation(() => mockTransformNode);
    (BABYLON.MeshBuilder.CreateBox as jest.Mock) = jest.fn().mockImplementation(() => mockMesh);
    (BABYLON.MeshBuilder.CreateSphere as jest.Mock) = jest.fn().mockImplementation(() => mockMesh);
    (BABYLON.MeshBuilder.CreateLines as jest.Mock) = jest.fn().mockImplementation(() => mockLinesMesh);
    (BABYLON.MeshBuilder.CreateCapsule as jest.Mock) = jest.fn().mockImplementation(() => mockMesh);
    
    // Create mock scene
    mockScene = {
      getEngine: jest.fn().mockReturnValue({
        getRenderWidth: jest.fn().mockReturnValue(1920),
        getRenderHeight: jest.fn().mockReturnValue(1080)
      })
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
      expect(BABYLON.TransformNode).toHaveBeenCalledWith('debug-root', mockScene);
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
      
      const result = debugRenderer.showCapsule('test-capsule', start, end, radius);
      
      expect(BABYLON.MeshBuilder.CreateCapsule).toHaveBeenCalled();
      expect(result).toBe(mockMesh);
    });
  });
  
  describe('Management Methods', () => {
    test('should register an updatable function', () => {
      const updateFunction = jest.fn();
      
      debugRenderer.registerUpdatable(updateFunction);
      
      // Call update to verify the function is called
      debugRenderer.update();
      
      expect(updateFunction).toHaveBeenCalled();
    });
    
    test('should remove a debug mesh', () => {
      // First create a mesh
      const mesh = debugRenderer.showBox('test-box', new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(1, 1, 1));
      
      // Then remove it
      debugRenderer.removeDebugMesh('test-box');
      
      expect(mesh.dispose).toHaveBeenCalled();
    });
    
    test('should remove a debug vector', () => {
      // First create a vector
      const vector = debugRenderer.showVector('test-vector', new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(1, 0, 0));
      
      // Then remove it
      debugRenderer.removeDebugVector('test-vector');
      
      expect(vector.dispose).toHaveBeenCalled();
    });
    
    test('should remove a debug sphere', () => {
      // First create a sphere
      const sphere = debugRenderer.showSphere('test-sphere', new BABYLON.Vector3(0, 0, 0), 1);
      
      // Then remove it
      debugRenderer.removeDebugSphere('test-sphere');
      
      expect(sphere.dispose).toHaveBeenCalled();
    });
    
    test('should clear all visualizations', () => {
      // Create various visualizations
      debugRenderer.showBox('test-box', new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(1, 1, 1));
      debugRenderer.showSphere('test-sphere', new BABYLON.Vector3(0, 0, 0), 1);
      debugRenderer.showVector('test-vector', new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(1, 0, 0));
      
      // Clear all
      debugRenderer.clear();
      
      // Should call dispose on transform node which cleans up child meshes
      expect(mockTransformNode.dispose).toHaveBeenCalled();
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
      debugRenderer.dispose();
      
      expect(mockTransformNode.dispose).toHaveBeenCalled();
      expect(mockMaterial.dispose).toHaveBeenCalled();
    });
  });
}); 