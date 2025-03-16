import { Component, ComponentOptions, ComponentState } from '@core/base/Component';
import { IEntity } from '@core/base/IEntity';
import { ComponentError } from '@utils/errors/ComponentError';
import { EventBus } from '@core/events/EventBus';

// Test component implementation
class TestComponent extends Component {
    public readonly type = 'test';
    public updateCalled = false;
    public lateUpdateCalled = false;
    public fixedUpdateCalled = false;
    public onStartCalled = false;
    public onEnableCalled = false;
    public onDisableCalled = false;

    constructor(options: ComponentOptions) {
        super(options);
    }

    public update(deltaTime: number): void {
        this.updateCalled = true;
    }

    public override lateUpdate(deltaTime: number): void {
        this.lateUpdateCalled = true;
    }

    public override fixedUpdate(fixedDeltaTime: number): void {
        this.fixedUpdateCalled = true;
    }

    public override onStart(): void {
        super.onStart();
        this.onStartCalled = true;
    }

    public override onEnable(): void {
        super.onEnable();
        this.onEnableCalled = true;
    }

    public override onDisable(): void {
        super.onDisable();
        this.onDisableCalled = true;
    }

    // Expose protected methods for testing
    public getState(): ComponentState {
        return this.state;
    }

    public getMissingDeps(): string[] {
        return this.getMissingDependencies();
    }
}

// Dependency component
class DependencyComponent extends Component {
    public readonly type = 'dependency';

    constructor() {
        super({ type: 'dependency' });
    }

    public update(_deltaTime: number): void {
        // Empty implementation
    }
}

describe('Component', () => {
    let component: TestComponent;
    let entity: IEntity;

    beforeEach(() => {
        // Create a mock entity
        entity = {
            id: 'test-entity',
            addComponent: jest.fn().mockImplementation((comp) => {
                comp.init(entity);
                return comp;
            }),
            getComponent: jest.fn().mockReturnValue(undefined),
            removeComponent: jest.fn().mockReturnValue(true),
            update: jest.fn(),
            dispose: jest.fn()
        };
    });

    describe('Lifecycle', () => {
        beforeEach(() => {
            component = new TestComponent({ type: 'test' });
        });

        test('should initialize correctly', () => {
            component.init(entity);
            expect(component.getEntity()).toBe(entity);
            expect(component.getState()).toBe(ComponentState.DependenciesReady);
        });

        test('should handle enable/disable', () => {
            component.init(entity);
            
            expect(component.isEnabled()).toBe(true);
            expect(component.onEnableCalled).toBe(false);
            
            component.setEnabled(false);
            expect(component.isEnabled()).toBe(false);
            expect(component.onDisableCalled).toBe(true);
            expect(component.getState()).toBe(ComponentState.Disabled);
            
            component.setEnabled(true);
            expect(component.isEnabled()).toBe(true);
            expect(component.onEnableCalled).toBe(true);
            expect(component.getState()).toBe(ComponentState.Enabled);
        });

        test('should handle disposal', () => {
            component.init(entity);
            component.dispose();
            
            expect(component.getEntity()).toBeUndefined();
            expect(component.getState()).toBe(ComponentState.Disposed);
            expect(component.isEnabled()).toBe(false);
        });
    });

    describe('Dependencies', () => {
        beforeEach(() => {
            component = new TestComponent({
                type: 'test',
                dependencies: ['dependency']
            });
        });

        test('should detect missing dependencies', () => {
            expect(() => component.init(entity)).toThrow(ComponentError);
            expect(component.getMissingDeps()).toContain('dependency');
        });

        test('should initialize with satisfied dependencies', () => {
            const dependency = new DependencyComponent();
            jest.spyOn(entity, 'getComponent').mockImplementation((type) => {
                return type === 'dependency' ? dependency : undefined;
            });

            component.init(entity);
            expect(component.hasDependencies()).toBe(true);
            expect(component.getMissingDeps()).toHaveLength(0);
        });
    });

    describe('Updates', () => {
        beforeEach(() => {
            component = new TestComponent({ type: 'test' });
            component.init(entity);
        });

        test('should handle update cycle', () => {
            component.update(1/60);
            component.lateUpdate(1/60);
            component.fixedUpdate(1/60);

            expect(component.updateCalled).toBe(true);
            expect(component.lateUpdateCalled).toBe(true);
            expect(component.fixedUpdateCalled).toBe(true);
        });

        test('should not update when disabled', () => {
            component.setEnabled(false);
            
            component.update(1/60);
            component.lateUpdate(1/60);
            component.fixedUpdate(1/60);

            expect(component.updateCalled).toBe(false);
            expect(component.lateUpdateCalled).toBe(false);
            expect(component.fixedUpdateCalled).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('should handle initialization errors', () => {
            const badEntity = {
                ...entity,
                id: 'bad-entity',
                getComponent: () => { throw new Error('Database error'); }
            };

            expect(() => component.init(badEntity)).toThrow(ComponentError);
        });

        test('should handle disposal errors', () => {
            const errorComponent = new TestComponent({
                type: 'error',
                enabled: true
            });
            
            // Mock setEnabled to throw
            jest.spyOn(errorComponent, 'setEnabled').mockImplementation(() => {
                throw new Error('Failed to disable');
            });

            expect(() => errorComponent.dispose()).toThrow(ComponentError);
        });
    });
}); 