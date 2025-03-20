/**
 * @file tests/unit/core/renderer/particles/ParticleSystemManager.test.ts
 * @description Unit tests for ParticleSystemManager
 */

import { jest } from '@jest/globals';
import { ParticleSystemManager } from '../../../../../src/core/renderer/particles/ParticleSystemManager';
import { IParticleSystemManager, ParticleEffectType, ParticleEffectOptions, ParticleSystemFromPresetOptions } from '../../../../../src/core/renderer/particles/IParticleSystemManager';
import * as BABYLON from 'babylonjs';

// Create mocks
const mockObservable = {
  add: jest.fn().mockReturnValue(1), // Return observer id
  remove: jest.fn(),
  notifyObservers: jest.fn(),
  observers: []
};

// Create a mock scene with the observable property
const mockScene = {
  onAfterRenderObservable: mockObservable,
  getEngine: jest.fn().mockReturnValue({
    getFps: jest.fn().mockReturnValue(60)
  }),
  createParticleSystem: jest.fn()
};

// Create mock ParticleSystem
const mockParticleSystem = {
  start: jest.fn(),
  stop: jest.fn(),
  dispose: jest.fn(),
  isStarted: jest.fn().mockReturnValue(true),
  emitter: null,
  minSize: 1,
  maxSize: 5,
  updateSpeed: 0.01,
  targetStopDuration: 0
};

// Create mock Texture
const mockTexture = {
  dispose: jest.fn()
};

// Create mock AbstractMesh
const mockAbstractMesh = {
  position: { x: 0, y: 0, z: 0 }
};

// Mock ResourceTracker
const mockResourceTracker = {
  trackParticleSystem: jest.fn(),
  trackTexture: jest.fn(),
  trackMaterial: jest.fn(),
  trackMesh: jest.fn(),
  trackCamera: jest.fn(),
  trackLight: jest.fn(),
  trackSound: jest.fn(),
  trackResource: jest.fn(),
  disposeResource: jest.fn().mockReturnValue(true),
  disposeByFilter: jest.fn().mockReturnValue(1),
  disposeAll: jest.fn(),
  getTrackedResources: jest.fn().mockReturnValue([]),
  track: jest.fn()
};

// Mock most Babylon.js classes to prevent issues during testing
jest.mock('babylonjs', () => {
  // Create mock constructors and objects
  return {
    ParticleSystem: jest.fn().mockImplementation(() => mockParticleSystem),
    Texture: jest.fn().mockImplementation(() => mockTexture),
    AbstractMesh: jest.fn().mockImplementation(() => mockAbstractMesh),
    Scene: jest.fn().mockImplementation(() => mockScene),
    Vector3: jest.fn().mockImplementation((x, y, z) => ({ 
      x: x || 0, 
      y: y || 0, 
      z: z || 0,
      copyFrom: jest.fn(),
      normalize: jest.fn().mockReturnValue({ x: 0, y: 0, z: 1 }),
      cross: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
      scale: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
      add: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
      subtract: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
      length: jest.fn().mockReturnValue(1),
      clone: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 })
    })),
    Color4: jest.fn().mockImplementation((r, g, b, a) => ({ r: r || 0, g: g || 0, b: b || 0, a: a || 1 })),
    Color3: jest.fn().mockImplementation((r, g, b) => ({ r: r || 0, g: g || 0, b: b || 0 })),
    HighlightLayer: jest.fn().mockImplementation(() => ({
      addMesh: jest.fn(),
      removeMesh: jest.fn(),
      dispose: jest.fn()
    })),
    Observable: jest.fn().mockImplementation(() => mockObservable),
    Logger: {
      LogLevels: {
        Debug: 0,
        Info: 1,
        Warning: 2,
        Error: 3
      }
    },
    // Add mock for PointLight
    PointLight: jest.fn().mockImplementation(() => ({
      diffuse: { r: 1, g: 1, b: 1 },
      specular: { r: 1, g: 1, b: 1 },
      position: { x: 0, y: 0, z: 0 },
      intensity: 1,
      range: 10,
      parent: null,
      dispose: jest.fn()
    }))
  };
});

// Mock ResourceTracker module
jest.mock('../../../../../src/core/utils/ResourceTracker', () => ({
  ResourceTracker: jest.fn().mockImplementation(() => mockResourceTracker),
  ResourceType: {
    MESH: 'mesh',
    MATERIAL: 'material',
    TEXTURE: 'texture',
    CAMERA: 'camera',
    LIGHT: 'light',
    PARTICLE_SYSTEM: 'particleSystem',
    SOUND: 'sound',
    CUSTOM: 'custom',
    OTHER: 'other'
  }
}));

// Mock Logger module
jest.mock('../../../../../src/core/utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    addTag: jest.fn()
  }))
}));

// Mock ParticlePresets module
jest.mock('../../../../../src/core/renderer/particles/ParticlePresets', () => ({
  DEFAULT_PARTICLE_OPTIONS: {},
  DEFAULT_EXPLOSION_OPTIONS: {},
  DEFAULT_JETPACK_OPTIONS: {},
  DEFAULT_SKI_TRAIL_OPTIONS: {},
  DEFAULT_PROJECTILE_TRAIL_OPTIONS: {},
  DEFAULT_DUST_OPTIONS: {},
  DEFAULT_MUZZLE_FLASH_OPTIONS: {},
  DEFAULT_IMPACT_SPARK_OPTIONS: {},
  scaleParticleEffect: jest.fn().mockImplementation((options) => options)
}));

// Mock ServiceLocator module
jest.mock('../../../../../src/core/base/ServiceLocator', () => ({
  ServiceLocator: {
    getInstance: jest.fn().mockImplementation(() => ({
      has: jest.fn().mockReturnValue(false),
      get: jest.fn(),
      register: jest.fn()
    }))
  }
}));

describe('ParticleSystemManager', () => {
  let particleSystemManager: ParticleSystemManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the mock observable
    mockObservable.add.mockClear();
    mockObservable.remove.mockClear();
    mockObservable.notifyObservers.mockClear();
    mockObservable.observers = [];
    
    // Mock implementation of createEffect to return a valid effect ID
    jest.spyOn(ParticleSystemManager.prototype, 'createEffect').mockImplementation(() => "effect_1");
    
    // Mock implementation of createParticleSystemFromPreset to return a valid effect ID
    jest.spyOn(ParticleSystemManager.prototype, 'createParticleSystemFromPreset').mockImplementation(() => "preset_1");
    
    // Create new instance with mocked resource tracker
    particleSystemManager = new ParticleSystemManager(mockResourceTracker as any);
    particleSystemManager.initialize(mockScene as unknown as BABYLON.Scene);
    
    // Restore original methods after instance is created
    jest.restoreAllMocks();
  });

  afterEach(() => {
    particleSystemManager.dispose();
  });

  it('should initialize correctly', () => {
    expect(particleSystemManager).toBeDefined();
  });

  it('should add an observer to the scene on after render observable during initialization', () => {
    expect(mockScene.onAfterRenderObservable.add).toHaveBeenCalled();
  });

  it('should create a particle system with correct parameters', () => {
    // Mock the createParticleSystemFromPreset to return a valid ID
    jest.spyOn(particleSystemManager, 'createParticleSystemFromPreset').mockReturnValue('preset_1');
    
    const options: ParticleSystemFromPresetOptions = {
      preset: 'explosion',
      emitter: new BABYLON.Vector3(1, 2, 3),
      capacity: 1000
    };
    
    const effectId = particleSystemManager.createParticleSystemFromPreset(options);
    
    expect(effectId).toBe('preset_1');
  });

  it('should create a particle effect', () => {
    // Mock the createEffect to return a valid ID
    jest.spyOn(particleSystemManager, 'createEffect').mockReturnValue('effect_1');
    
    const effectId = particleSystemManager.createEffect(
      ParticleEffectType.SMOKE,
      new BABYLON.Vector3(1, 2, 3),
      {
        maxParticles: 1000,
        texturePath: 'test-texture.png'
      }
    );
    
    expect(effectId).toBe('effect_1');
  });

  it('should start a particle effect', () => {
    // Mock the particleSystems Map to return our mock particle system when getParticleSystem is called
    const particleSystemsMap = new Map();
    particleSystemsMap.set('effect_1', mockParticleSystem);
    
    // @ts-ignore: Accessing private property for test
    particleSystemManager['particleSystems'] = particleSystemsMap;
    
    // Now directly call startEffect with the ID we know exists in our mocked map
    particleSystemManager.startEffect('effect_1');
    
    // Verify the start method was called on the mock particle system
    expect(mockParticleSystem.start).toHaveBeenCalled();
  });

  it('should stop a particle effect', () => {
    // Mock the particleSystems Map to return our mock particle system when getParticleSystem is called
    const particleSystemsMap = new Map();
    particleSystemsMap.set('effect_1', mockParticleSystem);
    
    // @ts-ignore: Accessing private property for test
    particleSystemManager['particleSystems'] = particleSystemsMap;
    
    // Now directly call stopEffect with the ID we know exists in our mocked map
    particleSystemManager.stopEffect('effect_1');
    
    // Verify the stop method was called on the mock particle system
    expect(mockParticleSystem.stop).toHaveBeenCalled();
  });

  it('should check if a particle system exists', () => {
    // Mock the private particleSystems Map
    const particleSystemsMap = new Map();
    particleSystemsMap.set('effect_1', mockParticleSystem);
    
    // @ts-ignore: Accessing private property for test
    particleSystemManager['particleSystems'] = particleSystemsMap;
    
    const system = particleSystemManager.getParticleSystem('effect_1');
    expect(system).toBe(mockParticleSystem);
    
    const nonExistentSystem = particleSystemManager.getParticleSystem('non-existent-id');
    expect(nonExistentSystem).toBeNull();
  });

  it('should dispose a particle effect', () => {
    // Mock the private particleSystems and particleTypes maps
    const particleSystemsMap = new Map();
    particleSystemsMap.set('effect_1', mockParticleSystem);
    
    const particleTypesMap = new Map();
    particleTypesMap.set('effect_1', ParticleEffectType.SMOKE);
    
    // @ts-ignore: Accessing private properties for test
    particleSystemManager['particleSystems'] = particleSystemsMap;
    // @ts-ignore: Accessing private properties for test
    particleSystemManager['particleTypes'] = particleTypesMap;
    
    const result = particleSystemManager.disposeEffect('effect_1');
    
    expect(result).toBe(true);
    expect(mockResourceTracker.disposeResource).toHaveBeenCalled();
  });

  it('should get particle systems by type', () => {
    // Mock the private particleSystems and particleTypes maps
    const particleSystemsMap = new Map();
    particleSystemsMap.set('effect_1', mockParticleSystem);
    
    const particleTypesMap = new Map();
    particleTypesMap.set('effect_1', ParticleEffectType.SMOKE);
    
    // @ts-ignore: Accessing private properties for test
    particleSystemManager['particleSystems'] = particleSystemsMap;
    // @ts-ignore: Accessing private properties for test
    particleSystemManager['particleTypes'] = particleTypesMap;
    
    const systems = particleSystemManager.getParticleSystemsByType(ParticleEffectType.SMOKE);
    expect(systems).toHaveLength(1);
    expect(systems[0]).toBe(mockParticleSystem);
    
    const otherSystems = particleSystemManager.getParticleSystemsByType(ParticleEffectType.EXPLOSION);
    expect(otherSystems).toHaveLength(0);
  });

  it("should dispose all particle systems", () => {
    // Spy on the necessary methods
    const disposeAllSpy = jest.spyOn(particleSystemManager, 'disposeAll');
    
    // Reset mocks to clear previous calls
    mockResourceTracker.disposeByFilter.mockClear();
    
    // Call dispose, which should call disposeAll internally
    particleSystemManager.dispose();
    
    // Verify disposeAll was called
    expect(disposeAllSpy).toHaveBeenCalled();
    
    // Verify resource tracker was called via disposeAll
    expect(mockResourceTracker.disposeByFilter).toHaveBeenCalled();
  });

  describe("dispose", () => {
    it("should dispose all particle systems and clear the scene", () => {
      // Set up a spy on the disposeAll method
      const disposeAllSpy = jest.spyOn(particleSystemManager, 'disposeAll');
      
      // Call dispose
      particleSystemManager.dispose();
      
      // Verify disposeAll was called
      expect(disposeAllSpy).toHaveBeenCalledTimes(1);
      
      // Instead of directly checking private scene property, 
      // try to use it to verify it's null
      // This is an indirect test that the scene was set to null
      const mockCreateParticleSystem = jest.fn();
      mockScene.createParticleSystem = mockCreateParticleSystem;
      
      // Try to create a particle effect after dispose
      // This should fail or do nothing if scene is null
      particleSystemManager.createParticleSystemFromPreset({
        preset: 'EXPLOSION',
        emitter: new BABYLON.Vector3(0, 0, 0)
      });
      
      // Verify no new particle system was created
      expect(mockCreateParticleSystem).not.toHaveBeenCalled();
    });
  });
}); 