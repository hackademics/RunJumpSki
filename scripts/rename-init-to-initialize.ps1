#!/usr/bin/env pwsh
# Script to rename init() methods to initialize() methods across codebase

# Define file paths to process from STATUS.md action plan
$filesToProcess = @(
    "src/core/renderer/RenderComponent.ts",
    "src/core/ecs/IComponent.ts",
    "src/core/ecs/Entity.ts",
    "src/core/ecs/Component.ts",
    "src/core/ecs/components/AudioComponent.ts",
    "src/core/ecs/components/CameraComponent.ts", 
    "src/core/ecs/components/ColliderComponent.ts",
    "src/core/ecs/components/FirstPersonCameraComponent.ts",
    "src/core/ecs/components/MeshComponent.ts",
    "src/core/ecs/components/PhysicsComponent.ts",
    "src/core/ecs/components/TransformComponent.ts",
    "src/core/ecs/components/RenderableComponent.ts",
    "src/game/weapons/WeaponSystem.ts",
    "src/game/renderer/ParticleEffectsSystem.ts"
)

# Function to process a file
function Process-File {
    param (
        [string]$filePath
    )
    
    if (-not (Test-Path $filePath)) {
        Write-Host "File not found: $filePath" -ForegroundColor Red
        return
    }
    
    # Read the file content
    $content = Get-Content -Path $filePath -Raw
    
    # Make a backup
    $backupPath = "$filePath.bak"
    Copy-Item -Path $filePath -Destination $backupPath -Force
    
    # Create a new content variable with replacements
    $newContent = $content
    
    # Replace init in method declarations with specific patterns for TypeScript interface methods
    $newContent = $newContent -replace '([^\w])init\(entity: IEntity\):', '$1initialize(entity: IEntity):'
    $newContent = $newContent -replace '([^\w])init\(entity: IEntity\);', '$1initialize(entity: IEntity);'
    
    # Replace init in class method implementations
    $newContent = $newContent -replace 'public(\s+)init\(entity: IEntity\)', 'public$1initialize(entity: IEntity)'
    $newContent = $newContent -replace 'public override(\s+)init\(entity: IEntity\)', 'public override$1initialize(entity: IEntity)'
    
    # Replace async init methods in WeaponSystem and ParticleEffectsSystem
    $newContent = $newContent -replace 'public async(\s+)init\(\):', 'public async$1initialize():'
    $newContent = $newContent -replace 'public async(\s+)init\(\);', 'public async$1initialize();'
    
    # Replace init in JSDoc comments
    $newContent = $newContent -replace '@method(\s+)init', '@method$1initialize'
    $newContent = $newContent -replace '\* Initialize the component', '* Initialize the component'
    
    # Replace calls to "this.init()" with "this.initialize()"
    $newContent = $newContent -replace 'this\.init\(', 'this.initialize('
    
    # Replace calls to "component.init()" with "component.initialize()"
    $newContent = $newContent -replace 'component\.init\(', 'component.initialize('
    $newContent = $newContent -replace 'firstPersonCamera\.init\(', 'firstPersonCamera.initialize('
    $newContent = $newContent -replace 'cameraComponent\.init\(', 'cameraComponent.initialize('
    
    # Replace calls to "super.init()" with "super.initialize()"
    $newContent = $newContent -replace 'super\.init\(', 'super.initialize('
    
    # Replace "await this.weaponSystem.init()" with "await this.weaponSystem.initialize()"
    $newContent = $newContent -replace 'await this\.weaponSystem\.init\(\)', 'await this.weaponSystem.initialize()'
    $newContent = $newContent -replace 'await this\.particleEffectsSystem\.init\(\)', 'await this.particleEffectsSystem.initialize()'
    
    # Replace Entity class calling init
    $newContent = $newContent -replace 'component\.init\(this\)', 'component.initialize(this)'
    
    # Replace 'createImpostorOnInit' with 'createImpostorOnInitialize' in PhysicsComponent.ts
    if ($filePath.EndsWith("PhysicsComponent.ts")) {
        $newContent = $newContent -replace 'createImpostorOnInit', 'createImpostorOnInitialize'
    }
    
    # Get number of replacements
    $replacementCount = ($content | Select-String -Pattern 'init' -AllMatches).Matches.Count - 
                       ($newContent | Select-String -Pattern 'init' -AllMatches).Matches.Count
    
    # Check if changes were made
    if ($content -ne $newContent) {
        # Write the changes to the file
        Set-Content -Path $filePath -Value $newContent
        Write-Host "Updated $filePath - $replacementCount replacements made" -ForegroundColor Green
    } else {
        Write-Host "No changes needed in $filePath" -ForegroundColor Yellow
        # Remove the backup if no changes
        Remove-Item -Path $backupPath -Force
    }
}

# Counter for processed files
$processedCount = 0
$changedCount = 0

# Process each file
foreach ($file in $filesToProcess) {
    $fullPath = Join-Path (Get-Location) $file
    Write-Host "Processing $file..." -ForegroundColor Cyan
    
    # Skip if file doesn't exist
    if (-not (Test-Path $fullPath)) {
        Write-Host "File not found: $fullPath" -ForegroundColor Red
        continue
    }
    
    $initialMatches = (Get-Content -Path $fullPath -Raw | Select-String -Pattern 'init' -AllMatches).Matches.Count
    Process-File -filePath $fullPath
    $finalMatches = (Get-Content -Path $fullPath -Raw | Select-String -Pattern 'init' -AllMatches).Matches.Count
    
    $processedCount++
    if ($initialMatches -ne $finalMatches) {
        $changedCount++
    }
}

# Summary
Write-Host "`nProcessing complete." -ForegroundColor Green
Write-Host "Files processed: $processedCount" -ForegroundColor Cyan
Write-Host "Files changed: $changedCount" -ForegroundColor Cyan

# Friendly warning
Write-Host "`nNOTE: Please review the changes and run tests to ensure nothing was broken." -ForegroundColor Yellow
Write-Host "Backup files with .bak extension have been created for changed files." -ForegroundColor Yellow
