#!/usr/bin/env pwsh
# JSDoc Coverage Analysis Script
# This script analyses TypeScript files for JSDoc comment coverage
# Particularly focusing on public classes, interfaces, methods, and properties

# Parameters
param (
    [string]$directory = "./src", # Default to src directory
    [switch]$verbose = $false,    # Verbose output
    [switch]$exportCsv = $false,  # Export results to CSV
    [string]$outputFile = "./jsdoc-coverage.csv" # Output file path for CSV
)

# Results storage
$results = @()
$stats = @{
    totalFiles = 0
    filesWithoutDocs = 0
    totalClasses = 0
    classesWithoutDocs = 0
    totalInterfaces = 0
    interfacesWithoutDocs = 0
    totalMethods = 0
    methodsWithoutDocs = 0
    totalProperties = 0
    propertiesWithoutDocs = 0
}

Write-Host "Analyzing JSDoc coverage in $directory..." -ForegroundColor Cyan

# Get all TypeScript files
$files = Get-ChildItem -Path $directory -Recurse -Include "*.ts" -Exclude "*.d.ts", "*.test.ts"
$stats.totalFiles = $files.Count

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $fileName = $file.FullName.Replace((Get-Location).Path + "\", "")
    
    # File level analysis
    $fileHasJsDoc = $content -match "/\*\*[\s\S]*?\*/"
    if (-not $fileHasJsDoc) {
        $stats.filesWithoutDocs++
    }
    
    # Class analysis
    $classMatches = [regex]::Matches($content, "(?<!\/\/\s*)(?:export\s+)?(?:abstract\s+)?class\s+(\w+)")
    $stats.totalClasses += $classMatches.Count
    
    foreach ($match in $classMatches) {
        $className = $match.Groups[1].Value
        $position = $match.Index
        $precedingText = $content.Substring(0, $position)
        $lastComment = [regex]::Match($precedingText, "/\*\*[\s\S]*?\*/\s*$")
        
        if (-not $lastComment.Success) {
            $stats.classesWithoutDocs++
            $results += [PSCustomObject]@{
                File = $fileName
                ElementType = "Class"
                Name = $className
                HasJSDoc = $false
                LineNumber = ($content.Substring(0, $position).Split("`n")).Count
            }
        }
    }
    
    # Interface analysis
    $interfaceMatches = [regex]::Matches($content, "(?<!\/\/\s*)(?:export\s+)?interface\s+(\w+)")
    $stats.totalInterfaces += $interfaceMatches.Count
    
    foreach ($match in $interfaceMatches) {
        $interfaceName = $match.Groups[1].Value
        $position = $match.Index
        $precedingText = $content.Substring(0, $position)
        $lastComment = [regex]::Match($precedingText, "/\*\*[\s\S]*?\*/\s*$")
        
        if (-not $lastComment.Success) {
            $stats.interfacesWithoutDocs++
            $results += [PSCustomObject]@{
                File = $fileName
                ElementType = "Interface"
                Name = $interfaceName
                HasJSDoc = $false
                LineNumber = ($content.Substring(0, $position).Split("`n")).Count
            }
        }
    }
    
    # Method analysis
    $methodMatches = [regex]::Matches($content, "(?<!\/\/\s*)(?:public|protected)\s+(?:static\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?")
    $stats.totalMethods += $methodMatches.Count
    
    foreach ($match in $methodMatches) {
        $methodName = $match.Groups[1].Value
        $position = $match.Index
        $precedingText = $content.Substring(0, $position)
        $lastComment = [regex]::Match($precedingText, "/\*\*[\s\S]*?\*/\s*$")
        
        if (-not $lastComment.Success) {
            $stats.methodsWithoutDocs++
            $results += [PSCustomObject]@{
                File = $fileName
                ElementType = "Method"
                Name = $methodName
                HasJSDoc = $false
                LineNumber = ($content.Substring(0, $position).Split("`n")).Count
            }
        }
    }
    
    # Public property analysis
    $propertyMatches = [regex]::Matches($content, "(?<!\/\/\s*)(?:public|protected)\s+(?:readonly\s+)?(\w+)\s*:")
    $stats.totalProperties += $propertyMatches.Count
    
    foreach ($match in $propertyMatches) {
        $propertyName = $match.Groups[1].Value
        $position = $match.Index
        $precedingText = $content.Substring(0, $position)
        $lastComment = [regex]::Match($precedingText, "/\*\*[\s\S]*?\*/\s*$")
        
        if (-not $lastComment.Success) {
            $stats.propertiesWithoutDocs++
            $results += [PSCustomObject]@{
                File = $fileName
                ElementType = "Property"
                Name = $propertyName
                HasJSDoc = $false
                LineNumber = ($content.Substring(0, $position).Split("`n")).Count
            }
        }
    }
}

# Write summary
Write-Host "`nJSDoc Coverage Summary:" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host "Files: $($stats.totalFiles - $stats.filesWithoutDocs)/$($stats.totalFiles) ($(100 - [math]::Round(($stats.filesWithoutDocs / $stats.totalFiles) * 100))% covered)" -ForegroundColor $(if ($stats.filesWithoutDocs -eq 0) { "Green" } else { "Yellow" })
Write-Host "Classes: $($stats.totalClasses - $stats.classesWithoutDocs)/$($stats.totalClasses) ($(100 - [math]::Round(($stats.classesWithoutDocs / [math]::Max(1, $stats.totalClasses)) * 100))% covered)" -ForegroundColor $(if ($stats.classesWithoutDocs -eq 0) { "Green" } else { "Yellow" })
Write-Host "Interfaces: $($stats.totalInterfaces - $stats.interfacesWithoutDocs)/$($stats.totalInterfaces) ($(100 - [math]::Round(($stats.interfacesWithoutDocs / [math]::Max(1, $stats.totalInterfaces)) * 100))% covered)" -ForegroundColor $(if ($stats.interfacesWithoutDocs -eq 0) { "Green" } else { "Yellow" })
Write-Host "Methods: $($stats.totalMethods - $stats.methodsWithoutDocs)/$($stats.totalMethods) ($(100 - [math]::Round(($stats.methodsWithoutDocs / [math]::Max(1, $stats.totalMethods)) * 100))% covered)" -ForegroundColor $(if ($stats.methodsWithoutDocs -eq 0) { "Green" } else { "Yellow" })
Write-Host "Properties: $($stats.totalProperties - $stats.propertiesWithoutDocs)/$($stats.totalProperties) ($(100 - [math]::Round(($stats.propertiesWithoutDocs / [math]::Max(1, $stats.totalProperties)) * 100))% covered)" -ForegroundColor $(if ($stats.propertiesWithoutDocs -eq 0) { "Green" } else { "Yellow" })

if ($verbose) {
    Write-Host "`nElements missing JSDoc:" -ForegroundColor Yellow
    $results | Format-Table -AutoSize
}

if ($exportCsv) {
    $results | Export-Csv -Path $outputFile -NoTypeInformation
    Write-Host "`nDetailed results exported to $outputFile" -ForegroundColor Cyan
}

# Return a quick summary string for use in scripts
"JSDoc Coverage: Files $(100 - [math]::Round(($stats.filesWithoutDocs / $stats.totalFiles) * 100))%, Classes $(100 - [math]::Round(($stats.classesWithoutDocs / [math]::Max(1, $stats.totalClasses)) * 100))%, Interfaces $(100 - [math]::Round(($stats.interfacesWithoutDocs / [math]::Max(1, $stats.totalInterfaces)) * 100))%, Methods $(100 - [math]::Round(($stats.methodsWithoutDocs / [math]::Max(1, $stats.totalMethods)) * 100))%, Properties $(100 - [math]::Round(($stats.propertiesWithoutDocs / [math]::Max(1, $stats.totalProperties)) * 100))%" 