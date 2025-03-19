/**
 * @file tests/unit/core/physics/PhysicsSystem.test.ts
 * @description Unit tests for the PhysicsSystem.
 */

import { PhysicsSystem } from '@core/physics/PhysicsSystem';
import * as BABYLON from 'babylonjs';

describe('PhysicsSystem', () => {
  let physicsSystem: PhysicsSystem;
  let fakePhysicsEngine: any;
  let fakeScene: any;

  beforeEach(() => {
    // Create a fake physics engine with minimal implementation.
    fakePhysicsEngine = {
      setGravity: jest.fn(),
      dispose: jest.fn(),
    };

    // Create a fake scene that simulates Babylon.js scene behavior.
    fakeScene = {
      enablePhysics: jest.fn(),
      getPhysicsEngine: jest.fn().mockReturnValue(fakePhysicsEngine),
    };

    physicsSystem = new PhysicsSystem();
  });

  test('should initialize physics on the scene', () => {
    physicsSystem.initialize(fakeScene);
    expect(fakeScene.enablePhysics).toHaveBeenCalled();
  });

  test('should update without error', () => {
    physicsSystem.initialize(fakeScene);
    expect(() => physicsSystem.update(0.016)).not.toThrow();
  });

  test('should set gravity on the scene physics engine', () => {
    physicsSystem.initialize(fakeScene);
    const newGravity = new BABYLON.Vector3(0, -5, 0);
    physicsSystem.setGravity(newGravity);
    expect(fakePhysicsEngine.setGravity).toHaveBeenCalledWith(newGravity);
  });

  test('should destroy the physics engine on the scene', () => {
    physicsSystem.initialize(fakeScene);
    physicsSystem.destroy();
    expect(fakePhysicsEngine.dispose).toHaveBeenCalled();
  });
});
