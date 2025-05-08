/**
 * API service for interacting with AI model providers
 */

import { createModelProvider } from "./providers/modelFactory";
import { BaseModelProvider } from "./providers/baseProvider";
import {
  IApiResponse,
  IConversationMessage,
  IModel,
  IModelConfig,
} from "../types";
import { ProviderId } from "../configs";
import { formatApiError } from "../utils/errorHandler";

// State
let activeProvider: BaseModelProvider | null = null;
let providerName: ProviderId = "claude";

/**
 * Initialize the model provider
 */
export async function initializeProvider(
  providerName: ProviderId,
  config: IModelConfig,
): Promise<IApiResponse<{ provider: string }>> {
  try {
    // Create a provider instance
    activeProvider = createModelProvider(providerName, config);

    // Initialize the provider
    await activeProvider.initialize();

    return {
      success: true,
      data: {
        provider: activeProvider.getProviderName(),
      },
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
  newProviderName: ProviderId,
  config: IModelConfig,
): Promise<IApiResponse<{ provider: string }>> {
  try {
    // Check if we're already using this provider
    if (providerName === newProviderName && activeProvider) {
      return {
        success: true,
        data: { provider: activeProvider.getProviderName() },
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
    name: activeProvider.getProviderName(),
  };
}

/**
 * Fetch available models from current provider
 */
export async function fetchAvailableModels(): Promise<
  IApiResponse<{
    defaultModel: IModel;
    models: IModel[];
    providerName: string;
  }>
> {
  try {
    if (!activeProvider) {
      throw new Error("No provider initialized");
    }

    const models = await activeProvider.getAvailableModels();
    const defaultModel = await activeProvider.getDefaultModel();
    const providerName = activeProvider.getProviderName();

    return {
      success: true,
      data: {
        defaultModel,
        models,
        providerName,
      },
    };
  } catch (error) {
    console.error("Error fetching models:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load models",
      data: {
        models: [],
        providerName: activeProvider?.getProviderName() || "Unknown",
      },
    };
  }
}

/**
 * Format model name for display
 */
export function formatModelName(modelId: string): string {
  // Use the provider's formatting function or return the ID as is
  return activeProvider ? activeProvider.formatModelName(modelId) : modelId;
}

/**
 * Send a message to the model
 */
export async function sendMessage(
  message: string,
  conversationHistory: IConversationMessage[],
): Promise<IApiResponse<{ content: string; provider: string }>> {
  try {
    if (!activeProvider) {
      throw new Error("No provider initialized");
    }

    // Send message using the active provider
    const response = await activeProvider.sendMessage(
      message,
      conversationHistory,
    );

    // Convert MessageContent to string if it's not already
    let contentString: string;

    if (typeof response === "string") {
      contentString = response;
    } else if (typeof response === "object") {
      if (typeof response.content === "string") {
        contentString = response.content;
      } else if (Array.isArray(response.content)) {
        // Join array elements for LangChain MessageContent arrays
        contentString = response.content
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && "text" in item)
              return item.text;
            return "";
          })
          .filter(Boolean)
          .join("\n");
      } else {
        // Fallback - stringify the content
        try {
          contentString = JSON.stringify(response);
        } catch {
          contentString = "[Complex response]";
        }
      }
    } else {
      contentString = String(response);
    }

    return {
      success: true,
      data: {
        content: contentString,
        provider: activeProvider.getProviderName(),
      },
    };
  } catch (error) {
    console.error("API error:", error);
    return formatApiError(error);
  }
}
