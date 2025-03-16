import { Scene, PhysicsImpostor, Mesh, Ray, Vector3 as BabylonVector3 } from 'babylonjs';
import { IPhysicsSystem, PhysicsConfig, RigidBodyOptions, RaycastHit, CollisionGroup } from './IPhysicsSystem';
import { Vector3 } from '../../types/core/MathTypes';
import { PhysicsError } from '../../utils/errors/PhysicsError';
import { EventBus } from '../events/EventBus';

/**
 * Implementation of the physics system using Babylon.js physics engine
 */
export class PhysicsSystem implements IPhysicsSystem {
    private static instance: PhysicsSystem;
    private scene: Scene | null = null;
    private config: PhysicsConfig | null = null;
    private initialized = false;
    private nextGroupId = 128; // Start after predefined groups
    private collisionMasks: Map<number, number> = new Map();

    private constructor() {
        // Private constructor for singleton
    }

    public static getInstance(): PhysicsSystem {
        if (!PhysicsSystem.instance) {
            PhysicsSystem.instance = new PhysicsSystem();
        }
        return PhysicsSystem.instance;
    }

    public initialize(scene: Scene, config: PhysicsConfig): void {
        if (this.initialized) {
            throw new PhysicsError('Physics system is already initialized');
        }

        this.scene = scene;
        this.config = config;

        // Enable physics in the scene
        scene.enablePhysics(
            new BabylonVector3(config.gravity.x, config.gravity.y, config.gravity.z),
            new BABYLON.CannonJSPlugin()
        );

        // Set up collision groups
        this.initializeCollisionGroups();

        this.initialized = true;
        EventBus.getInstance().emit('physics:initialized', { success: true });
    }

    public createRigidBody(mesh: Mesh, options: RigidBodyOptions): PhysicsImpostor {
        if (!this.initialized || !this.scene) {
            throw new PhysicsError('Physics system is not initialized');
        }

        const impostor = new PhysicsImpostor(
            mesh,
            this.getImpostorType(options.type),
            {
                mass: options.mass,
                friction: options.friction ?? this.config!.defaultFriction,
                restitution: options.restitution ?? this.config!.defaultRestitution,
                group: options.group,
                mask: this.collisionMasks.get(options.group) ?? -1
            },
            this.scene
        );

        if (options.isKinematic) {
            impostor.physicsBody.type = CANNON.Body.KINEMATIC;
        }

        return impostor;
    }

    public createCollisionGroup(name: string): number {
        const groupId = this.nextGroupId;
        this.nextGroupId *= 2;
        this.collisionMasks.set(groupId, -1); // Collide with everything by default
        return groupId;
    }

    public setCollisionMask(group: number, collidesWithGroups: number[]): void {
        let mask = 0;
        for (const collidesWithGroup of collidesWithGroups) {
            mask |= collidesWithGroup;
        }
        this.collisionMasks.set(group, mask);
    }

    public checkCollision(groupA: number, groupB: number): boolean {
        const maskA = this.collisionMasks.get(groupA) ?? -1;
        return (maskA & groupB) !== 0;
    }

    public applyForce(body: PhysicsImpostor, force: Vector3, worldPoint?: Vector3): void {
        const forceVector = new BabylonVector3(force.x, force.y, force.z);
        const point = worldPoint ? new BabylonVector3(worldPoint.x, worldPoint.y, worldPoint.z) : null;
        body.applyForce(forceVector, point ? point : body.getObjectCenter());
    }

    public applyImpulse(body: PhysicsImpostor, impulse: Vector3, worldPoint?: Vector3): void {
        const impulseVector = new BabylonVector3(impulse.x, impulse.y, impulse.z);
        const point = worldPoint ? new BabylonVector3(worldPoint.x, worldPoint.y, worldPoint.z) : null;
        body.applyImpulse(impulseVector, point ? point : body.getObjectCenter());
    }

    public applyTorque(body: PhysicsImpostor, torque: Vector3): void {
        const torqueVector = new BabylonVector3(torque.x, torque.y, torque.z);
        body.setAngularVelocity(torqueVector);
    }

    public raycast(ray: Ray, maxDistance = Infinity, collisionGroup?: number): RaycastHit | null {
        if (!this.initialized || !this.scene) {
            throw new PhysicsError('Physics system is not initialized');
        }

        const hit = this.scene.pickWithRay(ray, (mesh) => {
            if (!mesh.physicsImpostor) return false;
            if (collisionGroup !== undefined) {
                return this.checkCollision(mesh.physicsImpostor.getParam('group'), collisionGroup);
            }
            return true;
        }, false, maxDistance);

        if (!hit || !hit.pickedMesh || !hit.pickedMesh.physicsImpostor) return null;

        return {
            point: { x: hit.pickedPoint!.x, y: hit.pickedPoint!.y, z: hit.pickedPoint!.z },
            normal: { x: hit.getNormal()!.x, y: hit.getNormal()!.y, z: hit.getNormal()!.z },
            distance: hit.distance,
            body: hit.pickedMesh.physicsImpostor
        };
    }

    public raycastAll(ray: Ray, maxDistance = Infinity, collisionGroup?: number): RaycastHit[] {
        if (!this.initialized || !this.scene) {
            throw new PhysicsError('Physics system is not initialized');
        }

        const hits = this.scene.multiPickWithRay(ray, (mesh) => {
            if (!mesh.physicsImpostor) return false;
            if (collisionGroup !== undefined) {
                return this.checkCollision(mesh.physicsImpostor.getParam('group'), collisionGroup);
            }
            return true;
        }, false, maxDistance);

        return hits
            .filter(hit => hit.pickedMesh && hit.pickedMesh.physicsImpostor)
            .map(hit => ({
                point: { x: hit.pickedPoint!.x, y: hit.pickedPoint!.y, z: hit.pickedPoint!.z },
                normal: { x: hit.getNormal()!.x, y: hit.getNormal()!.y, z: hit.getNormal()!.z },
                distance: hit.distance,
                body: hit.pickedMesh!.physicsImpostor!
            }));
    }

    public setPosition(body: PhysicsImpostor, position: Vector3): void {
        body.setDeltaPosition(new BabylonVector3(position.x, position.y, position.z));
    }

    public setRotation(body: PhysicsImpostor, rotation: Vector3): void {
        body.setDeltaRotation(new BabylonVector3(rotation.x, rotation.y, rotation.z));
    }

    public setLinearVelocity(body: PhysicsImpostor, velocity: Vector3): void {
        body.setLinearVelocity(new BabylonVector3(velocity.x, velocity.y, velocity.z));
    }

    public setAngularVelocity(body: PhysicsImpostor, velocity: Vector3): void {
        body.setAngularVelocity(new BabylonVector3(velocity.x, velocity.y, velocity.z));
    }

    public getLinearVelocity(body: PhysicsImpostor): Vector3 {
        const velocity = body.getLinearVelocity();
        return { x: velocity.x, y: velocity.y, z: velocity.z };
    }

    public getAngularVelocity(body: PhysicsImpostor): Vector3 {
        const velocity = body.getAngularVelocity();
        return { x: velocity.x, y: velocity.y, z: velocity.z };
    }

    public setDebugMode(enabled: boolean): void {
        if (!this.initialized || !this.scene) {
            throw new PhysicsError('Physics system is not initialized');
        }

        if (enabled) {
            this.scene.debugLayer.show();
        } else {
            this.scene.debugLayer.hide();
        }
    }

    public dispose(): void {
        if (this.scene) {
            this.scene.disablePhysicsEngine();
        }
        this.scene = null;
        this.config = null;
        this.initialized = false;
        this.collisionMasks.clear();
        this.nextGroupId = 128;
    }

    private getImpostorType(type: RigidBodyOptions['type']): number {
        switch (type) {
            case 'box':
                return PhysicsImpostor.BoxImpostor;
            case 'sphere':
                return PhysicsImpostor.SphereImpostor;
            case 'cylinder':
                return PhysicsImpostor.CylinderImpostor;
            case 'capsule':
                return PhysicsImpostor.CapsuleImpostor;
            case 'mesh':
                return PhysicsImpostor.MeshImpostor;
            default:
                throw new PhysicsError(`Invalid impostor type: ${type}`);
        }
    }

    private initializeCollisionGroups(): void {
        // Set up default collision masks
        this.collisionMasks.set(CollisionGroup.DEFAULT, -1); // Collide with everything
        this.collisionMasks.set(CollisionGroup.STATIC, -1);
        this.collisionMasks.set(CollisionGroup.DYNAMIC, -1);
        this.collisionMasks.set(CollisionGroup.PLAYER, CollisionGroup.STATIC | CollisionGroup.TERRAIN);
        this.collisionMasks.set(CollisionGroup.TERRAIN, -1);
        this.collisionMasks.set(CollisionGroup.PROJECTILE, CollisionGroup.STATIC | CollisionGroup.PLAYER | CollisionGroup.TERRAIN);
        this.collisionMasks.set(CollisionGroup.TRIGGER, 0); // Don't collide by default
    }
} 