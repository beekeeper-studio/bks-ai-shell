/**
 * Base model provider interface that all providers must implement
 */

import { MessageContent } from '@langchain/core/messages';
import { IApiResponse, IConversationMessage, IModel, IModelConfig } from '../../types';
import { formatApiError } from '../../utils/errorHandler';

export abstract class BaseModelProvider {
  public static displayName: string;

  protected config: IModelConfig;
  protected apiKey: string;
  protected model: string;

  constructor(config: IModelConfig) {
    this.config = config;
    this.apiKey = config.apiKey || '';
    this.model = config.modelName || '';
  }

  /**
   * Set the API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Set the model name/id
   */
  setModel(modelName: string): void {
    this.model = modelName;
  }

  /**
   * Get the provider name (e.g. Claude, OpenAI)
   */
  abstract getProviderName(): string;

  /**
   * Initialize the model client and any necessary resources
   */
  abstract initialize(): Promise<void>;

  /**
   * Fetch available models from the provider
   */
  abstract getAvailableModels(): Promise<IModel[]>;

  abstract getDefaultModel(): Promise<IModel>;

  /**
   * Format a model for display
   */
  formatModelName(modelId: string): string {
    // Default implementation just returns the model ID
    return modelId;
  }

  /**
   * Send a message to the model and get a response
   */
  abstract sendMessage(message: string, conversationHistory: IConversationMessage[]): Promise<MessageContent>;

  /**
   * Check if the provider is configured correctly
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.model);
  }

  /**
   * Validate configuration and throw error if invalid
   */
  validateConfig(): void {
    if (!this.apiKey) {
      throw new Error('API key not provided');
    }
    if (!this.model) {
      throw new Error('Model name not provided');
    }
  }

  /**
   * Handle provider errors in a consistent way
   */
  protected handleError(error: any): IApiResponse<never> {
    return formatApiError(error);
  }
}
