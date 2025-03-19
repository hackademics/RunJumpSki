/**
 * @file src/game/ui/controls/ControlsUIManager.ts
 * @description Manages UI state for control configuration
 */

import { ControlsManager } from "../../input/ControlsManager";
import { IControlsConfig } from "../../input/IControlsConfig";
import { GameInputMapper } from "../../input/GameInputMapper";
import { EventEmitter } from "../../../core/events/EventEmitter";
import { InputEventType } from "../../input/InputEvents";

/**
 * Manages UI state for control configuration
 */
export class ControlsUIManager {
    private controlsManager: ControlsManager;
    private eventEmitter: EventEmitter;
    private gameInputMapper: GameInputMapper;
    private isOpen: boolean = false;
    private onClose: (() => void) | null = null;
    
    /**
     * Creates a new ControlsUIManager
     * @param controlsManager Controls manager instance
     * @param eventEmitter Event emitter for control change events
     * @param gameInputMapper Game input mapper instance
     */
    constructor(
        controlsManager: ControlsManager,
        eventEmitter: EventEmitter,
        gameInputMapper: GameInputMapper
    ) {
        this.controlsManager = controlsManager;
        this.eventEmitter = eventEmitter;
        this.gameInputMapper = gameInputMapper;
    }
    
    /**
     * Gets the active controls configuration
     */
    public getActiveConfig(): IControlsConfig {
        return this.controlsManager.getActiveConfig();
    }
    
    /**
     * Gets all available control configurations
     */
    public getAllConfigs(): IControlsConfig[] {
        return this.controlsManager.getAllConfigs();
    }
    
    /**
     * Sets the active controls configuration
     * @param configId ID of the configuration to activate
     * @returns True if successful
     */
    public setActiveConfig(configId: string): boolean {
        return this.controlsManager.setActiveConfig(configId);
    }
    
    /**
     * Creates a new control configuration
     * @param id ID for the new configuration
     * @param name Display name for the configuration
     * @param basedOn Optional ID of configuration to base on
     * @returns The new configuration
     */
    public createConfig(id: string, name: string, basedOn?: string): IControlsConfig {
        return this.controlsManager.createConfig(id, name, basedOn);
    }
    
    /**
     * Deletes a control configuration
     * @param configId ID of the configuration to delete
     * @returns True if successful
     */
    public deleteConfig(configId: string): boolean {
        return this.controlsManager.deleteConfig(configId);
    }
    
    /**
     * Updates a binding in the active configuration
     * @param action Action to rebind
     * @param key New key to bind
     * @returns True if successful
     */
    public updateBinding(action: string, key: string): boolean {
        return this.controlsManager.updateBinding(action, key);
    }
    
    /**
     * Updates mouse settings in the active configuration
     * @param sensitivity Mouse sensitivity
     * @param invertYAxis Whether to invert the Y axis
     */
    public updateMouseSettings(sensitivity: number, invertYAxis: boolean): void {
        const activeConfig = this.controlsManager.getActiveConfig();
        
        // Update the config
        activeConfig.mouseSensitivity = sensitivity;
        activeConfig.invertYAxis = invertYAxis;
        
        // Apply to input mapper
        this.applyMouseSettings(sensitivity, invertYAxis);
        
        // Emit event
        this.eventEmitter.emit(InputEventType.INPUT_CONTEXT_CHANGED, {
            mouseSensitivity: sensitivity,
            invertYAxis: invertYAxis
        });
    }
    
    /**
     * Applies mouse settings to the game
     * @param sensitivity Mouse sensitivity
     * @param invertYAxis Whether to invert the Y axis
     */
    private applyMouseSettings(sensitivity: number, invertYAxis: boolean): void {
        // Find mouse Y binding
        const yBinding = this.gameInputMapper.getBindingConfig('MouseY');
        if (yBinding) {
            yBinding.isInverted = invertYAxis;
            yBinding.sensitivity = sensitivity;
        }
        
        // Find mouse X binding
        const xBinding = this.gameInputMapper.getBindingConfig('MouseX');
        if (xBinding) {
            xBinding.sensitivity = sensitivity;
        }
    }
    
    /**
     * Resets the active configuration to defaults
     */
    public resetActiveConfig(): void {
        this.controlsManager.resetActiveConfig();
    }
    
    /**
     * Opens the controls menu
     * @param onClose Callback for when the menu is closed
     */
    public openControlsMenu(onClose?: () => void): void {
        this.isOpen = true;
        this.onClose = onClose || null;
        
        // Event will be handled by the menu screen
        this.eventEmitter.emit('ui.controls.open', null);
    }
    
    /**
     * Closes the controls menu
     */
    public closeControlsMenu(): void {
        this.isOpen = false;
        
        // Event will be handled by the menu screen
        this.eventEmitter.emit('ui.controls.close', null);
        
        // Call the close callback if provided
        if (this.onClose) {
            this.onClose();
            this.onClose = null;
        }
    }
    
    /**
     * Applies all changes to the controls
     */
    public applyChanges(): void {
        // Nothing specific to do here - changes are applied immediately
        // Just close the menu
        this.closeControlsMenu();
    }
    
    /**
     * Checks if the controls menu is open
     */
    public isControlsMenuOpen(): boolean {
        return this.isOpen;
    }
} 