import {
    Scene,
    GUI,
    Control,
    TextBlock,
    Color3
} from '@babylonjs/gui';
import { IEventEmitter } from '../../types/events';
import { Logger } from '../../utils/logger';

/**
 * Text alignment options
 */
export type TextAlignment =
    'left' |
    'center' |
    'right';

/**
 * Text style configuration
 */
export interface TextStyle {
    /**
     * Text color
     */
    color?: Color3;

    /**
     * Font size in pixels
     */
    fontSize?: number;

    /**
     * Font family
     */
    fontFamily?: string;

    /**
     * Text alignment
     */
    alignment?: TextAlignment;

    /**
     * Font weight (normal, bold, etc.)
     */
    fontWeight?: string;

    /**
     * Text decoration (underline, line-through, etc.)
     */
    textDecoration?: string;
}

/**
 * Default text styles
 */
const DefaultTextStyle: TextStyle = {
    color: new Color3(1, 1, 1),
    fontSize: 16,
    fontFamily: 'Arial',
    alignment: 'left',
    fontWeight: 'normal',
    textDecoration: 'none'
};

/**
 * UI Text component for displaying text
 */
export class UIText {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;

    // GUI elements
    private textBlock: TextBlock;

    // Text properties
    private id: string;
    private style: TextStyle;

    /**
     * Create a new UI text element
     * @param id Unique identifier for the text
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param text Initial text content
     * @param style Optional text style
     */
    constructor(
        id: string,
        scene: Scene,
        events: IEventEmitter,
        private text: string,
        style: TextStyle = {}
    ) {
        this.logger = new Logger(`UIText:${id}`);
        this.scene = scene;
        this.events = events;
        this.id = id;

        // Merge styles with defaults
        this.style = { ...DefaultTextStyle, ...style };

        this.createTextBlock();
    }

    /**
     * Create the text block GUI element
     */
    private createTextBlock(): void {
        // Create text block
        this.textBlock = new TextBlock(this.id);

        // Set initial text
        this.textBlock.text = this.text;

        // Apply styling
        this.applyStyle();
    }

    /**
     * Apply current style to the text block
     */
    private applyStyle(): void {
        // Color
        this.textBlock.color = this.style.color!.toColor3String();

        // Font size
        this.textBlock.fontSize = this.style.fontSize;

        // Font family
        this.textBlock.fontFamily = this.style.fontFamily;

        // Alignment
        switch (this.style.alignment) {
            case 'left':
                this.textBlock.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
                break;
            case 'center':
                this.textBlock.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
                break;
            case 'right':
                this.textBlock.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
                break;
        }

        // Additional styling properties
        // Note: These are simulated as Babylon.js GUI has limited styling
        this.textBlock.fontStyle = this.style.fontWeight === 'bold' ? 'bold' : 'normal';
    }

    /**
     * Add the text to a parent control
     * @param parent Parent control to add text to
     */
    public addToParent(parent: Control): void {
        parent.addControl(this.textBlock);
        this.logger.debug(`Added text to parent`);
    }

    /**
     * Remove the text from its parent
     * @param parent Parent control to remove from
     */
    public removeFromParent(parent: Control): void {
        parent.removeControl(this.textBlock);
        this.logger.debug(`Removed text from parent`);
    }

    /**
     * Get the current text content
     */
    public getText(): string {
        return this.text;
    }

    /**
     * Set the text content
     * @param text New text content
     */
    public setText(text: string): void {
        this.text = text;
        this.textBlock.text = text;
        this.logger.debug(`Text updated to: ${text}`);
    }

    /**
     * Update text style
     * @param style New style properties to apply
     */
    public setStyle(style: TextStyle): void {
        // Merge new style with existing
        this.style = { ...this.style, ...style };

        // Reapply styling
        this.applyStyle();
    }

    /**
     * Get the underlying text block control
     */
    public getControl(): TextBlock {
        return this.textBlock;
    }

    /**
     * Set text color
     * @param color New text color
     */
    public setColor(color: Color3): void {
        this.style.color = color;
        this.textBlock.color = color.toColor3String();
    }

    /**
     * Set font size
     * @param size New font size in pixels
     */
    public setFontSize(size: number): void {
        this.style.fontSize = size;
        this.textBlock.fontSize = size;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Remove control
        if (this.textBlock) {
            this.textBlock.dispose();
        }

        this.logger.debug(`Text ${this.id} disposed`);
    }
} 
