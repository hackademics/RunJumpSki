# initialize-runjumpski.ps1
# PowerShell script to initialize the RunJumpSki project structure and dependencies

# Set script to stop on any error
$ErrorActionPreference = "Stop"

# Function to check if a command exists
function Test-Command($command) {
    try {
        Get-Command $command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Check for required dependencies
if (-not (Test-Command "node")) {
    Write-Host "Node.js is not installed. Please install Node.js before running this script." -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "npm is not installed. Please install npm before running this script." -ForegroundColor Red
    exit 1
}

# Verify Node.js version
$nodeVersion = (node --version).Replace('v', '')
if ([version]$nodeVersion -lt [version]"14.0.0") {
    Write-Host "Node.js version 14.0.0 or higher is required. Current version: $nodeVersion" -ForegroundColor Red
    exit 1
}

# Display welcome message
Write-Host "Initializing RunJumpSki project..." -ForegroundColor Cyan

# Check if we're already in the runjumpski directory
$currentDir = Split-Path -Leaf (Get-Location)
if ($currentDir -ne "runjumpski") {
    # Create the project directory if it doesn't exist
    $projectDir = "runjumpski"
    if (Test-Path $projectDir) {
        $response = Read-Host "Directory '$projectDir' already exists. Do you want to overwrite it? (y/N)"
        if ($response -ne "y") {
            Write-Host "Aborting installation." -ForegroundColor Yellow
            exit 0
        }
        Remove-Item -Path $projectDir -Recurse -Force
    }

    Write-Host "Creating project directory: $projectDir" -ForegroundColor Green
    New-Item -ItemType Directory -Path $projectDir | Out-Null
    Set-Location $projectDir
} else {
    Write-Host "Already in runjumpski directory, continuing with initialization..." -ForegroundColor Green
    
    # Clear existing files if user agrees
    $response = Read-Host "Directory already contains files. Do you want to clear and reinitialize? (y/N)"
    if ($response -eq "y") {
        Get-ChildItem -Path . -Exclude "init-project.ps1" | Remove-Item -Recurse -Force
    } else {
        Write-Host "Aborting installation." -ForegroundColor Yellow
        exit 0
    }
}

# Initialize npm project with error handling
Write-Host "Initializing npm project..." -ForegroundColor Green
try {
    npm init -y
} catch {
    Write-Host "Failed to initialize npm project: $_" -ForegroundColor Red
    if ($currentDir -ne "runjumpski") {
        Set-Location ..
    }
    exit 1
}

# Install dependencies with specific versions
Write-Host "Installing dependencies..." -ForegroundColor Green
try {
    npm install --save babylonjs@6.38.1 babylonjs-loaders@6.38.1 babylonjs-materials@6.38.1 babylonjs-gui@6.38.1 babylonjs-inspector@6.38.1
    npm install --save-dev typescript@5.3.3 webpack@5.90.1 webpack-cli@5.1.4 webpack-dev-server@5.0.1 ts-loader@9.5.1 html-webpack-plugin@5.6.0 copy-webpack-plugin@12.0.2 jest@29.7.0 ts-jest@29.1.2 @types/jest@29.5.12 @types/node@20.11.16 eslint@8.56.0 @typescript-eslint/eslint-plugin@7.0.1 @typescript-eslint/parser@7.0.1 prettier@3.2.5
} catch {
    Write-Host "Failed to install dependencies: $_" -ForegroundColor Red
    if ($currentDir -ne "runjumpski") {
        Set-Location ..
    }
    exit 1
}

# Function to safely create a file with content
function New-FileWithContent {
    param (
        [string]$Path,
        [string]$Content,
        [string]$Description
    )
    
    try {
        Write-Host "Creating $Description..." -ForegroundColor Green
        $Content | Set-Content -Path $Path -ErrorAction Stop
        return $true
    } catch {
        Write-Host "Failed to create $Description at $Path : $_" -ForegroundColor Red
        return $false
    }
}

# Create tsconfig.json
$tsConfig = @"
{
  "compilerOptions": {
    "target": "es6",
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": {
      "@core/*": ["src/core/*"],
      "@components/*": ["src/components/*"],
      "@game/*": ["src/game/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
"@

if (-not (New-FileWithContent -Path "tsconfig.json" -Content $tsConfig -Description "TypeScript configuration")) {
    if ($currentDir -ne "runjumpski") {
        Set-Location ..
    }
    exit 1
}

# Create webpack.config.js
$webpackConfig = @"
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@core': path.resolve(__dirname, 'src/core/'),
      '@components': path.resolve(__dirname, 'src/components/'),
      '@game': path.resolve(__dirname, 'src/game/'),
      '@utils': path.resolve(__dirname, 'src/utils/'),
      '@types': path.resolve(__dirname, 'src/types/')
    }
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 9000,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'public/index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/assets', to: 'assets' }
      ],
    }),
  ],
};
"@

if (-not (New-FileWithContent -Path "webpack.config.js" -Content $webpackConfig -Description "Webpack configuration")) {
    if ($currentDir -ne "runjumpski") {
        Set-Location ..
    }
    exit 1
}

# Create Jest configuration
Write-Host "Creating Jest configuration..." -ForegroundColor Green
$jestConfig = @"
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@game/(.*)$': '<rootDir>/src/game/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1'
  },
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts']
};
"@
$jestConfig | Set-Content -Path "jest.config.js"

# Create directory structure with error handling
Write-Host "Creating directory structure..." -ForegroundColor Green
$directories = @(
    "src/core/base",
    "src/core/physics",
    "src/core/input",
    "src/core/rendering",
    "src/core/audio",
    "src/core/events",
    "src/core/utils",
    "src/components/movement",
    "src/components/collision",
    "src/components/camera",
    "src/components/weapon",
    "src/components/transform",
    "src/components/physics",
    "src/game/player",
    "src/game/terrain",
    "src/game/weapons",
    "src/game/targets",
    "src/game/ui",
    "src/data/maps",
    "src/data/weapons",
    "src/data/entities",
    "src/utils/debug",
    "src/utils/performance",
    "src/utils/logging",
    "src/types/common",
    "src/types/events",
    "src/types/messages",
    "public/assets/textures",
    "public/assets/meshes",
    "public/assets/sounds",
    "tests/core",
    "tests/components",
    "tests/game"
)

foreach ($dir in $directories) {
    try {
        New-Item -ItemType Directory -Path $dir -Force -ErrorAction Stop | Out-Null
    } catch {
        Write-Host "Failed to create directory $dir : $_" -ForegroundColor Red
        if ($currentDir -ne "runjumpski") {
            Set-Location ..
        }
        exit 1
    }
}

# Create index.html
Write-Host "Creating HTML template..." -ForegroundColor Green
$indexHtml = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RunJumpSki</title>
    <style>
        html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        #renderCanvas {
            width: 100%;
            height: 100%;
            touch-action: none;
        }
    </style>
</head>
<body>
    <canvas id="renderCanvas"></canvas>
</body>
</html>
"@
New-Item -ItemType Directory -Path "public" -Force | Out-Null
$indexHtml | Set-Content -Path "public/index.html"

# Create base interface files
Write-Host "Creating base interface files..." -ForegroundColor Green

# IComponent.ts
$iComponent = @"
/**
 * Core component interface
 */
export interface IComponent {
    /**
     * Unique type identifier for the component
     */
    readonly type: string;
    
    /**
     * Initialize the component with its entity
     * @param entity The entity this component belongs to
     */
    init(entity: IEntity): void;
    
    /**
     * Update the component
     * @param deltaTime Time elapsed since last update in seconds
     */
    update(deltaTime: number): void;
    
    /**
     * Clean up resources
     */
    dispose(): void;
    
    /**
     * Check if component is enabled
     */
    isEnabled(): boolean;
    
    /**
     * Enable or disable the component
     */
    setEnabled(enabled: boolean): void;
}
"@
$iComponent | Set-Content -Path "src/core/base/IComponent.ts"

# IEntity.ts
$iEntity = @"
import { IComponent } from './IComponent';

/**
 * Core entity interface
 */
export interface IEntity {
    /**
     * Unique identifier for the entity
     */
    readonly id: string;
    
    /**
     * Add a component to the entity
     * @param component The component to add
     * @returns The added component for chaining
     */
    addComponent<T extends IComponent>(component: T): T;
    
    /**
     * Get a component by type
     * @param type The component type to get
     * @returns The component or undefined if not found
     */
    getComponent<T extends IComponent>(type: string): T | undefined;
    
    /**
     * Remove a component by type
     * @param type The component type to remove
     * @returns True if the component was removed, false if not found
     */
    removeComponent(type: string): boolean;
    
    /**
     * Update all components
     * @param deltaTime Time elapsed since last update in seconds
     */
    update(deltaTime: number): void;
    
    /**
     * Clean up all components and resources
     */
    dispose(): void;
}
"@
$iEntity | Set-Content -Path "src/core/base/IEntity.ts"

# Create base implementation files
Write-Host "Creating base implementation files..." -ForegroundColor Green

# Component.ts
$componentBase = @"
import { IComponent } from './IComponent';
import { IEntity } from './IEntity';

/**
 * Component options
 */
export interface ComponentOptions {
    /**
     * Component type identifier
     */
    type: string;
    
    /**
     * Whether the component is enabled by default
     */
    enabled?: boolean;
}

/**
 * Base component implementation
 */
export abstract class Component implements IComponent {
    /**
     * Unique type identifier for the component
     */
    public abstract readonly type: string;
    
    /**
     * Entity this component belongs to
     */
    protected entity?: IEntity;
    
    /**
     * Whether the component is enabled
     */
    protected enabled: boolean;
    
    /**
     * Create a new component
     * @param options Component options
     */
    constructor(options: ComponentOptions) {
        this.enabled = options.enabled ?? true;
    }
    
    /**
     * Initialize the component with its entity
     * @param entity The entity this component belongs to
     */
    public init(entity: IEntity): void {
        this.entity = entity;
    }
    
    /**
     * Update the component
     * @param deltaTime Time elapsed since last update in seconds
     */
    public abstract update(deltaTime: number): void;
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.entity = undefined;
    }
    
    /**
     * Check if component is enabled
     */
    public isEnabled(): boolean {
        return this.enabled;
    }
    
    /**
     * Enable or disable the component
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
}
"@
$componentBase | Set-Content -Path "src/core/base/Component.ts"

# Entity.ts
$entityBase = @"
import { IEntity } from './IEntity';
import { IComponent } from './IComponent';

/**
 * Base entity implementation
 */
export abstract class Entity implements IEntity {
    /**
     * Unique identifier for the entity
     */
    public readonly id: string;
    
    /**
     * Components attached to this entity
     */
    protected components: Map<string, IComponent> = new Map();
    
    /**
     * Create a new entity
     * @param id Unique identifier for the entity
     */
    constructor(id: string) {
        this.id = id;
    }
    
    /**
     * Add a component to the entity
     * @param component The component to add
     * @returns The added component for chaining
     */
    public addComponent<T extends IComponent>(component: T): T {
        this.components.set(component.type, component);
        component.init(this);
        return component;
    }
    
    /**
     * Get a component by type
     * @param type The component type to get
     * @returns The component or undefined if not found
     */
    public getComponent<T extends IComponent>(type: string): T | undefined {
        return this.components.get(type) as T | undefined;
    }
    
    /**
     * Remove a component by type
     * @param type The component type to remove
     * @returns True if the component was removed, false if not found
     */
    public removeComponent(type: string): boolean {
        const component = this.components.get(type);
        if (component) {
            component.dispose();
            return this.components.delete(type);
        }
        return false;
    }
    
    /**
     * Update all components
     * @param deltaTime Time elapsed since last update in seconds
     */
    public update(deltaTime: number): void {
        this.components.forEach(component => {
            if (component.isEnabled()) {
                component.update(deltaTime);
            }
        });
    }
    
    /**
     * Clean up all components and resources
     */
    public dispose(): void {
        this.components.forEach(component => component.dispose());
        this.components.clear();
    }
}
"@
$entityBase | Set-Content -Path "src/core/base/Entity.ts"

# Create EventBus
$eventBus = @"
/**
 * Event types
 */
export interface EventMap {
    [eventName: string]: any;
}

/**
 * Event bus interface
 */
export interface IEventBus {
    on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void;
    off<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void;
    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void;
}

/**
 * Event bus implementation
 */
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
                console.error(`Error in event handler for \${String(event)}:`, error);
            }
        });
    }
}
"@
$eventBus | Set-Content -Path "src/core/events/EventBus.ts"

# Create GameEvents.ts
$gameEvents = @"
import { IEntity } from '@core/base/IEntity';
import { Vector3 } from '@types/common/Vector3';

/**
 * Game event types
 */
export interface GameEvents {
    'player:move': {
        entityId: string;
        position: Vector3;
        velocity: Vector3;
    };
    
    'player:jump': {
        entityId: string;
        force: number;
    };
    
    'player:landed': {
        entityId: string;
        position: Vector3;
    };
    
    'player:skiing': {
        entityId: string;
        isSkiing: boolean;
        surfaceAngle?: number;
    };
    
    'player:jetpack': {
        entityId: string;
        isActive: boolean;
        energy: number;
    };
    
    'entity:moved': {
        entityId: string;
        position: Vector3;
        velocity: Vector3;
    };
    
    'entity:collision': {
        entityId: string;
        collidedWith: string;
        point: Vector3;
        normal: Vector3;
    };
    
    'movement:stateChanged': {
        entityId: string;
        prevState: string;
        newState: string;
    };
    
    'weapon:fire': {
        entityId: string;
        weaponType: string;
        origin: Vector3;
        direction: Vector3;
    };
    
    'target:hit': {
        entityId: string;
        targetId: string;
        damage: number;
    };
}
"@
$gameEvents | Set-Content -Path "src/types/events/GameEvents.ts"

# Create Vector3.ts
$vector3 = @"
/**
 * 3D vector type
 */
export interface Vector3 {
    /**
     * X component
     */
    x: number;
    
    /**
     * Y component
     */
    y: number;
    
    /**
     * Z component
     */
    z: number;
}

/**
 * Create a new Vector3
 */
export function createVector3(x: number = 0, y: number = 0, z: number = 0): Vector3 {
    return { x, y, z };
}

/**
 * Add two vectors
 */
export function addVectors(a: Vector3, b: Vector3): Vector3 {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z
    };
}

/**
 * Subtract vector b from vector a
 */
export function subtractVectors(a: Vector3, b: Vector3): Vector3 {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z
    };
}

/**
 * Scale a vector by a scalar
 */
export function scaleVector(vector: Vector3, scale: number): Vector3 {
    return {
        x: vector.x * scale,
        y: vector.y * scale,
        z: vector.z * scale
    };
}

/**
 * Calculate the length/magnitude of a vector
 */
export function vectorLength(vector: Vector3): number {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}

/**
 * Normalize a vector (make it unit length)
 */
export function normalizeVector(vector: Vector3): Vector3 {
    const length = vectorLength(vector);
    if (length === 0) {
        return { x: 0, y: 0, z: 0 };
    }
    return {
        x: vector.x / length,
        y: vector.y / length,
        z: vector.z / length
    };
}

/**
 * Calculate the dot product of two vectors
 */
export function dotProduct(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Calculate the cross product of two vectors
 */
export function crossProduct(a: Vector3, b: Vector3): Vector3 {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}
"@
$vector3 | Set-Content -Path "src/types/common/Vector3.ts"

# Create main index.ts
$indexTs = @"
import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';
import { EventBus } from './core/events/EventBus';

/**
 * Main entry point for the RunJumpSki game
 */
class Game {
    private canvas: HTMLCanvasElement;
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    private eventBus: EventBus;
    
    constructor() {
        // Get the canvas element
        this.canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
        if (!this.canvas) throw new Error('Canvas element not found');
        
        // Initialize the Babylon engine
        this.engine = new BABYLON.Engine(this.canvas, true);
        
        // Get the event bus
        this.eventBus = EventBus.getInstance();
        
        // Create a scene
        this.scene = this.createScene();
        
        // Register to the render loop
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
        
        // Handle browser resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }
    
    /**
     * Create the Babylon.js scene
     */
    private createScene(): BABYLON.Scene {
        // Create scene
        const scene = new BABYLON.Scene(this.engine);
        
        // Create a basic setup for testing
        const camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 5, -10), scene);
        camera.setTarget(BABYLON.Vector3.Zero());
        camera.attachControl(this.canvas, true);
        
        const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.7;
        
        const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 50, height: 50 }, scene);
        const groundMaterial = new BABYLON.StandardMaterial('groundMaterial', scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        ground.material = groundMaterial;
        
        // Create a simple test box
        const box = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, scene);
        box.position.y = 1;
        const boxMaterial = new BABYLON.StandardMaterial('boxMaterial', scene);
        boxMaterial.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
        box.material = boxMaterial;
        
        // Display FPS
        scene.debugLayer.show({
            embedMode: true,
            handleResize: true,
            overlay: true
        });
        
        return scene;
    }
}

// Start the game when the page is loaded
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
"@
$indexTs | Set-Content -Path "src/index.ts"

# Create package.json scripts
Write-Host "Updating package.json scripts..." -ForegroundColor Green
$packageJsonPath = "package.json"
$packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

$packageJson.scripts = [PSCustomObject]@{
    "start" = "webpack serve --mode development"
    "build" = "webpack --mode production"
    "test" = "jest"
    "test:watch" = "jest --watch"
    "lint" = "eslint src/**/*.ts"
    "format" = 'prettier --write "src/**/*.ts"'
}

$packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath

# Create README.md
Write-Host "Creating README.md..." -ForegroundColor Green
$readme = @"
# RunJumpSki

A first-person speedrun game inspired by Tribes 2's skiing mechanics.

## Overview

RunJumpSki is a fast-paced, skill-based game where players race through expansive maps, using skiing and jetpack mechanics to maintain momentum while avoiding hazards and shooting targets to reduce their completion time.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
4. Open your browser and navigate to `http://localhost:9000`

## Development

### Building the Project

```
npm run build
```

### Running Tests

```
npm test
```

## Project Structure

- `src/core/` - Core game engine systems
- `src/components/` - Reusable game components
- `src/game/` - Game-specific implementations
- `src/data/` - Game data and configurations
- `src/utils/` - Utility functions
- `src/types/` - TypeScript type definitions

## License

This project is licensed under the MIT License - see the LICENSE file for details.
"@
$readme | Set-Content -Path "README.md"

# Create ProjectStatus.md
Write-Host "Creating ProjectStatus.md..." -ForegroundColor Green
$projectStatus = @"
# RunJumpSki Project Status

This document tracks the implementation status of all components and systems in the RunJumpSki project. Update this document as development progresses.

## Status Legend
- ✅ **Complete**: Fully implemented and tested
- 🔄 **In Progress**: Currently being implemented
- ⚠️ **Partial**: Basic implementation, needs refinement
- ❌ **Not Started**: Not yet implemented
- 🧪 **Testing**: Implementation complete, undergoing testing

## Core Engine Systems

| Component | Status | Notes |
|-----------|--------|-------|
| Base Entity | ⚠️ Partial | Basic implementation created |
| Base Component | ⚠️ Partial | Basic implementation created |
| Event System | ⚠️ Partial | Basic implementation created |
| Service Container | ❌ Not Started | Dependency injection system |
| Physics System | ❌ Not Started | Core physics with Babylon.js |
| Input Manager | ❌ Not Started | Keyboard and mouse input handling |
| Renderer | ❌ Not Started | Babylon.js scene management |
| Asset Manager | ❌ Not Started | Resource loading and caching |
| Audio System | ❌ Not Started | Sound effects and music playback |
| State Machine | ❌ Not Started | General-purpose state management |
| Logger | ❌ Not Started | Debug and error logging |

## Common Components

| Component | Status | Notes |
|-----------|--------|-------|
| Transform Component | ❌ Not Started | Position, rotation, scale |
| Collision Component | ❌ Not Started | Collision detection and response |
| Physics Component | ❌ Not Started | Physical properties and forces |
| Camera Component | ❌ Not Started | First-person camera control |
| Movement Component | ❌ Not Started | Basic movement capabilities |
| Audio Component | ❌ Not Started | Entity-specific audio |
| Render Component | ❌ Not Started | Visual representation |

## Game-Specific Systems

| Component | Status | Notes |
|-----------|--------|-------|
| Player Entity | ❌ Not Started | Main player implementation |
| Skiing Component | ❌ Not Started | Skiing mechanics and terrain interaction |
| Jetpack Component | ❌ Not Started | Jetpack thrust and energy management |
| Weapon Component | ❌ Not Started | Weapon handling and shooting |
| Spinfusor Weapon | ❌ Not Started | Disk launcher implementation |
| Grenade Weapon | ❌ Not Started | Grenade throwing implementation |
| Projectile Entity | ❌ Not Started | Projectile physics and collision |
| Target Entity | ❌ Not Started | Shootable targets |
| Turret Entity | ❌ Not Started | Enemy turrets |
| Energy System | ❌ Not Started | Jetpack energy management |

## Terrain Systems

| Component | Status | Notes |
|-----------|--------|-------|
| Terrain Generator | ❌ Not Started | Height-map based terrain |
| Terrain Collision | ❌ Not Started | Optimized terrain collision |
| Surface Types | ❌ Not Started | Different terrain surfaces |
| Map Boundaries | ❌ Not Started | Level boundaries and constraints |
| Start/Finish Lines | ❌ Not Started | Race start and end detection |

## UI Systems

| Component | Status | Notes |
|-----------|--------|-------|
| HUD System | ❌ Not Started | Heads-up display framework |
| Speed Display | ❌ Not Started | Player speed indicator |
| Energy Display | ❌ Not Started | Jetpack energy meter |
| Timer | ❌ Not Started | Race timer |
| Target Counter | ❌ Not Started | Target hit counter |
| Crosshair | ❌ Not Started | Weapon aiming reticle |
| Menu System | ❌ Not Started | Game menus |

## Game Flow Systems

| Component | Status | Notes |
|-----------|--------|-------|
| Level Manager | ❌ Not Started | Level loading and transitions |
| Game State | ❌ Not Started | Overall game state management |
| Score System | ❌ Not Started | Time and scoring calculation |
| Progression System | ❌ Not Started | Level unlocking and progression |

## Development Tools

| Tool | Status | Notes |
|------|--------|-------|
| Level Editor | ❌ Not Started | Tools for creating maps |
| Debug Console | ❌ Not Started | In-game debugging tools |
| Performance Monitor | ❌ Not Started | FPS and memory tracking |

## Current Focus

Current development is focused on:
1. Setting up the base entity-component framework
2. Implementing core engine systems
3. Establishing the physics system with Babylon.js

## Next Steps

After completing current focus areas:
1. Implement basic player movement
2. Develop terrain system
3. Create skiing mechanics

## Recent Updates

*March 15, 2025* - Project initialized with basic structure and core interfaces.

---

*Last Updated: March 15, 2025*
"@
$projectStatus | Set-Content -Path "ProjectStatus.md"

# Update npm scripts and install additional packages
Write-Host "Setting up npm scripts and additional packages..." -ForegroundColor Green
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier

# Create .eslintrc.js
$eslintConfig = @"
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    browser: true,
    es6: true,
    node: true
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }]
  }
};
"@
$eslintConfig | Set-Content -Path ".eslintrc.js"

# Create .prettierrc
$prettierConfig = @"
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
"@
$prettierConfig | Set-Content -Path ".prettierrc"

# Create Error handling utilities
Write-Host "Creating error handling utilities..." -ForegroundColor Green
$errorFolder = "src/utils/errors"
New-Item -ItemType Directory -Path $errorFolder -Force | Out-Null

# GameError.ts
$gameError = @"
/**
 * Base error class for the game
 */
export class GameError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GameError';
        
        // This is necessary for extending Error in TypeScript
        Object.setPrototypeOf(this, GameError.prototype);
    }
}
"@
$gameError | Set-Content -Path "$errorFolder/GameError.ts"

# ComponentError.ts
$componentError = @"
import { GameError } from './GameError';

/**
 * Error specific to components
 */
export class ComponentError extends GameError {
    /**
     * Component type where the error occurred
     */
    public readonly componentType: string;
    
    /**
     * Entity ID where the error occurred
     */
    public readonly entityId: string | undefined;
    
    constructor(componentType: string, entityId: string | undefined, message: string) {
        super(componentType + (entityId ? ` (${entityId})` : '') + ': ' + message);
        this.name = 'ComponentError';
        this.componentType = componentType;
        this.entityId = entityId;
        
        // This is necessary for extending Error in TypeScript
        Object.setPrototypeOf(this, ComponentError.prototype);
    }
}
"@
$componentError | Set-Content -Path "$errorFolder/ComponentError.ts"

# Create Logger.ts
Write-Host "Creating logger utility..." -ForegroundColor Green
$logger = @"
/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Simple logger for game components
 */
export class Logger {
    private static logLevel: LogLevel = 'info';
    private context: string;
    
    /**
     * Create a new logger
     * @param context Context name for this logger
     */
    constructor(context: string) {
        this.context = context;
    }
    
    /**
     * Set the global log level
     */
    public static setGlobalLevel(level: LogLevel): void {
        Logger.logLevel = level;
    }
    
    /**
     * Set the log level for this logger
     */
    public setLevel(level: LogLevel): void {
        // This is a placeholder for future per-logger levels
        // Currently, it only sets the global level
        Logger.setGlobalLevel(level);
    }
    
    /**
     * Log a debug message
     */
    public debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            console.debug(`[${this.context}] ${message}`, ...args);
        }
    }
    
    /**
     * Log an info message
     */
    public info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            console.info(`[${this.context}] ${message}`, ...args);
        }
    }
    
    /**
     * Log a warning message
     */
    public warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            console.warn(`[${this.context}] ${message}`, ...args);
        }
    }
    
    /**
     * Log an error message
     */
    public error(message: string, ...args: any[]): void {
        if (this.shouldLog('error')) {
            console.error(`[${this.context}] ${message}`, ...args);
        }
    }
    
    /**
     * Check if a log level should be displayed
     */
    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        const currentLevel = levels.indexOf(Logger.logLevel);
        const requestedLevel = levels.indexOf(level);
        
        return requestedLevel >= currentLevel;
    }
}
"@
$logger | Set-Content -Path "src/utils/logging/Logger.ts"

# Create ServiceContainer.ts
Write-Host "Creating service container..." -ForegroundColor Green
$serviceContainer = @"
/**
 * Simple dependency injection container
 */
export class ServiceContainer {
    private static instance: ServiceContainer;
    private services: Map<string, any> = new Map();
    
    /**
     * Get the singleton instance
     */
    public static getInstance(): ServiceContainer {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }
    
    /**
     * Register a service
     * @param key Service identifier
     * @param service Service instance
     */
    public register<T>(key: string, service: T): void {
        this.services.set(key, service);
    }
    
    /**
     * Get a service
     * @param key Service identifier
     * @returns The service instance
     * @throws Error if the service is not found
     */
    public get<T>(key: string): T {
        const service = this.services.get(key);
        if (!service) {
            throw new Error(`Service not found: ${key}`);
        }
        return service as T;
    }
    
    /**
     * Check if a service exists
     * @param key Service identifier
     * @returns True if the service exists
     */
    public has(key: string): boolean {
        return this.services.has(key);
    }
    
    /**
     * Remove a service
     * @param key Service identifier
     * @returns True if the service was removed
     */
    public remove(key: string): boolean {
        return this.services.delete(key);
    }
    
    /**
     * Clear all services
     */
    public clear(): void {
        this.services.clear();
    }
}
"@
$serviceContainer | Set-Content -Path "src/core/ServiceContainer.ts"

# Create a basic test file
Write-Host "Creating basic test file..." -ForegroundColor Green
$testFile = @"
import { Entity } from '../../src/core/base/Entity';
import { Component } from '../../src/core/base/Component';

class TestComponent extends Component {
    public readonly type: string = 'test';
    public updateCalled: boolean = false;
    
    constructor() {
        super({ type: 'test' });
    }
    
    public update(deltaTime: number): void {
        this.updateCalled = true;
    }
}

class TestEntity extends Entity {
    constructor(id: string) {
        super(id);
    }
}

describe('Entity', () => {
    let entity: TestEntity;
    let component: TestComponent;
    
    beforeEach(() => {
        entity = new TestEntity('test-entity');
        component = new TestComponent();
    });
    
    afterEach(() => {
        entity.dispose();
    });
    
    test('should add and retrieve components', () => {
        // Add the component
        entity.addComponent(component);
        
        // Retrieve the component
        const retrievedComponent = entity.getComponent<TestComponent>('test');
        
        // Verify it's the same component
        expect(retrievedComponent).toBe(component);
    });
    
    test('should update components', () => {
        // Add the component
        entity.addComponent(component);
        
        // Update the entity
        entity.update(0.016); // 60fps
        
        // Verify the component was updated
        expect(component.updateCalled).toBe(true);
    });
    
    test('should remove components', () => {
        // Add the component
        entity.addComponent(component);
        
        // Remove the component
        const result = entity.removeComponent('test');
        
        // Verify the component was removed
        expect(result).toBe(true);
        expect(entity.getComponent('test')).toBeUndefined();
    });
    
    test('should not update disabled components', () => {
        // Add the component and disable it
        entity.addComponent(component);
        component.setEnabled(false);
        
        // Update the entity
        entity.update(0.016);
        
        // Verify the component was not updated
        expect(component.updateCalled).toBe(false);
    });
});
"@
$testFile | Set-Content -Path "tests/core/Entity.test.ts"

# Create .gitignore
Write-Host "Creating .gitignore..." -ForegroundColor Green
$gitignore = @"
# Dependencies
node_modules/

# Build output
dist/
build/
coverage/

# IDE files
.vscode/
.idea/
*.iml

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
debug.log

# OS files
.DS_Store
Thumbs.db

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
"@
$gitignore | Set-Content -Path ".gitignore"

# Create sample unit test for EventBus
Write-Host "Creating EventBus test..." -ForegroundColor Green
$eventBusTest = @"
import { EventBus } from '../../src/core/events/EventBus';

// Define mock event types for testing
interface TestEvents {
    'test:event': {
        value: number;
    };
    'test:another': {
        message: string;
    };
}

// Extend EventBus with our test events
declare module '../../src/core/events/EventBus' {
    interface EventMap extends TestEvents {}
}

describe('EventBus', () => {
    let eventBus: EventBus;
    
    beforeEach(() => {
        // Get a fresh instance for each test
        eventBus = EventBus.getInstance();
        
        // Clear all handlers to avoid test interference
        // This is a bit of a hack since we don't have a public API for this
        (eventBus as any).handlers = new Map();
    });
    
    test('should emit and receive events', () => {
        // Setup
        const mockHandler = jest.fn();
        eventBus.on('test:event', mockHandler);
        
        // Act
        eventBus.emit('test:event', { value: 42 });
        
        // Assert
        expect(mockHandler).toHaveBeenCalledWith({ value: 42 });
    });
    
    test('should handle multiple events', () => {
        // Setup
        const mockHandler1 = jest.fn();
        const mockHandler2 = jest.fn();
        
        eventBus.on('test:event', mockHandler1);
        eventBus.on('test:another', mockHandler2);
        
        // Act
        eventBus.emit('test:event', { value: 42 });
        eventBus.emit('test:another', { message: 'hello' });
        
        // Assert
        expect(mockHandler1).toHaveBeenCalledWith({ value: 42 });
        expect(mockHandler2).toHaveBeenCalledWith({ message: 'hello' });
    });
    
    test('should unsubscribe handlers', () => {
        // Setup
        const mockHandler = jest.fn();
        eventBus.on('test:event', mockHandler);
        
        // Act
        eventBus.off('test:event', mockHandler);
        eventBus.emit('test:event', { value: 42 });
        
        // Assert
        expect(mockHandler).not.toHaveBeenCalled();
    });
    
    test('should handle errors in event handlers', () => {
        // Setup
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        const mockHandler = jest.fn().mockImplementation(() => {
            throw new Error('Test error');
        });
        
        eventBus.on('test:event', mockHandler);
        
        // Act - this should not throw
        eventBus.emit('test:event', { value: 42 });
        
        // Assert
        expect(mockHandler).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();
        
        // Cleanup
        consoleSpy.mockRestore();
    });
    
    test('should support multiple handlers for the same event', () => {
        // Setup
        const mockHandler1 = jest.fn();
        const mockHandler2 = jest.fn();
        
        eventBus.on('test:event', mockHandler1);
        eventBus.on('test:event', mockHandler2);
        
        // Act
        eventBus.emit('test:event', { value: 42 });
        
        // Assert
        expect(mockHandler1).toHaveBeenCalledWith({ value: 42 });
        expect(mockHandler2).toHaveBeenCalledWith({ value: 42 });
    });
});
"@
$eventBusTest | Set-Content -Path "tests/core/EventBus.test.ts"

# Add barrel files for easier imports
Write-Host "Creating barrel files for easier imports..." -ForegroundColor Green

# Create index.ts for core/base
$coreBaseIndex = @"
export * from './IComponent';
export * from './IEntity';
export * from './Component';
export * from './Entity';
"@
$coreBaseIndex | Set-Content -Path "src/core/base/index.ts"

# Create index.ts for core/events
$coreEventsIndex = @"
export * from './EventBus';
"@
$coreEventsIndex | Set-Content -Path "src/core/events/index.ts"

# Create index.ts for utils/errors
$errorsIndex = @"
export * from './GameError';
export * from './ComponentError';
"@
$errorsIndex | Set-Content -Path "src/utils/errors/index.ts"

# Create index.ts for utils/logging
$loggingIndex = @"
export * from './Logger';
"@
$loggingIndex | Set-Content -Path "src/utils/logging/index.ts"

# Create index.ts for types/common
$typesCommonIndex = @"
export * from './Vector3';
"@
$typesCommonIndex | Set-Content -Path "src/types/common/index.ts"

# Create core/index.ts
$coreIndex = @"
export * from './base';
export * from './events';
export * from './ServiceContainer';
"@
$coreIndex | Set-Content -Path "src/core/index.ts"

# Create utils/index.ts
$utilsIndex = @"
export * from './errors';
export * from './logging';
"@
$utilsIndex | Set-Content -Path "src/utils/index.ts"

# Create types/index.ts
$typesIndex = @"
export * from './common';
export * from './events/GameEvents';
"@
$typesIndex | Set-Content -Path "src/types/index.ts"

# Create a simple component for transform functionality
Write-Host "Creating transform component..." -ForegroundColor Green

# ITransformComponent.ts
$iTransformComponent = @"
import { IComponent } from '@core/base/IComponent';
import { Vector3 } from '@types/common/Vector3';

/**
 * Transform component options
 */
export interface TransformComponentOptions {
    /**
     * Initial position
     */
    position?: Vector3;
    
    /**
     * Initial rotation (in radians)
     */
    rotation?: Vector3;
    
    /**
     * Initial scale
     */
    scale?: Vector3;
}

/**
 * Transform component interface
 */
export interface ITransformComponent extends IComponent {
    /**
     * Get the current position
     */
    getPosition(): Vector3;
    
    /**
     * Set the position
     */
    setPosition(position: Vector3): void;
    
    /**
     * Get the current rotation
     */
    getRotation(): Vector3;
    
    /**
     * Set the rotation
     */
    setRotation(rotation: Vector3): void;
    
    /**
     * Get the current scale
     */
    getScale(): Vector3;
    
    /**
     * Set the scale
     */
    setScale(scale: Vector3): void;
    
    /**
     * Get the forward direction vector
     */
    getForward(): Vector3;
    
    /**
     * Get the right direction vector
     */
    getRight(): Vector3;
    
    /**
     * Get the up direction vector
     */
    getUp(): Vector3;
}
"@
New-Item -ItemType Directory -Path "src/components/transform" -Force | Out-Null
$iTransformComponent | Set-Content -Path "src/components/transform/ITransformComponent.ts"

# TransformComponent.ts
$transformComponent = @"
import { Component } from '@core/base/Component';
import { ITransformComponent, TransformComponentOptions } from './ITransformComponent';
import { Vector3, createVector3 } from '@types/common/Vector3';

/**
 * Default transform options
 */
const DEFAULT_TRANSFORM_OPTIONS: TransformComponentOptions = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
};

/**
 * Transform component implementation
 */
export class TransformComponent extends Component implements ITransformComponent {
    public readonly type: string = 'transform';
    
    private position: Vector3;
    private rotation: Vector3;
    private scale: Vector3;
    
    /**
     * Create a new transform component
     */
    constructor(options: TransformComponentOptions = {}) {
        super({ type: 'transform' });
        
        // Apply defaults
        const config = { ...DEFAULT_TRANSFORM_OPTIONS, ...options };
        
        this.position = { ...config.position! };
        this.rotation = { ...config.rotation! };
        this.scale = { ...config.scale! };
    }
    
    /**
     * Update the component
     */
    public update(_deltaTime: number): void {
        // Transform doesn't need updating
    }
    
    /**
     * Get the current position
     */
    public getPosition(): Vector3 {
        return { ...this.position };
    }
    
    /**
     * Set the position
     */
    public setPosition(position: Vector3): void {
        this.position = { ...position };
    }
    
    /**
     * Get the current rotation
     */
    public getRotation(): Vector3 {
        return { ...this.rotation };
    }
    
    /**
     * Set the rotation
     */
    public setRotation(rotation: Vector3): void {
        this.rotation = { ...rotation };
    }
    
    /**
     * Get the current scale
     */
    public getScale(): Vector3 {
        return { ...this.scale };
    }
    
    /**
     * Set the scale
     */
    public setScale(scale: Vector3): void {
        this.scale = { ...scale };
    }
    
    /**
     * Get the forward direction vector
     */
    public getForward(): Vector3 {
        // Simple implementation - doesn't account for x and z rotation
        const angle = this.rotation.y;
        return createVector3(
            Math.sin(angle),
            0,
            Math.cos(angle)
        );
    }
    
    /**
     * Get the right direction vector
     */
    public getRight(): Vector3 {
        // Simple implementation - doesn't account for x and z rotation
        const angle = this.rotation.y;
        return createVector3(
            Math.sin(angle + Math.PI / 2),
            0,
            Math.cos(angle + Math.PI / 2)
        );
    }
    
    /**
     * Get the up direction vector
     */
    public getUp(): Vector3 {
        // Simple implementation - always returns world up
        return createVector3(0, 1, 0);
    }
}
"@
$transformComponent | Set-Content -Path "src/components/transform/TransformComponent.ts"

# Index.ts for transform component
$transformIndex = @"
export * from './ITransformComponent';
export * from './TransformComponent';
"@
$transformIndex | Set-Content -Path "src/components/transform/index.ts"

# Create components/index.ts
$componentsIndex = @"
export * from './transform';
"@
$componentsIndex | Set-Content -Path "src/components/index.ts"

# Validate the installation
Write-Host "`nValidating installation..." -ForegroundColor Cyan

$validationErrors = @()

# Check if critical files exist
$criticalFiles = @(
    "package.json",
    "tsconfig.json",
    "webpack.config.js",
    "jest.config.js",
    "src/index.ts",
    "public/index.html"
)

foreach ($file in $criticalFiles) {
    if (-not (Test-Path $file)) {
        $validationErrors += "Missing critical file: $file"
    }
}

# Check if critical directories exist
$criticalDirs = @(
    "src/core",
    "src/components",
    "src/game",
    "src/types",
    "src/utils",
    "public",
    "tests"
)

foreach ($dir in $criticalDirs) {
    if (-not (Test-Path $dir -PathType Container)) {
        $validationErrors += "Missing critical directory: $dir"
    }
}

# Try to compile the TypeScript code
try {
    Write-Host "Testing TypeScript compilation..." -ForegroundColor Yellow
    npm run build --silent
} catch {
    $validationErrors += "TypeScript compilation failed: $_"
}

# Report validation results
if ($validationErrors.Count -gt 0) {
    Write-Host "`nValidation failed with the following errors:" -ForegroundColor Red
    foreach ($error in $validationErrors) {
        Write-Host "- $error" -ForegroundColor Red
    }
    Write-Host "`nPlease check the errors above and try running the script again." -ForegroundColor Yellow
    if ($currentDir -ne "runjumpski") {
        Set-Location ..
    }
    exit 1
}

Write-Host "Validation successful!" -ForegroundColor Green

# Final completion message
if ($currentDir -ne "runjumpski") {
    Set-Location ..
}
Write-Host "`nRunJumpSki project initialization complete!" -ForegroundColor Green
Write-Host "`nTo get started:" -ForegroundColor Cyan
if ($currentDir -ne "runjumpski") {
    Write-Host "1. cd runjumpski" -ForegroundColor Yellow
}
Write-Host "2. npm start" -ForegroundColor Yellow

Write-Host "`nProject structure has been set up as follows:" -ForegroundColor Cyan
Write-Host "- Core engine components in src/core/" -ForegroundColor White
Write-Host "- Game components in src/components/" -ForegroundColor White
Write-Host "- Game-specific implementations in src/game/" -ForegroundColor White
Write-Host "- Type definitions in src/types/" -ForegroundColor White
Write-Host "- Utility functions in src/utils/" -ForegroundColor White

Write-Host "`nNext steps according to the roadmap:" -ForegroundColor Cyan
Write-Host "1. Complete the base entity-component framework" -ForegroundColor White
Write-Host "2. Implement the physics system with Babylon.js" -ForegroundColor White
Write-Host "3. Create player movement components" -ForegroundColor White
Write-Host "4. Develop skiing mechanics" -ForegroundColor White

Write-Host "`nFor more information, check:" -ForegroundColor Cyan
Write-Host "- README.md for project overview and setup instructions" -ForegroundColor White
Write-Host "- ProjectStatus.md for current implementation status" -ForegroundColor White
Write-Host "- docs/ directory for detailed documentation" -ForegroundColor White