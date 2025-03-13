import {
    Scene,
    Vector3,
    MeshBuilder,
    LinesMesh,
    StandardMaterial,
    Color3,
    DynamicTexture,
    AxesViewer,
    Mesh,
    AbstractMesh,
    TransformNode,
    DebugLayer,
    Engine
} from '@babylonjs/core';
import { Logger } from './logger';

/**
 * Debug visualization options
 */
export interface DebugVisualizationOptions {
    /**
     * Whether to show axes
     */
    showAxes?: boolean;

    /**
     * Whether to show bounding boxes
     */
    showBoundingBoxes?: boolean;

    /**
     * Whether to show normals
     */
    showNormals?: boolean;

    /**
     * Whether to show wireframes
     */
    showWireframes?: boolean;

    /**
     * Whether to show physics impostors
     */
    showPhysics?: boolean;

    /**
     * Whether to show performance metrics
     */
    showPerformance?: boolean;
}

/**
 * Debug text options
 */
export interface DebugTextOptions {
    /**
     * Text to display
     */
    text: string;

    /**
     * Text position
     */
    position: Vector3;

    /**
     * Text color
     */
    color?: string;

    /**
     * Text size
     */
    size?: number;

    /**
     * Whether text should face the camera
     */
    faceCamera?: boolean;
}

/**
 * Debug utilities for development and testing
 */
export class DebugTools {
    private static logger = new Logger('DebugTools');
    private static instance: DebugTools;
    private scene: Scene;
    private debugMeshes: Map<string, Mesh | LinesMesh> = new Map();
    private axesViewers: Map<string, AxesViewer> = new Map();
    private debugTexts: Map<string, { mesh: Mesh, texture: DynamicTexture }> = new Map();
    private isEnabled: boolean = false;
    private performancePanel?: HTMLDivElement;
    private fpsCounter?: HTMLDivElement;
    private drawCalls: number = 0;
    private triangles: number = 0;
    private activeMeshes: number = 0;
    private lastFrameTime: number = 0;
    private frameCounter: number = 0;
    private fpsUpdateInterval: number = 500; // ms
    private lastFpsUpdate: number = 0;
    private currentFps: number = 0;

    /**
     * Initialize debug tools
     * @param scene Babylon.js scene
     */
    private constructor(scene: Scene) {
        this.scene = scene;
        this.setupPerformanceMonitoring();
    }

    /**
     * Get debug tools instance
     * @param scene Babylon.js scene
     */
    public static getInstance(scene: Scene): DebugTools {
        if (!DebugTools.instance) {
            DebugTools.instance = new DebugTools(scene);
        }
        return DebugTools.instance;
    }

    /**
     * Enable or disable debug tools
     * @param enabled Whether debug tools are enabled
     * @param options Debug visualization options
     */
    public enable(enabled: boolean, options: DebugVisualizationOptions = {}): void {
        this.isEnabled = enabled;

        if (enabled) {
            // Apply visualization options
            if (options.showAxes) {
                this.showWorldAxes(5);
            }

            if (options.showWireframes) {
                this.scene.forceWireframe = true;
            }

            if (options.showBoundingBoxes) {
                this.scene.forceShowBoundingBoxes = true;
            }

            if (options.showNormals) {
                this.scene.forcePointsCloud = true;
            }

            if (options.showPhysics) {
                this.scene.physicsEnabled = true;
            }

            if (options.showPerformance) {
                this.showPerformancePanel();
            }

            DebugTools.logger.info('Debug tools enabled');
        } else {
            // Reset visualization options
            this.scene.forceWireframe = false;
            this.scene.forceShowBoundingBoxes = false;
            this.scene.forcePointsCloud = false;

            // Clear debug objects
            this.clearAllDebugObjects();
            this.hidePerformancePanel();

            DebugTools.logger.info('Debug tools disabled');
        }
    }

    /**
     * Toggle the Babylon.js inspector
     */
    public toggleInspector(): void {
        if (this.scene.debugLayer.isVisible()) {
            this.scene.debugLayer.hide();
        } else {
            this.scene.debugLayer.show({
                embedMode: true,
                handleResize: true
            });
        }
    }

    /**
     * Show world axes
     * @param size Size of the axes
     */
    public showWorldAxes(size: number = 5): void {
        if (!this.isEnabled) return;

        if (this.axesViewers.has('world')) {
            this.axesViewers.get('world')?.dispose();
        }

        const axesViewer = new AxesViewer(this.scene, size);
        this.axesViewers.set('world', axesViewer);
    }

    /**
     * Show axes for a specific object
     * @param node Node to show axes for
     * @param size Size of the axes
     */
    public showObjectAxes(node: TransformNode, size: number = 1): void {
        if (!this.isEnabled) return;

        const id = node.uniqueId.toString();
        if (this.axesViewers.has(id)) {
            this.axesViewers.get(id)?.dispose();
        }

        const axesViewer = new AxesViewer(this.scene, size);
        axesViewer.xAxis.parent = node;
        axesViewer.yAxis.parent = node;
        axesViewer.zAxis.parent = node;
        this.axesViewers.set(id, axesViewer);
    }

    /**
     * Draw a debug line
     * @param start Start position
     * @param end End position
     * @param color Line color
     * @param id Optional identifier for updating the line
     */
    public drawLine(start: Vector3, end: Vector3, color: Color3 = new Color3(1, 0, 0), id?: string): void {
        if (!this.isEnabled) return;

        const lineId = id || `line_${this.debugMeshes.size}`;
        if (this.debugMeshes.has(lineId)) {
            // Update existing line
            const existingLine = this.debugMeshes.get(lineId) as LinesMesh;
            existingLine.dispose();
        }

        // Create new line
        const line = MeshBuilder.CreateLines(
            lineId,
            { points: [start, end] },
            this.scene
        );

        // Set color
        const material = new StandardMaterial(`${lineId}_material`, this.scene);
        material.emissiveColor = color;
        material.disableLighting = true;
        line.color = color;

        this.debugMeshes.set(lineId, line);
    }

    /**
     * Draw a debug ray
     * @param origin Ray origin
     * @param direction Ray direction
     * @param length Ray length
     * @param color Ray color
     * @param id Optional identifier for updating the ray
     */
    public drawRay(origin: Vector3, direction: Vector3, length: number, color: Color3 = new Color3(0, 1, 0), id?: string): void {
        if (!this.isEnabled) return;

        const normalizedDirection = direction.normalize();
        const end = origin.add(normalizedDirection.scale(length));
        this.drawLine(origin, end, color, id);
    }

    /**
     * Draw a debug sphere
     * @param position Sphere position
     * @param radius Sphere radius
     * @param color Sphere color
     * @param id Optional identifier for updating the sphere
     */
    public drawSphere(position: Vector3, radius: number = 0.1, color: Color3 = new Color3(0, 0, 1), id?: string): void {
        if (!this.isEnabled) return;

        const sphereId = id || `sphere_${this.debugMeshes.size}`;
        if (this.debugMeshes.has(sphereId)) {
            // Update existing sphere
            const existingSphere = this.debugMeshes.get(sphereId) as Mesh;
            existingSphere.position = position;
            existingSphere.scaling = new Vector3(radius * 2, radius * 2, radius * 2);
            return;
        }

        // Create new sphere
        const sphere = MeshBuilder.CreateSphere(
            sphereId,
            { diameter: radius * 2, segments: 8 },
            this.scene
        );
        sphere.position = position;

        // Set color and material properties
        const material = new StandardMaterial(`${sphereId}_material`, this.scene);
        material.diffuseColor = color;
        material.specularColor = new Color3(0.2, 0.2, 0.2);
        material.alpha = 0.7;
        sphere.material = material;

        this.debugMeshes.set(sphereId, sphere);
    }

    /**
     * Draw a debug vector
     * @param origin Vector origin
     * @param vector Vector to draw
     * @param color Vector color
     * @param id Optional identifier for updating the vector
     */
    public drawVector(origin: Vector3, vector: Vector3, color: Color3 = new Color3(1, 1, 0), id?: string): void {
        if (!this.isEnabled) return;

        const end = origin.add(vector);
        this.drawLine(origin, end, color, id);

        // Draw small sphere at the end
        const arrowId = id ? `${id}_arrow` : `vector_arrow_${this.debugMeshes.size}`;
        this.drawSphere(end, 0.05, color, arrowId);
    }

    /**
     * Draw a debug grid
     * @param position Grid center position
     * @param size Grid size
     * @param divisions Number of divisions
     * @param color Grid color
     */
    public drawGrid(position: Vector3, size: number = 10, divisions: number = 10, color: Color3 = new Color3(0.5, 0.5, 0.5)): void {
        if (!this.isEnabled) return;

        const gridId = `grid_${position.toString()}`;
        if (this.debugMeshes.has(gridId)) {
            // Update not supported for grid, just remove old one
            const existingGrid = this.debugMeshes.get(gridId);
            if (existingGrid) {
                existingGrid.dispose();
            }
            this.debugMeshes.delete(gridId);
        }

        // Create new grid
        const step = size / divisions;
        const halfSize = size / 2;

        const points: Vector3[] = [];
        const colors: Color4[] = [];

        // Create grid lines
        for (let i = 0; i <= divisions; i++) {
            const pos = -halfSize + i * step;

            // X direction line
            points.push(new Vector3(-halfSize, 0, pos));
            points.push(new Vector3(halfSize, 0, pos));

            // Z direction line
            points.push(new Vector3(pos, 0, -halfSize));
            points.push(new Vector3(pos, 0, halfSize));
        }

        const grid = MeshBuilder.CreateLines(
            gridId,
            { points, updatable: false },
            this.scene
        );
        grid.color = color;
        grid.position = position;

        this.debugMeshes.set(gridId, grid);
    }

    /**
     * Draw debug text in 3D space
     * @param options Text options
     */
    public drawText(options: DebugTextOptions): void {
        if (!this.isEnabled) return;

        const textId = `text_${options.position.toString()}`;
        if (this.debugTexts.has(textId)) {
            // Update existing text
            const existingText = this.debugTexts.get(textId);
            if (existingText) {
                const texture = existingText.texture;
                const textContext = texture.getContext();
                textContext.clearRect(0, 0, texture.getSize().width, texture.getSize().height);
                textContext.fillStyle = "white";
                textContext.fillRect(0, 0, texture.getSize().width, texture.getSize().height);
                textContext.fillStyle = options.color || "black";
                textContext.font = `${options.size || 24}px Arial`;
                textContext.textAlign = "center";
                textContext.textBaseline = "middle";
                textContext.fillText(options.text, texture.getSize().width / 2, texture.getSize().height / 2);
                texture.update();

                existingText.mesh.position = options.position;
                return;
            }
        }

        // Create a dynamic texture
        const size = options.size || 24;
        const textSize = size * 10;
        const texture = new DynamicTexture("DebugTextTexture", { width: textSize, height: textSize / 2 }, this.scene, true);
        const textContext = texture.getContext();

        // Set background
        textContext.fillStyle = "white";
        textContext.fillRect(0, 0, textSize, textSize / 2);

        // Draw text
        textContext.fillStyle = options.color || "black";
        textContext.font = `${size}px Arial`;
        textContext.textAlign = "center";
        textContext.textBaseline = "middle";
        textContext.fillText(options.text, textSize / 2, textSize / 4);
        texture.update();

        // Create a plane to show the text
        const plane = MeshBuilder.CreatePlane(
            textId,
            { width: 1, height: 0.5 },
            this.scene
        );
        plane.position = options.position;

        // Apply the texture to the plane
        const material = new StandardMaterial("DebugTextMaterial", this.scene);
        material.diffuseTexture = texture;
        material.specularColor = new Color3(0, 0, 0);
        material.emissiveColor = new Color3(1, 1, 1);
        material.backFaceCulling = false;
        plane.material = material;

        // Make the text always face the camera if requested
        if (options.faceCamera !== false) {
            plane.billboardMode = 7; // All axis
        }

        this.debugTexts.set(textId, { mesh: plane, texture });
    }

    /**
     * Draw a debug bounding box
     * @param min Minimum corner of the box
     * @param max Maximum corner of the box
     * @param color Box color
     * @param id Optional identifier for updating the box
     */
    public drawBoundingBox(min: Vector3, max: Vector3, color: Color3 = new Color3(0, 1, 1), id?: string): void {
        if (!this.isEnabled) return;

        const boxId = id || `box_${this.debugMeshes.size}`;
        if (this.debugMeshes.has(boxId)) {
            // Remove existing box
            const existingBox = this.debugMeshes.get(boxId);
            if (existingBox) {
                existingBox.dispose();
            }
            this.debugMeshes.delete(boxId);
        }

        // Create the 8 points of the box
        const points = [
            new Vector3(min.x, min.y, min.z),
            new Vector3(max.x, min.y, min.z),
            new Vector3(max.x, min.y, max.z),
            new Vector3(min.x, min.y, max.z),
            new Vector3(min.x, max.y, min.z),
            new Vector3(max.x, max.y, min.z),
            new Vector3(max.x, max.y, max.z),
            new Vector3(min.x, max.y, max.z)
        ];

        // Create lines for each edge of the box
        const lines: Vector3[] = [];

        // Bottom face
        lines.push(points[0], points[1]);
        lines.push(points[1], points[2]);
        lines.push(points[2], points[3]);
        lines.push(points[3], points[0]);

        // Top face
        lines.push(points[4], points[5]);
        lines.push(points[5], points[6]);
        lines.push(points[6], points[7]);
        lines.push(points[7], points[4]);

        // Connecting edges
        lines.push(points[0], points[4]);
        lines.push(points[1], points[5]);
        lines.push(points[2], points[6]);
        lines.push(points[3], points[7]);

        const box = MeshBuilder.CreateLines(
            boxId,
            { points: lines, updatable: false },
            this.scene
        );
        box.color = color;

        this.debugMeshes.set(boxId, box);
    }

    /**
     * Draw a debug point with optional text label
     * @param position Point position
     * @param label Optional text label
     * @param color Point color
     * @param id Optional identifier for updating the point
     */
    public drawPoint(position: Vector3, label?: string, color: Color3 = new Color3(1, 0, 1), id?: string): void {
        if (!this.isEnabled) return;

        const pointId = id || `point_${this.debugMeshes.size}`;

        // Draw a small sphere at the position
        this.drawSphere(position, 0.05, color, pointId);

        // Add a text label if provided
        if (label) {
            const labelPos = position.clone();
            labelPos.y += 0.1; // Offset above the point

            this.drawText({
                text: label,
                position: labelPos,
                color: color.toHexString(),
                size: 14,
                faceCamera: true
            });
        }
    }

    /**
     * Draw velocity vector for an object
     * @param object The object with a velocity
     * @param scale Scale factor for the vector
     * @param color Vector color
     */
    public drawVelocity(object: any, scale: number = 1, color: Color3 = new Color3(0, 0.8, 0.2)): void {
        if (!this.isEnabled || !object) return;

        // Get position and velocity
        let position: Vector3;
        let velocity: Vector3;

        if (object.position && object.velocity) {
            position = object.position.clone();
            velocity = object.velocity.clone();
        } else if (object.getPosition && object.getVelocity) {
            position = object.getPosition();
            velocity = object.getVelocity();
        } else if (object instanceof AbstractMesh) {
            position = object.position.clone();

            // Try to get velocity from physics impostor
            if (object.physicsImpostor) {
                velocity = object.physicsImpostor.getLinearVelocity()?.clone() || new Vector3(0, 0, 0);
            } else {
                return; // No velocity available
            }
        } else {
            return; // Not a valid object
        }

        // Draw the velocity vector
        const id = `velocity_${object.id || object.uniqueId}`;
        this.drawVector(position, velocity.scale(scale), color, id);
    }

    /**
     * Show performance metrics panel
     */
    public showPerformancePanel(): void {
        if (!this.isEnabled) return;

        if (!this.performancePanel) {
            // Create panel container
            this.performancePanel = document.createElement('div');
            this.performancePanel.style.position = 'absolute';
            this.performancePanel.style.top = '10px';
            this.performancePanel.style.right = '10px';
            this.performancePanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            this.performancePanel.style.color = 'white';
            this.performancePanel.style.padding = '10px';
            this.performancePanel.style.borderRadius = '5px';
            this.performancePanel.style.fontFamily = 'monospace';
            this.performancePanel.style.fontSize = '12px';
            this.performancePanel.style.zIndex = '1000';
            this.performancePanel.style.width = '200px';
            this.performancePanel.style.display = 'flex';
            this.performancePanel.style.flexDirection = 'column';
            this.performancePanel.style.gap = '5px';

            // Create FPS counter
            this.fpsCounter = document.createElement('div');
            this.fpsCounter.innerHTML = 'FPS: 0';
            this.performancePanel.appendChild(this.fpsCounter);

            // Create other metrics
            const drawCallsElement = document.createElement('div');
            drawCallsElement.id = 'debug-draw-calls';
            drawCallsElement.innerHTML = 'Draw calls: 0';
            this.performancePanel.appendChild(drawCallsElement);

            const trianglesElement = document.createElement('div');
            trianglesElement.id = 'debug-triangles';
            trianglesElement.innerHTML = 'Triangles: 0';
            this.performancePanel.appendChild(trianglesElement);

            const activeMeshesElement = document.createElement('div');
            activeMeshesElement.id = 'debug-active-meshes';
            activeMeshesElement.innerHTML = 'Active meshes: 0';
            this.performancePanel.appendChild(activeMeshesElement);

            // Add to document
            document.body.appendChild(this.performancePanel);

            // Set up scene before render observer for updating metrics
            this.scene.onBeforeRenderObservable.add(() => {
                this.updatePerformanceMetrics();
            });
        }
    }

    /**
     * Hide performance panel
     */
    public hidePerformancePanel(): void {
        if (this.performancePanel && this.performancePanel.parentNode) {
            this.performancePanel.parentNode.removeChild(this.performancePanel);
            this.performancePanel = undefined;
            this.fpsCounter = undefined;
        }
    }

    /**
     * Set up performance monitoring
     */
    private setupPerformanceMonitoring(): void {
        // Initialize timestamp
        this.lastFrameTime = performance.now();
        this.lastFpsUpdate = this.lastFrameTime;

        // Add observer for updating FPS
        this.scene.onBeforeRenderObservable.add(() => {
            const now = performance.now();
            const delta = now - this.lastFrameTime;
            this.lastFrameTime = now;

            // Count frame
            this.frameCounter++;

            // Update FPS every interval
            if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
                const elapsedSeconds = (now - this.lastFpsUpdate) / 1000;
                this.currentFps = Math.round(this.frameCounter / elapsedSeconds);
                this.frameCounter = 0;
                this.lastFpsUpdate = now;

                // Update FPS counter if visible
                if (this.fpsCounter) {
                    this.fpsCounter.innerHTML = `FPS: ${this.currentFps}`;
                }
            }
        });
    }

    /**
     * Update performance metrics
     */
    private updatePerformanceMetrics(): void {
        if (!this.performancePanel) return;

        // Update metrics elements if they exist
        const drawCallsElement = document.getElementById('debug-draw-calls');
        const trianglesElement = document.getElementById('debug-triangles');
        const activeMeshesElement = document.getElementById('debug-active-meshes');

        if (drawCallsElement) {
            this.drawCalls = this.scene.getEngine().drawCalls;
            drawCallsElement.innerHTML = `Draw calls: ${this.drawCalls}`;
        }

        if (trianglesElement) {
            this.triangles = this.scene.getEngine().countersLastFrame.triangles;
            trianglesElement.innerHTML = `Triangles: ${this.triangles}`;
        }

        if (activeMeshesElement) {
            this.activeMeshes = this.scene.getActiveMeshes().length;
            activeMeshesElement.innerHTML = `Active meshes: ${this.activeMeshes}`;
        }
    }

    /**
     * Clear all debug visualizations
     */
    public clearAllDebugObjects(): void {
        // Clear debug meshes
        this.debugMeshes.forEach((mesh) => {
            mesh.dispose();
        });
        this.debugMeshes.clear();

        // Clear axes viewers
        this.axesViewers.forEach((axesViewer) => {
            axesViewer.dispose();
        });
        this.axesViewers.clear();

        // Clear debug texts
        this.debugTexts.forEach((textData) => {
            textData.mesh.dispose();
            textData.texture.dispose();
        });
        this.debugTexts.clear();

        this.logger.debug('Cleared all debug objects');
    }

    /**
     * Log frames per second
     */
    public getFps(): number {
        return this.currentFps;
    }

    /**
     * Get current metrics
     */
    public getMetrics(): { fps: number, drawCalls: number, triangles: number, activeMeshes: number } {
        return {
            fps: this.currentFps,
            drawCalls: this.drawCalls,
            triangles: this.triangles,
            activeMeshes: this.activeMeshes
        };
    }

    /**
     * Get whether debug tools are enabled
     */
    public isDebugEnabled(): boolean {
        return this.isEnabled;
    }
}
