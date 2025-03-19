/**
 * @file tests/unit/core/ecs/components/PhysicsComponent.test.ts
 * @description Unit tests for the PhysicsComponent.
 */

import * as BABYLON from 'babylonjs';
import { PhysicsComponent } from '@core/ecs/components/PhysicsComponent';

// Create a fake PhysicsImpostor for testing.
class FakePhysicsImpostor {
  mesh: any;
  type: number;
  options: any;
  constructor(mesh: any, type: number, options: any) {
    this.mesh = mesh;
    this.type = type;
    this.options = options;
  }
  getParam(name: string) {
    return this.options[name];
  }
}

describe('PhysicsComponent', () => {
  let physicsComponent: PhysicsComponent;
  let fakeMesh: any;
  let originalPhysicsImpostor: any;

  beforeAll(() => {
    // Backup the original Babylon.PhysicsImpostor.
    originalPhysicsImpostor = BABYLON.PhysicsImpostor;
    // Override with our fake implementation for testing.
    BABYLON.PhysicsImpostor = FakePhysicsImpostor as any;
    // Define the BoxImpostor constant.
    BABYLON.PhysicsImpostor.BoxImpostor = 1;
  });

  afterAll(() => {
    // Restore the original PhysicsImpostor.
    BABYLON.PhysicsImpostor = originalPhysicsImpostor;
  });

  beforeEach(() => {
    // Create a new PhysicsComponent with test parameters.
    physicsComponent = new PhysicsComponent(2, 0.3, 0.8);
    // Create a fake mesh object.
    fakeMesh = {
      physicsImpostor: null,
    };
  });

  test('should attach a physics impostor to the mesh', () => {
    physicsComponent.attachToMesh(fakeMesh);
    expect(physicsComponent.impostor).not.toBeNull();
    expect(fakeMesh.physicsImpostor).toBe(physicsComponent.impostor);
    // Verify that the impostor parameters are set correctly.
    expect(physicsComponent.impostor.getParam('mass')).toBe(2);
    expect(physicsComponent.impostor.getParam('friction')).toBe(0.3);
    expect(physicsComponent.impostor.getParam('restitution')).toBe(0.8);
  });
});
