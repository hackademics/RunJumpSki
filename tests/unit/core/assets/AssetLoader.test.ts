/**
 * @file tests/unit/core/assets/AssetLoader.test.ts
 * @description Unit tests for the AssetLoader.
 */

import { AssetLoader } from '@core/assets/AssetLoader';

describe('AssetLoader', () => {
  let assetLoader: AssetLoader;
  let originalFetch: any;

  beforeEach(() => {
    assetLoader = new AssetLoader();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('should load JSON asset correctly', async () => {
    const mockData = { key: 'value' };
    const mockResponse = {
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('application/json')
      },
      json: jest.fn().mockResolvedValue(mockData)
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);
    
    const url = 'http://example.com/asset.json';
    const asset = await assetLoader.loadAsset(url);
    
    expect(asset).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(url);
  });

  test('should load text asset correctly', async () => {
    const mockText = 'Hello World';
    const mockResponse = {
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('text/plain')
      },
      text: jest.fn().mockResolvedValue(mockText)
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);
    
    const url = 'http://example.com/asset.txt';
    const asset = await assetLoader.loadAsset(url);
    
    expect(asset).toEqual(mockText);
  });

  test('should load asset as blob for non-JSON/text types', async () => {
    const mockBlob = new Blob(['dummy data'], { type: 'application/octet-stream' });
    const mockResponse = {
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('application/octet-stream')
      },
      blob: jest.fn().mockResolvedValue(mockBlob)
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);
    
    const url = 'http://example.com/asset.bin';
    const asset = await assetLoader.loadAsset(url);
    
    expect(asset).toEqual(mockBlob);
  });

  test('should throw an error if response is not ok', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found'
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);
    
    const url = 'http://example.com/asset.json';
    await expect(assetLoader.loadAsset(url)).rejects.toThrow(`Failed to load asset from ${url}`);
  });

  test('should load multiple assets', async () => {
    const mockData1 = { data: 1 };
    const mockData2 = { data: 2 };
    const mockResponse1 = {
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('application/json')
      },
      json: jest.fn().mockResolvedValue(mockData1)
    };
    const mockResponse2 = {
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('application/json')
      },
      json: jest.fn().mockResolvedValue(mockData2)
    };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(mockResponse1)
      .mockResolvedValueOnce(mockResponse2);
    
    const urls = ['http://example.com/asset1.json', 'http://example.com/asset2.json'];
    const assets = await assetLoader.loadAssets(urls);
    
    expect(assets).toEqual([mockData1, mockData2]);
  });
});
