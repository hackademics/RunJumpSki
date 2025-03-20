/**
 * @file tests/unit/core/physics/ProjectilePhysics.test.ts
 * @description Unit tests for ProjectilePhysics system
 */

import * as BABYLON from 'babylonjs';
import { ProjectilePhysics } from '../../../../src/core/physics/ProjectilePhysics';
import { ProjectileConfig } from '../../../../src/core/physics/IProjectilePhysics';
import { IPhysicsSystem } from '../../../../src/core/physics/IPhysicsSystem';
import { ICollisionSystem } from '../../../../src/core/physics/ICollisionSystem';

// Mock Babylon.js objects
jest.mock('babylonjs');

describe('ProjectilePhysics', () => {
  // Mock physics system
  const mockPhysicsSystem: jest.Mocked<IPhysicsSystem> = {
    initialize: jest.fn(),
    update: jest.fn(),
    setGravity: jest.fn(),
    dispose: jest.fn(),
    getPhysicsEngine: jest.fn(),
    createImpostor: jest.fn(),
    applyForce: jest.fn(),
    applyImpulse: jest.fn(),
    createJoint: jest.fn(),
    registerOnCollide: jest.fn()
  };
  
  // Mock collision system
  const mockCollisionSystem: jest.Mocked<ICollisionSystem> = {
    initialize: jest.fn(),
    update: jest.fn(),
    registerCollisionHandler: jest.fn(),
    unregisterCollisionHandler: jest.fn(),
    registerTriggerZone: jest.fn(),
    unregisterTriggerZone: jest.fn(),
    areColliding: jest.fn(),
    raycast: jest.fn(),
    dispose: jest.fn()
  };
  
  // Mock scene
  const mockScene = {} as BABYLON.Scene;
  
  // Mock physics engine
  const mockPhysicsEngine = {
    getScene: jest.fn().mockReturnValue(mockScene)
  };
  
  // Mock mesh
  const mockMesh = {
    position: new BABYLON.Vector3(0, 0, 0),
    dispose: jest.fn(),
    material: null,
    rotationQuaternion: null
  } as unknown as BABYLON.Mesh;
  
  // Mock impostor
  const mockImpostor = {
    getObjectCenter: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0)),
    getLinearVelocity: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0)),
    setLinearVelocity: jest.fn(),
    dispose: jest.fn(),
    mass: 1
  } as unknown as BABYLON.PhysicsImpostor;
  
  // Set up projectile physics system
  let projectilePhysics: ProjectilePhysics;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock physics engine
    mockPhysicsSystem.getPhysicsEngine.mockReturnValue(mockPhysicsEngine as any);
    
    // Mock creation of impostors
    mockPhysicsSystem.createImpostor.mockReturnValue(mockImpostor);
    
    // Create the system
    projectilePhysics = new ProjectilePhysics();
    projectilePhysics.initialize(mockPhysicsSystem, mockCollisionSystem);
  });
  
  describe('initialization', () => {
    it('should get the scene from the physics system', () => {
      expect(mockPhysicsSystem.getPhysicsEngine).toHaveBeenCalled();
      expect(mockPhysicsEngine.getScene).toHaveBeenCalled();
    });
  });
  
  describe('createProjectile', () => {
    // Test projectile config
    const testConfig: Partial<ProjectileConfig> = {
      initialVelocity: 50,
      mass: 2,
      affectedByGravity: true
    };
    
    it('should create a projectile with the specified configuration', () => {
      // Mock MeshBuilder
      (BABYLON.MeshBuilder.CreateSphere as jest.Mock).mockReturnValue(mockMesh);
      
      // Create a projectile
      const startPosition = new BABYLON.Vector3(1, 2, 3);
      const direction = new BABYLON.Vector3(0, 0, 1);
      
      const projectileId = projectilePhysics.createProjectile(
        startPosition,
        direction,
        testConfig
      );
      
      expect(projectileId).toMatch(/projectile_\d+/);
      
      // Check if mesh was created when no mesh is provided
      expect(BABYLON.MeshBuilder.CreateSphere).toHaveBeenCalled();
      
      // Check if impostor was created
      expect(mockPhysicsSystem.createImpostor).toHaveBeenCalledWith(
        mockMesh,
        BABYLON.PhysicsImpostor.SphereImpostor,
        expect.objectContaining({
          mass: testConfig.mass
        })
      );
      
      // Check if initial velocity was set
      expect(mockImpostor.setLinearVelocity).toHaveBeenCalled();
      
      // Check if collision handler was registered
      expect(mockCollisionSystem.registerCollisionHandler).toHaveBeenCalledWith(
        mockImpostor,
        null,
        expect.any(Function)
      );
    });
    
    it('should use provided mesh instead of creating a new one', () => {
      // Create a projectile with a provided mesh
      const startPosition = new BABYLON.Vector3(1, 2, 3);
      const direction = new BABYLON.Vector3(0, 0, 1);
      const customMesh = { ...mockMesh, position: new BABYLON.Vector3(0, 0, 0) } as unknown as BABYLON.Mesh;
      
      const projectileId = projectilePhysics.createProjectile(
        startPosition,
        direction,
        testConfig,
        customMesh
      );
      
      // Check that MeshBuilder.CreateSphere wasn't called
      expect(BABYLON.MeshBuilder.CreateSphere).not.toHaveBeenCalled();
      
      // Check if impostor was created with provided mesh
      expect(mockPhysicsSystem.createImpostor).toHaveBeenCalledWith(
        customMesh,
        BABYLON.PhysicsImpostor.SphereImpostor,
        expect.anything()
      );
    });
    
    it('should call impact callback when a collision occurs', () => {
      // Create an impact callback
      const onImpact = jest.fn();
      
      // Mock collision handler registration
      mockCollisionSystem.registerCollisionHandler.mockImplementation(
        (impostor, collider, callback) => {
          // Store the callback for later use
          (projectilePhysics as any).lastCallback = callback;
          return 'handler-id';
        }
      );
      
      // Create a projectile with impact callback
      const projectileId = projectilePhysics.createProjectile(
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, 1),
        testConfig,
        mockMesh,
        onImpact
      );
      
      // Mock a collision event by calling the stored callback
      const collisionInfo = {
        initiator: mockImpostor,
        collider: { ...mockImpostor },
        point: new BABYLON.Vector3(1, 1, 1),
        normal: new BABYLON.Vector3(0, 1, 0),
        impulse: 10
      };
      
      (projectilePhysics as any).lastCallback(collisionInfo);
      
      // Check if the impact callback was called
      expect(onImpact).toHaveBeenCalledWith(
        projectileId,
        collisionInfo.point,
        collisionInfo.normal,
        collisionInfo.collider
      );
      
      // Projectile should be destroyed after impact
      const state = projectilePhysics.getProjectileState(projectileId);
      expect(state).toBeNull();
    });
  });
  
  describe('update', () => {
    it('should update active projectiles', () => {
      // Create a projectile
      (BABYLON.MeshBuilder.CreateSphere as jest.Mock).mockReturnValue(mockMesh);
      
      const projectileId = projectilePhysics.createProjectile(
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, 1),
        { initialVelocity: 10, lifetime: 5 }
      );
      
      // Update the system
      projectilePhysics.update(0.1);
      
      // Verify the projectile was updated
      const state = projectilePhysics.getProjectileState(projectileId);
      expect(state).not.toBeNull();
      expect(state?.timeAlive).toBeCloseTo(0.1);
    });
    
    it('should destroy projectiles after their lifetime expires', () => {
      // Create a projectile with short lifetime
      (BABYLON.MeshBuilder.CreateSphere as jest.Mock).mockReturnValue(mockMesh);
      
      const projectileId = projectilePhysics.createProjectile(
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, 1),
        { initialVelocity: 10, lifetime: 1 }
      );
      
      // Update the system with time less than lifetime
      projectilePhysics.update(0.5);
      
      // Projectile should still exist
      let state = projectilePhysics.getProjectileState(projectileId);
      expect(state).not.toBeNull();
      
      // Update the system with time past lifetime
      projectilePhysics.update(0.6);
      
      // Projectile should be destroyed
      state = projectilePhysics.getProjectileState(projectileId);
      expect(state).toBeNull();
    });
  });
  
  describe('destroyProjectile', () => {
    it('should clean up resources when destroying a projectile', () => {
      // Create a projectile
      (BABYLON.MeshBuilder.CreateSphere as jest.Mock).mockReturnValue(mockMesh);
      
      const projectileId = projectilePhysics.createProjectile(
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, 1),
        { initialVelocity: 10 }
      );
      
      // Destroy the projectile
      projectilePhysics.destroyProjectile(projectileId);
      
      // Verify resources were cleaned up
      expect(mockImpostor.dispose).toHaveBeenCalled();
      expect(mockMesh.dispose).toHaveBeenCalled();
      
      // Projectile state should be gone
      const state = projectilePhysics.getProjectileState(projectileId);
      expect(state).toBeNull();
    });
    
    it('should trigger explosion effects when explode flag is true', () => {
      // Mock applyExplosionForce
      projectilePhysics.applyExplosionForce = jest.fn();
      
      // Create a projectile with explosion parameters
      (BABYLON.MeshBuilder.CreateSphere as jest.Mock).mockReturnValue(mockMesh);
      
      const projectileId = projectilePhysics.createProjectile(
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, 1),
        { 
          initialVelocity: 10,
          explosionRadius: 5,
          explosionForce: 1000
        }
      );
      
      // Destroy the projectile with explosion
      projectilePhysics.destroyProjectile(projectileId, true);
      
      // Verify explosion force was applied
      expect(projectilePhysics.applyExplosionForce).toHaveBeenCalledWith(
        expect.any(BABYLON.Vector3),
        5,
        1000,
        true
      );
    });
  });
  
  describe('applyExplosionForce', () => {
    it('should apply force to impostors within the explosion radius', () => {
      // Mock scene to contain meshes with impostors
      const mockMesh1 = { 
        physicsImpostor: {
          ...mockImpostor,
          getObjectCenter: jest.fn().mockReturnValue(new BABYLON.Vector3(1, 0, 0))
        }
      };
      const mockMesh2 = { 
        physicsImpostor: {
          ...mockImpostor,
          getObjectCenter: jest.fn().mockReturnValue(new BABYLON.Vector3(10, 0, 0))
        }
      };
      
      mockScene.meshes = [mockMesh1, mockMesh2] as unknown as BABYLON.AbstractMesh[];
      
      // Apply explosion force at the origin
      projectilePhysics.applyExplosionForce(
        new BABYLON.Vector3(0, 0, 0),
        5, // Radius
        1000, // Force
        true // Falloff
      );
      
      // Should apply force to the impostor within radius (mockMesh1)
      expect(mockPhysicsSystem.applyImpulse).toHaveBeenCalledWith(
        mockMesh1.physicsImpostor,
        expect.any(BABYLON.Vector3),
        expect.any(BABYLON.Vector3)
      );
      
      // Should not apply force to the impostor outside radius (mockMesh2)
      expect(mockPhysicsSystem.applyImpulse).not.toHaveBeenCalledWith(
        mockMesh2.physicsImpostor,
        expect.any(BABYLON.Vector3),
        expect.any(BABYLON.Vector3)
      );
    });
  });
  
  describe('destroy', () => {
    it('should clean up all resources', () => {
      // Create multiple projectiles
      (BABYLON.MeshBuilder.CreateSphere as jest.Mock).mockReturnValue({ ...mockMesh });
      
      projectilePhysics.createProjectile(
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, 1),
        { initialVelocity: 10 }
      );
      
      projectilePhysics.createProjectile(
        new BABYLON.Vector3(1, 1, 1),
        new BABYLON.Vector3(1, 0, 0),
        { initialVelocity: 20 }
      );
      
      // Call destroy
      projectilePhysics.dispose();
      
      // Check if resources were cleaned up
      expect(mockImpostor.dispose).toHaveBeenCalledTimes(2);
      expect(mockMesh.dispose).toHaveBeenCalledTimes(2);
    });
  });
}); 
