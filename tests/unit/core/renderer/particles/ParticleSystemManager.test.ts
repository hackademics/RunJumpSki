/**
 * @file tests/unit/core/renderer/particles/ParticleSystemManager.test.ts
 * @description Unit tests for ParticleSystemManager
 */

import * as BABYLON from 'babylonjs';
import { 
  ParticleSystemManager,
  ParticleEffectType,
  ParticleEffectOptions,
  ParticleSystemFromPresetOptions 
} from '../../../../../src/core/renderer/particles/ParticleSystemManager';
import { 
  IParticleSystemManager 
} from '../../../../../src/core/renderer/particles/IParticleSystemManager';

// Mock BabylonJS classes
jest.mock('babylonjs');

describe('ParticleSystemManager', () => {
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockParticleSystem: jest.Mocked<BABYLON.ParticleSystem>;
  let mockTexture: jest.Mocked<BABYLON.Texture>;
  let mockEmitter: jest.Mocked<BABYLON.AbstractMesh>;
  let particleManager: ParticleSystemManager;
  
  beforeEach(() => {
    // Create mocks
    mockParticleSystem = {
      emitter: null,
      minLifeTime: 0,
      maxLifeTime: 0,
      minSize: 0,
      maxSize: 0,
      emitRate: 0,
      minEmitPower: 0,
      maxEmitPower: 0,
      gravity: new BABYLON.Vector3(),
      direction1: new BABYLON.Vector3(),
      direction2: new BABYLON.Vector3(),
      targetStopDuration: 0,
      disposeOnStop: false,
      blendMode: 0,
      layerMask: 0,
      isLocal: false,
      particleTexture: null,
      color1: new BABYLON.Color4(),
      color2: new BABYLON.Color4(),
      start: jest.fn(),
      stop: jest.fn(),
      dispose: jest.fn(),
      createSphereEmitter: jest.fn(),
      createDirectedSphereEmitter: jest.fn(),
      createConeEmitter: jest.fn(),
      addSizeGradient: jest.fn(),
      updateFunction: null,
    } as unknown as jest.Mocked<BABYLON.ParticleSystem>;
    
    mockTexture = {
      dispose: jest.fn()
    } as unknown as jest.Mocked<BABYLON.Texture>;
    
    mockEmitter = {
      position: new BABYLON.Vector3(0, 0, 0)
    } as unknown as jest.Mocked<BABYLON.AbstractMesh>;
    
    mockScene = {} as jest.Mocked<BABYLON.Scene>;
    
    // Mock ParticleSystem constructor
    (BABYLON.ParticleSystem as jest.Mock).mockImplementation(() => mockParticleSystem);
    
    // Mock Texture constructor
    (BABYLON.Texture as jest.Mock).mockImplementation(() => mockTexture);
    
    // Create ParticleSystemManager instance
    particleManager = new ParticleSystemManager();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('initialize', () => {
    test('should initialize with scene', () => {
      particleManager.initialize(mockScene);
      
      // Scene should be stored in the manager
      expect(particleManager['scene']).toBe(mockScene);
    });
  });
  
  describe('createEffect', () => {
    beforeEach(() => {
      particleManager.initialize(mockScene);
    });
    
    test('should return null if scene is not initialized', () => {
      const uninitializedManager = new ParticleSystemManager();
      
      const effectId = uninitializedManager.createEffect(
        ParticleEffectType.EXPLOSION,
        new BABYLON.Vector3(),
        {}
      );
      
      expect(effectId).toBeNull();
    });
    
    test('should create explosion effect', () => {
      const position = new BABYLON.Vector3(1, 2, 3);
      const options: ParticleEffectOptions = {
        maxParticles: 200,
        emitRate: 100,
        minLifeTime: 0.3,
        maxLifeTime: 0.8
      };
      
      const effectId = particleManager.createEffect(
        ParticleEffectType.EXPLOSION,
        position,
        options
      );
      
      // Effect ID should be returned
      expect(effectId).not.toBeNull();
      
      // ParticleSystem should be created
      expect(BABYLON.ParticleSystem).toHaveBeenCalled();
      
      // Particle system should be tracked in the manager
      expect(particleManager.getParticleSystem(effectId!)).toBe(mockParticleSystem);
      
      // Effect type should be tracked
      expect(particleManager['particleTypes'].get(effectId!)).toBe(ParticleEffectType.EXPLOSION);
      
      // Particle system should be started
      expect(mockParticleSystem.start).toHaveBeenCalled();
    });
    
    test('should create jetpack effect', () => {
      const effectId = particleManager.createEffect(
        ParticleEffectType.JETPACK,
        mockEmitter
      );
      
      // Effect ID should be returned
      expect(effectId).not.toBeNull();
      
      // ParticleSystem should be created
      expect(BABYLON.ParticleSystem).toHaveBeenCalled();
      
      // Effect type should be tracked
      expect(particleManager['particleTypes'].get(effectId!)).toBe(ParticleEffectType.JETPACK);
    });
  });
  
  describe('createParticleSystemFromPreset', () => {
    beforeEach(() => {
      particleManager.initialize(mockScene);
    });
    
    test('should create particle system from preset', () => {
      const options: ParticleSystemFromPresetOptions = {
        preset: 'EXPLOSION',
        emitter: new BABYLON.Vector3(1, 2, 3),
        capacity: 500,
        updatePositionWithEmitter: false,
        customizations: {
          minSize: 0.5,
          maxSize: 2.0,
          color1: new BABYLON.Color4(1, 0, 0, 1),
          color2: new BABYLON.Color4(0, 0, 1, 0),
          emitRate: 200
        }
      };
      
      const effectId = particleManager.createParticleSystemFromPreset(options);
      
      // Effect ID should be returned
      expect(effectId).not.toBeNull();
      
      // ParticleSystem should be created
      expect(BABYLON.ParticleSystem).toHaveBeenCalled();
      
      // Customizations should be applied
      expect(mockParticleSystem.minSize).toBe(options.customizations!.minSize);
      expect(mockParticleSystem.maxSize).toBe(options.customizations!.maxSize);
      expect(mockParticleSystem.emitRate).toBe(options.customizations!.emitRate);
    });
  });
  
  describe('effect management', () => {
    let effectId: string | null;
    
    beforeEach(() => {
      particleManager.initialize(mockScene);
      
      // Create an effect to test with
      effectId = particleManager.createEffect(
        ParticleEffectType.EXPLOSION,
        new BABYLON.Vector3(),
        { enabled: false } // Start disabled
      );
    });
    
    test('should start effect', () => {
      expect(effectId).not.toBeNull();
      
      const result = particleManager.startEffect(effectId!);
      
      expect(result).toBe(true);
      expect(mockParticleSystem.start).toHaveBeenCalled();
    });
    
    test('should stop effect', () => {
      expect(effectId).not.toBeNull();
      
      const result = particleManager.stopEffect(effectId!, false);
      
      expect(result).toBe(true);
      expect(mockParticleSystem.stop).toHaveBeenCalled();
    });
    
    test('should update effect options', () => {
      expect(effectId).not.toBeNull();
      
      const newOptions: ParticleEffectOptions = {
        minLifeTime: 1.0,
        maxLifeTime: 2.0,
        emitRate: 50
      };
      
      const result = particleManager.updateEffect(effectId!, newOptions);
      
      expect(result).toBe(true);
      expect(mockParticleSystem.minLifeTime).toBe(newOptions.minLifeTime);
      expect(mockParticleSystem.maxLifeTime).toBe(newOptions.maxLifeTime);
      expect(mockParticleSystem.emitRate).toBe(newOptions.emitRate);
    });
    
    test('should dispose effect', () => {
      expect(effectId).not.toBeNull();
      
      const result = particleManager.disposeEffect(effectId!);
      
      expect(result).toBe(true);
      expect(mockParticleSystem.dispose).toHaveBeenCalled();
      
      // Effect should be removed from tracking
      expect(particleManager.getParticleSystem(effectId!)).toBeNull();
      expect(particleManager['particleTypes'].has(effectId!)).toBe(false);
    });
  });
  
  describe('specialized effect creators', () => {
    beforeEach(() => {
      particleManager.initialize(mockScene);
    });
    
    test('should create explosion effect', () => {
      const position = new BABYLON.Vector3(1, 2, 3);
      const effectId = particleManager.createExplosion(position);
      
      expect(effectId).not.toBeNull();
      expect(particleManager['particleTypes'].get(effectId!)).toBe(ParticleEffectType.EXPLOSION);
    });
    
    test('should create jetpack effect', () => {
      const effectId = particleManager.createJetpackEffect(mockEmitter);
      
      expect(effectId).not.toBeNull();
      expect(particleManager['particleTypes'].get(effectId!)).toBe(ParticleEffectType.JETPACK);
    });
    
    test('should create ski trail effect', () => {
      const effectId = particleManager.createSkiTrailEffect(mockEmitter);
      
      expect(effectId).not.toBeNull();
      expect(particleManager['particleTypes'].get(effectId!)).toBe(ParticleEffectType.SKI_TRAIL);
    });
    
    test('should create projectile trail effect', () => {
      const effectId = particleManager.createProjectileTrailEffect(mockEmitter);
      
      expect(effectId).not.toBeNull();
      expect(particleManager['particleTypes'].get(effectId!)).toBe(ParticleEffectType.PROJECTILE_TRAIL);
    });
  });
  
  describe('particle system getters', () => {
    let explosionId: string | null;
    let jetpackId: string | null;
    
    beforeEach(() => {
      particleManager.initialize(mockScene);
      
      // Create a few effects
      explosionId = particleManager.createEffect(
        ParticleEffectType.EXPLOSION, 
        new BABYLON.Vector3()
      );
      
      jetpackId = particleManager.createEffect(
        ParticleEffectType.JETPACK,
        mockEmitter
      );
    });
    
    test('should get particle system by ID', () => {
      expect(explosionId).not.toBeNull();
      
      const particleSystem = particleManager.getParticleSystem(explosionId!);
      
      expect(particleSystem).toBe(mockParticleSystem);
    });
    
    test('should get particle systems by type', () => {
      const explosionSystems = particleManager.getParticleSystemsByType(ParticleEffectType.EXPLOSION);
      const jetpackSystems = particleManager.getParticleSystemsByType(ParticleEffectType.JETPACK);
      
      expect(explosionSystems.length).toBe(1);
      expect(jetpackSystems.length).toBe(1);
      expect(explosionSystems[0]).toBe(mockParticleSystem);
    });
  });
  
  describe('updateEmitterPosition', () => {
    let effectId: string | null;
    
    beforeEach(() => {
      particleManager.initialize(mockScene);
      
      effectId = particleManager.createEffect(
        ParticleEffectType.EXPLOSION,
        new BABYLON.Vector3(0, 0, 0)
      );
    });
    
    test('should update emitter position', () => {
      expect(effectId).not.toBeNull();
      
      const newPosition = new BABYLON.Vector3(5, 10, 15);
      const result = particleManager.updateEmitterPosition(effectId!, newPosition);
      
      expect(result).toBe(true);
      expect(mockParticleSystem.emitter).toEqual(newPosition);
    });
    
    test('should return false for invalid ID', () => {
      const result = particleManager.updateEmitterPosition('invalid-id', new BABYLON.Vector3());
      
      expect(result).toBe(false);
    });
  });
  
  describe('updateEmitRate', () => {
    let effectId: string | null;
    
    beforeEach(() => {
      particleManager.initialize(mockScene);
      
      effectId = particleManager.createEffect(
        ParticleEffectType.EXPLOSION,
        new BABYLON.Vector3()
      );
    });
    
    test('should update emit rate', () => {
      expect(effectId).not.toBeNull();
      
      const newEmitRate = 500;
      const result = particleManager.updateEmitRate(effectId!, newEmitRate);
      
      expect(result).toBe(true);
      expect(mockParticleSystem.emitRate).toBe(newEmitRate);
    });
  });
  
  describe('dispose', () => {
    let effectId1: string | null;
    let effectId2: string | null;
    
    beforeEach(() => {
      particleManager.initialize(mockScene);
      
      // Create multiple effects
      effectId1 = particleManager.createEffect(
        ParticleEffectType.EXPLOSION, 
        new BABYLON.Vector3()
      );
      
      effectId2 = particleManager.createEffect(
        ParticleEffectType.JETPACK,
        mockEmitter
      );
    });
    
    test('should dispose all effects', () => {
      particleManager.dispose();
      
      // All particle systems should be disposed
      expect(mockParticleSystem.dispose).toHaveBeenCalled();
      
      // Manager should not have any tracked systems
      expect(particleManager['particleSystems'].size).toBe(0);
      expect(particleManager['particleTypes'].size).toBe(0);
      expect(particleManager['scene']).toBeNull();
    });
  });
}); 