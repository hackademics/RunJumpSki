#!/usr/bin/env pwsh
# Architecture Diagrams Generator
# This script generates basic architectural diagrams for the project using DOT format

# Parameters
param (
    [string]$outputDir = "./docs/diagrams",   # Output directory for diagrams
    [string]$srcDir = "./src",                # Source directory to analyze
    [switch]$generatePng = $true,             # Generate PNG files (requires Graphviz)
    [switch]$force = $false                   # Force regeneration of existing diagrams
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

# Ensure output directory exists
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    Write-Host "Created output directory: $outputDir" -ForegroundColor Green
}

# Function to generate a DOT graph file
function Generate-DotGraph {
    param (
        [string]$outputFile,
        [string]$title,
        [string]$content
    )
    
    $filePath = Join-Path -Path $outputDir -ChildPath $outputFile
    
    # Skip if file exists and force is not set
    if ((Test-Path $filePath) -and -not $force) {
        Write-Host "Skipping $outputFile - file already exists. Use -force to overwrite." -ForegroundColor Yellow
        return $filePath
    }
    
    # Create the DOT content
    $dot = "digraph ""$title"" {`n"
    $dot += "  rankdir=LR;`n"
    $dot += "  node [shape=box, style=filled, fillcolor=lightblue, fontname=Arial];`n"
    $dot += "  edge [fontname=Arial, fontsize=10];`n"
    $dot += "  label=""$title"";`n"
    $dot += "  labelloc=t;`n"
    $dot += "`n"
    $dot += $content
    $dot += "}`n"
    
    # Write the DOT file
    $dot | Out-File -FilePath $filePath -Encoding utf8
    Write-Host "Generated $outputFile" -ForegroundColor Green
    
    return $filePath
}

# Function to generate PNG from DOT file
function Generate-PngFromDot {
    param (
        [string]$dotFile
    )
    
    if (-not $generatePng) {
        return
    }
    
    $pngFile = [System.IO.Path]::ChangeExtension($dotFile, ".png")
    
    try {
        $process = Start-Process -FilePath "dot" -ArgumentList "-Tpng ""$dotFile"" -o ""$pngFile""" -Wait -NoNewWindow -PassThru
        if ($process.ExitCode -eq 0) {
            Write-Host "Generated $(Split-Path $pngFile -Leaf)" -ForegroundColor Green
        } else {
            Write-Host "Error generating PNG. Exit code: $($process.ExitCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "Error generating PNG: $_" -ForegroundColor Red
    }
}

# Get core systems from source
function Get-CoreSystems {
    param (
        [string]$srcDir
    )
    
    $systems = @()
    
    # Look for system classes
    $files = Get-ChildItem -Path (Join-Path -Path $srcDir -ChildPath "core") -Recurse -Include "*.ts" -Exclude "*.d.ts", "*.test.ts"
    foreach ($file in $files) {
        $content = Get-Content -Path $file.FullName -Raw
        $matches = [regex]::Matches($content, "(?:export\s+)?(?:abstract\s+)?class\s+(\w+System)\b")
        foreach ($match in $matches) {
            $systems += $match.Groups[1].Value
        }
    }
    
    return $systems | Sort-Object -Unique
}

# Generate system interaction diagram
function Generate-SystemInteractionDiagram {
    param (
        [string]$outputFile = "system-interactions.dot",
        [string[]]$systems
    )
    
    Write-Host "Generating system interaction diagram..." -ForegroundColor Cyan
    
    $content = ""
    
    # Add nodes for systems
    foreach ($system in $systems) {
        $systemType = ""
        if ($system -match "Physics|Collision") {
            $color = "lightgreen"
            $systemType = "Physics"
        } elseif ($system -match "Render|Camera|Scene") {
            $color = "lightblue"
            $systemType = "Renderer"
        } elseif ($system -match "Input") {
            $color = "lightyellow"
            $systemType = "Input"
        } elseif ($system -match "Audio|Sound") {
            $color = "lightpink"
            $systemType = "Audio"
        } elseif ($system -match "Debug") {
            $color = "lightgrey"
            $systemType = "Debug"
        } elseif ($system -match "Asset") {
            $color = "lightsalmon"
            $systemType = "Asset"
        } elseif ($system -match "Event") {
            $color = "lightcyan"
            $systemType = "Event"
        } else {
            $color = "white"
            $systemType = "Core"
        }
        
        $content += "  ""$system"" [fillcolor=$color];`n"
        
        if ($systemType -ne "") {
            $content += "  ""$systemType"" [shape=ellipse, fillcolor=gold, style=filled];`n"
            $content += "  ""$system"" -> ""$systemType"" [style=dotted, color=grey];`n"
        }
    }
    
    # Add standard interaction edges based on naming patterns
    foreach ($system in $systems) {
        if ($system -match "Physics") {
            # Physics system interacts with renderer and collision
            $content += "  ""$system"" -> ""EventSystem"" [label=""publishes events""];`n"
            $renderSystems = $systems | Where-Object { $_ -match "Render|Scene" }
            foreach ($renderSystem in $renderSystems) {
                $content += "  ""$system"" -> ""$renderSystem"" [label=""updates transforms""];`n"
            }
            $collisionSystems = $systems | Where-Object { $_ -match "Collision" }
            foreach ($collisionSystem in $collisionSystems) {
                $content += "  ""$system"" -> ""$collisionSystem"" [label=""provides physics data""];`n"
            }
        }
        
        if ($system -match "Input") {
            # Input system interacts with event system
            $content += "  ""$system"" -> ""EventSystem"" [label=""publishes events""];`n"
        }
        
        if ($system -match "Event") {
            # Event system interacts with many systems
            $otherSystems = $systems | Where-Object { $_ -ne $system -and $_ -notmatch "Debug" }
            foreach ($otherSystem in $otherSystems) {
                $content += "  ""$otherSystem"" -> ""$system"" [label=""subscribes to events"", style=dashed, color=grey];`n"
            }
        }
        
        if ($system -match "Debug") {
            # Debug system monitors other systems
            $otherSystems = $systems | Where-Object { $_ -ne $system -and $_ -notmatch "Debug" }
            foreach ($otherSystem in $otherSystems) {
                $content += "  ""$system"" -> ""$otherSystem"" [label=""monitors"", style=dotted, color=red];`n"
            }
        }
    }
    
    # Add the central Engine node that manages all systems
    $content += "  ""Engine"" [shape=doubleoctagon, fillcolor=gold, style=filled];`n"
    foreach ($system in $systems) {
        $content += "  ""Engine"" -> ""$system"" [label=""manages""];`n"
    }
    
    # Generate the DOT file
    $dotFile = Generate-DotGraph -outputFile $outputFile -title "System Interactions" -content $content
    
    # Generate PNG if requested
    Generate-PngFromDot -dotFile $dotFile
}

# Generate core workflow diagram
function Generate-CoreWorkflowDiagram {
    param (
        [string]$outputFile = "core-workflows.dot"
    )
    
    Write-Host "Generating core workflows diagram..." -ForegroundColor Cyan
    
    $content = ""
    
    # Define the main workflow steps
    $content += "  subgraph cluster_initialization {`n"
    $content += "    label=""Initialization Workflow"";`n"
    $content += "    style=filled;`n"
    $content += "    color=lightgrey;`n"
    $content += "    node [style=filled, fillcolor=white];`n"
    $content += "    ""Engine Initialization"" -> ""System Registration"" -> ""Service Registration"" -> ""Asset Loading"" -> ""Scene Setup"";`n"
    $content += "  }`n`n"
    
    $content += "  subgraph cluster_game_loop {`n"
    $content += "    label=""Game Loop Workflow"";`n"
    $content += "    style=filled;`n"
    $content += "    color=lightblue;`n"
    $content += "    node [style=filled, fillcolor=white];`n"
    $content += "    ""Input Processing"" -> ""Physics Update"" -> ""Game Logic Update"" -> ""Collision Detection"" -> ""Rendering"" -> ""Audio Update"";`n"
    $content += "    ""Audio Update"" -> ""Input Processing"" [constraint=false, style=dashed, label=""Next Frame""];`n"
    $content += "  }`n`n"
    
    $content += "  subgraph cluster_entity_lifecycle {`n"
    $content += "    label=""Entity Lifecycle Workflow"";`n"
    $content += "    style=filled;`n"
    $content += "    color=lightgreen;`n"
    $content += "    node [style=filled, fillcolor=white];`n"
    $content += "    ""Entity Creation"" -> ""Component Attachment"" -> ""Entity Initialization"" -> ""Entity Updates"" -> ""Entity Disposal"";`n"
    $content += "  }`n`n"
    
    $content += "  subgraph cluster_event_handling {`n"
    $content += "    label=""Event Handling Workflow"";`n"
    $content += "    style=filled;`n"
    $content += "    color=lightyellow;`n"
    $content += "    node [style=filled, fillcolor=white];`n"
    $content += "    ""Event Subscription"" -> ""Event Publishing"" -> ""Event Processing"" -> ""Callback Execution"";`n"
    $content += "  }`n`n"
    
    # Add connections between workflows
    $content += "  ""Scene Setup"" -> ""Input Processing"" [style=dashed, label=""Start Game Loop""];`n"
    $content += "  ""Entity Creation"" -> ""Game Logic Update"" [style=dashed, label=""Entities participate in game loop""];`n"
    $content += "  ""Event Publishing"" -> ""Game Logic Update"" [style=dashed, label=""Events trigger logic""];`n"
    
    # Generate the DOT file
    $dotFile = Generate-DotGraph -outputFile $outputFile -title "Core Workflows" -content $content
    
    # Generate PNG if requested
    Generate-PngFromDot -dotFile $dotFile
}

# Generate component dependency graph using existing script if available
function Generate-ComponentDependencyGraph {
    $dependencyScript = "./scripts/generate-dependency-graph.ps1"
    
    if (Test-Path $dependencyScript) {
        Write-Host "Running component dependency graph generator..." -ForegroundColor Cyan
        
        $outputDotFile = Join-Path -Path $outputDir -ChildPath "component-dependencies.dot"
        $outputPngFile = Join-Path -Path $outputDir -ChildPath "component-dependencies.png"
        
        & $dependencyScript -directory $srcDir -outputFile $outputDotFile -outputPngFile $outputPngFile -generatePng:$generatePng
    } else {
        Write-Host "Component dependency graph script not found at $dependencyScript" -ForegroundColor Yellow
        Write-Host "Creating simplified component diagram instead..." -ForegroundColor Yellow
        
        # Create a simplified component diagram
        $content = ""
        
        # Define the main component types
        $content += "  subgraph cluster_components {`n"
        $content += "    label=""Components"";`n"
        $content += "    style=filled;`n"
        $content += "    color=lightgreen;`n"
        $content += "    node [style=filled, fillcolor=white];`n"
        $content += "    ""TransformComponent"" -> ""MeshComponent"" [style=dashed, label=""requires""];`n"
        $content += "    ""TransformComponent"" -> ""PhysicsComponent"" [style=dashed, label=""required by""];`n"
        $content += "    ""TransformComponent"" -> ""CameraComponent"" [style=dashed, label=""required by""];`n"
        $content += "    ""TransformComponent"" -> ""AudioComponent"" [style=dashed, label=""required by""];`n"
        $content += "    ""MeshComponent"" -> ""PhysicsComponent"" [style=dashed, label=""related""];`n"
        $content += "  }`n`n"
        
        $content += "  subgraph cluster_systems {`n"
        $content += "    label=""Systems"";`n"
        $content += "    style=filled;`n"
        $content += "    color=lightblue;`n"
        $content += "    node [style=filled, fillcolor=white];`n"
        $content += "    ""RenderSystem"" -> ""PhysicsSystem"" [style=dashed, label=""coordinates with""];`n"
        $content += "    ""PhysicsSystem"" -> ""CollisionSystem"" [style=dashed, label=""coordinates with""];`n"
        $content += "    ""InputSystem"" -> ""EventSystem"" [style=dashed, label=""publishes to""];`n"
        $content += "  }`n`n"
        
        $content += "  subgraph cluster_managers {`n"
        $content += "    label=""Managers"";`n"
        $content += "    style=filled;`n"
        $content += "    color=lightyellow;`n"
        $content += "    node [style=filled, fillcolor=white];`n"
        $content += "    ""EntityManager"" -> ""SceneManager"" [style=dashed, label=""coordinates with""];`n"
        $content += "    ""AssetManager"" -> ""SceneManager"" [style=dashed, label=""provides assets to""];`n"
        $content += "    ""EntityManager"" -> ""EventManager"" [style=dashed, label=""coordinates with""];`n"
        $content += "  }`n`n"
        
        # Add connections between groups
        $content += "  ""RenderSystem"" -> ""MeshComponent"" [label=""processes""];`n"
        $content += "  ""PhysicsSystem"" -> ""PhysicsComponent"" [label=""processes""];`n"
        $content += "  ""EntityManager"" -> ""TransformComponent"" [label=""manages""];`n"
        
        # Generate the DOT file
        $dotFile = Generate-DotGraph -outputFile "component-dependencies.dot" -title "Component Dependencies" -content $content
        
        # Generate PNG if requested
        Generate-PngFromDot -dotFile $dotFile
    }
}

# Main execution
$systems = Get-CoreSystems -srcDir $srcDir

# Generate all diagrams
Generate-SystemInteractionDiagram -systems $systems
Generate-CoreWorkflowDiagram
Generate-ComponentDependencyGraph

Write-Host "`nDiagram generation complete. Files are available in $outputDir" -ForegroundColor Green
if ($generatePng) {
    Write-Host "PNG files have been generated from DOT files" -ForegroundColor Green
} else {
    Write-Host "DOT files generated. Install Graphviz and rerun with -generatePng to create PNG files" -ForegroundColor Yellow
} 