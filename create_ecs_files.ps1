# PowerShell script to create placeholder files for RunJumpSki ECS components
# This script creates directories and empty files based on the STATUS.md tasks

# Function to create a directory if it doesn't exist
function EnsureDirectoryExists {
    param([string]$path)
    
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "Created directory: $path" -ForegroundColor Green
    }
}

# Function to create a placeholder file with a simple comment header
function CreatePlaceholderFile {
    param(
        [string]$filePath,
        [string]$componentName
    )
    
    # Extract directory path from the file path
    $directory = Split-Path -Path $filePath -Parent
    
    # Create the directory if it doesn't exist
    EnsureDirectoryExists $directory
    
    # Check if file already exists
    if (Test-Path $filePath) {
        Write-Host "File already exists: $filePath" -ForegroundColor Yellow
    }
    else {
        # Get the file name without extension
        $fileName = (Split-Path -Path $filePath -Leaf)
        $fileName = $fileName -replace ".ts$", ""
        
        # Create placeholder content based on file type
        $content = "/**`r`n"
        $content += " * @file $filePath`r`n"
        $content += " * @description Placeholder for $fileName`r`n"
        $content += " */`r`n`r`n"
        
        # Add different content based on file type
        if ($filePath -match "I[A-Z].*Component\.ts$") {
            # Interface file
            $interfaceName = [System.IO.Path]::GetFileNameWithoutExtension($filePath)
            $content += "/**`r`n"
            $content += " * Interface for $componentName component`r`n"
            $content += " */`r`n"
            $content += "export interface $interfaceName {`r`n"
            $content += "    // TODO: Define interface methods and properties`r`n"
            $content += "}`r`n"
        }
        elseif ($filePath -match "Component\.ts$" -and $filePath -notmatch "test\.ts$") {
            # Component implementation file
            $className = [System.IO.Path]::GetFileNameWithoutExtension($filePath)
            $interfaceName = "I$className"
            $content += "import * as BABYLON from 'babylonjs';`r`n"
            $content += "import { Component } from '../../Component';`r`n"
            $content += "import { IEntity } from '../../IEntity';`r`n"
            $content += "import { $interfaceName } from './$interfaceName';`r`n`r`n"
            $content += "/**`r`n"
            $content += " * Configuration options for $className`r`n"
            $content += " */`r`n"
            $content += "export interface ${className}Options {`r`n"
            $content += "    // TODO: Define options`r`n"
            $content += "}`r`n`r`n"
            $content += "/**`r`n"
            $content += " * Default options for $className`r`n"
            $content += " */`r`n"
            $content += "export const DEFAULT_${className.ToUpper()}_OPTIONS: ${className}Options = {`r`n"
            $content += "    // TODO: Define default options`r`n"
            $content += "};`r`n`r`n"
            $content += "/**`r`n"
            $content += " * Implementation of $componentName component`r`n"
            $content += " */`r`n"
            $content += "export class $className extends Component implements $interfaceName {`r`n"
            $content += "    public readonly type: string = '$($className.ToLower().Replace('component', ''))';`r`n`r`n"
            $content += "    /**`r`n"
            $content += "     * Create a new $className`r`n"
            $content += "     */`r`n"
            $content += "    constructor(options: Partial<${className}Options> = {}) {`r`n"
            $content += "        super({ type: '$($className.ToLower().Replace('component', ''))' });`r`n`r`n"
            $content += "        // TODO: Initialize component`r`n"
            $content += "    }`r`n`r`n"
            $content += "    /**`r`n"
            $content += "     * Initialize the component`r`n"
            $content += "     */`r`n"
            $content += "    public override init(entity: IEntity): void {`r`n"
            $content += "        super.init(entity);`r`n`r`n"
            $content += "        // TODO: Component initialization logic`r`n"
            $content += "    }`r`n`r`n"
            $content += "    /**`r`n"
            $content += "     * Update the component`r`n"
            $content += "     */`r`n"
            $content += "    public override update(deltaTime: number): void {`r`n"
            $content += "        if (!this.isEnabled()) return;`r`n`r`n"
            $content += "        // TODO: Component update logic`r`n"
            $content += "    }`r`n`r`n"
            $content += "    /**`r`n"
            $content += "     * Clean up resources`r`n"
            $content += "     */`r`n"
            $content += "    public override dispose(): void {`r`n"
            $content += "        // TODO: Component cleanup`r`n`r`n"
            $content += "        super.dispose();`r`n"
            $content += "    }`r`n"
            $content += "}`r`n"
        }
        elseif ($filePath -match "test\.ts$") {
            # Test file
            $componentName = [System.IO.Path]::GetFileNameWithoutExtension($filePath).Replace(".test", "")
            $content += "import * as BABYLON from 'babylonjs';`r`n"
            $content += "import { $componentName } from '../../../../../src/core/ecs/components/$componentName';`r`n"
            $content += "import { I$componentName } from '../../../../../src/core/ecs/components/I$componentName';`r`n"
            $content += "import { Entity } from '../../../../../src/core/ecs/Entity';`r`n"
            $content += "import { IEntity } from '../../../../../src/core/ecs/IEntity';`r`n`r`n"
            $content += "describe('$componentName', () => {`r`n"
            $content += "    let component: $componentName;`r`n"
            $content += "    let entity: IEntity;`r`n`r`n"
            $content += "    beforeEach(() => {`r`n"
            $content += "        entity = new Entity('test-entity');`r`n"
            $content += "        component = new $componentName();`r`n"
            $content += "    });`r`n`r`n"
            $content += "    afterEach(() => {`r`n"
            $content += "        component.dispose();`r`n"
            $content += "        entity.dispose();`r`n"
            $content += "    });`r`n`r`n"
            $content += "    test('should have correct type', () => {`r`n"
            $content += "        expect(component.type).toBe('$($componentName.ToLower().Replace('component', ''))');`r`n"
            $content += "    });`r`n`r`n"
            $content += "    test('should initialize properly', () => {`r`n"
            $content += "        component.init(entity);`r`n"
            $content += "        expect(component.entity).toBe(entity);`r`n"
            $content += "    });`r`n`r`n"
            $content += "    // TODO: Add more specific tests`r`n"
            $content += "});`r`n"
        }
        
        # Create the file
        $content | Out-File -FilePath $filePath -Encoding utf8
        Write-Host "Created placeholder file: $filePath" -ForegroundColor Green
    }
}

# Main script execution starts here

Write-Host "Creating placeholder files for RunJumpSki ECS components..." -ForegroundColor Cyan

# Transform Component
CreatePlaceholderFile "src/core/ecs/components/ITransformComponent.ts" "Transform"
CreatePlaceholderFile "src/core/ecs/components/TransformComponent.ts" "Transform"
CreatePlaceholderFile "tests/unit/core/ecs/components/TransformComponent.test.ts" "Transform"

# Renderable Components
CreatePlaceholderFile "src/core/ecs/components/IRenderableComponent.ts" "Renderable"
CreatePlaceholderFile "src/core/ecs/components/RenderableComponent.ts" "Renderable"
CreatePlaceholderFile "src/core/ecs/components/IMeshComponent.ts" "Mesh"
CreatePlaceholderFile "src/core/ecs/components/MeshComponent.ts" "Mesh"
CreatePlaceholderFile "tests/unit/core/ecs/components/RenderableComponent.test.ts" "Renderable"
CreatePlaceholderFile "tests/unit/core/ecs/components/MeshComponent.test.ts" "Mesh"

# Physics Components
CreatePlaceholderFile "src/core/ecs/components/IPhysicsComponent.ts" "Physics"
CreatePlaceholderFile "src/core/ecs/components/PhysicsComponent.ts" "Physics"
CreatePlaceholderFile "src/core/ecs/components/IColliderComponent.ts" "Collider"
CreatePlaceholderFile "src/core/ecs/components/ColliderComponent.ts" "Collider"
CreatePlaceholderFile "tests/unit/core/ecs/components/PhysicsComponent.test.ts" "Physics"
CreatePlaceholderFile "tests/unit/core/ecs/components/ColliderComponent.test.ts" "Collider"

# Audio Components
CreatePlaceholderFile "src/core/ecs/components/IAudioComponent.ts" "Audio"
CreatePlaceholderFile "src/core/ecs/components/AudioComponent.ts" "Audio"
CreatePlaceholderFile "tests/unit/core/ecs/components/AudioComponent.test.ts" "Audio"

# Camera Components
CreatePlaceholderFile "src/core/ecs/components/ICameraComponent.ts" "Camera"
CreatePlaceholderFile "src/core/ecs/components/CameraComponent.ts" "Camera"
CreatePlaceholderFile "src/core/ecs/components/IFirstPersonCameraComponent.ts" "FirstPersonCamera"
CreatePlaceholderFile "src/core/ecs/components/FirstPersonCameraComponent.ts" "FirstPersonCamera"
CreatePlaceholderFile "tests/unit/core/ecs/components/CameraComponent.test.ts" "Camera"
CreatePlaceholderFile "tests/unit/core/ecs/components/FirstPersonCameraComponent.test.ts" "FirstPersonCamera"

Write-Host "`nAll placeholder files have been created successfully!" -ForegroundColor Cyan
Write-Host "You can now implement each component with actual functionality." -ForegroundColor Cyan 