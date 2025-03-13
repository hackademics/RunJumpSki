import {
    Scene,
    GUI,
    Control,
    Rectangle,
    StackPanel,
    Color3,
    Color4
} from '@babylonjs/gui';
import { IEventEmitter, GameEvent } from '../../types/events';
import { Logger } from '../../utils/logger';

/**
 * Panel style configuration
 */
export interface PanelStyle {
    /**
     * Background color of the panel
     */
    backgroundColor?: Color3;

    /**
     * Border color
     */
    borderColor?: Color3;

    /**
     * Border thickness
     */
    borderThickness?: number;

    /**
     * Corner radius for rounded panels
     */
    cornerRadius?: number;

    /**
     * Padding within the panel
     */
    padding?: number;

    /**
     * Vertical or horizontal layout
     */
    orientation?: 'vertical' | 'horizontal';
}

/**
 * Default panel styles
 */
const DefaultPanelStyle: PanelStyle = {
    backgroundColor: new Color3(0.15, 0.15, 0.2),
    borderColor: new Color3(0.3, 0.3, 0.4),
    borderThickness: 2,
    cornerRadius: 10,
    padding: 10,
    orientation: 'vertical'
};

/**
 * UI Panel component for organizing controls
 */
export class UIPanel {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;

    // GUI elements
    private container: Rectangle;
    private contentPanel: StackPanel;

    // Panel properties
    private style: PanelStyle;
    private id: string;

    /**
     * Create a new UI panel
     * @param id Unique identifier for the panel
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param style Optional panel style
     */
    constructor(
        id: string,
        scene: Scene,
        events: IEventEmitter,
        style: PanelStyle = {}
    ) {
        this.logger = new Logger(`UIPanel:${id}`);
        this.scene = scene;
        this.events = events;
        this.id = id;
        this.style = { ...DefaultPanelStyle, ...style };

        this.createPanel();
    }

    /**
     * Create the panel GUI elements
     */
    private createPanel(): void {
        // Create panel container
        this.container = new Rectangle(this.id);
        this.container.width = 300;
        this.container.height = 400;
        this.container.cornerRadius = this.style.cornerRadius!;
        this.container.background = this.style.backgroundColor!.toColor4(0.9);
        this.container.thickness = this.style.borderThickness!;
        this.container.color = this.style.borderColor!.toColor3String();

        // Create content stack panel
        this.contentPanel = new StackPanel(`${this.id}_content`);
        this.contentPanel.width = 1; // Full width of container
        this.contentPanel.paddingTop = this.style.padding!;
        this.contentPanel.paddingBottom = this.style.padding!;
        this.contentPanel.paddingLeft = this.style.padding!;
        this.contentPanel.paddingRight = this.style.padding!;
        this.contentPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

        // Set orientation
        this.contentPanel.isVertical = this.style.orientation === 'vertical';

        // Add content panel to container
        this.container.addControl(this.contentPanel);
    }

    /**
     * Add a control to the panel
     * @param control Control to add
     */
    public addControl(control: Control): void {
        this.contentPanel.addControl(control);
        this.logger.debug(`Added control to panel ${this.id}`);
    }

    /**
     * Remove a control from the panel
     * @param control Control to remove
     */
    public removeControl(control: Control): void {
        this.contentPanel.removeControl(control);
        this.logger.debug(`Removed control from panel ${this.id}`);
    }

    /**
     * Add the panel to a parent control
     * @param parent Parent control to add panel to
     */
    public addToParent(parent: Control): void {
        parent.addControl(this.container);
    }

    /**
     * Remove the panel from its parent
     * @param parent Parent control to remove from
     */
    public removeFromParent(parent: Control): void {
        parent.removeControl(this.container);
    }

    /**
     * Set panel width
     * @param width New width in pixels or as a proportion
     */
    public setWidth(width: number | string): void {
        this.container.width = width;
    }

    /**
     * Set panel height
     * @param height New height in pixels or as a proportion
     */
    public setHeight(height: number | string): void {
        this.container.height = height;
    }

    /**
     * Set panel orientation
     * @param orientation Vertical or horizontal layout
     */
    public setOrientation(orientation: 'vertical' | 'horizontal'): void {
        this.contentPanel.isVertical = orientation === 'vertical';
        this.style.orientation = orientation;
    }

    /**
     * Update panel background color
     * @param color New background color
     */
    public setBackgroundColor(color: Color3): void {
        this.container.background = color.toColor4(0.9);
        this.style.backgroundColor = color;
    }

    /**
     * Get the underlying GUI container
     */
    public getContainer(): Rectangle {
        return this.container;
    }

    /**
     * Get the content stack panel
     */
    public getContentPanel(): StackPanel {
        return this.contentPanel;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Remove controls
        if (this.container) {
            this.container.dispose();
        }

        this.logger.debug(`Panel ${this.id} disposed`);
    }
}
