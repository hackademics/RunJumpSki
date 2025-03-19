/**
 * @file tests/unit/game/renderer/particles/JetpackParticleEffect.test.ts
 * @description Unit tests for JetpackParticleEffect
 */

import * as BABYLON from 'babylonjs';
import { JetpackParticleEffect, JetpackEffectState } from '../../../../../src/game/renderer/particles/JetpackParticleEffect';
import { ParticleSystemManager } from '../../../../../src/core/renderer/particles/ParticleSystemManager';
import { IEntity } from '../../../../../src/core/ecs/IEntity';
import { ITransformComponent } from '../../../../../src/core/ecs/components/ITransformComponent';
import { ComponentError } from '../../../../../src/types/errors/ComponentError';

// Mock dependencies
jest.mock('babylonjs');
jest.mock('../../../../../src/core/renderer/particles/ParticleSystemManager');

describe('JetpackParticleEffect', () => {
    let jetpackParticleEffect: JetpackParticleEffect;
    let mockScene: BABYLON.Scene;
    let mockEntity: IEntity;
    let mockTransformComponent: ITransformComponent;
    let mockParticleSystemManager: jest.Mocked<ParticleSystemManager>;
    
    beforeEach(() => {
        // Reset mocks
        jest.resetAllMocks();
        
        // Create mock scene
        mockScene = new BABYLON.Scene({} as BABYLON.Engine) as jest.Mocked<BABYLON.Scene>;
        
        // Create mock transform component
        mockTransformComponent = {
            getPosition: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0)),
            setPosition: jest.fn(),
            getRotation: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0)),
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
        
        // Create mock particle system manager
        (ParticleSystemManager as jest.MockedClass<typeof ParticleSystemManager>).mockImplementation(() => {
            return {
                createParticleSystemFromPreset: jest.fn().mockImplementation(({ preset }) => {
                    // Return different IDs based on preset type
                    if (preset === 'FLAME') return 'thrust-particles-1';
                    if (preset === 'SMOKE') return 'smoke-particles-1';
                    return 'spark-particles-1';
                }),
                updateEmitterPosition: jest.fn(),
                updateEmitRate: jest.fn(),
                setSystemVisible: jest.fn(),
                removeParticleSystem: jest.fn(),
                dispose: jest.fn()
            } as unknown as jest.Mocked<ParticleSystemManager>;
        });
        
        mockParticleSystemManager = new ParticleSystemManager(mockScene) as jest.Mocked<ParticleSystemManager>;
        
        // Create the jetpack effect with default options
        jetpackParticleEffect = new JetpackParticleEffect();
    });
    
    describe('Constructor', () => {
        it('should create instance with default options', () => {
            expect(jetpackParticleEffect).toBeDefined();
        });
        
        it('should create instance with custom options', () => {
            const customPositionOffset = new BABYLON.Vector3(0, -1, 0);
            const customColor = new BABYLON.Color4(0, 1, 0, 1);
            
            const effect = new JetpackParticleEffect({
                positionOffset: customPositionOffset,
                baseColor: customColor,
                particleSize: 0.5
            });
            
            expect(effect).toBeDefined();
            
            // We would need to test private property to verify options were set correctly
            // This can be tested indirectly through behavior
        });
    });
    
    describe('initialize', () => {
        it('should throw error if entity has no transform component', () => {
            // Override mock to return null for transform component
            mockEntity.getComponent = jest.fn().mockReturnValue(null);
            
            expect(() => {
                jetpackParticleEffect.initialize(mockScene, mockEntity);
            }).toThrow(ComponentError);
        });
        
        it('should initialize with scene and entity', () => {
            jetpackParticleEffect.initialize(mockScene, mockEntity);
            
            // Verify transform component was requested
            expect(mockEntity.getComponent).toHaveBeenCalledWith('transform');
            
            // Verify particle system manager was created
            expect(ParticleSystemManager).toHaveBeenCalledWith(mockScene);
            
            // Verify particle systems were created
            const particleSystemManager = ParticleSystemManager.mock.instances[0];
            expect(particleSystemManager.createParticleSystemFromPreset).toHaveBeenCalledTimes(3);
        });
    });
    
    describe('update', () => {
        beforeEach(() => {
            jetpackParticleEffect.initialize(mockScene, mockEntity);
            jest.resetAllMocks(); // Reset mocks after initialization
        });
        
        it('should set state to OFF when jetpack is not active', () => {
            // Mock the setState method
            const setStateSpy = jest.spyOn(jetpackParticleEffect, 'setState');
            
            // Update with inactive jetpack
            jetpackParticleEffect.update(0.016, 0.5, false);
            
            // Should set state to OFF
            expect(setStateSpy).toHaveBeenCalledWith(JetpackEffectState.OFF);
        });
        
        it('should set state based on thrust level when active', () => {
            // Mock the setState method
            const setStateSpy = jest.spyOn(jetpackParticleEffect, 'setState');
            
            // Test different thrust levels
            jetpackParticleEffect.update(0.016, 0.05, true); // Idle
            expect(setStateSpy).toHaveBeenCalledWith(JetpackEffectState.IDLE);
            
            jetpackParticleEffect.update(0.016, 0.3, true);  // Low
            expect(setStateSpy).toHaveBeenCalledWith(JetpackEffectState.LOW);
            
            jetpackParticleEffect.update(0.016, 0.5, true);  // Medium
            expect(setStateSpy).toHaveBeenCalledWith(JetpackEffectState.MEDIUM);
            
            jetpackParticleEffect.update(0.016, 0.8, true);  // High
            expect(setStateSpy).toHaveBeenCalledWith(JetpackEffectState.HIGH);
            
            jetpackParticleEffect.update(0.016, 0.95, true); // Boost
            expect(setStateSpy).toHaveBeenCalledWith(JetpackEffectState.BOOST);
        });
        
        it('should update emitter position during update', () => {
            // Mock the updateEmitterPosition method
            const updateEmitterPositionSpy = jest.spyOn(jetpackParticleEffect as any, 'updateEmitterPosition');
            
            // Update with active jetpack
            jetpackParticleEffect.update(0.016, 0.5, true);
            
            // Should update emitter position
            expect(updateEmitterPositionSpy).toHaveBeenCalled();
        });
    });
    
    describe('setState', () => {
        beforeEach(() => {
            jetpackParticleEffect.initialize(mockScene, mockEntity);
            jest.resetAllMocks(); // Reset mocks after initialization
        });
        
        it('should not update if state is unchanged', () => {
            // Set initial state to IDLE
            jetpackParticleEffect.setState(JetpackEffectState.IDLE);
            jest.resetAllMocks();
            
            // Set to the same state again
            jetpackParticleEffect.setState(JetpackEffectState.IDLE);
            
            // Should not update emitter rates
            const particleSystemManager = ParticleSystemManager.mock.instances[0];
            expect(particleSystemManager.updateEmitRate).not.toHaveBeenCalled();
        });
        
        it('should update emit rates based on state', () => {
            // Test different states
            jetpackParticleEffect.setState(JetpackEffectState.OFF);
            
            const particleSystemManager = ParticleSystemManager.mock.instances[0];
            expect(particleSystemManager.updateEmitRate).toHaveBeenCalledWith('thrust-particles-1', 0);
            expect(particleSystemManager.updateEmitRate).toHaveBeenCalledWith('smoke-particles-1', 0);
            expect(particleSystemManager.updateEmitRate).toHaveBeenCalledWith('spark-particles-1', 0);
            
            jest.resetAllMocks();
            
            // Test BOOST state (should be max emit rate)
            jetpackParticleEffect.setState(JetpackEffectState.BOOST);
            
            // Should set emit rates to maximum values
            expect(particleSystemManager.updateEmitRate).toHaveBeenCalledWith('thrust-particles-1', expect.any(Number));
            expect(particleSystemManager.updateEmitRate).toHaveBeenCalledWith('smoke-particles-1', expect.any(Number));
            expect(particleSystemManager.updateEmitRate).toHaveBeenCalledWith('spark-particles-1', expect.any(Number));
        });
    });
    
    describe('setVisible', () => {
        beforeEach(() => {
            jetpackParticleEffect.initialize(mockScene, mockEntity);
            jest.resetAllMocks(); // Reset mocks after initialization
        });
        
        it('should update visibility of all particle systems', () => {
            // Hide all particles
            jetpackParticleEffect.setVisible(false);
            
            const particleSystemManager = ParticleSystemManager.mock.instances[0];
            expect(particleSystemManager.setSystemVisible).toHaveBeenCalledWith('thrust-particles-1', false);
            expect(particleSystemManager.setSystemVisible).toHaveBeenCalledWith('smoke-particles-1', false);
            expect(particleSystemManager.setSystemVisible).toHaveBeenCalledWith('spark-particles-1', false);
            
            jest.resetAllMocks();
            
            // Show all particles
            jetpackParticleEffect.setVisible(true);
            
            expect(particleSystemManager.setSystemVisible).toHaveBeenCalledWith('thrust-particles-1', true);
            expect(particleSystemManager.setSystemVisible).toHaveBeenCalledWith('smoke-particles-1', true);
            expect(particleSystemManager.setSystemVisible).toHaveBeenCalledWith('spark-particles-1', true);
        });
    });
    
    describe('setPositionOffset', () => {
        beforeEach(() => {
            jetpackParticleEffect.initialize(mockScene, mockEntity);
            jest.resetAllMocks(); // Reset mocks after initialization
        });
        
        it('should update position offset and refresh emitter position', () => {
            // Mock the updateEmitterPosition method
            const updateEmitterPositionSpy = jest.spyOn(jetpackParticleEffect as any, 'updateEmitterPosition');
            
            // Set new position offset
            const newOffset = new BABYLON.Vector3(1, 2, 3);
            jetpackParticleEffect.setPositionOffset(newOffset);
            
            // Should have updated emitter position
            expect(updateEmitterPositionSpy).toHaveBeenCalled();
        });
    });
    
    describe('dispose', () => {
        beforeEach(() => {
            jetpackParticleEffect.initialize(mockScene, mockEntity);
            jest.resetAllMocks(); // Reset mocks after initialization
        });
        
        it('should dispose all resources', () => {
            jetpackParticleEffect.dispose();
            
            const particleSystemManager = ParticleSystemManager.mock.instances[0];
            expect(particleSystemManager.removeParticleSystem).toHaveBeenCalledWith('thrust-particles-1');
            expect(particleSystemManager.removeParticleSystem).toHaveBeenCalledWith('smoke-particles-1');
            expect(particleSystemManager.removeParticleSystem).toHaveBeenCalledWith('spark-particles-1');
            expect(particleSystemManager.dispose).toHaveBeenCalled();
        });
    });
}); 