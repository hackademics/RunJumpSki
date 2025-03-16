# RunJumpSki Game Development Roadmap

## Overview

This document serves as the central guide for LLM-assisted development of RunJumpSki, a first-person speedrun game inspired by Tribes 2's skiing mechanics. It outlines the project architecture, development sequence, and guidelines to ensure consistent, high-quality code generation.

## Project Architecture

RunJumpSki follows a component-based architecture with clear separation between:

1. **Core Engine** - Reusable systems that could work in any game
2. **Game-Specific** - Systems unique to RunJumpSki (skiing, jetpack, etc.)

### Directory Structure

```
runjumpski/
├── src/
│   ├── core/               # Core game engine systems
│   │   ├── base/           # Base classes and interfaces
│   │   ├── physics/        # Physics engine
│   │   ├── input/          # Input handling
│   │   ├── rendering/      # Rendering system
│   │   ├── audio/          # Audio system
│   │   ├── events/         # Event messaging
│   │   └── utils/          # Utility functions
│   ├── components/         # Reusable component library
│   │   ├── movement/       # Movement components
│   │   ├── collision/      # Collision components
│   │   ├── camera/         # Camera components
│   │   └── weapon/         # Weapon components
│   ├── game/               # Game-specific implementations
│   │   ├── player/         # Player systems
│   │   ├── terrain/        # Terrain systems
│   │   ├── weapons/        # Weapon systems
│   │   ├── targets/        # Target and turret systems
│   │   └── ui/             # Game UI systems
│   ├── data/               # Game data and configuration
│   │   ├── maps/           # Map definitions
│   │   ├── weapons/        # Weapon configurations
│   │   └── entities/       # Entity configurations
│   ├── utils/              # Utility functions
│   └── index.ts            # Main entry point
├── public/                 # Static assets
├── config/                 # Project configuration
├── tests/                  # Test files
└── scripts/                # Build and utility scripts
```

## Development Phases

### Phase 1: Foundation (Core Engine)

1. Base classes and interfaces
2. Event messaging system
3. Physics system setup
4. Input handling
5. Rendering pipeline
6. Asset management
7. Core utilities

### Phase 2: Core Mechanics

1. Terrain system
2. Player entity
3. Movement component
4. Camera component
5. Collision detection
6. Basic physics interactions

### Phase 3: Skiing & Jetpack

1. Slope detection
2. Skiing movement state
3. Jetpack system
4. Energy management
5. Movement state transitions
6. Momentum conservation

### Phase 4: Weapons & Combat

1. Weapon system
2. Projectile physics
3. Spinfusor implementation
4. Disk-jumping mechanics
5. Grenade implementation
6. Target and turret entities

### Phase 5: Game Systems

1. HUD implementation
2. Speed and energy display
3. Timer and scoring
4. Map boundaries
5. Start/finish line detection
6. Level progression

### Phase 6: Content & Polish

1. Level design tools
2. Map creation
3. Difficulty progression
4. Visual effects
5. Audio implementation
6. Performance optimization

## Base Classes and Interfaces

### Component System

All game functionality is built on a component system:

```typescript
// Core component interface
export interface IComponent {
    readonly type: string;
    init(entity: IEntity): void;
    update(deltaTime: number): void;
    dispose(): void;
    isEnabled(): boolean;
    setEnabled(enabled: boolean): void;
}

// Base component implementation
export abstract class Component implements IComponent {
    public abstract readonly type: string;
    protected entity?: IEntity;
    protected enabled: boolean = true;

    constructor(options: ComponentOptions) {
        // Implementation
    }

    public init(entity: IEntity): void {
        this.entity = entity;
    }

    public abstract update(deltaTime: number): void;

    public dispose(): void {
        this.entity = undefined;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
}
```

### Entity System

Entities are containers for components:

```typescript
// Core entity interface
export interface IEntity {
    readonly id: string;
    addComponent<T extends IComponent>(component: T): T;
    getComponent<T extends IComponent>(type: string): T | undefined;
    removeComponent(type: string): boolean;
    update(deltaTime: number): void;
    dispose(): void;
}

// Base entity implementation
export abstract class Entity implements IEntity {
    public readonly id: string;
    protected components: Map<string, IComponent> = new Map();

    constructor(id: string) {
        this.id = id;
    }

    public addComponent<T extends IComponent>(component: T): T {
        this.components.set(component.type, component);
        component.init(this);
        return component;
    }

    public getComponent<T extends IComponent>(type: string): T | undefined {
        return this.components.get(type) as T | undefined;
    }

    public removeComponent(type: string): boolean {
        const component = this.components.get(type);
        if (component) {
            component.dispose();
            return this.components.delete(type);
        }
        return false;
    }

    public update(deltaTime: number): void {
        this.components.forEach(component => {
            if (component.isEnabled()) {
                component.update(deltaTime);
            }
        });
    }

    public dispose(): void {
        this.components.forEach(component => component.dispose());
        this.components.clear();
    }
}
```

### Event System

Communication between systems uses an event messaging system:

```typescript
// Event types
export interface EventMap {
    [eventName: string]: any;
}

// Event bus interface
export interface IEventBus {
    on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void;
    off<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void;
    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void;
}

// Event bus implementation
export class EventBus implements IEventBus {
    private static instance: EventBus;
    private handlers: Map<string, Set<Function>> = new Map();

    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    public on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
        if (!this.handlers.has(event as string)) {
            this.handlers.set(event as string, new Set());
        }
        this.handlers.get(event as string)?.add(handler);
    }

    public off<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
        this.handlers.get(event as string)?.delete(handler);
    }

    public emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
        this.handlers.get(event as string)?.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for ${String(event)}:`, error);
            }
        });
    }
}
```

## Game-Specific Systems

### Skiing Mechanics

The skiing system extends the base movement component:

```typescript
// Skiing state within movement component
export interface SkiingState {
    isSkiing: boolean;
    surfaceNormal: Vector3;
    surfaceAngle: number;
    frictionCoefficient: number;
}

// Skiing component
export class SkiingComponent extends Component implements ISkiingComponent {
    public readonly type: string = 'skiing';
    private state: SkiingState;
    
    // Implementation details
}
```

### Jetpack System

The jetpack system manages energy consumption and thrust:

```typescript
// Jetpack component
export interface JetpackState {
    isActive: boolean;
    energy: number;
    maxEnergy: number;
    rechargeRate: number;
    thrustPower: number;
}

export class JetpackComponent extends Component implements IJetpackComponent {
    public readonly type: string = 'jetpack';
    private state: JetpackState;
    
    // Implementation details
}
```

## Technical Guidelines

### TypeScript Features

1. **Generics** for type-safe components
2. **Interfaces** for clear contracts
3. **Discriminated Unions** for state handling
4. **Decorators** for cross-cutting concerns
5. **Dependency Injection** for loose coupling

### Error Handling

Custom error types with proper propagation:

```typescript
// Base error class
export class GameError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GameError';
    }
}

// Component-specific error
export class ComponentError extends GameError {
    constructor(
        public readonly componentType: string,
        public readonly entityId: string,
        message: string
    ) {
        super(`${componentType} (${entityId}): ${message}`);
        this.name = 'ComponentError';
    }
}
```

### Dependency Injection

Using a simple service container:

```typescript
export class ServiceContainer {
    private static instance: ServiceContainer;
    private services: Map<string, any> = new Map();

    public static getInstance(): ServiceContainer {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }

    public register<T>(key: string, service: T): void {
        this.services.set(key, service);
    }

    public get<T>(key: string): T {
        const service = this.services.get(key);
        if (!service) {
            throw new Error(`Service not found: ${key}`);
        }
        return service as T;
    }
}
```

## Testing Guidelines

### Component Testing

Test each component in isolation:

```typescript
describe('MovementComponent', () => {
    let component: MovementComponent;
    let mockEntity: IEntity;

    beforeEach(() => {
        mockEntity = createMockEntity();
        component = new MovementComponent({
            mass: 10,
            maxSpeed: 100
        });
        component.init(mockEntity);
    });

    afterEach(() => {
        component.dispose();
    });

    test('should apply force correctly', () => {
        component.applyForce(new Vector3(10, 0, 0));
        component.update(1/60);
        
        const position = mockEntity.getComponent<ITransformComponent>('transform')?.getPosition();
        expect(position?.x).toBeGreaterThan(0);
    });
});
```

### Integration Testing

Test interactions between components:

```typescript
describe('Skiing and Jetpack Integration', () => {
    let player: PlayerEntity;
    let skiingComponent: ISkiingComponent;
    let jetpackComponent: IJetpackComponent;

    beforeEach(() => {
        player = new PlayerEntity('player1');
        skiingComponent = player.getComponent<ISkiingComponent>('skiing')!;
        jetpackComponent = player.getComponent<IJetpackComponent>('jetpack')!;
    });

    test('should conserve momentum when transitioning from skiing to jetpack', () => {
        // Test implementation
    });
});
```

## Performance Monitoring

Use decorators for performance tracking:

```typescript
export function monitor(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args: any[]) {
        const start = performance.now();
        const result = originalMethod.apply(this, args);
        const end = performance.now();
        
        console.debug(`${target.constructor.name}.${propertyKey}: ${end - start}ms`);
        
        return result;
    };

    return descriptor;
}
```

## Recovery Procedures

### Code Generation Rules

1. Always check if a similar component already exists before creating a new one
2. Follow existing patterns and naming conventions
3. Use base classes and interfaces when available
4. Add proper error handling and validation
5. Include comments and documentation

### Context Recovery

If development context is lost:

1. Reference ProjectStatus.md to see what has been implemented
2. Check the specific component documentation in this roadmap
3. Look at similar implemented components for patterns
4. Follow the dependency chain to understand integration points

## Conclusion

This roadmap provides the structure and guidelines for developing RunJumpSki. For detailed status of implementation, refer to ProjectStatus.md. For rules on code generation and formatting, refer to main-rules.mdc