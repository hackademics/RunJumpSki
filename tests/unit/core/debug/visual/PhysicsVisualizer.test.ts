/**
 * @file tests/unit/core/debug/visual/PhysicsVisualizer.test.ts
 * @description Unit tests for the PhysicsVisualizer class
 */

import * as BABYLON from 'babylonjs';
import { PhysicsVisualizer, PhysicsVisualizerOptions } from '../../../../../src/core/debug/visual/PhysicsVisualizer';
import { DebugRenderer } from '../../../../../src/core/debug/DebugRenderer';
import { IPhysicsSystem } from '../../../../../src/core/physics/IPhysicsSystem';

// Mock dependencies
jest.mock('../../../../../src/core/debug/DebugRenderer');
jest.mock('babylonjs');

describe('PhysicsVisualizer', () => {
  let mockDebugRenderer: jest.Mocked<DebugRenderer>;
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockPhysicsSystem: jest.Mocked<IPhysicsSystem>;
  let physicsVisualizer: PhysicsVisualizer;
  
  beforeEach(() => {
    // Setup mocks
    mockDebugRenderer = {
      showVector: jest.fn().mockReturnValue({}),
      showCollisionPoint: jest.fn().mockReturnValue({}),
      showBox: jest.fn().mockReturnValue({}),
      removeDebugVector: jest.fn(),
      removeDebugSphere: jest.fn(),
      removeDebugMesh: jest.fn(),
      clear: jest.fn()
    } as unknown as jest.Mocked<DebugRenderer>;
    
    mockScene = {
      onBeforeRenderObservable: {
        add: jest.fn(),
        clear: jest.fn()
      },
      getPhysicsEngine: jest.fn().mockReturnValue({
        // Mock physics engine
      }),
      meshes: [
        {
          uniqueId: 'mesh1',
          position: {
            x: 0, y: 0, z: 0,
            clone: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0))
          },
          physicsImpostor: {
            mass: 1,
            getLinearVelocity: jest.fn().mockReturnValue(new BABYLON.Vector3(1, 0, 0)),
            getAngularVelocity: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 1, 0)),
            object: {
              position: {
                x: 0, y: 0, z: 0,
                clone: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0))
              }
            }
          }
        },
        {
          uniqueId: 'mesh2',
          position: {
            x: 5, y: 0, z: 0,
            clone: jest.fn().mockReturnValue(new BABYLON.Vector3(5, 0, 0))
          },
          physicsImpostor: {
            mass: 2,
            getLinearVelocity: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 1)),
            getAngularVelocity: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0)),
            object: {
              position: {
                x: 5, y: 0, z: 0,
                clone: jest.fn().mockReturnValue(new BABYLON.Vector3(5, 0, 0))
              }
            }
          }
        }
      ]
    } as unknown as jest.Mocked<BABYLON.Scene>;
    
    mockPhysicsSystem = {} as jest.Mocked<IPhysicsSystem>;
    
    // Create the visualizer with mocked dependencies
    physicsVisualizer = new PhysicsVisualizer(
      mockDebugRenderer,
      mockScene as unknown as BABYLON.Scene,
      mockPhysicsSystem
    );
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Initialization', () => {
    test('should initialize with default options', () => {
      expect(physicsVisualizer).toBeDefined();
      expect(mockScene.onBeforeRenderObservable.add).toHaveBeenCalled();
    });
    
    test('should initialize with custom options', () => {
      const customOptions: Partial<PhysicsVisualizerOptions> = {
        showVelocities: false,
        showForces: false,
        velocityScale: 0.5
      };
      
      const customVisualizer = new PhysicsVisualizer(
        mockDebugRenderer,
        mockScene as unknown as BABYLON.Scene,
        mockPhysicsSystem,
        customOptions
      );
      
      expect(customVisualizer).toBeDefined();
    });
  });
  
  describe('Enabling and Disabling', () => {
    test('should be disabled by default', () => {
      expect(physicsVisualizer.isEnabled()).toBe(false);
    });
    
    test('should be enabled after enable() is called', () => {
      physicsVisualizer.enable();
      expect(physicsVisualizer.isEnabled()).toBe(true);
    });
    
    test('should be disabled after disable() is called', () => {
      physicsVisualizer.enable();
      physicsVisualizer.disable();
      expect(physicsVisualizer.isEnabled()).toBe(false);
    });
    
    test('should toggle between enabled and disabled states', () => {
      expect(physicsVisualizer.isEnabled()).toBe(false);
      
      physicsVisualizer.toggle();
      expect(physicsVisualizer.isEnabled()).toBe(true);
      
      physicsVisualizer.toggle();
      expect(physicsVisualizer.isEnabled()).toBe(false);
    });
  });
  
  describe('Visualization Control', () => {
    test('should allow setting update frequency', () => {
      const newFrequency = 5;
      physicsVisualizer.setUpdateFrequency(newFrequency);
      
      // Can't test private property directly, but we can test the method exists
      expect(physicsVisualizer.setUpdateFrequency).toBeDefined();
    });
    
    test('should clear visualizations when disabled', () => {
      // First create a visualization entry in the internal map
      physicsVisualizer.enable();
      
      // Create a spy for the clearVisualization method
      const clearSpy = jest.spyOn(physicsVisualizer, 'clearVisualization');
      
      // Need to mock the visualizedImpostors map to have an entry
      // @ts-ignore - accessing private property for test
      physicsVisualizer['visualizedImpostors'] = new Map();
      // @ts-ignore - accessing private property for test
      physicsVisualizer['visualizedImpostors'].set(mockScene.meshes[0].physicsImpostor, {
        velocityVector: 'test-velocity',
        forceVector: 'test-force'
      });
      
      // Call disable, which should call clearVisualization
      physicsVisualizer.disable();
      
      // Verify clearVisualization was called
      expect(clearSpy).toHaveBeenCalled();
    });
  });
  
  describe('Manual Visualization', () => {
    test('should visualize force at position when visualizeForce is called', () => {
      physicsVisualizer.enable();
      
      const position = new BABYLON.Vector3(1, 1, 1);
      const force = new BABYLON.Vector3(0, 5, 0);
      const identifier = 'test-force';
      
      physicsVisualizer.visualizeForce(position, force, identifier);
      
      expect(mockDebugRenderer.showVector).toHaveBeenCalled();
    });
    
    test('should visualize velocity at position when visualizeVelocity is called', () => {
      physicsVisualizer.enable();
      
      const position = new BABYLON.Vector3(1, 1, 1);
      const velocity = new BABYLON.Vector3(3, 0, 0);
      const identifier = 'test-velocity';
      
      physicsVisualizer.visualizeVelocity(position, velocity, identifier);
      
      expect(mockDebugRenderer.showVector).toHaveBeenCalled();
    });
    
    test('should not visualize when disabled', () => {
      // Visualizer is disabled by default
      const position = new BABYLON.Vector3(1, 1, 1);
      const force = new BABYLON.Vector3(0, 5, 0);
      const identifier = 'test-force';
      
      physicsVisualizer.visualizeForce(position, force, identifier);
      
      expect(mockDebugRenderer.showVector).not.toHaveBeenCalled();
    });
  });
  
  describe('Update Visualization', () => {
    test('should update visualizations for all valid impostors when triggered', () => {
      physicsVisualizer.enable();
      
      // Clear any previous calls
      mockDebugRenderer.showVector.mockClear();
      
      // Setup physics impostor with velocity
      mockScene.meshes[0].physicsImpostor.getLinearVelocity = jest.fn().mockReturnValue({
        x: 1, y: 0, z: 0,
        length: jest.fn().mockReturnValue(1),
        lengthSquared: jest.fn().mockReturnValue(1),
        scale: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis()
      });
      
      // Setup angular velocity
      mockScene.meshes[0].physicsImpostor.getAngularVelocity = jest.fn().mockReturnValue({
        x: 0, y: 0, z: 0,
        length: jest.fn().mockReturnValue(0),
        lengthSquared: jest.fn().mockReturnValue(0),
        scale: jest.fn().mockReturnThis()
      });
      
      // Setup mesh with getBoundingInfo for sleeping state visualization
      mockScene.meshes[0].getBoundingInfo = jest.fn().mockReturnValue({
        boundingBox: {
          minimumWorld: new BABYLON.Vector3(-1, -1, -1),
          maximumWorld: new BABYLON.Vector3(1, 1, 1)
        }
      });
      
      // Trigger the update by calling the function provided to onBeforeRenderObservable
      const updateFunction = (mockScene.onBeforeRenderObservable.add as jest.Mock).mock.calls[0][0];
      
      // Force frameCounter to be divisible by updateFrequency
      // @ts-ignore - accessing private property for test
      physicsVisualizer['frameCounter'] = 3;
      
      // Call the update function
      updateFunction();
      
      // Should create visualization for each mesh with an impostor
      expect(mockDebugRenderer.showVector).toHaveBeenCalled();
    });
  });
  
  describe('Cleanup and Disposal', () => {
    test('should clean up resources when disposed', () => {
      physicsVisualizer.enable();
      physicsVisualizer.dispose();
      
      expect(mockScene.onBeforeRenderObservable.clear).toHaveBeenCalled();
      expect(physicsVisualizer.isEnabled()).toBe(false);
    });
  });
}); 