/**
 * @file src/core/debug/gui/DebugGUI.ts
 * @description Main debug GUI system that manages parameter groups and GUI elements.
 */

import * as BABYLON from 'babylonjs';
import * as GUI from 'babylonjs-gui';
import { ParameterGroup, GroupChangeEvent } from './ParameterGroup';
import { 
  TweakableParameter, 
  NumericParameter, 
  BooleanParameter, 
  StringParameter, 
  OptionParameter, 
  Vector3Parameter,
  ParameterChangeEvent 
} from './TweakableParameter';

/**
 * Options for the debug GUI
 */
export interface DebugGUIOptions {
  /**
   * Whether the GUI is visible by default
   */
  visible?: boolean;
  
  /**
   * Position of the GUI panel
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  /**
   * Width of the GUI panel
   */
  width?: string;
  
  /**
   * Height of the GUI panel
   */
  height?: string;
  
  /**
   * Background color of the panel
   */
  backgroundColor?: string;
  
  /**
   * Text color
   */
  textColor?: string;
  
  /**
   * Font size
   */
  fontSize?: number;
  
  /**
   * Padding between elements
   */
  padding?: number;
}

/**
 * Default options for the debug GUI
 */
const DEFAULT_OPTIONS: DebugGUIOptions = {
  visible: false,
  position: 'top-right',
  width: '300px',
  height: '80vh',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  textColor: 'white',
  fontSize: 14,
  padding: 5
};

/**
 * Main debug GUI system
 */
export class DebugGUI {
  private scene: BABYLON.Scene;
  private advancedTexture: GUI.AdvancedDynamicTexture;
  private container: GUI.StackPanel;
  private groups: Map<string, ParameterGroup>;
  private options: DebugGUIOptions;
  private visible: boolean;
  private groupPanels: Map<string, GUI.StackPanel>;
  private parameterControls: Map<string, GUI.Control>;
  private lastUpdateTime: number;
  private updateInterval: number;

  /**
   * Creates a new debug GUI
   * @param scene The Babylon.js scene
   * @param options GUI options
   */
  constructor(scene: BABYLON.Scene, options: Partial<DebugGUIOptions> = {}) {
    this.scene = scene;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.visible = this.options.visible!;
    this.groups = new Map();
    this.groupPanels = new Map();
    this.parameterControls = new Map();
    this.lastUpdateTime = 0;
    this.updateInterval = 100; // Update every 100ms

    // Create the AdvancedDynamicTexture for GUI
    this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('DebugGUI', true, this.scene);
    
    // Create the main container
    this.container = new GUI.StackPanel();
    this.container.width = this.options.width!;
    this.container.height = this.options.height!;
    this.container.background = this.options.backgroundColor!;
    this.container.color = this.options.textColor!;
    this.container.fontSize = this.options.fontSize!;
    this.container.paddingTop = `${this.options.padding}px`;
    this.container.paddingBottom = `${this.options.padding}px`;
    this.container.paddingLeft = `${this.options.padding}px`;
    this.container.paddingRight = `${this.options.padding}px`;
    this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.container.isVisible = this.visible;
    
    // Position the container based on options
    this.updatePosition();
    
    // Add to the UI
    this.advancedTexture.addControl(this.container);

    // Create title
    const title = new GUI.TextBlock();
    title.text = 'DEBUG PANEL';
    title.height = '30px';
    title.color = this.options.textColor!;
    title.fontSize = 16;
    title.fontWeight = 'bold';
    title.resizeToFit = true;
    this.container.addControl(title);

    // Create help text
    const helpText = new GUI.TextBlock();
    helpText.text = 'Press F2 to toggle display';
    helpText.height = '20px';
    helpText.color = this.options.textColor!;
    helpText.alpha = 0.7;
    helpText.fontSize = 12;
    helpText.resizeToFit = true;
    this.container.addControl(helpText);
  }

  /**
   * Add a parameter group to the GUI
   * @param group Parameter group to add
   */
  public addGroup(group: ParameterGroup): void {
    if (this.groups.has(group.name)) {
      console.warn(`Group "${group.name}" already exists in debug GUI`);
      return;
    }

    this.groups.set(group.name, group);

    // Create group panel
    const panel = new GUI.StackPanel();
    panel.name = group.name;
    panel.height = 'auto';
    panel.background = 'rgba(0, 0, 0, 0.3)';
    panel.paddingTop = `${this.options.padding}px`;
    panel.paddingBottom = `${this.options.padding}px`;
    panel.paddingLeft = `${this.options.padding}px`;
    panel.paddingRight = `${this.options.padding}px`;

    // Create group header
    const header = new GUI.StackPanel();
    header.height = '30px';
    header.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

    // Create expand/collapse button
    const expandButton = new GUI.TextBlock();
    expandButton.text = group.expanded ? '▼' : '▶';
    expandButton.width = '20px';
    expandButton.color = this.options.textColor!;
    expandButton.fontSize = 12;
    expandButton.onPointerClickObservable.add(() => {
      group.toggleExpanded();
      expandButton.text = group.expanded ? '▼' : '▶';
    });

    // Create group title
    const title = new GUI.TextBlock();
    title.text = group.name;
    title.color = this.options.textColor!;
    title.fontSize = 14;
    title.fontWeight = 'bold';
    title.resizeToFit = true;

    header.addControl(expandButton);
    header.addControl(title);
    panel.addControl(header);

    // Create parameters container
    const parametersContainer = new GUI.StackPanel();
    parametersContainer.height = 'auto';
    parametersContainer.isVisible = group.expanded;

    // Add parameters
    group.getParameters().forEach((param: TweakableParameter<any>) => {
      this.createParameterControl(param, parametersContainer);
    });

    panel.addControl(parametersContainer);
    this.container.addControl(panel);
    this.groupPanels.set(group.name, panel);

    // Listen for group changes
    group.addChangeListener((event: GroupChangeEvent) => {
      if (event.type === 'parameterAdded') {
        this.createParameterControl(event.parameter, parametersContainer);
      } else if (event.type === 'parameterRemoved') {
        const control = this.parameterControls.get(event.parameter.name);
        if (control) {
          parametersContainer.removeControl(control);
          this.parameterControls.delete(event.parameter.name);
        }
      }
    });

    // Listen for parameter changes
    group.getParameters().forEach(param => {
      param.addChangeListener((event: ParameterChangeEvent<any>) => {
        const control = this.parameterControls.get(event.parameter.name);
        if (control) {
          if (control instanceof GUI.TextBlock) {
            control.text = event.parameter.getValueAsString();
          } else if (control instanceof GUI.InputText) {
            control.text = event.parameter.getValueAsString();
          }
        }
      });
    });
  }

  /**
   * Remove a parameter group from the GUI
   * @param groupName Name of the group to remove
   */
  public removeGroup(groupName: string): void {
    const group = this.groups.get(groupName);
    if (!group) {
      console.warn(`Group "${groupName}" not found in debug GUI`);
      return;
    }

    const panel = this.groupPanels.get(groupName);
    if (panel) {
      this.container.removeControl(panel);
      this.groupPanels.delete(groupName);
    }

    this.groups.delete(groupName);
  }

  /**
   * Create a GUI control for a parameter
   * @param parameter Parameter to create control for
   * @param container Container to add the control to
   */
  private createParameterControl(parameter: TweakableParameter<any>, container: GUI.StackPanel): void {
    const control = new GUI.StackPanel();
    control.height = '30px';
    control.isVertical = false;
    control.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

    // Create parameter name label
    const nameLabel = new GUI.TextBlock();
    nameLabel.text = parameter.name;
    nameLabel.width = '120px';
    nameLabel.color = this.options.textColor!;
    nameLabel.fontSize = this.options.fontSize!;
    nameLabel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

    // Create parameter value control
    let valueControl: GUI.Control;
    if (parameter instanceof NumericParameter) {
      valueControl = this.createNumericControl(parameter);
    } else if (parameter instanceof BooleanParameter) {
      valueControl = this.createBooleanControl(parameter);
    } else if (parameter instanceof StringParameter) {
      valueControl = this.createStringControl(parameter);
    } else if (parameter instanceof OptionParameter) {
      valueControl = this.createOptionControl(parameter);
    } else if (parameter instanceof Vector3Parameter) {
      valueControl = this.createVector3Control(parameter);
    } else {
      valueControl = this.createDefaultControl(parameter);
    }

    control.addControl(nameLabel);
    control.addControl(valueControl);
    container.addControl(control);
    this.parameterControls.set(parameter.name, control);
  }

  /**
   * Create a control for a numeric parameter
   */
  private createNumericControl(parameter: NumericParameter): GUI.Control {
    const container = new GUI.StackPanel();
    container.width = '150px';

    // Create value display
    const valueLabel = new GUI.TextBlock();
    valueLabel.text = parameter.getValueAsString();
    valueLabel.width = '60px';
    valueLabel.color = this.options.textColor!;
    valueLabel.fontSize = this.options.fontSize!;
    valueLabel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;

    // Create increment/decrement buttons
    const buttonContainer = new GUI.StackPanel();
    buttonContainer.width = '80px';
    buttonContainer.isVertical = false;

    const minusButton = new GUI.TextBlock();
    minusButton.text = '-';
    minusButton.width = '30px';
    minusButton.color = this.options.textColor!;
    minusButton.fontSize = this.options.fontSize!;
    minusButton.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    minusButton.onPointerClickObservable.add(() => {
      parameter.decrement();
      valueLabel.text = parameter.getValueAsString();
    });

    const plusButton = new GUI.TextBlock();
    plusButton.text = '+';
    plusButton.width = '30px';
    plusButton.color = this.options.textColor!;
    plusButton.fontSize = this.options.fontSize!;
    plusButton.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    plusButton.onPointerClickObservable.add(() => {
      parameter.increment();
      valueLabel.text = parameter.getValueAsString();
    });

    buttonContainer.addControl(minusButton);
    buttonContainer.addControl(plusButton);

    container.addControl(valueLabel);
    container.addControl(buttonContainer);

    return container;
  }

  /**
   * Create a control for a boolean parameter
   */
  private createBooleanControl(parameter: BooleanParameter): GUI.Control {
    const button = new GUI.TextBlock();
    button.text = parameter.getValueAsString();
    button.width = '60px';
    button.color = this.options.textColor!;
    button.fontSize = this.options.fontSize!;
    button.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    button.onPointerClickObservable.add(() => {
      parameter.toggle();
      button.text = parameter.getValueAsString();
    });

    return button;
  }

  /**
   * Create a control for a string parameter
   */
  private createStringControl(parameter: StringParameter): GUI.Control {
    const input = new GUI.InputText();
    input.width = '150px';
    input.height = '25px';
    input.color = this.options.textColor!;
    input.fontSize = this.options.fontSize!;
    input.background = 'rgba(0, 0, 0, 0.5)';
    input.text = parameter.getValueAsString();
    input.onTextChangedObservable.add((eventData: GUI.InputText) => {
      parameter.value = eventData.text;
    });

    return input;
  }

  /**
   * Create a control for an option parameter
   */
  private createOptionControl(parameter: OptionParameter<any>): GUI.Control {
    const container = new GUI.StackPanel();
    container.width = '150px';

    // Create value display
    const valueLabel = new GUI.TextBlock();
    valueLabel.text = parameter.getValueAsString();
    valueLabel.width = '90px';
    valueLabel.color = this.options.textColor!;
    valueLabel.fontSize = this.options.fontSize!;
    valueLabel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;

    // Create next/previous buttons
    const buttonContainer = new GUI.StackPanel();
    buttonContainer.width = '50px';

    const prevButton = new GUI.TextBlock();
    prevButton.text = '◀';
    prevButton.width = '20px';
    prevButton.color = this.options.textColor!;
    prevButton.fontSize = this.options.fontSize!;
    prevButton.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    prevButton.onPointerClickObservable.add(() => {
      parameter.previousOption();
      valueLabel.text = parameter.getValueAsString();
    });

    const nextButton = new GUI.TextBlock();
    nextButton.text = '▶';
    nextButton.width = '20px';
    nextButton.color = this.options.textColor!;
    nextButton.fontSize = this.options.fontSize!;
    nextButton.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    nextButton.onPointerClickObservable.add(() => {
      parameter.nextOption();
      valueLabel.text = parameter.getValueAsString();
    });

    buttonContainer.addControl(prevButton);
    buttonContainer.addControl(nextButton);

    container.addControl(valueLabel);
    container.addControl(buttonContainer);

    return container;
  }

  /**
   * Create a control for a Vector3 parameter
   */
  private createVector3Control(parameter: Vector3Parameter): GUI.Control {
    const container = new GUI.StackPanel();
    container.width = '200px';

    // Create component controls
    const components: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
    components.forEach((component, index) => {
      const componentContainer = new GUI.StackPanel();
      componentContainer.width = '60px';

      // Create value display
      const valueLabel = new GUI.TextBlock();
      valueLabel.text = parameter.value[component].toFixed(parameter.precision);
      valueLabel.width = '30px';
      valueLabel.color = this.options.textColor!;
      valueLabel.fontSize = this.options.fontSize!;
      valueLabel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;

      // Create increment/decrement buttons
      const buttonContainer = new GUI.StackPanel();
      buttonContainer.width = '20px';

      const minusButton = new GUI.TextBlock();
      minusButton.text = '-';
      minusButton.width = '10px';
      minusButton.color = this.options.textColor!;
      minusButton.fontSize = this.options.fontSize!;
      minusButton.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
      minusButton.onPointerClickObservable.add(() => {
        parameter.decrementComponent(component);
        valueLabel.text = parameter.value[component].toFixed(parameter.precision);
      });

      const plusButton = new GUI.TextBlock();
      plusButton.text = '+';
      plusButton.width = '10px';
      plusButton.color = this.options.textColor!;
      plusButton.fontSize = this.options.fontSize!;
      plusButton.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
      plusButton.onPointerClickObservable.add(() => {
        parameter.incrementComponent(component);
        valueLabel.text = parameter.value[component].toFixed(parameter.precision);
      });

      buttonContainer.addControl(minusButton);
      buttonContainer.addControl(plusButton);

      componentContainer.addControl(valueLabel);
      componentContainer.addControl(buttonContainer);
      container.addControl(componentContainer);

      // Add spacing between components
      if (index < 2) {
        const spacer = new GUI.TextBlock();
        spacer.text = ',';
        spacer.width = '10px';
        spacer.color = this.options.textColor!;
        spacer.fontSize = this.options.fontSize!;
        container.addControl(spacer);
      }
    });

    return container;
  }

  /**
   * Create a default control for unknown parameter types
   */
  private createDefaultControl(parameter: TweakableParameter<any>): GUI.Control {
    const label = new GUI.TextBlock();
    label.text = parameter.getValueAsString();
    label.width = '150px';
    label.color = this.options.textColor!;
    label.fontSize = this.options.fontSize!;
    label.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

    return label;
  }

  /**
   * Update the GUI
   * @param deltaTime Time elapsed since last update
   */
  public update(deltaTime: number): void {
    const now = performance.now();
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }
    this.lastUpdateTime = now;

    // Update all parameter controls
    this.parameterControls.forEach((control, paramName) => {
      const group = Array.from(this.groups.values()).find(g => g.hasParameter(paramName));
      if (group) {
        const parameter = group.getParameter(paramName);
        if (parameter) {
          // Update control based on parameter type
          if (control instanceof GUI.TextBlock) {
            control.text = parameter.getValueAsString();
          } else if (control instanceof GUI.InputText) {
            control.text = parameter.getValueAsString();
          }
        }
      }
    });
  }

  /**
   * Show the debug GUI
   */
  public show(): void {
    this.visible = true;
    this.container.isVisible = true;
  }

  /**
   * Hide the debug GUI
   */
  public hide(): void {
    this.visible = false;
    this.container.isVisible = false;
  }

  /**
   * Toggle the visibility of the debug GUI
   */
  public toggle(): void {
    this.visible = !this.visible;
    this.container.isVisible = this.visible;
  }

  /**
   * Check if the GUI is visible
   */
  public isVisible(): boolean {
    return this.visible;
  }

  /**
   * Update the position of the GUI based on options
   */
  private updatePosition(): void {
    switch (this.options.position) {
      case 'top-left':
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        break;
      case 'top-right':
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        break;
      case 'bottom-left':
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        break;
      case 'bottom-right':
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        break;
    }
  }

  /**
   * Dispose of the debug GUI
   */
  public dispose(): void {
    this.advancedTexture.dispose();
  }

  private createGroupFooter(): GUI.Control {
    const footer = new GUI.Rectangle();
    footer.width = '100%';
    footer.height = '30px';
    footer.background = this.options.backgroundColor!;
    footer.alpha = 0.7;
    
    const buttonContainer = new GUI.StackPanel();
    buttonContainer.width = '100%';
    buttonContainer.height = '25px';
    buttonContainer.isVertical = false;
    
    // Add buttons here
    // ...
    
    footer.addControl(buttonContainer);
    return footer;
  }
} 