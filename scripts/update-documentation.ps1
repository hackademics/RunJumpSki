#!/usr/bin/env pwsh
# Update Documentation Script
# This script runs all documentation-related scripts in sequence

# Parameters
param (
    [switch]$skipJsdocAnalysis = $false,      # Skip JSDoc analysis
    [switch]$skipDiagrams = $false,           # Skip diagram generation
    [switch]$skipOnboardingGuide = $false,    # Skip onboarding guide generation
    [switch]$skipStatusUpdate = $false,       # Skip STATUS.md update
    [switch]$forceRegenerate = $false         # Force regeneration of all artifacts
)

# Set error action preference
$ErrorActionPreference = "Continue"

# Display banner
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "          RunJumpSki Documentation Updater              " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

# Check if scripts directory exists
if (-not (Test-Path "./scripts")) {
    Write-Host "Error: scripts directory not found. Make sure you're running this from the project root." -ForegroundColor Red
    exit 1
}

# Function to check if a script exists
function Script-Exists {
    param (
        [string]$scriptPath
    )
    
    if (Test-Path $scriptPath) {
        return $true
    } else {
        Write-Host "Warning: Script $scriptPath not found. Skipping." -ForegroundColor Yellow
        return $false
    }
}

# Track execution status
$executionStatus = @{
    jsdocAnalysis = $false
    diagrams = $false
    onboardingGuide = $false
    statusUpdate = $false
}

# Step 1: Run JSDoc Analysis
if (-not $skipJsdocAnalysis) {
    $jsdocScript = "./scripts/analyze-jsdoc-coverage.ps1"
    if (Script-Exists -scriptPath $jsdocScript) {
        Write-Host "Step 1: Running JSDoc Analysis..." -ForegroundColor Green
        & $jsdocScript -exportCsv
        $executionStatus.jsdocAnalysis = $true
        Write-Host ""
    }
} else {
    Write-Host "Step 1: Skipping JSDoc Analysis (--skipJsdocAnalysis flag used)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Generate Architectural Diagrams
if (-not $skipDiagrams) {
    $diagramsScript = "./scripts/create-architecture-diagrams.ps1"
    if (Script-Exists -scriptPath $diagramsScript) {
        Write-Host "Step 2: Generating Architectural Diagrams..." -ForegroundColor Green
        & $diagramsScript -force:$forceRegenerate
        $executionStatus.diagrams = $true
        Write-Host ""
    }
} else {
    Write-Host "Step 2: Skipping Diagram Generation (--skipDiagrams flag used)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 3: Generate Developer Onboarding Guide
if (-not $skipOnboardingGuide) {
    $onboardingScript = "./scripts/generate-onboarding-guide.ps1"
    if (Script-Exists -scriptPath $onboardingScript) {
        Write-Host "Step 3: Generating Developer Onboarding Guide..." -ForegroundColor Green
        & $onboardingScript
        $executionStatus.onboardingGuide = $true
        Write-Host ""
    }
} else {
    Write-Host "Step 3: Skipping Onboarding Guide Generation (--skipOnboardingGuide flag used)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 4: Update STATUS.md
if (-not $skipStatusUpdate) {
    $statusScript = "./scripts/update-documentation-status.ps1"
    if (Script-Exists -scriptPath $statusScript) {
        Write-Host "Step 4: Updating Documentation Status in STATUS.md..." -ForegroundColor Green
        & $statusScript -runAnalysis:(-not $skipJsdocAnalysis)
        $executionStatus.statusUpdate = $true
        Write-Host ""
    }
} else {
    Write-Host "Step 4: Skipping STATUS.md Update (--skipStatusUpdate flag used)" -ForegroundColor Yellow
    Write-Host ""
}

# Generate summary report
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "                Documentation Update Summary              " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "JSDoc Analysis:            $(if ($executionStatus.jsdocAnalysis) { "✅" } else { "❌" })" -ForegroundColor $(if ($executionStatus.jsdocAnalysis) { "Green" } else { "Gray" })
Write-Host "Architectural Diagrams:    $(if ($executionStatus.diagrams) { "✅" } else { "❌" })" -ForegroundColor $(if ($executionStatus.diagrams) { "Green" } else { "Gray" })
Write-Host "Developer Onboarding Guide: $(if ($executionStatus.onboardingGuide) { "✅" } else { "❌" })" -ForegroundColor $(if ($executionStatus.onboardingGuide) { "Green" } else { "Gray" })
Write-Host "Documentation Status Update: $(if ($executionStatus.statusUpdate) { "✅" } else { "❌" })" -ForegroundColor $(if ($executionStatus.statusUpdate) { "Green" } else { "Gray" })
Write-Host ""

# Display manual steps if needed
$anyFailed = $executionStatus.Values -contains $false
if ($anyFailed) {
    Write-Host "Some documentation tasks were not completed. You may need to run individual scripts manually:" -ForegroundColor Yellow
    if (-not $executionStatus.jsdocAnalysis) {
        Write-Host "  - Run './scripts/analyze-jsdoc-coverage.ps1' to analyze JSDoc coverage" -ForegroundColor Yellow
    }
    if (-not $executionStatus.diagrams) {
        Write-Host "  - Run './scripts/create-architecture-diagrams.ps1' to generate architectural diagrams" -ForegroundColor Yellow
    }
    if (-not $executionStatus.onboardingGuide) {
        Write-Host "  - Run './scripts/generate-onboarding-guide.ps1' to create the developer onboarding guide" -ForegroundColor Yellow
    }
    if (-not $executionStatus.statusUpdate) {
        Write-Host "  - Run './scripts/update-documentation-status.ps1' to update documentation status in STATUS.md" -ForegroundColor Yellow
    }
} else {
    Write-Host "All documentation tasks completed successfully! ✨" -ForegroundColor Green
}

Write-Host ""
Write-Host "Documentation files can be found in:" -ForegroundColor Cyan
Write-Host "  - JSDoc Analysis:         ./jsdoc-coverage.csv" -ForegroundColor Cyan
Write-Host "  - Architectural Diagrams: ./docs/diagrams/" -ForegroundColor Cyan
Write-Host "  - Onboarding Guide:       ./docs/DeveloperOnboarding.md" -ForegroundColor Cyan
Write-Host "  - Project Status:         ./STATUS.md" -ForegroundColor Cyan 