import {
    Scene,
    GUI,
    Control,
    Slider,
    TextBlock,
    Color3,
    Color4
} from '@babylonjs/gui';
import { IEventEmitter, GameEvent } from '../../types/events';
import { Logger } from '../../utils/logger';

/**
 * Slider style configuration
 */
export interface SliderStyle {
    /**
     * Background color of the slider track
     */
    trackColor?: Color3;

    /**
     * Color of the slider thumb
     */
    thumbColor?: Color3;

    /**
     * Color of the progress/filled part of the slider
     */
    progressColor?: Color3;

    /**
     * Text color for labels
     */
    textColor?: Color3;

    /**
     * Font size for labels
     */
    fontSize?: number;

    /**
     * Thickness of the slider track
     */
    trackThickness?: number;

    /**
     * Size of the slider thumb
     */
    thumbSize?: number;
}

/**
 * Default slider styles
 */
const DefaultSliderStyle: SliderStyle = {
    trackColor: new Color3(0.3, 0.3, 0.3),
    thumbColor: new Color3(0.2, 0.4, 0.8),
    progressColor: new Color3(0.2, 0.4, 0.8),
    textColor: new Color3(1, 1, 1),
    fontSize: 14,
    trackThickness: 8,
    thumbSize: 20
};

/**
 * Slider configuration options
 */
export interface SliderOptions {
    /**
     * Minimum value of the slider
     */
    min: number;

    /**
     * Maximum value of the slider
     */
    max: number;

    /**
     * Initial value of the slider
     */
    value?: number;

    /**
     * Step size for value changes
     */
    step?: number;

    /**
     * Optional label to display
     */
    label?: string;
}

/**
 * UI Slider component for numeric value selection
 */
export class UISlider {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;

    // GUI elements
    private container: GUI.StackPanel;
    private labelText?: TextBlock;
    private slider: Slider;
    private valueText: TextBlock;

    // Slider properties
    private id: string;
    private style: SliderStyle;
    private options: SliderOptions;

    /**
     * Create a new UI slider
     * @param id Unique identifier for the slider
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param options Slider configuration options
     * @param style Optional slider style
     */
    constructor(
        id: string,
        scene: Scene,
        events: IEventEmitter,
        options: SliderOptions,
        style: SliderStyle = {}
    ) {
        this.logger = new Logger(`UISlider:${id}`);
        this.scene = scene;
        this.events = events;
        this.id = id;

        // Merge options with defaults
        this.options = {
            step: 1,
            value: options.min,
            ...options
        };

        // Merge styles with defaults
        this.style = { ...DefaultSliderStyle, ...style };

        this.createSlider();
    }

    /**
     * Create the slider GUI elements
     */
    private createSlider(): void {
        // Create container stack panel
        this.container = new GUI.StackPanel(`${this.id}_container`);
        this.container.width = 1;
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;

        // Create optional label
        if (this.options.label) {
            this.labelText = new TextBlock(`${this.id}_label`);
            this.labelText.text = this.options.label;
            this.labelText.color = this.style.textColor!.toColor3String();
            this.labelText.fontSize = this.style.fontSize;
            this.labelText.height = "30px";
            this.labelText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            this.container.addControl(this.labelText);
        }

        // Create slider
        this.slider = new Slider(`${this.id}_slider`);
        this.slider.minimum = this.options.min;
        this.slider.maximum = this.options.max;
        this.slider.value = this.options.value ?? this.options.min;
        this.slider.step = this.options.step;

        // Styling
        this.slider.color = this.style.trackColor!.toColor3String();
        this.slider.background = this.style.thumbColor!.toColor3String();
        this.slider.borderColor = this.style.progressColor!.toColor3String();

        this.slider.height = `${this.style.trackThickness}px`;
        this.slider.width = "200px";

        // Value display
        this.valueText = new TextBlock(`${this.id}_value`);
        this.valueText.text = this.formatValue(this.slider.value);
        this.valueText.color = this.style.textColor!.toColor3String();
        this.valueText.fontSize = this.style.fontSize;
        this.valueText.width = "50px";
        this.valueText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;

        // Create horizontal container for slider and value
        const sliderContainer = new GUI.StackPanel(`${this.id}_slider_container`);
        sliderContainer.isVertical = false;
        sliderContainer.width = 1;

        // Add slider and value to container
        sliderContainer.addControl(this.slider);
        sliderContainer.addControl(this.valueText);

        // Add slider container to main container
        this.container.addControl(sliderContainer);

        // Set up interaction events
        this.setupInteractionEvents();
    }

    /**
     * Set up slider interaction events
     */
    private setupInteractionEvents(): void {
        // Update value text when slider changes
        this.slider.onValueChangedObservable.add((value) => {
            // Update value text
            this.valueText.text = this.formatValue(value);

            // Emit slider change event
            this.events.emit(GameEvent.UI_BUTTON_CLICK, {
                id: this.id,
                value: value
            });

            this.logger.debug(`Slider ${this.id} value changed to: ${value}`);
        });
    }

    /**
     * Format the value for display
     * @param value Value to format
     */
    private formatValue(value: number): string {
        // Round to 2 decimal places
        return value.toFixed(2);
    }

    /**
     * Add the slider to a parent control
     * @param parent Parent control to add slider to
     */
    public addToParent(parent: Control): void {
        parent.addControl(this.container);
    }

    /**
     * Remove the slider from its parent
     * @param parent Parent control to remove from
     */
    public removeFromParent(parent: Control): void {
        parent.removeControl(this.container);
    }

    /**
     * Get the current slider value
     */
    public getValue(): number {
        return this.slider.value;
    }

    /**
     * Set the slider value
     * @param value New value for the slider
     */
    public setValue(value: number): void {
        // Ensure value is within min and max
        const clampedValue = Math.max(
            this.options.min,
            Math.min(this.options.max, value)
        );

        this.slider.value = clampedValue;
        this.valueText.text = this.formatValue(clampedValue);
    }

    /**
     * Get the underlying GUI container
     */
    public getContainer(): GUI.StackPanel {
        return this.container;
    }

    /**
     * Get the slider control
     */
    public getSlider(): Slider {
        return this.slider;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Remove controls
        if (this.container) {
            this.container.dispose();
        }

        this.logger.debug(`Slider ${this.id} disposed`);
    }
}
