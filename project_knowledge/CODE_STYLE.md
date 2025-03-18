# CODE_STYLE.md
```markdown
# Code Style Guide

## Class Structure
```typescript
export class ClassName {
  // Private fields first
  private fieldName: Type;
  
  // Constructor
  constructor(options: Options) {
    // Implementation
  }
  
  // Public methods
  public methodName(): ReturnType {
    // Implementation
  }
  
  // Private methods
  private helperMethod(): void {
    // Implementation
  }
}

Import Order

External libraries (Babylon.js)
Core interfaces
System classes
Utility classes

Naming Conventions

Classes: PascalCase
Interfaces: IPascalCase
Methods: camelCase
Private fields: camelCase

TypeScript Best Practices

Use interfaces for public APIs
Use generics for type-safe code
Prefer readonly properties
Use discriminated unions for state management
Use strong typing everywhere - avoid "any"
Use dependency injection
Implement proper error handling