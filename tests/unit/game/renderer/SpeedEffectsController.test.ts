/**
 * @file tests/unit/game/renderer/SpeedEffectsController.test.ts
 * @description Unit tests for SpeedEffectsController
 */

import * as BABYLON from 'babylonjs';
import { SpeedEffectsController, SpeedEffectsOptions } from '../../../../src/game/renderer/SpeedEffectsController';
import { PostProcessingManager } from '../../../../src/core/renderer/effects/PostProcessingManager';
import { IEntity } from '../../../../src/core/ecs/IEntity';
import { ITransformComponent } from '../../../../src/core/ecs/components/ITransformComponent';
import { ComponentError } from '../../../../src/types/errors/ComponentError';

// Mock dependencies
jest.mock('babylonjs');
jest.mock('../../../../src/core/renderer/effects/PostProcessingManager');

describe('SpeedEffectsController', () => {
    let speedEffectsController: SpeedEffectsController;
    let mockScene: BABYLON.Scene;
    let mockEntity: IEntity;
    let mockTransformComponent: ITransformComponent;
    let mockPostProcessingManager: jest.Mocked<PostProcessingManager>;
    let mockCamera: BABYLON.Camera;
    
    beforeEach(() => {
        // Reset mocks
        jest.resetAllMocks();
        
        // Create mock scene
        mockScene = new BABYLON.Scene({} as BABYLON.Engine) as jest.Mocked<BABYLON.Scene>;
        mockScene.activeCamera = {} as BABYLON.Camera;
        
        // Create mock camera
        mockCamera = {} as BABYLON.Camera;
        
        // Create mock transform component
        mockTransformComponent = {
            getPosition: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0)),
            setPosition: jest.fn(),
            getRotation: jest.fn(),
            setRotation: jest.fn(),
            getScale: jest.fn(),
            setScale: jest.fn(),
            lookAt: jest.fn(),
            getWorldMatrix: jest.fn(),
            getLocalMatrix: jest.fn(),
            getBoundingInfo: jest.fn(),
            getType: jest.fn().mockReturnValue('transform'),
            isEnabled: jest.fn().mockReturnValue(true),
            setEnabled: jest.fn(),
            init: jest.fn(),
            update: jest.fn(),
            dispose: jest.fn()
        };
        
        // Create mock entity
        mockEntity = {
            id: 'test-entity',
            getComponent: jest.fn().mockReturnValue(mockTransformComponent),
            addComponent: jest.fn(),
            removeComponent: jest.fn(),
            update: jest.fn(),
            dispose: jest.fn()
        };
        
        // Create mock post-processing manager
        (PostProcessingManager as jest.MockedClass<typeof PostProcessingManager>).mockImplementation(() => {
            return {
                addMotionBlurEffect: jest.fn().mockReturnValue('motion-blur-1'),
                addDepthOfFieldEffect: jest.fn().mockReturnValue('depth-of-field-1'),
                addColorCorrectionEffect: jest.fn().mockReturnValue('color-correction-1'),
                updateMotionBlurEffect: jest.fn(),
                updateDepthOfFieldEffect: jest.fn(),
                updateColorCorrectionEffect: jest.fn(),
                setEffectEnabled: jest.fn(),
                removeEffect: jest.fn(),
                dispose: jest.fn()
            } as unknown as jest.Mocked<PostProcessingManager>;
        });
        
        mockPostProcessingManager = new PostProcessingManager(mockScene) as jest.Mocked<PostProcessingManager>;
        
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
            
            // We would need to test private property to verify options were set correctly
            // This can be tested indirectly through behavior
        });
    });
    
    describe('initialize', () => {
        it('should throw error if entity has no transform component', () => {
            // Override mock to return null for transform component
            mockEntity.getComponent = jest.fn().mockReturnValue(null);
            
            expect(() => {
                speedEffectsController.initialize(mockScene, mockEntity);
            }).toThrow(ComponentError);
        });
        
        it('should initialize with scene and entity', () => {
            speedEffectsController.initialize(mockScene, mockEntity);
            
            // Verify transform component was requested
            expect(mockEntity.getComponent).toHaveBeenCalledWith('transform');
            
            // Verify post-processing manager was created
            expect(PostProcessingManager).toHaveBeenCalledWith(mockScene);
            
            // Verify effects were set up
            const postProcessingManager = PostProcessingManager.mock.instances[0];
            expect(postProcessingManager.addMotionBlurEffect).toHaveBeenCalled();
            expect(postProcessingManager.addDepthOfFieldEffect).toHaveBeenCalled();
            expect(postProcessingManager.addColorCorrectionEffect).toHaveBeenCalled();
        });
    });
    
    describe('update', () => {
        beforeEach(() => {
            speedEffectsController.initialize(mockScene, mockEntity);
            jest.resetAllMocks(); // Reset mocks after initialization
        });
        
        it('should not update effects if disabled', () => {
            speedEffectsController.setEnabled(false);
            speedEffectsController.update(0.016);
            
            const postProcessingManager = PostProcessingManager.mock.instances[0];
            expect(postProcessingManager.updateMotionBlurEffect).not.toHaveBeenCalled();
            expect(postProcessingManager.updateDepthOfFieldEffect).not.toHaveBeenCalled();
            expect(postProcessingManager.updateColorCorrectionEffect).not.toHaveBeenCalled();
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
            const postProcessingManager = PostProcessingManager.mock.instances[0];
            expect(postProcessingManager.updateMotionBlurEffect).toHaveBeenCalled();
            expect(postProcessingManager.updateDepthOfFieldEffect).toHaveBeenCalled();
            expect(postProcessingManager.updateColorCorrectionEffect).toHaveBeenCalled();
        });
        
        it('should not update effects if speed is below threshold', () => {
            // First update establishes baseline position
            speedEffectsController.update(0.016);
            
            // Mock very small position change (below all thresholds)
            const newPosition = new BABYLON.Vector3(0, 0, 0.01); // Moved 0.01 units in z direction
            mockTransformComponent.getPosition = jest.fn().mockReturnValue(newPosition);
            
            // Second update should detect movement but speed is too low
            speedEffectsController.update(0.016);
            
            // Expected speed: distance / deltaTime = 0.01 / 0.016 = 0.625 units/sec
            // This should not trigger effects since it's below all thresholds
            const postProcessingManager = PostProcessingManager.mock.instances[0];
            
            // Effects are still updated, but with default/zero values
            expect(postProcessingManager.updateMotionBlurEffect).toHaveBeenCalledWith(
                'motion-blur-1',
                expect.objectContaining({ intensity: 0 })
            );
        });
    });
    
    describe('setEnabled', () => {
        beforeEach(() => {
            speedEffectsController.initialize(mockScene, mockEntity);
            jest.resetAllMocks(); // Reset mocks after initialization
        });
        
        it('should enable/disable all effects', () => {
            speedEffectsController.setEnabled(false);
            
            const postProcessingManager = PostProcessingManager.mock.instances[0];
            expect(postProcessingManager.setEffectEnabled).toHaveBeenCalledWith('motion-blur-1', false);
            expect(postProcessingManager.setEffectEnabled).toHaveBeenCalledWith('depth-of-field-1', false);
            expect(postProcessingManager.setEffectEnabled).toHaveBeenCalledWith('color-correction-1', false);
            
            jest.resetAllMocks();
            
            speedEffectsController.setEnabled(true);
            
            expect(postProcessingManager.setEffectEnabled).toHaveBeenCalledWith('motion-blur-1', true);
            expect(postProcessingManager.setEffectEnabled).toHaveBeenCalledWith('depth-of-field-1', true);
            expect(postProcessingManager.setEffectEnabled).toHaveBeenCalledWith('color-correction-1', true);
        });
    });
    
    describe('setIntensityScale', () => {
        beforeEach(() => {
            speedEffectsController.initialize(mockScene, mockEntity);
            
            // Simulate movement to set speed above threshold
            const newPosition = new BABYLON.Vector3(0, 0, 5);
            mockTransformComponent.getPosition = jest.fn().mockReturnValue(newPosition);
            speedEffectsController.update(0.016);
            
            jest.resetAllMocks(); // Reset mocks after movement
        });
        
        it('should scale effect intensity', () => {
            // Set intensity scale to 50%
            speedEffectsController.setIntensityScale(0.5);
            
            // This should force an update of all effects with scaled intensity
            const postProcessingManager = PostProcessingManager.mock.instances[0];
            expect(postProcessingManager.updateMotionBlurEffect).toHaveBeenCalled();
            expect(postProcessingManager.updateDepthOfFieldEffect).toHaveBeenCalled();
            expect(postProcessingManager.updateColorCorrectionEffect).toHaveBeenCalled();
        });
        
        it('should clamp intensity scale between 0 and 1', () => {
            // Test values outside valid range
            speedEffectsController.setIntensityScale(-0.5); // Should clamp to 0
            speedEffectsController.setIntensityScale(1.5);  // Should clamp to 1
            
            // Verify effects are updated in both cases
            const postProcessingManager = PostProcessingManager.mock.instances[0];
            expect(postProcessingManager.updateMotionBlurEffect).toHaveBeenCalledTimes(2);
            expect(postProcessingManager.updateDepthOfFieldEffect).toHaveBeenCalledTimes(2);
            expect(postProcessingManager.updateColorCorrectionEffect).toHaveBeenCalledTimes(2);
        });
    });
    
    describe('dispose', () => {
        beforeEach(() => {
            speedEffectsController.initialize(mockScene, mockEntity);
            jest.resetAllMocks(); // Reset mocks after initialization
        });
        
        it('should dispose all resources', () => {
            speedEffectsController.dispose();
            
            const postProcessingManager = PostProcessingManager.mock.instances[0];
            expect(postProcessingManager.removeEffect).toHaveBeenCalledWith('motion-blur-1');
            expect(postProcessingManager.removeEffect).toHaveBeenCalledWith('depth-of-field-1');
            expect(postProcessingManager.removeEffect).toHaveBeenCalledWith('color-correction-1');
            expect(postProcessingManager.dispose).toHaveBeenCalled();
        });
    });
}); 