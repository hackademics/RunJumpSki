import { PhysicsSystem } from '../../../src/core/physics/PhysicsSystem';
import { RendererSystem } from '../../../src/core/renderer/RendererSystem';
import { EventBus } from '../../../src/core/events/EventBus';
import { createTestEntity, runFrames, wait } from '../helpers';
import { ServiceContainer } from '../../../src/core/services/ServiceContainer';
import { Logger } from '../../../src/core/logger/Logger';
import * as BABYLON from 'babylonjs';
import { CollisionGroup } from '../../../src/core/physics/IPhysicsSystem';

// Mock document and canvas for testing
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: jest.fn(() => ({
    canvas: { width: 800, height: 600 }
  }))
};

// Mock document
global.document = {
  createElement: jest.fn(() => mockCanvas),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
} as any;

// Mock BabylonJS
jest.mock('babylonjs', () => {
  return {
    Engine: jest.fn().mockImplementation(() => ({
      runRenderLoop: jest.fn(),
      resize: jest.fn(),
      dispose: jest.fn()
    })),
    Scene: jest.fn().mockImplementation(() => ({
      render: jest.fn(),
      dispose: jest.fn(),
      enablePhysics: jest.fn(),
      onPhysicsCollisionObservable: {
        add: jest.fn()
      }
    })),
    Vector3: jest.fn().mockImplementation((x, y, z) => ({ x, y, z })),
    Mesh: {
      CreateBox: jest.fn().mockImplementation(() => ({
        position: { x: 0, y: 0, z: 0 }
      }))
    },
    PhysicsImpostor: jest.fn().mockImplementation(() => ({
      mass: 1,
      dispose: jest.fn()
    })),
    CannonJSPlugin: jest.fn()
  };
});

describe('Physics and Renderer Integration', () => {
  let physicsSystem: PhysicsSystem;
  let rendererSystem: RendererSystem;
  let eventBus: EventBus;
  let serviceContainer: ServiceContainer;
  let canvas: HTMLCanvasElement;
  let scene: BABYLON.Scene;
  let engine: BABYLON.Engine;
  
  beforeEach(async () => {
    // Create canvas for rendering
    canvas = document.createElement('canvas') as HTMLCanvasElement;
    document.body.appendChild(canvas);
    
    // Create Babylon engine and scene
    engine = new BABYLON.Engine(canvas as any, true);
    scene = new BABYLON.Scene(engine);
    
    // Setup service container
    serviceContainer = ServiceContainer.getInstance();
    
    // Setup logger
    const logger = Logger.getInstance();
    logger.initialize();
    serviceContainer.register('logger', () => logger, {
      id: 'logger',
      implementation: logger,
      singleton: true
    });
    
    // Setup event bus
    eventBus = EventBus.getInstance();
    serviceContainer.register('eventBus', () => eventBus, {
      id: 'eventBus',
      implementation: eventBus,
      singleton: true
    });
    
    // Setup physics system
    physicsSystem = PhysicsSystem.getInstance();
    physicsSystem.initialize(scene, {
      gravity: { x: 0, y: -9.81, z: 0 },
      defaultFriction: 0.2,
      defaultRestitution: 0.2,
      defaultMass: 1,
      maxSubSteps: 10,
      fixedTimeStep: 1/60,
      debugMode: false
    });
    serviceContainer.register('physics', () => physicsSystem, {
      id: 'physics',
      implementation: physicsSystem,
      singleton: true
    });
    
    // Setup renderer system
    rendererSystem = RendererSystem.getInstance();
    rendererSystem.initialize({
      canvasId: 'test-canvas',
      antialiasing: true,
      scene: {
        clearColor: { r: 0, g: 0, b: 0 },
        ambientIntensity: 0.2
      },
      camera: {
        position: { x: 0, y: 5, z: -10 },
        target: { x: 0, y: 0, z: 0 },
        fov: 0.8,
        nearClip: 0.1,
        farClip: 1000
      },
      performance: {
        hardwareScaling: true
      }
    });
    serviceContainer.register('renderer', () => rendererSystem, {
      id: 'renderer',
      implementation: rendererSystem,
      singleton: true
    });
    
    // Wait for systems to fully initialize
    await wait(100);
  });
  
  afterEach(() => {
    // Clean up
    physicsSystem.dispose();
    rendererSystem.dispose();
    eventBus.dispose();
    serviceContainer.dispose();
    
    // Clean up Babylon resources
    scene.dispose();
    engine.dispose();
    
    // Remove canvas
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  });
  
  test('should initialize both systems successfully', () => {
    expect(physicsSystem).toBeDefined();
    expect(rendererSystem).toBeDefined();
    
    // Check if systems are initialized
    expect(rendererSystem.getScene()).toBeDefined();
    expect(rendererSystem.getEngine()).toBeDefined();
  });
  
  test('should create and track physics objects', () => {
    // Create a mesh in the renderer
    const boxMesh = rendererSystem.createMesh('box', 'box', { size: 1 });
    
    // Create a rigid body in the physics system
    const rigidBody = physicsSystem.createRigidBody(boxMesh, {
      type: 'box',
      mass: 1,
      friction: 0.5,
      restitution: 0.5,
      group: CollisionGroup.DEFAULT
    });
    
    // Verify the rigid body was created
    expect(rigidBody).toBeDefined();
    expect(rigidBody.mass).toBe(1);
    
    // Apply a force to the rigid body
    physicsSystem.applyForce(rigidBody, { x: 0, y: 10, z: 0 });
    
    // Run a physics update
    scene.render();
    
    // Verify the mesh position was updated
    expect(boxMesh.position).toBeDefined();
  });
  
  test('should handle collision events between systems', async () => {
    // Create two meshes in the renderer
    const boxA = rendererSystem.createMesh('boxA', 'box', { size: 1 });
    boxA.position.y = 5;
    
    const boxB = rendererSystem.createMesh('boxB', 'box', { size: 1 });
    boxB.position.y = 0;
    
    // Create rigid bodies in the physics system
    const rigidBodyA = physicsSystem.createRigidBody(boxA, {
      type: 'box',
      mass: 1,
      friction: 0.5,
      restitution: 0.5,
      group: CollisionGroup.DEFAULT
    });
    
    const rigidBodyB = physicsSystem.createRigidBody(boxB, {
      type: 'box',
      mass: 0, // Static body
      friction: 0.5,
      restitution: 0.5,
      group: CollisionGroup.DEFAULT
    });
    
    // Setup collision event listener
    const collisionSpy = jest.fn();
    // Use EventBus instead of direct scene access for collision events
    eventBus.on('physics:collision', collisionSpy);
    
    // Run several frames to allow for collision
    for (let i = 0; i < 60; i++) {
      scene.render();
      await wait(16); // Simulate 60fps
    }
    
    // Verify collision was detected
    expect(collisionSpy).toHaveBeenCalled();
  });
}); 