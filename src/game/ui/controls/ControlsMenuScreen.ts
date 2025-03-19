/**
 * @file src/game/ui/controls/ControlsMenuScreen.ts
 * @description Implements the controls menu screen for the game
 */

import { ControlBindingPanel } from "./ControlBindingPanel";
import { ControlsUIManager } from "./ControlsUIManager";
import { IControlsConfig } from "../../input/IControlsConfig";
import { KeyCaptureDialog } from "./KeyCaptureDialog";

/**
 * Controls menu screen for configuring game controls
 */
export class ControlsMenuScreen {
    private container: HTMLElement;
    private title: HTMLElement;
    private configSelector: HTMLSelectElement;
    private sensitivitySlider: HTMLInputElement;
    private invertYCheckbox: HTMLInputElement;
    private resetButton: HTMLButtonElement;
    private saveButton: HTMLButtonElement;
    private backButton: HTMLButtonElement;
    private bindingPanels: ControlBindingPanel[] = [];
    
    private uiManager: ControlsUIManager;
    private activeConfig: IControlsConfig;
    private keyCapture: KeyCaptureDialog;
    
    /**
     * Creates a new controls menu screen
     * @param parent Parent element to attach to
     * @param uiManager Controls UI manager
     */
    constructor(parent: HTMLElement, uiManager: ControlsUIManager) {
        this.uiManager = uiManager;
        this.activeConfig = uiManager.getActiveConfig();
        
        // Create root container
        this.container = document.createElement('div');
        this.container.className = 'controls-menu-screen';
        
        // Create title
        this.title = document.createElement('h1');
        this.title.textContent = 'Controls';
        this.container.appendChild(this.title);
        
        // Create config selection
        const configContainer = document.createElement('div');
        configContainer.className = 'config-selector-container';
        
        const configLabel = document.createElement('label');
        configLabel.textContent = 'Control Scheme:';
        configContainer.appendChild(configLabel);
        
        this.configSelector = document.createElement('select');
        this.populateConfigSelector();
        configContainer.appendChild(this.configSelector);
        
        const newConfigButton = document.createElement('button');
        newConfigButton.textContent = 'New';
        newConfigButton.addEventListener('click', () => this.createNewConfig());
        configContainer.appendChild(newConfigButton);
        
        this.container.appendChild(configContainer);
        
        // Create sensitivity controls
        const sensitivityContainer = document.createElement('div');
        sensitivityContainer.className = 'sensitivity-container';
        
        const sensitivityLabel = document.createElement('label');
        sensitivityLabel.textContent = 'Mouse Sensitivity:';
        sensitivityContainer.appendChild(sensitivityLabel);
        
        this.sensitivitySlider = document.createElement('input');
        this.sensitivitySlider.type = 'range';
        this.sensitivitySlider.min = '0.1';
        this.sensitivitySlider.max = '2.0';
        this.sensitivitySlider.step = '0.1';
        this.sensitivitySlider.value = this.activeConfig.mouseSensitivity.toString();
        sensitivityContainer.appendChild(this.sensitivitySlider);
        
        const sensitivityValue = document.createElement('span');
        sensitivityValue.textContent = this.activeConfig.mouseSensitivity.toString();
        this.sensitivitySlider.addEventListener('input', () => {
            sensitivityValue.textContent = this.sensitivitySlider.value;
        });
        sensitivityContainer.appendChild(sensitivityValue);
        
        this.container.appendChild(sensitivityContainer);
        
        // Create invert Y controls
        const invertContainer = document.createElement('div');
        invertContainer.className = 'invert-container';
        
        const invertLabel = document.createElement('label');
        invertLabel.textContent = 'Invert Y-Axis:';
        invertContainer.appendChild(invertLabel);
        
        this.invertYCheckbox = document.createElement('input');
        this.invertYCheckbox.type = 'checkbox';
        this.invertYCheckbox.checked = this.activeConfig.invertYAxis;
        invertContainer.appendChild(this.invertYCheckbox);
        
        this.container.appendChild(invertContainer);
        
        // Create binding panels
        const bindingsContainer = document.createElement('div');
        bindingsContainer.className = 'bindings-container';
        
        // Create a panel for each category
        for (const category of this.activeConfig.categories) {
            const panel = new ControlBindingPanel(
                bindingsContainer, 
                category,
                (action: string, key: string) => this.uiManager.updateBinding(action, key)
            );
            
            this.bindingPanels.push(panel);
        }
        
        this.container.appendChild(bindingsContainer);
        
        // Create buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        
        this.resetButton = document.createElement('button');
        this.resetButton.textContent = 'Reset to Defaults';
        this.resetButton.addEventListener('click', () => this.resetConfig());
        buttonContainer.appendChild(this.resetButton);
        
        this.saveButton = document.createElement('button');
        this.saveButton.textContent = 'Apply Changes';
        this.saveButton.addEventListener('click', () => this.saveChanges());
        buttonContainer.appendChild(this.saveButton);
        
        this.backButton = document.createElement('button');
        this.backButton.textContent = 'Back';
        this.backButton.addEventListener('click', () => this.uiManager.closeControlsMenu());
        buttonContainer.appendChild(this.backButton);
        
        this.container.appendChild(buttonContainer);
        
        // Create key capture dialog
        this.keyCapture = new KeyCaptureDialog(this.container, this.uiManager);
        
        // Add to parent
        parent.appendChild(this.container);
        
        // Set up event listeners
        this.configSelector.addEventListener('change', () => this.onConfigChange());
        
        // Initially hide
        this.hide();
    }
    
    /**
     * Shows the controls menu
     */
    public show(): void {
        // Refresh to get latest config
        this.refreshControls();
        this.container.style.display = 'flex';
    }
    
    /**
     * Hides the controls menu
     */
    public hide(): void {
        this.container.style.display = 'none';
    }
    
    /**
     * Resets the active configuration
     */
    private resetConfig(): void {
        if (confirm('Reset all controls to default settings?')) {
            this.uiManager.resetActiveConfig();
            this.refreshControls();
        }
    }
    
    /**
     * Saves the current settings
     */
    private saveChanges(): void {
        // Update sensitivity and invert settings
        this.uiManager.updateMouseSettings(
            parseFloat(this.sensitivitySlider.value),
            this.invertYCheckbox.checked
        );
        
        // Notify of changes
        this.uiManager.applyChanges();
    }
    
    /**
     * Handles changing the selected config
     */
    private onConfigChange(): void {
        const configId = this.configSelector.value;
        if (this.uiManager.setActiveConfig(configId)) {
            this.refreshControls();
        }
    }
    
    /**
     * Refreshes the UI with the current configuration
     */
    private refreshControls(): void {
        // Get the current config
        this.activeConfig = this.uiManager.getActiveConfig();
        
        // Update sensitivity and invert controls
        this.sensitivitySlider.value = this.activeConfig.mouseSensitivity.toString();
        this.invertYCheckbox.checked = this.activeConfig.invertYAxis;
        
        // Refresh binding panels
        this.bindingPanels.forEach(panel => panel.destroy());
        this.bindingPanels = [];
        
        const bindingsContainer = this.container.querySelector('.bindings-container');
        if (bindingsContainer) {
            // Clear existing panels
            bindingsContainer.innerHTML = '';
            
            // Create new panels
            for (const category of this.activeConfig.categories) {
                const panel = new ControlBindingPanel(
                    bindingsContainer as HTMLElement, 
                    category,
                    (action: string, key: string) => this.uiManager.updateBinding(action, key)
                );
                
                this.bindingPanels.push(panel);
            }
        }
        
        // Refresh config selector
        this.populateConfigSelector();
    }
    
    /**
     * Populates the config selector with available configurations
     */
    private populateConfigSelector(): void {
        // Save current selection
        const currentValue = this.configSelector.value;
        
        // Clear existing options
        this.configSelector.innerHTML = '';
        
        // Add all available configs
        const configs = this.uiManager.getAllConfigs();
        for (const config of configs) {
            const option = document.createElement('option');
            option.value = config.id;
            option.textContent = config.name;
            option.selected = config.id === this.activeConfig.id;
            this.configSelector.appendChild(option);
        }
        
        // Restore selection if it exists
        if (currentValue && this.configSelector.querySelector(`option[value="${currentValue}"]`)) {
            this.configSelector.value = currentValue;
        }
    }
    
    /**
     * Creates a new control config
     */
    private createNewConfig(): void {
        const name = prompt('Enter a name for the new control configuration:');
        if (name) {
            const id = 'custom_' + Date.now();
            const newConfig = this.uiManager.createConfig(id, name, this.activeConfig.id);
            
            if (newConfig) {
                this.populateConfigSelector();
                this.configSelector.value = id;
                this.onConfigChange();
            }
        }
    }
    
    /**
     * Cleans up resources
     */
    public destroy(): void {
        // Clean up binding panels
        this.bindingPanels.forEach(panel => panel.destroy());
        
        // Clean up key capture dialog
        this.keyCapture.destroy();
        
        // Remove from DOM
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 