import { Scene, Engine, Camera, Light, Mesh, Material, Vector3 } from 'babylonjs';

/**
 * Light types supported by the renderer
 */
export enum LightType {
    POINTLIGHT = 'pointLight',
    DIRECTIONALLIGHT = 'directionalLight',
    SPOTLIGHT = 'spotLight',
    HEMISPHERICLIGHT = 'hemisphericLight'
}

/**
 * Configuration for the renderer
 */
export interface RendererConfig {
    canvasId: string;
    antialiasing: boolean;
    scene: {
        clearColor: { r: number; g: number; b: number };
        ambientIntensity: number;
        fog?: boolean;
        fogDensity?: number;
        fogColor?: { r: number; g: number; b: number };
    };
    camera: {
        position: { x: number; y: number; z: number };
        target: { x: number; y: number; z: number };
        fov: number;
        nearClip: number;
        farClip: number;
    };
    performance: {
        hardwareScaling: boolean;
    };
}

/**
 * Interface for the renderer system
 */
export interface IRendererSystem {
    /**
     * Initialize the renderer
     * @param config Renderer configuration
     * @throws {RendererError} If initialization fails
     */
    initialize(config: RendererConfig): void;

    /**
     * Get the Babylon.js scene
     */
    getScene(): Scene;

    /**
     * Get the Babylon.js engine
     */
    getEngine(): Engine;

    /**
     * Get the main camera
     */
    getCamera(): Camera;

    /**
     * Set the main camera
     * @param camera Camera to set as main
     */
    setCamera(camera: Camera): void;

    /**
     * Create a new mesh
     * @param name Mesh name
     * @param type Mesh type (e.g., 'box', 'sphere')
     * @param options Mesh creation options
     */
    createMesh(name: string, type: string, options?: any): Mesh;

    /**
     * Create a new light
     * @param type Light type
     * @param name Light name
     * @param position Light position
     */
    createLight(type: LightType, name: string, position: Vector3): Light;

    /**
     * Create a new material
     * @param name Material name
     * @param type Material type
     * @param options Material creation options
     */
    createMaterial(name: string, type: string, options?: any): Material;

    /**
     * Enable/disable debug layer
     * @param enabled Whether to enable debug layer
     */
    setDebugLayer(enabled: boolean): void;

    /**
     * Enable/disable inspector
     * @param enabled Whether to enable inspector
     */
    setInspector(enabled: boolean): void;

    /**
     * Update the renderer
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;

    /**
     * Resize the renderer
     */
    resize(): void;

    /**
     * Clean up resources
     */
    dispose(): void;
} 