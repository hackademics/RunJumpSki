/**
 * @file tests/unit/core/debug/visual/CollisionVisualizer.test.ts
 * @description Unit tests for the CollisionVisualizer class
 */

import * as BABYLON from 'babylonjs';
import { CollisionVisualizer, CollisionVisualizerOptions } from '../../../../../src/core/debug/visual/CollisionVisualizer';
import { DebugRenderer } from '../../../../../src/core/debug/DebugRenderer';
import { ICollisionSystem, CollisionInfo } from '../../../../../src/core/physics/ICollisionSystem';
import { Event } from '../../../../../src/core/events/Event';
import { CollisionEventTypes, CollisionEvent, CollisionEventData } from '../../../../../src/core/events/CollisionEvents';

// Mock dependencies
jest.mock('../../../../../src/core/debug/DebugRenderer');
jest.mock('babylonjs');

describe('CollisionVisualizer', () => {
  let mockDebugRenderer: jest.Mocked<DebugRenderer>;
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockCollisionSystem: jest.Mocked<ICollisionSystem>;
  let mockEventBus: { on: jest.Mock; off: jest.Mock };
  let collisionVisualizer: CollisionVisualizer;
  
  beforeEach(() => {
    // Setup mocks
    mockDebugRenderer = {
      showCollisionPoint: jest.fn().mockReturnValue({}),
      showVector: jest.fn().mockReturnValue({}),
      showBox: jest.fn().mockReturnValue({}),
      showCapsule: jest.fn().mockReturnValue({}),
      showSphere: jest.fn().mockReturnValue({}),
      removeDebugMesh: jest.fn(),
      removeDebugVector: jest.fn(),
      removeDebugSphere: jest.fn(),
      clear: jest.fn()
    } as unknown as jest.Mocked<DebugRenderer>;
    
    mockScene = {
      onBeforeRenderObservable: {
        add: jest.fn(),
        clear: jest.fn()
      }
    } as unknown as jest.Mocked<BABYLON.Scene>;
    
    mockCollisionSystem = {} as jest.Mocked<ICollisionSystem>;
    
    mockEventBus = {
      on: jest.fn(),
      off: jest.fn()
    };
    
    // Create the visualizer with mocked dependencies
    collisionVisualizer = new CollisionVisualizer(
      mockDebugRenderer,
      mockScene as unknown as BABYLON.Scene,
      mockCollisionSystem,
      mockEventBus
    );
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Initialization', () => {
    test('should initialize with default options', () => {
      expect(collisionVisualizer).toBeDefined();
      expect(mockScene.onBeforeRenderObservable.add).toHaveBeenCalled();
    });
    
    test('should initialize with custom options', () => {
      const customOptions: Partial<CollisionVisualizerOptions> = {
        showCollisionPoints: false,
        showCollisionNormals: false,
        collisionPointSize: 0.5
      };
      
      const customVisualizer = new CollisionVisualizer(
        mockDebugRenderer,
        mockScene as unknown as BABYLON.Scene,
        mockCollisionSystem,
        mockEventBus,
        customOptions
      );
      
      expect(customVisualizer).toBeDefined();
    });
  });
  
  describe('Enabling and Disabling', () => {
    test('should register event listeners when enabled', () => {
      collisionVisualizer.enable();
      
      expect(mockEventBus.on).toHaveBeenCalledWith(
        CollisionEventTypes.COLLISION_START,
        expect.any(Function)
      );
      
      expect(collisionVisualizer.isEnabled()).toBe(true);
    });
    
    test('should not register event listeners twice when enabled multiple times', () => {
      collisionVisualizer.enable();
      collisionVisualizer.enable(); // Second call should not add another listener
      
      expect(mockEventBus.on).toHaveBeenCalledTimes(1);
    });
    
    test('should clear visualizations and be disabled after disable()', () => {
      collisionVisualizer.enable();
      collisionVisualizer.disable();
      
      expect(mockDebugRenderer.clear).toHaveBeenCalled();
      expect(collisionVisualizer.isEnabled()).toBe(false);
    });
    
    test('should toggle between enabled and disabled states', () => {
      expect(collisionVisualizer.isEnabled()).toBe(false);
      
      collisionVisualizer.toggle();
      expect(collisionVisualizer.isEnabled()).toBe(true);
      
      collisionVisualizer.toggle();
      expect(collisionVisualizer.isEnabled()).toBe(false);
    });
  });
  
  describe('Collision Event Handling', () => {
    test('should visualize collision data when collision event is received', () => {
      // Enable the visualizer
      collisionVisualizer.enable();
      
      // Extract the collision handler callback
      const collisionHandler = mockEventBus.on.mock.calls[0][1];
      
      // Create mock collision event
      const mockCollisionEvent = {
        type: CollisionEventTypes.COLLISION_START,
        data: {
          entityId: 'test-entity',
          impostor: {
            object: {
              getBoundingInfo: () => ({
                boundingBox: {
                  minimumWorld: new BABYLON.Vector3(0, 0, 0),
                  maximumWorld: new BABYLON.Vector3(1, 1, 1)
                }
              })
            }
          },
          collisionPoint: new BABYLON.Vector3(0.5, 0.5, 0.5),
          collisionNormal: new BABYLON.Vector3(0, 1, 0)
        }
      } as unknown as CollisionEvent;
      
      // Call the collision handler with the mock event
      collisionHandler(mockCollisionEvent);
      
      // Verify that visualization methods were called
      expect(mockDebugRenderer.showCollisionPoint).toHaveBeenCalled();
      expect(mockDebugRenderer.showVector).toHaveBeenCalled();
    });
    
    test('should not visualize when disabled', () => {
      // Visualizer is disabled by default
      
      // Extract the collision handler callback (after enabling and then disabling)
      collisionVisualizer.enable();
      const collisionHandler = mockEventBus.on.mock.calls[0][1];
      collisionVisualizer.disable();
      
      // Clear the mock calls
      mockDebugRenderer.showCollisionPoint.mockClear();
      mockDebugRenderer.showVector.mockClear();
      
      // Create mock collision event
      const mockCollisionEvent = {
        type: CollisionEventTypes.COLLISION_START,
        data: {
          entityId: 'test-entity',
          impostor: {},
          collisionPoint: new BABYLON.Vector3(0.5, 0.5, 0.5),
          collisionNormal: new BABYLON.Vector3(0, 1, 0)
        }
      } as unknown as CollisionEvent;
      
      // Call the collision handler with the mock event
      collisionHandler(mockCollisionEvent);
      
      // Verify that visualization methods were not called
      expect(mockDebugRenderer.showCollisionPoint).not.toHaveBeenCalled();
      expect(mockDebugRenderer.showVector).not.toHaveBeenCalled();
    });
  });
  
  describe('Manual Visualization', () => {
    test('should visualize collision info when manually called', () => {
      collisionVisualizer.enable();
      
      const mockCollisionInfo: CollisionInfo = {
        point: new BABYLON.Vector3(1, 1, 1),
        normal: new BABYLON.Vector3(0, 1, 0),
        initiator: {
          object: {
            getBoundingInfo: () => ({
              boundingBox: {
                minimumWorld: new BABYLON.Vector3(0, 0, 0),
                maximumWorld: new BABYLON.Vector3(1, 1, 1)
              }
            })
          }
        },
        collider: {
          object: {
            getBoundingInfo: () => ({
              boundingBox: {
                minimumWorld: new BABYLON.Vector3(0, 0, 0),
                maximumWorld: new BABYLON.Vector3(1, 1, 1)
              }
            })
          }
        }
      } as unknown as CollisionInfo;
      
      collisionVisualizer.visualizeCollision(mockCollisionInfo);
      
      expect(mockDebugRenderer.showCollisionPoint).toHaveBeenCalled();
      expect(mockDebugRenderer.showVector).toHaveBeenCalled();
    });
    
    test('should visualize capsule collider', () => {
      collisionVisualizer.enable();
      
      collisionVisualizer.visualizeCapsuleCollider(
        new BABYLON.Vector3(0, 0, 0),
        2.0,
        0.5,
        new BABYLON.Vector3(0, 1, 0),
        'test-capsule'
      );
      
      expect(mockDebugRenderer.showCapsule).toHaveBeenCalled();
    });
    
    test('should visualize sphere collider', () => {
      collisionVisualizer.enable();
      
      collisionVisualizer.visualizeSphereCollider(
        new BABYLON.Vector3(0, 0, 0),
        1.0,
        'test-sphere'
      );
      
      expect(mockDebugRenderer.showSphere).toHaveBeenCalled();
    });
    
    test('should visualize box collider', () => {
      collisionVisualizer.enable();
      
      collisionVisualizer.visualizeBoxCollider(
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(1, 1, 1),
        'test-box'
      );
      
      expect(mockDebugRenderer.showBox).toHaveBeenCalled();
    });
    
    test('should not visualize when disabled', () => {
      // Visualizer is disabled by default
      mockDebugRenderer.showCapsule.mockClear();
      
      collisionVisualizer.visualizeCapsuleCollider(
        new BABYLON.Vector3(0, 0, 0),
        2.0,
        0.5,
        new BABYLON.Vector3(0, 1, 0),
        'test-capsule'
      );
      
      expect(mockDebugRenderer.showCapsule).not.toHaveBeenCalled();
    });
  });
  
  describe('Cleanup and Disposal', () => {
    test('should clean up resources when disposed', () => {
      collisionVisualizer.enable();
      collisionVisualizer.dispose();
      
      expect(mockScene.onBeforeRenderObservable.clear).toHaveBeenCalled();
      expect(mockEventBus.off).toHaveBeenCalled();
      expect(mockDebugRenderer.clear).toHaveBeenCalled();
    });
  });
}); 