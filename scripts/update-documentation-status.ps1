#!/usr/bin/env pwsh
# Documentation Status Update Script
# This script updates the Documentation Status section in STATUS.md based on current progress

# Parameters
param (
    [string]$statusFile = "./STATUS.md",     # Path to STATUS.md file
    [string]$srcDir = "./src",               # Source directory to analyze
    [string]$docsDir = "./docs",             # Docs directory to analyze
    [switch]$updateFile = $true,             # Update the STATUS.md file
    [switch]$runAnalysis = $true             # Run JSDoc analysis
)

# Check if required files exist
if (-not (Test-Path $statusFile)) {
    Write-Host "Error: STATUS.md not found at $statusFile" -ForegroundColor Red
    exit 1
}

# Get JSDoc coverage data
$jsdocCoverage = @{
    filesCovered = 0
    filesTotal = 0
    classesCovered = 0
    classesTotal = 0
    interfacesCovered = 0
    interfacesTotal = 0
    methodsCovered = 0
    methodsTotal = 0
    propertiesCovered = 0 
    propertiesTotal = 0
}

if ($runAnalysis) {
    # Check if analyze-jsdoc-coverage.ps1 exists
    $jsdocScript = "./scripts/analyze-jsdoc-coverage.ps1"
    if (Test-Path $jsdocScript) {
        Write-Host "Running JSDoc coverage analysis..." -ForegroundColor Cyan
        $jsdocOutput = & $jsdocScript -directory $srcDir
        
        # Parse the summary line to extract coverage metrics
        if ($jsdocOutput -match "JSDoc Coverage: Files (\d+)%, Classes (\d+)%, Interfaces (\d+)%, Methods (\d+)%, Properties (\d+)%") {
            $fileCoverage = [int]$matches[1]
            $classCoverage = [int]$matches[2]
            $interfaceCoverage = [int]$matches[3]
            $methodCoverage = [int]$matches[4]
            $propertyCoverage = [int]$matches[5]
            
            # Extract details from output for more precise numbers
            $filesLine = $jsdocOutput -match "Files: (\d+)/(\d+)"
            if ($filesLine -match "Files: (\d+)/(\d+)") {
                $jsdocCoverage.filesCovered = [int]$matches[1]
                $jsdocCoverage.filesTotal = [int]$matches[2]
            }
            
            $classesLine = $jsdocOutput -match "Classes: (\d+)/(\d+)"
            if ($classesLine -match "Classes: (\d+)/(\d+)") {
                $jsdocCoverage.classesCovered = [int]$matches[1]
                $jsdocCoverage.classesTotal = [int]$matches[2]
            }
            
            $interfacesLine = $jsdocOutput -match "Interfaces: (\d+)/(\d+)"
            if ($interfacesLine -match "Interfaces: (\d+)/(\d+)") {
                $jsdocCoverage.interfacesCovered = [int]$matches[1]
                $jsdocCoverage.interfacesTotal = [int]$matches[2]
            }
            
            $methodsLine = $jsdocOutput -match "Methods: (\d+)/(\d+)"
            if ($methodsLine -match "Methods: (\d+)/(\d+)") {
                $jsdocCoverage.methodsCovered = [int]$matches[1]
                $jsdocCoverage.methodsTotal = [int]$matches[2]
            }
            
            $propertiesLine = $jsdocOutput -match "Properties: (\d+)/(\d+)"
            if ($propertiesLine -match "Properties: (\d+)/(\d+)") {
                $jsdocCoverage.propertiesCovered = [int]$matches[1]
                $jsdocCoverage.propertiesTotal = [int]$matches[2]
            }
        }
    } else {
        Write-Host "Warning: JSDoc analysis script not found. Skipping JSDoc coverage analysis." -ForegroundColor Yellow
    }
}

# Check if architectural diagrams exist
$architecturalDiagrams = @{
    systemInteraction = Test-Path (Join-Path -Path $docsDir -ChildPath "diagrams/system-interactions.png")
    coreWorkflows = Test-Path (Join-Path -Path $docsDir -ChildPath "diagrams/core-workflows.png")
    componentDependencies = Test-Path (Join-Path -Path $docsDir -ChildPath "diagrams/component-dependencies.png")
}

# Check if dependency graph exists
$dependencyGraphExists = Test-Path "./component-dependencies.dot"

# Check if onboarding guide exists
$onboardingGuideExists = Test-Path (Join-Path -Path $docsDir -ChildPath "DeveloperOnboarding.md")

# Read STATUS.md content
$statusContent = Get-Content -Path $statusFile -Raw

# Find the Documentation Status section
$docStatusMatch = [regex]::Match($statusContent, "(?ms)### Documentation Status.*?(?=###|$)")

if ($docStatusMatch.Success) {
    # Extract current documentation status section
    $docStatusSection = $docStatusMatch.Value
    
    # Create updated documentation status section
    $updatedDocStatusSection = @"
### Documentation Status
"@

    # JSDoc coverage status
    $jsdocStatus = if ($runAnalysis -and ($jsdocCoverage.methodsCovered / [Math]::Max(1, $jsdocCoverage.methodsTotal)) -ge 0.9) {
        "[✅]"
    } else {
        "[ ]"
    }
    
    $updatedDocStatusSection += @"

- $jsdocStatus Review JSDoc coverage
  - $(if ($jsdocCoverage.methodsCovered / [Math]::Max(1, $jsdocCoverage.methodsTotal) -ge 0.9) { "✅" } else { "[ ]" }) Ensure all public APIs are documented ($($jsdocCoverage.methodsCovered)/$($jsdocCoverage.methodsTotal) methods covered)
  - $(if ($jsdocCoverage.propertiesCovered / [Math]::Max(1, $jsdocCoverage.propertiesTotal) -ge 0.9) { "✅" } else { "[ ]" }) Add missing parameter and return type documentation ($($jsdocCoverage.propertiesCovered)/$($jsdocCoverage.propertiesTotal) properties covered)
  - $(if ($jsdocCoverage.classesCovered / [Math]::Max(1, $jsdocCoverage.classesTotal) -ge 0.9) { "✅" } else { "[ ]" }) Include examples where appropriate ($($jsdocCoverage.classesCovered)/$($jsdocCoverage.classesTotal) classes covered)
"@

    # Architectural diagrams status
    $diagramsStatus = if ($architecturalDiagrams.systemInteraction -and $architecturalDiagrams.coreWorkflows -and $architecturalDiagrams.componentDependencies) {
        "[✅]"
    } else {
        "[ ]"
    }
    
    $updatedDocStatusSection += @"

- $diagramsStatus Update architectural diagrams
  - $(if ($architecturalDiagrams.systemInteraction) { "✅" } else { "[ ]" }) Create system interaction diagrams
  - $(if ($architecturalDiagrams.coreWorkflows) { "✅" } else { "[ ]" }) Document core workflows
  - $(if ($architecturalDiagrams.componentDependencies -or $dependencyGraphExists) { "✅" } else { "[ ]" }) Update component dependency graphs
"@

    # Onboarding guide status
    $onboardingStatus = if ($onboardingGuideExists) {
        "[✅]"
    } else {
        "[ ]"
    }
    
    $updatedDocStatusSection += @"

- $onboardingStatus Create developer onboarding guide
  - $(if ($onboardingGuideExists) { "✅" } else { "[ ]" }) Document development environment setup
  - $(if ($onboardingGuideExists) { "✅" } else { "[ ]" }) Outline key architecture concepts
  - $(if ($onboardingGuideExists) { "✅" } else { "[ ]" }) Provide code contribution guidelines
"@

    # Update STATUS.md if requested
    if ($updateFile) {
        $newStatusContent = $statusContent.Replace($docStatusSection, $updatedDocStatusSection)
        $newStatusContent | Out-File -FilePath $statusFile -Encoding utf8
        Write-Host "Documentation Status section updated in $statusFile" -ForegroundColor Green
    } else {
        Write-Host "`nUpdated Documentation Status section (preview):" -ForegroundColor Cyan
        Write-Host $updatedDocStatusSection -ForegroundColor White
    }
} else {
    Write-Host "Error: Documentation Status section not found in $statusFile" -ForegroundColor Red
}

# Output summary of documentation status
Write-Host "`nDocumentation Status Summary:" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green

if ($runAnalysis) {
    Write-Host "JSDoc Coverage:" -ForegroundColor Cyan
    Write-Host "  - Methods: $($jsdocCoverage.methodsCovered)/$($jsdocCoverage.methodsTotal) ($(if ($jsdocCoverage.methodsTotal -gt 0) { [math]::Round(($jsdocCoverage.methodsCovered / $jsdocCoverage.methodsTotal) * 100) } else { 0 })%)" -ForegroundColor $(if ($jsdocCoverage.methodsCovered / [Math]::Max(1, $jsdocCoverage.methodsTotal) -ge 0.9) { "Green" } else { "Yellow" })
    Write-Host "  - Properties: $($jsdocCoverage.propertiesCovered)/$($jsdocCoverage.propertiesTotal) ($(if ($jsdocCoverage.propertiesTotal -gt 0) { [math]::Round(($jsdocCoverage.propertiesCovered / $jsdocCoverage.propertiesTotal) * 100) } else { 0 })%)" -ForegroundColor $(if ($jsdocCoverage.propertiesCovered / [Math]::Max(1, $jsdocCoverage.propertiesTotal) -ge 0.9) { "Green" } else { "Yellow" })
    Write-Host "  - Classes: $($jsdocCoverage.classesCovered)/$($jsdocCoverage.classesTotal) ($(if ($jsdocCoverage.classesTotal -gt 0) { [math]::Round(($jsdocCoverage.classesCovered / $jsdocCoverage.classesTotal) * 100) } else { 0 })%)" -ForegroundColor $(if ($jsdocCoverage.classesCovered / [Math]::Max(1, $jsdocCoverage.classesTotal) -ge 0.9) { "Green" } else { "Yellow" })
    Write-Host "  - Interfaces: $($jsdocCoverage.interfacesCovered)/$($jsdocCoverage.interfacesTotal) ($(if ($jsdocCoverage.interfacesTotal -gt 0) { [math]::Round(($jsdocCoverage.interfacesCovered / $jsdocCoverage.interfacesTotal) * 100) } else { 0 })%)" -ForegroundColor $(if ($jsdocCoverage.interfacesCovered / [Math]::Max(1, $jsdocCoverage.interfacesTotal) -ge 0.9) { "Green" } else { "Yellow" })
}

Write-Host "`nDiagrams Status:" -ForegroundColor Cyan
Write-Host "  - System Interaction Diagrams: $(if ($architecturalDiagrams.systemInteraction) { "✅" } else { "❌" })" -ForegroundColor $(if ($architecturalDiagrams.systemInteraction) { "Green" } else { "Yellow" })
Write-Host "  - Core Workflows Diagrams: $(if ($architecturalDiagrams.coreWorkflows) { "✅" } else { "❌" })" -ForegroundColor $(if ($architecturalDiagrams.coreWorkflows) { "Green" } else { "Yellow" })
Write-Host "  - Component Dependency Graphs: $(if ($architecturalDiagrams.componentDependencies -or $dependencyGraphExists) { "✅" } else { "❌" })" -ForegroundColor $(if ($architecturalDiagrams.componentDependencies -or $dependencyGraphExists) { "Green" } else { "Yellow" })

Write-Host "`nOnboarding Guide:" -ForegroundColor Cyan
Write-Host "  - Developer Onboarding Guide: $(if ($onboardingGuideExists) { "✅" } else { "❌" })" -ForegroundColor $(if ($onboardingGuideExists) { "Green" } else { "Yellow" })

Write-Host "`nNext Steps:" -ForegroundColor Green
if (-not $runAnalysis -or ($jsdocCoverage.methodsCovered / [Math]::Max(1, $jsdocCoverage.methodsTotal)) -lt 0.9) {
    Write-Host "  1. Run scripts/analyze-jsdoc-coverage.ps1 -verbose to find public APIs missing JSDoc comments" -ForegroundColor Yellow
}
if (-not ($architecturalDiagrams.systemInteraction -and $architecturalDiagrams.coreWorkflows -and $architecturalDiagrams.componentDependencies)) {
    Write-Host "  2. Run scripts/generate-dependency-graph.ps1 -generatePng to create component dependency diagrams" -ForegroundColor Yellow
}
if (-not $onboardingGuideExists) {
    Write-Host "  3. Run scripts/generate-onboarding-guide.ps1 to create the developer onboarding guide" -ForegroundColor Yellow
} 