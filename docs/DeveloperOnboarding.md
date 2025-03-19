# RunJumpSki Developer Onboarding Guide

## Introduction

Welcome to the RunJumpSki development team! This guide will help you understand the project structure, architecture, and development workflows.

RunJumpSki is a high-performance 3D skiing game built with TypeScript and Babylon.js. The game features a component-based architecture, physics-based skiing mechanics, and a variety of gameplay elements including weapons, targets, and terrain navigation.

This document provides everything you need to get started with development.


## Development Environment Setup

### Prerequisites

- Node.js 14.x or higher (recommended)
- npm or yarn
- Git
- Visual Studio Code (recommended)

### Setting Up Your Development Environment

1. **Clone the repository**

`ash
git clone https://github.com/your-org/runjumpski.git
cd runjumpski
`

2. **Install dependencies**

`ash
npm install
# or
yarn install
`

3. **Start the development server**

`ash
npm run dev
# or
yarn dev
`

4. **Open your browser**

Navigate to http://localhost:3000 to view the game.

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript TSLint Plugin
- Debugger for Chrome
- Babylon.js Editor Tools

### Setting Up the Debugger

1. Open the project in VS Code
2. Navigate to the Debug view (Ctrl+Shift+D)
3. Select "Launch Chrome against localhost"
4. Press F5 to start debugging


## Project Structure

The RunJumpSki codebase follows a structured organization to separate core engine functionality from game-specific implementations:

`
src/
├── core/               # Core game engine systems
│   ├── assets/         # Asset Management
│   ├── audio/          # Audio and Sound Management
│   ├── base/           # Base classes and interfaces
│   ├── ecs/            # Entity Component System
│   │   └── components/ # ALL components go here
│   ├── renderer/       # Rendering system
│   ├── input/          # Input handling systems
│   ├── physics/        # Physics engine integration
│   ├── events/         # Event bus and messaging
│   ├── utils/          # Utility functions and helpers
│   └── debug/          # Debugging tools
├── game/               # Game-specific implementations
│   ├── player/         # Player systems
│   ├── terrain/        # Terrain systems
│   ├── weapons/        # Weapon systems
│   ├── targets/        # Target and turret systems
│   └── ui/             # Game UI systems
├── types/              # Type definitions
└── index.ts            # Entry point
`

### Key Directories
#### $(@{Name=core; Description=Core game engine systems; Subdirectories=System.Object[]}.Name)/ - Core game engine systems
- $(@{Name=assets; Description=Asset Management; Path=core/assets}.Path)/ - Asset Management
- $(@{Name=audio; Description=Audio and Sound Management; Path=core/audio}.Path)/ - Audio and Sound Management
- $(@{Name=base; Description=Base classes and interfaces; Path=core/base}.Path)/ - Base classes and interfaces
- $(@{Name=debug; Description=Debugging tools; Path=core/debug}.Path)/ - Debugging tools
- $(@{Name=ecs; Description=Entity Component System; Path=core/ecs}.Path)/ - Entity Component System
- $(@{Name=events; Description=Event bus and messaging; Path=core/events}.Path)/ - Event bus and messaging
- $(@{Name=input; Description=Input handling systems; Path=core/input}.Path)/ - Input handling systems
- $(@{Name=physics; Description=Physics engine integration; Path=core/physics}.Path)/ - Physics engine integration
- $(@{Name=renderer; Description=Rendering system; Path=core/renderer}.Path)/ - Rendering system
- $(@{Name=terrain; Description=Terrain systems; Path=core/terrain}.Path)/ - Terrain systems
- $(@{Name=utils; Description=Utility functions and helpers; Path=core/utils}.Path)/ - Utility functions and helpers

#### $(@{Name=examples; Description=Additional modules; Subdirectories=System.Object[]}.Name)/ - Additional modules

#### $(@{Name=game; Description=Game-specific implementations; Subdirectories=System.Object[]}.Name)/ - Game-specific implementations
- $(@{Name=input; Description=Input handling systems; Path=game/input}.Path)/ - Input handling systems
- $(@{Name=player; Description=Player systems; Path=game/player}.Path)/ - Player systems
- $(@{Name=renderer; Description=Rendering system; Path=game/renderer}.Path)/ - Rendering system
- $(@{Name=ui; Description=Game UI systems; Path=game/ui}.Path)/ - Game UI systems
- $(@{Name=weapons; Description=Weapon systems; Path=game/weapons}.Path)/ - Weapon systems

#### $(@{Name=types; Description=Type definitions; Subdirectories=System.Object[]}.Name)/ - Type definitions



## Architecture Overview

RunJumpSki is built on a component-based architecture using an Entity Component System (ECS) pattern. This architecture promotes:

- **Separation of concerns**: Game logic is separated from rendering, physics, input, etc.
- **Reusability**: Components can be reused across different entity types
- **Flexibility**: New functionality can be added by creating new components
- **Performance**: Systems can be optimized for their specific concerns

### Core Systems

The engine is built around these core systems:

1. **Entity Component System (ECS)**
   - Entities: Game objects defined by their components
   - Components: Data containers that describe aspects of entities
   - Systems: Logic that operates on entities with specific components

2. **Renderer System**
   - Handles rendering of 3D objects using Babylon.js
   - Manages scenes, cameras, lights, and materials
   - Provides specialized rendering for terrain and particles

3. **Physics System**
   - Integrates with Babylon.js physics
   - Handles collision detection and response
   - Provides specialized physics for skiing, jetpack, and projectiles

4. **Input System**
   - Processes keyboard, mouse, and gamepad input
   - Maps inputs to game actions
   - Supports configurable control bindings

5. **Event System**
   - Provides a central event bus for communication between systems
   - Implements observer pattern for decoupled communication
   - Supports event prioritization and cancellation

# Architecture Documentation for Core Babylon.js Game Engine

## 1. Introduction

This document provides an in-depth architectural overview of our core game engine built with Babylon.js. It is intended to serve as a reference for developers working on the project, ensuring consistency in design, implementation, and testing across all systems.

## 2. Overview of Core Systems

Our game engine is composed of several core systems that work together to provide a robust, modular, and scalable architecture. The primary systems include:
- **Base Systems:** Fundamental interfaces and classes (e.g., Engine, ServiceLocator, ISystem) that establish the project framework.
- **Input System:** Manages keyboard and mouse events and maps raw inputs to game actions.
- **Physics System:** Integrates Babylon.js’s physics engine (e.g., CannonJSPlugin) for realistic simulations and collision detection.
- **Rendering System:** Handles scene creation, camera management, and rendering of entities.
- **Asset Management:** Loads, registers, and manages game assets (textures, models, sounds, etc.).
- **Debug Tools:** Provides real-time performance monitoring, debug rendering, and an interactive debug GUI.
- **Audio Manager:** Manages audio playback, including sound loading, volume control, and playback operations.
- **Scene Manager:** Organizes and manages multiple Babylon.js scenes, enabling scene switching and updates.

## 3. System Breakdown

### 3.1 Base Systems
- **Purpose:** Establish the foundational framework for dependency injection, event handling, and ECS architecture.
- **Components:** 
  - `Engine`: Main engine class coordinating system initialization and updates.
  - `ServiceLocator`: Provides dependency injection to simplify cross-system communication.
  - `ISystem` and `System`: Define a standard for all engine systems.
- **Dependencies:** None external beyond TypeScript and project-defined interfaces.
  
### 3.2 Input System
- **Purpose:** Capture and process user input from keyboard and mouse.
- **Components:** 
  - `InputManager`: Tracks key states and mouse position.
  - `InputMapper`: Maps keys to game actions.
  - `InputSystem`: Registers event listeners and dispatches events.
- **Interfaces:** `IInputManager`, `IInputMapper`, `IInputSystem`.
- **Usage Example:** Listening for keydown events and triggering corresponding actions.

### 3.3 Physics System
- **Purpose:** Integrate Babylon.js physics for simulation and collision detection.
- **Components:** 
  - `PhysicsSystem`: Initializes and manages physics simulation.
  - `CollisionSystem`: Stub implementation for collision detection.
  - `PhysicsComponent`: ECS component for adding physics properties to entities.
- **Interfaces:** `IPhysicsSystem`, `ICollisionSystem`, `IPhysicsComponent`.

### 3.4 Rendering System
- **Purpose:** Render game entities, manage scenes, and coordinate cameras.
- **Components:** 
  - `RenderingSystem`: Core renderer integrating Babylon.js.
  - `SceneManager`: Manages multiple scenes.
  - `CameraManager`: (Planned) Manages game cameras.
- **Interfaces:** `ISceneManager` for scene handling.

### 3.5 Asset Management
- **Purpose:** Load and track game assets to ensure they are available for rendering, physics, and audio.
- **Components:** 
  - `AssetLoader`: Handles fetching assets.
  - `AssetRegistry`: Tracks and manages loaded assets.
  - `AssetManager`: Orchestrates loading and registration.
- **Interfaces:** `IAssetLoader`, `IAssetRegistry`, `IAssetManager`.

### 3.6 Debug Tools
- **Purpose:** Provide development support with performance metrics, debug overlays, and an interactive GUI.
- **Components:** 
  - `DebugSystem`: Integrates performance monitoring, debug rendering, and GUI.
  - `PerformanceMonitor`: Tracks FPS and other metrics.
  - `DebugRenderer`: Renders debugging information.
  - `DebugGUI`: Displays interactive debug controls.
- **Interfaces:** `IDebugSystem`, `IPerformanceMonitor`, `IDebugRenderer`, `IDebugGUI`.

### 3.7 Audio Manager
- **Purpose:** Manage audio playback and control using Babylon.js’s audio features.
- **Components:** 
  - `AudioManager`: Loads, plays, pauses, stops, and manages volume for sounds.
- **Interfaces:** `IAudioManager`.

### 3.8 Scene Manager
- **Purpose:** Manage multiple Babylon.js scenes, allowing for creation, switching, and disposal of scenes.
- **Components:** 
  - `SceneManager`: Creates, retrieves, updates, and destroys scenes.
- **Interfaces:** `ISceneManager`.

## 4. Interfaces and Dependency Injection

- **Interface Separation:**  
  Every core system exposes its public API through dedicated interfaces (e.g., `IInputSystem`, `IPhysicsSystem`). This ensures that implementations can be easily swapped, mocked, or extended.
  
- **Dependency Injection:**  
  Systems receive their dependencies via constructors. For example, the `InputSystem` accepts custom implementations of `IInputManager` and `IInputMapper`, promoting flexibility and testability.

## 5. Directory Structure

Per our [PROJECT_MAP.md](PROJECT_MAP.md):
- Core systems reside in `src/core/` with subdirectories for each domain:
  - `src/core/input/`
  - `src/core/physics/`
  - `src/core/renderer/`
  - `src/core/assets/`
  - `src/core/debug/`
  - `src/core/audio/`
- Test files are mirrored under `tests/unit/` following the same structure.

## 6. Code Style and Naming Conventions

- **Consistency:**  
  All classes and interfaces follow our [CODE_STYLE.md](CODE_STYLE.md) and [IMPLEMENTATION_RULES.md](IMPLEMENTATION_RULES.md) guidelines:
  - Use PascalCase for classes and interfaces.
  - Private fields use camelCase.
  - Methods and properties are clearly defined and commented using JSDoc.
- **TypeScript Best Practices:**  
  Strong typing, use of generics, dependency injection, and explicit interfaces ensure maintainability and robustness.

## 7. Testing Strategy

- **Unit Tests:**  
  Each core system includes comprehensive unit tests (located in `tests/unit/`) covering both normal operations and edge cases.
- **Integration Tests:**  
  Integration between systems (e.g., rendering and asset management) is validated with end-to-end test scenarios.
- **Coverage Target:**  
  Our aim is to maintain at least 80% code coverage across all core modules.

## 8. Future Enhancements

- **Extended Debug Tools:**  
  Further development of the Debug GUI with interactive controls and real-time data visualization.
- **Camera Management:**  
  Implementation of a dedicated Camera Manager within the Rendering System.
- **Advanced Collision Handling:**  
  Refinement of the CollisionSystem to handle complex collision scenarios and integrate with custom game logic.
- **Audio Effects:**  
  Expanding the Audio Manager to support 3D sound positioning, audio effects, and dynamic volume adjustments based on gameplay.

## 9. Conclusion

This architecture document provides a comprehensive overview of the core systems within our Babylon.js game engine. By adhering to our established guidelines, dependency injection practices, and testing strategies, we ensure that our engine remains modular, maintainable, and scalable as new features are integrated.

For further details, refer to our project documentation files: [GameDevelopment.md](GameDevelopment.md), [PROJECT_MAP.md](PROJECT_MAP.md), [CODE_STYLE.md](CODE_STYLE.md), [IMPLEMENTATION_RULES.md](IMPLEMENTATION_RULES.md), and [AI_CONTEXT.md](AI_CONTEXT.md).


### Dependency Injection

The engine uses a simple ServiceLocator pattern for dependency injection:

`	ypescript
// Registering a service
ServiceLocator.register("IPhysicsSystem", new PhysicsSystem());

// Getting a service
const physicsSystem = ServiceLocator.get<IPhysicsSystem>("IPhysicsSystem");
`

### Component Lifecycle

Components follow a standard lifecycle:

1. **Construction**: Component is instantiated with options
2. **Initialization**: Component is attached to an entity and initialized
3. **Update**: Component is updated each frame
4. **Disposal**: Component resources are released when no longer needed


## Code Examples

Here are key examples demonstrating how to work with the RunJumpSki engine:

### Creating an Entity with Components

`	ypescript
// Create a new entity
const player = new Entity('player');

// Add components
player.addComponent(new TransformComponent({
    position: new BABYLON.Vector3(0, 1, 0)
}));

player.addComponent(new MeshComponent({
    meshName: 'playerMesh',
    meshType: 'box',
    size: 1
}));

player.addComponent(new PhysicsComponent({
    mass: 10,
    restitution: 0.2
}));

// Register the entity with the EntityManager
entityManager.registerEntity(player);
`

### Creating a Custom Component

`	ypescript
/**
 * Options for the HealthComponent
 */
export interface HealthComponentOptions {
    maxHealth: number;
    initialHealth?: number;
}

/**
 * Default options for the HealthComponent
 */
export const DEFAULT_HEALTH_OPTIONS: HealthComponentOptions = {
    maxHealth: 100,
    initialHealth: 100
};

/**
 * Component that manages entity health
 */
export class HealthComponent extends Component implements IHealthComponent {
    public readonly type: string = 'health';
    
    private currentHealth: number;
    private maxHealth: number;
    
    /**
     * Create a new health component
     */
    constructor(options: Partial<HealthComponentOptions> = {}) {
        super({ type: 'health' });
        
        // Merge with default options
        const config = { ...DEFAULT_HEALTH_OPTIONS, ...options };
        
        this.currentHealth = config.initialHealth!;
        this.maxHealth = config.maxHealth;
    }
    
    /**
     * Initialize the component
     */
    public override init(entity: IEntity): void {
        super.init(entity);
        // Component initialization logic
    }
    
    /**
     * Update the component
     */
    public override update(deltaTime: number): void {
        if (!this.isEnabled()) return;
        // Component update logic
    }
    
    /**
     * Apply damage to the entity
     */
    public applyDamage(amount: number): number {
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        
        if (this.currentHealth <= 0) {
            // Emit death event
            this.emit('death', { entity: this.entity });
        }
        
        return this.currentHealth;
    }
    
    /**
     * Heal the entity
     */
    public heal(amount: number): number {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        return this.currentHealth;
    }
    
    /**
     * Get current health
     */
    public getHealth(): number {
        return this.currentHealth;
    }
    
    /**
     * Get max health
     */
    public getMaxHealth(): number {
        return this.maxHealth;
    }
    
    /**
     * Clean up resources
     */
    public override dispose(): void {
        // Clean up any resources
        super.dispose();
    }
}
`

### Creating a System

`	ypescript
/**
 * System that processes health components
 */
export class HealthSystem extends System implements IHealthSystem {
    private readonly logger: ILogger;
    
    constructor() {
        super('health');
        this.logger = ServiceLocator.get<ILogger>('ILogger');
    }
    
    /**
     * Initialize the system
     */
    public override init(): void {
        super.init();
        // System initialization
    }
    
    /**
     * Update all health components
     */
    public override update(deltaTime: number): void {
        if (!this.isEnabled()) return;
        
        const entityManager = ServiceLocator.get<IEntityManager>('IEntityManager');
        const entities = entityManager.getEntitiesWithComponent('health');
        
        entities.forEach(entity => {
            const healthComponent = entity.getComponent<IHealthComponent>('health');
            if (healthComponent && healthComponent.isEnabled()) {
                // Process health logic
                // ...
            }
        });
    }
    
    /**
     * Clean up resources
     */
    public override dispose(): void {
        // Clean up any resources
        super.dispose();
    }
}
`

### Working with the Event System

`	ypescript
// Define event types
export interface DamageEvent {
    entity: IEntity;
    amount: number;
    source?: IEntity;
}

// Subscribe to events
eventBus.subscribe<DamageEvent>('damage', (event) => {
    console.log(Entity  took  damage);
});

// Publish events
eventBus.publish<DamageEvent>('damage', {
    entity: player,
    amount: 10,
    source: enemy
});
`


## Development Workflows

### Adding a New Feature

When adding a new feature to RunJumpSki, follow these steps:

1. **Plan the feature**
   - Determine which components and systems will be needed
   - Consider how it will interact with existing features
   - Identify any new assets or resources required

2. **Create interfaces**
   - Define interfaces for any new components or systems
   - Document all methods and properties with JSDoc comments

3. **Implement components**
   - Create component classes that implement the interfaces
   - Extend appropriate base classes
   - Add proper error handling and validation

4. **Implement systems**
   - Create system classes that process the components
   - Integrate with existing systems as needed
   - Register the system with the engine

5. **Test the feature**
   - Write unit tests for all new components and systems
   - Test the feature in isolation
   - Test integration with existing features

6. **Update documentation**
   - Add JSDoc comments to all public APIs
   - Update STATUS.md with the new feature
   - Document any new patterns or concepts

### Bug Fixing Process

1. **Reproduce the bug**
   - Create a minimal reproduction case
   - Identify the specific conditions that trigger the bug

2. **Debug**
   - Use the browser's developer tools
   - Use the game's built-in debugging tools
   - Add logging to narrow down the cause

3. **Fix**
   - Make the minimal necessary changes to fix the bug
   - Ensure the fix doesn't introduce new issues
   - Add tests to prevent regression

4. **Verify**
   - Test the fix in multiple scenarios
   - Ensure performance isn't negatively impacted
   - Check that all related functionality still works

### Version Control Workflow

1. **Branching strategy**
   - main - Stable, production-ready code
   - develop - Integration branch for new features
   - eature/xxx - Individual feature branches
   - ugfix/xxx - Bug fix branches

2. **Commit conventions**
   - Use descriptive commit messages
   - Reference issue numbers when applicable
   - Keep commits focused on single changes

3. **Pull requests**
   - Create PR from feature branch to develop
   - Request code review from team members
   - Ensure all tests pass before merging


## Coding Standards

### TypeScript Best Practices

1. **Use interfaces for all public APIs**
   `	ypescript
   export interface IMovementComponent {
       move(direction: BABYLON.Vector3): void;
       getVelocity(): BABYLON.Vector3;
   }
   `

2. **Use strong typing everywhere - no any**
   `	ypescript
   // GOOD
   function processEntity(entity: IEntity): void
   
   // BAD
   function processEntity(entity: any): void
   `

3. **Use generics for type-safe containers**
   `	ypescript
   export class StateManager<TState extends string, TData = unknown> {
       private state: TState;
       private data: TData | undefined;
   }
   `

4. **Use readonly for immutable properties**
   `	ypescript
   export interface ComponentOptions {
       readonly type: string;
       readonly debug?: boolean;
   }
   `

### Naming Conventions

- **Files**: PascalCase for classes (ExampleComponent.ts)
- **Interfaces**: PascalCase with I prefix (IExampleComponent)
- **Classes**: PascalCase (ExampleComponent)
- **Methods**: camelCase (getValue())
- **Properties**: camelCase (maxValue)
- **Constants**: UPPER_SNAKE_CASE (DEFAULT_EXAMPLE_OPTIONS)
- **Type aliases**: PascalCase (Vector3)
- **Enums**: PascalCase with values in PascalCase (MovementState.Running)

### Directory Structure

Follow the established directory structure:
- Component interfaces go in the same location as their implementation
- ALL components go in src/core/ecs/components/
- Renderer code goes in src/core/renderer/ (not "rendering")
- Game-specific components go in appropriate subdirectories under src/game/

### Documentation

- Use JSDoc comments for all public APIs
- Include parameter and return type documentation
- Add examples for complex functionality
- Update STATUS.md when completing tasks

### Error Handling

- Use custom error types for specific error categories
- Check required dependencies in component initialization
- Validate parameters in public methods
- Use try/catch blocks for operations that might fail
- Log errors at appropriate levels (warning, error, fatal)


## Troubleshooting & FAQ

### Common Issues

#### "Cannot find module 'X'"
- Check that all dependencies are installed (
pm install or yarn install)
- Verify that the import path is correct (beware of case sensitivity)
- Check for circular dependencies

#### "X is not a constructor"
- Ensure you're exporting the class correctly
- Check that the import is correctly resolved
- Verify that you're using the 
ew keyword when instantiating

#### Poor Performance
- Use the built-in performance monitoring tools
- Check for unnecessary updates in the game loop
- Look for memory leaks (growing memory usage over time)
- Reduce draw calls and optimize geometries

### Debugging Tools

1. **Browser DevTools**
   - Use the Performance tab to profile frame rates
   - Use the Memory tab to check for memory leaks
   - Use the Console for logging and error messages

2. **In-Game Debug UI**
   - Press F3 to toggle the debug overlay
   - View real-time performance metrics
   - Adjust parameters in the debug panels

3. **Visual Debugging**
   - Enable physics visualization with F4
   - Enable collision visualization with F5
   - View terrain information with F6

### Getting Help

If you're stuck, try these resources:
- Check the documentation in the docs/ directory
- Look for similar implementations in the codebase
- Review the issues on GitHub for similar problems
- Ask a team member for help


## Conclusion

This developer onboarding guide should provide you with the foundation needed to start contributing to the RunJumpSki project. Remember these key points:

- The game uses a component-based architecture with ECS pattern
- Follow the established code standards and patterns
- Use the proper directory structure for new files
- Write tests for all new functionality
- Document your code with JSDoc comments

As you become more familiar with the codebase, you'll be able to navigate it more efficiently and make meaningful contributions to the project.

## Resources

### Documentation
- [Core Engine](docs/CoreEngine.md)
- [Game Design](docs/GameDesign.md)
- [Performance Analysis](docs/PerformanceAnalysis.md)

### External Resources
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Babylon.js Documentation](https://doc.babylonjs.com/)
- [Entity Component System](https://en.wikipedia.org/wiki/Entity_component_system)
- [Game Programming Patterns](https://gameprogrammingpatterns.com/)

### Tools
- [Visual Studio Code](https://code.visualstudio.com/)
- [Babylon.js Playground](https://playground.babylonjs.com/)
- [Babylon.js Inspector](https://doc.babylonjs.com/toolsAndResources/inspector)

Welcome to the team, and happy coding!
