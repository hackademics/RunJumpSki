/**
 * @file src/game/ui/controls/KeyCaptureDialog.ts
 * @description Modal dialog for capturing key presses for control binding
 */

import { ControlsUIManager } from "./ControlsUIManager";

/**
 * Modal dialog for capturing key input
 */
export class KeyCaptureDialog {
    private container: HTMLElement;
    private overlay: HTMLElement;
    private dialog: HTMLElement;
    private title: HTMLElement;
    private message: HTMLElement;
    private cancelButton: HTMLButtonElement;
    
    private uiManager: ControlsUIManager;
    private currentAction: string | null = null;
    private keyDownHandler: (e: KeyboardEvent) => void;
    private mouseDownHandler: (e: MouseEvent) => void;
    private active: boolean = false;
    private handleCancelClick: () => void;
    
    /**
     * Creates a new key capture dialog
     * @param parent Parent element to attach to
     * @param uiManager Controls UI manager
     */
    constructor(parent: HTMLElement, uiManager: ControlsUIManager) {
        this.uiManager = uiManager;
        
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'key-capture-overlay';
        
        // Create dialog container
        this.dialog = document.createElement('div');
        this.dialog.className = 'key-capture-dialog';
        
        // Create title
        this.title = document.createElement('h3');
        this.title.textContent = 'Rebind Control';
        this.dialog.appendChild(this.title);
        
        // Create message
        this.message = document.createElement('div');
        this.message.className = 'key-capture-message';
        this.message.textContent = 'Press any key to bind to this action...';
        this.dialog.appendChild(this.message);
        
        // Create cancel button
        this.cancelButton = document.createElement('button');
        this.cancelButton.textContent = 'Cancel';
        this.handleCancelClick = () => this.hide();
        this.cancelButton.addEventListener('click', this.handleCancelClick);
        this.dialog.appendChild(this.cancelButton);
        
        // Add dialog to overlay
        this.overlay.appendChild(this.dialog);
        
        // Create event handlers
        this.keyDownHandler = this.handleKeyDown.bind(this);
        this.mouseDownHandler = this.handleMouseDown.bind(this);
        
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'key-capture-container';
        this.container.appendChild(this.overlay);
        
        // Add to parent
        parent.appendChild(this.container);
        
        // Initially hide
        this.hide();
    }
    
    /**
     * Shows the dialog for a specific action
     * @param action The action to bind
     * @param actionName User-friendly name for the action
     */
    public show(action: string, actionName: string): void {
        if (this.active) {
            return;
        }
        
        this.active = true;
        this.currentAction = action;
        
        // Update UI
        this.title.textContent = `Rebind: ${actionName}`;
        this.message.textContent = 'Press any key to bind to this action...';
        this.container.style.display = 'block';
        
        // Add event listeners
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('mousedown', this.mouseDownHandler);
        
        // Set timeout to automatically cancel after 10 seconds
        setTimeout(() => {
            if (this.active) {
                this.hide();
            }
        }, 10000);
    }
    
    /**
     * Hides the dialog
     */
    public hide(): void {
        if (!this.active) {
            return;
        }
        
        this.active = false;
        this.currentAction = null;
        
        // Update UI
        this.container.style.display = 'none';
        
        // Remove event listeners
        document.removeEventListener('keydown', this.keyDownHandler);
        document.removeEventListener('mousedown', this.mouseDownHandler);
    }
    
    /**
     * Handles key down events
     * @param e Key event
     */
    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.active || !this.currentAction) {
            return;
        }
        
        // Prevent default action
        e.preventDefault();
        e.stopPropagation();
        
        // Get key name
        const key = e.key;
        
        // Ignore modifier keys and escape (used for cancel)
        if (
            key === 'Control' || 
            key === 'Alt' || 
            key === 'Shift' || 
            key === 'Meta' ||
            key === 'Escape'
        ) {
            return;
        }
        
        // Apply the key
        this.applyKey(key);
    }
    
    /**
     * Handles mouse down events
     * @param e Mouse event
     */
    private handleMouseDown(e: MouseEvent): void {
        if (!this.active || !this.currentAction) {
            return;
        }
        
        // Ignore clicks on the dialog itself
        if (this.dialog.contains(e.target as Node)) {
            return;
        }
        
        // Prevent default action
        e.preventDefault();
        e.stopPropagation();
        
        // Map mouse buttons to key names
        let key = '';
        switch (e.button) {
            case 0:
                key = 'MouseLeft';
                break;
            case 1:
                key = 'MouseMiddle';
                break;
            case 2:
                key = 'MouseRight';
                break;
            default:
                return; // Ignore other buttons
        }
        
        // Apply the key
        this.applyKey(key);
    }
    
    /**
     * Applies a new key binding
     * @param key The key to apply
     */
    private applyKey(key: string): void {
        if (!this.currentAction) {
            return;
        }
        
        // Check if successful
        if (this.uiManager.updateBinding(this.currentAction, key)) {
            this.hide();
        } else {
            // Show error message
            this.message.textContent = 'This key is already in use. Try another key...';
        }
    }
    
    /**
     * Cleans up resources
     */
    public destroy(): void {
        // Hide if active
        if (this.active) {
            this.hide();
        }
        
        // Remove event listeners - use proper reference to the event handler instead of an inline function
        this.cancelButton.removeEventListener('click', this.handleCancelClick);
        
        // Remove from DOM
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 