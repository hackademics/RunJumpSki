/**
 * @file tests/mocks/setup.ts
 * @description Helper module for setting up Babylon.js mocks in tests
 */

import * as BABYLON from './babylonjs';

/**
 * Sets up common mocks for Babylon.js tests
 */
export function setupBabylonMocks() {
  // Setup global window mock if needed
  BABYLON.setupWindowMock();
  
  // Return mock objects that can be used in tests
  return {
    createScene: () => {
      const canvas = BABYLON.createMockCanvas();
      const engine = new BABYLON.Engine(canvas);
      const scene = new BABYLON.Scene(engine);
      
      // Add a default camera
      const camera = new BABYLON.FreeCamera('default camera', new BABYLON.Vector3(0, 0, -10), scene);
      scene.activeCamera = camera;
      
      return {
        engine,
        scene,
        canvas,
        camera
      };
    },
    
    createPhysicsImpostor: (scene, mesh, type = BABYLON.PhysicsImpostor.BoxImpostor, options = { mass: 1 }) => {
      return new BABYLON.PhysicsImpostor(mesh, type, options, scene);
    },
    
    createMesh: (scene, name = 'testMesh') => {
      return new BABYLON.Mesh(name, scene);
    },
    
    createVector3: (x = 0, y = 0, z = 0) => {
      return new BABYLON.Vector3(x, y, z);
    },
    
    createQuaternion: (x = 0, y = 0, z = 0, w = 1) => {
      return new BABYLON.Quaternion(x, y, z, w);
    },
    
    createMatrix: () => {
      return BABYLON.Matrix.Identity();
    },
    
    cleanupMocks: () => {
      BABYLON.cleanupWindowMock();
    }
  };
}

/**
 * Creates mocks for the SpatialPartitioningCollisionSystem test
 */
export function setupSpatialPartitioningMocks() {
  const common = setupBabylonMocks();
  const { scene } = common.createScene();
  
  // Create a collection of meshes for spatial testing
  const meshes = Array.from({ length: 20 }, (_, i) => {
    const mesh = new BABYLON.Mesh(`testMesh${i}`, scene);
    
    // Position meshes in a grid pattern
    const x = (i % 5) * 10;
    const z = Math.floor(i / 5) * 10;
    mesh.position = new BABYLON.Vector3(x, 0, z);
    
    // Add physics impostor
    mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
      mesh,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 1 },
      scene
    );
    
    return mesh;
  });
  
  return {
    ...common,
    meshes
  };
}

/**
 * Creates mocks for TerrainRenderer tests
 */
export function setupTerrainRendererMocks() {
  const common = setupBabylonMocks();
  const { scene } = common.createScene();
  
  // Setup heightmap generation
  const createHeightMapData = (width, height) => {
    const data = new Float32Array(width * height);
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        const index = z * width + x;
        // Create a simple heightmap with some hills and valleys
        const centerX = width / 2;
        const centerZ = height / 2;
        const distX = (x - centerX) / centerX;
        const distZ = (z - centerZ) / centerZ;
        const dist = Math.sqrt(distX * distX + distZ * distZ);
        data[index] = Math.cos(dist * Math.PI * 2) * 5;
      }
    }
    return data;
  };
  
  return {
    ...common,
    createHeightMapData,
    
    // Add specialized mock for CreateGroundFromHeightMap
    createHeightMapMesh: (name = 'terrain', options = {}) => {
      const mesh = BABYLON.Mesh.CreateGroundFromHeightMap(
        name,
        'dummy-url.png',
        {
          width: 100,
          height: 100,
          subdivisions: 50,
          minHeight: 0,
          maxHeight: 10,
          ...options
        },
        scene
      );
      return mesh;
    }
  };
}

/**
 * Creates mocks for ControlsManager tests
 */
export function setupControlsManagerMocks() {
  const common = setupBabylonMocks();
  
  // Create mock storage adapter
  const mockStorage = new Map();
  const storageAdapter = {
    save: jest.fn((key, value) => {
      mockStorage.set(key, JSON.stringify(value));
      return true;
    }),
    load: jest.fn((key, defaultValue = null) => {
      const value = mockStorage.get(key);
      return value ? JSON.parse(value) : defaultValue;
    }),
    remove: jest.fn(key => {
      return mockStorage.delete(key);
    }),
    exists: jest.fn(key => {
      return mockStorage.has(key);
    }),
    clear: jest.fn(() => {
      mockStorage.clear();
      return true;
    })
  };
  
  // Create mock event emitter
  const eventListeners = new Map();
  const eventEmitter = {
    on: jest.fn((event, handler) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event).add(handler);
    }),
    off: jest.fn((event, handler) => {
      if (eventListeners.has(event)) {
        eventListeners.get(event).delete(handler);
      }
    }),
    emit: jest.fn((event, data) => {
      if (eventListeners.has(event)) {
        eventListeners.get(event).forEach(handler => handler(data));
      }
    })
  };
  
  // Create mock input mapper with working contextBindings
  const mockInputMapper = {
    contextBindings: new Map(),
    activeContext: 'default',
    
    initializeContext: jest.fn((context) => {
      if (!this.contextBindings.has(context)) {
        this.contextBindings.set(context, new Map());
      }
    }),
    
    getActionForKey: jest.fn((key, context = null) => {
      const ctx = context || this.activeContext;
      if (!this.contextBindings.has(ctx)) {
        return null;
      }
      return this.contextBindings.get(ctx).get(key) || null;
    }),
    
    setMapping: jest.fn((key, action, context = null) => {
      const ctx = context || this.activeContext;
      if (!this.contextBindings.has(ctx)) {
        this.contextBindings.set(ctx, new Map());
      }
      this.contextBindings.get(ctx).set(key, action);
    }),
    
    getBindingConfig: jest.fn((key, context = null) => {
      const ctx = context || this.activeContext;
      if (!this.contextBindings.has(ctx)) {
        return null;
      }
      const config = this.contextBindings.get(ctx).get(key);
      return config ? { key, action: config } : null;
    }),
    
    setBindingConfig: jest.fn((config) => {
      const ctx = config.context || this.activeContext;
      if (!this.contextBindings.has(ctx)) {
        this.contextBindings.set(ctx, new Map());
      }
      this.contextBindings.get(ctx).set(config.key, config.action);
    }),
    
    resetToDefaults: jest.fn(() => {
      // Reset to default mappings
      this.contextBindings.clear();
      this.contextBindings.set('default', new Map([
        ['w', 'MOVE_FORWARD'],
        ['s', 'MOVE_BACKWARD'],
        ['a', 'STRAFE_LEFT'],
        ['d', 'STRAFE_RIGHT'],
        [' ', 'JUMP'],
        ['Shift', 'SPRINT']
      ]));
    })
  };
  
  return {
    ...common,
    storageAdapter,
    eventEmitter,
    mockInputMapper
  };
}

/**
 * Creates mock for RenderingSystem tests 
 */
export function setupRenderingSystemMocks() {
  const common = setupBabylonMocks();
  const { scene, engine } = common.createScene();
  
  // Enhanced engine mock with spies
  const renderLoopSpy = jest.spyOn(engine, 'runRenderLoop');
  const stopRenderLoopSpy = jest.spyOn(engine, 'stopRenderLoop');
  
  return {
    ...common,
    scene,
    engine,
    renderLoopSpy,
    stopRenderLoopSpy,
    
    // Add a spy to track scene.render calls
    renderSpy: jest.spyOn(scene, 'render')
  };
}

/**
 * Exports all mock setup helpers
 */
export default {
  setupBabylonMocks,
  setupSpatialPartitioningMocks,
  setupTerrainRendererMocks,
  setupControlsManagerMocks,
  setupRenderingSystemMocks
};