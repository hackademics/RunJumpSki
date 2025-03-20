/**
 * @file src/game/ui/controls/ControlBindingPanel.ts
 * @description Panel component for displaying and configuring a category of control bindings
 */

import { IControlCategory, IControlBinding } from "../../input/IControlsConfig";
import { BindingRow } from "./BindingRow";
import { EventListenerManager } from "../../../core/utils/EventListenerManager";
import { ServiceLocator } from "../../../core/base/ServiceLocator";
import { Logger } from "../../../core/utils/Logger";

/**
 * Callback type for binding changes
 */
export type BindingChangeCallback = (action: string, key: string) => boolean;

/**
 * Panel for a category of control bindings
 */
export class ControlBindingPanel {
    private container: HTMLElement;
    private title: HTMLElement;
    private bindingList: HTMLElement;
    private category: IControlCategory;
    private onBindingChange: BindingChangeCallback;
    private bindingRows: BindingRow[] = [];
    private eventListenerManager: EventListenerManager;
    private logger: Logger;
    
    /**
     * Creates a new binding panel
     * @param parent Parent element to attach to
     * @param category The control category to display
     * @param onBindingChange Callback for binding changes
     * @param eventListenerManager Optional event listener manager
     */
    constructor(
        parent: HTMLElement, 
        category: IControlCategory,
        onBindingChange: BindingChangeCallback,
        eventListenerManager?: EventListenerManager
    ) {
        this.category = category;
        this.onBindingChange = onBindingChange;
        
        // Initialize EventListenerManager and Logger
        this.eventListenerManager = eventListenerManager || new EventListenerManager();
        
        // Get logger from ServiceLocator or create a new one
        try {
            const serviceLocator = ServiceLocator.getInstance();
            this.logger = serviceLocator.has('logger') 
                ? serviceLocator.get<Logger>('logger') 
                : new Logger('ControlBindingPanel');
        } catch (e) {
            this.logger = new Logger('ControlBindingPanel');
        }
        
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'binding-panel';
        this.container.dataset.category = category.id;
        
        // Create title
        this.title = document.createElement('h2');
        this.title.textContent = category.name;
        this.container.appendChild(this.title);
        
        // Create binding list
        this.bindingList = document.createElement('div');
        this.bindingList.className = 'binding-list';
        this.container.appendChild(this.bindingList);
        
        // Create binding rows
        for (const binding of category.bindings) {
            if (!binding.canRebind) {
                this.createReadOnlyRow(binding);
            } else {
                this.createBindingRow(binding);
            }
        }
        
        // Add to parent
        parent.appendChild(this.container);
        
        this.logger.debug(`ControlBindingPanel created for category: ${category.name}`);
    }
    
    /**
     * Creates a new binding row
     */
    private createBindingRow(binding: IControlBinding): void {
        const row = new BindingRow(
            this.bindingList, 
            binding,
            (key: string) => this.onBindingChange(binding.action, key),
            this.eventListenerManager
        );
        
        this.bindingRows.push(row);
    }
    
    /**
     * Creates a read-only row for bindings that can't be changed
     */
    private createReadOnlyRow(binding: IControlBinding): void {
        const container = document.createElement('div');
        container.className = 'binding-row readonly';
        
        const label = document.createElement('div');
        label.className = 'binding-label';
        label.textContent = binding.displayName || binding.action;
        container.appendChild(label);
        
        const keyDisplay = document.createElement('div');
        keyDisplay.className = 'binding-key';
        keyDisplay.textContent = this.formatKeyName(binding.key);
        container.appendChild(keyDisplay);
        
        this.bindingList.appendChild(container);
    }
    
    /**
     * Formats key names for display
     */
    private formatKeyName(key: string): string {
        // Format special keys
        switch (key) {
            case ' ':
                return 'Space';
            case 'ArrowUp':
                return '↑';
            case 'ArrowDown':
                return '↓';
            case 'ArrowLeft':
                return '←';
            case 'ArrowRight':
                return '→';
            case 'MouseLeft':
                return 'Left Click';
            case 'MouseRight':
                return 'Right Click';
            case 'MouseMiddle':
                return 'Middle Click';
            case 'MouseX':
                return 'Mouse X-Axis';
            case 'MouseY':
                return 'Mouse Y-Axis';
            default:
                return key;
        }
    }
    
    /**
     * Cleans up resources
     */
    public dispose(): void {
        // Clean up all binding rows
        this.bindingRows.forEach(row => row.dispose());
        this.bindingRows = [];
        
        // Remove from DOM
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        this.logger.debug(`ControlBindingPanel disposed for category: ${this.category.name}`);
    }
} 
