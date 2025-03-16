import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';
import { EventBus } from './core/events/EventBus';

/**
 * Main entry point for the RunJumpSki game
 */
class Game {
    private canvas: HTMLCanvasElement;
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    private eventBus: EventBus;
    
    constructor() {
        // Get the canvas element
        this.canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
        if (!this.canvas) throw new Error('Canvas element not found');
        
        // Initialize the Babylon engine
        this.engine = new BABYLON.Engine(this.canvas, true);
        
        // Get the event bus
        this.eventBus = EventBus.getInstance();
        
        // Create a scene
        this.scene = this.createScene();
        
        // Register to the render loop
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
        
        // Handle browser resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }
    
    /**
     * Create the Babylon.js scene
     */
    private createScene(): BABYLON.Scene {
        // Create scene
        const scene = new BABYLON.Scene(this.engine);
        
        // Create a basic setup for testing
        const camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 5, -10), scene);
        camera.setTarget(BABYLON.Vector3.Zero());
        camera.attachControl(this.canvas, true);
        
        const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.7;
        
        const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 50, height: 50 }, scene);
        const groundMaterial = new BABYLON.StandardMaterial('groundMaterial', scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        ground.material = groundMaterial;
        
        // Create a simple test box
        const box = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, scene);
        box.position.y = 1;
        const boxMaterial = new BABYLON.StandardMaterial('boxMaterial', scene);
        boxMaterial.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
        box.material = boxMaterial;
        
        // Display FPS
        scene.debugLayer.show({
            embedMode: true,
            handleResize: true,
            overlay: true
        });
        
        return scene;
    }
}

// Start the game when the page is loaded
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
