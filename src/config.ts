/**
 * Global application configuration
 */

// Default configuration values
export const DEFAULT_CONFIG = {
  provider: "claude",
  temperature: 0.7,
  systemPrompt:
    "You are a helpful, friendly database assistant. Provide concise and accurate responses about SQL, database schemas, and data analysis.",
};

// Storage keys
export const STORAGE_KEYS = {
  API_KEY: "chatbot_api_key",
  PROVIDER: "chatbot_provider",
};

