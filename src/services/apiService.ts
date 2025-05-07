/**
 * API service for interacting with AI model providers
 */

import { ModelProviderFactory } from './providers/modelFactory';
import { BaseModelProvider } from './providers/baseProvider';
import { IApiResponse, IConversationMessage, IModel, IModelConfig } from '../types';
import { ModelProvider, DEFAULT_CONFIG, MODEL_DISPLAY_NAMES } from '../config';
import { formatApiError } from '../utils/errorHandler';

// State
let activeProvider: BaseModelProvider | null = null;
let providerName: string = ModelProvider.CLAUDE;

/**
 * Initialize the model provider
 */
export async function initializeProvider(config: IModelConfig = {}): Promise<IApiResponse<{ provider: string }>> {
  try {
    // Create a provider instance
    activeProvider = ModelProviderFactory.createProvider(providerName, config);
    
    // Initialize the provider
    await activeProvider.initialize();
    
    return {
      success: true,
      data: {
        provider: activeProvider.getProviderName()
      }
    };
  } catch (error) {
    console.error(`Error initializing ${providerName} provider:`, error);
    return formatApiError(error);
  }
}

/**
 * Switch to a different provider
 */
export async function switchProvider(
  newProviderName: string, 
  config: IModelConfig = {}
): Promise<IApiResponse<{ provider: string }>> {
  try {
    // Check if we're already using this provider
    if (providerName === newProviderName && activeProvider) {
      return { 
        success: true, 
        data: { provider: activeProvider.getProviderName() }
      };
    }
    
    // Update the provider name
    providerName = newProviderName;
    
    // Create and initialize new provider
    return await initializeProvider(config);
  } catch (error) {
    console.error(`Error switching to ${newProviderName} provider:`, error);
    return formatApiError(error);
  }
}

/**
 * Set API key
 */
export function setApiKey(apiKey: string): void {
  if (activeProvider) {
    activeProvider.setApiKey(apiKey);
  }
}

/**
 * Set model
 */
export function setModel(modelName: string): void {
  if (activeProvider) {
    activeProvider.setModel(modelName);
  }
}

/**
 * Get the current provider name
 */
export function getCurrentProvider(): string {
  return providerName;
}

/**
 * Get active provider details
 */
export function getActiveProviderDetails(): { name: string | null } {
  if (!activeProvider) {
    return { name: null };
  }
  
  return {
    name: activeProvider.getProviderName()
  };
}

/**
 * Fetch available models from current provider
 */
export async function fetchAvailableModels(): Promise<IApiResponse<{ models: IModel[], provider: string }>> {
  try {
    if (!activeProvider) {
      throw new Error('No provider initialized');
    }
    
    // Get models from provider
    const models = await activeProvider.getAvailableModels();
    
    return {
      success: true,
      data: {
        models: models,
        provider: activeProvider.getProviderName()
      }
    };
  } catch (error) {
    console.error('Error fetching models:', error);
    
    // Get fallback models if available
    const fallbackModels = activeProvider ? 
      activeProvider.getFallbackModels() : 
      [];
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to load models',
      data: {
        fallbackModels: fallbackModels.map(id => ({ id })),
        provider: activeProvider?.getProviderName() || 'Unknown'
      }
    };
  }
}

/**
 * Format model name for display
 */
export function formatModelName(modelId: string): string {
  // Check if we have a predefined display name
  if (MODEL_DISPLAY_NAMES[modelId]) {
    return MODEL_DISPLAY_NAMES[modelId];
  }
  
  // Otherwise use the provider's formatting function
  return activeProvider ? 
    activeProvider.formatModelName(modelId) : 
    modelId;
}

/**
 * Send a message to the model
 */
export async function sendMessage(
  message: string, 
  conversationHistory: IConversationMessage[]
): Promise<IApiResponse<{ content: string, provider: string }>> {
  try {
    if (!activeProvider) {
      throw new Error('No provider initialized');
    }
    
    // Send message using the active provider
    const response = await activeProvider.sendMessage(message, conversationHistory);
    
    // Convert MessageContent to string if it's not already
    let contentString: string;
    
    if (typeof response === 'string') {
      contentString = response;
    } else if (typeof response === 'object') {
      if (typeof response.content === 'string') {
        contentString = response.content;
      } else if (Array.isArray(response.content)) {
        // Join array elements for LangChain MessageContent arrays
        contentString = response.content
          .map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && 'text' in item) return item.text;
            return '';
          })
          .filter(Boolean)
          .join('\n');
      } else {
        // Fallback - stringify the content
        try {
          contentString = JSON.stringify(response);
        } catch {
          contentString = '[Complex response]';
        }
      }
    } else {
      contentString = String(response);
    }
    
    return {
      success: true,
      data: {
        content: contentString,
        provider: activeProvider.getProviderName()
      }
    };
  } catch (error) {
    console.error("API error:", error);
    return formatApiError(error);
  }
}

/**
 * Get list of available providers
 */
export function getAvailableProviders(): string[] {
  return ModelProviderFactory.getProviders();
}