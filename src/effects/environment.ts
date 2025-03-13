import {
    Scene,
    Vector3,
    Color3,
    Color4,
    DirectionalLight,
    HemisphericLight,
    PointLight,
    ShadowGenerator,
    Mesh,
    Material,
    Texture,
    CubeTexture,
    ParticleSystem,
    Nullable,
    AbstractMesh,
    StandardMaterial,
    DynamicTexture,
    PostProcess,
    Effect,
    RenderTargetTexture,
    GlowLayer,
    HighlightLayer,
    TransformNode
} from '@babylonjs/core';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { MathUtils } from '../utils/math';

/**
 * Environment settings for the game
 */
export interface EnvironmentSettings {
    /**
     * Sky type
     */
    skyType: 'color' | 'skybox' | 'procedural';

    /**
     * Sky color (if using color sky)
     */
    skyColor?: Color3 | Color4;

    /**
     * Skybox texture paths (if using skybox)
     */
    skyboxTexturePaths?: string[];

    /**
     * Fog enabled flag
     */
    fogEnabled: boolean;

    /**
     * Fog type
     */
    fogType?: 'exp' | 'exp2' | 'linear';

    /**
     * Fog color
     */
    fogColor?: Color3;

    /**
     * Fog density or start/end distances
     */
    fogDensity?: number;
    fogStart?: number;
    fogEnd?: number;

    /**
     * Ambient light intensity
     */
    ambientIntensity: number;

    /**
     * Ambient light color
     */
    ambientColor?: Color3;

    /**
     * Directional light (sun) enabled flag
     */
    sunEnabled: boolean;

    /**
     * Sun direction
     */
    sunDirection?: Vector3;

    /**
     * Sun intensity
     */
    sunIntensity?: number;

    /**
     * Sun color
     */
    sunColor?: Color3;

    /**
     * Shadows enabled flag
     */
    shadowsEnabled: boolean;

    /**
     * Shadow quality (0-1)
     */
    shadowQuality?: number;

    /**
     * Weather type
     */
    weatherType?: 'clear' | 'cloudy' | 'foggy' | 'rain' | 'snow' | 'storm';

    /**
     * Weather intensity (0-1)
     */
    weatherIntensity?: number;

    /**
     * Wind direction
     */
    windDirection?: Vector3;

    /**
     * Wind strength
     */
    windStrength?: number;

    /**
     * Time of day (0-24)
     */
    timeOfDay?: number;

    /**
     * Environment reflection probe enabled flag
     */
    reflectionsEnabled?: boolean;

    /**
     * Reflection probe resolution
     */
    reflectionResolution?: number;

    /**
     * Post processing effects enabled flag
     */
    postProcessingEnabled?: boolean;
}

/**
 * Default environment settings
 */
const DefaultEnvironmentSettings: EnvironmentSettings = {
    skyType: 'color',
    skyColor: new Color4(0.5, 0.7, 1.0, 1.0),
    fogEnabled: true,
    fogType: 'exp2',
    fogColor: new Color3(0.7, 0.8, 1.0),
    fogDensity: 0.002,
    fogStart: 100,
    fogEnd: 1000,
    ambientIntensity: 0.3,
    ambientColor: new Color3(0.7, 0.7, 1.0),
    sunEnabled: true,
    sunDirection: new Vector3(0.5, -0.8, 0.2).normalize(),
    sunIntensity: 1.0,
    sunColor: new Color3(1.0, 0.95, 0.8),
    shadowsEnabled: true,
    shadowQuality: 0.5,
    weatherType: 'clear',
    weatherIntensity: 0,
    windDirection: new Vector3(1, 0, 0),
    windStrength: 0.1,
    timeOfDay: 12,
    reflectionsEnabled: false,
    reflectionResolution: 256,
    postProcessingEnabled: false
};

/**
 * Manages environment effects like lighting, weather, sky, etc.
 */
export class EnvironmentManager {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private settings: EnvironmentSettings;

    // Lights
    private ambientLight: HemisphericLight;
    private sunLight: Nullable<DirectionalLight> = null;

    // Shadows
    private shadowGenerator: Nullable<ShadowGenerator> = null;
    private shadowCasters: AbstractMesh[] = [];

    // Sky
    private skybox: Nullable<Mesh> = null;

    // Weather
    private rainParticles: Nullable<ParticleSystem> = null;
    private snowParticles: Nullable<ParticleSystem> = null;
    private fogParticles: Nullable<ParticleSystem> = null;
    private cloudsMesh: Nullable<Mesh> = null;

    // Reflection
    private reflectionProbe: Nullable<RenderTargetTexture> = null;

    // Post-processing
    private glowLayer: Nullable<GlowLayer> = null;
    private highlightLayer: Nullable<HighlightLayer> = null;

    // Time
    private elapsedTime: number = 0;
    private dayNightCycle: boolean = false;
    private dayLength: number = 600; // 10 minutes per in-game day

    // Wind
    private windVector: Vector3;

    /**
     * Create a new environment manager
     * @param scene The Babylon.js scene
     * @param events Event emitter
     * @param settings Optional environment settings
     */
    constructor(scene: Scene, events: IEventEmitter, settings: Partial<EnvironmentSettings> = {}) {
        this.logger = new Logger('EnvironmentManager');
        this.scene = scene;
        this.events = events;
        this.settings = { ...DefaultEnvironmentSettings, ...settings };
        this.windVector = this.settings.windDirection!.scale(this.settings.windStrength!);

        // Create basic ambient light (always present)
        this.ambientLight = new HemisphericLight(
            'ambientLight',
            new Vector3(0, 1, 0),
            this.scene
        );

        this.setupEnvironment();
        this.setupEventListeners();

        this.logger.info('Environment manager initialized');
    }

    /**
     * Set up initial environment
     */
    private setupEnvironment(): void {
        // Apply environment settings
        this.applySettings(this.settings);

        // Register render loop for updates
        this.scene.registerBeforeRender(() => {
            this.update(this.scene.getEngine().getDeltaTime() / 1000);
        });
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Listen for environment change events
        this.events.on(GameEvent.ENVIRONMENT_CHANGE, (data) => {
            if (data.settings) {
                this.applySettings(data.settings);
            }
        });

        // Listen for time change events
        this.events.on(GameEvent.TIME_CHANGE, (data) => {
            if (data.time !== undefined) {
                this.setTimeOfDay(data.time);
            }
        });

        // Listen for weather change events
        this.events.on(GameEvent.WEATHER_CHANGE, (data) => {
            if (data.type) {
                this.setWeather(data.type, data.intensity);
            }
        });
    }

    /**
     * Apply environment settings
     * @param settings Settings to apply
     */
    public applySettings(settings: Partial<EnvironmentSettings>): void {
        // Update settings
        this.settings = { ...this.settings, ...settings };

        // Apply settings
        this.setupSky();
        this.setupFog();
        this.setupLighting();
        this.setupShadows();
        this.setupWeather();
        this.setupReflections();
        this.setupPostProcessing();

        // Update wind vector
        this.windVector = this.settings.windDirection!.scale(this.settings.windStrength!);

        this.logger.debug('Applied environment settings');
    }

    /**
     * Set up the sky based on current settings
     */
    private setupSky(): void {
        // Remove existing skybox if present
        if (this.skybox) {
            this.skybox.dispose();
            this.skybox = null;
        }

        // Set scene clear color based on sky color or fog color
        if (this.settings.skyType === 'color') {
            this.scene.clearColor = this.settings.skyColor as Color4;
        } else if (this.settings.fogEnabled) {
            this.scene.clearColor = new Color4(
                this.settings.fogColor!.r,
                this.settings.fogColor!.g,
                this.settings.fogColor!.b,
                1.0
            );
        }

        // Create skybox if needed
        if (this.settings.skyType === 'skybox') {
            // Create skybox mesh
            this.skybox = Mesh.CreateBox('skyBox', 1000.0, this.scene);
            this.skybox.infiniteDistance = true;

            // Create skybox material
            const skyboxMaterial = new StandardMaterial('skyBoxMaterial', this.scene);
            skyboxMaterial.backFaceCulling = false;

            // Use cube texture if paths are provided
            if (this.settings.skyboxTexturePaths && this.settings.skyboxTexturePaths.length === 6) {
                skyboxMaterial.reflectionTexture = CubeTexture.CreateFromImages(
                    this.settings.skyboxTexturePaths,
                    this.scene
                );
                skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
                skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
                skyboxMaterial.specularColor = new Color3(0, 0, 0);
            } else {
                // Fallback to simple color
                skyboxMaterial.diffuseColor = this.settings.skyColor as Color3;
            }

            this.skybox.material = skyboxMaterial;
        } else if (this.settings.skyType === 'procedural') {
            // Create procedural sky (simplified)
            this.createProceduralSky();
        }
    }

    /**
     * Create a procedural sky with dynamic time of day effects
     */
    private createProceduralSky(): void {
        // Create skybox mesh
        this.skybox = Mesh.CreateBox('skyBox', 1000.0, this.scene);
        this.skybox.infiniteDistance = true;

        // Create dynamic texture for procedural sky
        const size = 1024;
        const skyTexture = new DynamicTexture('skyTexture', size, this.scene, true);
        const ctx = skyTexture.getContext();

        // Draw gradient sky based on time of day
        const timeOfDay = this.settings.timeOfDay || 12;
        this.drawSkyGradient(ctx, size, timeOfDay);

        skyTexture.update();

        // Create material
        const skyMaterial = new StandardMaterial('skyMaterial', this.scene);
        skyMaterial.backFaceCulling = false;
        skyMaterial.emissiveTexture = skyTexture;
        skyMaterial.diffuseColor = new Color3(0, 0, 0);
        skyMaterial.specularColor = new Color3(0, 0, 0);

        this.skybox.material = skyMaterial;
    }

    /**
     * Draw sky gradient based on time of day
     * @param ctx Canvas context
     * @param size Texture size
     * @param timeOfDay Time of day (0-24)
     */
    private drawSkyGradient(ctx: CanvasRenderingContext2D, size: number, timeOfDay: number): void {
        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Determine sky colors based on time of day
        let topColor: string;
        let bottomColor: string;

        // Sunrise: 6am
        // Noon: 12pm
        // Sunset: 18pm
        // Night: 0am

        if (timeOfDay >= 6 && timeOfDay < 8) {
            // Sunrise
            const t = (timeOfDay - 6) / 2;
            topColor = this.lerpColor('#1a2236', '#5d8dd2', t);
            bottomColor = this.lerpColor('#4d5e94', '#ffc688', t);
        } else if (timeOfDay >= 8 && timeOfDay < 16) {
            // Day
            const t = (timeOfDay - 8) / 8;
            topColor = this.lerpColor('#5d8dd2', '#3a76cc', t);
            bottomColor = this.lerpColor('#ffc688', '#a7d4f7', t);
        } else if (timeOfDay >= 16 && timeOfDay < 20) {
            // Sunset
            const t = (timeOfDay - 16) / 4;
            topColor = this.lerpColor('#3a76cc', '#1a2236', t);
            bottomColor = this.lerpColor('#a7d4f7', '#f7a55d', t);
        } else {
            // Night
            const t = (timeOfDay < 6) ? timeOfDay / 6 : (timeOfDay - 20) / 4;
            topColor = '#1a2236';
            bottomColor = this.lerpColor('#33446b', '#1a2236', t);
        }

        // Draw gradient
        const grd = ctx.createLinearGradient(0, 0, 0, size);
        grd.addColorStop(0, topColor);
        grd.addColorStop(1, bottomColor);

        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, size, size);

        // Draw sun or moon based on time (simplified)
        if (timeOfDay >= 6 && timeOfDay < 20) {
            // Draw sun
            const sunPos = (timeOfDay - 6) / 14;
            const sunX = size * 0.5;
            const sunY = size * (0.9 - 0.8 * Math.sin(sunPos * Math.PI));
            const sunRadius = size * 0.05;

            ctx.beginPath();
            ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);

            // Sun color based on time
            const sunAlpha = (timeOfDay > 17 || timeOfDay < 7) ? 0.8 : 1.0;

            if (timeOfDay < 8) {
                ctx.fillStyle = `rgba(255, 200, 150, ${sunAlpha})`;
            } else if (timeOfDay > 17) {
                ctx.fillStyle = `rgba(255, 150, 100, ${sunAlpha})`;
            } else {
                ctx.fillStyle = `rgba(255, 245, 220, ${sunAlpha})`;
            }

            ctx.fill();

            // Add glow
            const glow = ctx.createRadialGradient(
                sunX, sunY, sunRadius * 0.7,
                sunX, sunY, sunRadius * 3
            );
            glow.addColorStop(0, `rgba(255, 255, 220, 0.4)`);
            glow.addColorStop(1, 'rgba(255, 255, 220, 0)');

            ctx.beginPath();
            ctx.arc(sunX, sunY, sunRadius * 3, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();
        } else {
            // Draw moon at night
            const moonPos = (timeOfDay > 20) ? (timeOfDay - 20) / 10 : (timeOfDay + 4) / 10;
            const moonX = size * 0.5;
            const moonY = size * (0.9 - 0.8 * Math.sin(moonPos * Math.PI));
            const moonRadius = size * 0.03;

            ctx.beginPath();
            ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(240, 240, 255, 0.9)';
            ctx.fill();

            // Add glow
            const glow = ctx.createRadialGradient(
                moonX, moonY, moonRadius * 0.7,
                moonX, moonY, moonRadius * 3
            );
            glow.addColorStop(0, 'rgba(200, 200, 255, 0.3)');
            glow.addColorStop(1, 'rgba(200, 200, 255, 0)');

            ctx.beginPath();
            ctx.arc(moonX, moonY, moonRadius * 3, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();
        }

        // Draw stars at night
        if (timeOfDay < 6 || timeOfDay > 18) {
            // Determine star visibility (0 = not visible, 1 = fully visible)
            let starVisibility = 0;

            if (timeOfDay < 6) {
                starVisibility = 1 - timeOfDay / 6;
            } else if (timeOfDay > 18) {
                starVisibility = (timeOfDay - 18) / 6;
            }

            // Draw stars with varying brightness
            const numStars = 100;
            ctx.fillStyle = 'white';

            for (let i = 0; i < numStars; i++) {
                const x = Math.random() * size;
                const y = Math.random() * (size * 0.7); // Stars only in upper part of sky
                const radius = Math.random() * 1.5 + 0.5;
                const alpha = Math.random() * 0.5 * starVisibility + 0.2 * starVisibility;

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fill();
            }
        }
    }

    /**
     * Interpolate between two colors in hex format
     * @param color1 Starting color in hex format (e.g., '#ff0000')
     * @param color2 Ending color in hex format
     * @param factor Interpolation factor (0-1)
     * @returns Interpolated color in hex format
     */
    private lerpColor(color1: string, color2: string, factor: number): string {
        // Convert hex colors to RGB
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);

        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);

        // Interpolate RGB values
        const r = Math.round(MathUtils.lerp(r1, r2, factor));
        const g = Math.round(MathUtils.lerp(g1, g2, factor));
        const b = Math.round(MathUtils.lerp(b1, b2, factor));

        // Convert back to hex
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    /**
     * Set up fog based on current settings
     */
    private setupFog(): void {
        if (this.settings.fogEnabled) {
            // Enable fog
            this.scene.fogMode = Scene.FOGMODE_EXP2;
            this.scene.fogColor = this.settings.fogColor!;

            // Set fog parameters based on type
            if (this.settings.fogType === 'exp') {
                this.scene.fogMode = Scene.FOGMODE_EXP;
                this.scene.fogDensity = this.settings.fogDensity!;
            } else if (this.settings.fogType === 'exp2') {
                this.scene.fogMode = Scene.FOGMODE_EXP2;
                this.scene.fogDensity = this.settings.fogDensity!;
            } else if (this.settings.fogType === 'linear') {
                this.scene.fogMode = Scene.FOGMODE_LINEAR;
                this.scene.fogStart = this.settings.fogStart!;
                this.scene.fogEnd = this.settings.fogEnd!;
            }
        } else {
            // Disable fog
            this.scene.fogMode = Scene.FOGMODE_NONE;
        }
    }

    /**
     * Set up lighting based on current settings
     */
    private setupLighting(): void {
        // Set ambient light properties
        this.ambientLight.intensity = this.settings.ambientIntensity;
        this.ambientLight.diffuse = this.settings.ambientColor!;
        this.ambientLight.groundColor = this.settings.ambientColor!.scale(0.5);

        // Handle directional (sun) light
        if (this.settings.sunEnabled) {
            if (!this.sunLight) {
                // Create sun light if it doesn't exist
                this.sunLight = new DirectionalLight(
                    'sunLight',
                    this.settings.sunDirection!.scale(-1),
                    this.scene
                );
            }

            // Update sun light properties
            this.sunLight.direction = this.settings.sunDirection!.scale(-1);
            this.sunLight.intensity = this.settings.sunIntensity!;
            this.sunLight.diffuse = this.settings.sunColor!;
            this.sunLight.specular = this.settings.sunColor!;
        } else if (this.sunLight) {
            // Dispose sun light if it exists but is disabled
            this.sunLight.dispose();
            this.sunLight = null;
        }
    }

    /**
     * Set up shadows based on current settings
     */
    private setupShadows(): void {
        if (this.settings.shadowsEnabled && this.sunLight) {
            if (!this.shadowGenerator) {
                // Create shadow generator if it doesn't exist
                const resolution = Math.round(1024 * this.settings.shadowQuality!);
                this.shadowGenerator = new ShadowGenerator(resolution, this.sunLight);

                // Add existing shadow casters
                for (const mesh of this.shadowCasters) {
                    this.shadowGenerator.addShadowCaster(mesh);
                }
            }

            // Configure shadow generator based on quality
            this.shadowGenerator.useBlurExponentialShadowMap = true;
            this.shadowGenerator.blurScale = 2;
            this.shadowGenerator.setDarkness(0.2);

            // Apply bias to prevent shadow acne
            this.shadowGenerator.bias = 0.0001;
        } else if (this.shadowGenerator) {
            // Dispose shadow generator if it exists but shadows are disabled
            this.shadowGenerator.dispose();
            this.shadowGenerator = null;
        }
    }

    /**
     * Set up weather effects based on current settings
     */
    private setupWeather(): void {
        // Clean up existing weather particles
        this.disposeWeatherEffects();

        // Create new weather effects based on type and intensity
        if (this.settings.weatherType !== 'clear' && this.settings.weatherIntensity! > 0) {
            const intensity = this.settings.weatherIntensity!;

            switch (this.settings.weatherType) {
                case 'rain':
                    this.createRainEffect(intensity);
                    break;
                case 'snow':
                    this.createSnowEffect(intensity);
                    break;
                case 'foggy':
                    this.createFogEffect(intensity);
                    break;
                case 'cloudy':
                    this.createCloudEffect(intensity);
                    break;
                case 'storm':
                    this.createStormEffect(intensity);
                    break;
            }
        }
    }

    /**
     * Create rain particle effect
     * @param intensity Rain intensity (0-1)
     */
    private createRainEffect(intensity: number): void {
        // Create rain particle system
        this.rainParticles = new ParticleSystem("rain", 5000 * intensity, this.scene);
        this.rainParticles.particleTexture = new Texture("textures/raindrop.png", this.scene);

        // Particles emit from a box above the camera
        this.rainParticles.emitter = new Vector3(0, 20, 0);
        this.rainParticles.minEmitBox = new Vector3(-100, 0, -100);
        this.rainParticles.maxEmitBox = new Vector3(100, 0, 100);

        // Rain particle properties
        this.rainParticles.color1 = new Color4(0.6, 0.6, 0.8, 0.2);
        this.rainParticles.color2 = new Color4(0.7, 0.7, 0.9, 0.4);
        this.rainParticles.colorDead = new Color4(0.8, 0.8, 1.0, 0);

        this.rainParticles.minSize = 0.1;
        this.rainParticles.maxSize = 0.5;

        this.rainParticles.minLifeTime = 1.0;
        this.rainParticles.maxLifeTime = 2.0;

        this.rainParticles.emitRate = 2000 * intensity;

        // Rain falls down and slightly in wind direction
        const windInfluence = 0.4;
        const windDirNorm = this.windVector.normalize();
        const rainDir = new Vector3(
            windDirNorm.x * windInfluence,
            -1,
            windDirNorm.z * windInfluence
        ).normalize();

        this.rainParticles.direction1 = rainDir.scale(15);
        this.rainParticles.direction2 = rainDir.scale(20);

        this.rainParticles.gravity = new Vector3(0, -9.81, 0);

        // Start the rain
        this.rainParticles.start();

        // Add rain sound
        this.events.emit(GameEvent.AUDIO_PLAY, {
            sound: 'rain',
            loop: true,
            volume: 0.5 * intensity
        });
    }

    /**
     * Create snow particle effect
     * @param intensity Snow intensity (0-1)
     */
    private createSnowEffect(intensity: number): void {
        // Create snow particle system
        this.snowParticles = new ParticleSystem("snow", 3000 * intensity, this.scene);
        this.snowParticles.particleTexture = new Texture("textures/snowflake.png", this.scene);

        // Particles emit from a box above the camera
        this.snowParticles.emitter = new Vector3(0, 20, 0);
        this.snowParticles.minEmitBox = new Vector3(-100, 0, -100);
        this.snowParticles.maxEmitBox = new Vector3(100, 0, 100);

        // Snow particle properties
        this.snowParticles.color1 = new Color4(1.0, 1.0, 1.0, 0.8);
        this.snowParticles.color2 = new Color4(0.9, 0.9, 1.0, 0.9);
        this.snowParticles.colorDead = new Color4(0.8, 0.8, 0.9, 0);

        this.snowParticles.minSize = 0.2;
        this.snowParticles.maxSize = 0.8;

        this.snowParticles.minLifeTime = 5.0;
        this.snowParticles.maxLifeTime = 8.0;

        this.snowParticles.emitRate = 500 * intensity;

        // Snow falls down gently and drifts with the wind
        const windInfluence = 0.7;
        const windDirNorm = this.windVector.normalize();
        const snowDir = new Vector3(
            windDirNorm.x * windInfluence,
            -0.7,
            windDirNorm.z * windInfluence
        ).normalize();

        this.snowParticles.direction1 = snowDir.scale(2);
        this.snowParticles.direction2 = snowDir.scale(4);

        this.snowParticles.gravity = new Vector3(0, -1, 0);

        // Add some random motion to snowflakes
        this.snowParticles.minAngularSpeed = -0.5;
        this.snowParticles.maxAngularSpeed = 0.5;

        // Start the snow
        this.snowParticles.start();

        // Add snow sound
        this.events.emit(GameEvent.AUDIO_PLAY, {
            sound: 'wind',
            loop: true,
            volume: 0.3 * intensity
        });
    }

    /**
     * Create fog particle effect
     * @param intensity Fog intensity (0-1)
     */
    private createFogEffect(intensity: number): void {
        // Enhance scene fog
        this.scene.fogMode = Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.003 * intensity + 0.001;

        // Create fog particle system for local fog pockets
        this.fogParticles = new ParticleSystem("fog", 200, this.scene);
        this.fogParticles.particleTexture = new Texture("textures/smoke.png", this.scene);

        // Particles emit from ground level around the camera
        this.fogParticles.emitter = new Vector3(0, 2, 0);
        this.fogParticles.minEmitBox = new Vector3(-50, -2, -50);
        this.fogParticles.maxEmitBox = new Vector3(50, 2, 50);

        // Fog particle properties
        this.fogParticles.color1 = new Color4(0.8, 0.8, 0.9, 0.1);
        this.fogParticles.color2 = new Color4(0.9, 0.9, 0.9, 0.2);
        this.fogParticles.colorDead = new Color4(1.0, 1.0, 1.0, 0);

        this.fogParticles.minSize = 20;
        this.fogParticles.maxSize = 40;

        this.fogParticles.minLifeTime = 5.0;
        this.fogParticles.maxLifeTime = 10.0;

        this.fogParticles.emitRate = 20 * intensity;

        // Fog drifts slowly with the wind
        const windDirNorm = this.windVector.normalize();
        this.fogParticles.direction1 = windDirNorm.scale(1);
        this.fogParticles.direction2 = windDirNorm.scale(2);

        // No gravity for fog
        this.fogParticles.gravity = Vector3.Zero();

        // Add some random rotation to fog patches
        this.fogParticles.minAngularSpeed = -0.1;
        this.fogParticles.maxAngularSpeed = 0.1;

        // Start the fog
        this.fogParticles.start();
    }

    /**
     * Create cloud effect
     * @param intensity Cloud intensity (0-1)
     */
    private createCloudEffect(intensity: number): void {
        // Adjust ambient lighting for cloudy conditions
        this.ambientLight.intensity = this.settings.ambientIntensity * 0.8;
        if (this.sunLight) {
            this.sunLight.intensity = this.settings.sunIntensity! * (1 - intensity * 0.6);
        }

        // Create a cloud layer if not already present
        if (!this.cloudsMesh) {
            // Create a simple plane above the scene for clouds
            this.cloudsMesh = Mesh.CreatePlane("clouds", 500, this.scene);
            this.cloudsMesh.rotation.x = Math.PI / 2;
            this.cloudsMesh.position.y = 150;

            // Create cloud material
            const cloudMaterial = new StandardMaterial("cloudMaterial", this.scene);
            cloudMaterial.diffuseTexture = new Texture("textures/clouds.png", this.scene);
            cloudMaterial.diffuseTexture.hasAlpha = true;
            cloudMaterial.useAlphaFromDiffuseTexture = true;
            cloudMaterial.specularColor = new Color3(0, 0, 0);
            cloudMaterial.emissiveColor = new Color3(0.2, 0.2, 0.2);
            cloudMaterial.backFaceCulling = false;

            this.cloudsMesh.material = cloudMaterial;

            // Make clouds transparent
            cloudMaterial.alpha = 0.6 * intensity;
        }

        // Adjust cloud opacity based on intensity
        if (this.cloudsMesh && this.cloudsMesh.material) {
            (this.cloudsMesh.material as StandardMaterial).alpha = 0.6 * intensity;
        }
    }

    /**
     * Create storm effect
     * @param intensity Storm intensity (0-1)
     */
    private createStormEffect(intensity: number): void {
        // Combine rain and clouds with stronger wind and darker lighting
        this.createRainEffect(intensity);
        this.createCloudEffect(intensity);

        // Increase wind strength
        this.settings.windStrength = Math.max(this.settings.windStrength!, 0.5) * (1 + intensity);
        this.windVector = this.settings.windDirection!.scale(this.settings.windStrength!);

        // Darken the scene
        this.ambientLight.intensity = this.settings.ambientIntensity * 0.6;
        if (this.sunLight) {
            this.sunLight.intensity = this.settings.sunIntensity! * (1 - intensity * 0.8);
        }

        // Increase fog
        if (this.settings.fogEnabled) {
            this.scene.fogDensity = this.settings.fogDensity! * (1 + intensity);
        }

        // Periodically add lightning
        if (intensity > 0.5) {
            this.createLightningEffect(intensity);
        }

        // Add storm sound
        this.events.emit(GameEvent.AUDIO_PLAY, {
            sound: 'thunder',
            loop: true,
            volume: 0.7 * intensity
        });
    }

    /**
     * Create lightning effect
     * @param intensity Lightning intensity (0-1)
     */
    private createLightningEffect(intensity: number): void {
        // Add periodic lightning flashes
        const minInterval = 5000 / intensity; // milliseconds
        const maxInterval = 15000 / intensity; // milliseconds

        const createLightningFlash = () => {
            // Skip some lightning flashes based on intensity
            if (Math.random() > intensity * 0.8) {
                scheduleNextLightning();
                return;
            }

            // Create a brief bright light
            const lightning = new PointLight("lightning", new Vector3(
                MathUtils.random(-100, 100),
                100,
                MathUtils.random(-100, 100)
            ), this.scene);

            lightning.intensity = 0.8 * intensity;
            lightning.diffuse = new Color3(0.8, 0.9, 1.0);
            lightning.specular = new Color3(1, 1, 1);
            lightning.range = 1000;

            // Flash duration
            const flashDuration = MathUtils.random(100, 300); // milliseconds

            // Create flash effect
            setTimeout(() => {
                lightning.dispose();

                // Play thunder sound with delay based on distance
                setTimeout(() => {
                    this.events.emit(GameEvent.AUDIO_PLAY, {
                        sound: 'thunderClap',
                        loop: false,
                        volume: MathUtils.random(0.3, 0.7) * intensity
                    });
                }, MathUtils.random(500, 3000));

            }, flashDuration);

            scheduleNextLightning();
        };

        const scheduleNextLightning = () => {
            // Schedule next lightning flash
            const nextInterval = MathUtils.random(minInterval, maxInterval);
            setTimeout(createLightningFlash, nextInterval);
        };

        // Start lightning cycle
        scheduleNextLightning();
    }

    /**
     * Clean up all weather effects
     */
    private disposeWeatherEffects(): void {
        // Dispose particle systems
        if (this.rainParticles) {
            this.rainParticles.dispose();
            this.rainParticles = null;

            // Stop rain sound
            this.events.emit(GameEvent.AUDIO_STOP, { sound: 'rain' });
        }

        if (this.snowParticles) {
            this.snowParticles.dispose();
            this.snowParticles = null;

            // Stop snow sound
            this.events.emit(GameEvent.AUDIO_STOP, { sound: 'wind' });
        }

        if (this.fogParticles) {
            this.fogParticles.dispose();
            this.fogParticles = null;
        }

        // Dispose cloud mesh
        if (this.cloudsMesh) {
            this.cloudsMesh.dispose();
            this.cloudsMesh = null;
        }

        // Stop storm sounds
        this.events.emit(GameEvent.AUDIO_STOP, { sound: 'thunder' });
    }

    /**
     * Set up reflections based on current settings
     */
    private setupReflections(): void {
        if (this.settings.reflectionsEnabled) {
            if (!this.reflectionProbe) {
                // Create reflection probe
                this.reflectionProbe = new RenderTargetTexture(
                    "environmentReflection",
                    this.settings.reflectionResolution!,
                    this.scene
                );

                // Configure probe
                this.reflectionProbe.refreshRate = 1; // Refresh every frame

                // Add all reflection-contributing meshes
                this.scene.meshes.forEach(mesh => {
                    if (mesh !== this.skybox && !mesh.name.startsWith("clouds")) {
                        this.reflectionProbe.renderList!.push(mesh);
                    }
                });

                // Set as scene reflection texture
                this.scene.environmentTexture = this.reflectionProbe;
            }
        } else if (this.reflectionProbe) {
            // Dispose reflection probe if it exists but is disabled
            this.reflectionProbe.dispose();
            this.reflectionProbe = null;
            this.scene.environmentTexture = null;
        }
    }

    /**
     * Set up post-processing effects based on current settings
     */
    private setupPostProcessing(): void {
        if (this.settings.postProcessingEnabled) {
            // Create glow layer if not already present
            if (!this.glowLayer) {
                this.glowLayer = new GlowLayer("glow", this.scene);
                this.glowLayer.intensity = 0.5;
            }

            // Create highlight layer if not already present
            if (!this.highlightLayer) {
                this.highlightLayer = new HighlightLayer("highlight", this.scene);
            }
        } else {
            // Dispose post-processing effects if they exist but are disabled
            if (this.glowLayer) {
                this.glowLayer.dispose();
                this.glowLayer = null;
            }

            if (this.highlightLayer) {
                this.highlightLayer.dispose();
                this.highlightLayer = null;
            }
        }
    }

    /**
     * Update environment manager
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Update elapsed time
        this.elapsedTime += deltaTime;

        // Update day/night cycle if enabled
        if (this.dayNightCycle) {
            this.updateDayNightCycle(deltaTime);
        }

        // Update cloud movement
        if (this.cloudsMesh) {
            // Move clouds with wind
            const cloudSpeed = 0.5 * this.settings.windStrength!;
            this.cloudsMesh.position.x += this.windVector.x * cloudSpeed * deltaTime;
            this.cloudsMesh.position.z += this.windVector.z * cloudSpeed * deltaTime;

            // Wrap clouds around if they move too far
            const wrapDistance = 250;
            if (Math.abs(this.cloudsMesh.position.x) > wrapDistance) {
                this.cloudsMesh.position.x = -Math.sign(this.cloudsMesh.position.x) * wrapDistance;
            }
            if (Math.abs(this.cloudsMesh.position.z) > wrapDistance) {
                this.cloudsMesh.position.z = -Math.sign(this.cloudsMesh.position.z) * wrapDistance;
            }
        }

        // Update environment elements based on player position
        this.updateEnvironmentPosition();
    }

    /**
     * Update day/night cycle
     * @param deltaTime Time since last update in seconds
     */
    private updateDayNightCycle(deltaTime: number): void {
        // Calculate time of day (0-24)
        const dayProgress = (this.elapsedTime % this.dayLength) / this.dayLength;
        const timeOfDay = dayProgress * 24;

        // Update time of day setting
        this.settings.timeOfDay = timeOfDay;

        // Update environment based on time of day
        this.updateTimeOfDay(timeOfDay);
    }

    /**
     * Update environment based on time of day
     * @param timeOfDay Time of day (0-24)
     */
    private updateTimeOfDay(timeOfDay: number): void {
        // Update sun direction based on time of day
        if (this.sunLight) {
            // Calculate sun direction
            const sunAngle = ((timeOfDay - 6) / 12) * Math.PI;
            const sunDirection = new Vector3(
                Math.sin(sunAngle),
                -Math.cos(sunAngle),
                0.2
            ).normalize();

            this.sunLight.direction = sunDirection.scale(-1);

            // Update sun intensity based on time of day
            let intensity = 0;

            if (timeOfDay > 6 && timeOfDay < 18) {
                // Day time
                intensity = this.settings.sunIntensity!;

                // Reduce at dawn/dusk
                if (timeOfDay < 8) {
                    intensity *= (timeOfDay - 6) / 2;
                } else if (timeOfDay > 16) {
                    intensity *= (18 - timeOfDay) / 2;
                }
            }

            this.sunLight.intensity = intensity;

            // Update sun color based on time of day
            if (timeOfDay > 6 && timeOfDay < 8) {
                // Dawn: more red/orange
                this.sunLight.diffuse = new Color3(1.0, 0.8, 0.6);
            } else if (timeOfDay > 16 && timeOfDay < 18) {
                // Dusk: more red/orange
                this.sunLight.diffuse = new Color3(1.0, 0.6, 0.4);
            } else if (timeOfDay >= 8 && timeOfDay <= 16) {
                // Day: normal color
                this.sunLight.diffuse = this.settings.sunColor!;
            }
        }

        // Update ambient light based on time of day
        let ambientIntensity = this.settings.ambientIntensity;

        if (timeOfDay < 6 || timeOfDay > 18) {
            // Night time: reduce ambient light
            ambientIntensity *= 0.3;
        } else if (timeOfDay < 8) {
            // Dawn: gradually increase
            const t = (timeOfDay - 6) / 2;
            ambientIntensity *= 0.3 + 0.7 * t;
        } else if (timeOfDay > 16) {
            // Dusk: gradually decrease
            const t = (18 - timeOfDay) / 2;
            ambientIntensity *= 0.3 + 0.7 * t;
        }

        this.ambientLight.intensity = ambientIntensity;

        // Update ambient color based on time of day
        if (timeOfDay < 6 || timeOfDay > 18) {
            // Night: blueish
            this.ambientLight.diffuse = new Color3(0.5, 0.5, 0.8);
        } else if (timeOfDay < 8) {
            // Dawn: blend from night to day
            const t = (timeOfDay - 6) / 2;
            const nightColor = new Color3(0.5, 0.5, 0.8);
            const dayColor = this.settings.ambientColor!;
            this.ambientLight.diffuse = Color3.Lerp(nightColor, dayColor, t);
        } else if (timeOfDay > 16) {
            // Dusk: blend from day to night
            const t = (18 - timeOfDay) / 2;
            const dayColor = this.settings.ambientColor!;
            const nightColor = new Color3(0.5, 0.5, 0.8);
            this.ambientLight.diffuse = Color3.Lerp(nightColor, dayColor, t);
        } else {
            // Day: normal color
            this.ambientLight.diffuse = this.settings.ambientColor!;
        }

        // Update fog color based on time of day
        if (this.settings.fogEnabled) {
            let fogColor = this.settings.fogColor!.clone();

            if (timeOfDay < 6 || timeOfDay > 18) {
                // Night: darker fog
                fogColor.scaleInPlace(0.3);
            } else if (timeOfDay < 8) {
                // Dawn: gradually brighten
                const t = (timeOfDay - 6) / 2;
                fogColor.scaleInPlace(0.3 + 0.7 * t);
            } else if (timeOfDay > 16) {
                // Dusk: gradually darken
                const t = (18 - timeOfDay) / 2;
                fogColor.scaleInPlace(0.3 + 0.7 * t);
            }

            this.scene.fogColor = fogColor;
        }

        // Update skybox if using procedural sky
        if (this.settings.skyType === 'procedural' && this.skybox) {
            const skyMaterial = this.skybox.material as StandardMaterial;
            if (skyMaterial && skyMaterial.emissiveTexture) {
                const skyTexture = skyMaterial.emissiveTexture as DynamicTexture;
                const ctx = skyTexture.getContext();
                this.drawSkyGradient(ctx, skyTexture.getSize().width, timeOfDay);
                skyTexture.update();
            }
        }
    }

    /**
     * Update environment position relative to player
     */
    private updateEnvironmentPosition(): void {
        // Move weather effects with player
        const camera = this.scene.activeCamera;
        if (!camera) return;

        // Update particle emitter positions
        if (this.rainParticles) {
            this.rainParticles.emitter = new Vector3(
                camera.position.x,
                camera.position.y + 20,
                camera.position.z
            );
        }

        if (this.snowParticles) {
            this.snowParticles.emitter = new Vector3(
                camera.position.x,
                camera.position.y + 20,
                camera.position.z
            );
        }

        if (this.fogParticles) {
            this.fogParticles.emitter = new Vector3(
                camera.position.x,
                camera.position.y + 2,
                camera.position.z
            );
        }
    }

    /**
     * Set the time of day
     * @param time Time of day (0-24)
     */
    public setTimeOfDay(time: number): void {
        // Clamp time to valid range
        const clampedTime = MathUtils.clamp(time, 0, 24);

        // Update time of day setting
        this.settings.timeOfDay = clampedTime;

        // Update environment
        this.updateTimeOfDay(clampedTime);

        this.logger.debug(`Time of day set to ${clampedTime}`);
    }

    /**
     * Enable or disable day/night cycle
     * @param enabled Whether cycle is enabled
     * @param dayLength Length of full day in seconds
     */
    public setDayNightCycle(enabled: boolean, dayLength?: number): void {
        this.dayNightCycle = enabled;

        if (dayLength !== undefined) {
            this.dayLength = dayLength;
        }

        this.logger.debug(`Day/night cycle ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set weather type and intensity
     * @param type Weather type
     * @param intensity Weather intensity (0-1)
     */
    public setWeather(type: string, intensity: number = 0.5): void {
        // Clamp intensity
        const clampedIntensity = MathUtils.clamp(intensity, 0, 1);

        // Update weather settings
        this.settings.weatherType = type as any;
        this.settings.weatherIntensity = clampedIntensity;

        // Update weather effects
        this.setupWeather();

        this.logger.debug(`Weather set to ${type} with intensity ${clampedIntensity}`);
    }

    /**
     * Register a mesh as a shadow caster
     * @param mesh Mesh to cast shadows
     */
    public addShadowCaster(mesh: AbstractMesh): void {
        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(mesh);
        }

        // Store in array for when shadow generator is created/recreated
        if (!this.shadowCasters.includes(mesh)) {
            this.shadowCasters.push(mesh);
        }
    }

    /**
     * Add a mesh to be highlighted
     * @param mesh Mesh to highlight
     * @param color Highlight color
     * @param intensity Highlight intensity
     */
    public addHighlight(mesh: AbstractMesh, color: Color3, intensity: number = 0.5): void {
        if (this.highlightLayer) {
            this.highlightLayer.addMesh(mesh as Mesh, color, intensity);
        }
    }

    /**
     * Remove highlight from a mesh
     * @param mesh Mesh to remove highlight from
     */
    public removeHighlight(mesh: AbstractMesh): void {
        if (this.highlightLayer) {
            this.highlightLayer.removeMesh(mesh as Mesh);
        }
    }

    /**
     * Add glow to a mesh
     * @param mesh Mesh to add glow to
     * @param intensity Glow intensity
     */
    public addGlow(mesh: AbstractMesh, intensity: number = 0.5): void {
        if (this.glowLayer) {
            this.glowLayer.intensity = intensity;
            mesh.isPickable = false; // To prevent glow layer from including mesh
            setTimeout(() => {
                mesh.isPickable = true;
            }, 100);
        }
    }

    /**
     * Get the current wind vector
     * @returns Wind vector
     */
    public getWindVector(): Vector3 {
        return this.windVector.clone();
    }

    /**
     * Set wind properties
     * @param direction Wind direction
     * @param strength Wind strength
     */
    public setWind(direction: Vector3, strength: number): void {
        this.settings.windDirection = direction.normalize();
        this.settings.windStrength = strength;
        this.windVector = this.settings.windDirection.scale(this.settings.windStrength);

        this.logger.debug(`Wind set to direction ${direction.toString()} with strength ${strength}`);
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Dispose lights
        if (this.sunLight) {
            this.sunLight.dispose();
        }

        this.ambientLight.dispose();

        // Dispose shadow generator
        if (this.shadowGenerator) {
            this.shadowGenerator.dispose();
        }

        // Dispose weather effects
        this.disposeWeatherEffects();

        // Dispose skybox
        if (this.skybox) {
            this.skybox.dispose();
        }

        // Dispose reflection probe
        if (this.reflectionProbe) {
            this.reflectionProbe.dispose();
        }

        // Dispose post-processing effects
        if (this.glowLayer) {
            this.glowLayer.dispose();
        }

        if (this.highlightLayer) {
            this.highlightLayer.dispose();
        }

        this.logger.debug('Environment manager disposed');
    }
}
