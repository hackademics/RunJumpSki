/**
 * RaceTimingDisplay.ts
 * UI component for displaying race timing information
 */

import { EventSystem } from '../core/EventSystem';
import { RaceTimingSystem } from '../core/RaceTimingSystem';
import { Logger } from '../utils/Logger';

/**
 * Race timing display options
 */
export interface RaceTimingDisplayOptions {
    /**
     * Container element to render the display in
     */
    container: HTMLElement;
    
    /**
     * Whether to show checkpoint times
     */
    showCheckpoints?: boolean;
    
    /**
     * Whether to show split times
     */
    showSplits?: boolean;
    
    /**
     * Whether to show best times
     */
    showBestTimes?: boolean;
    
    /**
     * Whether to auto-hide the display when not racing
     */
    autoHide?: boolean;
    
    /**
     * Entity ID to track (if not provided, tracks the first entity)
     */
    entityId?: string;
}

/**
 * Race timing display
 */
export class RaceTimingDisplay {
    private logger: Logger;
    private eventSystem: EventSystem;
    private timingSystem: RaceTimingSystem;
    private container: HTMLElement;
    private elements: {
        main: HTMLElement;
        timer: HTMLElement;
        checkpoints: HTMLElement;
        status: HTMLElement;
    };
    private options: Required<RaceTimingDisplayOptions>;
    private entityId?: string;
    private updateInterval?: number;
    private bestTimes: Map<string, number> = new Map();
    private bestCheckpointTimes: Map<number, number> = new Map();
    
    /**
     * Create a new race timing display
     * @param options Display options
     */
    constructor(options: RaceTimingDisplayOptions) {
        this.logger = new Logger('RaceTimingDisplay');
        this.eventSystem = EventSystem.getInstance();
        this.timingSystem = RaceTimingSystem.getInstance();
        
        this.container = options.container;
        
        // Set default options
        this.options = {
            container: options.container,
            showCheckpoints: options.showCheckpoints ?? true,
            showSplits: options.showSplits ?? true,
            showBestTimes: options.showBestTimes ?? true,
            autoHide: options.autoHide ?? true,
            entityId: options.entityId ?? ''
        };
        
        this.entityId = options.entityId;
        
        // Create UI elements
        this.elements = this.createElements();
        
        // Register event listeners
        this.registerEventListeners();
        
        // Start update interval
        this.startUpdateInterval();
        
        this.logger.debug('Race timing display initialized');
    }
    
    /**
     * Create UI elements
     * @returns UI elements
     */
    private createElements(): {
        main: HTMLElement;
        timer: HTMLElement;
        checkpoints: HTMLElement;
        status: HTMLElement;
    } {
        // Create main container
        const main = document.createElement('div');
        main.className = 'race-timing-display';
        main.style.position = 'absolute';
        main.style.top = '10px';
        main.style.right = '10px';
        main.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        main.style.color = 'white';
        main.style.padding = '10px';
        main.style.borderRadius = '5px';
        main.style.fontFamily = 'monospace';
        main.style.fontSize = '16px';
        main.style.zIndex = '1000';
        main.style.display = this.options.autoHide ? 'none' : 'block';
        
        // Create timer element
        const timer = document.createElement('div');
        timer.className = 'race-timing-timer';
        timer.style.fontSize = '24px';
        timer.style.fontWeight = 'bold';
        timer.style.marginBottom = '5px';
        timer.textContent = '00:00.000';
        
        // Create checkpoints element
        const checkpoints = document.createElement('div');
        checkpoints.className = 'race-timing-checkpoints';
        checkpoints.style.display = this.options.showCheckpoints ? 'block' : 'none';
        
        // Create status element
        const status = document.createElement('div');
        status.className = 'race-timing-status';
        status.style.fontSize = '14px';
        status.style.marginTop = '5px';
        status.textContent = 'Ready';
        
        // Assemble elements
        main.appendChild(timer);
        main.appendChild(checkpoints);
        main.appendChild(status);
        
        // Add to container
        this.container.appendChild(main);
        
        return { main, timer, checkpoints, status };
    }
    
    /**
     * Register event listeners
     */
    private registerEventListeners(): void {
        this.eventSystem.on('race:start', this.handleRaceStart.bind(this));
        this.eventSystem.on('race:checkpoint', this.handleRaceCheckpoint.bind(this));
        this.eventSystem.on('race:finish', this.handleRaceFinish.bind(this));
        this.eventSystem.on('race:invalidFinish', this.handleInvalidFinish.bind(this));
        this.eventSystem.on('race:reset', this.handleRaceReset.bind(this));
    }
    
    /**
     * Start update interval
     */
    private startUpdateInterval(): void {
        // Update at 10Hz (10 times per second) instead of 100Hz
        // This is sufficient for a timer display and reduces performance impact
        this.updateInterval = window.setInterval(() => {
            this.updateDisplay();
        }, 100); // 100ms interval (10Hz) instead of 10ms (100Hz)
    }
    
    /**
     * Stop update interval
     */
    private stopUpdateInterval(): void {
        if (this.updateInterval) {
            window.clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
    }
    
    /**
     * Update the display
     */
    private updateDisplay(): void {
        // Get entity ID to track
        const entityId = this.getEntityToTrack();
        if (!entityId) return;
        
        // Get timing data
        const timingData = this.timingSystem.getEntityTiming(entityId);
        if (!timingData) {
            // No timing data, hide display if auto-hide is enabled
            if (this.options.autoHide) {
                this.elements.main.style.display = 'none';
            }
            return;
        }
        
        // Show display
        this.elements.main.style.display = 'block';
        
        // Update timer
        if (timingData.inProgress && !timingData.completed) {
            // Race in progress, show current time
            const currentTime = performance.now() - timingData.startTime;
            this.elements.timer.textContent = RaceTimingSystem.formatTime(currentTime);
            this.elements.timer.style.color = 'white';
        } else if (timingData.completed && timingData.totalTime !== undefined) {
            // Race completed, show final time
            this.elements.timer.textContent = RaceTimingSystem.formatTime(timingData.totalTime);
            
            // Check if this is a best time
            const bestTime = this.bestTimes.get(entityId);
            if (!bestTime || timingData.totalTime < bestTime) {
                // New best time
                this.bestTimes.set(entityId, timingData.totalTime);
                this.elements.timer.style.color = '#00ff00'; // Green for best time
            } else {
                this.elements.timer.style.color = timingData.totalTime <= bestTime ? '#00ff00' : 'white';
            }
        }
        
        // Update status
        if (timingData.inProgress && !timingData.completed) {
            this.elements.status.textContent = 'Racing';
            this.elements.status.style.color = '#00ff00'; // Green
        } else if (timingData.completed) {
            this.elements.status.textContent = 'Finished';
            this.elements.status.style.color = '#ffff00'; // Yellow
        } else {
            this.elements.status.textContent = 'Ready';
            this.elements.status.style.color = 'white';
        }
        
        // Update checkpoints if enabled
        if (this.options.showCheckpoints) {
            this.updateCheckpointsDisplay(timingData);
        }
    }
    
    /**
     * Update checkpoints display
     * @param timingData Timing data
     */
    private updateCheckpointsDisplay(timingData: any): void {
        // Clear existing checkpoints
        this.elements.checkpoints.innerHTML = '';
        
        // Get checkpoint times
        const checkpointTimes = timingData.checkpointTimes;
        if (!checkpointTimes || checkpointTimes.size === 0) return;
        
        // Create checkpoint elements
        for (const [checkpointNumber, time] of checkpointTimes.entries()) {
            const checkpointElement = document.createElement('div');
            checkpointElement.className = 'race-timing-checkpoint';
            checkpointElement.style.display = 'flex';
            checkpointElement.style.justifyContent = 'space-between';
            checkpointElement.style.marginBottom = '2px';
            
            // Checkpoint label
            const label = document.createElement('span');
            label.textContent = `CP ${checkpointNumber}:`;
            label.style.marginRight = '10px';
            
            // Checkpoint time
            const timeElement = document.createElement('span');
            timeElement.textContent = RaceTimingSystem.formatTime(time);
            
            // Check if this is a best checkpoint time
            const bestTime = this.bestCheckpointTimes.get(checkpointNumber);
            if (!bestTime || time < bestTime) {
                // New best time for this checkpoint
                this.bestCheckpointTimes.set(checkpointNumber, time);
                timeElement.style.color = '#00ff00'; // Green for best time
            } else {
                timeElement.style.color = time <= bestTime ? '#00ff00' : 'white';
            }
            
            // Add split time if enabled
            if (this.options.showSplits) {
                const splitTime = timingData.checkpointSplits.get(checkpointNumber);
                if (splitTime !== undefined) {
                    const splitElement = document.createElement('span');
                    splitElement.textContent = `(+${RaceTimingSystem.formatTime(splitTime)})`;
                    splitElement.style.marginLeft = '10px';
                    splitElement.style.color = '#aaaaaa'; // Light gray
                    timeElement.appendChild(splitElement);
                }
            }
            
            // Assemble checkpoint element
            checkpointElement.appendChild(label);
            checkpointElement.appendChild(timeElement);
            
            // Add to checkpoints container
            this.elements.checkpoints.appendChild(checkpointElement);
        }
    }
    
    /**
     * Handle race start event
     * @param event Race start event
     */
    private handleRaceStart(event: any): void {
        const { entityId } = event;
        
        // If no entity ID is set, use the first entity that starts a race
        if (!this.entityId) {
            this.entityId = entityId;
        }
        
        // Only update if this is the entity we're tracking
        if (entityId !== this.getEntityToTrack()) return;
        
        // Show display
        this.elements.main.style.display = 'block';
        
        // Reset checkpoints display
        this.elements.checkpoints.innerHTML = '';
        
        // Update status
        this.elements.status.textContent = 'Racing';
        this.elements.status.style.color = '#00ff00'; // Green
        
        this.logger.debug(`Race started for entity ${entityId}`);
    }
    
    /**
     * Handle race checkpoint event
     * @param event Race checkpoint event
     */
    private handleRaceCheckpoint(event: any): void {
        const { entityId, checkpointNumber, checkpointTime, splitTime } = event;
        
        // Only update if this is the entity we're tracking
        if (entityId !== this.getEntityToTrack()) return;
        
        this.logger.debug(`Entity ${entityId} crossed checkpoint ${checkpointNumber} in ${checkpointTime}ms`);
    }
    
    /**
     * Handle race finish event
     * @param event Race finish event
     */
    private handleRaceFinish(event: any): void {
        const { entityId, totalTime } = event;
        
        // Only update if this is the entity we're tracking
        if (entityId !== this.getEntityToTrack()) return;
        
        // Update status
        this.elements.status.textContent = 'Finished';
        this.elements.status.style.color = '#ffff00'; // Yellow
        
        // Check if this is a best time
        const bestTime = this.bestTimes.get(entityId);
        if (!bestTime || totalTime < bestTime) {
            // New best time
            this.bestTimes.set(entityId, totalTime);
            this.elements.timer.style.color = '#00ff00'; // Green for best time
        }
        
        this.logger.debug(`Entity ${entityId} finished race in ${totalTime}ms`);
    }
    
    /**
     * Handle invalid finish event
     * @param event Invalid finish event
     */
    private handleInvalidFinish(event: any): void {
        const { entityId, reason } = event;
        
        // Only update if this is the entity we're tracking
        if (entityId !== this.getEntityToTrack()) return;
        
        // Update status
        this.elements.status.textContent = 'Invalid Finish: ' + reason;
        this.elements.status.style.color = '#ff0000'; // Red
        
        this.logger.debug(`Entity ${entityId} had an invalid finish: ${reason}`);
    }
    
    /**
     * Handle race reset event
     * @param event Race reset event
     */
    private handleRaceReset(event: any): void {
        const { entityId } = event;
        
        // Only update if this is the entity we're tracking
        if (entityId !== this.getEntityToTrack()) return;
        
        // Reset display
        this.elements.timer.textContent = '00:00.000';
        this.elements.timer.style.color = 'white';
        this.elements.checkpoints.innerHTML = '';
        this.elements.status.textContent = 'Ready';
        this.elements.status.style.color = 'white';
        
        // Hide display if auto-hide is enabled
        if (this.options.autoHide) {
            this.elements.main.style.display = 'none';
        }
        
        this.logger.debug(`Race reset for entity ${entityId}`);
    }
    
    /**
     * Get the entity to track
     * @returns Entity ID to track
     */
    private getEntityToTrack(): string | undefined {
        return this.entityId;
    }
    
    /**
     * Set the entity to track
     * @param entityId Entity ID to track
     */
    public setEntityToTrack(entityId: string): void {
        this.entityId = entityId;
    }
    
    /**
     * Show the display
     */
    public show(): void {
        this.elements.main.style.display = 'block';
    }
    
    /**
     * Hide the display
     */
    public hide(): void {
        this.elements.main.style.display = 'none';
    }
    
    /**
     * Toggle the display
     * @returns New visibility state
     */
    public toggle(): boolean {
        const isVisible = this.elements.main.style.display !== 'none';
        this.elements.main.style.display = isVisible ? 'none' : 'block';
        return !isVisible;
    }
    
    /**
     * Set display options
     * @param options Display options
     */
    public setOptions(options: Partial<RaceTimingDisplayOptions>): void {
        // Update options
        this.options = {
            ...this.options,
            ...options
        };
        
        // Update UI based on new options
        this.elements.checkpoints.style.display = this.options.showCheckpoints ? 'block' : 'none';
        
        // Update entity to track
        if (options.entityId !== undefined) {
            this.entityId = options.entityId;
        }
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        // Stop update interval
        this.stopUpdateInterval();
        
        // Remove event listeners
        this.eventSystem.off('race:start', this.handleRaceStart);
        this.eventSystem.off('race:checkpoint', this.handleRaceCheckpoint);
        this.eventSystem.off('race:finish', this.handleRaceFinish);
        this.eventSystem.off('race:invalidFinish', this.handleInvalidFinish);
        this.eventSystem.off('race:reset', this.handleRaceReset);
        
        // Remove UI elements
        if (this.elements.main.parentNode) {
            this.elements.main.parentNode.removeChild(this.elements.main);
        }
        
        this.logger.debug('Race timing display disposed');
    }
} 