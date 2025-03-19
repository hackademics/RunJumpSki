# RunJumpSki ECS Components Implementation Guide

This document provides guidance for implementing the Entity Component System (ECS) components that form the foundation of the RunJumpSki game engine.

## Overview

The placeholder files for all required ECS components have been created using the `create_ecs_files.ps1` PowerShell script. This script generates the necessary file structure with basic boilerplate code that follows our project's coding standards and patterns.

## Component Structure

Each component follows a consistent pattern:
1. Interface file (`I*Component.ts`) - Defines the public API
2. Implementation file (`*Component.ts`) - Implements the component logic
3. Test file (`*Component.test.ts`) - Verifies component functionality

## Components to Implement

### Transform Component
- **Purpose**: Handles entity positioning, rotation, and scale in 3D space
- **Files**: 
  - `src/core/ecs/components/ITransformComponent.ts`
  - `src/core/ecs/components/TransformComponent.ts`
  - `tests/unit/core/ecs/components/TransformComponent.test.ts`
- **Priority**: High (many other components depend on this)

### Renderable Components
- **Purpose**: Base classes for visual representation of entities
- **Files**:
  - `src/core/ecs/components/IRenderableComponent.ts` (Base interface)
  - `src/core/ecs/components/RenderableComponent.ts` (Base class)
  - `src/core/ecs/components/IMeshComponent.ts` (Mesh-specific interface)
  - `src/core/ecs/components/MeshComponent.ts` (Mesh implementation)
  - Tests for both

### Physics Components
- **Purpose**: Handles physical properties and collision detection
- **Files**:
  - `src/core/ecs/components/IPhysicsComponent.ts`
  - `src/core/ecs/components/PhysicsComponent.ts`
  - `src/core/ecs/components/IColliderComponent.ts`
  - `src/core/ecs/components/ColliderComponent.ts`
  - Tests for both

### Audio Components
- **Purpose**: Manages sound effects and spatial audio for entities
- **Files**:
  - `src/core/ecs/components/IAudioComponent.ts`
  - `src/core/ecs/components/AudioComponent.ts`
  - Test file

### Camera Components
- **Purpose**: Controls camera behavior and first-person view
- **Files**:
  - `src/core/ecs/components/ICameraComponent.ts` (Base camera interface)
  - `src/core/ecs/components/CameraComponent.ts` (Base camera implementation)
  - `src/core/ecs/components/IFirstPersonCameraComponent.ts` (FPS camera interface)
  - `src/core/ecs/components/FirstPersonCameraComponent.ts` (FPS camera implementation)
  - Tests for both

## Implementation Guidelines

1. **Interfaces First**: Always start by defining the component's interface
2. **BABYLON Integration**: Use BABYLON.js types and objects (especially Vector3) where appropriate
3. **Error Handling**: Add proper validation and error handling
4. **Testing**: Ensure comprehensive tests for each component
5. **Documentation**: Include JSDoc comments for all methods and properties

## Implementation Order

For maximum efficiency, implement components in this order:

1. TransformComponent (foundation for all spatial components)
2. RenderableComponent and MeshComponent (visual representation)
3. CameraComponent and FirstPersonCameraComponent (player view)
4. PhysicsComponent and ColliderComponent (movement and collision)
5. AudioComponent (sound effects)

## Using the Script

The `create_ecs_files.ps1` script has already been run to create the placeholder files. If additional components are needed:

1. Update the STATUS.md file with the new component files
2. Add the new component to the script
3. Run the script again to generate the placeholder files

## Testing

Run tests to verify component implementation:

```powershell
npm test
```

Or test specific components:

```powershell
npm test -- --testPathPattern=TransformComponent
```

## Status Tracking

As components are implemented, update the STATUS.md file to track progress. 