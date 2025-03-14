/**
 * RaceTimingSystem.ts
 * 
 * The RaceTimingSystem is responsible for tracking race timing data for entities
 * as they cross start, checkpoint, and finish markers. It provides functionality for:
 * 
 * - Starting races when entities cross start markers
 * - Recording checkpoint times and calculating splits
 * - Validating checkpoint order and completion
 * - Finishing races and calculating total times
 * - Resetting timing data
 * 
 * The system uses the EventSystem to communicate with other components and
 * emits events for race start, checkpoint crossing, race finish, and race reset.
 */

import { EventSystem } from './EventSystem';
import { GameEventType, MarkerStartEvent, MarkerFinishEvent, MarkerCheckpointEvent } from '../types/events/EventTypes';
import { Logger } from '../utils/Logger';

/**
 * Race timing data for a single entity
 * 
 * This interface represents all timing data for a single entity's race attempt,
 * including start time, checkpoint times, split times, and completion status.
 */
export interface RaceTimingData {
    /**
     * Entity ID
     */
    entityId: string;
    
    /**
     * Start time (ms)
     * 
     * The time when the entity crossed the start marker, in milliseconds
     * since the page was loaded (from performance.now()).
     */
    startTime: number;
    
    /**
     * Finish time (ms)
     * 
     * The time when the entity crossed the finish marker, in milliseconds
     * since the page was loaded (from performance.now()).
     */
    finishTime?: number;
    
    /**
     * Total race time (ms)
     * 
     * The total time taken to complete the race, in milliseconds.
     * This is the difference between finishTime and startTime.
     */
    totalTime?: number;
    
    /**
     * Checkpoint times (ms)
     * 
     * Map of checkpoint numbers to times (in milliseconds since race start).
     * For example, checkpointTimes.get(1) returns the time taken to reach
     * checkpoint 1 from the start.
     */
    checkpointTimes: Map<number, number>;
    
    /**
     * Checkpoint split times (ms from previous checkpoint)
     * 
     * Map of checkpoint numbers to split times (in milliseconds).
     * For example, checkpointSplits.get(2) returns the time taken to go
     * from checkpoint 1 to checkpoint 2.
     */
    checkpointSplits: Map<number, number>;
    
    /**
     * Whether the race is in progress
     * 
     * True if the entity has crossed the start marker but not yet
     * crossed the finish marker or been reset.
     */
    inProgress: boolean;
    
    /**
     * Whether the race is completed
     * 
     * True if the entity has crossed the finish marker and all required
     * checkpoints (if requireAllCheckpoints is true).
     */
    completed: boolean;
    
    /**
     * Whether all required checkpoints have been hit
     * 
     * True if the entity has crossed all required checkpoints.
     * This is always true if totalCheckpoints is 0.
     */
    allCheckpointsHit: boolean;
}

/**
 * Race timing system options
 * 
 * Configuration options for the RaceTimingSystem.
 */
export interface RaceTimingSystemOptions {
    /**
     * Whether all checkpoints are required to complete the race
     * 
     * If true, entities must cross all checkpoints before crossing
     * the finish marker for the race to be considered valid.
     * 
     * @default true
     */
    requireAllCheckpoints?: boolean;
    
    /**
     * Total number of checkpoints in the race
     * 
     * This is used to determine if all checkpoints have been hit.
     * 
     * @default 0
     */
    totalCheckpoints?: number;
    
    /**
     * Whether to automatically reset timing when crossing start line again
     * 
     * If true, crossing the start marker again will reset the timing data
     * for that entity and start a new race.
     * 
     * @default true
     */
    autoResetOnStart?: boolean;
    
    /**
     * Whether to validate checkpoint order
     * 
     * If true, checkpoints must be crossed in order (1, 2, 3, etc.).
     * If false, checkpoints can be crossed in any order.
     * 
     * @default true
     */
    validateCheckpointOrder?: boolean;
}

/**
 * Race timing system
 */
export class RaceTimingSystem {
    private static instance: RaceTimingSystem;
    private logger: Logger;
    private eventSystem: EventSystem;
    private raceTimes: Map<string, RaceTimingData> = new Map();
    private requireAllCheckpoints: boolean;
    private totalCheckpoints: number;
    private autoResetOnStart: boolean;
    private validateCheckpointOrder: boolean;
    
    /**
     * Create a new race timing system
     * @param options Race timing system options
     */
    private constructor(options: RaceTimingSystemOptions = {}) {
        this.logger = new Logger('RaceTimingSystem');
        this.eventSystem = EventSystem.getInstance();
        
        this.requireAllCheckpoints = options.requireAllCheckpoints ?? true;
        this.totalCheckpoints = options.totalCheckpoints ?? 0;
        this.autoResetOnStart = options.autoResetOnStart ?? true;
        this.validateCheckpointOrder = options.validateCheckpointOrder ?? true;
        
        this.registerEventListeners();
        
        this.logger.info('Race timing system initialized');
    }
    
    /**
     * Get the race timing system instance
     * @param options Race timing system options
     * @returns Race timing system instance
     */
    public static getInstance(options: RaceTimingSystemOptions = {}): RaceTimingSystem {
        if (!RaceTimingSystem.instance) {
            RaceTimingSystem.instance = new RaceTimingSystem(options);
        }
        return RaceTimingSystem.instance;
    }
    
    /**
     * Register event listeners
     */
    private registerEventListeners(): void {
        this.eventSystem.on(GameEventType.MARKER_START_CROSSED, this.handleStartMarker.bind(this));
        this.eventSystem.on(GameEventType.MARKER_CHECKPOINT_CROSSED, this.handleCheckpointMarker.bind(this));
        this.eventSystem.on(GameEventType.MARKER_FINISH_CROSSED, this.handleFinishMarker.bind(this));
        this.eventSystem.on(GameEventType.GAME_RESET, this.resetAllTimes.bind(this));
    }
    
    /**
     * Handle start marker event
     * @param event Start marker event
     */
    private handleStartMarker(event: MarkerStartEvent): void {
        try {
            if (!event || !event.entityId || !event.time) {
                this.logger.warn('Invalid start marker event received');
                return;
            }
            
            const { entityId, time } = event;
            
            // Check if entity already has timing data
            if (this.raceTimes.has(entityId)) {
                const timingData = this.raceTimes.get(entityId)!;
                
                // If auto reset is enabled or race is completed, reset timing data
                if (this.autoResetOnStart || timingData.completed) {
                    this.resetEntityTiming(entityId);
                } else if (timingData.inProgress) {
                    // Race already in progress, ignore
                    return;
                }
            }
            
            // Create new timing data
            const timingData: RaceTimingData = {
                entityId,
                startTime: time,
                checkpointTimes: new Map(),
                checkpointSplits: new Map(),
                inProgress: true,
                completed: false,
                allCheckpointsHit: this.totalCheckpoints === 0 // If no checkpoints, all are hit by default
            };
            
            this.raceTimes.set(entityId, timingData);
            
            // Emit race start event
            this.eventSystem.emit('race:start', {
                type: 'race:start',
                entityId,
                startTime: time
            });
            
            this.logger.debug(`Race started for entity ${entityId}`);
        } catch (error) {
            this.logger.error(`Error handling start marker: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle checkpoint marker event
     * @param event Checkpoint marker event
     */
    private handleCheckpointMarker(event: MarkerCheckpointEvent): void {
        try {
            if (!event || !event.entityId || !event.time || event.checkpointNumber === undefined) {
                this.logger.warn('Invalid checkpoint marker event received');
                return;
            }
            
            const { entityId, checkpointNumber, time } = event;
            
            // Check if entity has timing data
            if (!this.raceTimes.has(entityId)) {
                this.logger.warn(`Entity ${entityId} crossed checkpoint ${checkpointNumber} without starting race`);
                return;
            }
            
            const timingData = this.raceTimes.get(entityId)!;
            
            // Check if race is in progress
            if (!timingData.inProgress || timingData.completed) {
                this.logger.debug(`Entity ${entityId} crossed checkpoint ${checkpointNumber} but race is not in progress`);
                return;
            }
            
            // Check if checkpoint order is valid
            if (this.validateCheckpointOrder) {
                const lastCheckpoint = Math.max(0, ...Array.from(timingData.checkpointTimes.keys()));
                if (checkpointNumber !== lastCheckpoint + 1) {
                    this.logger.warn(`Entity ${entityId} crossed checkpoint ${checkpointNumber} out of order`);
                    return;
                }
            }
            
            // Calculate time since race start
            const checkpointTime = time - timingData.startTime;
            
            // Calculate split time (time since last checkpoint or start)
            let splitTime: number;
            if (checkpointNumber === 1) {
                // First checkpoint, split from start
                splitTime = checkpointTime;
            } else {
                // Split from previous checkpoint
                const prevCheckpointTime = timingData.checkpointTimes.get(checkpointNumber - 1) || 0;
                splitTime = checkpointTime - prevCheckpointTime;
            }
            
            // Store checkpoint time and split
            timingData.checkpointTimes.set(checkpointNumber, checkpointTime);
            timingData.checkpointSplits.set(checkpointNumber, splitTime);
            
            // Check if all checkpoints have been hit
            if (this.totalCheckpoints > 0) {
                timingData.allCheckpointsHit = timingData.checkpointTimes.size >= this.totalCheckpoints;
            }
            
            // Emit checkpoint event
            this.eventSystem.emit('race:checkpoint', {
                type: 'race:checkpoint',
                entityId,
                checkpointNumber,
                checkpointTime,
                splitTime,
                allCheckpointsHit: timingData.allCheckpointsHit
            });
            
            this.logger.debug(`Entity ${entityId} crossed checkpoint ${checkpointNumber} in ${checkpointTime}ms (split: ${splitTime}ms)`);
        } catch (error) {
            this.logger.error(`Error handling checkpoint marker: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle finish marker event
     * @param event Finish marker event
     */
    private handleFinishMarker(event: MarkerFinishEvent): void {
        try {
            if (!event || !event.entityId || !event.time) {
                this.logger.warn('Invalid finish marker event received');
                return;
            }
            
            const { entityId, time } = event;
            
            // Check if entity has timing data
            if (!this.raceTimes.has(entityId)) {
                this.logger.warn(`Entity ${entityId} crossed finish line without starting race`);
                return;
            }
            
            const timingData = this.raceTimes.get(entityId)!;
            
            // Check if race is in progress
            if (!timingData.inProgress || timingData.completed) {
                this.logger.debug(`Entity ${entityId} crossed finish line but race is not in progress`);
                return;
            }
            
            // Check if all required checkpoints have been hit
            if (this.requireAllCheckpoints && !timingData.allCheckpointsHit) {
                this.logger.warn(`Entity ${entityId} crossed finish line but not all checkpoints were hit`);
                
                // Emit invalid finish event
                this.eventSystem.emit('race:invalidFinish', {
                    type: 'race:invalidFinish',
                    entityId,
                    reason: 'missingCheckpoints',
                    checkpointsHit: timingData.checkpointTimes.size,
                    totalCheckpoints: this.totalCheckpoints
                });
                
                return;
            }
            
            // Calculate total race time
            const totalTime = time - timingData.startTime;
            
            // Update timing data
            timingData.finishTime = time;
            timingData.totalTime = totalTime;
            timingData.inProgress = false;
            timingData.completed = true;
            
            // Emit race finish event
            this.eventSystem.emit('race:finish', {
                type: 'race:finish',
                entityId,
                totalTime,
                checkpointTimes: Object.fromEntries(timingData.checkpointTimes),
                checkpointSplits: Object.fromEntries(timingData.checkpointSplits)
            });
            
            this.logger.info(`Entity ${entityId} finished race in ${totalTime}ms`);
        } catch (error) {
            this.logger.error(`Error handling finish marker: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Reset timing data for an entity
     * @param entityId Entity ID
     */
    public resetEntityTiming(entityId: string): void {
        this.raceTimes.delete(entityId);
        
        // Emit race reset event
        this.eventSystem.emit('race:reset', {
            type: 'race:reset',
            entityId
        });
        
        this.logger.debug(`Race timing reset for entity ${entityId}`);
    }
    
    /**
     * Reset all timing data
     */
    public resetAllTimes(): void {
        this.raceTimes.clear();
        
        // Emit race reset all event
        this.eventSystem.emit('race:resetAll', {
            type: 'race:resetAll'
        });
        
        this.logger.debug('All race timing data reset');
    }
    
    /**
     * Get timing data for an entity
     * @param entityId Entity ID
     * @returns Timing data or undefined if not found
     */
    public getEntityTiming(entityId: string): RaceTimingData | undefined {
        return this.raceTimes.get(entityId);
    }
    
    /**
     * Get all timing data
     * @returns Map of entity IDs to timing data
     */
    public getAllTimingData(): Map<string, RaceTimingData> {
        return new Map(this.raceTimes);
    }
    
    /**
     * Set the total number of checkpoints
     * @param count Total number of checkpoints
     */
    public setTotalCheckpoints(count: number): void {
        this.totalCheckpoints = count;
        
        // Update allCheckpointsHit flag for all entities
        for (const [entityId, timingData] of this.raceTimes.entries()) {
            if (count === 0) {
                timingData.allCheckpointsHit = true;
            } else {
                timingData.allCheckpointsHit = timingData.checkpointTimes.size >= count;
            }
        }
    }
    
    /**
     * Get the total number of checkpoints
     * @returns Total number of checkpoints
     */
    public getTotalCheckpoints(): number {
        return this.totalCheckpoints;
    }
    
    /**
     * Set whether all checkpoints are required
     * @param required Whether all checkpoints are required
     */
    public setRequireAllCheckpoints(required: boolean): void {
        this.requireAllCheckpoints = required;
    }
    
    /**
     * Get whether all checkpoints are required
     * @returns Whether all checkpoints are required
     */
    public isRequireAllCheckpoints(): boolean {
        return this.requireAllCheckpoints;
    }
    
    /**
     * Format time in milliseconds to a readable string (MM:SS.mmm)
     * @param timeMs Time in milliseconds
     * @returns Formatted time string
     */
    public static formatTime(timeMs: number): string {
        if (!timeMs && timeMs !== 0) return '--:--:---';
        
        const minutes = Math.floor(timeMs / 60000);
        const seconds = Math.floor((timeMs % 60000) / 1000);
        const milliseconds = timeMs % 1000;
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
} 