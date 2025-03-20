/**
 * @file tests/unit/game/weapons/SpinfusorProjectile.test.ts
 * @description Unit tests for SpinfusorProjectile
 */

import * as BABYLON from 'babylonjs';
import { SpinfusorProjectile, DEFAULT_SPINFUSOR_CONFIG } from '../../../../src/game/weapons/SpinfusorProjectile';
import { IProjectilePhysics } from '../../../../src/core/physics/IProjectilePhysics';

// Mock Babylon.js objects
jest.mock('babylonjs');

describe('SpinfusorProjectile', () => {
  // Mock scene
  const mockScene = {
    beginAnimation: jest.fn().mockReturnValue({ onAnimationEnd: jest.fn() }),
    getGlowLayerByName: jest.fn()
  } as unknown as BABYLON.Scene;
  
  // Mock glow layer
  const mockGlowLayer = {
    intensity: 1,
    addIncludedOnlyMesh: jest.fn()
  } as unknown as BABYLON.GlowLayer;
  
  // Mock projectile physics
  const mockProjectilePhysics: jest.Mocked<IProjectilePhysics> = {
    initialize: jest.fn(),
    update: jest.fn(),
    createProjectile: jest.fn(),
    destroyProjectile: jest.fn(),
    getProjectileState: jest.fn(),
    applyExplosionForce: jest.fn(),
    dispose: jest.fn()
  };
  
  // Mock mesh
  const mockMesh = {
    position: new BABYLON.Vector3(0, 0, 0),
    material: {},
    animations: [],
    dispose: jest.fn()
  } as unknown as BABYLON.Mesh;
  
  // Set up spinfusor projectile
  let spinfusor: SpinfusorProjectile;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock scene methods
    mockScene.getGlowLayerByName.mockReturnValue(mockGlowLayer);
    
    // Mock MeshBuilder
    (BABYLON.MeshBuilder.CreateCylinder as jest.Mock).mockReturnValue(mockMesh);
    
    // Mock projectile physics
    mockProjectilePhysics.createProjectile.mockReturnValue('test-projectile-id');
    
    // Create spinfusor
    spinfusor = new SpinfusorProjectile(
      mockScene,
      mockProjectilePhysics
    );
  });
  
  describe('fire', () => {
    it('should create a disc mesh', () => {
      // Fire a disc
      spinfusor.fire(
        new BABYLON.Vector3(1, 2, 3),
        new BABYLON.Vector3(0, 0, 1)
      );
      
      // Check if disc was created
      expect(BABYLON.MeshBuilder.CreateCylinder).toHaveBeenCalledWith(
        "spinfusorDisc",
        expect.objectContaining({
          height: expect.any(Number),
          diameter: expect.any(Number)
        }),
        mockScene
      );
      
      // Check if material was created
      expect(BABYLON.StandardMaterial).toHaveBeenCalled();
      
      // Check if animation was added
      expect(mockScene.beginAnimation).toHaveBeenCalled();
      
      // Check if glow layer was used
      expect(mockScene.getGlowLayerByName).toHaveBeenCalledWith("spinfusorGlow");
      expect(mockGlowLayer.addIncludedOnlyMesh).toHaveBeenCalledWith(mockMesh);
    });
    
    it('should create a new glow layer if not found', () => {
      // Return null for glow layer
      mockScene.getGlowLayerByName.mockReturnValueOnce(null);
      
      // Fire a disc
      spinfusor.fire(
        new BABYLON.Vector3(1, 2, 3),
        new BABYLON.Vector3(0, 0, 1)
      );
      
      // Check if a new glow layer was created
      expect(BABYLON.GlowLayer).toHaveBeenCalledWith("spinfusorGlow", mockScene);
    });
    
    it('should launch the projectile with correct parameters', () => {
      // Start position and direction
      const start = new BABYLON.Vector3(1, 2, 3);
      const direction = new BABYLON.Vector3(0, 0, 1);
      
      // Fire a disc
      const projectileId = spinfusor.fire(start, direction);
      
      // Check if projectile was created with correct parameters
      expect(mockProjectilePhysics.createProjectile).toHaveBeenCalledWith(
        start,
        direction,
        expect.objectContaining(DEFAULT_SPINFUSOR_CONFIG),
        mockMesh,
        expect.any(Function)
      );
      
      // Should return the projectile ID
      expect(projectileId).toBe('test-projectile-id');
    });
    
    it('should call the impact callback when projectile hits', () => {
      // Create a custom impact callback
      const onImpact = jest.fn();
      
      // Mock the explosion effect method to avoid animation issues
      (spinfusor as any).createExplosionEffect = jest.fn();
      
      // Store the provided impact callback when createProjectile is called
      mockProjectilePhysics.createProjectile.mockImplementationOnce(
        (start, direction, config, mesh, callback) => {
          (spinfusor as any).lastCallback = callback;
          return 'test-projectile-id';
        }
      );
      
      // Fire a disc with impact callback
      spinfusor.fire(
        new BABYLON.Vector3(1, 2, 3),
        new BABYLON.Vector3(0, 0, 1),
        onImpact
      );
      
      // Mock impact event
      const position = new BABYLON.Vector3(5, 5, 5);
      const normal = new BABYLON.Vector3(0, 1, 0);
      const target = {} as BABYLON.PhysicsImpostor;
      
      // Call the stored callback
      (spinfusor as any).lastCallback('test-projectile-id', position, normal, target);
      
      // Check if the explosion effect was created
      expect((spinfusor as any).createExplosionEffect).toHaveBeenCalledWith(position);
      
      // Check if the impact callback was called
      expect(onImpact).toHaveBeenCalledWith('test-projectile-id', position, normal, target);
    });
  });
  
  describe('dispose', () => {
    it('should destroy all active projectiles', () => {
      // Fire multiple discs
      const id1 = spinfusor.fire(new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 1));
      const id2 = spinfusor.fire(new BABYLON.Vector3(1, 1, 1), new BABYLON.Vector3(1, 0, 0));
      
      // Dispose the spinfusor
      spinfusor.dispose();
      
      // Check if all projectiles were destroyed
      expect(mockProjectilePhysics.destroyProjectile).toHaveBeenCalledWith(id1, false);
      expect(mockProjectilePhysics.destroyProjectile).toHaveBeenCalledWith(id2, false);
    });
  });
}); 
