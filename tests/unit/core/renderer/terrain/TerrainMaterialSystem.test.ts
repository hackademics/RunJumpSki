/**
 * @file tests/unit/core/renderer/terrain/TerrainMaterialSystem.test.ts
 * @description Unit tests for TerrainMaterialSystem
 */

import * as BABYLON from 'babylonjs';
import { 
  TerrainMaterialSystem, 
  TerrainMaterialLayer,
  TerrainMaterialConfig,
  DEFAULT_TERRAIN_MATERIAL_CONFIG
} from '../../../../../src/core/renderer/terrain/TerrainMaterialSystem';

// Mock BabylonJS classes
jest.mock('babylonjs');

describe('TerrainMaterialSystem', () => {
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockPBRMaterial: jest.Mocked<BABYLON.PBRMaterial>;
  let mockShaderMaterial: jest.Mocked<BABYLON.ShaderMaterial>;
  let mockTexture: jest.Mocked<BABYLON.Texture>;
  let materialSystem: TerrainMaterialSystem;
  let defaultConfig: TerrainMaterialConfig;
  
  beforeEach(() => {
    // Create mocks
    mockTexture = {
      updateSamplingMode: jest.fn(),
      wrapU: 0,
      wrapV: 0,
      uScale: 1,
      vScale: 1,
      dispose: jest.fn()
    } as unknown as jest.Mocked<BABYLON.Texture>;
    
    mockPBRMaterial = {
      dispose: jest.fn(),
      metallic: 0,
      roughness: 0,
      albedoColor: new BABYLON.Color3(),
      albedoTexture: null,
      bumpTexture: null
    } as unknown as jest.Mocked<BABYLON.PBRMaterial>;
    
    mockShaderMaterial = {
      dispose: jest.fn(),
      setTexture: jest.fn(),
      setFloat: jest.fn(),
      setInt: jest.fn(),
      setVector3: jest.fn(),
      setColor3: jest.fn()
    } as unknown as jest.Mocked<BABYLON.ShaderMaterial>;
    
    mockScene = {} as jest.Mocked<BABYLON.Scene>;
    
    // Mock Texture constructor
    (BABYLON.Texture as jest.Mock).mockImplementation(() => mockTexture);
    
    // Mock PBRMaterial constructor
    (BABYLON.PBRMaterial as jest.Mock).mockImplementation(() => mockPBRMaterial);
    
    // Mock ShaderMaterial constructor
    (BABYLON.ShaderMaterial as jest.Mock).mockImplementation(() => mockShaderMaterial);
    
    defaultConfig = { ...DEFAULT_TERRAIN_MATERIAL_CONFIG };
    
    // Create TerrainMaterialSystem instance
    materialSystem = new TerrainMaterialSystem(mockScene, defaultConfig);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('constructor', () => {
    test('should initialize with default config when no config provided', () => {
      const systemWithDefaultConfig = new TerrainMaterialSystem(mockScene);
      // Initialization is successful if no errors are thrown
      expect(systemWithDefaultConfig).toBeDefined();
    });
    
    test('should initialize with custom config', () => {
      const customConfig: Partial<TerrainMaterialConfig> = {
        blendSharpness: 0.8,
        enableNormalMap: false,
        triplanarMapping: true,
        textureResolution: 512,
        useCustomShader: false,
        globalTiling: 5.0,
        baseColor: new BABYLON.Color3(0.5, 0.6, 0.7)
      };
      
      const systemWithCustomConfig = new TerrainMaterialSystem(mockScene, customConfig);
      // Initialization is successful if no errors are thrown
      expect(systemWithCustomConfig).toBeDefined();
    });
  });
  
  describe('updateConfig', () => {
    test('should update configuration properties', () => {
      // Initial config
      expect(materialSystem['config'].blendSharpness).toBe(DEFAULT_TERRAIN_MATERIAL_CONFIG.blendSharpness);
      
      // Update config
      const newConfig: Partial<TerrainMaterialConfig> = {
        blendSharpness: 0.75,
        enableNormalMap: false
      };
      
      materialSystem.updateConfig(newConfig);
      
      // Verify config was updated
      expect(materialSystem['config'].blendSharpness).toBe(0.75);
      expect(materialSystem['config'].enableNormalMap).toBe(false);
      
      // Other properties should remain unchanged
      expect(materialSystem['config'].globalTiling).toBe(DEFAULT_TERRAIN_MATERIAL_CONFIG.globalTiling);
    });
  });
  
  describe('addLayer', () => {
    test('should add a new material layer', () => {
      const layer: TerrainMaterialLayer = {
        texture: 'textures/grass.png',
        normalMap: 'textures/grass_normal.png',
        minSlope: 0,
        maxSlope: 30,
        minHeight: 0,
        maxHeight: 0.5,
        tiling: 20
      };
      
      materialSystem.addLayer(layer);
      
      // Verify layer was added
      expect(materialSystem['layers'].length).toBe(1);
      expect(materialSystem['layers'][0]).toEqual(layer);
    });
    
    test('should handle adding multiple layers', () => {
      const layer1: TerrainMaterialLayer = {
        texture: 'textures/grass.png',
        minSlope: 0,
        maxSlope: 30,
        minHeight: 0,
        maxHeight: 0.5,
        tiling: 20
      };
      
      const layer2: TerrainMaterialLayer = {
        texture: 'textures/rock.png',
        minSlope: 30,
        maxSlope: 90,
        minHeight: 0,
        maxHeight: 1,
        tiling: 15
      };
      
      materialSystem.addLayer(layer1);
      materialSystem.addLayer(layer2);
      
      // Verify layers were added
      expect(materialSystem['layers'].length).toBe(2);
      expect(materialSystem['layers'][0]).toEqual(layer1);
      expect(materialSystem['layers'][1]).toEqual(layer2);
    });
  });
  
  describe('setTerrainSize', () => {
    test('should update terrain size', () => {
      const terrainSize = new BABYLON.Vector3(2000, 150, 2000);
      materialSystem.setTerrainSize(terrainSize);
      
      // Verify terrain size was updated
      expect(materialSystem['terrainSize']).toEqual(terrainSize);
    });
  });
  
  describe('createMaterial', () => {
    test('should create PBR material when custom shader is disabled', () => {
      // Ensure custom shader is disabled
      materialSystem.updateConfig({ useCustomShader: false });
      
      // Add a layer
      const layer: TerrainMaterialLayer = {
        texture: 'textures/grass.png',
        minSlope: 0,
        maxSlope: 30,
        minHeight: 0,
        maxHeight: 0.5,
        tiling: 20
      };
      
      materialSystem.addLayer(layer);
      
      // Create material
      const material = materialSystem.createMaterial();
      
      // Verify PBR material was created
      expect(BABYLON.PBRMaterial).toHaveBeenCalled();
      expect(material).toBe(mockPBRMaterial);
      
      // Verify texture was loaded
      expect(BABYLON.Texture).toHaveBeenCalledWith('textures/grass.png', mockScene);
    });
    
    test('should create shader material when custom shader is enabled and layers exist', () => {
      // Enable custom shader
      materialSystem.updateConfig({ useCustomShader: true });
      
      // Add layers
      const layer1: TerrainMaterialLayer = {
        texture: 'textures/grass.png',
        minSlope: 0,
        maxSlope: 30,
        minHeight: 0,
        maxHeight: 0.5,
        tiling: 20
      };
      
      const layer2: TerrainMaterialLayer = {
        texture: 'textures/rock.png',
        minSlope: 30,
        maxSlope: 90,
        minHeight: 0,
        maxHeight: 1,
        tiling: 15
      };
      
      materialSystem.addLayer(layer1);
      materialSystem.addLayer(layer2);
      
      // Create material
      const material = materialSystem.createMaterial();
      
      // Verify shader material was created
      expect(BABYLON.ShaderMaterial).toHaveBeenCalled();
      expect(material).toBe(mockShaderMaterial);
      
      // Verify textures were loaded
      expect(BABYLON.Texture).toHaveBeenCalledWith('textures/grass.png', mockScene);
      expect(BABYLON.Texture).toHaveBeenCalledWith('textures/rock.png', mockScene);
      
      // Verify material parameters were set
      expect(mockShaderMaterial.setTexture).toHaveBeenCalled();
      expect(mockShaderMaterial.setFloat).toHaveBeenCalled();
      expect(mockShaderMaterial.setInt).toHaveBeenCalled();
      expect(mockShaderMaterial.setVector3).toHaveBeenCalled();
    });
    
    test('should apply normal maps when enabled', () => {
      // Enable normal mapping
      materialSystem.updateConfig({ enableNormalMap: true });
      
      // Add a layer with normal map
      const layer: TerrainMaterialLayer = {
        texture: 'textures/grass.png',
        normalMap: 'textures/grass_normal.png',
        minSlope: 0,
        maxSlope: 30,
        minHeight: 0,
        maxHeight: 0.5,
        tiling: 20
      };
      
      materialSystem.addLayer(layer);
      
      // Create material
      const material = materialSystem.createMaterial();
      
      // Verify normal map was loaded
      expect(BABYLON.Texture).toHaveBeenCalledWith('textures/grass_normal.png', mockScene);
    });
  });
  
  describe('getMaterial', () => {
    test('should return null if no material has been created', () => {
      const material = materialSystem.getMaterial();
      expect(material).toBeNull();
    });
    
    test('should return the created material', () => {
      // Create a material first
      materialSystem.addLayer({
        texture: 'textures/grass.png',
        minSlope: 0,
        maxSlope: 30,
        minHeight: 0,
        maxHeight: 0.5,
        tiling: 20
      });
      
      const createdMaterial = materialSystem.createMaterial();
      const retrievedMaterial = materialSystem.getMaterial();
      
      expect(retrievedMaterial).toBe(createdMaterial);
    });
  });
  
  describe('dispose', () => {
    test('should dispose material and textures', () => {
      // Add a layer
      materialSystem.addLayer({
        texture: 'textures/grass.png',
        minSlope: 0,
        maxSlope: 30,
        minHeight: 0,
        maxHeight: 0.5,
        tiling: 20
      });
      
      // Create material
      materialSystem.createMaterial();
      
      // Dispose
      materialSystem.dispose();
      
      // Verify material was disposed
      expect(mockPBRMaterial.dispose).toHaveBeenCalled();
      
      // Verify texture was disposed
      expect(mockTexture.dispose).toHaveBeenCalled();
    });
  });
}); 