/**
 * API layer for the Vue chat application
 * Provides compatibility layer for the old api.js API
 */

import { ProviderId } from './configs';
import * as apiService from './services/apiService';
// import { BaseModelProvider } from './services/providers/baseProvider';
import { IConversationMessage, IModel, IModelConfig } from './types';
// import { BaseModelProvider } from './services/providers/baseProvider';

// // Re-export functions from apiService with the same signatures as the old api.js
// export const initializeProvider = apiService.initializeProvider;
// export const switchProvider = apiService.switchProvider;
// export const setApiKey = apiService.setApiKey;
// export const setModel = apiService.setModel;
// export const getCurrentProvider = apiService.getCurrentProvider;
// export const getActiveProviderDetails = apiService.getActiveProviderDetails;
// export const formatModelName = apiService.formatModelName;

export type InitializeProviderConfig = {
  provider: ProviderId;
  apiKey: string;
}

/**
 * Fetch available models from current provider
 * (Adapted to match old return format)
 */
export async function fetchAvailableModels(): Promise<{
  success: boolean;
  models?: IModel[];
  provider?: string;
  error?: string;
  fallbackModels?: string[];
}> {
  const response = await apiService.fetchAvailableModels();

  if (response.success && response.data) {
    return {
      success: true,
      models: response.data.models,
      provider: response.data.providerName
    };
  } else {
    // Handle error case
    const fallbackModels = response.data?.fallbackModels?.map(model => model.id) || [];

    return {
      success: false,
      error: response.error || 'Failed to load models',
      fallbackModels,
      provider: response.data?.providerName
    };
  }
}

/**
 * Send a message to the model
 * (Adapted to match old return format)
 */
export async function sendMessage(
  message: string,
  conversationHistory: IConversationMessage[]
): Promise<{
  success: boolean;
  content?: string;
  provider?: string;
  error?: string;
}> {
  const response = await apiService.sendMessage(message, conversationHistory);

  if (response.success && response.data) {
    return {
      success: true,
      content: response.data.content,
      provider: response.data.provider
    };
  } else {
    return {
      success: false,
      error: response.error || 'Error communicating with the model'
    };
  }
}
