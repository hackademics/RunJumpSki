#!/usr/bin/env pwsh
# Script to rename destroy() methods to dispose() across codebase

# Define file paths to process from STATUS.md action plan and grep results
$filesToProcess = @(
    # Core source files 
    "src/core/debug/IDebugSystem.ts",
    "src/core/debug/DebugSystem.ts",
    "src/core/physics/IProjectilePhysics.ts",
    "src/core/physics/PhysicsSystem.ts",
    "src/core/physics/PooledProjectilePhysics.ts",
    "src/core/physics/ProjectilePhysics.ts", 
    "src/core/physics/SpatialPartitioningCollisionSystem.ts",
    "src/core/input/InputSystem.ts",
    "src/core/input/IInputSystem.ts",
    "src/core/physics/IPhysicsSystem.ts",
    "src/core/physics/ICollisionSystem.ts",
    "src/core/physics/CollisionSystem.ts",
    "src/core/physics/CollisionManager.ts",
    "src/core/physics/PhysicsManager.ts",
    "src/game/ui/controls/ControlBindingPanel.ts",
    "src/game/ui/controls/KeyCaptureDialog.ts",
    "src/game/ui/controls/ControlsMenuScreen.ts",
    "src/game/ui/controls/BindingRow.ts",
    "src/game/weapons/WeaponSystem.ts",
    
    # Examples
    "src/examples/PerformanceDemo.ts",
    "src/examples/OptimizedCollisionDemo.ts",
    
    # Test files
    "src/core/physics/SpatialPartitioningCollisionSystem.test.ts",
    "tests/unit/game/weapons/SpinfusorProjectile.test.ts",
    "tests/unit/core/physics/ProjectilePhysics.test.ts",
    "tests/unit/core/physics/PhysicsSystem.test.ts",
    "tests/unit/core/physics/PhysicsManager.test.ts",
    "tests/unit/core/physics/CollisionSystem.test.ts",
    "tests/unit/core/physics/CollisionManager.test.ts",
    "tests/unit/core/input/InputSystem.test.ts"
)

# Function to process a file
function Process-File {
    param (
        [string]$filePath
    )
    
    if (-not (Test-Path $filePath)) {
        Write-Host "File not found: $filePath" -ForegroundColor Red
        return $false
    }
    
    # Read the file content
    $content = Get-Content -Path $filePath -Raw
    
    # Make a backup
    $backupPath = "$filePath.bak"
    Copy-Item -Path $filePath -Destination $backupPath -Force
    
    # Create a new content variable with replacements
    $newContent = $content
    
    # Replace method declarations in interfaces and classes
    $newContent = $newContent -replace '([^\w])destroy\(\)(\s*):(\s*)([^{;]*)', '$1dispose()$2:$3$4'
    
    # Replace override methods
    $newContent = $newContent -replace '([^\w])override(\s+)destroy\(\)', '$1override$2dispose()'
    
    # Replace interface methods
    $newContent = $newContent -replace '([^\w])destroy\(\s*\)(\s*):(\s*)([^{;]*)', '$1dispose()$2:$3$4'
    
    # Replace method calls
    $newContent = $newContent -replace '([^\w])destroy\(\)', '$1dispose()'
    
    # Replace super calls
    $newContent = $newContent -replace 'super\.destroy\(\)', 'super.dispose()'
    
    # Replace JSDoc comments
    $newContent = $newContent -replace '@method(\s+)destroy', '@method$1dispose'
    
    # Replace specific class method calls
    $newContent = $newContent -replace '\.destroy\(\)', '.dispose()'
    
    # Replace mock function definitions in test files
    $newContent = $newContent -replace 'destroy: jest\.fn\(\)', 'dispose: jest.fn()'
    
    # Get number of replacements
    $replacementCount = ($content | Select-String -Pattern 'destroy\(' -AllMatches).Matches.Count - 
                       ($newContent | Select-String -Pattern 'destroy\(' -AllMatches).Matches.Count
    
    # Add in replacements for 'destroy: jest.fn()' pattern in test files
    $replacementCount += ($content | Select-String -Pattern 'destroy: jest\.fn\(\)' -AllMatches).Matches.Count -
                       ($newContent | Select-String -Pattern 'destroy: jest\.fn\(\)' -AllMatches).Matches.Count
    
    # Check if changes were made
    if ($content -ne $newContent) {
        # Write the changes to the file
        Set-Content -Path $filePath -Value $newContent
        Write-Host "Updated $filePath - $replacementCount replacements made" -ForegroundColor Green
        return $true
    } else {
        Write-Host "No changes needed in $filePath" -ForegroundColor Yellow
        # Remove the backup if no changes
        Remove-Item -Path $backupPath -Force
        return $false
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
    
    $fileContent = Get-Content -Path $fullPath -Raw
    $initialDestroyMethodCount = ($fileContent | Select-String -Pattern 'destroy\(' -AllMatches).Matches.Count 
    $initialDestroyJestCount = ($fileContent | Select-String -Pattern 'destroy: jest\.fn\(\)' -AllMatches).Matches.Count
    
    $changed = Process-File -filePath $fullPath
    
    $updatedContent = Get-Content -Path $fullPath -Raw
    $finalDestroyMethodCount = ($updatedContent | Select-String -Pattern 'destroy\(' -AllMatches).Matches.Count
    $finalDestroyJestCount = ($updatedContent | Select-String -Pattern 'destroy: jest\.fn\(\)' -AllMatches).Matches.Count
    
    $processedCount++
    if ($changed) {
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
Write-Host "Make sure to update any import statements or type references that mention 'destroy'." -ForegroundColor Yellow
