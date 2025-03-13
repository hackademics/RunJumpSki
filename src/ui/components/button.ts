import {
    Scene,
    GUI,
    Control,
    TextBlock,
    Rectangle,
    Color3,
    Color4
} from '@babylonjs/gui';
import { IEventEmitter, GameEvent } from '../../types/events';
import { Logger } from '../../utils/logger';

/**
 * Button style configuration
 */
export interface ButtonStyle {
    /**
     * Background color in normal state
     */
    backgroundColor?: Color3;

    /**
     * Background color when hovered
     */
    hoverColor?: Color3;

    /**
     * Background color when pressed
     */
    pressColor?: Color3;

    /**
     * Text color
     */
    textColor?: Color3;

    /**
     * Text size in pixels
     */
    textSize?: number;

    /**
     * Font family
     */
    fontFamily?: string;

    /**
     * Padding around the button content
     */
    padding?: number;

    /**
     * Corner radius for rounded buttons
     */
    cornerRadius?: number;
}

/**
 * Default button styles
 */
const DefaultButtonStyle: ButtonStyle = {
    backgroundColor: new Color3(0.2, 0.4, 0.8),
    hoverColor: new Color3(0.3, 0.5, 0.9),
    pressColor: new Color3(0.1, 0.3, 0.7),
    textColor: new Color3(1, 1, 1),
    textSize: 18,
    fontFamily: 'Arial',
    padding: 10,
    cornerRadius: 5
};

/**
 * Button component for UI
 */
export class UIButton {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;

    // GUI elements
    private container: Rectangle;
    private textBlock: TextBlock;

    // Button properties
    private text: string;
    private style: ButtonStyle;
    private isEnabled: boolean = true;

    /**
     * Create a new UI button
     * @param id Unique identifier for the button
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param text Button text
     * @param style Optional button style
     */
    constructor(
        private id: string,
        scene: Scene,
        events: IEventEmitter,
        text: string,
        style: ButtonStyle = {}
    ) {
        this.logger = new Logger(`UIButton:${id}`);
        this.scene = scene;
        this.events = events;
        this.text = text;
        this.style = { ...DefaultButtonStyle, ...style };

        this.createButton();
    }

    /**
     * Create the button GUI elements
     */
    private createButton(): void {
        // Create button container
        this.container = new Rectangle(this.id);
        this.container.width = 200;
        this.container.height = 50;
        this.container.cornerRadius = this.style.cornerRadius!;
        this.container.background = this.style.backgroundColor!.toColor4(1);
        this.container.thickness = 0;

        // Create text block
        this.textBlock = new TextBlock(`${this.id}_text`);
        this.textBlock.text = this.text;
        this.textBlock.color = this.style.textColor!.toColor3String();
        this.textBlock.fontSize = this.style.textSize;
        this.textBlock.fontFamily = this.style.fontFamily;

        // Add text to container
        this.container.addControl(this.textBlock);

        // Set up interaction events
        this.setupInteractionEvents();
    }

    /**
     * Set up mouse interaction events
     */
    private setupInteractionEvents(): void {
        // Hover effects
        this.container.onPointerEnterObservable.add(() => {
            if (!this.isEnabled) return;
            this.container.background = this.style.hoverColor!.toColor4(1);
        });

        this.container.onPointerOutObservable.add(() => {
            if (!this.isEnabled) return;
            this.container.background = this.style.backgroundColor!.toColor4(1);
        });

        // Press effects
        this.container.onPointerDownObservable.add(() => {
            if (!this.isEnabled) return;
            this.container.background = this.style.pressColor!.toColor4(1);
        });

        this.container.onPointerUpObservable.add(() => {
            if (!this.isEnabled) return;
            this.container.background = this.style.hoverColor!.toColor4(1);
        });

        // Click event
        this.container.onPointerClickObservable.add(() => {
            if (!this.isEnabled) return;

            // Emit button click event
            this.events.emit(GameEvent.UI_BUTTON_CLICK, {
                id: this.id,
                text: this.text
            });

            this.logger.debug(`Button clicked: ${this.id}`);
        });
    }

    /**
     * Add the button to a parent control
     * @param parent Parent control to add button to
     */
    public addToParent(parent: Control): void {
        parent.addControl(this.container);
    }

    /**
     * Remove the button from its parent
     * @param parent Parent control to remove from
     */
    public removeFromParent(parent: Control): void {
        parent.removeControl(this.container);
    }

    /**
     * Set button text
     * @param text New button text
     */
    public setText(text: string): void {
        this.text = text;
        this.textBlock.text = text;
    }

    /**
     * Get current button text
     */
    public getText(): string {
        return this.text;
    }

    /**
     * Enable or disable the button
     * @param enabled Whether the button should be enabled
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;

        // Visual indication of disabled state
        if (!enabled) {
            this.container.background = new Color4(0.5, 0.5, 0.5, 0.5);
            this.textBlock.color = new Color3(0.7, 0.7, 0.7).toColor3String();
        } else {
            this.container.background = this.style.backgroundColor!.toColor4(1);
            this.textBlock.color = this.style.textColor!.toColor3String();
        }
    }

    /**
     * Check if button is currently enabled
     */
    public isButtonEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Get the underlying GUI control
     */
    public getControl(): Rectangle {
        return this.container;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Remove controls
        if (this.container) {
            this.container.dispose();
        }

        this.logger.debug(`Button ${this.id} disposed`);
    }
}
