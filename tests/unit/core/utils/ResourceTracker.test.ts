/**
 * @file tests/unit/core/utils/ResourceTracker.test.ts
 * @description Unit tests for the ResourceTracker utility
 */

import { 
  ResourceTracker, 
  ResourceType, 
  IDisposable, 
  TrackResourceOptions 
} from '../../../../src/core/utils/ResourceTracker';
import * as BABYLON from 'babylonjs';

// Mock BABYLON objects
jest.mock('babylonjs');

describe('ResourceTracker', () => {
  let resourceTracker: ResourceTracker;

  // Mock disposable resources
  class MockResource implements IDisposable {
    public isDisposed = false;
    public id: string;

    constructor(id: string) {
      this.id = id;
    }

    dispose(): void {
      this.isDisposed = true;
    }
  }

  class MockMesh extends MockResource {
    getScene() {
      return { uid: 'scene1' };
    }
  }

  class MockMaterial extends MockResource {
    getScene() {
      return { uid: 'scene1' };
    }
  }

  class MockTexture extends MockResource {
    getScene() {
      return { uid: 'scene1' };
    }
  }

  class DisposalErrorResource implements IDisposable {
    dispose(): void {
      throw new Error('Failed to dispose');
    }
  }

  beforeEach(() => {
    resourceTracker = new ResourceTracker();
    jest.clearAllMocks();
  });

  describe('track', () => {
    it('should track a resource with a generated ID', () => {
      const resource = new MockResource('test');
      const options: TrackResourceOptions = {
        type: ResourceType.OTHER
      };

      const id = resourceTracker.track(resource, options);
      
      expect(id).toBeDefined();
      expect(resourceTracker.isTracked(id)).toBe(true);
    });

    it('should track a resource with a custom ID', () => {
      const resource = new MockResource('test');
      const options: TrackResourceOptions = {
        type: ResourceType.OTHER,
        id: 'custom-id'
      };

      const id = resourceTracker.track(resource, options);
      
      expect(id).toBe('custom-id');
      expect(resourceTracker.isTracked('custom-id')).toBe(true);
    });

    it('should store all resource metadata', () => {
      const resource = new MockResource('test');
      const options: TrackResourceOptions = {
        type: ResourceType.OTHER,
        id: 'custom-id',
        sceneId: 'scene1',
        group: 'testGroup',
        metadata: { tag: 'test', priority: 1 }
      };

      const id = resourceTracker.track(resource, options);
      const trackedResource = resourceTracker.getResource(id);
      
      expect(trackedResource).toBeDefined();
      expect(trackedResource?.type).toBe(ResourceType.OTHER);
      expect(trackedResource?.sceneId).toBe('scene1');
      expect(trackedResource?.group).toBe('testGroup');
      expect(trackedResource?.metadata?.tag).toBe('test');
      expect(trackedResource?.metadata?.priority).toBe(1);
    });
  });

  describe('specialized tracking methods', () => {
    it('should track a mesh with correct type', () => {
      const mesh = new MockMesh('mesh1');
      const id = resourceTracker.trackMesh(mesh as unknown as BABYLON.AbstractMesh);
      
      const resource = resourceTracker.getResource(id);
      expect(resource?.type).toBe(ResourceType.MESH);
      expect(resource?.sceneId).toBe('scene1');
    });

    it('should track a material with correct type', () => {
      const material = new MockMaterial('material1');
      const id = resourceTracker.trackMaterial(material as unknown as BABYLON.Material);
      
      const resource = resourceTracker.getResource(id);
      expect(resource?.type).toBe(ResourceType.MATERIAL);
      expect(resource?.sceneId).toBe('scene1');
    });

    it('should track a texture with correct type', () => {
      const texture = new MockTexture('texture1');
      const id = resourceTracker.trackTexture(texture as unknown as BABYLON.BaseTexture);
      
      const resource = resourceTracker.getResource(id);
      expect(resource?.type).toBe(ResourceType.TEXTURE);
      expect(resource?.sceneId).toBe('scene1');
    });
  });

  describe('disposeResource', () => {
    it('should dispose a tracked resource', () => {
      const resource = new MockResource('test');
      const id = resourceTracker.track(resource, { type: ResourceType.OTHER });
      
      const result = resourceTracker.disposeResource(id);
      
      expect(result).toBe(true);
      expect(resource.isDisposed).toBe(true);
      expect(resourceTracker.isTracked(id)).toBe(false);
    });

    it('should return false and log when resource is not found', () => {
      const result = resourceTracker.disposeResource('non-existent-id');
      
      expect(result).toBe(false);
    });

    it('should handle disposal errors gracefully', () => {
      const resource = new DisposalErrorResource();
      const id = resourceTracker.track(resource, { type: ResourceType.OTHER });
      
      const result = resourceTracker.disposeResource(id);
      
      expect(result).toBe(false);
      expect(resourceTracker.isTracked(id)).toBe(false); // Still removed from tracking
    });
  });

  describe('filter operations', () => {
    beforeEach(() => {
      // Set up test resources
      const mesh1 = new MockResource('mesh1');
      const mesh2 = new MockResource('mesh2');
      const material1 = new MockResource('material1');
      const material2 = new MockResource('material2');
      const texture1 = new MockResource('texture1');
      
      resourceTracker.track(mesh1, { type: ResourceType.MESH, sceneId: 'scene1', group: 'group1' });
      resourceTracker.track(mesh2, { type: ResourceType.MESH, sceneId: 'scene2', group: 'group2' });
      resourceTracker.track(material1, { type: ResourceType.MATERIAL, sceneId: 'scene1', group: 'group1' });
      resourceTracker.track(material2, { type: ResourceType.MATERIAL, sceneId: 'scene2', group: 'group2' });
      resourceTracker.track(texture1, { type: ResourceType.TEXTURE, sceneId: 'scene1', group: 'group1' });
    });

    it('should find resources by type', () => {
      const meshIds = resourceTracker.findResourcesByFilter({ type: ResourceType.MESH });
      expect(meshIds.length).toBe(2);
      
      const materialIds = resourceTracker.findResourcesByFilter({ type: ResourceType.MATERIAL });
      expect(materialIds.length).toBe(2);
      
      const textureIds = resourceTracker.findResourcesByFilter({ type: ResourceType.TEXTURE });
      expect(textureIds.length).toBe(1);
    });

    it('should find resources by scene', () => {
      const scene1Resources = resourceTracker.findResourcesByFilter({ sceneId: 'scene1' });
      expect(scene1Resources.length).toBe(3); // 1 mesh, 1 material, 1 texture
      
      const scene2Resources = resourceTracker.findResourcesByFilter({ sceneId: 'scene2' });
      expect(scene2Resources.length).toBe(2); // 1 mesh, 1 material
    });

    it('should find resources by group', () => {
      const group1Resources = resourceTracker.findResourcesByFilter({ group: 'group1' });
      expect(group1Resources.length).toBe(3);
      
      const group2Resources = resourceTracker.findResourcesByFilter({ group: 'group2' });
      expect(group2Resources.length).toBe(2);
    });

    it('should find resources by combined filters', () => {
      const scene1MeshResources = resourceTracker.findResourcesByFilter({ 
        type: ResourceType.MESH, 
        sceneId: 'scene1' 
      });
      expect(scene1MeshResources.length).toBe(1);
    });

    it('should find resources by custom predicate', () => {
      const resourcesWithMatInId = resourceTracker.findResourcesByFilter({ 
        predicate: (resource) => resource.id?.includes('material') || false
      });
      expect(resourcesWithMatInId.length).toBe(2);
    });
  });

  describe('batch disposal operations', () => {
    beforeEach(() => {
      // Set up test resources
      for (let i = 1; i <= 3; i++) {
        resourceTracker.track(new MockResource(`mesh${i}`), { 
          type: ResourceType.MESH, 
          sceneId: `scene${i % 2 + 1}`, 
          group: `group${i % 3 + 1}` 
        });
      }
      
      for (let i = 1; i <= 2; i++) {
        resourceTracker.track(new MockResource(`material${i}`), { 
          type: ResourceType.MATERIAL, 
          sceneId: `scene${i}`, 
          group: `group${i}` 
        });
      }
      
      resourceTracker.track(new MockResource('texture1'), { 
        type: ResourceType.TEXTURE, 
        sceneId: 'scene1', 
        group: 'group3' 
      });
    });

    it('should dispose resources by type', () => {
      const count = resourceTracker.disposeByType(ResourceType.MESH);
      expect(count).toBe(3);
      
      const remainingCount = resourceTracker.getAllResources().length;
      expect(remainingCount).toBe(3); // 2 materials + 1 texture
    });

    it('should dispose resources by scene', () => {
      const count = resourceTracker.disposeByScene('scene1');
      expect(count).toBe(3); // 1 mesh, 1 material, 1 texture
      
      const remainingCount = resourceTracker.getAllResources().length;
      expect(remainingCount).toBe(3); // 2 meshes, 1 material
    });

    it('should dispose resources by group', () => {
      const count = resourceTracker.disposeByGroup('group1');
      expect(count).toBe(2); // 1 mesh, 1 material
      
      const remainingCount = resourceTracker.getAllResources().length;
      expect(remainingCount).toBe(4); // 2 meshes, 1 material, 1 texture
    });

    it('should dispose all resources', () => {
      const count = resourceTracker.disposeAll();
      expect(count).toBe(6); // 3 meshes, 2 materials, 1 texture
      
      const remainingCount = resourceTracker.getAllResources().length;
      expect(remainingCount).toBe(0);
    });
  });

  describe('stats', () => {
    beforeEach(() => {
      // Set up test resources
      resourceTracker.track(new MockResource('mesh1'), { type: ResourceType.MESH, sceneId: 'scene1', group: 'group1' });
      resourceTracker.track(new MockResource('mesh2'), { type: ResourceType.MESH, sceneId: 'scene2', group: 'group2' });
      resourceTracker.track(new MockResource('material1'), { type: ResourceType.MATERIAL, sceneId: 'scene1', group: 'group1' });
      resourceTracker.track(new MockResource('texture1'), { type: ResourceType.TEXTURE, sceneId: 'scene1', group: 'group3' });
    });

    it('should provide accurate resource statistics', () => {
      const stats = resourceTracker.getStats();
      
      expect(stats.totalCount).toBe(4);
      expect(stats.countsByType[ResourceType.MESH]).toBe(2);
      expect(stats.countsByType[ResourceType.MATERIAL]).toBe(1);
      expect(stats.countsByType[ResourceType.TEXTURE]).toBe(1);
      expect(stats.countsByScene['scene1']).toBe(3);
      expect(stats.countsByScene['scene2']).toBe(1);
      expect(stats.countsByGroup['group1']).toBe(2);
      expect(stats.countsByGroup['group2']).toBe(1);
      expect(stats.countsByGroup['group3']).toBe(1);
    });
  });
}); 