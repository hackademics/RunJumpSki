# API Consistency Guidelines

This document outlines the conventions and patterns that all RunJumpSki code should follow to maintain API consistency across the codebase.

## Method Naming Conventions

### Verb Prefixes

Use consistent verb prefixes for method names based on their purpose:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `get` | Retrieve a value | `getPosition()`, `getComponentById()` |
| `set` | Update a value | `setPosition()`, `setEnabled()` |
| `is` | Boolean state check | `isEnabled()`, `isVisible()` |
| `has` | Boolean existence check | `hasComponent()`, `hasCollision()` |
| `create` | Factory method | `createScene()`, `createCamera()` |
| `initialize` | Setup method | `initialize()` (not `init()`) |
| `dispose` | Cleanup method | `dispose()` (not `destroy()` or `cleanup()`) |
| `update` | Frame update | `update()` |
| `add` | Add item to collection | `addComponent()`, `addListener()` |
| `remove` | Remove item from collection | `removeComponent()`, `removeListener()` |
| `on` | Event listener registration | `onCollision()`, `onUpdate()` |

### Forbidden Prefixes

The following prefixes should **not** be used:

| Forbidden Prefix | Use Instead | Note |
|------------------|-------------|------|
| `init` | `initialize` | Unless the full method name is `initialize` |
| `setup` | `initialize` | |
| `destroy` | `dispose` | |
| `clean` | `dispose` | |

### Parameters

Parameter ordering should follow these guidelines:

1. Required parameters first
2. Optional parameters after required parameters
3. Context/environment parameters after specific parameters
4. Callback parameters at the end

Example:
```typescript
createMesh(
  name: string,           // Required
  options?: MeshOptions,  // Optional
  scene?: Scene,          // Context
  onSuccess?: () => void  // Callback
): Mesh;
```

## Option Objects

### Naming

- Option interfaces should follow the pattern `ClassNameOptions` (e.g., `TransformComponentOptions`)
- Default option constants should follow the pattern `DEFAULT_CLASSNAME_OPTIONS` (e.g., `DEFAULT_TRANSFORMCOMPONENT_OPTIONS`)

### Structure

- Group related options in nested objects
- Use descriptive property names
- Include JSDoc for each option property
- Define sensible defaults for optional fields

Example:
```typescript
/**
 * Options for ParticleSystem
 */
export interface ParticleSystemOptions {
  /** Maximum number of particles */
  maxParticles: number;
  /** Emission rate (particles per second) */
  emissionRate?: number;
  /** Particle lifetime in seconds */
  lifetime?: number;
  /** Appearance options */
  appearance?: {
    /** Particle size */
    size?: number;
    /** Particle color */
    color?: BABYLON.Color4;
    /** Texture path */
    texturePath?: string;
  };
}

/**
 * Default options for ParticleSystem
 */
export const DEFAULT_PARTICLESYSTEM_OPTIONS: ParticleSystemOptions = {
  maxParticles: 1000,
  emissionRate: 10,
  lifetime: 2,
  appearance: {
    size: 1,
    color: new BABYLON.Color4(1, 1, 1, 1)
  }
};
```

### Merging

Always use a consistent pattern for merging defaults with user-provided options:

```typescript
// Shallow merge
const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

// Deep merge (for nested objects)
// Use OptionsUtil.mergeWithDefaults for deep merging
import { OptionsUtil } from '../utils/OptionsUtil';
const mergedOptions = OptionsUtil.mergeWithDefaults(DEFAULT_OPTIONS, options);
```

### Validation

Validate required fields and option values after merging:

```typescript
// Validate required fields
if (!mergedOptions.requiredField) {
  throw new Error('Required option "requiredField" is missing');
}

// Use OptionsUtil for standardized validation
OptionsUtil.validateOptions(mergedOptions, [
  OptionsUtil.createRule('maxParticles', {
    required: true,
    validate: OptionsUtil.numberRange(1, 10000),
    message: 'maxParticles must be between 1 and 10000'
  }),
  OptionsUtil.createRule('lifetime', {
    validate: (value) => typeof value === 'number' && value > 0,
    message: 'lifetime must be a positive number'
  })
]);
```

## Public/Private API Boundaries

### Access Modifiers

Use TypeScript access modifiers appropriately:

- `public` - Part of the component's API, accessible from anywhere
- `protected` - Accessible from subclasses, useful for extension points
- `private` - Internal implementation details, not accessible outside the class
- Use TypeScript's `#` private fields for stronger encapsulation when possible

### Documentation

- All public methods and properties **must** have JSDoc documentation
- Protected methods should have documentation explaining their purpose for subclasses
- Use the `@internal` JSDoc tag for methods that are technically public but not intended for general use

### Interface Separation

- Define interfaces for all public APIs (e.g., `IComponentName`)
- Place interfaces in separate files (e.g., `IComponentName.ts` and `ComponentName.ts`)
- Only expose necessary methods in interfaces
- Use method overloading in interfaces to clearly document behavior variants

### Extensibility

- Prefer protected methods for customization points instead of private methods
- Provide "hook" methods for subclass customization (e.g., `protected onBeforeUpdate()`)
- Use events for extensibility without inheritance

## Implementation Guidelines

### TypeScript Features

- Use strong typing everywhere - avoid `any`
- Use generics for type-safe containers and methods
- Use readonly for immutable properties
- Use optional chaining and nullish coalescing when appropriate
- Use type guards to narrow types safely

### Error Handling

- Document methods that can throw exceptions with `@throws` tags
- Use custom error types for better error classification
- Include meaningful error messages with context
- Handle errors at appropriate levels

## Testing and Deprecation

### Testing

- Public APIs must have test coverage
- Test both normal and error paths
- Use mocking to isolate unit tests

### Deprecation

- Mark deprecated APIs with `@deprecated` JSDoc tag
- Include migration path in deprecation message
- Keep deprecated APIs functional until next major version

## Adding New APIs

When adding new APIs:

1. Review similar existing APIs for consistency
2. Follow the naming conventions in this document
3. Use appropriate access modifiers
4. Document all public methods and properties
5. Add unit tests for all public functionality
6. Consider backward compatibility

## Tools

The following tools are available to help maintain API consistency:

1. `scripts/analyze-api-consistency.ps1` - Analyze codebase for API consistency issues
2. `scripts/eslint-api-consistency.js` - ESLint rules for API consistency enforcement
3. `src/core/utils/OptionsUtil.ts` - Utility for standardized option handling 