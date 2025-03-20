#!/usr/bin/env pwsh
# ESLint Analysis Script
# This script runs ESLint on the entire project, saves results to a file,
# and provides a way to track the progress of fixes.

# Parameters
param (
    [string[]]$directories = @("./src", "./tests"), # Default directories to check
    [string]$resultsFile = "./eslint-results.txt", # Output file for ESLint results
    [string]$progressFile = "./eslint-progress.md", # File to track progress
    [switch]$fixAutomatically = $false # Whether to run ESLint with --fix
)

# Ensure node_modules exist
if (-not (Test-Path -Path "./node_modules")) {
    Write-Host "Node modules not found. Running npm install..." -ForegroundColor Yellow
    npm install
}

# Create or clear the results file
"# ESLint Results - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $resultsFile
"" | Out-File -FilePath $resultsFile -Append

# Count total files to analyze
$totalFiles = 0
$fileExtensions = @(".ts", ".tsx", ".js", ".jsx")
foreach ($dir in $directories) {
    foreach ($ext in $fileExtensions) {
        $files = Get-ChildItem -Path $dir -Recurse -Include "*$ext"
        $totalFiles += $files.Count
    }
}

Write-Host "Found $totalFiles files to analyze..." -ForegroundColor Cyan

# Initialize tracking data
$totalErrors = 0
$totalWarnings = 0
$filesWithIssues = @{}

# Run ESLint on each directory
foreach ($dir in $directories) {
    Write-Host "Running ESLint on $dir..." -ForegroundColor Green
    
    $fixFlag = if ($fixAutomatically) { "--fix" } else { "" }
    
    # Run ESLint and capture output
    $eslintOutput = & npx eslint $dir --ext .ts,.tsx,.js,.jsx --config .eslintrc.minimal.js $fixFlag 2>&1
    
    # Process results line by line
    $currentFile = ""
    $errorCount = 0
    $warningCount = 0
    
    foreach ($line in $eslintOutput) {
        # Look for file paths with error/warning counts
        if ($line -match "^(.+): line \d+, col \d+, (error|warning)") {
            $filePath = $matches[1]
            $severity = $matches[2]
            
            # If this is a new file, update counters for previous file
            if ($filePath -ne $currentFile -and $currentFile -ne "") {
                $filesWithIssues[$currentFile] = @{
                    "ErrorCount" = $errorCount
                    "WarningCount" = $warningCount
                    "Total" = $errorCount + $warningCount
                }
                
                $errorCount = 0
                $warningCount = 0
            }
            
            $currentFile = $filePath
            
            # Count errors and warnings
            if ($severity -eq "error") {
                $errorCount++
                $totalErrors++
            } else {
                $warningCount++
                $totalWarnings++
            }
            
            # Add to results file
            $line | Out-File -FilePath $resultsFile -Append
        }
        elseif ($line -match "^\s+\d+:\d+\s+") {
            # This is a continuation of error details
            $line | Out-File -FilePath $resultsFile -Append
        }
    }
    
    # Add the last file if there was one
    if ($currentFile -ne "") {
        $filesWithIssues[$currentFile] = @{
            "ErrorCount" = $errorCount
            "WarningCount" = $warningCount
            "Total" = $errorCount + $warningCount
        }
    }
}

# Create progress tracking file
"# ESLint Fix Progress - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $progressFile
"" | Out-File -FilePath $progressFile -Append
"## Summary" | Out-File -FilePath $progressFile -Append
"- Total files analyzed: $totalFiles" | Out-File -FilePath $progressFile -Append
"- Files with issues: $($filesWithIssues.Count)" | Out-File -FilePath $progressFile -Append
"- Total errors: $totalErrors" | Out-File -FilePath $progressFile -Append
"- Total warnings: $totalWarnings" | Out-File -FilePath $progressFile -Append
"" | Out-File -FilePath $progressFile -Append

# Create list of files with issues
"## Files with Issues" | Out-File -FilePath $progressFile -Append
foreach ($file in $filesWithIssues.Keys | Sort-Object) {
    $stats = $filesWithIssues[$file]
    "- [ ] $file ($($stats.ErrorCount) errors, $($stats.WarningCount) warnings)" | Out-File -FilePath $progressFile -Append
}

Write-Host "ESLint analysis complete!" -ForegroundColor Green
Write-Host "Results saved to: $resultsFile" -ForegroundColor Cyan
Write-Host "Progress tracking file created: $progressFile" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Magenta
Write-Host "- Total files analyzed: $totalFiles" -ForegroundColor White
Write-Host "- Files with issues: $($filesWithIssues.Count)" -ForegroundColor White
Write-Host "- Total errors: $totalErrors" -ForegroundColor Red
Write-Host "- Total warnings: $totalWarnings" -ForegroundColor Yellow 