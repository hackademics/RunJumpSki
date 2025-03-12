import {
    Scene,
    FreeCamera,
    Vector3,
    TransformNode,
    Mesh,
    Animation,
    CameraInputsManager,
    ICameraInput,
    Camera
} from '@babylonjs/core';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { ICameraComponent } from '../types/components';

/**
 * Custom mouse input for FPS camera
 */
class FPSCameraMouseInput implements ICameraInput<FreeCamera> {
    camera!: FreeCamera;
    private _events: IEventEmitter;
    private _sensitivityX: number = 0.005;
    private _sensitivityY: number = 0.005;
    private _pointerLocked: boolean = false;

    constructor(events: IEventEmitter) {
        this._events = events;
    }

    public getClassName(): string {
        return "FPSCameraMouseInput";
    }

    public getSimpleName(): string {
        return "mouse";
    }

    public attachControl(noPreventDefault?: boolean): void {
        this._events.on(GameEvent.MOUSE_MOVE, (data) => {
            if (this._pointerLocked) {
                // this.camera.rotationQuaternion = null;

                // Apply rotation
                this.camera.rotation.y += data.movementX * this._sensitivityX;
                this.camera.rotation.x += data.movementY * this._sensitivityY;

                // Clamp vertical rotation to prevent flipping
                const clampLimit = Math.PI / 2 - 0.01;
                this.camera.rotation.x = Math.max(-clampLimit, Math.min(clampLimit, this.camera.rotation.x));
            }
        });

        this._events.on('mouse:lock', (data) => {
            this._pointerLocked = data.locked;
        });
    }

    public detachControl(): void {
        // Event handling is managed externally, so we don't need to do anything here
    }

    public checkInputs(): void {
        // Input is handled in the event listeners
    }

    public setSensitivity(x: number, y: number): void {
        this._sensitivityX = x;
        this._sensitivityY = y;
    }
}

/**
 * Camera shake effect parameters
 */
interface ShakeEffect {
    /**
     * Shake intensity
     */
    intensity: number;

    /**
     * Remaining shake duration in seconds
     */
    duration: number;

    /**
     * Original camera position
     */
    originalPosition: Vector3;
}

/**
 * Camera component for player
 */
export class CameraComponent implements ICameraComponent {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private entity: any;
    private camera?: FreeCamera;
    private target?: TransformNode;
    private offset: Vector3 = new Vector3(0, 0, 0);
    private shakeEffect?: ShakeEffect;
    private fov: number = 75 * Math.PI / 180; // 75 degrees in radians
    private speed: number = 0;
    private dynamicFov: boolean = true;

    /**
     * Initialize camera component
     * @param entity Entity to attach to
     * @param scene Babylon.js scene
     * @param events Event emitter
     */
    constructor(entity: any, scene: Scene, events: IEventEmitter) {
        this.logger = new Logger(`CameraComponent:${entity.getId?.() || 'unknown'}`);
        this.scene = scene;
        this.events = events;
        this.entity = entity;
    }

    /**
     * Initialize the camera
     * @param target Target node to follow
     */
    public init(target: TransformNode): void {
        try {
            this.logger.info('Initializing camera...');

            this.target = target;

            // Create free camera
            this.camera = new FreeCamera(`camera_${this.entity.getId?.() || 'unknown'}`,
                this.target.position.clone(), this.scene);

            // Configure camera
            this.camera.fov = this.fov;
            this.camera.minZ = 0.1;
            this.camera.maxZ = 10000;
            this.camera.rotation = new Vector3(0, 0, 0);

            // Make the camera the active camera
            this.scene.activeCamera = this.camera;

            // Set target as parent
            this.camera.parent = this.target;

            // Remove default inputs
            this.camera.inputs.clear();

            // Add custom mouse input
            const mouseInput = new FPSCameraMouseInput(this.events);
            this.camera.inputs.add(mouseInput);

            // Set up event handlers
            this.setupEventHandlers();

            this.logger.info('Camera initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize camera', error);
            throw error;
        }
    }

    /**
     * Set up event handlers
     */
    private setupEventHandlers(): void {
        // Set up event listeners for camera effects
        this.events.on(GameEvent.PLAYER_STATE_CHANGE, (data) => {
            if (data.entity === this.entity) {
                this.handleStateChange(data);
            }
        });

        // Request pointer lock on canvas click
        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (canvas) {
            canvas.addEventListener('click', () => {
                canvas.requestPointerLock();
            });
        }
    }

    /**
     * Handle player state changes
     * @param data Event data
     */
    private handleStateChange(data: any): void {
        if (!this.camera) return;

        const { newState } = data;

        // Adjust camera based on state
        switch (newState) {
            case 'skiing':
                // Lower camera slightly for skiing
                this.offset = new Vector3(0, -0.2, 0);
                break;
            case 'flying':
            case 'jetpacking':
                // No specific adjustments for flying
                this.offset = new Vector3(0, 0, 0);
                break;
            case 'running':
            default:
                // Default camera offset
                this.offset = new Vector3(0, 0, 0);
                break;
        }
    }

    /**
     * Update camera
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        if (!this.camera || !this.target) {
            return;
        }

        // Update camera position based on target and offset
        this.camera.position.copyFrom(this.offset);

        // Get player speed for dynamic FOV
        if (this.entity.getMovement) {
            this.speed = this.entity.getMovement().getSpeed();

            // Apply dynamic FOV based on speed
            if (this.dynamicFov) {
                this.updateDynamicFov();
            }
        }

        // Update camera shake effect
        this.updateShake(deltaTime);
    }

    /**
     * Update dynamic field of view based on speed
     */
    private updateDynamicFov(): void {
        if (!this.camera) return;

        // Calculate target FOV based on speed
        const baseFov = 75 * Math.PI / 180; // 75 degrees in radians
        const maxFovIncrease = 20 * Math.PI / 180; // 20 degrees in radians
        const speedThreshold = 10; // Speed at which FOV starts to increase
        const maxSpeed = 40; // Speed at which FOV reaches maximum

        let targetFov = baseFov;

        if (this.speed > speedThreshold) {
            // Calculate FOV increase based on speed
            const speedRatio = Math.min(1, (this.speed - speedThreshold) / (maxSpeed - speedThreshold));
            targetFov = baseFov + (maxFovIncrease * speedRatio);
        }

        // Smoothly interpolate current FOV to target
        this.camera.fov = this.camera.fov * 0.9 + targetFov * 0.1;
    }

    /**
     * Update camera shake effect
     * @param deltaTime Time since last update in seconds
     */
    private updateShake(deltaTime: number): void {
        if (!this.camera || !this.shakeEffect) {
            return;
        }

        // Update shake duration
        this.shakeEffect.duration -= deltaTime;

        if (this.shakeEffect.duration <= 0) {
            // Reset camera position when shake ends
            this.camera.position.copyFrom(this.shakeEffect.originalPosition);
            this.shakeEffect = undefined;
            return;
        }

        // Calculate shake intensity (fades out over time)
        const intensity = this.shakeEffect.intensity * (this.shakeEffect.duration / 0.5); // 0.5 is the max duration

        // Apply random offset to camera position
        const offsetX = (Math.random() - 0.5) * intensity;
        const offsetY = (Math.random() - 0.5) * intensity;
        const offsetZ = (Math.random() - 0.5) * intensity;

        this.camera.position.x = this.shakeEffect.originalPosition.x + offsetX;
        this.camera.position.y = this.shakeEffect.originalPosition.y + offsetY;
        this.camera.position.z = this.shakeEffect.originalPosition.z + offsetZ;
    }

    /**
     * Apply camera shake effect
     * @param intensity Shake intensity
     * @param duration Shake duration in seconds
     */
    public shake(intensity: number, duration: number): void {
        if (!this.camera) {
            return;
        }

        // Store original position
        const originalPosition = this.camera.position.clone();

        this.shakeEffect = {
            intensity,
            duration,
            originalPosition
        };

        this.logger.debug(`Applied camera shake: intensity=${intensity}, duration=${duration}`);
    }

    /**
     * Get the Babylon.js camera
     */
    public getCamera(): Camera {
        if (!this.camera) {
            throw new Error('Camera is not initialized');
        }
        return this.camera;
    }

    /**
     * Set the target to follow
     * @param target Target object to follow
     */
    public setTarget(target: TransformNode): void {
        this.target = target;

        if (this.camera) {
            this.camera.parent = target;
        }
    }

    /**
     * Set camera offset from target
     * @param offset Offset vector
     */
    public setOffset(offset: Vector3): void {
        this.offset = offset.clone();
    }

    /**
     * Enable or disable dynamic FOV
     * @param enabled Whether dynamic FOV is enabled
     */
    public setDynamicFov(enabled: boolean): void {
        this.dynamicFov = enabled;

        // Reset FOV if disabled
        if (!enabled && this.camera) {
            this.camera.fov = this.fov;
        }
    }

    /**
     * Set field of view
     * @param fov Field of view in radians
     */
    public setFov(fov: number): void {
        this.fov = fov;

        if (this.camera) {
            this.camera.fov = fov;
        }
    }

    /**
     * Enable or disable pointer lock (for mouse control)
     * @param enabled Whether pointer lock is enabled
     */
    public setPointerLock(enabled: boolean): void {
        const canvas = this.scene.getEngine().getRenderingCanvas();

        if (canvas) {
            if (enabled) {
                canvas.requestPointerLock();
            } else if (document.exitPointerLock) {
                document.exitPointerLock();
            }
        }
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.camera) {
            this.camera.dispose();
            this.camera = undefined;
        }

        this.target = undefined;

        this.logger.debug('Camera component disposed');
    }
}