#!/usr/bin/env pwsh
# Component Dependency Graph Generator
# This script analyses TypeScript files to extract component dependencies
# and generates a graph visualization using DOT format (for Graphviz)

# Parameters
param (
    [string]$directory = "./src", # Default to src directory
    [string]$outputFile = "./component-dependencies.dot", # Output file for DOT graph
    [string]$outputPngFile = "./component-dependencies.png", # Output PNG file
    [switch]$includeCore = $true, # Include core dependencies
    [switch]$generatePng = $false # Generate PNG file using Graphviz (requires graphviz to be installed)
)

# Check if Graphviz is installed if generatePng is specified
if ($generatePng) {
    $graphvizInstalled = $null
    try {
        $graphvizInstalled = Get-Command "dot" -ErrorAction SilentlyContinue
    } catch {
        $graphvizInstalled = $null
    }
    
    if (-not $graphvizInstalled) {
        Write-Host "WARNING: Graphviz is not installed or not found in PATH. PNG generation will be skipped." -ForegroundColor Yellow
        Write-Host "Install Graphviz from https://graphviz.org/download/ and make sure 'dot' command is in your PATH." -ForegroundColor Yellow
        $generatePng = $false
    }
}

# Dependencies storage
$dependencies = @{}
$components = @{}
$interfaces = @{}

Write-Host "Analyzing component dependencies in $directory..." -ForegroundColor Cyan

# Get all TypeScript files
$files = Get-ChildItem -Path $directory -Recurse -Include "*.ts" -Exclude "*.d.ts", "*.test.ts"

# First pass: identify all components and interfaces
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $fileName = $file.FullName.Replace((Get-Location).Path + "\", "")
    
    # Find component classes
    $classMatches = [regex]::Matches($content, "(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?")
    foreach ($match in $classMatches) {
        $className = $match.Groups[1].Value
        $extendsClass = if ($match.Groups[2].Success) { $match.Groups[2].Value } else { $null }
        $implementsInterfaces = if ($match.Groups[3].Success) { 
            $match.Groups[3].Value -split "," | ForEach-Object { $_.Trim() } 
        } else { @() }
        
        # Check if it's likely a component
        $isComponent = $className.EndsWith("Component") -or 
                       $className.EndsWith("System") -or 
                       $className.EndsWith("Manager") -or
                       $extendsClass -eq "Component" -or 
                       $implementsInterfaces -contains "IComponent" -or
                       $content -match "ServiceLocator"
        
        if ($isComponent) {
            $components[$className] = @{
                File = $fileName
                ExtendsClass = $extendsClass
                ImplementsInterfaces = $implementsInterfaces
                Dependencies = @()
            }
        }
    }
    
    # Find interfaces
    $interfaceMatches = [regex]::Matches($content, "(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([\w,\s]+))?")
    foreach ($match in $interfaceMatches) {
        $interfaceName = $match.Groups[1].Value
        $extendsInterfaces = if ($match.Groups[2].Success) { 
            $match.Groups[2].Value -split "," | ForEach-Object { $_.Trim() } 
        } else { @() }
        
        $interfaces[$interfaceName] = @{
            File = $fileName
            ExtendsInterfaces = $extendsInterfaces
        }
    }
}

# Second pass: identify dependencies between components
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $fileName = $file.FullName.Replace((Get-Location).Path + "\", "")
    
    # Extract component name for this file
    $compName = $null
    foreach ($comp in $components.Keys) {
        if ($components[$comp].File -eq $fileName) {
            $compName = $comp
            break
        }
    }
    
    if ($compName) {
        # Find import statements
        $importPattern = 'import\s+(?:{([^}]+)})?\s*(?:from\s+[''"]([^''"]+)[''"])'
        $importMatches = [regex]::Matches($content, $importPattern)
        
        foreach ($match in $importMatches) {
            $imports = if ($match.Groups[1].Success) { 
                $match.Groups[1].Value -split "," | ForEach-Object { $_.Trim() } 
            } else { @() }
            
            $importPath = if ($match.Groups[2].Success) { $match.Groups[2].Value } else { "" }
            
            foreach ($importItem in $imports) {
                # Extract actual name (handling 'as' aliases)
                $actualImport = $importItem -split "\s+as\s+" | Select-Object -First 1
                
                # Check if the import is a known component or interface
                if ($components.ContainsKey($actualImport) -or $interfaces.ContainsKey($actualImport)) {
                    $components[$compName].Dependencies += $actualImport
                }
            }
        }
        
        # Find ServiceLocator.get calls
        $serviceLocatorPattern = 'ServiceLocator\.get\([''"](\w+)[''"](?:,\s*[''"](\w+)[''"])?\)'
        $serviceLocatorMatches = [regex]::Matches($content, $serviceLocatorPattern)
        
        foreach ($match in $serviceLocatorMatches) {
            $serviceType = $match.Groups[1].Value
            $serviceImpl = if ($match.Groups[2].Success) { $match.Groups[2].Value } else { $null }
            
            if ($components.ContainsKey($serviceType) -or $interfaces.ContainsKey($serviceType)) {
                $components[$compName].Dependencies += $serviceType
            }
            
            if ($serviceImpl -and ($components.ContainsKey($serviceImpl) -or $interfaces.ContainsKey($serviceImpl))) {
                $components[$compName].Dependencies += $serviceImpl
            }
        }
        
        # Find getComponent calls
        $getComponentPattern = 'getComponent\s*<(\w+)>'
        $getComponentMatches = [regex]::Matches($content, $getComponentPattern)
        
        foreach ($match in $getComponentMatches) {
            $componentType = $match.Groups[1].Value
            
            if ($components.ContainsKey($componentType) -or $interfaces.ContainsKey($componentType)) {
                $components[$compName].Dependencies += $componentType
            }
        }
        
        # Make dependencies unique
        $components[$compName].Dependencies = $components[$compName].Dependencies | Sort-Object -Unique
        
        # Filter core dependencies if not including them
        if (-not $includeCore) {
            $components[$compName].Dependencies = $components[$compName].Dependencies | Where-Object {
                -not ($_.StartsWith("I") -and $components.ContainsKey($_.Substring(1))) -and
                -not $_.StartsWith("Abstract") -and
                -not $_.StartsWith("Base")
            }
        }
    }
}

# Generate DOT graph
$dot = "digraph ComponentDependencies {`n"
$dot += "  rankdir=LR;`n"
$dot += "  node [shape=box, style=filled, fillcolor=lightblue, fontname=Arial];`n"
$dot += "  edge [fontname=Arial, fontsize=10];`n"
$dot += "`n"

# Add nodes
foreach ($comp in $components.Keys | Sort-Object) {
    $color = "lightblue"
    if ($comp.EndsWith("Component")) {
        $color = "lightgreen"
    } elseif ($comp.EndsWith("System")) {
        $color = "lightpink"
    } elseif ($comp.EndsWith("Manager")) {
        $color = "lightyellow"
    }
    
    $isInterface = $comp.StartsWith("I") -and $comp.Length -gt 1 -and [char]::IsUpper($comp[1])
    if ($isInterface) {
        $color = "lightgrey"
    }
    
    $dot += "  ""$comp"" [fillcolor=$color];`n"
}

# Add edges
foreach ($comp in $components.Keys | Sort-Object) {
    foreach ($dep in $components[$comp].Dependencies) {
        $dot += "  ""$comp"" -> ""$dep"";`n"
    }
    
    # Add inheritance edges
    if ($components[$comp].ExtendsClass -and $components.ContainsKey($components[$comp].ExtendsClass)) {
        $dot += "  ""$comp"" -> ""$($components[$comp].ExtendsClass)"" [style=dashed, color=blue];`n"
    }
    
    foreach ($impl in $components[$comp].ImplementsInterfaces) {
        if ($interfaces.ContainsKey($impl)) {
            $dot += "  ""$comp"" -> ""$impl"" [style=dotted, color=green];`n"
        }
    }
}

$dot += "}`n"

# Write DOT file
$dot | Out-File -FilePath $outputFile -Encoding utf8
Write-Host "DOT graph written to $outputFile" -ForegroundColor Green

# Generate PNG if requested and Graphviz is installed
if ($generatePng) {
    try {
        $process = Start-Process -FilePath "dot" -ArgumentList "-Tpng ""$outputFile"" -o ""$outputPngFile""" -Wait -NoNewWindow -PassThru
        if ($process.ExitCode -eq 0) {
            Write-Host "PNG graph generated at $outputPngFile" -ForegroundColor Green
        } else {
            Write-Host "Error generating PNG graph. Exit code: $($process.ExitCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "Error generating PNG graph: $_" -ForegroundColor Red
    }
}

# Generate simple stats for console output
$totalComponents = $components.Count
$totalInterfaces = $interfaces.Count
$totalDependencies = ($components.Values | ForEach-Object { $_.Dependencies.Count } | Measure-Object -Sum).Sum

Write-Host "`nComponent Dependency Analysis:" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host "Total Components/Systems: $totalComponents" -ForegroundColor Cyan
Write-Host "Total Interfaces: $totalInterfaces" -ForegroundColor Cyan
Write-Host "Total Dependencies: $totalDependencies" -ForegroundColor Cyan

# Find most dependent-upon components
$mostDepended = @{}
foreach ($comp in $components.Keys) {
    foreach ($dep in $components[$comp].Dependencies) {
        if (-not $mostDepended.ContainsKey($dep)) {
            $mostDepended[$dep] = 0
        }
        $mostDepended[$dep]++
    }
}

Write-Host "`nMost Depended-Upon Components:" -ForegroundColor Yellow
$mostDepended.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value) dependencies" -ForegroundColor Cyan
}

# Find components with most dependencies
Write-Host "`nComponents with Most Dependencies:" -ForegroundColor Yellow
$components.GetEnumerator() | Sort-Object -Property { $_.Value.Dependencies.Count } -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value.Dependencies.Count) dependencies" -ForegroundColor Cyan
} 