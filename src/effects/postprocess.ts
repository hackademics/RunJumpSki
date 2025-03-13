import {
    Scene,
    PostProcess,
    Effect,
    MotionBlurPostProcess,
    BlurPostProcess,
    Color4,
    Camera,
    Texture,
    PassPostProcess,
    Vector2,
    DefaultRenderingPipeline,
    ImageProcessingPostProcess
} from '@babylonjs/core';
import { Logger } from '../utils/logger';
import { IEventEmitter, GameEvent } from '../types/events';

/**
 * Options for post-processing effects
 */
export interface PostProcessOptions {
    /**
     * Whether motion blur is enabled
     */
    motionBlur?: boolean;

    /**
     * Motion blur intensity
     */
    motionBlurIntensity?: number;

    /**
     * Whether speed effects are enabled
     */
    speedEffects?: boolean;

    /**
     * Whether chromatic aberration is enabled
     */
    chromaticAberration?: boolean;

    /**
     * Whether vignette effect is enabled
     */
    vignette?: boolean;

    /**
     * Whether color grading is enabled
     */
    colorGrading?: boolean;

    /**
     * Path to color grading LUT
     */
    colorGradingTexture?: string;
}

/**
 * Default post-processing options
 */
const DefaultOptions: PostProcessOptions = {
    motionBlur: true,
    motionBlurIntensity: 0.2,
    speedEffects: true,
    chromaticAberration: true,
    vignette: true,
    colorGrading: false
};

/**
 * Manages post-processing effects for the game
 */
export class PostProcessManager {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private options: PostProcessOptions;
    private camera?: Camera;

    // Post-processing effects
    private motionBlur?: MotionBlurPostProcess;
    private speedBlur?: BlurPostProcess;
    private pipeline?: DefaultRenderingPipeline;
    private customSpeedShader?: PostProcess;

    // Effect parameters
    private currentSpeed: number = 0;
    private maxSpeedEffectSpeed: number = 40; // Speed at which effects are at maximum
    private lastCameraPosition?: Vector2;

    // Custom shaders
    private speedEffectsSamplers = {
        textureSampler: { value: null },
    };
    private speedEffectsUniforms = {
        intensity: 0,
        time: 0
    };

    /**
     * Initialize post-processing manager
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param options Post-processing options
     */
    constructor(scene: Scene, events: IEventEmitter, options: Partial<PostProcessOptions> = {}) {
        this.logger = new Logger('PostProcessManager');
        this.scene = scene;
        this.events = events;
        this.options = { ...DefaultOptions, ...options };

        // Register custom shaders
        this.registerCustomShaders();

        // Subscribe to events
        this.setupEventListeners();

        this.logger.info('Post-processing manager initialized');
    }

    /**
     * Register custom shader effects
     */
    private registerCustomShaders(): void {
        // Register speed effect shader
        Effect.ShadersStore["speedEffectsFragmentShader"] = `
            #ifdef GL_ES
                precision highp float;
            #endif
            
            uniform sampler2D textureSampler;
            varying vec2 vUV;
            uniform float intensity;
            uniform float time;
            
            void main(void) {
                // Radial distortion based on intensity
                float distortion = intensity * 0.03;
                vec2 center = vec2(0.5, 0.5);
                vec2 toCenter = center - vUV;
                float len = length(toCenter);
                vec2 normToCenter = toCenter / len;
                vec2 distortedUV = vUV + normToCenter * len * len * distortion;
                
                // Color shifting effect
                float rShift = intensity * 0.01;
                float gShift = 0.0;
                float bShift = -intensity * 0.01;
                
                // Sample the texture with the distortion
                float r = texture2D(textureSampler, distortedUV + vec2(rShift, 0.0)).r;
                float g = texture2D(textureSampler, distortedUV + vec2(gShift, 0.0)).g;
                float b = texture2D(textureSampler, distortedUV + vec2(bShift, 0.0)).b;
                
                // Vignette effect
                float vignetteIntensity = intensity * 0.5;
                float vignette = 1.0 - (len * 2.0 * vignetteIntensity);
                vignette = smoothstep(0.0, 1.0, vignette);
                
                // Combine effects
                gl_FragColor = vec4(r * vignette, g * vignette, b * vignette, 1.0);
            }
        `;
    }

    /**
     * Setup event listeners for player state
     */
    private setupEventListeners(): void {
        // Listen for player state changes
        this.events.on(GameEvent.PLAYER_STATE_CHANGE, (data) => {
            this.handlePlayerStateChange(data);
        });

        // Listen for player speed updates
        this.events.on('player:speed', (data) => {
            this.currentSpeed = data.speed;
            this.updateSpeedBasedEffects();
        });
    }

    /**
     * Initialize post-processes for the camera
     * @param camera The camera to apply effects to
     */
    public initialize(camera: Camera): void {
        this.logger.debug('Initializing post-processes for camera');
        this.camera = camera;

        // Create rendering pipeline (handles multiple effects efficiently)
        this.pipeline = new DefaultRenderingPipeline("defaultPipeline", true, this.scene, [camera]);

        // Configure pipeline
        if (this.pipeline) {
            // Motion blur
            this.pipeline.motionBlurEnabled = this.options.motionBlur || false;
            this.pipeline.motionStrength = this.options.motionBlurIntensity || 0.2;

            // Chromatic aberration
            this.pipeline.chromaticAberrationEnabled = this.options.chromaticAberration || false;
            this.pipeline.chromaticAberration.aberrationAmount = 0.0;

            // Vignette
            this.pipeline.vignetteEnabled = this.options.vignette || false;
            this.pipeline.vignette.vigor = 0.3;
            this.pipeline.vignette.smoothness = 0.5;

            // Color grading (LUT)
            if (this.options.colorGrading && this.options.colorGradingTexture) {
                this.pipeline.imageProcessingEnabled = true;
                this.pipeline.imageProcessing.colorGradingEnabled = true;
                this.pipeline.imageProcessing.colorGradingTexture = new Texture(
                    this.options.colorGradingTexture,
                    this.scene
                );
            }
        }

        // Custom speed effect shader (for more advanced distortion effects)
        if (this.options.speedEffects) {
            this.customSpeedShader = new PostProcess(
                "speedEffects",
                "speedEffects",
                ["intensity", "time"],
                ["textureSampler"],
                1.0,
                camera
            );

            this.customSpeedShader.onApply = (effect) => {
                effect.setFloat("intensity", this.speedEffectsUniforms.intensity);
                effect.setFloat("time", this.speedEffectsUniforms.time);
            };

            // Initialize at zero intensity
            this.speedEffectsUniforms.intensity = 0;
            this.speedEffectsUniforms.time = 0;
        }
    }

    /**
     * Update post-processing effects
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        if (!this.camera) return;

        // Update time uniform for shaders
        if (this.customSpeedShader) {
            this.speedEffectsUniforms.time += deltaTime;
        }

        // Get current camera position for motion vector
        const cameraPosition = new Vector2(
            this.camera.position.x,
            this.camera.position.z
        );

        // Calculate camera movement delta
        if (this.lastCameraPosition) {
            const moveDelta = Vector2.Distance(cameraPosition, this.lastCameraPosition);
            const moveSpeed = moveDelta / deltaTime;

            // Update motion blur based on camera movement
            if (this.pipeline && this.pipeline.motionBlurEnabled) {
                const targetStrength = Math.min(0.5, moveSpeed * 0.01);
                this.pipeline.motionStrength = this.lerpValue(
                    this.pipeline.motionStrength,
                    targetStrength,
                    deltaTime * 5
                );
            }
        }

        // Store camera position for next frame
        this.lastCameraPosition = cameraPosition;
    }

    /**
     * Handle player state changes
     * @param data Player state data
     */
    private handlePlayerStateChange(data: any): void {
        if (!this.pipeline) return;

        const { newState } = data;

        // Adjust effects based on state
        switch (newState) {
            case 'skiing':
                // Enhance speed effects during skiing
                break;

            case 'flying':
                // Add subtle effects during flying
                break;

            case 'jetpacking':
                // Add jetpack-specific effects
                break;

            default:
                // Reset to default settings
                break;
        }
    }

    /**
     * Update effects based on player speed
     */
    private updateSpeedBasedEffects(): void {
        if (!this.pipeline) return;

        // Calculate effect intensity based on speed
        const normalizedSpeed = Math.min(1, this.currentSpeed / this.maxSpeedEffectSpeed);

        // Update chromatic aberration
        if (this.pipeline.chromaticAberrationEnabled) {
            const targetAberration = normalizedSpeed * 2.0;
            this.pipeline.chromaticAberration.aberrationAmount = this.lerpValue(
                this.pipeline.chromaticAberration.aberrationAmount,
                targetAberration,
                0.1
            );
        }

        // Update vignette
        if (this.pipeline.vignetteEnabled) {
            const targetVigor = 0.3 + normalizedSpeed * 0.5;
            this.pipeline.vignette.vigor = this.lerpValue(
                this.pipeline.vignette.vigor,
                targetVigor,
                0.1
            );
        }

        // Update custom speed effect
        if (this.customSpeedShader) {
            const targetIntensity = normalizedSpeed;
            this.speedEffectsUniforms.intensity = this.lerpValue(
                this.speedEffectsUniforms.intensity,
                targetIntensity,
                0.1
            );
        }
    }

    /**
     * Add a camera shake effect
     * @param intensity Shake intensity
     * @param duration Shake duration in seconds
     */
    public addCameraShake(intensity: number, duration: number): void {
        // This could be implemented using a separate PostProcess or by
        // modifying camera position/rotation directly in the camera component
        this.events.emit('camera:shake', { intensity, duration });
    }

    /**
     * Add a flash effect
     * @param color Flash color
     * @param duration Flash duration in seconds
     */
    public addFlashEffect(color: Color4, duration: number): void {
        if (!this.camera) return;

        // Create a simple flash post-process
        const flash = new PostProcess(
            "flash",
            "screenFlash",
            [],
            [],
            1.0,
            this.camera,
            Texture.BILINEAR_SAMPLINGMODE,
            this.scene.getEngine(),
            false
        );

        // Screen flash shader
        Effect.ShadersStore["screenFlashFragmentShader"] = `
            #ifdef GL_ES
                precision highp float;
            #endif
            
            uniform sampler2D textureSampler;
            varying vec2 vUV;
            uniform vec4 flashColor;
            uniform float flashAmount;
            
            void main(void) {
                vec4 baseColor = texture2D(textureSampler, vUV);
                gl_FragColor = mix(baseColor, flashColor, flashAmount);
            }
        `;

        // Flash color and initial intensity
        let flashAmount = 1.0;
        const flashColor = color;

        // Set up the shader
        flash.onApply = (effect) => {
            effect.setFloat4("flashColor", flashColor.r, flashColor.g, flashColor.b, flashColor.a);
            effect.setFloat("flashAmount", flashAmount);
        };

        // Fade out the flash effect
        const fadeInterval = 16; // ms
        const fadeStep = fadeInterval / (duration * 1000);

        const fadeTimer = setInterval(() => {
            flashAmount -= fadeStep;

            if (flashAmount <= 0) {
                flashAmount = 0;
                clearInterval(fadeTimer);
                flash.dispose();
            }
        }, fadeInterval);
    }

    /**
     * Enable or disable an effect
     * @param effect Name of the effect
     * @param enabled Whether the effect should be enabled
     */
    public setEffectEnabled(effect: string, enabled: boolean): void {
        if (!this.pipeline) return;

        switch (effect) {
            case 'motionBlur':
                this.pipeline.motionBlurEnabled = enabled;
                break;

            case 'chromaticAberration':
                this.pipeline.chromaticAberrationEnabled = enabled;
                break;

            case 'vignette':
                this.pipeline.vignetteEnabled = enabled;
                break;

            case 'colorGrading':
                if (this.pipeline.imageProcessing) {
                    this.pipeline.imageProcessing.colorGradingEnabled = enabled;
                }
                break;

            case 'speedEffects':
                if (this.customSpeedShader) {
                    this.customSpeedShader.isEnabled = enabled;
                }
                break;
        }
    }

    /**
     * Apply temporary slow-motion effect
     * @param timeScale Scale factor for time (0.5 = half speed)
     * @param duration Duration in seconds
     */
    public applySlowMotion(timeScale: number, duration: number): void {
        const originalTimeScale = this.scene.getAnimationRatio();

        // Apply slow motion
        this.scene.getEngine().setHardwareScalingLevel(1 / timeScale);

        // Add motion blur during slow-mo if enabled
        if (this.pipeline && this.options.motionBlur) {
            const originalStrength = this.pipeline.motionStrength;
            this.pipeline.motionStrength = originalStrength * 2;

            // Reset after duration
            setTimeout(() => {
                if (this.pipeline) {
                    this.pipeline.motionStrength = originalStrength;
                }
            }, duration * 1000);
        }

        // Reset after duration
        setTimeout(() => {
            this.scene.getEngine().setHardwareScalingLevel(1);
        }, duration * 1000);
    }

    /**
     * Linear interpolation helper
     */
    private lerpValue(current: number, target: number, t: number): number {
        return current + (target - current) * t;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.pipeline) {
            this.pipeline.dispose();
            this.pipeline = undefined;
        }

        if (this.customSpeedShader) {
            this.customSpeedShader.dispose();
            this.customSpeedShader = undefined;
        }

        this.logger.debug('Post-processing manager disposed');
    }
} 
