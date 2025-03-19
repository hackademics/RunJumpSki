/**
 * @file tests/unit/core/renderer/CameraManager.test.ts
 * @description Unit tests for the CameraManager class
 */

import * as BABYLON from 'babylonjs';
import { CameraManager } from '../../../../src/core/renderer/CameraManager';
import { CameraType, FirstPersonCameraConfig } from '../../../../src/core/renderer/ICameraManager';
import { Entity } from '../../../../src/core/ecs/Entity';
import { IEntity } from '../../../../src/core/ecs/IEntity';
import { ICameraComponent } from '../../../../src/core/ecs/components/ICameraComponent';
import { IFirstPersonCameraComponent } from '../../../../src/core/ecs/components/IFirstPersonCameraComponent';

// Mock BabylonJS
jest.mock('babylonjs');

describe('CameraManager', () => {
  // Mocks
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockCamera: jest.Mocked<BABYLON.Camera>;
  let mockFreeCamera: jest.Mocked<BABYLON.FreeCamera>;
  let mockUniversalCamera: jest.Mocked<BABYLON.UniversalCamera>;
  let mockArcRotateCamera: jest.Mocked<BABYLON.ArcRotateCamera>;
  let mockFollowCamera: jest.Mocked<BABYLON.FollowCamera>;
  let mockEntity: IEntity;

  // System under test
  let cameraManager: CameraManager;

  beforeEach(() => {
    // Set up mock scene
    mockScene = {
      activeCamera: null,
      getEngine: jest.fn().mockReturnValue({
        getRenderingCanvas: jest.fn().mockReturnValue(document.createElement('canvas')),
      }),
    } as unknown as jest.Mocked<BABYLON.Scene>;

    // Set up mock cameras
    mockCamera = {
      attachControl: jest.fn(),
      dispose: jest.fn(),
      name: 'mockCamera',
      minZ: 0.1,
      maxZ: 1000,
    } as unknown as jest.Mocked<BABYLON.Camera>;

    mockFreeCamera = {
      ...mockCamera,
      setTarget: jest.fn(),
      fov: 0.8,
    } as unknown as jest.Mocked<BABYLON.FreeCamera>;

    mockUniversalCamera = {
      ...mockFreeCamera,
      speed: 1.0,
      angularSensibility: 1000,
      inertia: 0.5,
    } as unknown as jest.Mocked<BABYLON.UniversalCamera>;

    mockArcRotateCamera = {
      ...mockCamera,
      alpha: 0,
      beta: 0,
      radius: 10,
      setTarget: jest.fn(),
      lowerAlphaLimit: null,
      upperAlphaLimit: null,
      lowerBetaLimit: 0.01,
      upperBetaLimit: Math.PI - 0.01,
      lowerRadiusLimit: 0.1,
      upperRadiusLimit: 100,
      wheelPrecision: 0.1,
      pinchPrecision: 0.1,
      target: new BABYLON.Vector3(0, 0, 0),
    } as unknown as jest.Mocked<BABYLON.ArcRotateCamera>;

    mockFollowCamera = {
      ...mockCamera,
      radius: 10,
      heightOffset: 5,
      rotationOffset: 0,
      cameraAcceleration: 0.05,
      maxCameraSpeed: 20,
    } as unknown as jest.Mocked<BABYLON.FollowCamera>;

    // Mock camera constructors
    (BABYLON.FreeCamera as jest.Mock).mockImplementation(() => mockFreeCamera);
    (BABYLON.UniversalCamera as jest.Mock).mockImplementation(() => mockUniversalCamera);
    (BABYLON.ArcRotateCamera as jest.Mock).mockImplementation(() => mockArcRotateCamera);
    (BABYLON.FollowCamera as jest.Mock).mockImplementation(() => mockFollowCamera);

    // Set up mock entity
    mockEntity = new Entity('test-entity');
    jest.spyOn(mockEntity, 'addComponent');

    // Create the camera manager
    cameraManager = new CameraManager();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with a scene', () => {
      cameraManager.initialize(mockScene);

      // Should create a default camera if none exists
      expect(BABYLON.FreeCamera).toHaveBeenCalled();
      expect(mockFreeCamera.attachControl).toHaveBeenCalled();
    });

    it('should not create a camera if the scene already has an active camera', () => {
      mockScene.activeCamera = mockCamera;

      cameraManager.initialize(mockScene);

      // Should not create a new camera
      expect(BABYLON.FreeCamera).not.toHaveBeenCalled();
    });

    it('should throw an error if initialized twice', () => {
      cameraManager.initialize(mockScene);

      expect(() => cameraManager.initialize(mockScene)).toThrow(
        'CameraManager is already initialized'
      );
    });
  });

  describe('createCamera', () => {
    beforeEach(() => {
      cameraManager.initialize(mockScene);
    });

    it('should create a free camera', () => {
      const camera = cameraManager.createCamera({
        type: CameraType.FREE,
        name: 'testCamera',
        position: new BABYLON.Vector3(1, 2, 3),
        target: new BABYLON.Vector3(0, 0, 0),
        fov: 1.0,
        nearClip: 0.1,
        farClip: 100,
        setAsActive: true,
      });

      expect(camera).toBe(mockFreeCamera);
      expect(BABYLON.FreeCamera).toHaveBeenCalledWith(
        'testCamera',
        new BABYLON.Vector3(1, 2, 3),
        mockScene
      );
      expect(mockFreeCamera.setTarget).toHaveBeenCalledWith(new BABYLON.Vector3(0, 0, 0));
      expect(mockFreeCamera.fov).toBe(1.0);
      expect(mockFreeCamera.minZ).toBe(0.1);
      expect(mockFreeCamera.maxZ).toBe(100);
      expect(mockScene.activeCamera).toBe(mockFreeCamera);
    });

    it('should create a first-person camera', () => {
      const config: FirstPersonCameraConfig = {
        type: CameraType.FIRST_PERSON,
        name: 'fpCamera',
        position: new BABYLON.Vector3(1, 2, 3),
        movementSpeed: 5.0,
        rotationSpeed: 0.002,
        inertia: 0.8,
      };

      const camera = cameraManager.createCamera(config);

      expect(camera).toBe(mockUniversalCamera);
      expect(BABYLON.UniversalCamera).toHaveBeenCalledWith(
        'fpCamera',
        new BABYLON.Vector3(1, 2, 3),
        mockScene
      );
      expect(mockUniversalCamera.speed).toBe(5.0);
      expect(mockUniversalCamera.angularSensibility).toBe(500); // 1 / 0.002
      expect(mockUniversalCamera.inertia).toBe(0.8);
    });

    it('should create an arc rotate camera', () => {
      const camera = cameraManager.createCamera({
        type: CameraType.ARC_ROTATE,
        name: 'arcCamera',
        target: new BABYLON.Vector3(5, 5, 5),
        alpha: 1.5,
        beta: 1.2,
        radius: 15,
        lowerAlphaLimit: 0.5,
        upperAlphaLimit: 2.5,
      });

      expect(camera).toBe(mockArcRotateCamera);
      expect(BABYLON.ArcRotateCamera).toHaveBeenCalledWith(
        'arcCamera',
        1.5,
        1.2,
        15,
        new BABYLON.Vector3(5, 5, 5),
        mockScene
      );
      expect(mockArcRotateCamera.lowerAlphaLimit).toBe(0.5);
      expect(mockArcRotateCamera.upperAlphaLimit).toBe(2.5);
    });

    it('should create a follow camera', () => {
      const camera = cameraManager.createCamera({
        type: CameraType.FOLLOW,
        name: 'followCamera',
        distance: 8,
        heightOffset: 3,
        rotationOffset: 0.5,
        cameraAcceleration: 0.1,
      });

      expect(camera).toBe(mockFollowCamera);
      expect(BABYLON.FollowCamera).toHaveBeenCalledWith(
        'followCamera',
        expect.any(BABYLON.Vector3),
        mockScene
      );
      expect(mockFollowCamera.radius).toBe(8);
      expect(mockFollowCamera.heightOffset).toBe(3);
      expect(mockFollowCamera.rotationOffset).toBe(0.5);
      expect(mockFollowCamera.cameraAcceleration).toBe(0.1);
    });

    it('should throw an error if called before initialization', () => {
      const uninitializedManager = new CameraManager();

      expect(() => uninitializedManager.createCamera({ type: CameraType.FREE })).toThrow(
        'CameraManager is not initialized'
      );
    });
  });

  describe('createCameraComponent', () => {
    beforeEach(() => {
      cameraManager.initialize(mockScene);
    });

    it('should create a camera component and attach it to an entity', () => {
      const component = cameraManager.createCameraComponent(mockEntity, {
        type: CameraType.FREE,
        name: 'entityCamera',
      });

      expect(component).toBeDefined();
      expect(component.getCamera()).toBe(mockFreeCamera);
      expect(mockEntity.addComponent).toHaveBeenCalledWith(component);
    });

    it('should create a first-person camera component when requested', () => {
      const component = cameraManager.createCameraComponent(mockEntity, {
        type: CameraType.FIRST_PERSON,
        name: 'fpEntityCamera',
        movementSpeed: 8,
      });

      expect(component).toBeDefined();
      expect(component.type).toBe('firstPersonCamera');
      expect((component as IFirstPersonCameraComponent).getMovementSpeed()).toBe(8);
      expect(mockEntity.addComponent).toHaveBeenCalledWith(component);
    });

    it('should throw an error if entity is not provided', () => {
      expect(() =>
        cameraManager.createCameraComponent(null as unknown as IEntity, { type: CameraType.FREE })
      ).toThrow('Entity is required to create a camera component');
    });
  });

  describe('createFirstPersonCamera', () => {
    beforeEach(() => {
      cameraManager.initialize(mockScene);
    });

    it('should create a first-person camera component', () => {
      const config: FirstPersonCameraConfig = {
        type: CameraType.FIRST_PERSON,
        name: 'fpSpecificCamera',
        movementSpeed: 7,
        inertia: 0.7,
        positionOffset: new BABYLON.Vector3(0, 1.8, 0),
        minAngle: -1.5,
        maxAngle: 1.5,
      };

      const component = cameraManager.createFirstPersonCamera(mockEntity, config);

      expect(component).toBeDefined();
      expect(component.type).toBe('firstPersonCamera');
      expect(component.getMovementSpeed()).toBe(7);
      expect(component.getInertia()).toBe(0.7);
      expect(component.getPositionOffset()).toEqual(new BABYLON.Vector3(0, 1.8, 0));
      const limits = component.getAngleLimits();
      expect(limits.min).toBe(-1.5);
      expect(limits.max).toBe(1.5);
    });
  });

  describe('camera management', () => {
    beforeEach(() => {
      cameraManager.initialize(mockScene);
    });

    it('should get and set the active camera', () => {
      cameraManager.createCamera({ type: CameraType.FREE, name: 'camera1' });
      const camera2 = cameraManager.createCamera({ type: CameraType.FREE, name: 'camera2' });

      cameraManager.setActiveCamera(camera2);

      expect(cameraManager.getActiveCamera()).toBe(camera2);
      expect(mockScene.activeCamera).toBe(camera2);
    });

    it('should get a camera by name', () => {
      const camera = cameraManager.createCamera({ type: CameraType.FREE, name: 'namedCamera' });

      expect(cameraManager.getCameraByName('namedCamera')).toBe(camera);
      expect(cameraManager.getCameraByName('nonexistentCamera')).toBeNull();
    });

    it('should get all cameras', () => {
      const camera1 = cameraManager.createCamera({ type: CameraType.FREE, name: 'camera1' });
      const camera2 = cameraManager.createCamera({
        type: CameraType.FIRST_PERSON,
        name: 'camera2',
      });

      const allCameras = cameraManager.getAllCameras();

      expect(allCameras).toContain(camera1);
      expect(allCameras).toContain(camera2);
    });

    it('should get all camera components', () => {
      const component1 = cameraManager.createCameraComponent(mockEntity, {
        type: CameraType.FREE,
        name: 'comp1',
      });
      const component2 = cameraManager.createCameraComponent(mockEntity, {
        type: CameraType.FIRST_PERSON,
        name: 'comp2',
      });

      const allComponents = cameraManager.getAllCameraComponents();

      expect(allComponents).toContain(component1);
      expect(allComponents).toContain(component2);
    });

    it('should remove a camera by reference', () => {
      const camera = cameraManager.createCamera({ type: CameraType.FREE, name: 'cameraToRemove' });

      const result = cameraManager.removeCamera(camera);

      expect(result).toBe(true);
      expect(cameraManager.getCameraByName('cameraToRemove')).toBeNull();
    });

    it('should remove a camera by name', () => {
      cameraManager.createCamera({ type: CameraType.FREE, name: 'cameraToRemoveByName' });

      const result = cameraManager.removeCamera('cameraToRemoveByName');

      expect(result).toBe(true);
      expect(cameraManager.getCameraByName('cameraToRemoveByName')).toBeNull();
    });

    it('should return false when removing a non-existent camera', () => {
      expect(cameraManager.removeCamera('nonexistentCamera')).toBe(false);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      cameraManager.initialize(mockScene);
    });

    it('should update enabled camera components', () => {
      // Create a spy on ICameraComponent update method
      const updateSpy = jest.fn();

      // Create a mock camera component with a spied update method
      const mockComponent = {
        isEnabled: jest.fn().mockReturnValue(true),
        update: updateSpy,
        getCamera: jest.fn().mockReturnValue(mockCamera),
      } as unknown as ICameraComponent;

      // Add to manager's internal map
      (
        cameraManager as unknown as { cameraComponents: Map<string, ICameraComponent> }
      ).cameraComponents.set('test-entity', mockComponent);

      cameraManager.update(0.016); // Simulate 16ms frame

      expect(updateSpy).toHaveBeenCalledWith(0.016);
    });

    it('should not update disabled camera components', () => {
      // Create a spy on ICameraComponent update method
      const updateSpy = jest.fn();

      // Create a mock camera component with a spied update method
      const mockComponent = {
        isEnabled: jest.fn().mockReturnValue(false),
        update: updateSpy,
        getCamera: jest.fn().mockReturnValue(mockCamera),
      } as unknown as ICameraComponent;

      // Add to manager's internal map
      (
        cameraManager as unknown as { cameraComponents: Map<string, ICameraComponent> }
      ).cameraComponents.set('test-entity', mockComponent);

      cameraManager.update(0.016); // Simulate 16ms frame

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    beforeEach(() => {
      cameraManager.initialize(mockScene);
    });

    it('should dispose all cameras and clear references', () => {
      const camera1 = cameraManager.createCamera({ type: CameraType.FREE, name: 'camera1' });
      const camera2 = cameraManager.createCamera({
        type: CameraType.FIRST_PERSON,
        name: 'camera2',
      });

      cameraManager.dispose();

      expect(camera1.dispose).toHaveBeenCalled();
      expect(camera2.dispose).toHaveBeenCalled();
      expect(cameraManager.getAllCameras()).toHaveLength(0);
      expect(cameraManager.getAllCameraComponents()).toHaveLength(0);
      expect(cameraManager.getActiveCamera()).toBeNull();
    });
  });
});
