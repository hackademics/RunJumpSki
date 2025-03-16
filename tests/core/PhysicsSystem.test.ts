import * as BABYLON from 'babylonjs';
import { PhysicsSystem } from '../../src/core/physics/PhysicsSystem';
import { PhysicsShapeType, PhysicsBodyConfig, IPhysicsEnabledObjectWithMetadata } from '../../src/types/core/PhysicsTypes';
import { PhysicsError } from '../../src/utils/errors/PhysicsError';
import { EventBus } from '../../src/core/events/EventBus';
import { Observable } from 'babylonjs';

jest.mock('babylonjs');
jest.mock('../../src/core/events/EventBus');

interface MockScene extends BABYLON.Scene {
    onPhysicsCollisionObservable: BABYLON.Observable<any>;
}

describe('PhysicsSystem', () => {
    let physicsSystem: PhysicsSystem;
    let scene: MockScene;
    let eventBus: jest.Mocked<EventBus>;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock scene
        scene = new BABYLON.Scene({} as BABYLON.Engine) as MockScene;
        scene.onPhysicsCollisionObservable = new Observable();
        scene.debugLayer = {
            show: jest.fn(),
            hide: jest.fn()
        } as any;

        // Get system instance
        physicsSystem = PhysicsSystem.getInstance();

        // Mock event bus
        eventBus = EventBus.getInstance() as jest.Mocked<EventBus>;
    });

    describe('Initialization', () => {
        it('should initialize physics engine successfully', () => {
            physicsSystem.initialize(scene);
            expect(scene.enablePhysics).toHaveBeenCalled();
        });

        it('should throw error if physics initialization fails', () => {
            (scene.enablePhysics as jest.Mock).mockImplementation(() => {
                throw new Error('Physics init failed');
            });
            expect(() => physicsSystem.initialize(scene)).toThrow(PhysicsError);
        });

        it('should initialize debug layer', () => {
            physicsSystem.initialize(scene);
            expect(scene.debugLayer).toBeDefined();
        });
    });

    describe('Body Creation', () => {
        let mesh: BABYLON.Mesh & IPhysicsEnabledObjectWithMetadata;

        beforeEach(() => {
            physicsSystem.initialize(scene);
            mesh = new BABYLON.Mesh('test', scene) as BABYLON.Mesh & IPhysicsEnabledObjectWithMetadata;
            mesh.metadata = { entityId: 'test-entity' };
        });

        it('should create a physics body with default config', () => {
            const config: PhysicsBodyConfig = {
                mass: 1,
                material: {
                    friction: 0.5,
                    restitution: 0.5,
                    density: 1.0
                },
                shape: {
                    type: PhysicsShapeType.BOX
                }
            };

            physicsSystem.createBody(mesh, config);
            expect(BABYLON.PhysicsImpostor).toHaveBeenCalledWith(
                mesh,
                BABYLON.PhysicsImpostor.BoxImpostor,
                { mass: 1, restitution: 0.5, friction: 0.5, density: 1.0 },
                scene
            );
        });

        it('should handle zero mass bodies as static', () => {
            const config: PhysicsBodyConfig = {
                mass: 0,
                material: {
                    friction: 0.5,
                    restitution: 0.5,
                    density: 1.0
                },
                shape: {
                    type: PhysicsShapeType.BOX
                }
            };
            
            const impostor = physicsSystem.createBody(mesh, config);
            expect(impostor.mass).toBe(0);
        });

        it('should throw error if mesh is invalid', () => {
            expect(() => physicsSystem.createBody(null as any, {} as PhysicsBodyConfig))
                .toThrow(PhysicsError);
        });
    });

    describe('Raycast', () => {
        beforeEach(() => {
            physicsSystem.initialize(scene);
        });

        it('should perform raycast and return hit result', async () => {
            const start = new BABYLON.Vector3(0, 0, 0);
            const direction = new BABYLON.Vector3(0, -1, 0);
            const maxDistance = 100;

            const hitMesh = new BABYLON.Mesh('hit', scene) as BABYLON.Mesh & IPhysicsEnabledObjectWithMetadata;
            hitMesh.metadata = { entityId: 'hit-entity' };

            const hit = {
                pickedMesh: hitMesh,
                pickedPoint: new BABYLON.Vector3(0, -5, 0),
                getNormal: () => new BABYLON.Vector3(0, 1, 0),
                distance: 5
            };

            (scene.pickWithRay as jest.Mock).mockReturnValue(hit);

            const result = await physicsSystem.raycast(start, direction, maxDistance);
            
            expect(result).toBeTruthy();
            expect(result?.point).toEqual(hit.pickedPoint);
            expect(result?.normal).toEqual(hit.getNormal());
            expect(result?.distance).toBe(hit.distance);
            expect(result?.entity).toBe(hitMesh);
            expect(scene.pickWithRay).toHaveBeenCalled();
        });

        it('should return null for no hit', async () => {
            (scene.pickWithRay as jest.Mock).mockReturnValue(null);
            const result = await physicsSystem.raycast(
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(0, -1, 0),
                100
            );
            expect(result).toBeNull();
        });

        it('should throw error when scene is not initialized', async () => {
            physicsSystem.dispose();
            await expect(physicsSystem.raycast(
                new BABYLON.Vector3(),
                new BABYLON.Vector3(0, -1, 0),
                100
            )).rejects.toThrow(PhysicsError);
        });

        it('should normalize direction vector', async () => {
            const start = new BABYLON.Vector3(0, 0, 0);
            const direction = new BABYLON.Vector3(0, -2, 0); // Non-normalized vector
            const maxDistance = 100;

            (scene.pickWithRay as jest.Mock).mockImplementation((ray) => {
                expect(ray.direction.length()).toBeCloseTo(1);
                return null;
            });

            await physicsSystem.raycast(start, direction, maxDistance);
        });
    });

    describe('Physics Materials', () => {
        beforeEach(() => {
            physicsSystem.initialize(scene);
        });

        it('should create and retrieve physics material', () => {
            const materialOptions = {
                friction: 0.5,
                restitution: 0.7,
                density: 1.2
            };

            physicsSystem.createMaterial('test-material', materialOptions);
            const material = physicsSystem.getMaterial('test-material');

            expect(material).toEqual(materialOptions);
        });

        it('should return undefined for non-existent material', () => {
            const material = physicsSystem.getMaterial('non-existent');
            expect(material).toBeUndefined();
        });
    });

    describe('Force Application', () => {
        let mesh: BABYLON.Mesh & IPhysicsEnabledObjectWithMetadata;
        let impostor: BABYLON.PhysicsImpostor;

        beforeEach(() => {
            physicsSystem.initialize(scene);
            mesh = new BABYLON.Mesh('test', scene) as BABYLON.Mesh & IPhysicsEnabledObjectWithMetadata;
            mesh.metadata = { entityId: 'test-entity' };
            impostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1 }, scene);
            mesh.physicsImpostor = impostor;
        });

        it('should apply force to physics body', () => {
            const force = new BABYLON.Vector3(1, 0, 0);
            physicsSystem.applyForce(impostor, force);
            expect(impostor.applyForce).toHaveBeenCalledWith(force, mesh.getAbsolutePosition());
        });

        it('should apply impulse to physics body', () => {
            const impulse = new BABYLON.Vector3(0, 1, 0);
            physicsSystem.applyImpulse(impostor, impulse);
            expect(impostor.applyImpulse).toHaveBeenCalledWith(impulse, mesh.getAbsolutePosition());
        });

        it('should throw error when applying force to invalid body', () => {
            expect(() => physicsSystem.applyForce(null as any, new BABYLON.Vector3())).toThrow(PhysicsError);
        });

        it('should throw error when applying impulse to invalid body', () => {
            expect(() => physicsSystem.applyImpulse(null as any, new BABYLON.Vector3())).toThrow(PhysicsError);
        });
    });

    describe('Velocity Control', () => {
        let mesh: BABYLON.Mesh & IPhysicsEnabledObjectWithMetadata;
        let impostor: BABYLON.PhysicsImpostor;

        beforeEach(() => {
            physicsSystem.initialize(scene);
            mesh = new BABYLON.Mesh('test', scene) as BABYLON.Mesh & IPhysicsEnabledObjectWithMetadata;
            mesh.metadata = { entityId: 'test-entity' };
            impostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1 }, scene);
            mesh.physicsImpostor = impostor;
        });

        it('should set linear velocity', () => {
            const velocity = new BABYLON.Vector3(1, 2, 3);
            physicsSystem.setLinearVelocity(impostor, velocity);
            expect(impostor.setLinearVelocity).toHaveBeenCalledWith(velocity);
        });

        it('should set angular velocity', () => {
            const velocity = new BABYLON.Vector3(0, 1, 0);
            physicsSystem.setAngularVelocity(impostor, velocity);
            expect(impostor.setAngularVelocity).toHaveBeenCalledWith(velocity);
        });

        it('should throw error when setting linear velocity on invalid body', () => {
            expect(() => physicsSystem.setLinearVelocity(null as any, new BABYLON.Vector3())).toThrow(PhysicsError);
        });

        it('should throw error when setting angular velocity on invalid body', () => {
            expect(() => physicsSystem.setAngularVelocity(null as any, new BABYLON.Vector3())).toThrow(PhysicsError);
        });
    });

    describe('Debug Rendering', () => {
        beforeEach(() => {
            physicsSystem.initialize(scene);
        });

        it('should enable debug rendering', () => {
            physicsSystem.enableDebugRenderer(true);
            expect(scene.debugLayer.show).toHaveBeenCalled();
        });

        it('should disable debug rendering', () => {
            physicsSystem.enableDebugRenderer(false);
            expect(scene.debugLayer.hide).toHaveBeenCalled();
        });
    });

    describe('Performance Monitoring', () => {
        beforeEach(() => {
            physicsSystem.initialize(scene);
        });

        it('should track active bodies count', () => {
            const mesh = new BABYLON.Mesh('test', scene) as BABYLON.Mesh & IPhysicsEnabledObjectWithMetadata;
            mesh.metadata = { entityId: 'test-entity' };

            const config: PhysicsBodyConfig = {
                mass: 1,
                material: {
                    friction: 0.5,
                    restitution: 0.5,
                    density: 1.0
                },
                shape: {
                    type: PhysicsShapeType.BOX
                }
            };

            physicsSystem.createBody(mesh, config);
            const stats = physicsSystem.getPerformanceStats();

            expect(stats.bodies).toBe(1);
            expect(stats.memoryUsage.bodies).toBe(1);
        });

        it('should track collision events', () => {
            const collisionEvent = {
                collider: { object: { metadata: { entityId: 'entityA' } } },
                collidedWith: { object: { metadata: { entityId: 'entityB' } } }
            };

            scene.onPhysicsCollisionObservable.notifyObservers(collisionEvent);
            const stats = physicsSystem.getPerformanceStats();

            expect(stats.collisionsPerFrame).toBe(1);
        });
    });

    describe('Cleanup', () => {
        let mesh: BABYLON.Mesh & IPhysicsEnabledObjectWithMetadata;
        let impostor: BABYLON.PhysicsImpostor;

        beforeEach(() => {
            physicsSystem.initialize(scene);
            mesh = new BABYLON.Mesh('test', scene) as BABYLON.Mesh & IPhysicsEnabledObjectWithMetadata;
            mesh.metadata = { entityId: 'test-entity' };
            impostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1 }, scene);
            mesh.physicsImpostor = impostor;
        });

        it('should remove physics body', () => {
            physicsSystem.removeBody(impostor);
            expect(impostor.dispose).toHaveBeenCalled();
            expect(mesh.physicsImpostor).toBeNull();
        });

        it('should handle removing non-existent physics body', () => {
            const meshWithoutPhysics = new BABYLON.Mesh('noPhysics', scene);
            expect(() => {
                if (meshWithoutPhysics.physicsImpostor) {
                    physicsSystem.removeBody(meshWithoutPhysics.physicsImpostor);
                }
            }).not.toThrow();
        });

        it('should clean up all resources on dispose', () => {
            physicsSystem.dispose();
            expect(scene.disablePhysicsEngine).toHaveBeenCalled();
            expect(scene.onPhysicsCollisionObservable.clear).toHaveBeenCalled();
            expect(scene.debugLayer.hide).toHaveBeenCalled();
        });
    });
}); 