# AI Context Reference

When starting a new chat session or if context is lost, refer to this document.

## Project Structure
- We are building a core game engine with Babylon.js
- The directory structure is defined in PROJECT_MAP.md
- Type imports are defined in TYPE_IMPORTS.md
- Code style is defined in CODE_STYLE.md

## Current Development Focus
Check TASK_TRACKER.md for the current focus.

## Hard Rules
1. NEVER create folders that duplicate existing ones
2. NEVER create "rendering" when "renderer" exists
3. NEVER place components in "base/components"
4. ALWAYS place new components in "core/ecs/components/"
5. ALWAYS use BABYLON.Vector3, never create custom Vector types
6. ALWAYS import using proper path aliases (@core/, @ecs/, etc.)

## Implementation Order
1. Base interfaces and classes
2. Event system
3. Entity-Component System
4. Rendering integration
5. Input system
6. Physics system
7. Asset Management
8. Debug tools

## Template Command
When starting a new conversation, use:

/context I'm working on a Babylon.js game engine with strict folder structure.
Renderer is in "renderer/" NOT "rendering/".
Components are in "ecs/components/" NOT "base/components/".
ALWAYS use BABYLON.Vector3, not custom Vector3.
Current focus: [check TASK_TRACKER.md]
Please continue helping me implement the core engine following our established patterns.