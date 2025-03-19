#!/usr/bin/env pwsh
# API Consistency Analysis Script
# This script analyzes TypeScript files for API consistency issues:
# 1. Method naming conventions
# 2. Option objects patterns
# 3. Public/private API boundaries

# Parameters
param (
    [string]$directory = "./src", # Default to src directory
    [switch]$verbose = $false,    # Verbose output
    [switch]$exportCsv = $false,  # Export results to CSV
    [string]$outputFile = "./api-consistency-issues.csv" # Output file path for CSV
)

# Result storage
$methodNamingIssues = @()
$optionObjectIssues = @()
$accessModifierIssues = @()

# Patterns to check
$methodPrefixes = @{
    'get' = '^get[A-Z].*$'  # Methods that retrieve data
    'set' = '^set[A-Z].*$'  # Methods that update data
    'is' = '^is[A-Z].*$'    # Boolean methods
    'has' = '^has[A-Z].*$'  # Boolean existence checks
    'create' = '^create[A-Z].*$' # Factory methods
    'initialize' = '^initialize.*$' # Setup methods
    'dispose' = '^dispose.*$' # Cleanup methods
    'update' = '^update.*$' # Frame update methods
}

$forbiddenPrefixes = @{
    'init' = '^init(?!ialize)[A-Z].*$' # 'init' methods (should be 'initialize')
    'setup' = '^setup[A-Z].*$' # 'setup' methods (should be 'initialize')
    'destroy' = '^destroy.*$' # 'destroy' methods (should be 'dispose')
    'clean' = '^clean.*$' # 'clean' methods (should be 'dispose')
}

$optionPatterns = @{
    'DefaultOptions' = 'DEFAULT_([A-Za-z0-9]+)_OPTIONS'
    'OptionsInterface' = 'export\s+interface\s+([A-Za-z0-9]+)Options'
    'OptionsMerge' = '{\s*\.\.\.[A-Za-z0-9_]+,\s*\.\.\.[A-Za-z0-9_]+\s*}'
}

# Find all TypeScript files
$files = Get-ChildItem -Path $directory -Recurse -Include "*.ts" -Exclude "*.d.ts", "*.test.ts"
Write-Host "Analyzing $($files.Count) TypeScript files for API consistency issues..." -ForegroundColor Cyan

foreach ($file in $files) {
    if ($verbose) {
        Write-Host "Analyzing $($file.FullName)..." -ForegroundColor Gray
    }
    
    $content = Get-Content -Path $file.FullName -Raw
    $fileRelativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
    
    # Analyze method naming conventions
    # Extract class, interface, and method declarations
    $classMatches = [regex]::Matches($content, 'class\s+([A-Za-z0-9_]+)')
    $interfaceMatches = [regex]::Matches($content, 'interface\s+([A-Za-z0-9_]+)')
    $methodMatches = [regex]::Matches($content, '(?:public|private|protected)?\s*(?:async\s+)?([a-zA-Z0-9_]+)\s*\([^)]*\)')
    
    # Check method naming
    foreach ($methodMatch in $methodMatches) {
        $methodName = $methodMatch.Groups[1].Value
        
        # Skip constructor
        if ($methodName -eq "constructor") {
            continue
        }
        
        # Check forbidden prefixes
        foreach ($prefix in $forbiddenPrefixes.Keys) {
            if ($methodName -match $forbiddenPrefixes[$prefix]) {
                $recommendedPrefix = switch ($prefix) {
                    'init' { 'initialize' }
                    'setup' { 'initialize' }
                    'destroy' { 'dispose' }
                    'clean' { 'dispose' }
                    default { 'unknown' }
                }
                
                $methodNamingIssues += [PSCustomObject]@{
                    File = $fileRelativePath
                    Issue = "Method naming convention"
                    Details = "Method '$methodName' uses forbidden prefix '$prefix', should use '$recommendedPrefix'"
                    Suggestion = $methodName -replace "^$prefix", $recommendedPrefix
                }
            }
        }
    }
    
    # Check option object patterns
    $defaultOptionsMatch = [regex]::Match($content, $optionPatterns['DefaultOptions'])
    $optionsInterfaceMatch = [regex]::Match($content, $optionPatterns['OptionsInterface'])
    $optionsMergeMatch = [regex]::Match($content, $optionPatterns['OptionsMerge'])
    
    if ($defaultOptionsMatch.Success) {
        $defaultOptionsName = $defaultOptionsMatch.Groups[1].Value
        
        # Check if there's a corresponding interface
        $expectedInterfaceName = "${defaultOptionsName}Options"
        if (-not $content.Contains($expectedInterfaceName)) {
            $optionObjectIssues += [PSCustomObject]@{
                File = $fileRelativePath
                Issue = "Missing options interface"
                Details = "Found DEFAULT_${defaultOptionsName}_OPTIONS but no corresponding $expectedInterfaceName interface"
                Suggestion = "Create interface ${expectedInterfaceName}"
            }
        }
    }
    
    # Check access modifiers
    $publicMethodsWithoutJSDoc = [regex]::Matches($content, 'public\s+(?!constructor)([a-zA-Z0-9_]+)\s*\([^)]*\)(?!\s*:\s*void\s*\{[\s\S]*?\/\*\*)')
    
    foreach ($methodMatch in $publicMethodsWithoutJSDoc) {
        $methodName = $methodMatch.Groups[1].Value
        
        $accessModifierIssues += [PSCustomObject]@{
            File = $fileRelativePath
            Issue = "Missing JSDoc"
            Details = "Public method '$methodName' lacks JSDoc documentation"
            Suggestion = "Add JSDoc comment for method '$methodName'"
        }
    }
    
    # Check for private methods that should be protected (for extensibility)
    $overridePrivateMethods = [regex]::Matches($content, 'private\s+([a-zA-Z0-9_]+)\s*\([^)]*\)(?=[\s\S]*?override)')
    
    foreach ($methodMatch in $overridePrivateMethods) {
        $methodName = $methodMatch.Groups[1].Value
        
        $accessModifierIssues += [PSCustomObject]@{
            File = $fileRelativePath
            Issue = "Inappropriate access modifier"
            Details = "Method '$methodName' is private but appears to be overridden, should be protected"
            Suggestion = "Change access modifier from private to protected for '$methodName'"
        }
    }
}

# Report findings
Write-Host "`nAPI Consistency Analysis Results:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

Write-Host "`nMethod Naming Convention Issues: $($methodNamingIssues.Count)" -ForegroundColor Yellow
if ($methodNamingIssues.Count -gt 0 -and $verbose) {
    $methodNamingIssues | Format-Table File, Details, Suggestion -AutoSize
}

Write-Host "`nOption Object Pattern Issues: $($optionObjectIssues.Count)" -ForegroundColor Yellow
if ($optionObjectIssues.Count -gt 0 -and $verbose) {
    $optionObjectIssues | Format-Table File, Details, Suggestion -AutoSize
}

Write-Host "`nAccess Modifier Issues: $($accessModifierIssues.Count)" -ForegroundColor Yellow
if ($accessModifierIssues.Count -gt 0 -and $verbose) {
    $accessModifierIssues | Format-Table File, Details, Suggestion -AutoSize
}

# Export to CSV if requested
if ($exportCsv) {
    $allIssues = @()
    $allIssues += $methodNamingIssues | ForEach-Object { $_ | Add-Member -NotePropertyName Category -NotePropertyValue "Method Naming" -PassThru }
    $allIssues += $optionObjectIssues | ForEach-Object { $_ | Add-Member -NotePropertyName Category -NotePropertyValue "Option Objects" -PassThru }
    $allIssues += $accessModifierIssues | ForEach-Object { $_ | Add-Member -NotePropertyName Category -NotePropertyValue "Access Modifiers" -PassThru }
    
    $allIssues | Export-Csv -Path $outputFile -NoTypeInformation
    Write-Host "`nExported $($allIssues.Count) issues to $outputFile" -ForegroundColor Green
}

# Summary
$totalIssues = $methodNamingIssues.Count + $optionObjectIssues.Count + $accessModifierIssues.Count
Write-Host "`nTotal API Consistency Issues: $totalIssues" -ForegroundColor $(if ($totalIssues -gt 0) { "Red" } else { "Green" })

# Suggestions
Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Run with -verbose to see detailed issues" -ForegroundColor White
Write-Host "2. Export to CSV with -exportCsv for a complete report" -ForegroundColor White
Write-Host "3. Focus on high-priority files first (core interfaces and base classes)" -ForegroundColor White
Write-Host "4. Consider adding ESLint rules to prevent future inconsistencies" -ForegroundColor White 