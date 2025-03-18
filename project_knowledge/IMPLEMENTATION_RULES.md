# Implementation Rules

## HARD RULES
1. NEVER create folders that duplicate existing ones
2. NEVER create "rendering" when "renderer" exists
3. NEVER place components in "base/components"
4. ALWAYS place new components in "core/ecs/components/"
5. ALWAYS use BABYLON.Vector3, never create custom Vector types
6. ALWAYS import using relative paths or path aliases

## TypeScript Best Practices
1. Use interfaces for all public APIs
2. Use dependency injection for all services
3. Use generics for type-safe containers and utilities
4. Use readonly properties where applicable
5. Use strong typing everywhere - avoid any
6. Use discriminated unions for state management

## Code Organization
1. One class/interface per file
2. Group related files in appropriate directories
3. Use barrel files (index.ts) for clean exports
4. Follow the defined directory structure

## Error Handling
1. Use custom error classes
2. Handle errors at appropriate levels
3. Provide meaningful error messages
4. Use try/catch blocks where errors are expected

## Testing Requirements
1. All core systems must have unit tests
2. All integrations between systems must have integration tests
3. Tests should cover normal and error cases
4. Mock Babylon.js objects for unit tests