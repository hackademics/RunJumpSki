/**
 * @file tests/unit/game/player/SkiingPhysics.test.ts
 * @description Tests for the SkiingPhysics implementation
 */

import * as BABYLON from 'babylonjs';
import { SkiingPhysics } from '../../../../src/game/player/SkiingPhysics';
import { SkiingInput } from '../../../../src/game/player/ISkiingPhysics';
import { TerrainSurfaceInfo } from '../../../../src/core/physics/ITerrainCollider';

// Mock TerrainSurfaceInfo
const createMockTerrainSurface = (slope: number = 0, friction: number = 0.1): TerrainSurfaceInfo => {
  return {
    exists: true,
    height: 0,
    normal: new BABYLON.Vector3(0, 1, 0),
    slope: slope,
    friction: friction,
    materialType: 'snow'
  };
};

describe('SkiingPhysics', () => {
  let skiingPhysics: SkiingPhysics;
  let defaultInput: SkiingInput;
  
  beforeEach(() => {
    skiingPhysics = new SkiingPhysics();
    skiingPhysics.initialize();
    
    defaultInput = {
      forward: 0,
      right: 0,
      ski: false,
      jump: false
    };
  });
  
  test('should initialize with default config', () => {
    expect(skiingPhysics).toBeDefined();
    const state = skiingPhysics.getState();
    expect(state.isSkiing).toBe(false);
    expect(state.speed).toBe(0);
  });
  
  test('should start skiing when input.ski is true', () => {
    const input = { ...defaultInput, ski: true };
    const surfaceInfo = createMockTerrainSurface();
    const velocity = new BABYLON.Vector3(0, 0, 0);
    
    skiingPhysics.update(0.016, input, surfaceInfo, true, velocity);
    
    const state = skiingPhysics.getState();
    expect(state.isSkiing).toBe(true);
  });
  
  test('should accelerate downhill when on a slope', () => {
    // Set up a steep slope (0.5 radians ~= 28 degrees)
    const steepSlope = 0.5;
    const surfaceInfo = createMockTerrainSurface(steepSlope);
    
    // Create a normal pointing partially away from up to simulate a slope
    surfaceInfo.normal = new BABYLON.Vector3(
      Math.sin(steepSlope),
      Math.cos(steepSlope),
      0
    ).normalize();
    
    // Enable skiing
    const input = { ...defaultInput, ski: true };
    
    // Initial velocity is zero
    let velocity = new BABYLON.Vector3(0, 0, 0);
    
    // Update for a few frames to see acceleration effect
    for (let i = 0; i < 10; i++) {
      velocity = skiingPhysics.update(0.016, input, surfaceInfo, true, velocity);
    }
    
    // Velocity should increase downhill (negative X direction in this case)
    expect(velocity.length()).toBeGreaterThan(0);
    expect(velocity.x).toBeLessThan(0); // Moving downhill
  });
  
  test('should apply friction and slow down when not on a slope', () => {
    // Flat terrain
    const surfaceInfo = createMockTerrainSurface(0, 0.3); // High friction
    
    // Enable skiing
    const input = { ...defaultInput, ski: true };
    
    // Start with some velocity
    let velocity = new BABYLON.Vector3(5, 0, 0);
    
    // Update for a few frames
    for (let i = 0; i < 30; i++) {
      velocity = skiingPhysics.update(0.016, input, surfaceInfo, true, velocity);
    }
    
    // Velocity should decrease due to friction
    expect(velocity.length()).toBeLessThan(5);
  });
  
  test('should respect maximum speed limit', () => {
    // Set up steep slope for fast acceleration
    const steepSlope = 0.8; // ~46 degrees
    const surfaceInfo = createMockTerrainSurface(steepSlope, 0.05); // Low friction
    
    surfaceInfo.normal = new BABYLON.Vector3(
      Math.sin(steepSlope),
      Math.cos(steepSlope),
      0
    ).normalize();
    
    // Enable skiing
    const input = { ...defaultInput, ski: true };
    
    // Initial velocity
    let velocity = new BABYLON.Vector3(0, 0, 0);
    
    // Update for many frames to reach max speed
    for (let i = 0; i < 120; i++) {
      velocity = skiingPhysics.update(0.016, input, surfaceInfo, true, velocity);
    }
    
    // Speed should not exceed max speed from config
    const state = skiingPhysics.getState();
    expect(state.speed).toBeLessThanOrEqual(30); // DEFAULT_SKIING_CONFIG.maxSpeed
  });
  
  test('should apply turning when right input is provided', () => {
    // Flat terrain
    const surfaceInfo = createMockTerrainSurface();
    
    // Enable skiing with right turn input
    const input = { 
      forward: 1, 
      right: 0.5,  // Turn right
      ski: true,
      jump: false
    };
    
    // Initial velocity forward
    let velocity = new BABYLON.Vector3(0, 0, 5);
    
    // Set initial facing direction to forward
    skiingPhysics.setFacingDirection(new BABYLON.Vector3(0, 0, 1));
    
    // Update for several frames to see turning effect
    for (let i = 0; i < 30; i++) {
      velocity = skiingPhysics.update(0.016, input, surfaceInfo, true, velocity);
    }
    
    // Velocity should have a positive X component from turning right
    expect(velocity.x).toBeGreaterThan(0);
    
    // Facing direction should have turned right
    const state = skiingPhysics.getState();
    expect(state.facingDirection.x).toBeGreaterThan(0);
  });
  
  test('should decelerate faster when going uphill', () => {
    // Set up a slope going uphill (negative X direction is uphill)
    const slope = 0.3; // ~17 degrees
    const surfaceInfo = createMockTerrainSurface(slope, 0.1);
    
    surfaceInfo.normal = new BABYLON.Vector3(
      -Math.sin(slope), // Negative X indicates uphill in this direction
      Math.cos(slope),
      0
    ).normalize();
    
    // Enable skiing
    const input = { ...defaultInput, ski: true };
    
    // Initial velocity uphill (negative X)
    let velocity = new BABYLON.Vector3(-5, 0, 0);
    
    // Store initial speed
    const initialSpeed = velocity.length();
    
    // Update for a few frames
    for (let i = 0; i < 10; i++) {
      velocity = skiingPhysics.update(0.016, input, surfaceInfo, true, velocity);
    }
    
    // Should decelerate faster when going uphill
    expect(velocity.length()).toBeLessThan(initialSpeed * 0.7);
  });
  
  test('should apply impulse force immediately', () => {
    // Enable skiing
    const input = { ...defaultInput, ski: true };
    const surfaceInfo = createMockTerrainSurface();
    
    // Initial velocity
    let velocity = new BABYLON.Vector3(0, 0, 0);
    
    // Update once to start skiing
    velocity = skiingPhysics.update(0.016, input, surfaceInfo, true, velocity);
    
    // Apply an impulse force
    const impulseForce = new BABYLON.Vector3(0, 10, 0); // Upward impulse like a jump
    skiingPhysics.applyForce(impulseForce, true);
    
    // Get state after impulse
    const state = skiingPhysics.getState();
    
    // Velocity should immediately reflect the impulse
    expect(state.velocity.y).toBe(10);
  });
}); 