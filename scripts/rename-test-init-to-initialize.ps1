#!/usr/bin/env pwsh
# Script to rename init() method calls to initialize() in test files

# Define file patterns to process
$patterns = @(
    "tests/unit/core/ecs/components/*.test.ts",
    "tests/unit/core/ecs/Component.test.ts",
    "src/examples/PerformanceBenchmark.ts"
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
    
    # Replace calls to component.init(entity) with component.initialize(entity)
    $newContent = $newContent -replace 'component\.init\(', 'component.initialize('
    
    # Replace specific component calls
    $newContent = $newContent -replace 'boxComponent\.init\(', 'boxComponent.initialize('
    $newContent = $newContent -replace 'sphereComponent\.init\(', 'sphereComponent.initialize('
    $newContent = $newContent -replace 'cylinderComponent\.init\(', 'cylinderComponent.initialize('
    $newContent = $newContent -replace 'capsuleComponent\.init\(', 'capsuleComponent.initialize('
    
    # Replace calls to this.weaponSystem.init() with this.weaponSystem.initialize()
    $newContent = $newContent -replace 'this\.weaponSystem\.init\(\)', 'this.weaponSystem.initialize()'
    $newContent = $newContent -replace 'this\.particleEffectsSystem\.init\(\)', 'this.particleEffectsSystem.initialize()'
    
    # Get number of replacements
    $replacementCount = ($content | Select-String -Pattern '\.init\(' -AllMatches).Matches.Count - 
                         ($newContent | Select-String -Pattern '\.init\(' -AllMatches).Matches.Count
    
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

# Find all files matching patterns
$files = @()
foreach ($pattern in $patterns) {
    $matchingFiles = Get-ChildItem -Path $pattern
    $files += $matchingFiles
}

# Counter for processed files
$processedCount = 0
$changedCount = 0

# Process each file
foreach ($file in $files) {
    $fullPath = $file.FullName
    Write-Host "Processing $($file.Name)..." -ForegroundColor Cyan
    
    $changed = Process-File -filePath $fullPath
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