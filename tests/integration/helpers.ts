import { Entity } from '../../src/core/base/Entity';
import { IEntity } from '../../src/core/base/IEntity';
import { Vector3 } from '../../src/types/common/Vector3';

/**
 * Options for creating a test entity
 */
export interface TestEntityOptions {
  id?: string;
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
  mass?: number;
  shape?: string;
  dimensions?: Vector3;
  mesh?: string;
  material?: string;
  physics?: boolean;
  render?: boolean;
}

/**
 * Creates a test entity with standard components
 */
export function createTestEntity(options: TestEntityOptions = {}): IEntity {
  const entity = new Entity(options.id || `test-entity-${Math.floor(Math.random() * 10000)}`);
  
  // Add transform component if available
  try {
    const { TransformComponent } = require('../../src/components/transform/TransformComponent');
    const transform = new TransformComponent({
      position: options.position || { x: 0, y: 0, z: 0 },
      rotation: options.rotation || { x: 0, y: 0, z: 0 },
      scale: options.scale || { x: 1, y: 1, z: 1 }
    });
    entity.addComponent(transform);
  } catch (error) {
    console.warn('TransformComponent not available, skipping');
  }
  
  // Add physics component if needed and available
  if (options.physics !== false) {
    try {
      const { PhysicsComponent } = require('../../src/components/physics/PhysicsComponent');
      const physics = new PhysicsComponent({
        mass: options.mass || 1,
        shape: options.shape || 'box',
        dimensions: options.dimensions || { x: 1, y: 1, z: 1 }
      });
      entity.addComponent(physics);
    } catch (error) {
      console.warn('PhysicsComponent not available, skipping');
    }
  }
  
  // Add render component if needed and available
  if (options.render !== false) {
    try {
      const { RenderComponent } = require('../../src/components/render/RenderComponent');
      const render = new RenderComponent({
        mesh: options.mesh || 'box',
        material: options.material || 'default'
      });
      entity.addComponent(render);
    } catch (error) {
      console.warn('RenderComponent not available, skipping');
    }
  }
  
  return entity;
}

/**
 * Simple test scene interface
 */
export interface TestScene {
  entities: Map<string, IEntity>;
  getEntity(id: string): IEntity | undefined;
  addEntity(entity: IEntity): IEntity;
}

/**
 * Creates a test scene with multiple entities
 */
export function createTestScene(): TestScene {
  const scene: TestScene = {
    entities: new Map(),
    getEntity(id) {
      return this.entities.get(id);
    },
    addEntity(entity) {
      this.entities.set(entity.id, entity);
      return entity;
    }
  };
  
  // Add some test entities
  scene.addEntity(createTestEntity({ 
    id: 'floor', 
    position: { x: 0, y: -1, z: 0 }, 
    scale: { x: 10, y: 0.1, z: 10 } 
  }));
  
  scene.addEntity(createTestEntity({ 
    id: 'player', 
    position: { x: 0, y: 1, z: 0 } 
  }));
  
  scene.addEntity(createTestEntity({ 
    id: 'obstacle', 
    position: { x: 3, y: 1, z: 3 } 
  }));
  
  return scene;
}

/**
 * Waits for the specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Runs multiple update frames
 */
export function runFrames(updateFn: (deltaTime: number) => void, frameCount: number, deltaTime: number = 1/60): void {
  for (let i = 0; i < frameCount; i++) {
    updateFn(deltaTime);
  }
} 