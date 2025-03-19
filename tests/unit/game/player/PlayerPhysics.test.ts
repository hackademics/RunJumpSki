/**
 * @file tests/unit/game/player/PlayerPhysics.test.ts
 * @description Tests for the PlayerPhysics implementation
 */

import * as BABYLON from 'babylonjs';
import { PlayerPhysics } from '../../../../src/game/player/PlayerPhysics';
import { PlayerInput, MovementMode } from '../../../../src/game/player/IPlayerPhysics';
import { TerrainSurfaceInfo } from '../../../../src/core/physics/ITerrainCollider';

// Mock TerrainSurfaceInfo
const createMockTerrainSurface = (slope: number = 0, friction: number = 0.1): TerrainSurfaceInfo => {
  return {
    exists: true,
    height: 0,
    normal: new BABYLON.Vector3(0, 1, 0),
    slope: slope,
    friction: friction,
    materialType: 'default'
  };
};

describe('PlayerPhysics', () => {
  let playerPhysics: PlayerPhysics;
  let defaultInput: PlayerInput;
  
  beforeEach(() => {
    playerPhysics = new PlayerPhysics();
    playerPhysics.initialize();
    
    defaultInput = {
      forward: 0,
      right: 0,
      jump: false,
      sprint: false,
      ski: false,
      jetpack: false,
      thrust: 0
    };
  });
  
  test('should initialize with default configuration', () => {
    expect(playerPhysics).toBeDefined();
    const state = playerPhysics.getState();
    expect(state.movementMode).toBe(MovementMode.WALKING);
    expect(state.isGrounded).toBe(false);
    expect(state.speed).toBe(0);
    expect(state.skiingState).toBeDefined();
    expect(state.jetpackState).toBeDefined();
  });
  
  test('should handle walking movement', () => {
    const input = { ...defaultInput, forward: 1 }; // Move forward
    const surfaceInfo = createMockTerrainSurface();
    const isGrounded = true;
    
    // Update for a few frames
    let velocity: BABYLON.Vector3 | null = null;
    for (let i = 0; i < 10; i++) {
      velocity = playerPhysics.update(0.016, input, surfaceInfo, isGrounded);
    }
    
    expect(velocity).not.toBeNull();
    expect(velocity!.z).toBeGreaterThan(0); // Should move forward
    expect(velocity!.length()).toBeGreaterThan(0);
    
    const state = playerPhysics.getState();
    expect(state.movementMode).toBe(MovementMode.WALKING);
  });
  
  test('should handle running movement when sprint is active', () => {
    const walkInput = { ...defaultInput, forward: 1 }; // Walking forward
    const runInput = { ...defaultInput, forward: 1, sprint: true }; // Running forward
    const surfaceInfo = createMockTerrainSurface();
    const isGrounded = true;
    
    // First walk for a few frames
    let walkVelocity: BABYLON.Vector3 | null = null;
    for (let i = 0; i < 10; i++) {
      walkVelocity = playerPhysics.update(0.016, walkInput, surfaceInfo, isGrounded);
    }
    
    const walkState = playerPhysics.getState();
    expect(walkState.movementMode).toBe(MovementMode.WALKING);
    
    // Then run for a few frames
    let runVelocity: BABYLON.Vector3 | null = null;
    for (let i = 0; i < 10; i++) {
      runVelocity = playerPhysics.update(0.016, runInput, surfaceInfo, isGrounded);
    }
    
    const runState = playerPhysics.getState();
    expect(runState.movementMode).toBe(MovementMode.RUNNING);
    
    // Running should be faster than walking
    expect(runVelocity!.length()).toBeGreaterThan(walkVelocity!.length());
  });
  
  test('should handle jumping', () => {
    const input = { ...defaultInput, jump: true };
    const surfaceInfo = createMockTerrainSurface();
    const isGrounded = true;
    
    // Update once with jump input
    const velocity = playerPhysics.update(0.016, input, surfaceInfo, isGrounded);
    
    // Should have upward velocity
    expect(velocity.y).toBeGreaterThan(0);
  });
  
  test('should transition to skiing mode when ski input is active', () => {
    const input = { ...defaultInput, ski: true };
    const surfaceInfo = createMockTerrainSurface();
    const isGrounded = true;
    
    // Update for a few frames
    for (let i = 0; i < 5; i++) {
      playerPhysics.update(0.016, input, surfaceInfo, isGrounded);
    }
    
    const state = playerPhysics.getState();
    expect(state.movementMode).toBe(MovementMode.SKIING);
    expect(state.skiingState.isSkiing).toBe(true);
  });
  
  test('should transition to jetpack mode when jetpack input is active', () => {
    const input = { ...defaultInput, jetpack: true };
    const surfaceInfo = createMockTerrainSurface();
    const isGrounded = false; // In air
    
    // Update for a few frames
    for (let i = 0; i < 5; i++) {
      playerPhysics.update(0.016, input, surfaceInfo, isGrounded);
    }
    
    const state = playerPhysics.getState();
    expect(state.movementMode).toBe(MovementMode.JETPACK);
    expect(state.jetpackState.isActive).toBe(true);
  });
  
  test('should apply gravity when in air', () => {
    const input = defaultInput; // No special input
    const surfaceInfo = createMockTerrainSurface();
    const isGrounded = false; // In air
    
    // Start with zero velocity
    let velocity = new BABYLON.Vector3(0, 0, 0);
    
    // Update for a few frames
    for (let i = 0; i < 10; i++) {
      velocity = playerPhysics.update(0.016, input, surfaceInfo, isGrounded);
    }
    
    // Should accelerate downward due to gravity
    expect(velocity.y).toBeLessThan(0);
    
    const state = playerPhysics.getState();
    expect(state.movementMode).toBe(MovementMode.AIR);
  });
  
  test('should transition to sliding mode on steep slopes', () => {
    const input = defaultInput; // No special input
    
    // Create a steep slope (~30 degrees)
    const steepSlope = 0.6;
    const surfaceInfo = createMockTerrainSurface(steepSlope);
    
    surfaceInfo.normal = new BABYLON.Vector3(
      Math.sin(steepSlope),
      Math.cos(steepSlope),
      0
    ).normalize();
    
    const isGrounded = true;
    
    // Update for a few frames
    for (let i = 0; i < 5; i++) {
      playerPhysics.update(0.016, input, surfaceInfo, isGrounded);
    }
    
    const state = playerPhysics.getState();
    expect(state.movementMode).toBe(MovementMode.SLIDING);
  });
  
  test('should accelerate downhill when sliding', () => {
    const input = defaultInput;
    
    // Create a steep slope (~30 degrees)
    const steepSlope = 0.6;
    const surfaceInfo = createMockTerrainSurface(steepSlope);
    
    surfaceInfo.normal = new BABYLON.Vector3(
      Math.sin(steepSlope),
      Math.cos(steepSlope),
      0
    ).normalize();
    
    const isGrounded = true;
    
    // Initial velocity is zero
    let velocity = new BABYLON.Vector3(0, 0, 0);
    
    // Update for a few frames
    for (let i = 0; i < 20; i++) {
      velocity = playerPhysics.update(0.016, input, surfaceInfo, isGrounded);
    }
    
    // Should accelerate downhill (negative X direction in this test)
    expect(velocity.x).toBeLessThan(0);
    expect(velocity.length()).toBeGreaterThan(0);
    
    const state = playerPhysics.getState();
    expect(state.movementMode).toBe(MovementMode.SLIDING);
  });
  
  test('should enforce maximum speeds for each movement mode', () => {
    const walkInput = { ...defaultInput, forward: 1 };
    const runInput = { ...defaultInput, forward: 1, sprint: true };
    const skiInput = { ...defaultInput, forward: 1, ski: true };
    const jetpackInput = { ...defaultInput, forward: 1, jetpack: true };
    
    const surfaceInfo = createMockTerrainSurface();
    const isGrounded = true;
    
    // Test walking speed
    let velocity = new BABYLON.Vector3(0, 0, 0);
    for (let i = 0; i < 100; i++) {
      velocity = playerPhysics.update(0.016, walkInput, surfaceInfo, isGrounded);
    }
    expect(velocity.length()).toBeLessThanOrEqual(10); // Approximate max walk speed
    
    // Reset
    playerPhysics.reset();
    
    // Test running speed
    velocity = new BABYLON.Vector3(0, 0, 0);
    for (let i = 0; i < 100; i++) {
      velocity = playerPhysics.update(0.016, runInput, surfaceInfo, isGrounded);
    }
    expect(velocity.length()).toBeLessThanOrEqual(20); // Approximate max run speed
    
    // Reset
    playerPhysics.reset();
    
    // Create a steep slope for skiing
    const steepSlope = 0.5;
    const skiSurface = createMockTerrainSurface(steepSlope);
    skiSurface.normal = new BABYLON.Vector3(
      Math.sin(steepSlope),
      Math.cos(steepSlope),
      0
    ).normalize();
    
    // Test skiing speed
    velocity = new BABYLON.Vector3(0, 0, 0);
    for (let i = 0; i < 100; i++) {
      velocity = playerPhysics.update(0.016, skiInput, skiSurface, isGrounded);
    }
    expect(velocity.length()).toBeLessThanOrEqual(35); // Approximate max ski speed
    
    // Reset
    playerPhysics.reset();
    
    // Test jetpack speed
    velocity = new BABYLON.Vector3(0, 0, 0);
    for (let i = 0; i < 100; i++) {
      velocity = playerPhysics.update(0.016, jetpackInput, surfaceInfo, false);
    }
    
    // Split into horizontal and vertical components
    const horizontalVelocity = new BABYLON.Vector3(velocity.x, 0, velocity.z);
    expect(horizontalVelocity.length()).toBeLessThanOrEqual(30); // Approximate max jetpack horizontal speed
    expect(velocity.y).toBeLessThanOrEqual(20); // Approximate max jetpack vertical speed
  });
  
  test('should apply external forces', () => {
    const input = defaultInput;
    const surfaceInfo = createMockTerrainSurface();
    const isGrounded = true;
    
    // Initial update
    let velocity = playerPhysics.update(0.016, input, surfaceInfo, isGrounded);
    expect(velocity.length()).toBe(0); // No movement initially
    
    // Apply an impulse force
    const impulseForce = new BABYLON.Vector3(10, 5, 0);
    playerPhysics.applyForce(impulseForce, true);
    
    // Update after applying force
    velocity = playerPhysics.update(0.016, input, surfaceInfo, isGrounded);
    
    // Velocity should reflect the applied force
    expect(velocity.x).toBeGreaterThan(0);
    expect(velocity.y).toBeGreaterThan(0);
  });
  
  test('should reset all physics properties', () => {
    const input = { ...defaultInput, forward: 1, sprint: true };
    const surfaceInfo = createMockTerrainSurface();
    const isGrounded = true;
    
    // Change state with updates
    for (let i = 0; i < 10; i++) {
      playerPhysics.update(0.016, input, surfaceInfo, isGrounded);
    }
    
    // Apply some force
    playerPhysics.applyForce(new BABYLON.Vector3(5, 0, 5), true);
    
    // Verify state changed
    const stateBeforeReset = playerPhysics.getState();
    expect(stateBeforeReset.speed).toBeGreaterThan(0);
    expect(stateBeforeReset.movementMode).toBe(MovementMode.RUNNING);
    
    // Reset
    playerPhysics.reset();
    
    // Verify reset to initial state
    const stateAfterReset = playerPhysics.getState();
    expect(stateAfterReset.speed).toBe(0);
    expect(stateAfterReset.movementMode).toBe(MovementMode.WALKING);
    expect(stateAfterReset.velocity.lengthSquared()).toBe(0);
  });
});
