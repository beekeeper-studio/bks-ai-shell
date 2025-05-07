/**
 * Storage utilities for Vue application with iframe support
 * Provides compatibility layer for the old store.js API
 */

import * as storageService from './services/storageService';
import { STORAGE_KEYS } from './config';

// Default values
const DEFAULT_MODEL = 'claude-3-5-sonnet-20240620';
const DEFAULT_PROVIDER = 'claude';

// Determine if we have access to the plugin storage API
const hasPluginStorage = typeof (window as any).beekeeper !== 'undefined' && (window as any).beekeeper.storage;

/**
 * Save API key to storage
 */
export async function saveApiKey(key: string): Promise<void> {
  if (hasPluginStorage) {
    await (window as any).beekeeper.storage.set(STORAGE_KEYS.API_KEY, key);
  } else {
    await storageService.saveApiKey(key);
  }
}

/**
 * Get API key from storage
 */
export async function getApiKey(): Promise<string> {
  if (hasPluginStorage) {
    return await (window as any).beekeeper.storage.get(STORAGE_KEYS.API_KEY) || '';
  } else {
    return storageService.getApiKey() || '';
  }
}

/**
 * Save selected model to storage
 */
export async function saveSelectedModel(model: string): Promise<void> {
  if (hasPluginStorage) {
    await (window as any).beekeeper.storage.set(STORAGE_KEYS.MODEL, model);
  } else {
    await storageService.saveSelectedModel(model);
  }
}

/**
 * Get selected model from storage
 */
export async function getSelectedModel(): Promise<string> {
  if (hasPluginStorage) {
    return await (window as any).beekeeper.storage.get(STORAGE_KEYS.MODEL) || DEFAULT_MODEL;
  } else {
    return storageService.getSelectedModel() || DEFAULT_MODEL;
  }
}

/**
 * Save selected provider to storage
 */
export async function saveSelectedProvider(provider: string): Promise<void> {
  if (hasPluginStorage) {
    await (window as any).beekeeper.storage.set(STORAGE_KEYS.PROVIDER, provider);
  } else {
    await storageService.saveSelectedProvider(provider);
  }
}

/**
 * Get selected provider from storage
 */
export async function getSelectedProvider(): Promise<string> {
  if (hasPluginStorage) {
    return await (window as any).beekeeper.storage.get(STORAGE_KEYS.PROVIDER) || DEFAULT_PROVIDER;
  } else {
    return storageService.getSelectedProvider() || DEFAULT_PROVIDER;
  }
}

/**
 * Clear all stored data (for logout)
 */
export async function clearStoredData(): Promise<void> {
  if (hasPluginStorage) {
    await (window as any).beekeeper.storage.remove(STORAGE_KEYS.API_KEY);
    await (window as any).beekeeper.storage.remove(STORAGE_KEYS.MODEL);
    await (window as any).beekeeper.storage.remove(STORAGE_KEYS.PROVIDER);
  } else {
    storageService.clearStorage();
  }
}