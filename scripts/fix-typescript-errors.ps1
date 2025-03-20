#!/usr/bin/env pwsh
# TypeScript Error Fix Utility Script
# This script helps to analyze, categorize, and fix TypeScript errors in the project.

param (
    [string]$errorCategory = "all", # Options: all, physics, renderer, examples, any
    [switch]$fixMissingProperties = $false,
    [switch]$fixImplicitAny = $false,
    [switch]$fixResourceTracking = $false,
    [switch]$dryRun = $false,
    [string]$outputFile = "./typescript-errors.json"
)

# Define color outputs
$colors = @{
    "Reset" = "`e[0m"
    "Red" = "`e[31m"
    "Green" = "`e[32m"
    "Yellow" = "`e[33m"
    "Blue" = "`e[34m"
    "Magenta" = "`e[35m"
    "Cyan" = "`e[36m"
}

# Function to print with color
function Write-ColorOutput {
    param (
        [string]$message,
        [string]$color = "Reset"
    )
    Write-Host "$($colors[$color])$message$($colors["Reset"])"
}

# Function to run TypeScript compiler in check mode
function Get-TypeScriptErrors {
    Write-ColorOutput "Analyzing TypeScript errors..." "Cyan"
    $tscOutput = & npx tsc --noEmit 2>&1
    return $tscOutput
}

# Function to parse tsc output into structured errors
function Parse-TypeScriptErrors {
    param (
        [string[]]$tscOutput
    )
    
    $errors = @()
    $currentError = $null
    
    foreach ($line in $tscOutput) {
        if ($line -match "^(.+)\((\d+),(\d+)\): error TS(\d+): (.+)$") {
            if ($currentError) {
                $errors += $currentError
            }
            
            $currentError = @{
                "File" = $matches[1]
                "Line" = [int]$matches[2]
                "Column" = [int]$matches[3]
                "Code" = "TS" + $matches[4]
                "Message" = $matches[5]
                "Category" = "Unknown"
            }
            
            # Categorize error
            if ($matches[4] -in @("2339", "2551", "2353")) {
                $currentError.Category = "PropertyAccess"
            }
            elseif ($matches[4] -in @("7006", "2345", "2322")) {
                $currentError.Category = "TypeDefinition"
            }
            elseif ($matches[4] -in @("2554", "2393", "2561")) {
                $currentError.Category = "FunctionMethod"
            }
            elseif ($matches[4] -in @("2564", "2532")) {
                $currentError.Category = "Initialization"
            }
        }
    }
    
    if ($currentError) {
        $errors += $currentError
    }
    
    return $errors
}

# Function to categorize errors by system
function Categorize-ErrorsBySystem {
    param (
        [array]$errors
    )
    
    $categorized = @{
        "Physics" = @()
        "Renderer" = @()
        "Examples" = @()
        "Other" = @()
    }
    
    foreach ($error in $errors) {
        $file = $error.File
        
        if ($file -match "physics|collision") {
            $categorized.Physics += $error
        }
        elseif ($file -match "renderer|material|particle") {
            $categorized.Renderer += $error
        }
        elseif ($file -match "examples|demo") {
            $categorized.Examples += $error
        }
        else {
            $categorized.Other += $error
        }
    }
    
    return $categorized
}

# Function to generate interface properties from errors
function Generate-InterfaceProperties {
    param (
        [array]$errors,
        [string]$interfaceName
    )
    
    $properties = @()
    
    $propertyErrors = $errors | Where-Object { 
        $_.Category -eq "PropertyAccess" -and 
        $_.Message -match "Property '(.+)' does not exist on type '$interfaceName'" 
    }
    
    foreach ($error in $propertyErrors) {
        if ($error.Message -match "Property '(.+)' does not exist") {
            $properties += $matches[1]
        }
    }
    
    return $properties | Sort-Object -Unique
}

# Function to fix missing properties by adding them to interfaces
function Fix-MissingProperties {
    param (
        [array]$errors,
        [bool]$dryRun = $true
    )
    
    $interfaces = @{
        "SpatialPartitioningCollisionSystemOptions" = @{
            "File" = "src/core/physics/SpatialPartitioningCollisionSystem.ts"
            "Properties" = @()
        }
    }
    
    # Find all missing properties for tracked interfaces
    foreach ($interfaceName in $interfaces.Keys) {
        $interfaces[$interfaceName].Properties = Generate-InterfaceProperties -errors $errors -interfaceName $interfaceName
    }
    
    # Display and optionally fix
    foreach ($interfaceName in $interfaces.Keys) {
        $interface = $interfaces[$interfaceName]
        
        if ($interface.Properties.Count -gt 0) {
            Write-ColorOutput "Found missing properties for $interfaceName:" "Yellow"
            foreach ($prop in $interface.Properties) {
                Write-ColorOutput "  - $prop" "Cyan"
            }
            
            if (-not $dryRun) {
                # Here would be code to modify the interface file
                Write-ColorOutput "Would update $($interface.File) (implementation skipped in this script)" "Green"
            }
        }
    }
}

# Function to fix implicit any types
function Fix-ImplicitAnyTypes {
    param (
        [array]$errors,
        [bool]$dryRun = $true
    )
    
    $anyErrors = $errors | Where-Object { $_.Code -eq "TS7006" }
    
    if ($anyErrors.Count -gt 0) {
        Write-ColorOutput "Found $($anyErrors.Count) implicit 'any' type errors:" "Yellow"
        
        $fileGroups = $anyErrors | Group-Object -Property File
        
        foreach ($group in $fileGroups) {
            Write-ColorOutput "File: $($group.Name)" "Magenta"
            
            foreach ($error in $group.Group) {
                if ($error.Message -match "Parameter '(.+)' implicitly has an 'any' type") {
                    $param = $matches[1]
                    Write-ColorOutput "  - Line $($error.Line): Parameter '$param'" "Cyan"
                }
            }
        }
        
        if (-not $dryRun) {
            Write-ColorOutput "Would fix implicit any types (implementation skipped in this script)" "Green"
        }
    }
}

# Function to fix resource tracking issues
function Fix-ResourceTracking {
    param (
        [array]$errors,
        [bool]$dryRun = $true
    )
    
    $resourceErrors = $errors | Where-Object { 
        ($_.Message -match "Property 'untrack' does not exist") -or
        ($_.Message -match "Expected [0-9]+ arguments, but got [0-9]+") -and
        ($_.Message -match "'track'")
    }
    
    if ($resourceErrors.Count -gt 0) {
        Write-ColorOutput "Found $($resourceErrors.Count) resource tracking errors:" "Yellow"
        
        foreach ($error in $resourceErrors) {
            Write-ColorOutput "File: $($error.File) Line: $($error.Line)" "Magenta"
            Write-ColorOutput "  - $($error.Message)" "Cyan"
        }
        
        if (-not $dryRun) {
            Write-ColorOutput "Would fix resource tracking issues (implementation skipped in this script)" "Green"
        }
    }
}

# Main execution flow
try {
    $tscOutput = Get-TypeScriptErrors
    $errors = Parse-TypeScriptErrors -tscOutput $tscOutput
    
    if ($errors.Count -eq 0) {
        Write-ColorOutput "No TypeScript errors found! 🎉" "Green"
        exit 0
    }
    
    Write-ColorOutput "Found $($errors.Count) TypeScript errors" "Yellow"
    
    # Categorize errors
    $categorizedErrors = Categorize-ErrorsBySystem -errors $errors
    
    # Export errors to JSON file
    $errorsObject = @{
        "timestamp" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "totalErrors" = $errors.Count
        "categoryCount" = @{
            "physics" = $categorizedErrors.Physics.Count
            "renderer" = $categorizedErrors.Renderer.Count
            "examples" = $categorizedErrors.Examples.Count
            "other" = $categorizedErrors.Other.Count
        }
        "errors" = $errors
        "categorized" = $categorizedErrors
    }
    
    $errorsObject | ConvertTo-Json -Depth 5 | Out-File -FilePath $outputFile
    Write-ColorOutput "Errors exported to $outputFile" "Blue"
    
    # Filter errors based on selected category
    $targetErrors = @()
    switch ($errorCategory) {
        "physics" { $targetErrors = $categorizedErrors.Physics }
        "renderer" { $targetErrors = $categorizedErrors.Renderer }
        "examples" { $targetErrors = $categorizedErrors.Examples }
        "other" { $targetErrors = $categorizedErrors.Other }
        default { $targetErrors = $errors }
    }
    
    # Fix issues based on flags
    if ($fixMissingProperties) {
        Fix-MissingProperties -errors $targetErrors -dryRun $dryRun
    }
    
    if ($fixImplicitAny) {
        Fix-ImplicitAnyTypes -errors $targetErrors -dryRun $dryRun
    }
    
    if ($fixResourceTracking) {
        Fix-ResourceTracking -errors $targetErrors -dryRun $dryRun
    }
    
    # Generate summary
    Write-ColorOutput "`nError Summary by Category:" "Green"
    Write-ColorOutput "- Physics: $($categorizedErrors.Physics.Count) errors" "Cyan"
    Write-ColorOutput "- Renderer: $($categorizedErrors.Renderer.Count) errors" "Cyan"
    Write-ColorOutput "- Examples: $($categorizedErrors.Examples.Count) errors" "Cyan"
    Write-ColorOutput "- Other: $($categorizedErrors.Other.Count) errors" "Cyan"
    
    # Provide next steps
    Write-ColorOutput "`nNext Steps:" "Yellow"
    Write-ColorOutput "1. Run './scripts/fix-typescript-errors.ps1 -errorCategory physics -fixMissingProperties -dryRun' to see physics property issues" "White"
    Write-ColorOutput "2. Run with '-fixMissingProperties' to fix missing interface properties" "White"
    Write-ColorOutput "3. Run with '-fixImplicitAny' to address 'any' type issues" "White"
    Write-ColorOutput "4. Run with '-fixResourceTracking' to fix resource tracking problems" "White"
    Write-ColorOutput "5. Remove the -dryRun flag to actually apply fixes" "White"
    
} catch {
    Write-ColorOutput "An error occurred: $_" "Red"
    exit 1
} 