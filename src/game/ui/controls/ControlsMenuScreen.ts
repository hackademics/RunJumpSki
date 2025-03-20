/**
 * @file src/game/ui/controls/ControlsMenuScreen.ts
 * @description Implements the controls menu screen for the game
 */

import { ControlBindingPanel } from "./ControlBindingPanel";
import { ControlsUIManager } from "./ControlsUIManager";
import { IControlsConfig } from "../../input/IControlsConfig";
import { KeyCaptureDialog } from "./KeyCaptureDialog";
import { EventListenerManager } from "../../../core/utils/EventListenerManager";
import { ServiceLocator } from "../../../core/base/ServiceLocator";
import { Logger } from "../../../core/utils/Logger";

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
    private eventListenerManager: EventListenerManager;
    private logger: Logger;
    
    /**
     * Creates a new controls menu screen
     * @param parent Parent element to attach to
     * @param uiManager Controls UI manager
     * @param eventListenerManager Optional event listener manager
     */
    constructor(
        parent: HTMLElement, 
        uiManager: ControlsUIManager,
        eventListenerManager?: EventListenerManager
    ) {
        this.uiManager = uiManager;
        this.activeConfig = uiManager.getActiveConfig();
        
        // Initialize EventListenerManager and Logger
        this.eventListenerManager = eventListenerManager || new EventListenerManager();
        
        // Get logger from ServiceLocator or create a new one
        try {
            const serviceLocator = ServiceLocator.getInstance();
            this.logger = serviceLocator.has('logger') 
                ? serviceLocator.get<Logger>('logger') 
                : new Logger('ControlsMenuScreen');
        } catch (e) {
            this.logger = new Logger('ControlsMenuScreen');
        }
        
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
        configLabel.textContent = 'Configuration: ';
        configContainer.appendChild(configLabel);
        
        this.configSelector = document.createElement('select');
        configContainer.appendChild(this.configSelector);
        
        // New config button
        const newConfigButton = document.createElement('button');
        newConfigButton.textContent = 'New';
        this.eventListenerManager.addDOMListener(
            newConfigButton,
            'click',
            (() => this.createNewConfig()) as EventListener,
            undefined,
            'controlsMenuScreen'
        );
        configContainer.appendChild(newConfigButton);
        
        this.container.appendChild(configContainer);
        
        // Create mouse sensitivity controls
        const mouseContainer = document.createElement('div');
        mouseContainer.className = 'mouse-settings-container';
        
        const sensitivityLabel = document.createElement('label');
        sensitivityLabel.textContent = 'Mouse Sensitivity: ';
        mouseContainer.appendChild(sensitivityLabel);
        
        this.sensitivitySlider = document.createElement('input');
        this.sensitivitySlider.type = 'range';
        this.sensitivitySlider.min = '0.1';
        this.sensitivitySlider.max = '2';
        this.sensitivitySlider.step = '0.1';
        this.sensitivitySlider.value = this.activeConfig.mouseSensitivity.toString();
        mouseContainer.appendChild(this.sensitivitySlider);
        
        const invertContainer = document.createElement('div');
        this.invertYCheckbox = document.createElement('input');
        this.invertYCheckbox.type = 'checkbox';
        this.invertYCheckbox.checked = this.activeConfig.invertYAxis;
        invertContainer.appendChild(this.invertYCheckbox);
        
        const invertLabel = document.createElement('label');
        invertLabel.textContent = 'Invert Y-Axis';
        invertContainer.appendChild(invertLabel);
        
        mouseContainer.appendChild(invertContainer);
        this.container.appendChild(mouseContainer);
        
        // Create bindings container
        const bindingsContainer = document.createElement('div');
        bindingsContainer.className = 'bindings-container';
        this.container.appendChild(bindingsContainer);
        
        // Create key capture dialog
        this.keyCapture = new KeyCaptureDialog(
            this.container, 
            this.uiManager,
            this.eventListenerManager
        );
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'controls-buttons-container';
        
        // Reset button
        this.resetButton = document.createElement('button');
        this.resetButton.textContent = 'Reset to Default';
        this.eventListenerManager.addDOMListener(
            this.resetButton,
            'click',
            (() => this.resetConfig()) as EventListener,
            undefined,
            'controlsMenuScreen'
        );
        buttonsContainer.appendChild(this.resetButton);
        
        // Save button
        this.saveButton = document.createElement('button');
        this.saveButton.textContent = 'Save Changes';
        this.eventListenerManager.addDOMListener(
            this.saveButton,
            'click',
            (() => this.saveChanges()) as EventListener,
            undefined,
            'controlsMenuScreen'
        );
        buttonsContainer.appendChild(this.saveButton);
        
        // Back button
        this.backButton = document.createElement('button');
        this.backButton.textContent = 'Back';
        this.eventListenerManager.addDOMListener(
            this.backButton,
            'click',
            (() => this.uiManager.closeControlsMenu()) as EventListener,
            undefined,
            'controlsMenuScreen'
        );
        buttonsContainer.appendChild(this.backButton);
        
        this.container.appendChild(buttonsContainer);
        
        // Add to parent
        parent.appendChild(this.container);
        
        // Set up event listeners with EventListenerManager
        this.eventListenerManager.addDOMListener(
            this.configSelector,
            'change',
            (() => this.onConfigChange()) as EventListener,
            undefined,
            'controlsMenuScreen'
        );
        
        // Initially hide
        this.hide();
        
        this.logger.debug('ControlsMenuScreen created');
    }
    
    /**
     * Shows the controls menu
     */
    public show(): void {
        // Refresh to get latest config
        this.refreshControls();
        this.container.style.display = 'flex';
        this.logger.debug('ControlsMenuScreen shown');
    }
    
    /**
     * Hides the controls menu
     */
    public hide(): void {
        this.container.style.display = 'none';
        this.logger.debug('ControlsMenuScreen hidden');
    }
    
    /**
     * Resets the active configuration
     */
    private resetConfig(): void {
        if (confirm('Reset all controls to default settings?')) {
            this.uiManager.resetActiveConfig();
            this.refreshControls();
            this.logger.debug('Controls reset to default');
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
        this.logger.debug('Control settings saved');
    }
    
    /**
     * Handles changing the selected config
     */
    private onConfigChange(): void {
        const configId = this.configSelector.value;
        if (this.uiManager.setActiveConfig(configId)) {
            this.refreshControls();
            this.logger.debug(`Config changed to: ${configId}`);
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
        this.bindingPanels.forEach(panel => panel.dispose());
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
                    (action: string, key: string) => this.uiManager.updateBinding(action, key),
                    this.eventListenerManager
                );
                
                this.bindingPanels.push(panel);
            }
        }
        
        // Refresh config selector
        this.populateConfigSelector();
        
        this.logger.debug('Controls UI refreshed');
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
                this.logger.debug(`New config created: ${name} (${id})`);
            }
        }
    }
    
    /**
     * Cleans up resources
     */
    public dispose(): void {
        // Clean up binding panels
        this.bindingPanels.forEach(panel => panel.dispose());
        
        // Clean up key capture dialog
        this.keyCapture.dispose();
        
        // Remove all event listeners
        this.eventListenerManager.removeListenersByGroup('controlsMenuScreen');
        
        // Remove from DOM
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        this.logger.debug('ControlsMenuScreen disposed');
    }
} 
