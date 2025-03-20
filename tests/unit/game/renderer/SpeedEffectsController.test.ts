/**
 * @file tests/unit/game/renderer/SpeedEffectsController.test.ts
 * @description Unit tests for SpeedEffectsController
 */

import * as BABYLON from 'babylonjs';
import { SpeedEffectsController, SpeedEffectsOptions } from '../../../../src/game/renderer/SpeedEffectsController';
import { PostProcessingManager } from '../../../../src/core/renderer/effects/PostProcessingManager';
import { PostProcessEffectType } from '../../../../src/core/renderer/effects/IPostProcessingManager';
import { IEntity } from '../../../../src/core/ecs/IEntity';
import { ITransformComponent } from '../../../../src/core/ecs/components/ITransformComponent';
import { ComponentError } from '../../../../src/types/errors/ComponentError';

// Mock dependencies
jest.mock('babylonjs');
jest.mock('../../../../src/core/renderer/effects/PostProcessingManager');

// Enhanced Vector3 mock implementation
const mockVector3Implementation = {
    clone: jest.fn().mockImplementation(function() {
        // 'this' refers to the Vector3 instance when called
        return new BABYLON.Vector3(this.x, this.y, this.z);
    }),
    
    copyFrom: jest.fn().mockImplementation(function(source) {
        // 'this' refers to the Vector3 instance when called
        this.x = source.x;
        this.y = source.y;
        this.z = source.z;
        return this;
    })
};

// Setup Vector3.Distance static method
BABYLON.Vector3.Distance = jest.fn().mockImplementation((v1, v2) => {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    const dz = v1.z - v2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
});

// Setup Vector3.Zero static method
BABYLON.Vector3.Zero = jest.fn().mockImplementation(() => {
    return new BABYLON.Vector3(0, 0, 0);
});

describe('SpeedEffectsController', () => {
    let speedEffectsController: SpeedEffectsController;
    let mockScene: BABYLON.Scene;
    let mockEntity: IEntity;
    let mockTransformComponent: ITransformComponent;
    let mockPostProcessingManager: jest.MockedObject<PostProcessingManager>;
    let mockCamera: BABYLON.Camera;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Set up Vector3 mock to include our implementations
        const mockVectorConstructor = BABYLON.Vector3 as unknown as jest.Mock;
        mockVectorConstructor.mockImplementation((x = 0, y = 0, z = 0) => {
            return {
                x, y, z,
                ...mockVector3Implementation
            };
        });
        
        // Create mock scene
        mockScene = {
            activeCamera: {} as BABYLON.Camera,
            onBeforeRenderObservable: {
                add: jest.fn()
            }
        } as unknown as jest.Mocked<BABYLON.Scene>;
        
        // Create mock camera
        mockCamera = {} as BABYLON.Camera;
        
        // Create mock transform component with proper Vector3
        mockTransformComponent = {
            getPosition: jest.fn().mockImplementation(() => {
                return new BABYLON.Vector3(0, 0, 0);
            }),
            setPosition: jest.fn(),
            getRotation: jest.fn().mockImplementation(() => {
                return new BABYLON.Vector3(0, 0, 0);
            }),
            setRotation: jest.fn(),
            getScale: jest.fn().mockImplementation(() => {
                return new BABYLON.Vector3(1, 1, 1);
            }),
            setScale: jest.fn(),
            translate: jest.fn(),
            rotate: jest.fn(),
            lookAt: jest.fn(),
            getLocalMatrix: jest.fn().mockReturnValue({}),
            getWorldMatrix: jest.fn().mockReturnValue({}),
            getForward: jest.fn().mockImplementation(() => {
                return new BABYLON.Vector3(0, 0, 1);
            }),
            getRight: jest.fn().mockImplementation(() => {
                return new BABYLON.Vector3(1, 0, 0);
            }),
            getUp: jest.fn().mockImplementation(() => {
                return new BABYLON.Vector3(0, 1, 0);
            }),
            type: 'transform',
            isEnabled: jest.fn().mockReturnValue(true),
            setEnabled: jest.fn(),
            update: jest.fn(),
            dispose: jest.fn()
        } as unknown as ITransformComponent;
        
        // Create mock entity
        mockEntity = {
            id: 'test-entity',
            getComponent: jest.fn().mockImplementation((type) => {
                if (type === 'transform') {
                    return mockTransformComponent;
                }
                return null;
            }),
            addComponent: jest.fn(),
            removeComponent: jest.fn(),
            update: jest.fn(),
            dispose: jest.fn()
        };
        
        // Setup the mock implementation for PostProcessingManager
        mockPostProcessingManager = {
            initialize: jest.fn(),
            configureMotionBlur: jest.fn(),
            configureDepthOfField: jest.fn(),
            configureColorCorrection: jest.fn(),
            enableEffect: jest.fn(),
            disableEffect: jest.fn(),
            removeEffect: jest.fn(),
            dispose: jest.fn()
        } as unknown as jest.MockedObject<PostProcessingManager>;
        
        // Mock the PostProcessingManager constructor
        (PostProcessingManager as jest.MockedClass<typeof PostProcessingManager>).mockImplementation(() => {
            return mockPostProcessingManager;
        });
        
        // Create the controller with default options
        speedEffectsController = new SpeedEffectsController();
    });
    
    describe('Constructor', () => {
        it('should create instance with default options', () => {
            expect(speedEffectsController).toBeDefined();
        });
        
        it('should create instance with custom options', () => {
            const customOptions: Partial<SpeedEffectsOptions> = {
                minSpeedForMotionBlur: 15,
                maxSpeedForMotionBlur: 45,
                maxMotionBlurStrength: 0.5
            };
            
            const controller = new SpeedEffectsController(customOptions);
            expect(controller).toBeDefined();
        });
    });
    
    describe('initialize', () => {
        it('should attempt to get transform component even when it is missing', () => {
            // Override mock to return null for transform component
            mockEntity.getComponent = jest.fn().mockReturnValue(null);
            
            // Initialize with a null transform component
            speedEffectsController.initialize(mockScene, mockEntity);
            
            // Verify transform component was requested
            expect(mockEntity.getComponent).toHaveBeenCalledWith('transform');
        });
        
        it('should initialize with scene and entity', () => {
            speedEffectsController.initialize(mockScene, mockEntity);
            
            // Verify transform component was requested
            expect(mockEntity.getComponent).toHaveBeenCalledWith('transform');
            
            // Verify post-processing manager was initialized
            expect(PostProcessingManager).toHaveBeenCalled();
            expect(mockPostProcessingManager.initialize).toHaveBeenCalledWith(mockScene);
            
            // Verify effects were configured
            expect(mockPostProcessingManager.configureMotionBlur).toHaveBeenCalled();
            expect(mockPostProcessingManager.configureDepthOfField).toHaveBeenCalled();
            expect(mockPostProcessingManager.configureColorCorrection).toHaveBeenCalled();
        });
    });
    
    describe('update', () => {
        beforeEach(() => {
            speedEffectsController.initialize(mockScene, mockEntity);
            jest.clearAllMocks(); // Reset mocks after initialization
        });
        
        it('should not update effects if disabled', () => {
            speedEffectsController.setEnabled(false);
            speedEffectsController.update(0.016);
            
            // Since effects are disabled, nothing should be configured
            expect(mockPostProcessingManager.configureMotionBlur).not.toHaveBeenCalled();
            expect(mockPostProcessingManager.configureDepthOfField).not.toHaveBeenCalled();
            expect(mockPostProcessingManager.configureColorCorrection).not.toHaveBeenCalled();
        });
        
        it('should calculate speed based on position change', () => {
            // First update establishes baseline position
            speedEffectsController.update(0.016);
            
            // Mock position change
            const newPosition = new BABYLON.Vector3(0, 0, 1); // Moved 1 unit in z direction
            mockTransformComponent.getPosition = jest.fn().mockReturnValue(newPosition);
            
            // Second update should detect movement
            speedEffectsController.update(0.016);
            
            // Expected speed: distance / deltaTime = 1 / 0.016 = 62.5 units/sec
            // This should trigger effects since it's above thresholds
            expect(mockPostProcessingManager.configureMotionBlur).toHaveBeenCalled();
            expect(mockPostProcessingManager.configureDepthOfField).toHaveBeenCalled();
            expect(mockPostProcessingManager.configureColorCorrection).toHaveBeenCalled();
        });
        
        it('should not update effects if speed is below threshold', () => {
            // First update establishes baseline position
            speedEffectsController.update(0.016);
            
            // Mock very small position change (below all thresholds)
            const newPosition = new BABYLON.Vector3(0, 0, 0.01); // Moved 0.01 units in z direction
            mockTransformComponent.getPosition = jest.fn().mockReturnValue(newPosition);
            
            // Second update should detect movement but speed is too low
            speedEffectsController.update(0.016);
            
            // Effects are still configured, but with default/zero values
            expect(mockPostProcessingManager.configureMotionBlur).toHaveBeenCalled();
        });
    });
    
    describe('setEnabled', () => {
        beforeEach(() => {
            speedEffectsController.initialize(mockScene, mockEntity);
            jest.clearAllMocks(); // Reset mocks after initialization
        });
        
        it('should enable/disable all effects', () => {
            speedEffectsController.setEnabled(false);
            
            expect(mockPostProcessingManager.disableEffect).toHaveBeenCalledWith(PostProcessEffectType.MOTION_BLUR);
            expect(mockPostProcessingManager.disableEffect).toHaveBeenCalledWith(PostProcessEffectType.DEPTH_OF_FIELD);
            expect(mockPostProcessingManager.disableEffect).toHaveBeenCalledWith(PostProcessEffectType.COLOR_CORRECTION);
            
            jest.clearAllMocks();
            
            speedEffectsController.setEnabled(true);
            
            expect(mockPostProcessingManager.enableEffect).toHaveBeenCalledWith(PostProcessEffectType.MOTION_BLUR);
            expect(mockPostProcessingManager.enableEffect).toHaveBeenCalledWith(PostProcessEffectType.DEPTH_OF_FIELD);
            expect(mockPostProcessingManager.enableEffect).toHaveBeenCalledWith(PostProcessEffectType.COLOR_CORRECTION);
        });
    });
    
    describe('setIntensityScale', () => {
        beforeEach(() => {
            speedEffectsController.initialize(mockScene, mockEntity);
            
            // Second update to establish initial position
            speedEffectsController.update(0.016);
            
            // Simulate movement to set speed above threshold
            const newPosition = new BABYLON.Vector3(0, 0, 5);
            mockTransformComponent.getPosition = jest.fn().mockReturnValue(newPosition);
            
            // Third update to detect movement
            speedEffectsController.update(0.016);
            
            jest.clearAllMocks(); // Reset mocks after movement
        });
        
        it('should scale effect intensity', () => {
            // Set intensity scale to 50%
            speedEffectsController.setIntensityScale(0.5);
            
            // This should force an update of all effects with scaled intensity
            expect(mockPostProcessingManager.configureMotionBlur).toHaveBeenCalled();
            expect(mockPostProcessingManager.configureDepthOfField).toHaveBeenCalled();
            expect(mockPostProcessingManager.configureColorCorrection).toHaveBeenCalled();
        });
        
        it('should clamp intensity scale between 0 and 1', () => {
            // Test values outside valid range
            speedEffectsController.setIntensityScale(-0.5); // Should clamp to 0
            speedEffectsController.setIntensityScale(1.5);  // Should clamp to 1
            
            // Verify effects are updated in both cases
            expect(mockPostProcessingManager.configureMotionBlur).toHaveBeenCalledTimes(2);
            expect(mockPostProcessingManager.configureDepthOfField).toHaveBeenCalledTimes(2);
            expect(mockPostProcessingManager.configureColorCorrection).toHaveBeenCalledTimes(2);
        });
    });
    
    describe('dispose', () => {
        beforeEach(() => {
            speedEffectsController.initialize(mockScene, mockEntity);
            jest.clearAllMocks(); // Reset mocks after initialization
        });
        
        it('should dispose all resources', () => {
            speedEffectsController.dispose();
            
            expect(mockPostProcessingManager.removeEffect).toHaveBeenCalledWith(PostProcessEffectType.MOTION_BLUR);
            expect(mockPostProcessingManager.removeEffect).toHaveBeenCalledWith(PostProcessEffectType.DEPTH_OF_FIELD);
            expect(mockPostProcessingManager.removeEffect).toHaveBeenCalledWith(PostProcessEffectType.COLOR_CORRECTION);
            expect(mockPostProcessingManager.dispose).toHaveBeenCalled();
        });
    });
}); 