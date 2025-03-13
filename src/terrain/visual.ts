import {
    Scene,
    StandardMaterial,
    Color3,
    Texture,
    GroundMesh,
    Vector3,
    MeshBuilder,
    ParticleSystem,
    Color4
} from '@babylonjs/core';
import { Logger } from '../utils/logger';
import { TerrainGenerator } from './generator';
import { SurfaceType, DefaultSurfaces } from '../types/physics';

/**
 * Options for terrain visual effects
 */
export interface TerrainVisualOptions {
    /**
     * Whether to show surface type colors
     */
    showSurfaceColors: boolean;

    /**
     * Whether to add snow/dust particles
     */
    addParticles: boolean;

    /**
     * Intensity of visual effects
     */
    effectIntensity: number;
}

/**
 * Handles visual rendering and effects for terrain
 */
export class TerrainVisual {
    private logger: Logger;
    private scene: Scene;
    private terrain: TerrainGenerator;
    private options: TerrainVisualOptions;
    private surfaceMaterials: Map<SurfaceType, StandardMaterial> = new Map();
    private particleSystems: ParticleSystem[] = [];

    /**
     * Create terrain visual handler
     * @param scene Babylon.js scene
     * @param terrain Terrain generator
     * @param options Visual rendering options
     */
    constructor(
        scene: Scene,
        terrain: TerrainGenerator,
        options: Partial<TerrainVisualOptions> = {}
    ) {
        this.logger = new Logger('TerrainVisual');
        this.scene = scene;
        this.terrain = terrain;

        // Merge default options with provided options
        this.options = {
            showSurfaceColors: true,
            addParticles: true,
            effectIntensity: 0.5,
            ...options
        };

        this.initializeMaterials();
    }

    /**
     * Initialize materials for different surface types
     */
    private initializeMaterials(): void {
        if (!this.options.showSurfaceColors) {
            return;
        }

        for (const typeKey in SurfaceType) {
            const type = Number(typeKey);
            if (!isNaN(type)) {
                const material = new StandardMaterial(`surface_material_${typeKey}`, this.scene);

                // Configure material based on surface type
                switch (type) {
                    case SurfaceType.DEFAULT:
                        material.diffuseColor = new Color3(0.5, 0.5, 0.5); // Gray
                        break;
                    case SurfaceType.SKIABLE:
                        material.diffuseColor = new Color3(0.7, 0.8, 1.0); // Light blue
                        break;
                    case SurfaceType.ICE:
                        material.diffuseColor = new Color3(0.8, 0.9, 1.0); // Very light blue
                        material.specularColor = new Color3(1, 1, 1);
                        material.specularPower = 64;
                        break;
                    case SurfaceType.ROUGH:
                        material.diffuseColor = new Color3(0.6, 0.4, 0.2); // Brown
                        material.specularColor = new Color3(0.2, 0.2, 0.2);
                        break;
                    case SurfaceType.BOUNCE:
                        material.diffuseColor = new Color3(1.0, 0.3, 0.3); // Red
                        material.emissiveColor = new Color3(0.5, 0.1, 0.1);
                        break;
                }

                // Add some basic texture or additional effects
                if (type !== SurfaceType.DEFAULT) {
                    material.specularTexture = new Texture(this.getTextureForSurfaceType(type), this.scene);
                }

                this.surfaceMaterials.set(type, material);
            }
        }
    }

    /**
     * Get a texture path for a specific surface type
     * @param surfaceType Surface type to get texture for
     */
    private getTextureForSurfaceType(surfaceType: SurfaceType): string {
        // In a real implementation, you'd have actual texture paths
        // For now, we'll use placeholder/procedural textures
        switch (surfaceType) {
            case SurfaceType.SKIABLE:
                return 'textures/snow.jpg';
            case SurfaceType.ICE:
                return 'textures/ice.jpg';
            case SurfaceType.ROUGH:
                return 'textures/rock.jpg';
            case SurfaceType.BOUNCE:
                return 'textures/bounce.jpg';
            default:
                return 'textures/default.jpg';
        }
    }

    /**
     * Apply visual effects to terrain mesh
     * @param terrainMesh Terrain mesh to apply effects to
     */
    public applyTerrainEffects(terrainMesh: GroundMesh): void {
        const mesh = terrainMesh;

        // Apply surface type colors if enabled
        if (this.options.showSurfaceColors && this.terrain.getSurfaceMapData()) {
            this.colorTerrainBySurfaceType(mesh);
        }

        // Add particle effects if enabled
        if (this.options.addParticles) {
            this.createTerrainParticles(mesh);
        }
    }

    /**
     * Color terrain mesh based on surface types
     * @param mesh Terrain mesh to color
     */
    private colorTerrainBySurfaceType(mesh: GroundMesh): void {
        const surfaceMap = this.terrain.getSurfaceMapData();
        const heightMap = this.terrain.getHeightMapData();

        if (!surfaceMap || !heightMap) {
            this.logger.warn('Cannot color terrain: no surface or height map');
            return;
        }

        const width = Math.floor(this.terrain.getWidth() * this.terrain.getResolution()) + 1;
        const colors: number[] = [];

        for (let i = 0; i < surfaceMap.length; i++) {
            const surfaceType = surfaceMap[i] as SurfaceType;
            const height = heightMap[i];

            // Get color based on surface type
            const material = this.surfaceMaterials.get(surfaceType) || this.surfaceMaterials.get(SurfaceType.DEFAULT)!;
            const color = material.diffuseColor;

            // Add some height-based variation
            const heightVariation = height * 0.2;
            colors.push(
                color.r + heightVariation,
                color.g + heightVariation,
                color.b + heightVariation,
                1.0
            );
        }

        // Set vertex colors
        mesh.setVerticesData('color', colors);
    }

    /**
     * Create terrain particle effects
     * @param mesh Terrain mesh to add particles to
     */
    private createTerrainParticles(mesh: GroundMesh): void {
        const particleSystem = new ParticleSystem('terrain_particles', 2000, this.scene);

        // Configure emitter
        particleSystem.emitter = mesh;

        // Particle texture and blending
        particleSystem.particleTexture = new Texture('textures/snow_particle.png', this.scene);
        particleSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;

        // Particle emission properties
        particleSystem.minEmitBox = new Vector3(
            -this.terrain.getWidth() / 2,
            this.terrain.getMaxHeight() + 1,
            -this.terrain.getDepth() / 2
        );
        particleSystem.maxEmitBox = new Vector3(
            this.terrain.getWidth() / 2,
            this.terrain.getMaxHeight() + 2,
            this.terrain.getDepth() / 2
        );

        // Particle color and size
        particleSystem.color1 = new Color4(1, 1, 1, 0.2);
        particleSystem.color2 = new Color4(1, 1, 1, 0.1);
        particleSystem.colorDead = new Color4(1, 1, 1, 0);

        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.5;

        // Particle movement
        particleSystem.minLifeTime = 2;
        particleSystem.maxLifeTime = 5;

        particleSystem.emitRate = 100 * this.options.effectIntensity;

        particleSystem.gravity = new Vector3(0, -0.5, 0);

        particleSystem.minEmitPower = 0.5;
        particleSystem.maxEmitPower = 1.5;

        particleSystem.updateSpeed = 0.005;

        // Start particle system
        particleSystem.start();

        this.particleSystems.push(particleSystem);
    }

    /**
     * Create highlights or terrain details
     * @param mesh Terrain mesh to add details to
     */
    public addTerrainDetails(mesh: GroundMesh): void {
        // Add terrain details like snow caps, rocky areas
        const detailMesh = MeshBuilder.CreateGroundFromHeightMap(
            'terrain_details',
            this.getHeightMapTexture(),
            {
                width: this.terrain.getWidth(),
                height: this.terrain.getDepth(),
                subdivisions: 100,
                minHeight: 0,
                maxHeight: this.terrain.getMaxHeight() * 1.2
            },
            this.scene
        );

        // Position and parent the detail mesh
        detailMesh.position = mesh.position;
        detailMesh.parent = mesh;

        // Create a material for details
        const detailMaterial = new StandardMaterial('terrain_detail_material', this.scene);
        detailMaterial.diffuseTexture = new Texture('textures/terrain_detail.jpg', this.scene);
        detailMaterial.specularTexture = new Texture('textures/terrain_spec.jpg', this.scene);
        detailMaterial.emissiveTexture = new Texture('textures/terrain_emissive.jpg', this.scene);

        detailMesh.material = detailMaterial;
    }

    /**
     * Get height map texture (placeholder implementation)
     */
    private getHeightMapTexture(): string {
        // In a real implementation, this would generate or load a height map texture
        return 'textures/height_map.png';
    }

    /**
     * Update visual effects
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Optional: Add dynamic visual effects based on time or game state
        this.particleSystems.forEach(system => {
            // Adjust particle emission or properties dynamically
            system.emitRate = 100 * this.options.effectIntensity * (1 + Math.sin(this.scene.getEngine().getDeltaTime() * 0.001));
        });
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Dispose materials
        this.surfaceMaterials.forEach((material) => {
            material.dispose();
        });
        this.surfaceMaterials.clear();

        // Dispose particle systems
        this.particleSystems.forEach((particleSystem) => {
            particleSystem.dispose();
        });
        this.particleSystems = [];

        this.logger.debug('Terrain visual effects disposed');
    }
}
