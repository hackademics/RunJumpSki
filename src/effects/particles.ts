import {
    Scene,
    Vector3,
    Color4,
    ParticleSystem,
    Texture,
    Mesh,
    AbstractMesh,
    GPUParticleSystem,
    IParticleSystem,
    TransformNode,
    Animation,
    CircleEase,
    EasingFunction,
    ParticleSystemSet,
    StandardMaterial,
    Color3
} from '@babylonjs/core';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { MathUtils } from '../utils/math';
import { VectorUtils } from '../utils/vector';

/**
 * Particle effect options
 */
export interface ParticleEffectOptions {
    /**
     * Effect position
     */
    position?: Vector3;

    /**
     * Effect direction
     */
    direction?: Vector3;

    /**
     * Effect color
     */
    color?: Color4;

    /**
     * Effect size
     */
    size?: number;

    /**
     * Effect lifetime in seconds
     */
    lifetime?: number;

    /**
     * Effect intensity (0-1)
     */
    intensity?: number;

    /**
     * Emitter object (will use its position)
     */
    emitter?: AbstractMesh | TransformNode;

    /**
     * Gravity factor
     */
    gravity?: number;

    /**
     * Whether to use GPU acceleration
     */
    useGPU?: boolean;

    /**
     * Whether to emit continuously (if false, emits once)
     */
    continuous?: boolean;

    /**
     * Whether to follow the emitter's position
     */
    followEmitter?: boolean;

    /**
     * Custom texture path
     */
    texturePath?: string;

    /**
     * Custom update function
     */
    updateFunction?: (system: IParticleSystem, deltaTime: number) => void;

    /**
     * Effect-specific options
     */
    [key: string]: any;
}

/**
 * Manages particle effects for the game
 */
export class ParticleEffectsManager {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private particleSystems: Map<string, IParticleSystem> = new Map();
    private particleSystemSets: Map<string, ParticleSystemSet> = new Map();
    private isGPUSupported: boolean = false;

    // Common textures
    private textures: Map<string, Texture> = new Map();

    // Default texture paths
    private defaultTextures = {
        smoke: 'textures/smoke.png',
        fire: 'textures/fire.png',
        spark: 'textures/spark.png',
        circle: 'textures/circle.png',
        flare: 'textures/flare.png',
        star: 'textures/star.png',
        square: 'textures/square.png',
        splash: 'textures/splash.png',
        snowflake: 'textures/snowflake.png'
    };

    /**
     * Create a new particle effects manager
     * @param scene The Babylon.js scene
     * @param events Event emitter
     */
    constructor(scene: Scene, events: IEventEmitter) {
        this.logger = new Logger('ParticleEffectsManager');
        this.scene = scene;
        this.events = events;

        // Check if GPU particles are supported
        this.isGPUSupported = GPUParticleSystem.IsSupported;

        // Preload common textures
        this.preloadTextures();

        // Set up event listeners
        this.setupEventListeners();

        this.logger.info(`Particle effects manager initialized. GPU particles ${this.isGPUSupported ? 'are' : 'are not'} supported.`);
    }

    /**
     * Preload commonly used particle textures
     */
    private preloadTextures(): void {
        Object.entries(this.defaultTextures).forEach(([name, path]) => {
            this.textures.set(name, new Texture(path, this.scene));
        });

        this.logger.debug('Preloaded particle textures');
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Listen for events that trigger particle effects
        this.events.on(GameEvent.PROJECTILE_HIT, (data) => {
            this.createImpactEffect(data.position, data.normal, data.intensity || 1);
        });

        this.events.on(GameEvent.PLAYER_JETPACK_START, (data) => {
            if (data.entity && data.entity.getMesh) {
                this.createJetpackEffect(data.entity);
            }
        });

        this.events.on(GameEvent.PLAYER_JETPACK_STOP, (data) => {
            this.stopEffect('jetpack_' + data.entity.id);
        });

        this.events.on(GameEvent.PLAYER_SKI_START, (data) => {
            if (data.entity && data.entity.getMesh) {
                this.createSkiTrailEffect(data.entity);
            }
        });

        this.events.on(GameEvent.PLAYER_SKI_STOP, (data) => {
            this.stopEffect('ski_trail_' + data.entity.id);
        });
    }

    /**
     * Create a new particle system
     * @param name Unique name for the particle system
     * @param capacity Maximum number of particles
     * @param useGPU Whether to use GPU acceleration
     * @returns New particle system
     */
    private createParticleSystem(name: string, capacity: number, useGPU: boolean = false): IParticleSystem {
        // Use GPU particles if supported and requested
        if (useGPU && this.isGPUSupported) {
            return new GPUParticleSystem(name, { capacity }, this.scene);
        } else {
            return new ParticleSystem(name, capacity, this.scene);
        }
    }

    /**
     * Create an explosion effect at a specified position
     * @param position Explosion position
     * @param options Effect options
     * @returns Unique effect ID
     */
    public createExplosionEffect(position: Vector3, options: Partial<ParticleEffectOptions> = {}): string {
        const id = 'explosion_' + Date.now();
        const size = options.size || 1;
        const intensity = options.intensity || 1;
        const color = options.color || new Color4(1, 0.5, 0, 1);
        const lifetime = options.lifetime || 1.5;
        const useGPU = options.useGPU !== undefined ? options.useGPU : true;

        // Create particle system
        const particles = this.createParticleSystem(id, 2000 * intensity, useGPU);
        particles.particleTexture = this.textures.get('flare') || new Texture(options.texturePath || this.defaultTextures.flare, this.scene);

        // Set emitter to position
        particles.emitter = position;
        particles.minEmitBox = new Vector3(-0.2 * size, -0.2 * size, -0.2 * size);
        particles.maxEmitBox = new Vector3(0.2 * size, 0.2 * size, 0.2 * size);

        // Configure particles
        particles.color1 = color;
        particles.color2 = new Color4(color.r, 0.1, 0.1, color.a);
        particles.colorDead = new Color4(0, 0, 0, 0);

        particles.minSize = 0.1 * size;
        particles.maxSize = 1.0 * size;

        particles.minLifeTime = 0.3 * lifetime;
        particles.maxLifeTime = 1.0 * lifetime;

        particles.emitRate = 2000 * intensity;
        particles.blendMode = ParticleSystem.BLENDMODE_ADD;

        // Particles emitted once in all directions
        particles.manualEmitCount = 400 * intensity;
        particles.minEmitPower = 1 * size;
        particles.maxEmitPower = 8 * size;
        particles.updateSpeed = 0.01;

        // Create a gravity effect
        particles.gravity = new Vector3(0, -2, 0);

        // Start the effect
        particles.start();
        this.particleSystems.set(id, particles);

        // Create secondary smoke effect
        this.createSmokeEffect(position, {
            size: size * 2,
            lifetime: lifetime * 2,
            intensity: intensity * 0.6,
            gravity: -0.1,
            color: new Color4(0.2, 0.2, 0.2, 0.8)
        });

        // Emit explosion sound
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'explosion', volume: 0.5 * intensity * size });

        // Auto-dispose after lifetime
        setTimeout(() => {
            this.disposeEffect(id);
        }, lifetime * 1000 * 1.5);

        return id;
    }

    /**
     * Create a fire effect at a specified position
     * @param position Fire position
     * @param options Effect options
     * @returns Unique effect ID
     */
    public createFireEffect(position: Vector3, options: Partial<ParticleEffectOptions> = {}): string {
        const id = options.id || 'fire_' + Date.now();
        const size = options.size || 1;
        const intensity = options.intensity || 1;
        const lifetime = options.lifetime || 10; // Longer default lifetime for continuous effect
        const continuous = options.continuous !== undefined ? options.continuous : true;
        const useGPU = options.useGPU !== undefined ? options.useGPU : true;
        const emitter = options.emitter || position;
        const followEmitter = options.followEmitter !== undefined ? options.followEmitter : true;

        // Create particle system
        const particles = this.createParticleSystem(id, 2000, useGPU);
        particles.particleTexture = this.textures.get('fire') || new Texture(options.texturePath || this.defaultTextures.fire, this.scene);

        // Set emitter
        if (emitter instanceof AbstractMesh || emitter instanceof TransformNode) {
            particles.emitter = emitter;
        } else {
            particles.emitter = position;
        }

        // Configure emitter box size
        particles.minEmitBox = new Vector3(-0.1 * size, 0, -0.1 * size);
        particles.maxEmitBox = new Vector3(0.1 * size, 0.2 * size, 0.1 * size);

        // Configure particles
        particles.color1 = new Color4(1, 0.5, 0.1, 1);
        particles.color2 = new Color4(1, 0.3, 0.1, 1);
        particles.colorDead = new Color4(0, 0, 0, 0);

        particles.minSize = 0.2 * size;
        particles.maxSize = 1.0 * size;

        particles.minLifeTime = 0.2;
        particles.maxLifeTime = 0.6;

        particles.emitRate = 100 * intensity;
        particles.blendMode = ParticleSystem.BLENDMODE_ADD;

        particles.direction1 = new Vector3(-0.5, 2, -0.5);
        particles.direction2 = new Vector3(0.5, 2, 0.5);

        particles.minEmitPower = 0.5;
        particles.maxEmitPower = 2;

        // Add a small gravity effect
        particles.gravity = new Vector3(0, -1 * (options.gravity || 0.5), 0);

        // Add angular velocity to make flames more dynamic
        particles.minAngularSpeed = -2;
        particles.maxAngularSpeed = 2;

        // Start the effect
        particles.start();
        this.particleSystems.set(id, particles);

        // Add smoke effect above fire
        const smokeId = this.createSmokeEffect(
            emitter instanceof Vector3
                ? position.add(new Vector3(0, size * 0.5, 0))
                : new Vector3(0, size * 0.5, 0),
            {
                size: size * 1.5,
                intensity: intensity * 0.5,
                lifetime: lifetime,
                continuous: continuous,
                emitter: emitter instanceof AbstractMesh || emitter instanceof TransformNode
                    ? emitter
                    : undefined,
                followEmitter: followEmitter,
                gravity: -0.05
            }
        );

        // Create a set of related particle systems
        const particleSet = new ParticleSystemSet();
        particleSet.systems.push(particles);
        particleSet.systems.push(this.particleSystems.get(smokeId)!);
        this.particleSystemSets.set(id, particleSet);

        // Emit fire sound if continuous
        if (continuous) {
            this.events.emit(GameEvent.AUDIO_PLAY, {
                sound: 'fire',
                volume: 0.2 * intensity,
                loop: true,
                id: id
            });
        }

        // If not continuous, auto-dispose after lifetime
        if (!continuous) {
            setTimeout(() => {
                this.disposeEffect(id);
            }, lifetime * 1000);
        }

        return id;
    }

    /**
     * Create a smoke effect at a specified position
     * @param position Smoke position
     * @param options Effect options
     * @returns Unique effect ID
     */
    public createSmokeEffect(position: Vector3, options: Partial<ParticleEffectOptions> = {}): string {
        const id = options.id || 'smoke_' + Date.now();
        const size = options.size || 1;
        const intensity = options.intensity || 1;
        const lifetime = options.lifetime || 3;
        const continuous = options.continuous !== undefined ? options.continuous : true;
        const useGPU = options.useGPU !== undefined ? options.useGPU : false; // CPU better for smoke
        const emitter = options.emitter || position;
        const followEmitter = options.followEmitter !== undefined ? options.followEmitter : true;
        const color = options.color || new Color4(0.2, 0.2, 0.2, 0.8);

        // Create particle system
        const particles = this.createParticleSystem(id, 1000, useGPU);
        particles.particleTexture = this.textures.get('smoke') || new Texture(options.texturePath || this.defaultTextures.smoke, this.scene);

        // Set emitter
        if (emitter instanceof AbstractMesh || emitter instanceof TransformNode) {
            particles.emitter = emitter;
            // If we need to offset from emitter
            if (options.position) {
                const smokeEmitter = new TransformNode(`${id}_emitter`, this.scene);
                smokeEmitter.parent = emitter;
                smokeEmitter.position = options.position;
                particles.emitter = smokeEmitter;
            }
        } else {
            particles.emitter = position;
        }

        // Configure emitter box size
        particles.minEmitBox = new Vector3(-0.1 * size, 0, -0.1 * size);
        particles.maxEmitBox = new Vector3(0.1 * size, 0, 0.1 * size);

        // Configure particles
        particles.color1 = color;
        particles.color2 = new Color4(color.r, color.g, color.b, color.a * 0.7);
        particles.colorDead = new Color4(color.r, color.g, color.b, 0);

        particles.minSize = 0.3 * size;
        particles.maxSize = 1.5 * size;

        particles.minLifeTime = lifetime * 0.5;
        particles.maxLifeTime = lifetime;

        particles.emitRate = 20 * intensity;
        particles.blendMode = ParticleSystem.BLENDMODE_STANDARD;

        // Smoke rises
        const gravity = options.gravity || -0.1;
        particles.direction1 = new Vector3(-0.2, 1, -0.2);
        particles.direction2 = new Vector3(0.2, 1, 0.2);
        particles.gravity = new Vector3(0, gravity, 0);

        particles.minEmitPower = 0.2;
        particles.maxEmitPower = 0.8;

        // Add rotation for more natural smoke
        particles.minAngularSpeed = -0.5;
        particles.maxAngularSpeed = 0.5;

        // Start the effect
        if (continuous) {
            particles.start();
        } else {
            particles.manualEmitCount = 20 * intensity;
            particles.start();

            // Stop emitting after a short time for one-shot effects
            setTimeout(() => {
                particles.stop();
            }, 200);
        }

        this.particleSystems.set(id, particles);

        // If not continuous, auto-dispose after lifetime
        if (!continuous) {
            setTimeout(() => {
                this.disposeEffect(id);
            }, lifetime * 1000 + 500);
        }

        return id;
    }

    /**
     * Create a spark effect at a specified position
     * @param position Spark position
     * @param options Effect options
     * @returns Unique effect ID
     */
    public createSparkEffect(position: Vector3, options: Partial<ParticleEffectOptions> = {}): string {
        const id = options.id || 'spark_' + Date.now();
        const size = options.size || 1;
        const intensity = options.intensity || 1;
        const direction = options.direction || new Vector3(0, 1, 0);
        const color = options.color || new Color4(1, 0.9, 0.3, 1);
        const lifetime = options.lifetime || 1;
        const useGPU = options.useGPU !== undefined ? options.useGPU : true;
        const spreadAngle = options.spreadAngle || 30; // Degrees

        // Create particle system
        const particles = this.createParticleSystem(id, 500 * intensity, useGPU);
        particles.particleTexture = this.textures.get('spark') || new Texture(options.texturePath || this.defaultTextures.spark, this.scene);

        // Set emitter to position
        particles.emitter = position;
        particles.minEmitBox = new Vector3(-0.05 * size, -0.05 * size, -0.05 * size);
        particles.maxEmitBox = new Vector3(0.05 * size, 0.05 * size, 0.05 * size);

        // Configure particles
        particles.color1 = color;
        particles.color2 = new Color4(color.r, 0.5, 0.1, color.a);
        particles.colorDead = new Color4(0, 0, 0, 0);

        particles.minSize = 0.05 * size;
        particles.maxSize = 0.2 * size;

        particles.minLifeTime = 0.2 * lifetime;
        particles.maxLifeTime = 0.8 * lifetime;

        // Emit specified number of particles immediately
        particles.manualEmitCount = 100 * intensity;
        particles.blendMode = ParticleSystem.BLENDMODE_ADD;

        // Calculate emission cone based on direction and spread angle
        const dirNorm = direction.normalize();
        const perpVector = VectorUtils.reject(new Vector3(0, 1, 0), dirNorm).normalize();
        if (perpVector.length() < 0.01) {
            // If direction is parallel to up vector, use another perpendicular vector
            perpVector.copyFrom(VectorUtils.reject(new Vector3(1, 0, 0), dirNorm).normalize());
        }

        const spreadRad = MathUtils.toRadians(spreadAngle);
        const spreadMagnitude = Math.sin(spreadRad) * 5;

        particles.direction1 = dirNorm.add(perpVector.scale(-spreadMagnitude));
        particles.direction2 = dirNorm.add(perpVector.scale(spreadMagnitude));

        particles.minEmitPower = 3 * size;
        particles.maxEmitPower = 8 * size;

        // Create gravity effect
        particles.gravity = new Vector3(0, -5, 0);

        // Add drag to slow particles down
        particles.updateFunction = (system) => {
            for (let p = 0; p < system.particles.length; p++) {
                const particle = system.particles[p];
                particle.velocity.scaleInPlace(0.95);
            }
        };

        // Start the effect
        particles.start();
        setTimeout(() => {
            particles.stop();
        }, 50);

        this.particleSystems.set(id, particles);

        // Emit spark sound
        this.events.emit(GameEvent.AUDIO_PLAY, {
            sound: 'spark',
            volume: 0.3 * intensity
        });

        // Auto-dispose after lifetime
        setTimeout(() => {
            this.disposeEffect(id);
        }, lifetime * 1000 + 200);

        return id;
    }

    /**
     * Create a dust effect at a specified position
     * @param position Dust position
     * @param options Effect options
     * @returns Unique effect ID
     */
    public createDustEffect(position: Vector3, options: Partial<ParticleEffectOptions> = {}): string {
        const id = options.id || 'dust_' + Date.now();
        const size = options.size || 1;
        const intensity = options.intensity || 1;
        const lifetime = options.lifetime || 2;
        const color = options.color || new Color4(0.9, 0.8, 0.7, 0.5);
        const useGPU = options.useGPU !== undefined ? options.useGPU : false;
        const direction = options.direction || new Vector3(0, 1, 0);
        const continuous = options.continuous !== undefined ? options.continuous : false;
        const emitter = options.emitter || position;
        const followEmitter = options.followEmitter !== undefined ? options.followEmitter : true;

        // Create particle system
        const particles = this.createParticleSystem(id, 1000, useGPU);
        particles.particleTexture = this.textures.get('smoke') || new Texture(options.texturePath || this.defaultTextures.smoke, this.scene);

        // Set emitter
        if (emitter instanceof AbstractMesh || emitter instanceof TransformNode) {
            particles.emitter = emitter;
        } else {
            particles.emitter = position;
        }

        // Configure emitter box size
        particles.minEmitBox = new Vector3(-0.2 * size, 0, -0.2 * size);
        particles.maxEmitBox = new Vector3(0.2 * size, 0.05 * size, 0.2 * size);

        // Configure particles
        particles.color1 = color;
        particles.color2 = new Color4(color.r * 0.9, color.g * 0.9, color.b * 0.9, color.a * 0.7);
        particles.colorDead = new Color4(color.r * 0.8, color.g * 0.8, color.b * 0.8, 0);

        particles.minSize = 0.2 * size;
        particles.maxSize = 1.0 * size;

        particles.minLifeTime = 0.5 * lifetime;
        particles.maxLifeTime = lifetime;

        particles.emitRate = 50 * intensity;
        particles.blendMode = ParticleSystem.BLENDMODE_STANDARD;

        // Dust billows upward and outward
        const dirNorm = direction.normalize();
        particles.direction1 = dirNorm.scale(0.5).add(new Vector3(-0.5, 0, -0.5));
        particles.direction2 = dirNorm.scale(1.5).add(new Vector3(0.5, 0, 0.5));

        particles.minEmitPower = 0.2;
        particles.maxEmitPower = 1.5;

        // Add a small amount of gravity
        particles.gravity = new Vector3(0, -0.1, 0);

        // Add rotation for more natural dust swirls
        particles.minAngularSpeed = -0.5;
        particles.maxAngularSpeed = 0.5;

        // Start the effect
        if (continuous) {
            particles.start();
        } else {
            particles.manualEmitCount = 50 * intensity;
            particles.start();

            // Stop emitting after a short time for one-shot effects
            setTimeout(() => {
                particles.stop();
            }, 100);
        }

        this.particleSystems.set(id, particles);

        // If not continuous, auto-dispose after lifetime
        if (!continuous) {
            setTimeout(() => {
                this.disposeEffect(id);
            }, lifetime * 1000 + 100);
        }

        return id;
    }

    /**
     * Create a water splash effect at a specified position
     * @param position Splash position
     * @param options Effect options
     * @returns Unique effect ID
     */
    public createWaterSplashEffect(position: Vector3, options: Partial<ParticleEffectOptions> = {}): string {
        const id = options.id || 'splash_' + Date.now();
        const size = options.size || 1;
        const intensity = options.intensity || 1;
        const direction = options.direction || new Vector3(0, 1, 0);
        const color = options.color || new Color4(0.7, 0.8, 1.0, 0.8);
        const lifetime = options.lifetime || 1.5;
        const useGPU = options.useGPU !== undefined ? options.useGPU : true;

        // Create particle system
        const particles = this.createParticleSystem(id, 300 * intensity, useGPU);
        particles.particleTexture = this.textures.get('splash') || new Texture(options.texturePath || this.defaultTextures.splash, this.scene);

        // Set emitter to position
        particles.emitter = position;
        particles.minEmitBox = new Vector3(-0.1 * size, 0, -0.1 * size);
        particles.maxEmitBox = new Vector3(0.1 * size, 0.1 * size, 0.1 * size);

        // Configure particles
        particles.color1 = color;
        particles.color2 = new Color4(color.r * 0.9, color.g * 0.9, color.b, color.a * 0.9);
        particles.colorDead = new Color4(color.r * 0.8, color.g * 0.8, color.b, 0);

        particles.minSize = 0.1 * size;
        particles.maxSize = 0.4 * size;

        particles.minLifeTime = 0.5 * lifetime;
        particles.maxLifeTime = lifetime;

        // Emit specified number of particles immediately
        particles.manualEmitCount = 200 * intensity;
        particles.blendMode = ParticleSystem.BLENDMODE_STANDARD;

        // Calculate emission cone based on direction
        const dirNorm = direction.normalize();
        particles.direction1 = dirNorm.scale(3).add(new Vector3(-1, 0, -1));
        particles.direction2 = dirNorm.scale(8).add(new Vector3(1, 0, 1));

        particles.minEmitPower = 1 * size;
        particles.maxEmitPower = 5 * size;

        // Create gravity effect
        particles.gravity = new Vector3(0, -9.81, 0);

        // Start the effect
        particles.start();
        setTimeout(() => {
            particles.stop();
        }, 50);

        this.particleSystems.set(id, particles);

        // Create ripple effect on water surface
        if (options.createRipple !== false) {
            this.createRippleEffect(position, {
                size: size * 2,
                lifetime: lifetime * 1.5,
                intensity: intensity
            });
        }

        // Emit splash sound
        this.events.emit(GameEvent.AUDIO_PLAY, {
            sound: 'splash',
            volume: 0.4 * intensity * size
        });

        // Auto-dispose after lifetime
        setTimeout(() => {
            this.disposeEffect(id);
        }, lifetime * 1000 + 100);

        return id;
    }

    /**
     * Create a water ripple effect at a specified position
     * @param position Ripple position
     * @param options Effect options
     * @returns Unique effect ID
     */
    public createRippleEffect(position: Vector3, options: Partial<ParticleEffectOptions> = {}): string {
        const id = options.id || 'ripple_' + Date.now();
        const size = options.size || 1;
        const intensity = options.intensity || 1;
        const color = options.color || new Color4(0.7, 0.8, 1.0, 0.5);
        const lifetime = options.lifetime || 2;

        // Create a simple plane mesh for the ripple
        const rippleMesh = Mesh.CreatePlane(id, size, this.scene);
        rippleMesh.position = new Vector3(position.x, position.y + 0.01, position.z);
        rippleMesh.rotation.x = Math.PI / 2; // Horizontal

        // Create material for the ripple
        const rippleMaterial = new StandardMaterial(`${id}_material`, this.scene);
        rippleMaterial.diffuseTexture = this.textures.get('circle') || new Texture(options.texturePath || this.defaultTextures.circle, this.scene);
        rippleMaterial.diffuseTexture.hasAlpha = true;
        rippleMaterial.useAlphaFromDiffuseTexture = true;
        rippleMaterial.backFaceCulling = false;
        rippleMaterial.emissiveColor = new Color3(color.r, color.g, color.b);
        rippleMaterial.alpha = color.a;

        rippleMesh.material = rippleMaterial;

        // Create animations for the ripple
        // 1. Scaling animation to expand the ripple
        const scaleAnimation = new Animation(
            `${id}_scale`,
            'scaling',
            30,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const scaleKeys = [
            { frame: 0, value: new Vector3(0.1, 0.1, 0.1) },
            { frame: 30, value: new Vector3(size, size, size) }
        ];

        scaleAnimation.setKeys(scaleKeys);

        // 2. Alpha animation to fade out the ripple
        const alphaAnimation = new Animation(
            `${id}_alpha`,
            'material.alpha',
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const alphaKeys = [
            { frame: 0, value: color.a },
            { frame: 5, value: color.a * 0.8 },
            { frame: 30, value: 0 }
        ];

        alphaAnimation.setKeys(alphaKeys);

        // Add easing function for smoother animation
        const easingFunction = new CircleEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
        scaleAnimation.setEasingFunction(easingFunction);

        // Start animations
        rippleMesh.animations = [scaleAnimation, alphaAnimation];
        this.scene.beginAnimation(rippleMesh, 0, 30, false, 1.0, () => {
            // Dispose mesh when animation completes
            rippleMesh.dispose();
        });

        // No need to track as a particle system since it's a mesh with animation
        return id;
    }

    /**
     * Create an impact effect at a specified position
     * @param position Impact position
     * @param normal Surface normal at impact point
     * @param intensity Effect intensity (0-1)
     * @returns Unique effect ID
     */
    public createImpactEffect(position: Vector3, normal: Vector3, intensity: number = 1): string {
        const id = 'impact_' + Date.now();

        // Calculate impact direction perpendicular to the normal
        const impactDirection = normal.clone();

        // Create spark effect at the impact point
        this.createSparkEffect(position, {
            direction: impactDirection,
            intensity: intensity,
            size: intensity,
            spreadAngle: 40
        });

        // Create dust effect at the impact point
        this.createDustEffect(position, {
            direction: impactDirection,
            intensity: intensity,
            size: intensity * 1.5
        });

        // Play impact sound
        this.events.emit(GameEvent.AUDIO_PLAY, {
            sound: 'impact',
            volume: 0.3 * intensity
        });

        return id;
    }

    /**
     * Create a jetpack effect for an entity
     * @param entity Entity with jetpack
     * @param options Effect options
     * @returns Unique effect ID
     */
    public createJetpackEffect(entity: any, options: Partial<ParticleEffectOptions> = {}): string {
        const id = 'jetpack_' + entity.id;
        const intensity = options.intensity || 1;
        const size = options.size || 1;
        const useGPU = options.useGPU !== undefined ? options.useGPU : true;

        if (this.particleSystemSets.has(id)) {
            // Effect already exists
            return id;
        }

        // Get entity mesh
        const entityMesh = entity.getMesh ? entity.getMesh() : null;
        if (!entityMesh) {
            this.logger.warn('Cannot create jetpack effect: Entity has no mesh');
            return '';
        }

        // Create emitter node parented to entity mesh
        const emitterNode = new TransformNode(id + '_emitter', this.scene);
        emitterNode.parent = entityMesh;
        emitterNode.position = new Vector3(0, -0.8, -0.3); // Position at the bottom-back of the entity

        // Create fire effect
        const fireOptions: Partial<ParticleEffectOptions> = {
            intensity: intensity,
            size: size * 0.8,
            useGPU: useGPU,
            emitter: emitterNode,
            followEmitter: true,
            direction: new Vector3(0, -1, 0),
            id: id + '_fire'
        };

        const fireId = this.createFireEffect(new Vector3(0, 0, 0), fireOptions);

        // Create smoke effect
        const smokeOptions: Partial<ParticleEffectOptions> = {
            intensity: intensity * 0.5,
            size: size,
            useGPU: useGPU,
            emitter: emitterNode,
            followEmitter: true,
            direction: new Vector3(0, -1, 0),
            id: id + '_smoke',
            position: new Vector3(0, -0.5, 0)
        };

        const smokeId = this.createSmokeEffect(new Vector3(0, 0, 0), smokeOptions);

        // Create a set to track related effects
        const particleSet = new ParticleSystemSet();
        particleSet.systems.push(this.particleSystems.get(fireId)!);
        particleSet.systems.push(this.particleSystems.get(smokeId)!);
        this.particleSystemSets.set(id, particleSet);

        // Play jetpack sound
        this.events.emit(GameEvent.AUDIO_PLAY, {
            sound: 'jetpack',
            volume: 0.4 * intensity,
            loop: true,
            id: id
        });

        return id;
    }

    /**
     * Create a ski trail effect for an entity
     * @param entity Entity that is skiing
     * @param options Effect options
     * @returns Unique effect ID
     */
    public createSkiTrailEffect(entity: any, options: Partial<ParticleEffectOptions> = {}): string {
        const id = 'ski_trail_' + entity.id;
        const intensity = options.intensity || 1;
        const size = options.size || 1;
        const useGPU = options.useGPU !== undefined ? options.useGPU : false;

        if (this.particleSystemSets.has(id)) {
            // Effect already exists
            return id;
        }

        // Get entity mesh
        const entityMesh = entity.getMesh ? entity.getMesh() : null;
        if (!entityMesh) {
            this.logger.warn('Cannot create ski trail effect: Entity has no mesh');
            return '';
        }

        // Create left and right ski emitter nodes
        const leftEmitter = new TransformNode(id + '_left_emitter', this.scene);
        leftEmitter.parent = entityMesh;
        leftEmitter.position = new Vector3(-0.3, -0.9, 0); // Left ski

        const rightEmitter = new TransformNode(id + '_right_emitter', this.scene);
        rightEmitter.parent = entityMesh;
        rightEmitter.position = new Vector3(0.3, -0.9, 0); // Right ski

        // Create snow spray effect for left ski
        const leftOptions: Partial<ParticleEffectOptions> = {
            intensity: intensity,
            size: size * 0.6,
            useGPU: useGPU,
            emitter: leftEmitter,
            followEmitter: true,
            direction: new Vector3(0, 0.1, -1), // Spray backward
            id: id + '_left',
            color: new Color4(0.9, 0.9, 0.95, 0.6)
        };

        const leftId = this.createDustEffect(new Vector3(0, 0, 0), leftOptions);

        // Create snow spray effect for right ski
        const rightOptions: Partial<ParticleEffectOptions> = {
            intensity: intensity,
            size: size * 0.6,
            useGPU: useGPU,
            emitter: rightEmitter,
            followEmitter: true,
            direction: new Vector3(0, 0.1, -1), // Spray backward
            id: id + '_right',
            color: new Color4(0.9, 0.9, 0.95, 0.6)
        };

        const rightId = this.createDustEffect(new Vector3(0, 0, 0), rightOptions);

        // Create a set to track related effects
        const particleSet = new ParticleSystemSet();
        particleSet.systems.push(this.particleSystems.get(leftId)!);
        particleSet.systems.push(this.particleSystems.get(rightId)!);
        this.particleSystemSets.set(id, particleSet);

        // Modify particles based on speed if entity has movement component
        if (entity.getMovement && entity.getMovement().getSpeed) {
            const updateSpeed = () => {
                const speed = entity.getMovement().getSpeed();
                const speedFactor = MathUtils.clamp(speed / 10, 0.1, 3);

                const leftSystem = this.particleSystems.get(leftId);
                const rightSystem = this.particleSystems.get(rightId);

                if (leftSystem && rightSystem) {
                    // Adjust emission rate based on speed
                    leftSystem.emitRate = 20 * intensity * speedFactor;
                    rightSystem.emitRate = 20 * intensity * speedFactor;

                    // Adjust particle speed based on entity speed
                    leftSystem.minEmitPower = 0.2 * speedFactor;
                    leftSystem.maxEmitPower = 1.5 * speedFactor;
                    rightSystem.minEmitPower = 0.2 * speedFactor;
                    rightSystem.maxEmitPower = 1.5 * speedFactor;
                }

                // Continue updating while effect exists
                if (this.particleSystemSets.has(id)) {
                    setTimeout(updateSpeed, 100);
                }
            };

            // Start speed updates
            updateSpeed();
        }

        // Play skiing sound
        this.events.emit(GameEvent.AUDIO_PLAY, {
            sound: 'skiing',
            volume: 0.3 * intensity,
            loop: true,
            id: id
        });

        return id;
    }

    /**
     * Create a trail effect behind a moving object
     * @param entity Entity to create trail for
     * @param options Effect options
     * @returns Unique effect ID
     */
    public createTrailEffect(entity: any, options: Partial<ParticleEffectOptions> = {}): string {
        const id = options.id || 'trail_' + entity.id;
        const intensity = options.intensity || 1;
        const size = options.size || 1;
        const color = options.color || new Color4(0.5, 0.5, 0.8, 0.3);
        const lifetime = options.lifetime || 1;
        const useGPU = options.useGPU !== undefined ? options.useGPU : false;

        // Get entity mesh
        const entityMesh = entity.getMesh ? entity.getMesh() : null;
        if (!entityMesh) {
            this.logger.warn('Cannot create trail effect: Entity has no mesh');
            return '';
        }

        // Create emitter node parented to entity mesh
        const emitterNode = new TransformNode(id + '_emitter', this.scene);
        emitterNode.parent = entityMesh;
        emitterNode.position = new Vector3(0, 0, -0.5); // Position at the back of the entity

        // Create particle system
        const particles = this.createParticleSystem(id, 500, useGPU);
        particles.particleTexture = this.textures.get('smoke') || new Texture(options.texturePath || this.defaultTextures.smoke, this.scene);

        // Set emitter to the node
        particles.emitter = emitterNode;
        particles.minEmitBox = new Vector3(-0.1 * size, -0.1 * size, -0.1 * size);
        particles.maxEmitBox = new Vector3(0.1 * size, 0.1 * size, 0.1 * size);

        // Configure particles
        particles.color1 = color;
        particles.color2 = new Color4(color.r, color.g, color.b, color.a * 0.5);
        particles.colorDead = new Color4(color.r, color.g, color.b, 0);

        particles.minSize = 0.2 * size;
        particles.maxSize = 0.8 * size;

        particles.minLifeTime = 0.5 * lifetime;
        particles.maxLifeTime = lifetime;

        particles.emitRate = 30 * intensity;
        particles.blendMode = ParticleSystem.BLENDMODE_STANDARD;

        // Trail particles stay in place after emission
        particles.direction1 = new Vector3(0, 0, 0);
        particles.direction2 = new Vector3(0, 0, 0);

        particles.minEmitPower = 0.1;
        particles.maxEmitPower = 0.3;

        // No gravity for trail effect
        particles.gravity = new Vector3(0, 0, 0);

        // Slight rotation for more interesting effect
        particles.minAngularSpeed = -0.2;
        particles.maxAngularSpeed = 0.2;

        // Start the effect
        particles.start();

        this.particleSystems.set(id, particles);

        // Modify trail based on speed if entity has movement component
        if (entity.getMovement && entity.getMovement().getSpeed) {
            const updateSpeed = () => {
                const speed = entity.getMovement().getSpeed();
                const speedFactor = MathUtils.clamp(speed / 10, 0.1, 3);

                if (particles) {
                    // Adjust emission rate based on speed
                    particles.emitRate = 30 * intensity * speedFactor;

                    // Adjust particle size based on speed
                    particles.minSize = 0.2 * size * speedFactor;
                    particles.maxSize = 0.8 * size * speedFactor;
                }

                // Continue updating while effect exists
                if (this.particleSystems.has(id)) {
                    setTimeout(updateSpeed, 100);
                }
            };

            // Start speed updates
            updateSpeed();
        }

        return id;
    }

    /**
     * Create a teleport effect at a specified position
     * @param position Teleport position
     * @param options Effect options
     * @returns Unique effect ID
     */
    public createTeleportEffect(position: Vector3, options: Partial<ParticleEffectOptions> = {}): string {
        const id = options.id || 'teleport_' + Date.now();
        const size = options.size || 1;
        const intensity = options.intensity || 1;
        const color = options.color || new Color4(0.2, 0.6, 1.0, 1.0);
        const lifetime = options.lifetime || 2;
        const useGPU = options.useGPU !== undefined ? options.useGPU : true;

        // Create implosion effect
        const implosionId = id + '_implosion';
        const implosionParticles = this.createParticleSystem(implosionId, 500 * intensity, useGPU);
        implosionParticles.particleTexture = this.textures.get('flare') || new Texture(options.texturePath || this.defaultTextures.flare, this.scene);

        // Set emitter to position
        implosionParticles.emitter = position;
        implosionParticles.minEmitBox = new Vector3(-2 * size, -2 * size, -2 * size);
        implosionParticles.maxEmitBox = new Vector3(2 * size, 2 * size, 2 * size);

        // Configure particles
        implosionParticles.color1 = color;
        implosionParticles.color2 = new Color4(color.r * 0.8, color.g * 0.8, color.b, color.a);
        implosionParticles.colorDead = new Color4(color.r * 0.5, color.g * 0.5, color.b, 0);

        implosionParticles.minSize = 0.1 * size;
        implosionParticles.maxSize = 0.3 * size;

        implosionParticles.minLifeTime = 0.3 * lifetime;
        implosionParticles.maxLifeTime = 0.5 * lifetime;

        // Emit all particles at once
        implosionParticles.manualEmitCount = 200 * intensity;
        implosionParticles.blendMode = ParticleSystem.BLENDMODE_ADD;

        // Particles move toward center (implosion)
        implosionParticles.direction1 = new Vector3(0, 0, 0);
        implosionParticles.direction2 = new Vector3(0, 0, 0);

        implosionParticles.minEmitPower = 0;
        implosionParticles.maxEmitPower = 0;

        // Custom update to move particles toward center
        implosionParticles.updateFunction = (system) => {
            for (let p = 0; p < system.particles.length; p++) {
                const particle = system.particles[p];
                const toCenter = position.subtract(particle.position);
                const distance = toCenter.length();

                if (distance > 0.1) {
                    const direction = toCenter.normalize();
                    const speed = (5 * (1 - particle.age)) / particle.lifeTime;
                    particle.direction = direction.scale(speed);
                } else {
                    particle.age = particle.lifeTime; // Kill particle when it reaches center
                }
            }
        };

        // Start the implosion
        implosionParticles.start();
        this.particleSystems.set(implosionId, implosionParticles);

        // Create explosion effect after delay
        setTimeout(() => {
            const explosionId = id + '_explosion';
            const explosionParticles = this.createParticleSystem(explosionId, 500 * intensity, useGPU);
            explosionParticles.particleTexture = this.textures.get('flare') || new Texture(options.texturePath || this.defaultTextures.flare, this.scene);

            // Set emitter to position
            explosionParticles.emitter = position;
            explosionParticles.minEmitBox = new Vector3(-0.1, -0.1, -0.1);
            explosionParticles.maxEmitBox = new Vector3(0.1, 0.1, 0.1);

            // Configure particles
            explosionParticles.color1 = new Color4(1, 1, 1, 1);
            explosionParticles.color2 = color;
            explosionParticles.colorDead = new Color4(color.r * 0.5, color.g * 0.5, color.b, 0);

            explosionParticles.minSize = 0.1 * size;
            explosionParticles.maxSize = 0.3 * size;

            explosionParticles.minLifeTime = 0.3 * lifetime;
            explosionParticles.maxLifeTime = 0.6 * lifetime;

            // Emit all particles at once
            explosionParticles.manualEmitCount = 200 * intensity;
            explosionParticles.blendMode = ParticleSystem.BLENDMODE_ADD;

            // Particles move outward (explosion)
            explosionParticles.direction1 = new Vector3(-1, -1, -1);
            explosionParticles.direction2 = new Vector3(1, 1, 1);

            explosionParticles.minEmitPower = 3 * size;
            explosionParticles.maxEmitPower = 8 * size;

            // Start the explosion
            explosionParticles.start();
            this.particleSystems.set(explosionId, explosionParticles);

            // Play teleport sound
            this.events.emit(GameEvent.AUDIO_PLAY, {
                sound: 'teleport',
                volume: 0.5 * intensity
            });

            // Auto-dispose after lifetime
            setTimeout(() => {
                this.disposeEffect(explosionId);
            }, lifetime * 1000);
        }, 300);

        // Auto-dispose implosion after its lifetime
        setTimeout(() => {
            this.disposeEffect(implosionId);
        }, lifetime * 1000 * 0.6);

        // Create a set to track related effects
        const particleSet = new ParticleSystemSet();
        particleSet.systems.push(implosionParticles);
        this.particleSystemSets.set(id, particleSet);

        return id;
    }

    /**
     * Stop an active effect
     * @param id Effect ID
     */
    public stopEffect(id: string): void {
        // Stop individual particle system
        if (this.particleSystems.has(id)) {
            const system = this.particleSystems.get(id)!;
            system.stop();

            // Stop associated audio
            this.events.emit(GameEvent.AUDIO_STOP, { id });
        }

        // Stop particle system set
        if (this.particleSystemSets.has(id)) {
            const set = this.particleSystemSets.get(id)!;
            set.stop();

            // Stop associated audio
            this.events.emit(GameEvent.AUDIO_STOP, { id });
        }
    }

    /**
     * Dispose an effect and free resources
     * @param id Effect ID
     */
    public disposeEffect(id: string): void {
        // Dispose individual particle system
        if (this.particleSystems.has(id)) {
            const system = this.particleSystems.get(id)!;
            system.dispose();
            this.particleSystems.delete(id);

            // Stop associated audio
            this.events.emit(GameEvent.AUDIO_STOP, { id });
        }

        // Dispose particle system set
        if (this.particleSystemSets.has(id)) {
            const set = this.particleSystemSets.get(id)!;
            set.dispose();
            this.particleSystemSets.delete(id);

            // Stop associated audio
            this.events.emit(GameEvent.AUDIO_STOP, { id });
        }
    }

    /**
     * Update all active effects
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Update custom effects as needed
        this.particleSystems.forEach((system, id) => {
            // Run custom update functions for systems
            if ((system as any)._customUpdateFunction) {
                (system as any)._customUpdateFunction(system, deltaTime);
            }
        });
    }

    /**
     * Clean up all effects and resources
     */
    public dispose(): void {
        // Dispose all particle systems
        this.particleSystems.forEach(system => {
            system.dispose();
        });
        this.particleSystems.clear();

        // Dispose all particle system sets
        this.particleSystemSets.forEach(set => {
            set.dispose();
        });
        this.particleSystemSets.clear();

        // Dispose all textures
        this.textures.forEach(texture => {
            texture.dispose();
        });
        this.textures.clear();

        this.logger.info('Particle effects manager disposed');
    }
}
