import { Vector3, Scene, Mesh, ParticleSystem, Color4, Texture } from '@babylonjs/core';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { IJetpackComponent } from '../types/components';

/**
 * Jetpack component options
 */
export interface JetpackOptions {
    /**
     * Maximum energy level
     */
    maxEnergy?: number;

    /**
     * Energy regeneration rate per second
     */
    energyRegenRate?: number;

    /**
     * Energy consumption rate per second when active
     */
    energyUseRate?: number;

    /**
     * Force applied by jetpack
     */
    force?: number;

    /**
     * Direction of jetpack thrust (local space)
     */
    thrustDirection?: Vector3;

    /**
     * Position offset for jetpack (local space)
     */
    offset?: Vector3;

    /**
     * Whether to enable particle effects
     */
    enableParticles?: boolean;
}

/**
 * Default jetpack options
 */
const DefaultOptions: JetpackOptions = {
    maxEnergy: 100,
    energyRegenRate: 15, // per second
    energyUseRate: 30, // per second
    force: 15,
    thrustDirection: new Vector3(0, 1, 0),
    offset: new Vector3(0, -0.5, -0.2),
    enableParticles: true
};

/**
 * Jetpack component for entities
 */
export class JetpackComponent implements IJetpackComponent {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private entity: any;
    private options: JetpackOptions;
    private active: boolean = false;
    private energyLevel: number;
    private lastActive: boolean = false;

    // Particle system for visual effects
    private particleSystem?: ParticleSystem;
    private emitterMesh?: Mesh;

    /**
     * Create a new jetpack component
     * @param entity The entity this component belongs to
     * @param scene The scene
     * @param events The event emitter
     * @param options Configuration options
     */
    constructor(
        entity: any,
        scene: Scene,
        events: IEventEmitter,
        options: JetpackOptions = {}
    ) {
        this.logger = new Logger(`JetpackComponent:${entity.id || 'unknown'}`);
        this.scene = scene;
        this.events = events;
        this.entity = entity;
        this.options = { ...DefaultOptions, ...options };
        this.energyLevel = this.options.maxEnergy!;

        this.logger.debug('Jetpack component created');

        // Set up event subscriptions
        this.setupEventHandlers();
    }

    /**
     * Initialize the jetpack component
     * @param parentMesh The parent mesh to attach to
     */
    public init(parentMesh: Mesh): void {
        // Create emitter mesh for particles
        if (this.options.enableParticles) {
            this.setupParticleSystem(parentMesh);
        }

        this.logger.debug('Jetpack component initialized');
    }

    /**
     * Set up event handlers
     */
    private setupEventHandlers(): void {
        // Listen for input events to toggle jetpack
        this.events.on(GameEvent.KEY_DOWN, (data) => {
            if (data.key && data.key.toLowerCase() === 'control') {
                this.handleJetpackInput(true);
            }
        });

        this.events.on(GameEvent.KEY_UP, (data) => {
            if (data.key && data.key.toLowerCase() === 'control') {
                this.handleJetpackInput(false);
            }
        });
    }

    /**
     * Handle jetpack input
     * @param active Whether the jetpack should be active
     */
    private handleJetpackInput(active: boolean): void {
        // Only activate if we have energy
        if (active && this.energyLevel > 0) {
            this.activate();
        } else if (!active) {
            this.deactivate();
        }
    }

    /**
     * Set up particle system for jetpack effects
     * @param parentMesh The mesh to attach particles to
     */
    private setupParticleSystem(parentMesh: Mesh): void {
        // Create a small invisible mesh for the emitter
        this.emitterMesh = new Mesh("jetpackEmitter", this.scene);
        this.emitterMesh.parent = parentMesh;
        this.emitterMesh.position = this.options.offset!.clone();
        this.emitterMesh.isVisible = false;

        // Create particle system
        this.particleSystem = new ParticleSystem("jetpackParticles", 200, this.scene);

        // Texture
        this.particleSystem.particleTexture = new Texture("textures/flare.png", this.scene);

        // Emission properties
        this.particleSystem.emitter = this.emitterMesh;
        this.particleSystem.minEmitBox = new Vector3(-0.1, 0, -0.1);
        this.particleSystem.maxEmitBox = new Vector3(0.1, 0, 0.1);

        // Particle properties
        this.particleSystem.color1 = new Color4(1, 0.5, 0, 1);
        this.particleSystem.color2 = new Color4(1, 0.2, 0, 1);
        this.particleSystem.colorDead = new Color4(0, 0, 0, 0);

        this.particleSystem.minSize = 0.1;
        this.particleSystem.maxSize = 0.5;

        this.particleSystem.minLifeTime = 0.1;
        this.particleSystem.maxLifeTime = 0.3;

        this.particleSystem.emitRate = 100;

        // Set the direction to the opposite of thrust (particles go down when thrusting up)
        const direction = this.options.thrustDirection!.scale(-1);
        this.particleSystem.direction1 = direction.add(new Vector3(0.2, 0, 0.2));
        this.particleSystem.direction2 = direction.add(new Vector3(-0.2, 0, -0.2));

        this.particleSystem.minEmitPower = 1;
        this.particleSystem.maxEmitPower = 3;
        this.particleSystem.updateSpeed = 0.005;

        // Initially stopped
        this.particleSystem.stop();

        this.logger.debug('Particle system initialized');
    }

    /**
     * Update jetpack state
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Check if we need to toggle particles
        if (this.active !== this.lastActive) {
            if (this.active && this.particleSystem) {
                this.particleSystem.start();
            } else if (!this.active && this.particleSystem) {
                this.particleSystem.stop();
            }
            this.lastActive = this.active;
        }

        // Update energy level
        if (this.active) {
            // Consume energy
            this.energyLevel = Math.max(0, this.energyLevel - this.options.energyUseRate! * deltaTime);

            // Apply force if entity has a physics component
            if (this.entity.movement && this.entity.movement.applyForce) {
                const force = this.options.thrustDirection!.scale(this.options.force!);
                this.entity.movement.applyForce(force);
            }

            // Deactivate if out of energy
            if (this.energyLevel <= 0) {
                this.deactivate();
                this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'jetpackEmpty' });
            }
        } else {
            // Regenerate energy when not active
            this.energyLevel = Math.min(
                this.options.maxEnergy!,
                this.energyLevel + this.options.energyRegenRate! * deltaTime
            );
        }

        // Update particle emission rate based on energy level
        if (this.particleSystem && this.active) {
            // Scale emission rate by energy level
            const energyPercent = this.energyLevel / this.options.maxEnergy!;
            this.particleSystem.emitRate = 100 * energyPercent;
        }

        // Emit energy update event
        this.events.emit(GameEvent.PLAYER_STATE_CHANGE, {
            entity: this.entity,
            jetpackActive: this.active,
            energyLevel: this.energyLevel,
            maxEnergy: this.options.maxEnergy
        });
    }

    /**
     * Activate the jetpack
     */
    public activate(): void {
        if (this.active || this.energyLevel <= 0) return;

        this.active = true;
        this.events.emit(GameEvent.PLAYER_JETPACK_START, {
            entity: this.entity
        });
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'jetpackStart' });

        this.logger.debug('Jetpack activated');
    }

    /**
     * Deactivate the jetpack
     */
    public deactivate(): void {
        if (!this.active) return;

        this.active = false;
        this.events.emit(GameEvent.PLAYER_JETPACK_STOP, {
            entity: this.entity
        });
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'jetpackStop' });

        this.logger.debug('Jetpack deactivated');
    }

    /**
     * Set activation state directly
     * @param active Whether the jetpack should be active
     */
    public setActive(active: boolean): void {
        if (active) {
            this.activate();
        } else {
            this.deactivate();
        }
    }

    /**
     * Get current energy level
     */
    public getEnergyLevel(): number {
        return this.energyLevel;
    }

    /**
     * Get maximum energy level
     */
    public getMaxEnergy(): number {
        return this.options.maxEnergy!;
    }

    /**
     * Set energy level directly
     * @param energy New energy level
     */
    public setEnergyLevel(energy: number): void {
        this.energyLevel = Math.max(0, Math.min(this.options.maxEnergy!, energy));
    }

    /**
     * Check if jetpack is active
     */
    public isActive(): boolean {
        return this.active;
    }

    /**
     * Set jetpack force
     * @param force Force magnitude
     */
    public setForce(force: number): void {
        this.options.force = force;
    }

    /**
     * Set thrust direction
     * @param direction Direction vector
     */
    public setThrustDirection(direction: Vector3): void {
        this.options.thrustDirection = direction.normalize();

        // Update particle system direction
        if (this.particleSystem) {
            const particleDir = direction.scale(-1);
            this.particleSystem.direction1 = particleDir.add(new Vector3(0.2, 0, 0.2));
            this.particleSystem.direction2 = particleDir.add(new Vector3(-0.2, 0, -0.2));
        }
    }

    /**
     * Set energy regeneration rate
     * @param rate Energy units per second
     */
    public setEnergyRegenRate(rate: number): void {
        this.options.energyRegenRate = rate;
    }

    /**
     * Set energy consumption rate
     * @param rate Energy units per second
     */
    public setEnergyUseRate(rate: number): void {
        this.options.energyUseRate = rate;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.particleSystem) {
            this.particleSystem.dispose();
        }

        if (this.emitterMesh) {
            this.emitterMesh.dispose();
        }

        this.logger.debug('Jetpack component disposed');
    }
}
