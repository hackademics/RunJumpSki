# RunJumpSki Documentation Scripts

This directory contains a set of PowerShell scripts designed to automate documentation tasks for the RunJumpSki project.

## Available Scripts

### Main Script

- **`update-documentation.ps1`**: Master script that runs all documentation scripts in sequence.

  ```powershell
  # Run all documentation tasks
  ./scripts/update-documentation.ps1
  
  # Skip specific tasks
  ./scripts/update-documentation.ps1 -skipDiagrams -skipJsdocAnalysis
  
  # Force regeneration of all artifacts
  ./scripts/update-documentation.ps1 -forceRegenerate
  ```

### Individual Scripts

- **`analyze-jsdoc-coverage.ps1`**: Analyzes the codebase for JSDoc comment coverage.

  ```powershell
  # Basic usage
  ./scripts/analyze-jsdoc-coverage.ps1
  
  # Export results to CSV
  ./scripts/analyze-jsdoc-coverage.ps1 -exportCsv
  
  # Show detailed output
  ./scripts/analyze-jsdoc-coverage.ps1 -verbose
  ```

- **`generate-dependency-graph.ps1`**: Generates component dependency graphs from the codebase.

  ```powershell
  # Basic usage (generates DOT file)
  ./scripts/generate-dependency-graph.ps1
  
  # Generate PNG image (requires Graphviz)
  ./scripts/generate-dependency-graph.ps1 -generatePng
  
  # Exclude core dependencies
  ./scripts/generate-dependency-graph.ps1 -includeCore:$false
  ```

- **`create-architecture-diagrams.ps1`**: Creates architectural diagrams for the project.

  ```powershell
  # Basic usage
  ./scripts/create-architecture-diagrams.ps1
  
  # Force regeneration of existing diagrams
  ./scripts/create-architecture-diagrams.ps1 -force
  
  # Specify custom output directory
  ./scripts/create-architecture-diagrams.ps1 -outputDir "./docs/custom-diagrams"
  ```

- **`generate-onboarding-guide.ps1`**: Generates a comprehensive developer onboarding guide.

  ```powershell
  # Basic usage
  ./scripts/generate-onboarding-guide.ps1
  
  # Custom output location
  ./scripts/generate-onboarding-guide.ps1 -outputFile "./docs/MyGuide.md"
  
  # Skip code snippets
  ./scripts/generate-onboarding-guide.ps1 -includeCodeSnippets:$false
  ```

- **`update-documentation-status.ps1`**: Updates the Documentation Status section in STATUS.md.

  ```powershell
  # Basic usage
  ./scripts/update-documentation-status.ps1
  
  # Preview changes without updating STATUS.md
  ./scripts/update-documentation-status.ps1 -updateFile:$false
  
  # Skip running JSDoc analysis
  ./scripts/update-documentation-status.ps1 -runAnalysis:$false
  ```

## Requirements

- PowerShell Core 6.0+ (Windows PowerShell 5.1+ may work but is not fully tested)
- [Optional] Graphviz (`dot` command) for generating PNG diagrams
- The scripts should be run from the project root directory

## Output Files

The scripts generate the following output files:

- **JSDoc Analysis**: `./jsdoc-coverage.csv`
- **Architectural Diagrams**: `./docs/diagrams/*.dot` and `./docs/diagrams/*.png`
- **Component Dependencies**: `./docs/diagrams/component-dependencies.dot` and `./docs/diagrams/component-dependencies.png`
- **Developer Onboarding Guide**: `./docs/DeveloperOnboarding.md`
- **Updated Documentation Status**: Updates are applied directly to `./STATUS.md`

## Customization

Most scripts accept parameters to customize their behavior. Run a script with `-?` to see all available options:

```powershell
./scripts/analyze-jsdoc-coverage.ps1 -?
``` 