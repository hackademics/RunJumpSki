# Architecture Documentation for Core Babylon.js Game Engine

## 1. Introduction

This document provides an in-depth architectural overview of our core game engine built with Babylon.js. It is intended to serve as a reference for developers working on the project, ensuring consistency in design, implementation, and testing across all systems.

## 2. Overview of Core Systems

Our game engine is composed of several core systems that work together to provide a robust, modular, and scalable architecture. The primary systems include:
- **Base Systems:** Fundamental interfaces and classes (e.g., Engine, ServiceLocator, ISystem) that establish the project framework.
- **Input System:** Manages keyboard and mouse events and maps raw inputs to game actions.
- **Physics System:** Integrates Babylon.js’s physics engine (e.g., CannonJSPlugin) for realistic simulations and collision detection.
- **Rendering System:** Handles scene creation, camera management, and rendering of entities.
- **Asset Management:** Loads, registers, and manages game assets (textures, models, sounds, etc.).
- **Debug Tools:** Provides real-time performance monitoring, debug rendering, and an interactive debug GUI.
- **Audio Manager:** Manages audio playback, including sound loading, volume control, and playback operations.
- **Scene Manager:** Organizes and manages multiple Babylon.js scenes, enabling scene switching and updates.

## 3. System Breakdown

### 3.1 Base Systems
- **Purpose:** Establish the foundational framework for dependency injection, event handling, and ECS architecture.
- **Components:** 
  - `Engine`: Main engine class coordinating system initialization and updates.
  - `ServiceLocator`: Provides dependency injection to simplify cross-system communication.
  - `ISystem` and `System`: Define a standard for all engine systems.
- **Dependencies:** None external beyond TypeScript and project-defined interfaces.
  
### 3.2 Input System
- **Purpose:** Capture and process user input from keyboard and mouse.
- **Components:** 
  - `InputManager`: Tracks key states and mouse position.
  - `InputMapper`: Maps keys to game actions.
  - `InputSystem`: Registers event listeners and dispatches events.
- **Interfaces:** `IInputManager`, `IInputMapper`, `IInputSystem`.
- **Usage Example:** Listening for keydown events and triggering corresponding actions.

### 3.3 Physics System
- **Purpose:** Integrate Babylon.js physics for simulation and collision detection.
- **Components:** 
  - `PhysicsSystem`: Initializes and manages physics simulation.
  - `CollisionSystem`: Stub implementation for collision detection.
  - `PhysicsComponent`: ECS component for adding physics properties to entities.
- **Interfaces:** `IPhysicsSystem`, `ICollisionSystem`, `IPhysicsComponent`.

### 3.4 Rendering System
- **Purpose:** Render game entities, manage scenes, and coordinate cameras.
- **Components:** 
  - `RenderingSystem`: Core renderer integrating Babylon.js.
  - `SceneManager`: Manages multiple scenes.
  - `CameraManager`: (Planned) Manages game cameras.
- **Interfaces:** `ISceneManager` for scene handling.

### 3.5 Asset Management
- **Purpose:** Load and track game assets to ensure they are available for rendering, physics, and audio.
- **Components:** 
  - `AssetLoader`: Handles fetching assets.
  - `AssetRegistry`: Tracks and manages loaded assets.
  - `AssetManager`: Orchestrates loading and registration.
- **Interfaces:** `IAssetLoader`, `IAssetRegistry`, `IAssetManager`.

### 3.6 Debug Tools
- **Purpose:** Provide development support with performance metrics, debug overlays, and an interactive GUI.
- **Components:** 
  - `DebugSystem`: Integrates performance monitoring, debug rendering, and GUI.
  - `PerformanceMonitor`: Tracks FPS and other metrics.
  - `DebugRenderer`: Renders debugging information.
  - `DebugGUI`: Displays interactive debug controls.
- **Interfaces:** `IDebugSystem`, `IPerformanceMonitor`, `IDebugRenderer`, `IDebugGUI`.

### 3.7 Audio Manager
- **Purpose:** Manage audio playback and control using Babylon.js’s audio features.
- **Components:** 
  - `AudioManager`: Loads, plays, pauses, stops, and manages volume for sounds.
- **Interfaces:** `IAudioManager`.

### 3.8 Scene Manager
- **Purpose:** Manage multiple Babylon.js scenes, allowing for creation, switching, and disposal of scenes.
- **Components:** 
  - `SceneManager`: Creates, retrieves, updates, and destroys scenes.
- **Interfaces:** `ISceneManager`.

## 4. Interfaces and Dependency Injection

- **Interface Separation:**  
  Every core system exposes its public API through dedicated interfaces (e.g., `IInputSystem`, `IPhysicsSystem`). This ensures that implementations can be easily swapped, mocked, or extended.
  
- **Dependency Injection:**  
  Systems receive their dependencies via constructors. For example, the `InputSystem` accepts custom implementations of `IInputManager` and `IInputMapper`, promoting flexibility and testability.

## 5. Directory Structure

Per our [PROJECT_MAP.md](PROJECT_MAP.md):
- Core systems reside in `src/core/` with subdirectories for each domain:
  - `src/core/input/`
  - `src/core/physics/`
  - `src/core/renderer/`
  - `src/core/assets/`
  - `src/core/debug/`
  - `src/core/audio/`
- Test files are mirrored under `tests/unit/` following the same structure.

## 6. Code Style and Naming Conventions

- **Consistency:**  
  All classes and interfaces follow our [CODE_STYLE.md](CODE_STYLE.md) and [IMPLEMENTATION_RULES.md](IMPLEMENTATION_RULES.md) guidelines:
  - Use PascalCase for classes and interfaces.
  - Private fields use camelCase.
  - Methods and properties are clearly defined and commented using JSDoc.
- **TypeScript Best Practices:**  
  Strong typing, use of generics, dependency injection, and explicit interfaces ensure maintainability and robustness.

## 7. Testing Strategy

- **Unit Tests:**  
  Each core system includes comprehensive unit tests (located in `tests/unit/`) covering both normal operations and edge cases.
- **Integration Tests:**  
  Integration between systems (e.g., rendering and asset management) is validated with end-to-end test scenarios.
- **Coverage Target:**  
  Our aim is to maintain at least 80% code coverage across all core modules.

## 8. Future Enhancements

- **Extended Debug Tools:**  
  Further development of the Debug GUI with interactive controls and real-time data visualization.
- **Camera Management:**  
  Implementation of a dedicated Camera Manager within the Rendering System.
- **Advanced Collision Handling:**  
  Refinement of the CollisionSystem to handle complex collision scenarios and integrate with custom game logic.
- **Audio Effects:**  
  Expanding the Audio Manager to support 3D sound positioning, audio effects, and dynamic volume adjustments based on gameplay.

## 9. Conclusion

This architecture document provides a comprehensive overview of the core systems within our Babylon.js game engine. By adhering to our established guidelines, dependency injection practices, and testing strategies, we ensure that our engine remains modular, maintainable, and scalable as new features are integrated.

For further details, refer to our project documentation files: [GameDevelopment.md](GameDevelopment.md), [PROJECT_MAP.md](PROJECT_MAP.md), [CODE_STYLE.md](CODE_STYLE.md), [IMPLEMENTATION_RULES.md](IMPLEMENTATION_RULES.md), and [AI_CONTEXT.md](AI_CONTEXT.md).
