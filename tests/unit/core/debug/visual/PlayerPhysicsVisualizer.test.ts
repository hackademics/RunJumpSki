/**
 * @file tests/unit/core/debug/visual/PlayerPhysicsVisualizer.test.ts
 * @description Unit tests for the PlayerPhysicsVisualizer class
 */

import * as BABYLON from 'babylonjs';
import { 
  PlayerPhysicsVisualizer, 
  PlayerPhysicsVisualizerOptions,
  PlayerPhysicsData,
  PlayerMovementState 
} from '../../../../../src/core/debug/visual/PlayerPhysicsVisualizer';
import { DebugRenderer } from '../../../../../src/core/debug/DebugRenderer';

// Mock dependencies
jest.mock('../../../../../src/core/debug/DebugRenderer');
jest.mock('babylonjs');

// Add implementation for Vector3 methods
BABYLON.Vector3.prototype.add = jest.fn().mockImplementation(function(other) {
  return new BABYLON.Vector3(
    this.x + other.x,
    this.y + other.y,
    this.z + other.z
  );
});

BABYLON.Vector3.prototype.scale = jest.fn().mockImplementation(function(scalar) {
  return new BABYLON.Vector3(
    this.x * scalar,
    this.y * scalar,
    this.z * scalar
  );
});

BABYLON.Vector3.prototype.length = jest.fn().mockImplementation(function() {
  return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
});

BABYLON.Vector3.prototype.clone = jest.fn().mockImplementation(function() {
  return new BABYLON.Vector3(this.x, this.y, this.z);
});

BABYLON.Vector3.prototype.normalize = jest.fn().mockImplementation(function() {
  const len = this.length();
  if (len === 0) {
    return new BABYLON.Vector3(0, 0, 0);
  }
  return new BABYLON.Vector3(
    this.x / len,
    this.y / len,
    this.z / len
  );
});

describe('PlayerPhysicsVisualizer', () => {
  let mockDebugRenderer: jest.Mocked<DebugRenderer>;
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let playerPhysicsVisualizer: PlayerPhysicsVisualizer;
  let testPlayerData: PlayerPhysicsData;
  
  beforeEach(() => {
    // Setup mocks
    mockDebugRenderer = {
      showCapsule: jest.fn().mockReturnValue({}),
      showVector: jest.fn().mockReturnValue({}),
      showCollisionPoint: jest.fn().mockReturnValue({}),
      removeDebugMesh: jest.fn(),
      removeDebugVector: jest.fn(),
      removeDebugSphere: jest.fn(),
      clear: jest.fn()
    } as unknown as jest.Mocked<DebugRenderer>;
    
    mockScene = {
      onBeforeRenderObservable: {
        clear: jest.fn()
      }
    } as unknown as jest.Mocked<BABYLON.Scene>;
    
    // Create sample player data
    testPlayerData = {
      position: new BABYLON.Vector3(0, 1, 0),
      velocity: new BABYLON.Vector3(1, 0, 0),
      direction: new BABYLON.Vector3(1, 0, 0),
      up: new BABYLON.Vector3(0, 1, 0),
      grounded: true,
      groundNormal: new BABYLON.Vector3(0, 1, 0),
      movementState: PlayerMovementState.RUNNING,
      mass: 80,
      height: 1.8,
      radius: 0.4
    };
    
    // Create the visualizer with mocked dependencies
    playerPhysicsVisualizer = new PlayerPhysicsVisualizer(
      mockDebugRenderer,
      mockScene as unknown as BABYLON.Scene
    );
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Initialization', () => {
    test('should initialize with default options', () => {
      expect(playerPhysicsVisualizer).toBeDefined();
    });
    
    test('should initialize with custom options', () => {
      const customOptions: Partial<PlayerPhysicsVisualizerOptions> = {
        showVelocity: false,
        showGroundNormal: false,
        showMovementState: false,
        velocityScale: 0.5
      };
      
      const customVisualizer = new PlayerPhysicsVisualizer(
        mockDebugRenderer,
        mockScene as unknown as BABYLON.Scene,
        customOptions
      );
      
      expect(customVisualizer).toBeDefined();
    });
  });
  
  describe('Player Data Updates', () => {
    test('should update player data', () => {
      playerPhysicsVisualizer.updatePlayerData(testPlayerData);
      
      // Enable and check if visualization happens
      playerPhysicsVisualizer.enable();
      
      // Should visualize player body
      expect(mockDebugRenderer.showCapsule).toHaveBeenCalled();
    });
    
    test('should not visualize without player data', () => {
      // Enable without setting player data
      playerPhysicsVisualizer.enable();
      
      // No visualization should happen without player data
      expect(mockDebugRenderer.showCapsule).not.toHaveBeenCalled();
    });
  });
  
  describe('Enabling and Disabling', () => {
    beforeEach(() => {
      playerPhysicsVisualizer.updatePlayerData(testPlayerData);
    });
    
    test('should be disabled by default', () => {
      expect(playerPhysicsVisualizer.isEnabled()).toBe(false);
    });
    
    test('should be enabled after enable() is called', () => {
      playerPhysicsVisualizer.enable();
      expect(playerPhysicsVisualizer.isEnabled()).toBe(true);
    });
    
    test('should create visualizations when enabled', () => {
      playerPhysicsVisualizer.enable();
      
      // Should create visualizations for player
      expect(mockDebugRenderer.showCapsule).toHaveBeenCalled();
      expect(mockDebugRenderer.showVector).toHaveBeenCalled(); // For velocity
    });
    
    test('should be disabled after disable() is called', () => {
      playerPhysicsVisualizer.enable();
      playerPhysicsVisualizer.disable();
      expect(playerPhysicsVisualizer.isEnabled()).toBe(false);
    });
    
    test('should clear visualizations when disabled', () => {
      playerPhysicsVisualizer.enable();
      
      // Clear mocks to check if they're called during disable
      mockDebugRenderer.removeDebugMesh.mockClear();
      mockDebugRenderer.removeDebugVector.mockClear();
      
      playerPhysicsVisualizer.disable();
      
      // Should clean up visualizations
      expect(mockDebugRenderer.removeDebugMesh).toHaveBeenCalled();
      expect(mockDebugRenderer.removeDebugVector).toHaveBeenCalled();
    });
    
    test('should toggle between enabled and disabled states', () => {
      expect(playerPhysicsVisualizer.isEnabled()).toBe(false);
      
      playerPhysicsVisualizer.toggle();
      expect(playerPhysicsVisualizer.isEnabled()).toBe(true);
      
      playerPhysicsVisualizer.toggle();
      expect(playerPhysicsVisualizer.isEnabled()).toBe(false);
    });
  });
  
  describe('Visualization Features', () => {
    beforeEach(() => {
      playerPhysicsVisualizer.updatePlayerData(testPlayerData);
      playerPhysicsVisualizer.enable();
      
      // Clear mock calls to test specific visualizations
      mockDebugRenderer.showVector.mockClear();
    });
    
    test('should visualize velocity vector', () => {
      // Update visualization
      playerPhysicsVisualizer.updatePlayerData({
        ...testPlayerData,
        velocity: new BABYLON.Vector3(5, 0, 0) // Stronger velocity
      });
      
      // Should visualize velocity
      expect(mockDebugRenderer.showVector).toHaveBeenCalled();
    });
    
    test('should visualize ground normal when player is grounded', () => {
      // Update visualization
      playerPhysicsVisualizer.updatePlayerData({
        ...testPlayerData,
        grounded: true,
        groundNormal: new BABYLON.Vector3(0, 1, 0)
      });
      
      // Should visualize ground normal
      expect(mockDebugRenderer.showVector).toHaveBeenCalled();
    });
    
    test('should visualize jetpack thrust when in jetpack state', () => {
      // Update visualization
      playerPhysicsVisualizer.updatePlayerData({
        ...testPlayerData,
        movementState: PlayerMovementState.JETPACK,
        jetpackThrust: new BABYLON.Vector3(0, 5, 0)
      });
      
      // Should visualize jetpack thrust
      expect(mockDebugRenderer.showVector).toHaveBeenCalled();
    });
    
    test('should visualize skiing friction when in skiing state', () => {
      // Update visualization
      playerPhysicsVisualizer.updatePlayerData({
        ...testPlayerData,
        movementState: PlayerMovementState.SKIING,
        skiingFriction: new BABYLON.Vector3(-1, 0, 0)
      });
      
      // Should visualize skiing friction
      expect(mockDebugRenderer.showVector).toHaveBeenCalled();
    });
    
    test('should visualize movement state', () => {
      // Should visualize movement state
      expect(mockDebugRenderer.showCollisionPoint).toHaveBeenCalled();
    });
  });
  
  describe('Trajectory Visualization', () => {
    beforeEach(() => {
      playerPhysicsVisualizer.updatePlayerData({
        ...testPlayerData,
        velocity: new BABYLON.Vector3(10, 5, 0) // Strong initial velocity for trajectory
      });
      
      // Set custom options to enable trajectory
      const customOptions: Partial<PlayerPhysicsVisualizerOptions> = {
        showTrajectory: true,
        trajectoryPoints: 10,
        trajectoryTimeStep: 0.1,
        trajectoryTime: 1.0
      };
      
      playerPhysicsVisualizer = new PlayerPhysicsVisualizer(
        mockDebugRenderer,
        mockScene as unknown as BABYLON.Scene,
        customOptions
      );
      
      playerPhysicsVisualizer.updatePlayerData(testPlayerData);
      playerPhysicsVisualizer.enable();
    });
    
    test('should visualize trajectory prediction', () => {
      // Should create points for trajectory
      expect(mockDebugRenderer.showCollisionPoint).toHaveBeenCalled();
      // Should create lines between points
      expect(mockDebugRenderer.showVector).toHaveBeenCalled();
    });
  });
  
  describe('Cleanup and Disposal', () => {
    test('should clean up resources when disposed', () => {
      playerPhysicsVisualizer.updatePlayerData(testPlayerData);
      playerPhysicsVisualizer.enable();
      playerPhysicsVisualizer.dispose();
      
      expect(mockScene.onBeforeRenderObservable.clear).toHaveBeenCalled();
      expect(playerPhysicsVisualizer.isEnabled()).toBe(false);
    });
  });
}); 