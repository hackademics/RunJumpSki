import {
    Scene,
    Mesh,
    MeshBuilder,
    Vector3,
    StandardMaterial,
    Color3,
    PhysicsImpostor,
    TransformNode,
    Animation,
    ParticleSystem,
    Texture,
    Tags,
    Ray,
    RayHelper,
    AbstractMesh,
    Material
} from '@babylonjs/core';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { DefaultMaterials } from '../types/physics';

/**
 * Turret options for configuration
 */
export interface TurretOptions {
    /**
     * Position of the turret
     */
    position: Vector3;

    /**
     * Initial rotation of the turret (radians)
     */
    rotation?: number;

    /**
     * Detection range
     */
    detectionRange?: number;

    /**
     * Field of view (in radians)
     */
    fieldOfView?: number;

    /**
     * Firing rate (shots per second)
     */
    firingRate?: number;

    /**
     * Projectile speed
     */
    projectileSpeed?: number;

    /**
     * Projectile damage
     */
    projectileDamage?: number;

    /**
     * Whether the turret can rotate 360 degrees
     */
    fullRotation?: boolean;

    /**
     * Turret health
     */
    health?: number;

    /**
     * Whether turret is active initially
     */
    active?: boolean;
}

/**
 * Default turret options
 */
const DefaultTurretOptions: Partial<TurretOptions> = {
    rotation: 0,
    detectionRange: 50,
    fieldOfView: Math.PI / 2, // 90 degrees
    firingRate: 1,
    projectileSpeed: 30,
    projectileDamage: 10,
    fullRotation: true,
    health: 50,
    active: true
};

/**
 * Turret states
 */
type TurretState = 'idle' | 'alert' | 'tracking' | 'firing' | 'cooldown' | 'disabled';

/**
 * Enemy turret that fires at the player
 */
/**
 * Enemy turret that detects and fires at the player
 */
export class Turret {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private options: TurretOptions;
    private id: string;

    // Meshes
    private rootNode: TransformNode;
    private baseMesh?: Mesh;
    private bodyMesh?: Mesh;
    private barrelMesh?: Mesh;
    private collisionMesh?: Mesh;

    // Materials
    private baseMaterial?: StandardMaterial;
    private bodyMaterial?: StandardMaterial;
    private barrelMaterial?: StandardMaterial;
    private alertMaterial?: StandardMaterial;

    // State
    private state: TurretState = 'idle';
    private health: number;
    private target?: AbstractMesh;
    private targetPosition?: Vector3;
    private timeSinceLastFire: number = 0;
    private cooldownTime: number = 0;
    private active: boolean;
    private alertLevel: number = 0;

    // Detection
    private detectionRay?: Ray;
    private rayHelper?: RayHelper;
    private rotationSpeed: number = 0.5;
    private currentRotation: number = 0;
    private targetRotation: number = 0;
    private scanDirection: number = 1;
    private lastKnownTargetPosition?: Vector3;

    // Animation
    private firingAnimation?: Animation;
    private alertAnimation?: Animation;
    private scanTimer: number = 0;
    private muzzleFlash?: ParticleSystem;

    /**
     * Create a new turret entity
     * @param id Unique identifier for this turret
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param options Turret configuration options
     */
    constructor(id: string, scene: Scene, events: IEventEmitter, options: TurretOptions) {
        this.logger = new Logger(`Turret:${id}`);
        this.scene = scene;
        this.events = events;
        this.id = id;
        this.options = { ...DefaultTurretOptions as TurretOptions, ...options };
        this.health = this.options.health!;
        this.active = this.options.active!;

        // Create root node
        this.rootNode = new TransformNode(`turret_${id}_root`, this.scene);
        this.rootNode.position = this.options.position.clone();

        this.initialize();
    }

    /**
     * Initialize the turret
     */
    private initialize(): void {
        this.logger.debug(`Initializing turret ${this.id} at ${this.options.position}`);

        // Create meshes
        this.createMeshes();

        // Create materials
        this.createMaterials();

        // Apply materials
        this.applyMaterials();

        // Set up physics
        this.setupPhysics();

        // Create animations
        this.createAnimations();

        // Create particle systems
        this.createParticleSystems();

        // Create detection ray
        this.setupDetection();

        // Set initial rotation
        if (this.options.rotation) {
            this.rootNode.rotation.y = this.options.rotation;
            this.currentRotation = this.options.rotation;
            this.targetRotation = this.options.rotation;
        }

        // Set up event listeners
        this.setupEventListeners();

        // Set initial state
        this.setState('idle');
    }

    /**
     * Create turret meshes
     */
    private createMeshes(): void {
        // Create base
        this.baseMesh = MeshBuilder.CreateCylinder(
            `turret_${this.id}_base`,
            { height: 1, diameter: 2, tessellation: 24 },
            this.scene
        );
        this.baseMesh.parent = this.rootNode;
        this.baseMesh.position.y = 0.5;

        // Create body
        this.bodyMesh = MeshBuilder.CreateBox(
            `turret_${this.id}_body`,
            { width: 1.5, height: 1, depth: 1.5 },
            this.scene
        );
        this.bodyMesh.parent = this.rootNode;
        this.bodyMesh.position.y = 1.5;

        // Create barrel
        this.barrelMesh = MeshBuilder.CreateCylinder(
            `turret_${this.id}_barrel`,
            { height: 1.5, diameter: 0.3, tessellation: 12 },
            this.scene
        );
        this.barrelMesh.parent = this.bodyMesh;
        this.barrelMesh.position.z = 1;
        this.barrelMesh.rotation.x = Math.PI / 2;

        // Create collision mesh (invisible, for physics)
        this.collisionMesh = MeshBuilder.CreateCylinder(
            `turret_${this.id}_collision`,
            { height: 3, diameter: 2, tessellation: 12 },
            this.scene
        );
        this.collisionMesh.parent = this.rootNode;
        this.collisionMesh.position.y = 1.5;
        this.collisionMesh.isVisible = false;

        // Tag meshes for identification
        Tags.AddTagsTo(this.baseMesh, "turret");
        Tags.AddTagsTo(this.bodyMesh, "turret");
        Tags.AddTagsTo(this.barrelMesh, "turret");
        Tags.AddTagsTo(this.collisionMesh, "turret");
        Tags.AddTagsTo(this.collisionMesh, "turretCollision");
    }

    /**
     * Create turret materials
     */
    private createMaterials(): void {
        // Base material
        this.baseMaterial = new StandardMaterial(`turret_${this.id}_base_material`, this.scene);
        this.baseMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3);
        this.baseMaterial.specularColor = new Color3(0.1, 0.1, 0.1);

        // Body material
        this.bodyMaterial = new StandardMaterial(`turret_${this.id}_body_material`, this.scene);
        this.bodyMaterial.diffuseColor = new Color3(0.4, 0.4, 0.7);
        this.bodyMaterial.specularColor = new Color3(0.2, 0.2, 0.2);

        // Barrel material
        this.barrelMaterial = new StandardMaterial(`turret_${this.id}_barrel_material`, this.scene);
        this.barrelMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
        this.barrelMaterial.specularColor = new Color3(0.4, 0.4, 0.4);

        // Alert material (for when turret detects player)
        this.alertMaterial = new StandardMaterial(`turret_${this.id}_alert_material`, this.scene);
        this.alertMaterial.diffuseColor = new Color3(0.8, 0.2, 0.2);
        this.alertMaterial.emissiveColor = new Color3(0.5, 0.1, 0.1);
        this.alertMaterial.specularColor = new Color3(0.3, 0.3, 0.3);
    }

    /**
     * Apply materials to meshes
     */
    private applyMaterials(): void {
        if (this.baseMesh && this.baseMaterial) {
            this.baseMesh.material = this.baseMaterial;
        }

        if (this.bodyMesh && this.bodyMaterial) {
            this.bodyMesh.material = this.bodyMaterial;
        }

        if (this.barrelMesh && this.barrelMaterial) {
            this.barrelMesh.material = this.barrelMaterial;
        }
    }

    /**
     * Set up physics for the turret
     */
    private setupPhysics(): void {
        if (this.collisionMesh) {
            this.collisionMesh.physicsImpostor = new PhysicsImpostor(
                this.collisionMesh,
                PhysicsImpostor.CylinderImpostor,
                {
                    mass: 0, // Static object
                    restitution: 0.2,
                    friction: 0.5
                },
                this.scene
            );
        }
    }

    /**
     * Create turret animations
     */
    private createAnimations(): void {
        // Create firing animation for barrel recoil
        this.firingAnimation = new Animation(
            `turret_${this.id}_fire_anim`,
            "position.z",
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        // Keyframes for recoil and return
        const fireKeys = [
            { frame: 0, value: 1 },
            { frame: 3, value: 0.7 }, // Recoil back
            { frame: 10, value: 1 }   // Return to position
        ];

        this.firingAnimation.setKeys(fireKeys);

        // Add animation to barrel
        if (this.barrelMesh) {
            this.barrelMesh.animations = [this.firingAnimation];
        }

        // Create alert animation for body pulsing
        this.alertAnimation = new Animation(
            `turret_${this.id}_alert_anim`,
            "scaling",
            30,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        // Keyframes for pulsing
        const alertKeys = [
            { frame: 0, value: new Vector3(1, 1, 1) },
            { frame: 15, value: new Vector3(1.05, 1.05, 1.05) },
            { frame: 30, value: new Vector3(1, 1, 1) }
        ];

        this.alertAnimation.setKeys(alertKeys);

        // Add animation to body
        if (this.bodyMesh) {
            this.bodyMesh.animations = [this.alertAnimation];
        }
    }

    /**
     * Create particle systems for visual effects
     */
    private createParticleSystems(): void {
        if (!this.barrelMesh) return;

        // Create muzzle flash
        this.muzzleFlash = new ParticleSystem(`turret_${this.id}_muzzle_flash`, 20, this.scene);
        this.muzzleFlash.particleTexture = new Texture("textures/flare.png", this.scene);

        // Particle system settings
        this.muzzleFlash.emitter = this.barrelMesh;
        this.muzzleFlash.minEmitBox = new Vector3(0, 0, 1.5); // Front of barrel
        this.muzzleFlash.maxEmitBox = new Vector3(0, 0, 1.5);

        // Particles behavior
        this.muzzleFlash.color1 = new Color3(1, 0.5, 0.1);
        this.muzzleFlash.color2 = new Color3(1, 0.2, 0.1);
        this.muzzleFlash.colorDead = new Color3(0, 0, 0);

        this.muzzleFlash.minSize = 0.3;
        this.muzzleFlash.maxSize = 0.5;

        this.muzzleFlash.minLifeTime = 0.05;
        this.muzzleFlash.maxLifeTime = 0.1;

        this.muzzleFlash.emitRate = 100;

        this.muzzleFlash.direction1 = new Vector3(0, 0, 1);
        this.muzzleFlash.direction2 = new Vector3(0, 0, 1);

        this.muzzleFlash.minEmitPower = 1;
        this.muzzleFlash.maxEmitPower = 2;

        this.muzzleFlash.updateSpeed = 0.01;

        this.muzzleFlash.blendMode = ParticleSystem.BLENDMODE_ADD;

        // Don't start automatically
        this.muzzleFlash.stop();
    }

    /**
     * Set up target detection
     */
    private setupDetection(): void {
        // Create detection ray (will be updated in update method)
        this.detectionRay = new Ray(new Vector3(0, 0, 0), new Vector3(0, 0, 1), this.options.detectionRange);

        // Optionally show ray for debugging
        // this.rayHelper = new RayHelper(this.detectionRay);
        // this.rayHelper.show(this.scene);
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Listen for projectile hits
        this.events.on(GameEvent.PROJECTILE_HIT, (data) => {
            if (data.targetId === this.id ||
                (data.hitMesh && Tags.MatchesQuery(data.hitMesh, "turretCollision"))) {
                this.handleHit(data);
            }
        });
    }

    /**
     * Handle being hit by a projectile
     * @param data Hit event data
     */
    private handleHit(data: any): void {
        if (!this.active) return;

        // Reduce health
        this.health -= data.damage || 10;

        // Play hit effect
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'turretHit' });

        // Check if destroyed
        if (this.health <= 0) {
            this.destroy();
        } else {
            // Enter alert state if idle
            if (this.state === 'idle') {
                this.setState('alert');
            }
        }
    }

    /**
     * Destroy the turret
     */
    private destroy(): void {
        if (!this.active) return;

        this.logger.debug(`Turret ${this.id} destroyed`);

        // Mark as inactive
        this.active = false;

        // Play destruction effects
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'turretDestroy' });

        // Create explosion effect
        this.createExplosion();

        // Set state to disabled
        this.setState('disabled');

        // Emit destroyed event
        this.events.emit(GameEvent.TURRET_DESTROYED, {
            turretId: this.id,
            position: this.rootNode.position.clone()
        });

        // Hide meshes or show destroyed state
        if (this.bodyMesh) {
            this.bodyMesh.scaling = new Vector3(1.2, 0.5, 1.2); // Crushed appearance
            this.bodyMesh.rotation.z = 0.3; // Tilted

            // Apply damaged material
            if (this.alertMaterial) {
                this.bodyMesh.material = this.alertMaterial;
                this.alertMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
                this.alertMaterial.emissiveColor = new Color3(0, 0, 0);
            }
        }

        if (this.barrelMesh) {
            this.barrelMesh.isVisible = false;
        }

        // Disable physics
        if (this.collisionMesh && this.collisionMesh.physicsImpostor) {
            this.collisionMesh.physicsImpostor.dispose();
        }
    }

    /**
     * Create explosion effect
     */
    private createExplosion(): void {
        if (!this.bodyMesh) return;

        // Create explosion particle system
        const explosion = new ParticleSystem(`turret_${this.id}_explosion`, 100, this.scene);
        explosion.particleTexture = new Texture("textures/flare.png", this.scene);

        // Position at the body center
        explosion.emitter = this.bodyMesh.getAbsolutePosition().clone();

        // Particles behavior
        explosion.color1 = new Color3(1, 0.5, 0.1);
        explosion.color2 = new Color3(1, 0.2, 0.1);
        explosion.colorDead = new Color3(0.1, 0.1, 0.1);

        explosion.minSize = 0.3;
        explosion.maxSize = 0.8;

        explosion.minLifeTime = 0.5;
        explosion.maxLifeTime = 1.5;

        explosion.emitRate = 300;

        explosion.direction1 = new Vector3(-1, 1, -1);
        explosion.direction2 = new Vector3(1, 1, 1);

        explosion.minEmitPower = 5;
        explosion.maxEmitPower = 10;

        explosion.updateSpeed = 0.01;

        explosion.blendMode = ParticleSystem.BLENDMODE_ADD;

        // Start and stop after duration
        explosion.start();
        setTimeout(() => {
            explosion.stop();
            setTimeout(() => {
                explosion.dispose();
            }, 2000);
        }, 200);
    }

    /**
     * Update turret state
     * @param deltaTime Time since last update in seconds
     * @param playerMesh Player mesh for detection
     */
    public update(deltaTime: number, playerMesh?: AbstractMesh): void {
        if (!this.active || this.state === 'disabled') return;

        // Update cooldown
        if (this.cooldownTime > 0) {
            this.cooldownTime -= deltaTime;
            if (this.cooldownTime <= 0 && this.state === 'cooldown') {
                this.setState('tracking');
            }
        }

        // Update time since last fire
        this.timeSinceLastFire += deltaTime;

        // Update scan timer for idle state
        this.scanTimer += deltaTime;

        // Check for player detection
        if (playerMesh && this.state !== 'disabled') {
            this.detectTarget(playerMesh, deltaTime);
        }

        // Update behavior based on state
        switch (this.state) {
            case 'idle':
                this.updateIdleState(deltaTime);
                break;
            case 'alert':
                this.updateAlertState(deltaTime);
                break;
            case 'tracking':
                this.updateTrackingState(deltaTime);
                break;
            case 'firing':
                this.updateFiringState(deltaTime);
                break;
            case 'cooldown':
                // Handled by cooldown timer
                break;
        }
    }

    /**
     * Update turret in idle state
     * @param deltaTime Time since last update
     */
    private updateIdleState(deltaTime: number): void {
        // Perform scanning rotation
        if (this.scanTimer >= 3) {
            // Change scan direction
            this.scanDirection *= -1;
            this.scanTimer = 0;

            // Set new target rotation
            if (this.options.fullRotation) {
                // Full 360 scan
                this.targetRotation = this.currentRotation + (Math.PI * this.scanDirection);
            } else {
                // Limited scan arc
                const scanArc = this.options.fieldOfView || Math.PI / 2;
                this.targetRotation = this.options.rotation! + (scanArc * 0.5 * this.scanDirection);
            }
        }

        // Smoothly rotate towards target rotation
        this.rotateTowards(this.targetRotation, deltaTime * 0.5);
    }

    /**
     * Update turret in alert state
     * @param deltaTime Time since last update
     */
    private updateAlertState(deltaTime: number): void {
        // Increase alert level
        this.alertLevel += deltaTime;

        // Pulse the body in alert state
        if (this.bodyMesh && this.alertAnimation && !this.scene.getAnimationGroupByName(`turret_${this.id}_alert_anim`)) {
            this.scene.beginAnimation(this.bodyMesh, 0, 30, true);
        }

        // Apply alert material
        if (this.bodyMesh && this.alertMaterial && this.bodyMesh.material !== this.alertMaterial) {
            this.bodyMesh.material = this.alertMaterial;
        }

        // If last known target position exists, rotate towards it
        if (this.lastKnownTargetPosition) {
            const targetDirection = this.lastKnownTargetPosition.subtract(this.rootNode.position);
            targetDirection.y = 0; // Keep rotation in horizontal plane

            if (targetDirection.length() > 0.1) {
                const angle = Math.atan2(targetDirection.x, targetDirection.z);
                this.targetRotation = angle;
                this.rotateTowards(angle, deltaTime * 2);
            }
        }

        // After alert time, revert to idle
        if (this.alertLevel >= 3 && !this.target) {
            this.setState('idle');
        }
    }

    /**
     * Update turret in tracking state
     * @param deltaTime Time since last update
     */
    private updateTrackingState(deltaTime: number): void {
        // Only track if we have a target
        if (!this.target || !this.targetPosition) {
            this.setState('alert');
            return;
        }

        // Update target position
        this.targetPosition = this.target.position.clone();

        // Calculate direction to target
        const targetDirection = this.targetPosition.subtract(this.rootNode.position);
        targetDirection.y = 0; // Keep rotation in horizontal plane

        // Calculate angle to target
        const angle = Math.atan2(targetDirection.x, targetDirection.z);
        this.targetRotation = angle;

        // Smoothly rotate towards target
        const rotationComplete = this.rotateTowards(angle, deltaTime * 3);

        // If we're facing the target and cooldown is complete, fire
        if (rotationComplete && this.timeSinceLastFire >= (1 / this.options.firingRate!)) {
            this.setState('firing');
        }
    }

    /**
     * Update turret in firing state
     * @param deltaTime Time since last update
     */
    private updateFiringState(deltaTime: number): void {
        // Fire projectile
        this.fire();

        // Enter cooldown state
        this.setState('cooldown');
        this.cooldownTime = 1 / this.options.firingRate!;
    }

    /**
     * Fire a projectile at the target
     */
    private fire(): void {
        if (!this.barrelMesh || !this.targetPosition) return;

        // Get barrel world position and direction
        const barrelWorldPosition = this.barrelMesh.getAbsolutePosition();
        const barrelWorldDirection = this.barrelMesh.getDirection(new Vector3(0, 0, 1));

        // Play firing animation
        if (this.firingAnimation) {
            this.scene.beginAnimation(this.barrelMesh, 0, 10, false);
        }

        // Play muzzle flash
        if (this.muzzleFlash) {
            this.muzzleFlash.minEmitBox = new Vector3(0, 0, 1.5);
            this.muzzleFlash.maxEmitBox = new Vector3(0, 0, 1.5);
            this.muzzleFlash.start();
            setTimeout(() => this.muzzleFlash!.stop(), 50);
        }

        // Play fire sound
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'turretFire' });

        // Reset time since last fire
        this.timeSinceLastFire = 0;

        // Calculate projectile velocity
        const speed = this.options.projectileSpeed!;
        const velocity = barrelWorldDirection.scale(speed);

        // Emit fire event to create projectile
        this.events.emit(GameEvent.TURRET_FIRE, {
            turretId: this.id,
            position: barrelWorldPosition,
            velocity: velocity,
            damage: this.options.projectileDamage
        });
    }

    /**
     * Detect if player is in range and visible
     * @param playerMesh Player mesh to check
     * @param deltaTime Time since last update
     */
    private detectTarget(playerMesh: AbstractMesh, deltaTime: number): void {
        // Skip if no collision mesh for ray origin
        if (!this.bodyMesh) return;

        // Get body position and forward direction
        const bodyPosition = this.bodyMesh.getAbsolutePosition();
        const forwardDirection = this.bodyMesh.getDirection(new Vector3(0, 0, 1));

        // Update detection ray
        this.detectionRay!.origin = bodyPosition;
        this.detectionRay!.direction = forwardDirection;
        this.detectionRay!.length = this.options.detectionRange!;

        // Update ray helper if enabled
        if (this.rayHelper) {
            this.rayHelper.show(this.scene);
        }

        // Check distance to player
        const distanceToPlayer = Vector3.Distance(bodyPosition, playerMesh.position);

        // Only detect if within range
        if (distanceToPlayer <= this.options.detectionRange!) {
            // Calculate direction to player
            const directionToPlayer = playerMesh.position.subtract(bodyPosition).normalize();

            // Calculate angle to player
            const angleToDeg = Math.acos(Vector3.Dot(directionToPlayer, forwardDirection));

            // Check if player is within field of view
            if (angleToDeg <= (this.options.fieldOfView! / 2)) {
                // Perform raycast to check visibility
                const hit = this.scene.pickWithRay(this.detectionRay!, (mesh) => {
                    // Ignore turret meshes and projectiles
                    return !Tags.MatchesQuery(mesh, "turret") && !Tags.MatchesQuery(mesh, "projectile");
                });

                if (hit && hit.pickedMesh === playerMesh) {
                    // Player is visible
                    this.target = playerMesh;
                    this.targetPosition = playerMesh.position.clone();
                    this.lastKnownTargetPosition = playerMesh.position.clone();

                    // If not already tracking or firing, switch to tracking
                    if (this.state === 'idle' || this.state === 'alert') {
                        this.setState('tracking');
                    }
                } else {
                    // Player not directly visible but was recently seen
                    if (this.lastKnownTargetPosition && this.state === 'tracking') {
                        // Lost track of target, switch to alert
                        this.target = undefined;
                        this.setState('alert');
                    }
                }
            } else if (this.state === 'tracking') {
                // Player outside FOV, switch to alert
                this.target = undefined;
                this.setState('alert');
            }
        } else if (this.state === 'tracking') {
            // Player out of range, switch to alert
            this.target = undefined;
            this.setState('alert');
        }
    }

    /**
     * Rotate towards a target angle
     * @param targetAngle Target rotation angle
     * @param rotationSpeed Speed of rotation
     * @returns Whether rotation is complete
     */
    /**
     * Rotate towards a target angle
     * @param targetAngle Target rotation angle
     * @param rotationSpeed Speed of rotation
     * @returns Whether rotation is complete
     */
    private rotateTowards(targetAngle: number, rotationSpeed: number): boolean {
        // Normalize angles
        while (this.currentRotation < -Math.PI) this.currentRotation += Math.PI * 2;
        while (this.currentRotation > Math.PI) this.currentRotation -= Math.PI * 2;

        while (targetAngle < -Math.PI) targetAngle += Math.PI * 2;
        while (targetAngle > Math.PI) targetAngle -= Math.PI * 2;

        // Calculate shortest rotation direction
        let delta = targetAngle - this.currentRotation;

        // Ensure shortest path
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;

        // Check if rotation is complete
        const rotationComplete = Math.abs(delta) < 0.05;

        // If not complete, rotate towards target
        if (!rotationComplete) {
            // Calculate step size based on speed and direction
            const step = Math.sign(delta) * Math.min(Math.abs(delta), rotationSpeed);
            this.currentRotation += step;

            // Apply rotation to the root node
            this.rootNode.rotation.y = this.currentRotation;
        }

        return rotationComplete;
    }

    /**
     * Set turret state
     * @param state New state
     */
    private setState(state: TurretState): void {
        if (this.state === state) return;

        this.logger.debug(`Turret ${this.id} state changed: ${this.state} -> ${state}`);

        const oldState = this.state;
        this.state = state;

        // Handle state transition effects
        switch (state) {
            case 'idle':
                // Reset alert level
                this.alertLevel = 0;

                // Stop alert animation if running
                if (this.bodyMesh) {
                    this.scene.stopAnimation(this.bodyMesh);
                    this.bodyMesh.scaling = new Vector3(1, 1, 1);
                }

                // Reset to normal material
                if (this.bodyMesh && this.bodyMaterial) {
                    this.bodyMesh.material = this.bodyMaterial;
                }
                break;

            case 'alert':
                // Reset target
                this.target = undefined;
                this.targetPosition = undefined;

                // Start alert level timer
                this.alertLevel = 0;

                // Play alert sound
                this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'turretAlert' });
                break;

            case 'tracking':
                // Play tracking sound
                this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'turretTracking' });
                break;

            case 'firing':
                // No additional effects here - firing handled in update
                break;

            case 'cooldown':
                // No additional effects - cooldown handled in update
                break;

            case 'disabled':
                // Stop all animations
                if (this.bodyMesh) {
                    this.scene.stopAnimation(this.bodyMesh);
                }

                if (this.barrelMesh) {
                    this.scene.stopAnimation(this.barrelMesh);
                }

                // Clear target
                this.target = undefined;
                this.targetPosition = undefined;
                break;
        }

        // Emit event for state change
        this.events.emit(GameEvent.TURRET_STATE_CHANGE, {
            turretId: this.id,
            oldState,
            newState: state
        });
    }

    /**
     * Activate the turret
     */
    public activate(): void {
        if (this.active) return;

        this.logger.debug(`Turret ${this.id} activated`);

        this.active = true;
        this.setState('idle');

        // Play activation sound
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'turretActivate' });
    }

    /**
     * Deactivate the turret
     */
    public deactivate(): void {
        if (!this.active) return;

        this.logger.debug(`Turret ${this.id} deactivated`);

        this.active = false;
        this.setState('disabled');

        // Play deactivation sound
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'turretDeactivate' });
    }

    /**
     * Get the current state of the turret
     */
    public getState(): TurretState {
        return this.state;
    }

    /**
     * Get turret position
     */
    public getPosition(): Vector3 {
        return this.rootNode.position.clone();
    }

    /**
     * Get current target if any
     */
    public getTarget(): AbstractMesh | undefined {
        return this.target;
    }

    /**
     * Set turret health
     * @param health New health value
     */
    public setHealth(health: number): void {
        this.health = Math.max(0, health);

        if (this.health <= 0 && this.active) {
            this.destroy();
        }
    }

    /**
     * Get current health
     */
    public getHealth(): number {
        return this.health;
    }

    /**
     * Damage the turret
     * @param amount Damage amount
     * @param source Source of damage (optional)
     */
    public damage(amount: number, source?: string): void {
        if (!this.active) return;

        this.health -= amount;

        // Play hit sound
        this.events.emit(GameEvent.AUDIO_PLAY, { sound: 'turretHit' });

        // Flash the body red
        if (this.bodyMesh && this.alertMaterial && this.bodyMaterial) {
            this.bodyMesh.material = this.alertMaterial;
            setTimeout(() => {
                if (this.bodyMesh && this.bodyMaterial && this.active && this.state !== 'alert') {
                    this.bodyMesh.material = this.bodyMaterial;
                }
            }, 200);
        }

        // Enter alert state if idle
        if (this.state === 'idle') {
            this.setState('alert');
        }

        // Check if destroyed
        if (this.health <= 0) {
            this.destroy();
        }
    }

    /**
     * Set detection range
     * @param range New detection range
     */
    public setDetectionRange(range: number): void {
        this.options.detectionRange = range;
    }

    /**
     * Get current detection range
     */
    public getDetectionRange(): number {
        return this.options.detectionRange!;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Stop any animations
        if (this.bodyMesh) {
            this.scene.stopAnimation(this.bodyMesh);
        }

        if (this.barrelMesh) {
            this.scene.stopAnimation(this.barrelMesh);
        }

        // Dispose meshes
        if (this.baseMesh) {
            this.baseMesh.dispose();
        }

        if (this.bodyMesh) {
            this.bodyMesh.dispose();
        }

        if (this.barrelMesh) {
            this.barrelMesh.dispose();
        }

        if (this.collisionMesh) {
            if (this.collisionMesh.physicsImpostor) {
                this.collisionMesh.physicsImpostor.dispose();
            }
            this.collisionMesh.dispose();
        }

        // Dispose materials
        if (this.baseMaterial) {
            this.baseMaterial.dispose();
        }

        if (this.bodyMaterial) {
            this.bodyMaterial.dispose();
        }

        if (this.barrelMaterial) {
            this.barrelMaterial.dispose();
        }

        if (this.alertMaterial) {
            this.alertMaterial.dispose();
        }

        // Dispose particle systems
        if (this.muzzleFlash) {
            this.muzzleFlash.dispose();
        }

        // Dispose ray helper
        if (this.rayHelper) {
            this.rayHelper.dispose();
        }

        // Dispose transform node
        this.rootNode.dispose();

        this.logger.debug(`Turret ${this.id} disposed`);
    }
