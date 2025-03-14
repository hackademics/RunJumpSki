/**
 * ImprovedTargetManager.ts
 * Enhanced manager for target entities in the game world
 */

import { IEntity } from '../entities/IEntity';
import { TargetEntity, TargetOptions } from '../entities/TargetEntity';
import { Vector3 } from '../types/common/Vector3';
import { Logger } from '../utils/Logger';
import { EventSystem } from '../core/EventSystem';
import { GameEventType } from '../types/events/EventTypes';

/**
 * Target manager configuration
 */
export interface TargetManagerConfig {
    /**
     * Maximum number of targets
     */
    maxTargets?: number;
    
    /**
     * Whether to automatically respawn targets
     */
    autoRespawn?: boolean;
    
    /**
     * Respawn delay in milliseconds
     */
    respawnDelay?: number;
    
    /**
     * Target spawn area bounds (min)
     */
    spawnAreaMin?: Vector3;
    
    /**
     * Target spawn area bounds (max)
     */
    spawnAreaMax?: Vector3;
    
    /**
     * Default target options
     */
    defaultTargetOptions?: Partial<TargetOptions>;
    
    /**
     * Whether to enable debug mode
     */
    debug?: boolean;
}

/**
 * Target spawn pattern
 */
export enum TargetSpawnPattern {
    RANDOM = 'random',
    GRID = 'grid',
    CIRCLE = 'circle',
    LINE = 'line'
}

/**
 * Target spawn options
 */
export interface TargetSpawnOptions {
    /**
     * Number of targets to spawn
     */
    count: number;
    
    /**
     * Spawn pattern
     */
    pattern?: TargetSpawnPattern;
    
    /**
     * Target options
     */
    targetOptions?: Partial<TargetOptions>;
    
    /**
     * Pattern-specific options
     */
    patternOptions?: {
        /**
         * Spacing between targets
         */
        spacing?: number;
        
        /**
         * Radius for circle pattern
         */
        radius?: number;
        
        /**
         * Direction for line pattern
         */
        direction?: Vector3;
        
        /**
         * Rows for grid pattern
         */
        rows?: number;
        
        /**
         * Columns for grid pattern
         */
        columns?: number;
    };
}

/**
 * Target statistics
 */
export interface TargetStats {
    /**
     * Total targets created
     */
    totalCreated: number;
    
    /**
     * Total targets destroyed
     */
    totalDestroyed: number;
    
    /**
     * Total targets hit
     */
    totalHit: number;
    
    /**
     * Total score from targets
     */
    totalScore: number;
    
    /**
     * Current active targets
     */
    currentActive: number;
    
    /**
     * Average time to destroy targets
     */
    averageTimeToDestroy: number;
    
    /**
     * Hit accuracy (hits / total shots)
     */
    accuracy: number;
}

/**
 * Enhanced manager for target entities in the game world
 * Includes improved error handling, performance optimizations, and better target management
 */
export class ImprovedTargetManager {
    private static instance: ImprovedTargetManager;
    private logger: Logger;
    private eventSystem: EventSystem;
    
    private targets: Map<string, TargetEntity> = new Map();
    private pendingRespawns: Map<string, number> = new Map();
    private targetCreationTimes: Map<string, number> = new Map();
    
    // Configuration
    private maxTargets: number;
    private autoRespawn: boolean;
    private respawnDelay: number;
    private spawnAreaMin: Vector3;
    private spawnAreaMax: Vector3;
    private defaultTargetOptions: Partial<TargetOptions>;
    private debug: boolean;
    
    // Statistics
    private stats: TargetStats = {
        totalCreated: 0,
        totalDestroyed: 0,
        totalHit: 0,
        totalScore: 0,
        currentActive: 0,
        averageTimeToDestroy: 0,
        accuracy: 0
    };
    
    // Performance tracking
    private lastUpdateTime: number = 0;
    private updateInterval: number = 100; // ms
    private totalShotsFired: number = 0;
    private destroyTimes: number[] = [];
    private maxDestroyTimesHistory: number = 100;
    
    /**
     * Get the target manager instance
     * @returns Target manager instance
     */
    public static getInstance(): ImprovedTargetManager {
        if (!ImprovedTargetManager.instance) {
            ImprovedTargetManager.instance = new ImprovedTargetManager();
        }
        return ImprovedTargetManager.instance;
    }
    
    /**
     * Create a new target manager
     */
    private constructor() {
        this.logger = new Logger('ImprovedTargetManager');
        this.eventSystem = EventSystem.getInstance();
        
        // Default configuration
        this.maxTargets = 50;
        this.autoRespawn = true;
        this.respawnDelay = 3000;
        this.spawnAreaMin = new Vector3(-50, 0, -50);
        this.spawnAreaMax = new Vector3(50, 30, 50);
        this.defaultTargetOptions = {};
        this.debug = false;
        
        // Register event handlers
        this.registerEventHandlers();
        
        this.logger.debug('ImprovedTargetManager initialized');
    }
    
    /**
     * Configure the target manager
     * @param config Target manager configuration
     */
    public configure(config: TargetManagerConfig): void {
        try {
            if (config.maxTargets !== undefined) {
                this.maxTargets = config.maxTargets;
            }
            
            if (config.autoRespawn !== undefined) {
                this.autoRespawn = config.autoRespawn;
            }
            
            if (config.respawnDelay !== undefined) {
                this.respawnDelay = config.respawnDelay;
            }
            
            if (config.spawnAreaMin) {
                this.spawnAreaMin = config.spawnAreaMin.clone();
            }
            
            if (config.spawnAreaMax) {
                this.spawnAreaMax = config.spawnAreaMax.clone();
            }
            
            if (config.defaultTargetOptions) {
                this.defaultTargetOptions = { ...config.defaultTargetOptions };
            }
            
            if (config.debug !== undefined) {
                this.debug = config.debug;
                
                // Update logger debug level
                if (this.debug) {
                    this.logger.setLevel('debug');
                } else {
                    this.logger.setLevel('info');
                }
            }
            
            if (this.debug) {
                this.logger.debug('Target manager configured');
                this.logger.debug(`Max targets: ${this.maxTargets}`);
                this.logger.debug(`Auto respawn: ${this.autoRespawn}`);
                this.logger.debug(`Respawn delay: ${this.respawnDelay}ms`);
                this.logger.debug(`Spawn area: ${this.spawnAreaMin.toString()} to ${this.spawnAreaMax.toString()}`);
            }
        } catch (error) {
            this.logger.error(`Error configuring target manager: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Register event handlers
     */
    private registerEventHandlers(): void {
        try {
            // Listen for target hit events
            this.eventSystem.on(GameEventType.TARGET_HIT, (event) => {
                this.handleTargetHit(event.entityId, event.damage, event.sourceEntityId);
            });
            
            // Listen for target destroyed events
            this.eventSystem.on(GameEventType.TARGET_DESTROYED, (event) => {
                this.handleTargetDestroyed(event.entityId, event.pointValue, event.sourceEntityId);
            });
            
            // Listen for weapon fired events (for accuracy tracking)
            this.eventSystem.on(GameEventType.WEAPON_FIRED, () => {
                this.totalShotsFired++;
                this.updateAccuracy();
            });
            
            // Listen for game reset events
            this.eventSystem.on(GameEventType.GAME_RESET, () => {
                this.resetStats();
                this.removeAllTargets();
            });
            
            if (this.debug) {
                this.logger.debug('Event handlers registered');
            }
        } catch (error) {
            this.logger.error(`Error registering event handlers: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Update the target manager
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        try {
            const now = Date.now();
            
            // Only update at specified interval to reduce overhead
            if (now - this.lastUpdateTime < this.updateInterval) {
                return;
            }
            
            this.lastUpdateTime = now;
            
            // Check for pending respawns
            if (this.autoRespawn) {
                this.checkPendingRespawns(now);
            }
            
            // Update target statistics
            this.updateStats();
            
            // Log debug info periodically
            if (this.debug && now % 5000 < this.updateInterval) {
                this.logDebugInfo();
            }
        } catch (error) {
            this.logger.error(`Error in target manager update: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Check for pending target respawns
     * @param currentTime Current time in milliseconds
     */
    private checkPendingRespawns(currentTime: number): void {
        try {
            const respawnIds: string[] = [];
            
            // Find targets ready to respawn
            for (const [id, respawnTime] of this.pendingRespawns.entries()) {
                if (currentTime >= respawnTime) {
                    respawnIds.push(id);
                }
            }
            
            // Respawn targets
            for (const id of respawnIds) {
                this.pendingRespawns.delete(id);
                this.spawnTarget();
            }
        } catch (error) {
            this.logger.error(`Error checking pending respawns: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Update target statistics
     */
    private updateStats(): void {
        try {
            // Update current active targets
            this.stats.currentActive = this.targets.size;
            
            // Update accuracy
            this.updateAccuracy();
            
            // Update average time to destroy
            if (this.destroyTimes.length > 0) {
                const sum = this.destroyTimes.reduce((a, b) => a + b, 0);
                this.stats.averageTimeToDestroy = sum / this.destroyTimes.length;
            }
        } catch (error) {
            this.logger.error(`Error updating stats: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Update accuracy statistic
     */
    private updateAccuracy(): void {
        if (this.totalShotsFired > 0) {
            this.stats.accuracy = this.stats.totalHit / this.totalShotsFired;
        } else {
            this.stats.accuracy = 0;
        }
    }
    
    /**
     * Log debug information
     */
    private logDebugInfo(): void {
        this.logger.debug(`Targets - Active: ${this.stats.currentActive}, Created: ${this.stats.totalCreated}, Destroyed: ${this.stats.totalDestroyed}`);
        this.logger.debug(`Score: ${this.stats.totalScore}, Accuracy: ${(this.stats.accuracy * 100).toFixed(1)}%`);
        this.logger.debug(`Avg destroy time: ${this.stats.averageTimeToDestroy.toFixed(2)}ms`);
        this.logger.debug(`Pending respawns: ${this.pendingRespawns.size}`);
    }
    
    /**
     * Handle target hit event
     * @param entityId Target entity ID
     * @param damage Damage amount
     * @param sourceEntityId Source entity ID
     */
    private handleTargetHit(entityId: string, damage: number, sourceEntityId?: string): void {
        try {
            // Update statistics
            this.stats.totalHit++;
            
            if (this.debug) {
                this.logger.debug(`Target ${entityId} hit for ${damage} damage by ${sourceEntityId || 'unknown'}`);
            }
        } catch (error) {
            this.logger.error(`Error handling target hit: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle target destroyed event
     * @param entityId Target entity ID
     * @param pointValue Point value
     * @param sourceEntityId Source entity ID
     */
    private handleTargetDestroyed(entityId: string, pointValue: number, sourceEntityId?: string): void {
        try {
            const target = this.targets.get(entityId);
            const now = Date.now();
            
            if (!target) {
                return;
            }
            
            // Calculate time to destroy
            const creationTime = this.targetCreationTimes.get(entityId) || now;
            const timeToDestroy = now - creationTime;
            
            // Add to destroy times history
            this.destroyTimes.push(timeToDestroy);
            if (this.destroyTimes.length > this.maxDestroyTimesHistory) {
                this.destroyTimes.shift();
            }
            
            // Update statistics
            this.stats.totalDestroyed++;
            this.stats.totalScore += pointValue;
            
            // Remove from active targets
            this.targets.delete(entityId);
            this.targetCreationTimes.delete(entityId);
            
            if (this.debug) {
                this.logger.debug(`Target ${entityId} destroyed, worth ${pointValue} points, time to destroy: ${timeToDestroy}ms`);
            }
            
            // Schedule respawn if auto-respawn is enabled
            if (this.autoRespawn) {
                this.pendingRespawns.set(entityId, now + this.respawnDelay);
            }
            
            // Emit score update event
            this.eventSystem.emit(GameEventType.SCORE_UPDATED, {
                score: pointValue,
                totalScore: this.stats.totalScore,
                sourceEntityId
            });
        } catch (error) {
            this.logger.error(`Error handling target destroyed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Spawn a single target
     * @param options Target options
     * @returns The spawned target entity
     */
    public spawnTarget(options?: Partial<TargetOptions>): TargetEntity | null {
        try {
            // Check if we've reached the maximum number of targets
            if (this.targets.size >= this.maxTargets) {
                if (this.debug) {
                    this.logger.debug(`Cannot spawn target: maximum number of targets (${this.maxTargets}) reached`);
                }
                return null;
            }
            
            // Merge default options with provided options
            const targetOptions: TargetOptions = {
                ...this.defaultTargetOptions,
                ...options,
                position: options?.position || this.getRandomSpawnPosition()
            };
            
            // Create target entity
            const target = new TargetEntity(targetOptions);
            
            // Add to active targets
            this.targets.set(target.id, target);
            this.targetCreationTimes.set(target.id, Date.now());
            
            // Update statistics
            this.stats.totalCreated++;
            this.stats.currentActive = this.targets.size;
            
            if (this.debug) {
                this.logger.debug(`Spawned target ${target.id} at ${target.transform.position.toString()}`);
            }
            
            return target;
        } catch (error) {
            this.logger.error(`Error spawning target: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    
    /**
     * Spawn multiple targets
     * @param options Target spawn options
     * @returns Array of spawned target entities
     */
    public spawnTargets(options: TargetSpawnOptions): TargetEntity[] {
        try {
            const spawnedTargets: TargetEntity[] = [];
            const count = Math.min(options.count, this.maxTargets - this.targets.size);
            
            if (count <= 0) {
                return spawnedTargets;
            }
            
            // Spawn targets based on pattern
            switch (options.pattern || TargetSpawnPattern.RANDOM) {
                case TargetSpawnPattern.GRID:
                    this.spawnTargetsInGrid(count, options, spawnedTargets);
                    break;
                    
                case TargetSpawnPattern.CIRCLE:
                    this.spawnTargetsInCircle(count, options, spawnedTargets);
                    break;
                    
                case TargetSpawnPattern.LINE:
                    this.spawnTargetsInLine(count, options, spawnedTargets);
                    break;
                    
                case TargetSpawnPattern.RANDOM:
                default:
                    this.spawnTargetsRandomly(count, options, spawnedTargets);
                    break;
            }
            
            if (this.debug) {
                this.logger.debug(`Spawned ${spawnedTargets.length} targets in ${options.pattern || 'random'} pattern`);
            }
            
            return spawnedTargets;
        } catch (error) {
            this.logger.error(`Error spawning targets: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    
    /**
     * Spawn targets in a grid pattern
     */
    private spawnTargetsInGrid(count: number, options: TargetSpawnOptions, spawnedTargets: TargetEntity[]): void {
        const rows = options.patternOptions?.rows || Math.ceil(Math.sqrt(count));
        const cols = options.patternOptions?.columns || Math.ceil(count / rows);
        const spacing = options.patternOptions?.spacing || 5;
        
        // Calculate grid center
        const center = new Vector3(
            (this.spawnAreaMin.x + this.spawnAreaMax.x) / 2,
            (this.spawnAreaMin.y + this.spawnAreaMax.y) / 2,
            (this.spawnAreaMin.z + this.spawnAreaMax.z) / 2
        );
        
        // Calculate grid start position
        const startX = center.x - (cols - 1) * spacing / 2;
        const startZ = center.z - (rows - 1) * spacing / 2;
        
        let targetCount = 0;
        
        for (let row = 0; row < rows && targetCount < count; row++) {
            for (let col = 0; col < cols && targetCount < count; col++) {
                const position = new Vector3(
                    startX + col * spacing,
                    center.y,
                    startZ + row * spacing
                );
                
                const target = this.spawnTarget({
                    ...options.targetOptions,
                    position
                });
                
                if (target) {
                    spawnedTargets.push(target);
                    targetCount++;
                }
            }
        }
    }
    
    /**
     * Spawn targets in a circle pattern
     */
    private spawnTargetsInCircle(count: number, options: TargetSpawnOptions, spawnedTargets: TargetEntity[]): void {
        const radius = options.patternOptions?.radius || 10;
        
        // Calculate circle center
        const center = new Vector3(
            (this.spawnAreaMin.x + this.spawnAreaMax.x) / 2,
            (this.spawnAreaMin.y + this.spawnAreaMax.y) / 2,
            (this.spawnAreaMin.z + this.spawnAreaMax.z) / 2
        );
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const position = new Vector3(
                center.x + Math.cos(angle) * radius,
                center.y,
                center.z + Math.sin(angle) * radius
            );
            
            const target = this.spawnTarget({
                ...options.targetOptions,
                position
            });
            
            if (target) {
                spawnedTargets.push(target);
            }
        }
    }
    
    /**
     * Spawn targets in a line pattern
     */
    private spawnTargetsInLine(count: number, options: TargetSpawnOptions, spawnedTargets: TargetEntity[]): void {
        const spacing = options.patternOptions?.spacing || 5;
        const direction = options.patternOptions?.direction || new Vector3(1, 0, 0);
        
        // Normalize direction
        const normalizedDir = direction.clone();
        const length = Math.sqrt(normalizedDir.x * normalizedDir.x + normalizedDir.y * normalizedDir.y + normalizedDir.z * normalizedDir.z);
        if (length > 0) {
            normalizedDir.x /= length;
            normalizedDir.y /= length;
            normalizedDir.z /= length;
        }
        
        // Calculate line center
        const center = new Vector3(
            (this.spawnAreaMin.x + this.spawnAreaMax.x) / 2,
            (this.spawnAreaMin.y + this.spawnAreaMax.y) / 2,
            (this.spawnAreaMin.z + this.spawnAreaMax.z) / 2
        );
        
        // Calculate line start position
        const startPos = new Vector3(
            center.x - normalizedDir.x * (count - 1) * spacing / 2,
            center.y - normalizedDir.y * (count - 1) * spacing / 2,
            center.z - normalizedDir.z * (count - 1) * spacing / 2
        );
        
        for (let i = 0; i < count; i++) {
            const position = new Vector3(
                startPos.x + normalizedDir.x * i * spacing,
                startPos.y + normalizedDir.y * i * spacing,
                startPos.z + normalizedDir.z * i * spacing
            );
            
            const target = this.spawnTarget({
                ...options.targetOptions,
                position
            });
            
            if (target) {
                spawnedTargets.push(target);
            }
        }
    }
    
    /**
     * Spawn targets randomly
     */
    private spawnTargetsRandomly(count: number, options: TargetSpawnOptions, spawnedTargets: TargetEntity[]): void {
        for (let i = 0; i < count; i++) {
            const target = this.spawnTarget(options.targetOptions);
            
            if (target) {
                spawnedTargets.push(target);
            }
        }
    }
    
    /**
     * Get a random spawn position within the spawn area
     * @returns Random position
     */
    private getRandomSpawnPosition(): Vector3 {
        return new Vector3(
            this.spawnAreaMin.x + Math.random() * (this.spawnAreaMax.x - this.spawnAreaMin.x),
            this.spawnAreaMin.y + Math.random() * (this.spawnAreaMax.y - this.spawnAreaMin.y),
            this.spawnAreaMin.z + Math.random() * (this.spawnAreaMax.z - this.spawnAreaMin.z)
        );
    }
    
    /**
     * Get all active targets
     * @returns Array of target entities
     */
    public getTargets(): TargetEntity[] {
        return Array.from(this.targets.values());
    }
    
    /**
     * Get a target by ID
     * @param id Target ID
     * @returns Target entity or undefined if not found
     */
    public getTargetById(id: string): TargetEntity | undefined {
        return this.targets.get(id);
    }
    
    /**
     * Find targets within a radius of a position
     * @param position Center position
     * @param radius Search radius
     * @returns Array of target entities within the radius
     */
    public getTargetsInRadius(position: Vector3, radius: number): TargetEntity[] {
        try {
            const radiusSquared = radius * radius;
            const result: TargetEntity[] = [];
            
            for (const target of this.targets.values()) {
                if (target.transform) {
                    const distanceSquared = this.getDistanceSquared(position, target.transform.position);
                    if (distanceSquared <= radiusSquared) {
                        result.push(target);
                    }
                }
            }
            
            return result;
        } catch (error) {
            this.logger.error(`Error getting targets in radius: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    
    /**
     * Calculate squared distance between two positions
     */
    private getDistanceSquared(a: Vector3, b: Vector3): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz;
    }
    
    /**
     * Remove a target
     * @param id Target ID
     * @returns Whether the target was removed
     */
    public removeTarget(id: string): boolean {
        try {
            const target = this.targets.get(id);
            
            if (!target) {
                return false;
            }
            
            // Remove from active targets
            this.targets.delete(id);
            this.targetCreationTimes.delete(id);
            
            // Remove from pending respawns
            this.pendingRespawns.delete(id);
            
            // Dispose target
            target.dispose();
            
            if (this.debug) {
                this.logger.debug(`Removed target ${id}`);
            }
            
            return true;
        } catch (error) {
            this.logger.error(`Error removing target: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    
    /**
     * Remove all targets
     */
    public removeAllTargets(): void {
        try {
            // Dispose all targets
            for (const target of this.targets.values()) {
                target.dispose();
            }
            
            // Clear targets
            this.targets.clear();
            this.targetCreationTimes.clear();
            this.pendingRespawns.clear();
            
            if (this.debug) {
                this.logger.debug('Removed all targets');
            }
        } catch (error) {
            this.logger.error(`Error removing all targets: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Reset target statistics
     */
    public resetStats(): void {
        this.stats = {
            totalCreated: 0,
            totalDestroyed: 0,
            totalHit: 0,
            totalScore: 0,
            currentActive: this.targets.size,
            averageTimeToDestroy: 0,
            accuracy: 0
        };
        
        this.totalShotsFired = 0;
        this.destroyTimes = [];
        
        if (this.debug) {
            this.logger.debug('Reset target statistics');
        }
    }
    
    /**
     * Get target statistics
     * @returns Target statistics
     */
    public getStats(): TargetStats {
        return { ...this.stats };
    }
    
    /**
     * Dispose the target manager
     */
    public dispose(): void {
        try {
            // Remove all targets
            this.removeAllTargets();
            
            // Unregister event handlers
            this.eventSystem.off(GameEventType.TARGET_HIT);
            this.eventSystem.off(GameEventType.TARGET_DESTROYED);
            this.eventSystem.off(GameEventType.WEAPON_FIRED);
            this.eventSystem.off(GameEventType.GAME_RESET);
            
            this.logger.debug('Target manager disposed');
        } catch (error) {
            this.logger.error(`Error disposing target manager: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 