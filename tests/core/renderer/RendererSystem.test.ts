import { RendererSystem } from '../../../src/core/renderer/RendererSystem';
import { RendererConfig, LightType } from '../../../src/core/renderer/IRendererSystem';
import { RendererError } from '../../../src/utils/errors/RendererError';
import { EventBus } from '../../../src/core/events/EventBus';
import * as BABYLON from 'babylonjs';
import type { Scene, Engine, Camera, FreeCamera, TargetCamera, Mesh, Light, Material, StandardMaterial, Color3 } from 'babylonjs';
import { Vector3 } from '../../../src/types/core/MathTypes';

jest.mock('../../../src/core/events/EventBus');

describe('RendererSystem', () => {
    let rendererSystem: RendererSystem;
    let eventBus: jest.Mocked<EventBus>;
    let mockCanvas: HTMLCanvasElement;
    let mockConfig: RendererConfig;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock canvas
        mockCanvas = document.createElement('canvas');
        mockCanvas.id = 'gameCanvas';
        document.body.appendChild(mockCanvas);

        // Mock event bus
        eventBus = EventBus.getInstance() as jest.Mocked<EventBus>;

        // Create test config
        mockConfig = {
            canvasId: 'gameCanvas',
            antialiasing: true,
            hdr: true,
            scene: {
                clearColor: { r: 0.2, g: 0.3, b: 0.4 },
                ambientIntensity: 0.5,
                fog: true,
                fogDensity: 0.1,
                fogColor: { r: 0.5, g: 0.5, b: 0.5 }
            },
            camera: {
                position: { x: 0, y: 5, z: -10 },
                target: { x: 0, y: 0, z: 0 },
                fov: 75,
                nearClip: 0.1,
                farClip: 1000
            },
            performance: {
                targetFps: 60,
                hardwareScaling: true,
                adaptiveQuality: true
            }
        };

        // Get system instance
        rendererSystem = RendererSystem.getInstance();
    });

    afterEach(() => {
        if (rendererSystem) {
            rendererSystem.dispose();
        }
        if (mockCanvas && mockCanvas.parentNode) {
            mockCanvas.parentNode.removeChild(mockCanvas);
        }
    });

    describe('Initialization', () => {
        it('should initialize with config', () => {
            expect(() => rendererSystem.initialize(mockConfig)).not.toThrow();
            expect(eventBus.emit).toHaveBeenCalledWith('renderer:initialized', { success: true });
        });

        it('should throw when initializing twice', () => {
            rendererSystem.initialize(mockConfig);
            expect(() => rendererSystem.initialize(mockConfig)).toThrow(RendererError);
        });

        it('should throw when canvas is not found', () => {
            mockConfig.canvasId = 'nonexistent';
            expect(() => rendererSystem.initialize(mockConfig)).toThrow(RendererError);
        });

        it('should set up scene with correct clear color', () => {
            rendererSystem.initialize(mockConfig);
            const scene: Scene = rendererSystem.getScene();
            expect(scene.clearColor.r).toBeCloseTo(mockConfig.scene.clearColor.r);
            expect(scene.clearColor.g).toBeCloseTo(mockConfig.scene.clearColor.g);
            expect(scene.clearColor.b).toBeCloseTo(mockConfig.scene.clearColor.b);
        });

        it('should set up camera with correct properties', () => {
            rendererSystem.initialize(mockConfig);
            const camera = rendererSystem.getCamera() as FreeCamera;
            expect(camera.position.x).toBe(mockConfig.camera.position.x);
            expect(camera.position.y).toBe(mockConfig.camera.position.y);
            expect(camera.position.z).toBe(mockConfig.camera.position.z);
            expect(camera.fov).toBeCloseTo(mockConfig.camera.fov * Math.PI / 180);
        });
    });

    describe('Scene Management', () => {
        beforeEach(() => {
            rendererSystem.initialize(mockConfig);
        });

        it('should create and return scene', () => {
            const scene: Scene = rendererSystem.getScene();
            expect(scene).toBeInstanceOf(BABYLON.Scene);
        });

        it('should create and return engine', () => {
            const engine: Engine = rendererSystem.getEngine();
            expect(engine).toBeInstanceOf(BABYLON.Engine);
        });

        it('should handle fog settings', () => {
            const scene: Scene = rendererSystem.getScene();
            const fogColor = mockConfig.scene.fogColor;
            expect(scene.fogMode).toBe(BABYLON.Scene.FOGMODE_EXP);
            expect(scene.fogDensity).toBe(mockConfig.scene.fogDensity);
            if (fogColor) {
                expect(scene.fogColor.r).toBeCloseTo(fogColor.r);
            }
        });
    });

    describe('Camera Management', () => {
        beforeEach(() => {
            rendererSystem.initialize(mockConfig);
        });

        it('should get default camera', () => {
            const camera = rendererSystem.getCamera();
            expect(camera).toBeInstanceOf(BABYLON.FreeCamera);
        });

        it('should set new camera', () => {
            const scene = rendererSystem.getScene();
            const newCamera = new BABYLON.FreeCamera('testCamera', new BABYLON.Vector3(0, 0, 0), scene);
            rendererSystem.setCamera(newCamera);
            expect(rendererSystem.getCamera()).toBe(newCamera);
        });

        it('should handle target camera conversion', () => {
            const scene = rendererSystem.getScene();
            const targetCamera = new BABYLON.TargetCamera('testCamera', new BABYLON.Vector3(0, 0, 0), scene);
            rendererSystem.setCamera(targetCamera);
            expect(rendererSystem.getCamera()).toBeInstanceOf(BABYLON.FreeCamera);
        });
    });

    describe('Mesh Creation', () => {
        beforeEach(() => {
            rendererSystem.initialize(mockConfig);
        });

        it('should create box mesh', () => {
            const box: Mesh = rendererSystem.createMesh('testBox', 'box', { size: 2 });
            expect(box).toBeInstanceOf(BABYLON.Mesh);
            expect(box.name).toBe('testBox');
        });

        it('should create sphere mesh', () => {
            const sphere: Mesh = rendererSystem.createMesh('testSphere', 'sphere', { diameter: 2 });
            expect(sphere).toBeInstanceOf(BABYLON.Mesh);
            expect(sphere.name).toBe('testSphere');
        });

        it('should throw on invalid mesh type', () => {
            expect(() => rendererSystem.createMesh('test', 'invalid', {})).toThrow(RendererError);
        });
    });

    describe('Light Creation', () => {
        beforeEach(() => {
            rendererSystem.initialize(mockConfig);
        });

        it('should create point light', () => {
            const light: Light = rendererSystem.createLight('testLight', LightType.POINTLIGHT);
            expect(light).toBeInstanceOf(BABYLON.PointLight);
            expect(light.name).toBe('testLight');
        });

        it('should create directional light', () => {
            const light: Light = rendererSystem.createLight('testLight', LightType.DIRECTIONALLIGHT);
            expect(light).toBeInstanceOf(BABYLON.DirectionalLight);
        });

        it('should create spot light', () => {
            const light: Light = rendererSystem.createLight('testLight', LightType.SPOTLIGHT);
            expect(light).toBeInstanceOf(BABYLON.SpotLight);
        });

        it('should create hemispheric light', () => {
            const light: Light = rendererSystem.createLight('testLight', LightType.HEMISPHERICLIGHT);
            expect(light).toBeInstanceOf(BABYLON.HemisphericLight);
        });

        it('should apply light options', () => {
            const light: Light = rendererSystem.createLight('testLight', LightType.POINTLIGHT, { intensity: 0.5 });
            expect(light.intensity).toBe(0.5);
        });
    });

    describe('Material Creation', () => {
        beforeEach(() => {
            rendererSystem.initialize(mockConfig);
        });

        it('should create standard material', () => {
            const material: Material = rendererSystem.createMaterial('testMaterial', 'standard');
            expect(material).toBeInstanceOf(BABYLON.StandardMaterial);
            expect(material.name).toBe('testMaterial');
        });

        it('should create PBR material', () => {
            const material: Material = rendererSystem.createMaterial('testMaterial', 'pbr');
            expect(material).toBeInstanceOf(BABYLON.PBRMaterial);
        });

        it('should create background material', () => {
            const material: Material = rendererSystem.createMaterial('testMaterial', 'background');
            expect(material).toBeInstanceOf(BABYLON.BackgroundMaterial);
        });

        it('should throw on invalid material type', () => {
            expect(() => rendererSystem.createMaterial('test', 'invalid')).toThrow(RendererError);
        });

        it('should apply material options', () => {
            const material = rendererSystem.createMaterial('testMaterial', 'standard', { 
                diffuseColor: new BABYLON.Color3(1, 0, 0)
            }) as StandardMaterial;
            expect(material.diffuseColor.r).toBe(1);
        });
    });

    describe('Debug Features', () => {
        beforeEach(() => {
            rendererSystem.initialize(mockConfig);
        });

        it('should toggle debug layer', () => {
            const scene: Scene = rendererSystem.getScene();
            const debugLayer = scene.debugLayer;
            const showSpy = jest.spyOn(debugLayer, 'show');
            const hideSpy = jest.spyOn(debugLayer, 'hide');

            rendererSystem.setDebugLayer(true);
            expect(showSpy).toHaveBeenCalled();

            rendererSystem.setDebugLayer(false);
            expect(hideSpy).toHaveBeenCalled();
        });

        it('should toggle inspector', () => {
            const scene: Scene = rendererSystem.getScene();
            const debugLayer = scene.debugLayer;
            const showSpy = jest.spyOn(debugLayer, 'show');
            const hideSpy = jest.spyOn(debugLayer, 'hide');

            rendererSystem.setInspector(true);
            expect(showSpy).toHaveBeenCalledWith({ embedMode: true });

            rendererSystem.setInspector(false);
            expect(hideSpy).toHaveBeenCalled();
        });
    });

    describe('Resource Management', () => {
        beforeEach(() => {
            rendererSystem.initialize(mockConfig);
        });

        it('should handle resize', () => {
            const engine: Engine = rendererSystem.getEngine();
            const resizeSpy = jest.spyOn(engine, 'resize');

            rendererSystem.resize();
            expect(resizeSpy).toHaveBeenCalled();
        });

        it('should clean up resources on dispose', () => {
            const scene: Scene = rendererSystem.getScene();
            const engine: Engine = rendererSystem.getEngine();
            const sceneDisposeSpy = jest.spyOn(scene, 'dispose');
            const engineDisposeSpy = jest.spyOn(engine, 'dispose');

            rendererSystem.dispose();
            expect(sceneDisposeSpy).toHaveBeenCalled();
            expect(engineDisposeSpy).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should throw when accessing scene before initialization', () => {
            expect(() => rendererSystem.getScene()).toThrow(RendererError);
        });

        it('should throw when accessing engine before initialization', () => {
            expect(() => rendererSystem.getEngine()).toThrow(RendererError);
        });

        it('should throw when accessing camera before initialization', () => {
            expect(() => rendererSystem.getCamera()).toThrow(RendererError);
        });

        it('should throw when creating mesh before initialization', () => {
            expect(() => rendererSystem.createMesh('test', 'box')).toThrow(RendererError);
        });

        it('should throw when creating light before initialization', () => {
            expect(() => rendererSystem.createLight('test', LightType.POINTLIGHT)).toThrow(RendererError);
        });

        it('should throw when creating material before initialization', () => {
            expect(() => rendererSystem.createMaterial('test', 'standard')).toThrow(RendererError);
        });
    });

    describe('Performance Features', () => {
        beforeEach(() => {
            rendererSystem.initialize(mockConfig);
        });

        it('should respect target FPS setting', () => {
            const engine: Engine = rendererSystem.getEngine();
            expect(engine.getFps()).toBeGreaterThan(0);
        });

        it('should handle hardware scaling', () => {
            const engine: Engine = rendererSystem.getEngine();
            const adaptiveScaling = engine.getHardwareScalingLevel();
            expect(adaptiveScaling).toBeGreaterThan(0);
        });

        it('should handle adaptive quality', () => {
            const scene: Scene = rendererSystem.getScene();
            const engine = scene.getEngine();
            expect(engine.getFps()).toBeGreaterThan(0);
        });

        it('should maintain performance under load', () => {
            const scene: Scene = rendererSystem.getScene();
            const engine: Engine = rendererSystem.getEngine();
            const initialFps = engine.getFps();

            // Create multiple meshes to simulate load
            for (let i = 0; i < 100; i++) {
                rendererSystem.createMesh(`box${i}`, 'box', { size: 1 });
            }

            // Simulate multiple frames
            for (let i = 0; i < 10; i++) {
                scene.render();
            }

            expect(engine.getFps()).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        beforeEach(() => {
            rendererSystem.initialize(mockConfig);
        });

        it('should handle zero-sized meshes', () => {
            const mesh: Mesh = rendererSystem.createMesh('zeroBox', 'box', { size: 0 });
            expect(mesh.getBoundingInfo().boundingBox.minimumWorld.length()).toBe(0);
        });

        it('should handle extreme camera positions', () => {
            const scene: Scene = rendererSystem.getScene();
            const camera = new BABYLON.FreeCamera('extremeCamera', new BABYLON.Vector3(1e6, 1e6, 1e6), scene);
            rendererSystem.setCamera(camera);
            expect(() => scene.render()).not.toThrow();
        });

        it('should handle invalid light positions', () => {
            const light = rendererSystem.createLight('invalidLight', LightType.POINTLIGHT) as BABYLON.PointLight;
            light.position = new BABYLON.Vector3(1e6, 1e6, 1e6);
            expect(() => rendererSystem.getScene().render()).not.toThrow();
        });

        it('should handle missing material textures', () => {
            const material = rendererSystem.createMaterial('missingTexture', 'standard') as StandardMaterial;
            material.diffuseTexture = new BABYLON.Texture('nonexistent.png', rendererSystem.getScene());
            expect(() => rendererSystem.getScene().render()).not.toThrow();
        });

        it('should handle rapid camera switches', () => {
            const scene: Scene = rendererSystem.getScene();
            for (let i = 0; i < 100; i++) {
                const camera = new BABYLON.FreeCamera(`camera${i}`, new BABYLON.Vector3(0, 0, 0), scene);
                rendererSystem.setCamera(camera);
            }
            expect(() => scene.render()).not.toThrow();
        });
    });

    describe('Advanced Features', () => {
        beforeEach(() => {
            rendererSystem.initialize(mockConfig);
        });

        it('should handle shadow generation', () => {
            const light: Light = rendererSystem.createLight('shadowLight', LightType.DIRECTIONALLIGHT);
            const shadowGenerator = new BABYLON.ShadowGenerator(1024, light as BABYLON.DirectionalLight);
            expect(shadowGenerator).toBeTruthy();
            expect(() => rendererSystem.getScene().render()).not.toThrow();
        });

        it('should handle post-processing', () => {
            const scene: Scene = rendererSystem.getScene();
            const camera = rendererSystem.getCamera();
            const pipeline = new BABYLON.DefaultRenderingPipeline('pipeline', true, scene, [camera]);
            expect(pipeline.isSupported).toBe(true);
            expect(() => scene.render()).not.toThrow();
        });

        it('should handle environment changes', () => {
            const scene: Scene = rendererSystem.getScene();
            scene.environmentTexture = new BABYLON.CubeTexture('', scene);
            scene.createDefaultSkybox();
            expect(() => scene.render()).not.toThrow();
        });

        it('should handle physics integration', () => {
            const scene: Scene = rendererSystem.getScene();
            const gravityVector = new BABYLON.Vector3(0, -9.81, 0);
            scene.enablePhysics(gravityVector, new BABYLON.CannonJSPlugin());
            expect(scene.getPhysicsEngine()).toBeTruthy();
        });

        it('should handle particle systems', () => {
            const scene: Scene = rendererSystem.getScene();
            const emitter = rendererSystem.createMesh('emitter', 'box', { size: 1 });
            const particleSystem = new BABYLON.ParticleSystem('particles', 2000, scene);
            particleSystem.emitter = emitter;
            expect(() => {
                particleSystem.start();
                scene.render();
            }).not.toThrow();
        });
    });

    describe('Memory Management', () => {
        beforeEach(() => {
            rendererSystem.initialize(mockConfig);
        });

        it('should clean up meshes on scene clear', () => {
            const scene: Scene = rendererSystem.getScene();
            const initialMeshCount = scene.meshes.length;

            // Create multiple meshes
            for (let i = 0; i < 10; i++) {
                rendererSystem.createMesh(`box${i}`, 'box', { size: 1 });
            }

            expect(scene.meshes.length).toBe(initialMeshCount + 10);
            scene.dispose();
            expect(scene.meshes.length).toBe(0);
        });

        it('should handle texture memory cleanup', () => {
            const scene: Scene = rendererSystem.getScene();
            const material = rendererSystem.createMaterial('texturedMaterial', 'standard') as StandardMaterial;
            const texture = new BABYLON.Texture('texture.png', scene);
            material.diffuseTexture = texture;

            const disposeSpy = jest.spyOn(texture, 'dispose');
            scene.dispose();
            expect(disposeSpy).toHaveBeenCalled();
        });

        it('should handle shader program cleanup', () => {
            const scene: Scene = rendererSystem.getScene();
            const material = rendererSystem.createMaterial('shaderMaterial', 'standard') as StandardMaterial;
            const disposeSpy = jest.spyOn(material, 'dispose');
            scene.dispose();
            expect(disposeSpy).toHaveBeenCalled();
        });
    });
}); 