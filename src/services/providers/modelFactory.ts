/**
 * Factory for creating model providers
 */

import { ClaudeProvider } from './claudeProvider';
import { MockProvider } from './mockProvider';
import { BaseModelProvider } from './baseProvider';
import { ModelProvider } from '../../config';
import { IModelConfig } from '../../types';

/**
 * Create a provider instance based on type
 */
export function createModelProvider(providerName: string, config: IModelConfig): BaseModelProvider {
  switch (providerName) {
    case ModelProvider.CLAUDE:
      return new ClaudeProvider(config);
    case ModelProvider.MOCK:
      return new MockProvider(config);
    default:
      // Default to Claude if provider type is unknown
      console.warn(`Unknown provider type: ${providerName}, defaulting to Claude`);
      return new ClaudeProvider(config);
  }
}

/**
 * Get a list of available providers in the system
 */
export function getAvailableProviders(): string[] {
  return [
    ModelProvider.CLAUDE,
    ModelProvider.MOCK
  ];
}

/**
 * Factory for loading the appropriate provider
 */
export class ModelProviderFactory {
  /**
   * Create provider instance
   */
  static createProvider(providerName: string, config: IModelConfig): BaseModelProvider {
    return createModelProvider(providerName, config);
  }
  
  /**
   * Get available providers
   */
  static getProviders(): string[] {
    return getAvailableProviders();
  }
}