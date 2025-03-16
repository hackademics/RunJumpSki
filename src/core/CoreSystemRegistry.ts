import { ServiceContainer } from './services/ServiceContainer';
import { StateManager } from './state/StateManager';
import { AssetManager } from './assets/AssetManager';
import { InputSystem } from './input/InputSystem';
import { PhysicsSystem } from './physics/PhysicsSystem';
import { RendererSystem } from './renderer/RendererSystem';
import { AudioSystem } from './audio/AudioSystem';
import { Logger } from './logger/Logger';
import { EventBus } from './events/EventBus';
import { LogLevel } from './logger/ILogger';
import { ServiceError } from '../utils/errors/ServiceError';
import { ServiceOptions } from '../types/core/ServiceTypes';

/**
 * Registry for core engine systems
 * Handles initialization order and dependencies
 */
export class CoreSystemRegistry {
    private static instance: CoreSystemRegistry;
    private initialized: boolean = false;
    private container: ServiceContainer;
    private logger: Logger;
    private eventBus: EventBus;

    private constructor() {
        this.container = ServiceContainer.getInstance();
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): CoreSystemRegistry {
        if (!CoreSystemRegistry.instance) {
            CoreSystemRegistry.instance = new CoreSystemRegistry();
        }
        return CoreSystemRegistry.instance;
    }

    /**
     * Initialize all core systems in the correct order
     * @throws {ServiceError} If systems are already initialized
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            throw new ServiceError('initialize', 'Core systems already initialized');
        }

        try {
            // Initialize logger first
            this.logger.initialize({
                minLevel: LogLevel.DEBUG,
                maxEntries: 1000,
                emitEvents: true,
                includeTimestamps: true,
                includeStackTraces: true,
                console: {
                    enabled: true,
                    colors: true
                }
            });

            // Register core systems in dependency order
            this.container.register('logger', () => this.logger, {
                id: 'logger',
                implementation: this.logger,
                singleton: true
            });
            this.logger.info('Logger system initialized', { system: 'logger' });

            this.container.register('eventBus', () => this.eventBus, {
                id: 'eventBus',
                implementation: this.eventBus,
                singleton: true
            });
            this.logger.info('Event system initialized', { system: 'eventBus' });

            this.container.register('stateManager', () => StateManager.getInstance(), {
                id: 'stateManager',
                implementation: StateManager.getInstance(),
                singleton: true
            });
            this.logger.info('State management system initialized', { system: 'stateManager' });

            this.container.register('assetManager', () => AssetManager.getInstance(), {
                id: 'assetManager',
                implementation: AssetManager.getInstance(),
                singleton: true
            });
            this.logger.info('Asset management system initialized', { system: 'assetManager' });

            this.container.register('inputSystem', () => InputSystem.getInstance(), {
                id: 'inputSystem',
                implementation: InputSystem.getInstance(),
                singleton: true
            });
            this.logger.info('Input system initialized', { system: 'inputSystem' });

            this.container.register('physicsSystem', () => PhysicsSystem.getInstance(), {
                id: 'physicsSystem',
                implementation: PhysicsSystem.getInstance(),
                singleton: true
            });
            this.logger.info('Physics system initialized', { system: 'physicsSystem' });

            this.container.register('rendererSystem', () => RendererSystem.getInstance(), {
                id: 'rendererSystem',
                implementation: RendererSystem.getInstance(),
                singleton: true
            });
            this.logger.info('Renderer system initialized', { system: 'rendererSystem' });

            this.container.register('audioSystem', () => AudioSystem.getInstance(), {
                id: 'audioSystem',
                implementation: AudioSystem.getInstance(),
                singleton: true
            });
            this.logger.info('Audio system initialized', { system: 'audioSystem' });

            // Initialize all services
            await this.container.initialize();
            
            this.logger.info('All core systems initialized successfully', { phase: 'initialization' });
            this.initialized = true;
        } catch (error) {
            this.logger.error('Failed to initialize core systems', error as Error, { phase: 'initialization' });
            throw error;
        }
    }

    /**
     * Dispose of all core systems in the correct order
     */
    public async dispose(): Promise<void> {
        if (!this.initialized) {
            return;
        }

        try {
            this.logger.info('Beginning core systems disposal', { phase: 'disposal' });
            await this.container.dispose();
            this.initialized = false;
            this.logger.info('All core systems disposed successfully', { phase: 'disposal' });
        } catch (error) {
            this.logger.error('Error disposing core systems', error as Error, { phase: 'disposal' });
            throw error;
        }
    }

    /**
     * Check if core systems are initialized
     */
    public isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Get a core system by name
     * @param name System name
     */
    public getSystem<T>(name: string): T {
        if (!this.initialized) {
            throw new ServiceError('getSystem', 'Core systems not initialized');
        }
        return this.container.get<T>(name);
    }
} 