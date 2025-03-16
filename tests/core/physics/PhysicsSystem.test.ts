import { PhysicsSystem } from '../../../src/core/physics/PhysicsSystem';
import { PhysicsConfig, CollisionGroup } from '../../../src/core/physics/IPhysicsSystem';
import { PhysicsError } from '../../../src/utils/errors/PhysicsError';
import { EventBus } from '../../../src/core/events/EventBus';
import { Vector3 } from '../../../src/types/core/MathTypes';
import * as BABYLON from 'babylonjs';
import * as CANNON from 'cannon';

jest.mock('../../../src/core/events/EventBus');

describe('PhysicsSystem', () => {
    let physicsSystem: PhysicsSystem;
    let eventBus: jest.Mocked<EventBus>;
    let scene: BABYLON.Scene;
    let mockConfig: PhysicsConfig;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock scene
        const engine = new BABYLON.NullEngine();
        scene = new BABYLON.Scene(engine);

        // Mock event bus
        eventBus = EventBus.getInstance() as jest.Mocked<EventBus>;

        // Create test config
        mockConfig = {
            gravity: { x: 0, y: -9.81, z: 0 },
            defaultFriction: 0.5,
            defaultRestitution: 0.3,
            defaultMass: 1,
            maxSubSteps: 3,
            fixedTimeStep: 1/60,
            debugMode: false
        };

        // Get system instance
        physicsSystem = PhysicsSystem.getInstance();
    });

    afterEach(() => {
        if (physicsSystem) {
            physicsSystem.dispose();
        }
        if (scene) {
            scene.dispose();
        }
    });

    describe('Initialization', () => {
        it('should initialize with config', () => {
            expect(() => physicsSystem.initialize(scene, mockConfig)).not.toThrow();
            expect(eventBus.emit).toHaveBeenCalledWith('physics:initialized', { success: true });
        });

        it('should throw when initializing twice', () => {
            physicsSystem.initialize(scene, mockConfig);
            expect(() => physicsSystem.initialize(scene, mockConfig)).toThrow(PhysicsError);
        });

        it('should set up gravity correctly', () => {
            physicsSystem.initialize(scene, mockConfig);
            const physicsEngine = scene.getPhysicsEngine();
            expect(physicsEngine).toBeTruthy();
            expect(physicsEngine?.gravity.y).toBe(mockConfig.gravity.y);
        });
    });

    describe('Collision Groups', () => {
        beforeEach(() => {
            physicsSystem.initialize(scene, mockConfig);
        });

        it('should create collision groups', () => {
            const group1 = physicsSystem.createCollisionGroup('player');
            const group2 = physicsSystem.createCollisionGroup('terrain');
            expect(group1).not.toBe(group2);
        });

        it('should handle collision masks', () => {
            const player = physicsSystem.createCollisionGroup('player');
            const terrain = physicsSystem.createCollisionGroup('terrain');
            const projectile = physicsSystem.createCollisionGroup('projectile');

            physicsSystem.setCollisionMask(player, [terrain]);
            physicsSystem.setCollisionMask(projectile, [terrain, player]);

            expect(physicsSystem.checkCollision(player, terrain)).toBe(true);
            expect(physicsSystem.checkCollision(player, projectile)).toBe(true);
            expect(physicsSystem.checkCollision(terrain, projectile)).toBe(true);
        });
    });

    describe('Rigid Body Creation', () => {
        beforeEach(() => {
            physicsSystem.initialize(scene, mockConfig);
        });

        it('should create box rigid body', () => {
            const mesh = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, scene);
            const body = physicsSystem.createRigidBody(mesh, {
                mass: 1,
                type: 'box',
                group: CollisionGroup.DEFAULT
            });
            expect(body).toBeTruthy();
            expect(body.mass).toBe(1);
        });

        it('should create sphere rigid body', () => {
            const mesh = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: 1 }, scene);
            const body = physicsSystem.createRigidBody(mesh, {
                mass: 1,
                type: 'sphere',
                group: CollisionGroup.DEFAULT
            });
            expect(body).toBeTruthy();
            expect(body.mass).toBe(1);
        });

        it('should handle kinematic bodies', () => {
            const mesh = BABYLON.MeshBuilder.CreateBox('kinematic', { size: 1 }, scene);
            const body = physicsSystem.createRigidBody(mesh, {
                mass: 0,
                type: 'box',
                isKinematic: true,
                group: CollisionGroup.DEFAULT
            });
            expect(body.isKinematic).toBe(true);
        });
    });

    describe('Forces and Impulses', () => {
        let mesh: BABYLON.Mesh;
        let body: BABYLON.PhysicsImpostor;

        beforeEach(() => {
            physicsSystem.initialize(scene, mockConfig);
            mesh = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, scene);
            body = physicsSystem.createRigidBody(mesh, {
                mass: 1,
                type: 'box',
                group: CollisionGroup.DEFAULT
            });
        });

        it('should apply force', () => {
            const force = new Vector3(10, 0, 0);
            physicsSystem.applyForce(body, force);
            expect(body.getLinearVelocity().x).toBeGreaterThan(0);
        });

        it('should apply impulse', () => {
            const impulse = new Vector3(0, 10, 0);
            physicsSystem.applyImpulse(body, impulse);
            expect(body.getLinearVelocity().y).toBeGreaterThan(0);
        });

        it('should apply torque', () => {
            const torque = new Vector3(0, 10, 0);
            physicsSystem.applyTorque(body, torque);
            expect(body.getAngularVelocity().y).not.toBe(0);
        });
    });

    describe('Raycasting', () => {
        beforeEach(() => {
            physicsSystem.initialize(scene, mockConfig);
        });

        it('should detect ray intersection', () => {
            const box = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, scene);
            box.position.z = 5;
            physicsSystem.createRigidBody(box, {
                mass: 1,
                type: 'box',
                group: CollisionGroup.DEFAULT
            });

            const ray = new BABYLON.Ray(
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(0, 0, 1),
                10
            );
            const hit = physicsSystem.raycast(ray);
            expect(hit).toBeTruthy();
            expect(hit?.distance).toBeCloseTo(4.5, 1);
        });

        it('should handle ray miss', () => {
            const box = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, scene);
            box.position.x = 5;
            physicsSystem.createRigidBody(box, {
                mass: 1,
                type: 'box',
                group: CollisionGroup.DEFAULT
            });

            const ray = new BABYLON.Ray(
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(0, 0, 1),
                10
            );
            const hit = physicsSystem.raycast(ray);
            expect(hit).toBeNull();
        });
    });

    describe('Collision Detection', () => {
        beforeEach(() => {
            physicsSystem.initialize(scene, mockConfig);
        });

        it('should detect collisions between bodies', () => {
            const collisionHandler = jest.fn();
            eventBus.on('physics:collision', collisionHandler);

            const box1 = BABYLON.MeshBuilder.CreateBox('box1', { size: 1 }, scene);
            const box2 = BABYLON.MeshBuilder.CreateBox('box2', { size: 1 }, scene);
            box2.position.y = 1.1;

            const body1 = physicsSystem.createRigidBody(box1, {
                mass: 1,
                type: 'box',
                group: CollisionGroup.DEFAULT
            });
            const body2 = physicsSystem.createRigidBody(box2, {
                mass: 1,
                type: 'box',
                group: CollisionGroup.DEFAULT
            });

            // Simulate physics for a few frames
            for (let i = 0; i < 10; i++) {
                scene.getPhysicsEngine()?.step(1/60);
            }

            expect(collisionHandler).toHaveBeenCalled();
        });
    });

    describe('Performance and Memory', () => {
        beforeEach(() => {
            physicsSystem.initialize(scene, mockConfig);
        });

        it('should handle many bodies efficiently', () => {
            const bodies: BABYLON.PhysicsImpostor[] = [];
            const startTime = performance.now();

            // Create 100 bodies
            for (let i = 0; i < 100; i++) {
                const mesh = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
                mesh.position.y = i * 2;
                bodies.push(physicsSystem.createRigidBody(mesh, {
                    mass: 1,
                    type: 'box',
                    group: CollisionGroup.DEFAULT
                }));
            }

            // Simulate physics for a few frames
            for (let i = 0; i < 10; i++) {
                scene.getPhysicsEngine()?.step(1/60);
            }

            const endTime = performance.now();
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should clean up resources properly', () => {
            const mesh = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, scene);
            const body = physicsSystem.createRigidBody(mesh, {
                mass: 1,
                type: 'box',
                group: CollisionGroup.DEFAULT
            });

            const disposeSpy = jest.spyOn(body, 'dispose');
            physicsSystem.dispose();
            expect(disposeSpy).toHaveBeenCalled();
        });
    });
}); 