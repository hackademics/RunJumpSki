import { Entity } from '../../src/core/base/Entity';
import { IComponent } from '../../src/core/base/IComponent';
import { EntityState } from '../../src/core/base/IEntity';
import { EntityError } from '../../src/utils/errors/EntityError';

class TestComponent implements IComponent {
    readonly type: string = 'TestComponent';
    readonly dependencies: string[] = [];

    private _enabled = true;
    private _entity: Entity | null = null;
    private _initialized = false;
    private _started = false;

    init(entity: Entity): void {
        this._entity = entity;
        this._initialized = true;
    }

    onDependenciesReady(): void {}

    onStart(): void {
        this._started = true;
    }

    update(deltaTime: number): void {}
    lateUpdate(deltaTime: number): void {}
    fixedUpdate(fixedDeltaTime: number): void {}

    onEnable(): void {
        this._enabled = true;
    }

    onDisable(): void {
        this._enabled = false;
    }

    dispose(): void {
        this._entity = null;
    }

    isEnabled(): boolean {
        return this._enabled;
    }

    setEnabled(enabled: boolean): void {
        if (this._enabled === enabled) return;
        this._enabled = enabled;
        if (enabled) {
            this.onEnable();
        } else {
            this.onDisable();
        }
    }

    getEntity(): Entity | null {
        return this._entity;
    }

    hasDependencies(): boolean {
        return this.dependencies.length > 0;
    }

    isInitialized(): boolean {
        return this._initialized;
    }

    isStarted(): boolean {
        return this._started;
    }
}

describe('Entity', () => {
    let entity: Entity;
    let component: TestComponent;

    beforeEach(() => {
        entity = new Entity('test-entity');
        component = new TestComponent();
    });

    describe('Lifecycle', () => {
        it('should be created with initial state', () => {
            expect(entity.id).toBe('test-entity');
            expect(entity.state).toBe(EntityState.Created);
            expect(entity.enabled).toBe(true);
        });

        it('should initialize correctly', () => {
            entity.addComponent(component);
            entity.init();

            expect(entity.state).toBe(EntityState.Initialized);
            expect(component.isInitialized()).toBe(true);
        });

        it('should start correctly', () => {
            entity.addComponent(component);
            entity.init();
            entity.start();

            expect(entity.state).toBe(EntityState.Active);
            expect(component.isStarted()).toBe(true);
        });

        it('should throw error when initializing twice', () => {
            entity.init();
            expect(() => entity.init()).toThrow(EntityError);
        });

        it('should throw error when starting before initialization', () => {
            expect(() => entity.start()).toThrow(EntityError);
        });
    });

    describe('Component Management', () => {
        it('should add component correctly', () => {
            const added = entity.addComponent(component);
            expect(added).toBe(component);
            expect(entity.hasComponent('TestComponent')).toBe(true);
        });

        it('should throw error when adding duplicate component', () => {
            entity.addComponent(component);
            expect(() => entity.addComponent(new TestComponent())).toThrow(EntityError);
        });

        it('should get component correctly', () => {
            entity.addComponent(component);
            const retrieved = entity.getComponent<TestComponent>('TestComponent');
            expect(retrieved).toBe(component);
        });

        it('should get required component correctly', () => {
            entity.addComponent(component);
            const retrieved = entity.getRequiredComponent<TestComponent>('TestComponent');
            expect(retrieved).toBe(component);
        });

        it('should throw error when getting required component that does not exist', () => {
            expect(() => entity.getRequiredComponent('NonExistentComponent')).toThrow(EntityError);
        });

        it('should remove component correctly', () => {
            entity.addComponent(component);
            const removed = entity.removeComponent('TestComponent');
            expect(removed).toBe(true);
            expect(entity.hasComponent('TestComponent')).toBe(false);
        });
    });

    describe('State Management', () => {
        beforeEach(() => {
            entity.addComponent(component);
            entity.init();
            entity.start();
        });

        it('should enable and disable correctly', () => {
            entity.disable();
            expect(entity.enabled).toBe(false);
            expect(entity.state).toBe(EntityState.Disabled);
            expect(component.isEnabled()).toBe(false);

            entity.enable();
            expect(entity.enabled).toBe(true);
            expect(component.isEnabled()).toBe(true);
        });

        it('should dispose correctly', () => {
            entity.dispose();
            expect(entity.state).toBe(EntityState.Disposed);
            expect(entity.enabled).toBe(false);
            expect(entity.getAllComponents().size).toBe(0);
        });

        it('should not dispose twice', () => {
            entity.dispose();
            entity.dispose(); // Should not throw
            expect(entity.state).toBe(EntityState.Disposed);
        });
    });

    describe('Update Cycle', () => {
        let updateSpy: jest.SpyInstance;
        let lateUpdateSpy: jest.SpyInstance;
        let fixedUpdateSpy: jest.SpyInstance;

        beforeEach(() => {
            updateSpy = jest.spyOn(component, 'update');
            lateUpdateSpy = jest.spyOn(component, 'lateUpdate');
            fixedUpdateSpy = jest.spyOn(component, 'fixedUpdate');

            entity.addComponent(component);
            entity.init();
            entity.start();
        });

        it('should update components when active', () => {
            entity.update(0.016);
            entity.lateUpdate(0.016);
            entity.fixedUpdate(0.02);

            expect(updateSpy).toHaveBeenCalledWith(0.016);
            expect(lateUpdateSpy).toHaveBeenCalledWith(0.016);
            expect(fixedUpdateSpy).toHaveBeenCalledWith(0.02);
        });

        it('should not update components when disabled', () => {
            entity.disable();

            entity.update(0.016);
            entity.lateUpdate(0.016);
            entity.fixedUpdate(0.02);

            expect(updateSpy).not.toHaveBeenCalled();
            expect(lateUpdateSpy).not.toHaveBeenCalled();
            expect(fixedUpdateSpy).not.toHaveBeenCalled();
        });

        it('should not update components when disposed', () => {
            entity.dispose();

            entity.update(0.016);
            entity.lateUpdate(0.016);
            entity.fixedUpdate(0.02);

            expect(updateSpy).not.toHaveBeenCalled();
            expect(lateUpdateSpy).not.toHaveBeenCalled();
            expect(fixedUpdateSpy).not.toHaveBeenCalled();
        });
    });
});
