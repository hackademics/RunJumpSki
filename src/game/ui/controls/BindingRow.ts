/**
 * @file src/game/ui/controls/BindingRow.ts
 * @description Component for an individual control binding row
 */

import { IControlBinding } from "../../input/IControlsConfig";

/**
 * Callback type for when a key is captured
 */
export type KeyCaptureCallback = (key: string) => boolean;

/**
 * Row component for a single control binding
 */
export class BindingRow {
    private container: HTMLElement;
    private label: HTMLElement;
    private keyDisplay: HTMLElement;
    private changeButton: HTMLButtonElement;
    private binding: IControlBinding;
    private onKeyCapture: KeyCaptureCallback;
    private isEditing: boolean = false;
    private listeningForKey: boolean = false;
    private keyDownHandler: (e: KeyboardEvent) => void;
    private mouseDownHandler: (e: MouseEvent) => void;
    
    /**
     * Creates a new binding row
     * @param parent Parent element to attach to
     * @param binding The binding to display
     * @param onKeyCapture Callback for key capture
     */
    constructor(
        parent: HTMLElement, 
        binding: IControlBinding,
        onKeyCapture: KeyCaptureCallback
    ) {
        this.binding = binding;
        this.onKeyCapture = onKeyCapture;
        
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'binding-row';
        
        // Create label
        this.label = document.createElement('div');
        this.label.className = 'binding-label';
        this.label.textContent = binding.displayName || binding.action;
        this.container.appendChild(this.label);
        
        // Create key display
        this.keyDisplay = document.createElement('div');
        this.keyDisplay.className = 'binding-key';
        this.keyDisplay.textContent = this.formatKeyName(binding.key);
        this.container.appendChild(this.keyDisplay);
        
        // Create change button
        this.changeButton = document.createElement('button');
        this.changeButton.className = 'binding-change-btn';
        this.changeButton.textContent = 'Change';
        this.changeButton.addEventListener('click', () => this.startListening());
        this.container.appendChild(this.changeButton);
        
        // Create event handlers
        this.keyDownHandler = this.handleKeyDown.bind(this);
        this.mouseDownHandler = this.handleMouseDown.bind(this);
        
        // Add to parent
        parent.appendChild(this.container);
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
     * Starts listening for key input
     */
    private startListening(): void {
        if (this.listeningForKey) {
            return;
        }
        
        this.listeningForKey = true;
        
        // Update UI
        this.keyDisplay.textContent = 'Press a key...';
        this.keyDisplay.classList.add('listening');
        this.changeButton.textContent = 'Cancel';
        this.changeButton.removeEventListener('click', () => this.startListening());
        this.changeButton.addEventListener('click', () => this.stopListening());
        
        // Add event listeners
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('mousedown', this.mouseDownHandler);
        
        // Set timeout to automatically cancel after 5 seconds
        setTimeout(() => {
            if (this.listeningForKey) {
                this.stopListening();
            }
        }, 5000);
    }
    
    /**
     * Stops listening for key input
     */
    private stopListening(): void {
        if (!this.listeningForKey) {
            return;
        }
        
        this.listeningForKey = false;
        
        // Update UI
        this.keyDisplay.textContent = this.formatKeyName(this.binding.key);
        this.keyDisplay.classList.remove('listening');
        this.changeButton.textContent = 'Change';
        this.changeButton.removeEventListener('click', () => this.stopListening());
        this.changeButton.addEventListener('click', () => this.startListening());
        
        // Remove event listeners
        document.removeEventListener('keydown', this.keyDownHandler);
        document.removeEventListener('mousedown', this.mouseDownHandler);
    }
    
    /**
     * Handles key down events
     * @param e Key event
     */
    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.listeningForKey) {
            return;
        }
        
        // Prevent default action
        e.preventDefault();
        e.stopPropagation();
        
        // Get key name
        const key = e.key;
        
        // Ignore modifier keys
        if (
            key === 'Control' || 
            key === 'Alt' || 
            key === 'Shift' || 
            key === 'Meta'
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
        if (!this.listeningForKey) {
            return;
        }
        
        // Prevent clicking on UI elements while listening
        const target = e.target as HTMLElement;
        if (target === this.changeButton) {
            return; // Allow clicking cancel button
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
        // Check if the key is already used
        if (this.onKeyCapture(key)) {
            // Update the binding
            this.binding.key = key;
            
            // Stop listening
            this.stopListening();
            
            // Update display
            this.keyDisplay.textContent = this.formatKeyName(key);
        } else {
            // Failed to apply - show error briefly
            const originalText = this.keyDisplay.textContent;
            this.keyDisplay.textContent = 'Already used';
            this.keyDisplay.classList.add('error');
            
            // Restore after a moment
            setTimeout(() => {
                if (this.listeningForKey) {
                    this.keyDisplay.textContent = 'Press a key...';
                    this.keyDisplay.classList.remove('error');
                } else {
                    this.keyDisplay.textContent = originalText || this.formatKeyName(this.binding.key);
                    this.keyDisplay.classList.remove('error');
                }
            }, 1500);
        }
    }
    
    /**
     * Cleans up resources
     */
    public destroy(): void {
        // Stop listening if active
        if (this.listeningForKey) {
            this.stopListening();
        }
        
        // Remove event listeners
        this.changeButton.removeEventListener('click', () => this.startListening());
        this.changeButton.removeEventListener('click', () => this.stopListening());
        
        // Remove from DOM
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 