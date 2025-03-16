import * as BABYLON from 'babylonjs';
import { IRendererSystem, RendererConfig, LightType } from './IRendererSystem';
import { RendererError } from '../../utils/errors/RendererError';
import { EventBus } from '../events/EventBus';
import { 
    Scene, 
    Engine, 
    Camera,
    Light,
    ShadowGenerator,
    PostProcess,
    DefaultRenderingPipeline,
    CubeTexture,
    ParticleSystem,
    Mesh,
    Color4,
    Vector3,
    FreeCamera,
    TargetCamera,
    DirectionalLight,
    PointLight,
    SpotLight,
    HemisphericLight,
    PhysicsImpostor,
    IPhysicsCollisionEvent,
    AbstractMesh
} from 'babylonjs';

/**
 * Implementation of the renderer system using Babylon.js
 */
export class RendererSystem implements IRendererSystem {
    private static instance: RendererSystem;
    private initialized: boolean = false;
    private engine: Engine | null = null;
    private scene: Scene | null = null;
    private mainCamera: Camera | null = null;
    private eventBus: EventBus;
    private shadowGenerators: Map<string, ShadowGenerator> = new Map();
    private postProcessPipeline: DefaultRenderingPipeline | null = null;
    private particleSystems: Map<string, ParticleSystem> = new Map();

    private constructor() {
        this.eventBus = EventBus.getInstance();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): RendererSystem {
        if (!RendererSystem.instance) {
            RendererSystem.instance = new RendererSystem();
        }
        return RendererSystem.instance;
    }

    /**
     * Initialize the renderer
     */
    public initialize(config: RendererConfig): void {
        if (this.initialized) {
            throw new RendererError('initialization', 'Renderer is already initialized');
        }

        try {
            // Get canvas
            const element = document.getElementById(config.canvasId);
            if (!element || !(element instanceof HTMLCanvasElement)) {
                throw new RendererError('initialization', `Canvas with id '${config.canvasId}' not found or is not a canvas element`);
            }
            const canvas = element;

            // Create engine
            this.engine = new BABYLON.Engine(
                canvas,
                config.antialiasing,
                {
                    preserveDrawingBuffer: true,
                    stencil: true,
                    adaptToDeviceRatio: true,
                    powerPreference: "high-performance"
                }
            );

            // Create scene
            this.scene = new BABYLON.Scene(this.engine);
            this.scene.clearColor = new BABYLON.Color4(
                config.scene.clearColor.r,
                config.scene.clearColor.g,
                config.scene.clearColor.b,
                1
            );

            // Set up ambient lighting
            if (config.scene.ambientIntensity > 0) {
                const hemisphericLight = new BABYLON.HemisphericLight(
                    "ambient",
                    new BABYLON.Vector3(0, 1, 0),
                    this.scene
                );
                hemisphericLight.intensity = config.scene.ambientIntensity;
            }

            // Set up fog
            if (config.scene.fog) {
                this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
                this.scene.fogDensity = config.scene.fogDensity || 0.1;
                if (config.scene.fogColor) {
                    this.scene.fogColor = new BABYLON.Color3(
                        config.scene.fogColor.r,
                        config.scene.fogColor.g,
                        config.scene.fogColor.b
                    );
                }
            }

            // Create default camera
            const freeCamera = new BABYLON.FreeCamera(
                "mainCamera",
                new BABYLON.Vector3(
                    config.camera.position.x,
                    config.camera.position.y,
                    config.camera.position.z
                ),
                this.scene
            );
            
            // Cast to TargetCamera for setTarget
            (freeCamera as BABYLON.TargetCamera).setTarget(new BABYLON.Vector3(
                config.camera.target.x,
                config.camera.target.y,
                config.camera.target.z
            ));
            
            this.mainCamera = freeCamera;
            this.mainCamera.attachControl(canvas, true);
            this.mainCamera.fov = config.camera.fov * Math.PI / 180;
            this.mainCamera.minZ = config.camera.nearClip;
            this.mainCamera.maxZ = config.camera.farClip;

            // Set up performance options
            if (config.performance.hardwareScaling) {
                this.engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
            }

            // Set up resize handling
            window.addEventListener('resize', () => this.resize());

            // Enable physics
            this.scene.enablePhysics();

            // Setup post-processing
            this.setupPostProcessing();

            // Start render loop
            this.engine.runRenderLoop(() => {
                if (this.scene) {
                    this.scene.render();
                }
            });

            this.initialized = true;
            this.eventBus.emit('renderer:initialized', { success: true });

        } catch (error) {
            this.eventBus.emit('renderer:initialized', { 
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new RendererError('initialization', 'Failed to initialize renderer', error as Error);
        }
    }

    public getScene(): Scene {
        if (!this.scene) {
            throw new RendererError('getScene', 'Scene is not initialized');
        }
        return this.scene;
    }

    public getEngine(): Engine {
        if (!this.engine) {
            throw new RendererError('getEngine', 'Engine is not initialized');
        }
        return this.engine;
    }

    public getCamera(): Camera {
        if (!this.mainCamera) {
            throw new RendererError('getCamera', 'Camera is not initialized');
        }
        return this.mainCamera;
    }

    public setCamera(camera: Camera): void {
        if (!this.scene) {
            throw new RendererError('setCamera', 'Scene is not initialized', undefined);
        }

        try {
            // Store the original camera position and target
            const position = camera.position.clone();
            let target = new Vector3(0, 0, 0);

            // If it's a TargetCamera, get its target
            if (camera instanceof TargetCamera) {
                target = camera.target.clone();
            }

            // Create a new FreeCamera and cast it to TargetCamera
            const freeCamera = new FreeCamera("mainCamera", position, this.scene) as TargetCamera;
            freeCamera.setTarget(target);

            // Set as main and active camera
            this.mainCamera = freeCamera;
            this.scene.activeCamera = freeCamera;
        } catch (error) {
            throw new RendererError('setCamera', 'Failed to set camera', error as Error);
        }
    }

    public createMesh(name: string, type: string, options?: any): Mesh {
        if (!this.scene) {
            throw new RendererError('createMesh', 'Scene is not initialized');
        }

        try {
            let mesh: Mesh;

            switch (type.toLowerCase()) {
                case 'box':
                    mesh = BABYLON.MeshBuilder.CreateBox(name, options, this.scene);
                    break;
                case 'sphere':
                    mesh = BABYLON.MeshBuilder.CreateSphere(name, options, this.scene);
                    break;
                case 'cylinder':
                    mesh = BABYLON.MeshBuilder.CreateCylinder(name, options, this.scene);
                    break;
                case 'plane':
                    mesh = BABYLON.MeshBuilder.CreatePlane(name, options, this.scene);
                    break;
                case 'ground':
                    mesh = BABYLON.MeshBuilder.CreateGround(name, options, this.scene);
                    break;
                default:
                    throw new RendererError('createMesh', `Unknown mesh type: ${type}`);
            }

            return mesh;
        } catch (error) {
            throw new RendererError('createMesh', `Failed to create mesh of type ${type}`, error as Error);
        }
    }

    public createLight(type: LightType, name: string, position: Vector3): Light {
        if (!this.scene) {
            throw new RendererError('createLight', 'Scene is not initialized');
        }

        let light: Light;

        switch (type) {
            case LightType.POINTLIGHT:
                light = new PointLight(name, position, this.scene);
                break;
            case LightType.DIRECTIONALLIGHT:
                light = new DirectionalLight(name, position, this.scene);
                break;
            case LightType.SPOTLIGHT:
                light = new SpotLight(name, position, new Vector3(0, -1, 0), Math.PI / 3, 2, this.scene);
                break;
            case LightType.HEMISPHERICLIGHT:
                light = new HemisphericLight(name, position, this.scene);
                break;
            default:
                throw new RendererError('createLight', `Unsupported light type: ${type}`);
        }

        // Create shadow generator for the light
        if (light instanceof DirectionalLight || light instanceof SpotLight) {
            const shadowGenerator = new ShadowGenerator(1024, light);
            shadowGenerator.useExponentialShadowMap = true;
            this.shadowGenerators.set(name, shadowGenerator);
        }

        return light;
    }

    public createMaterial(name: string, type: string, options?: any): BABYLON.Material {
        if (!this.scene) {
            throw new RendererError('createMaterial', 'Scene is not initialized');
        }

        try {
            let material: BABYLON.Material;

            switch (type.toLowerCase()) {
                case 'standard':
                    material = new BABYLON.StandardMaterial(name, this.scene);
                    break;
                case 'pbr':
                    material = new BABYLON.PBRMaterial(name, this.scene);
                    break;
                case 'background':
                    material = new BABYLON.BackgroundMaterial(name, this.scene);
                    break;
                default:
                    throw new RendererError('createMaterial', `Unknown material type: ${type}`);
            }

            if (options) {
                Object.assign(material, options);
            }

            return material;
        } catch (error) {
            throw new RendererError('createMaterial', `Failed to create material of type ${type}`, error as Error);
        }
    }

    public setDebugLayer(enabled: boolean): void {
        if (!this.scene) {
            throw new RendererError('setDebugLayer', 'Scene is not initialized');
        }

        if (enabled) {
            this.scene.debugLayer.show();
        } else {
            this.scene.debugLayer.hide();
        }
    }

    public setInspector(enabled: boolean): void {
        if (!this.scene) {
            throw new RendererError('setInspector', 'Scene is not initialized');
        }

        if (enabled) {
            this.scene.debugLayer.show({
                embedMode: true,
            });
        } else {
            this.scene.debugLayer.hide();
        }
    }

    public update(deltaTime: number): void {
        // Additional update logic can be added here
        // Scene rendering is handled by the render loop
    }

    public resize(): void {
        if (this.engine) {
            this.engine.resize();
        }
    }

    public dispose(): void {
        if (this.scene) {
            this.scene.dispose();
            this.scene = null;
        }

        if (this.engine) {
            this.engine.dispose();
            this.engine = null;
        }

        this.mainCamera = null;
        this.initialized = false;

        // Clean up particle systems
        this.particleSystems.forEach(system => system.dispose());
        this.particleSystems.clear();

        // Clean up shadow generators
        this.shadowGenerators.forEach(generator => generator.dispose());
        this.shadowGenerators.clear();

        // Clean up post-processing
        if (this.postProcessPipeline) {
            this.postProcessPipeline.dispose();
            this.postProcessPipeline = null;
        }
    }

    private setupPostProcessing(): void {
        if (!this.scene || !this.mainCamera) {
            throw new RendererError('setupPostProcessing', 'Scene or camera not initialized', undefined);
        }

        try {
            this.postProcessPipeline = new DefaultRenderingPipeline(
                "defaultPipeline",
                true,
                this.scene,
                [this.mainCamera]
            );

            // Configure post-processing effects with null checks
            if (this.postProcessPipeline.imageProcessing) {
                this.postProcessPipeline.imageProcessing.contrast = 1.1;
                this.postProcessPipeline.imageProcessing.exposure = 1.0;
            }

            if (this.postProcessPipeline) {
                this.postProcessPipeline.bloomEnabled = true;
                this.postProcessPipeline.bloomThreshold = 0.8;
                this.postProcessPipeline.bloomWeight = 0.3;
                this.postProcessPipeline.chromaticAberrationEnabled = true;

                if (this.postProcessPipeline.chromaticAberration) {
                    this.postProcessPipeline.chromaticAberration.aberrationAmount = 1;
                }

                this.postProcessPipeline.depthOfFieldEnabled = true;
                if (this.postProcessPipeline.depthOfField) {
                    this.postProcessPipeline.depthOfField.focalLength = 150;
                }

                this.postProcessPipeline.fxaaEnabled = true;
            }
        } catch (error) {
            throw new RendererError('setupPostProcessing', 'Failed to setup post-processing pipeline', error as Error);
        }
    }

    public createParticleSystem(name: string, capacity: number, emitter: Mesh): ParticleSystem {
        if (!this.scene) {
            throw new RendererError('createParticleSystem', 'Scene not initialized', undefined);
        }

        const system = new ParticleSystem(name, capacity, this.scene);
        system.emitter = emitter;
        system.minEmitBox = new Vector3(-0.5, 0, -0.5);
        system.maxEmitBox = new Vector3(0.5, 0, 0.5);

        // Set default particle behavior
        system.color1 = new Color4(1, 1, 1, 1);
        system.color2 = new Color4(1, 1, 1, 1);
        system.colorDead = new Color4(0, 0, 0, 0);
        system.minSize = 0.1;
        system.maxSize = 0.5;
        system.minLifeTime = 0.3;
        system.maxLifeTime = 1.5;
        system.emitRate = 50;
        system.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        system.gravity = new Vector3(0, -9.81, 0);
        system.direction1 = new Vector3(-1, 8, 1);
        system.direction2 = new Vector3(1, 8, -1);
        system.minAngularSpeed = 0;
        system.maxAngularSpeed = Math.PI;

        this.particleSystems.set(name, system);
        return system;
    }

    public enableShadows(mesh: Mesh): void {
        this.shadowGenerators.forEach(generator => {
            generator.addShadowCaster(mesh);
            mesh.receiveShadows = true;
        });
    }
} 