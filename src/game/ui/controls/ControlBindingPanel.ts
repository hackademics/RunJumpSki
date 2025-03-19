/**
 * @file src/game/ui/controls/ControlBindingPanel.ts
 * @description Panel component for displaying and configuring a category of control bindings
 */

import { IControlCategory, IControlBinding } from "../../input/IControlsConfig";
import { BindingRow } from "./BindingRow";

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
    
    /**
     * Creates a new binding panel
     * @param parent Parent element to attach to
     * @param category The control category to display
     * @param onBindingChange Callback for binding changes
     */
    constructor(
        parent: HTMLElement, 
        category: IControlCategory,
        onBindingChange: BindingChangeCallback
    ) {
        this.category = category;
        this.onBindingChange = onBindingChange;
        
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
        
        // Add rows for each binding
        for (const binding of category.bindings) {
            // Skip non-rebindable controls
            if (binding.canRebind === false) {
                this.createReadOnlyRow(binding);
                continue;
            }
            
            // Create interactive binding row
            const row = new BindingRow(
                this.bindingList,
                binding,
                (key: string) => this.onBindingChange(binding.action, key)
            );
            this.bindingRows.push(row);
        }
        
        this.container.appendChild(this.bindingList);
        parent.appendChild(this.container);
    }
    
    /**
     * Creates a read-only row for non-rebindable controls
     * @param binding The binding to display
     */
    private createReadOnlyRow(binding: IControlBinding): void {
        const row = document.createElement('div');
        row.className = 'binding-row readonly';
        
        const label = document.createElement('div');
        label.className = 'binding-label';
        label.textContent = binding.displayName || binding.action;
        row.appendChild(label);
        
        const keyDisplay = document.createElement('div');
        keyDisplay.className = 'binding-key';
        keyDisplay.textContent = this.formatKeyName(binding.key);
        row.appendChild(keyDisplay);
        
        const lockIcon = document.createElement('div');
        lockIcon.className = 'binding-lock';
        lockIcon.innerHTML = '🔒'; // Lock icon
        row.appendChild(lockIcon);
        
        this.bindingList.appendChild(row);
    }
    
    /**
     * Formats a key name for display
     * @param key The key to format
     * @returns Formatted key name
     */
    private formatKeyName(key: string): string {
        // Format special keys
        switch (key) {
            case ' ':
                return 'Space';
            case 'MouseLeft':
                return 'Left Mouse';
            case 'MouseRight':
                return 'Right Mouse';
            case 'MouseMiddle':
                return 'Middle Mouse';
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
    public destroy(): void {
        // Clean up binding rows
        this.bindingRows.forEach(row => row.destroy());
        
        // Remove from DOM
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 