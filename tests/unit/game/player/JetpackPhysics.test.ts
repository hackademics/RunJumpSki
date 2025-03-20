/**
 * @file tests/unit/game/player/JetpackPhysics.test.ts
 * @description Tests for the JetpackPhysics implementation
 */

import * as BABYLON from 'babylonjs';
import { JetpackPhysics } from '../../../../src/game/player/JetpackPhysics';
import { JetpackInput } from '../../../../src/game/player/IJetpackPhysics';

describe('JetpackPhysics', () => {
  let jetpackPhysics: JetpackPhysics;
  let defaultInput: JetpackInput;
  
  beforeEach(() => {
    jetpackPhysics = new JetpackPhysics();
    jetpackPhysics.initialize();
    
    defaultInput = {
      activate: false,
      forward: 0,
      right: 0,
      thrust: 0
    };
  });
  
  test('should initialize with default config', () => {
    expect(jetpackPhysics).toBeDefined();
    const state = jetpackPhysics.getState();
    expect(state.isActive).toBe(false);
    expect(state.speed).toBe(0);
    expect(state.currentFuel).toBe(100); // DEFAULT_JETPACK_CONFIG.maxFuel
    expect(state.hasFuel).toBe(true);
  });
  
  test('should activate jetpack when activate input is true', () => {
    const input = { ...defaultInput, activate: true };
    const velocity = new BABYLON.Vector3(0, 0, 0);
    
    jetpackPhysics.update(0.016, input, false, velocity);
    
    const state = jetpackPhysics.getState();
    expect(state.isActive).toBe(true);
  });
  
  test('should consume fuel while active', () => {
    const input = { ...defaultInput, activate: true };
    const velocity = new BABYLON.Vector3(0, 0, 0);
    
    // Initial fuel level
    const initialFuel = jetpackPhysics.getState().currentFuel;
    
    // Update for a few frames with jetpack active
    for (let i = 0; i < 10; i++) {
      jetpackPhysics.update(0.016, input, false, velocity);
    }
    
    // Fuel should decrease
    const currentFuel = jetpackPhysics.getState().currentFuel;
    expect(currentFuel).toBeLessThan(initialFuel);
  });
  
  test('should recharge fuel when not active', () => {
    // First activate to use some fuel
    const activeInput = { ...defaultInput, activate: true };
    let velocity = new BABYLON.Vector3(0, 0, 0);
    
    // Use jetpack for a while
    for (let i = 0; i < 50; i++) {
      velocity = jetpackPhysics.update(0.016, activeInput, false, velocity);
    }
    
    // Record fuel level after usage
    const fuelAfterUsage = jetpackPhysics.getState().currentFuel;
    
    // Then deactivate and let it recharge
    const inactiveInput = { ...defaultInput, activate: false };
    
    for (let i = 0; i < 50; i++) {
      velocity = jetpackPhysics.update(0.016, inactiveInput, false, velocity);
    }
    
    // Fuel should have recharged somewhat
    const currentFuel = jetpackPhysics.getState().currentFuel;
    expect(currentFuel).toBeGreaterThan(fuelAfterUsage);
  });
  
  test('should deactivate when out of fuel', () => {
    const input = { ...defaultInput, activate: true };
    const velocity = new BABYLON.Vector3(0, 0, 0);
    
    // First reset to ensure clean state
    jetpackPhysics.reset();
    
    // Set the initial fuel to a very small amount
    // @ts-ignore - Accessing private property for testing
    jetpackPhysics['state'].currentFuel = 0.01;
    
    // Activate the jetpack
    jetpackPhysics.activate();
    
    // Initial state should be active when we activate
    const initialState = jetpackPhysics.getState();
    expect(initialState.hasFuel).toBe(true);
    expect(initialState.isActive).toBe(true);
    expect(initialState.currentFuel).toBeLessThanOrEqual(0.01);
    
    // Update with jetpack active to consume remaining fuel
    // Just need a single update with a sufficient delta time
    jetpackPhysics.update(0.1, input, false, velocity);
    
    // Should auto-deactivate when fuel runs out
    const finalState = jetpackPhysics.getState();
    expect(finalState.currentFuel).toBeLessThanOrEqual(0);
    expect(finalState.hasFuel).toBe(false);
    expect(finalState.isActive).toBe(false);
  });
  
  test('should accelerate upward when active', () => {
    const input = { ...defaultInput, activate: true, thrust: 1.0 };
    let velocity = new BABYLON.Vector3(0, 0, 0);
    
    // Update for a few frames with jetpack active
    for (let i = 0; i < 10; i++) {
      velocity = jetpackPhysics.update(0.016, input, false, velocity);
    }
    
    // Velocity should have a positive Y component (upward)
    expect(velocity.y).toBeGreaterThan(0);
  });
  
  test('should provide horizontal control based on forward input', () => {
    const input = { ...defaultInput, activate: true, forward: 1.0 };
    let velocity = new BABYLON.Vector3(0, 0, 0);
    
    // Set facing direction to forward
    jetpackPhysics.setFacingDirection(new BABYLON.Vector3(0, 0, 1));
    
    // Update for a few frames with forward input
    for (let i = 0; i < 10; i++) {
      velocity = jetpackPhysics.update(0.016, input, false, velocity);
    }
    
    // Velocity should have a positive Z component (forward)
    expect(velocity.z).toBeGreaterThan(0);
  });
  
  test('should apply turning based on right input', () => {
    const input = { ...defaultInput, activate: true, right: 0.5 };
    let velocity = new BABYLON.Vector3(0, 0, 1); // Initial forward velocity
    
    // Set initial facing direction to forward
    jetpackPhysics.setFacingDirection(new BABYLON.Vector3(0, 0, 1));
    
    // Update for several frames with turning input
    for (let i = 0; i < 30; i++) {
      velocity = jetpackPhysics.update(0.016, input, false, velocity);
    }
    
    // Facing direction should have turned right
    const state = jetpackPhysics.getState();
    expect(state.facingDirection.x).toBeGreaterThan(0);
  });
  
  test('should enforce maximum horizontal speed', () => {
    const input = { ...defaultInput, activate: true, forward: 1.0 };
    let velocity = new BABYLON.Vector3(0, 0, 0);
    
    // Update for many frames to reach max speed
    for (let i = 0; i < 100; i++) {
      velocity = jetpackPhysics.update(0.016, input, false, velocity);
    }
    
    // Horizontal speed should not exceed max speed
    const horizontalVelocity = new BABYLON.Vector3(velocity.x, 0, velocity.z);
    expect(horizontalVelocity.length()).toBeLessThanOrEqual(25); // DEFAULT_JETPACK_CONFIG.maxSpeed
  });
  
  test('should enforce maximum vertical speed', () => {
    const input = { ...defaultInput, activate: true, thrust: 1.0 };
    let velocity = new BABYLON.Vector3(0, 0, 0);
    
    // Update for many frames to reach max vertical speed
    for (let i = 0; i < 100; i++) {
      velocity = jetpackPhysics.update(0.016, input, false, velocity);
    }
    
    // Vertical speed should not exceed max vertical speed
    expect(velocity.y).toBeLessThanOrEqual(15); // DEFAULT_JETPACK_CONFIG.maxVerticalSpeed
  });
  
  test('should refill fuel when refillFuel is called', () => {
    // Use some fuel first
    const input = { ...defaultInput, activate: true };
    let velocity = new BABYLON.Vector3(0, 0, 0);
    
    for (let i = 0; i < 50; i++) {
      velocity = jetpackPhysics.update(0.016, input, false, velocity);
    }
    
    // Record fuel level after usage
    const fuelAfterUsage = jetpackPhysics.getState().currentFuel;
    expect(fuelAfterUsage).toBeLessThan(100);
    
    // Refill fuel
    jetpackPhysics.refillFuel();
    
    // Fuel should be maxed out again
    const currentFuel = jetpackPhysics.getState().currentFuel;
    expect(currentFuel).toBe(100); // DEFAULT_JETPACK_CONFIG.maxFuel
  });
  
  test('should reset jetpack state correctly', () => {
    // Change state first
    const input = { ...defaultInput, activate: true, forward: 1.0 };
    let velocity = new BABYLON.Vector3(0, 0, 0);
    
    for (let i = 0; i < 20; i++) {
      velocity = jetpackPhysics.update(0.016, input, false, velocity);
    }
    
    // Verify state changed
    const stateBeforeReset = jetpackPhysics.getState();
    expect(stateBeforeReset.isActive).toBe(true);
    expect(stateBeforeReset.currentFuel).toBeLessThan(100);
    expect(stateBeforeReset.velocity.length()).toBeGreaterThan(0);
    
    // Reset
    jetpackPhysics.reset();
    
    // Verify reset to initial state
    const stateAfterReset = jetpackPhysics.getState();
    expect(stateAfterReset.isActive).toBe(false);
    expect(stateAfterReset.currentFuel).toBe(100);
    expect(stateAfterReset.velocity.length()).toBe(0);
  });
});
