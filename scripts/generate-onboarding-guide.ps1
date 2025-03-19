#!/usr/bin/env pwsh
# Developer Onboarding Guide Generator
# This script analyzes the codebase and generates a comprehensive developer onboarding guide

# Parameters
param (
    [string]$outputFile = "./docs/DeveloperOnboarding.md", # Output file for the guide
    [string]$srcDir = "./src",                            # Source directory
    [string]$docsDir = "./docs",                          # Documentation directory
    [switch]$includeCodeSnippets = $true                  # Include code snippets in the guide
)

# Ensure output directory exists
$outputDir = [System.IO.Path]::GetDirectoryName($outputFile)
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

# Introduction section function
function Write-IntroductionSection {
    $content = @"
# RunJumpSki Developer Onboarding Guide

## Introduction

Welcome to the RunJumpSki development team! This guide will help you understand the project structure, architecture, and development workflows.

RunJumpSki is a high-performance 3D skiing game built with TypeScript and Babylon.js. The game features a component-based architecture, physics-based skiing mechanics, and a variety of gameplay elements including weapons, targets, and terrain navigation.

This document provides everything you need to get started with development.

"@
    return $content
}

# Environment Setup section function
function Write-EnvironmentSetupSection {
    $packageJson = if (Test-Path "./package.json") { 
        Get-Content "./package.json" -Raw | ConvertFrom-Json 
    } else { 
        $null 
    }
    
    $nodeVersion = if ($packageJson.engines.node) { 
        $packageJson.engines.node 
    } else { 
        "14.x or higher (recommended)" 
    }
    
    $content = @"
## Development Environment Setup

### Prerequisites

- Node.js $nodeVersion
- npm or yarn
- Git
- Visual Studio Code (recommended)

### Setting Up Your Development Environment

1. **Clone the repository**

```bash
git clone https://github.com/your-org/runjumpski.git
cd runjumpski
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Start the development server**

```bash
npm run dev
# or
yarn dev
```

4. **Open your browser**

Navigate to `http://localhost:3000` to view the game.

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

"@
    return $content
}

# Project Structure section function
function Write-ProjectStructureSection {
    param (
        [string]$srcDir
    )
    
    $dirs = @()
    
    # Get first-level directories in src
    Get-ChildItem -Path $srcDir -Directory | ForEach-Object {
        $dirName = $_.Name
        $description = switch ($dirName) {
            "core" { "Core game engine systems" }
            "game" { "Game-specific implementations" }
            "types" { "Type definitions" }
            default { "Additional modules" }
        }
        
        $subdirs = @()
        # Get second-level directories
        Get-ChildItem -Path $_.FullName -Directory | ForEach-Object {
            $subdirName = $_.Name
            $subdirDescription = switch ($subdirName) {
                "assets" { "Asset Management" }
                "audio" { "Audio and Sound Management" }
                "base" { "Base classes and interfaces" }
                "ecs" { "Entity Component System" }
                "renderer" { "Rendering system" }
                "input" { "Input handling systems" }
                "physics" { "Physics engine integration" }
                "events" { "Event bus and messaging" }
                "utils" { "Utility functions and helpers" }
                "debug" { "Debugging tools" }
                "player" { "Player systems" }
                "terrain" { "Terrain systems" }
                "weapons" { "Weapon systems" }
                "targets" { "Target and turret systems" }
                "ui" { "Game UI systems" }
                "components" { "ECS Components" }
                default { "Additional subsystems" }
            }
            
            $subdirs += [PSCustomObject]@{
                Name = $subdirName
                Description = $subdirDescription
                Path = "$dirName/$subdirName"
            }
        }
        
        $dirs += [PSCustomObject]@{
            Name = $dirName
            Description = $description
            Subdirectories = $subdirs
        }
    }
    
    $content = @"
## Project Structure

The RunJumpSki codebase follows a structured organization to separate core engine functionality from game-specific implementations:

```
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
```

### Key Directories

"@
    
    foreach ($dir in $dirs) {
        $content += @"
#### `$($dir.Name)/` - $($dir.Description)

"@
        foreach ($subdir in $dir.Subdirectories) {
            $content += "- `$($subdir.Path)/` - $($subdir.Description)`n"
        }
        $content += "`n"
    }
    
    return $content
}

# Architecture section
function Write-ArchitectureSection {
    param (
        [string]$docsDir
    )
    
    # Check for CoreEngine.md
    $coreEngineContent = ""
    $coreEnginePath = Join-Path -Path $docsDir -ChildPath "CoreEngine.md"
    if (Test-Path $coreEnginePath) {
        $coreEngineContent = Get-Content $coreEnginePath -Raw
        # Extract just the overview part if it's a large file
        if ($coreEngineContent.Length -gt 1000) {
            if ($coreEngineContent -match "(?ms)## Overview.*?##") {
                $coreEngineContent = $matches[0]
                $coreEngineContent = $coreEngineContent.Substring(0, $coreEngineContent.LastIndexOf("##"))
            }
        }
    }
    
    $content = @"
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

$coreEngineContent

### Dependency Injection

The engine uses a simple ServiceLocator pattern for dependency injection:

```typescript
// Registering a service
ServiceLocator.register("IPhysicsSystem", new PhysicsSystem());

// Getting a service
const physicsSystem = ServiceLocator.get<IPhysicsSystem>("IPhysicsSystem");
```

### Component Lifecycle

Components follow a standard lifecycle:

1. **Construction**: Component is instantiated with options
2. **Initialization**: Component is attached to an entity and initialized
3. **Update**: Component is updated each frame
4. **Disposal**: Component resources are released when no longer needed

"@
    return $content
}

# Code Examples section
function Write-CodeExamplesSection {
    param (
        [string]$srcDir,
        [switch]$includeSnippets
    )
    
    $content = @"
## Code Examples

Here are key examples demonstrating how to work with the RunJumpSki engine:

### Creating an Entity with Components

```typescript
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
```

### Creating a Custom Component

```typescript
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
```

### Creating a System

```typescript
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
```

### Working with the Event System

```typescript
// Define event types
export interface DamageEvent {
    entity: IEntity;
    amount: number;
    source?: IEntity;
}

// Subscribe to events
eventBus.subscribe<DamageEvent>('damage', (event) => {
    console.log(`Entity ${event.entity.id} took ${event.amount} damage`);
});

// Publish events
eventBus.publish<DamageEvent>('damage', {
    entity: player,
    amount: 10,
    source: enemy
});
```

"@
    
    # If includeSnippets is true, try to find real examples from the codebase
    if ($includeSnippets) {
        # Find a good component example
        $componentFiles = Get-ChildItem -Path (Join-Path -Path $srcDir -ChildPath "core/ecs/components") -Filter "*.ts" -Recurse | 
            Where-Object { -not $_.Name.StartsWith("I") -and -not $_.Name.Contains(".test.") }
        
        if ($componentFiles.Count -gt 0) {
            # Choose a reasonably sized component
            $selectedFile = $componentFiles | 
                Where-Object { (Get-Content $_.FullName).Length -gt 50 -and (Get-Content $_.FullName).Length -lt 300 } | 
                Select-Object -First 1
            
            if ($selectedFile) {
                $componentContent = Get-Content $selectedFile.FullName -Raw
                $content += @"

### Real Code Example: $($selectedFile.Name)

```typescript
$componentContent
```

"@
            }
        }
    }
    
    return $content
}

# Development Workflows section
function Write-DevelopmentWorkflowsSection {
    $content = @"
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
   - `main` - Stable, production-ready code
   - `develop` - Integration branch for new features
   - `feature/xxx` - Individual feature branches
   - `bugfix/xxx` - Bug fix branches

2. **Commit conventions**
   - Use descriptive commit messages
   - Reference issue numbers when applicable
   - Keep commits focused on single changes

3. **Pull requests**
   - Create PR from feature branch to develop
   - Request code review from team members
   - Ensure all tests pass before merging

"@
    return $content
}

# Coding Standards section
function Write-CodingStandardsSection {
    $content = @"
## Coding Standards

### TypeScript Best Practices

1. **Use interfaces for all public APIs**
   ```typescript
   export interface IMovementComponent {
       move(direction: BABYLON.Vector3): void;
       getVelocity(): BABYLON.Vector3;
   }
   ```

2. **Use strong typing everywhere - no any**
   ```typescript
   // GOOD
   function processEntity(entity: IEntity): void
   
   // BAD
   function processEntity(entity: any): void
   ```

3. **Use generics for type-safe containers**
   ```typescript
   export class StateManager<TState extends string, TData = unknown> {
       private state: TState;
       private data: TData | undefined;
   }
   ```

4. **Use readonly for immutable properties**
   ```typescript
   export interface ComponentOptions {
       readonly type: string;
       readonly debug?: boolean;
   }
   ```

### Naming Conventions

- **Files**: PascalCase for classes (`ExampleComponent.ts`)
- **Interfaces**: PascalCase with `I` prefix (`IExampleComponent`)
- **Classes**: PascalCase (`ExampleComponent`)
- **Methods**: camelCase (`getValue()`)
- **Properties**: camelCase (`maxValue`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_EXAMPLE_OPTIONS`)
- **Type aliases**: PascalCase (`Vector3`)
- **Enums**: PascalCase with values in PascalCase (`MovementState.Running`)

### Directory Structure

Follow the established directory structure:
- Component interfaces go in the same location as their implementation
- ALL components go in `src/core/ecs/components/`
- Renderer code goes in `src/core/renderer/` (not "rendering")
- Game-specific components go in appropriate subdirectories under `src/game/`

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

"@
    return $content
}

# Troubleshooting section
function Write-TroubleshootingSection {
    $content = @"
## Troubleshooting & FAQ

### Common Issues

#### "Cannot find module 'X'"
- Check that all dependencies are installed (`npm install` or `yarn install`)
- Verify that the import path is correct (beware of case sensitivity)
- Check for circular dependencies

#### "X is not a constructor"
- Ensure you're exporting the class correctly
- Check that the import is correctly resolved
- Verify that you're using the `new` keyword when instantiating

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
- Check the documentation in the `docs/` directory
- Look for similar implementations in the codebase
- Review the issues on GitHub for similar problems
- Ask a team member for help

"@
    return $content
}

# Conclusion and resources section
function Write-ConclusionSection {
    $content = @"
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
"@
    return $content
}

# Generate the guide
$guide = @()
$guide += Write-IntroductionSection
$guide += Write-EnvironmentSetupSection
$guide += Write-ProjectStructureSection -srcDir $srcDir
$guide += Write-ArchitectureSection -docsDir $docsDir
$guide += Write-CodeExamplesSection -srcDir $srcDir -includeSnippets:$includeCodeSnippets
$guide += Write-DevelopmentWorkflowsSection
$guide += Write-CodingStandardsSection
$guide += Write-TroubleshootingSection
$guide += Write-ConclusionSection

# Write the guide to the output file
$guide -join "`n`n" | Out-File -FilePath $outputFile -Encoding utf8

Write-Host "Developer onboarding guide generated at $outputFile" -ForegroundColor Green 