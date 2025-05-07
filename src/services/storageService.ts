/**
 * Storage service for managing persistent data
 */

import { STORAGE_KEYS } from '../config';

/**
 * Save API key to localStorage
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
  } catch (error) {
    console.error('Error saving API key:', error);
    throw new Error('Failed to save API key');
  }
}

/**
 * Get API key from localStorage
 */
export function getApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.API_KEY);
  } catch (error) {
    console.error('Error getting API key:', error);
    return null;
  }
}

/**
 * Save selected provider to localStorage
 */
export async function saveSelectedProvider(provider: string): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
  } catch (error) {
    console.error('Error saving provider:', error);
    throw new Error('Failed to save provider preference');
  }
}

/**
 * Get selected provider from localStorage
 */
export function getSelectedProvider(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.PROVIDER);
  } catch (error) {
    console.error('Error getting provider:', error);
    return null;
  }
}

/**
 * Save selected model to localStorage
 */
export async function saveSelectedModel(model: string): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEYS.MODEL, model);
  } catch (error) {
    console.error('Error saving model:', error);
    throw new Error('Failed to save model preference');
  }
}

/**
 * Get selected model from localStorage
 */
export function getSelectedModel(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.MODEL);
  } catch (error) {
    console.error('Error getting model:', error);
    return null;
  }
}

/**
 * Clear all storage data
 */
export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    localStorage.removeItem(STORAGE_KEYS.PROVIDER);
    localStorage.removeItem(STORAGE_KEYS.MODEL);
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw new Error('Failed to clear storage');
  }
}