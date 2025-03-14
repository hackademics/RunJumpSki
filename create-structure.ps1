# PowerShell script to create project structure

# Create src directory if it doesn't exist
if (-not (Test-Path -Path "src")) {
    New-Item -ItemType Directory -Path "src"
}

# Define all directories
$directories = @(
    "src/core",
    "src/components/movement",
    "src/components/physics",
    "src/components/energy",
    "src/entities",
    "src/terrain",
    "src/input",
    "src/ui",
    "src/types/events",
    "src/types/common",
    "src/utils",
    "src/config",
    "src/scenes"
)

# Create directories
foreach ($dir in $directories) {
    if (-not (Test-Path -Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
    }
}

# Define all files
$files = @(
    "src/index.ts",
    "src/core/Engine.ts",
    "src/core/PhysicsSystem.ts",
    "src/core/EventSystem.ts",
    "src/components/movement/MovementComponent.ts",
    "src/components/movement/MovementState.ts",
    "src/components/movement/IMovementComponent.ts",
    "src/components/physics/PhysicsComponent.ts",
    "src/components/physics/IPhysicsComponent.ts",
    "src/components/energy/EnergyComponent.ts",
    "src/components/energy/IEnergyComponent.ts",
    "src/entities/Player.ts",
    "src/entities/Entity.ts",
    "src/entities/IEntity.ts",
    "src/terrain/TerrainSystem.ts",
    "src/terrain/SurfaceType.ts",
    "src/terrain/ITerrain.ts",
    "src/input/InputSystem.ts",
    "src/input/InputMapping.ts",
    "src/input/IInputSystem.ts",
    "src/ui/HUD.ts",
    "src/ui/DebugOverlay.ts",
    "src/ui/IUIComponent.ts",
    "src/types/events/GameEvents.ts",
    "src/types/events/EventTypes.ts",
    "src/types/common/Vector3.ts",
    "src/types/common/Transform.ts",
    "src/utils/VectorMath.ts",
    "src/utils/Logger.ts",
    "src/utils/MathUtils.ts",
    "src/config/GameConfig.ts",
    "src/config/PhysicsConfig.ts",
    "src/config/Constants.ts",
    "src/scenes/Scene.ts",
    "src/scenes/GameScene.ts",
    "src/scenes/IScene.ts"
)

# Create files
foreach ($file in $files) {
    if (-not (Test-Path -Path $file)) {
        New-Item -ItemType File -Path $file -Force
    }
}

Write-Host "Project structure created successfully!" 