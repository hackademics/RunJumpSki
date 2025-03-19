/**
 * @file tests/unit/core/physics/CollisionSystem.test.ts
 * @description Unit tests for the CollisionSystem.
 */

import { CollisionSystem } from '@core/physics/CollisionSystem';

describe('CollisionSystem', () => {
  let collisionSystem: CollisionSystem;

  beforeEach(() => {
    collisionSystem = new CollisionSystem();
  });

  test('should initialize and log a message', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    collisionSystem.initialize();
    expect(consoleSpy).toHaveBeenCalledWith('CollisionSystem initialized');
    consoleSpy.mockRestore();
  });

  test('should update without errors', () => {
    expect(() => collisionSystem.update()).not.toThrow();
  });

  test('should destroy and log a message', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    collisionSystem.destroy();
    expect(consoleSpy).toHaveBeenCalledWith('CollisionSystem destroyed');
    consoleSpy.mockRestore();
  });
});
