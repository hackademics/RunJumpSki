/**
 * @file src/game/ui/controls/BindingRow.ts
 * @description Component for an individual control binding row
 */

import { IControlBinding } from "../../input/IControlsConfig";
import { EventListenerManager } from "../../../core/utils/EventListenerManager";
import { ServiceLocator } from "../../../core/base/ServiceLocator";
import { Logger } from "../../../core/utils/Logger";

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
    private handleStartListening: () => void;
    private handleStopListening: () => void;
    private eventListenerManager: EventListenerManager;
    private logger: Logger;
    
    /**
     * Creates a new binding row
     * @param parent Parent element to attach to
     * @param binding The binding to display
     * @param onKeyCapture Callback for key capture
     * @param eventListenerManager Optional event listener manager
     */
    constructor(
        parent: HTMLElement, 
        binding: IControlBinding,
        onKeyCapture: KeyCaptureCallback,
        eventListenerManager?: EventListenerManager
    ) {
        this.binding = binding;
        this.onKeyCapture = onKeyCapture;
        
        // Initialize EventListenerManager and Logger
        this.eventListenerManager = eventListenerManager || new EventListenerManager();
        
        // Get logger from ServiceLocator or create a new one
        try {
            const serviceLocator = ServiceLocator.getInstance();
            this.logger = serviceLocator.has('logger') 
                ? serviceLocator.get<Logger>('logger') 
                : new Logger('BindingRow');
        } catch (e) {
            this.logger = new Logger('BindingRow');
        }
        
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
        
        // Bind event handlers to maintain consistent references
        this.handleStartListening = this.startListening.bind(this);
        this.handleStopListening = this.stopListening.bind(this);
        this.keyDownHandler = this.handleKeyDown.bind(this);
        this.mouseDownHandler = this.handleMouseDown.bind(this);
        
        // Use EventListenerManager for button click
        this.eventListenerManager.addDOMListener(
            this.changeButton,
            'click',
            this.handleStartListening as EventListener,
            undefined,
            `bindingRow_${binding.action}`
        );
        
        this.container.appendChild(this.changeButton);
        
        // Add to parent
        parent.appendChild(this.container);
        
        this.logger.debug(`BindingRow created for action: ${binding.action}`);
    }
    
    /**
     * Formats key names for display
     */
    private formatKeyName(key: string): string {
        // Special format for common keys
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
        
        // Switch button event listener
        this.eventListenerManager.removeListenersByGroup(`bindingRow_${this.binding.action}`);
        this.eventListenerManager.addDOMListener(
            this.changeButton,
            'click',
            this.handleStopListening as EventListener,
            undefined,
            `bindingRow_${this.binding.action}`
        );
        
        // Add event listeners using EventListenerManager
        this.eventListenerManager.addDOMListener(
            document,
            'keydown',
            this.keyDownHandler as EventListener,
            undefined,
            `bindingRow_${this.binding.action}`
        );
        
        this.eventListenerManager.addDOMListener(
            document,
            'mousedown',
            this.mouseDownHandler as EventListener,
            undefined,
            `bindingRow_${this.binding.action}`
        );
        
        this.logger.debug(`Started listening for key input for action: ${this.binding.action}`);
        
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
        
        // Switch button event listener
        this.eventListenerManager.removeListenersByGroup(`bindingRow_${this.binding.action}`);
        this.eventListenerManager.addDOMListener(
            this.changeButton,
            'click',
            this.handleStartListening as EventListener,
            undefined,
            `bindingRow_${this.binding.action}`
        );
        
        this.logger.debug(`Stopped listening for key input for action: ${this.binding.action}`);
    }
    
    /**
     * Handles key down events
     * @param e Key event
     */
    private handleKeyDown(e: Event): void {
        const keyEvent = e as KeyboardEvent;
        
        if (!this.listeningForKey) {
            return;
        }
        
        // Prevent default action
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        
        // Get key name
        const key = keyEvent.key;
        
        // Ignore modifier keys
        if (
            key === 'Control' || 
            key === 'Alt' || 
            key === 'Shift' || 
            key === 'Meta'
        ) {
            return;
        }
        
        // If Escape, cancel
        if (key === 'Escape') {
            this.stopListening();
            return;
        }
        
        // Apply the key
        this.applyKey(key);
    }
    
    /**
     * Handles mouse down events
     * @param e Mouse event
     */
    private handleMouseDown(e: Event): void {
        const mouseEvent = e as MouseEvent;
        
        if (!this.listeningForKey) {
            return;
        }
        
        // Ignore clicks on this component
        if (this.container.contains(mouseEvent.target as Node)) {
            return;
        }
        
        // Prevent default action
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();
        
        // Map mouse buttons to key names
        let key = '';
        switch (mouseEvent.button) {
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
        // Call the callback to update the binding
        const success = this.onKeyCapture(key);
        
        if (success) {
            // Update the binding and UI
            this.binding.key = key;
            this.keyDisplay.textContent = this.formatKeyName(key);
            this.logger.debug(`Binding updated for ${this.binding.action}: ${key}`);
        } else {
            // Show error
            this.keyDisplay.textContent = 'Key in use';
            this.logger.warn(`Failed to update binding for ${this.binding.action} with key ${key}: already in use`);
            
            // Reset after a short delay
            setTimeout(() => {
                if (this.listeningForKey) {
                    this.keyDisplay.textContent = 'Press a key...';
                } else {
                    this.keyDisplay.textContent = this.formatKeyName(this.binding.key);
                }
            }, 1500);
        }
        
        // Stop listening
        this.stopListening();
    }
    
    /**
     * Cleans up resources
     */
    public dispose(): void {
        // Stop listening if active
        if (this.listeningForKey) {
            this.stopListening();
        }
        
        // Remove all event listeners for this component
        this.eventListenerManager.removeListenersByGroup(`bindingRow_${this.binding.action}`);
        
        // Remove from DOM
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        this.logger.debug(`BindingRow disposed for action: ${this.binding.action}`);
    }
} 
