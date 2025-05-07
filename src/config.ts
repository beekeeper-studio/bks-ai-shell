/**
 * Global application configuration
 */

// Provider constants
export enum ModelProvider {
  CLAUDE = 'claude',
  MOCK = 'mock'
}

// Default configuration values
export const DEFAULT_CONFIG = {
  provider: ModelProvider.CLAUDE,
  temperature: 0.7,
  systemPrompt: "You are a helpful, friendly database assistant. Provide concise and accurate responses about SQL, database schemas, and data analysis."
};

// Claude model options
export const CLAUDE_MODELS = {
  OPUS: 'claude-3-opus-20240229',
  SONNET: 'claude-3-sonnet-20240229',
  HAIKU: 'claude-3-haiku-20240307',
  SONNET_3_5: 'claude-3-5-sonnet-20240620',
  CLAUDE_3: 'claude-3',
  CLAUDE_2_1: 'claude-2.1',
  CLAUDE_2_0: 'claude-2.0',
  CLAUDE_INSTANT: 'claude-instant-1.2'
};

// Mapping of model IDs to display names
export const MODEL_DISPLAY_NAMES = {
  [CLAUDE_MODELS.OPUS]: 'Claude 3 Opus',
  [CLAUDE_MODELS.SONNET]: 'Claude 3 Sonnet',
  [CLAUDE_MODELS.HAIKU]: 'Claude 3 Haiku', 
  [CLAUDE_MODELS.SONNET_3_5]: 'Claude 3.5 Sonnet',
  [CLAUDE_MODELS.CLAUDE_3]: 'Claude 3 (Latest)',
  [CLAUDE_MODELS.CLAUDE_2_1]: 'Claude 2.1',
  [CLAUDE_MODELS.CLAUDE_2_0]: 'Claude 2.0',
  [CLAUDE_MODELS.CLAUDE_INSTANT]: 'Claude Instant'
};

// Storage keys
export const STORAGE_KEYS = {
  API_KEY: 'chatbot_api_key',
  PROVIDER: 'chatbot_provider',
  MODEL: 'chatbot_model'
};

// Tool configuration
export const TOOLS = {
  getActiveTab: {
    name: "getActiveTab",
    description: "Get information about the user's currently active tab in Beekeeper Studio",
    schema: {
      type: "object",
      properties: {},
      required: [],
    }
  },
  
  analyzeSql: {
    name: "analyzeSql",
    description: "Analyze SQL query for correctness, performance issues, and suggestions",
    schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The SQL query to analyze"
        }
      },
      required: ["query"],
    }
  },
  
  updateQueryText: {
    name: "updateQueryText",
    description: "Update the SQL query text in a specific tab",
    schema: {
      type: "object",
      properties: {
        tabId: {
          type: "number",
          description: "The ID of the tab containing the query to update"
        },
        query: {
          type: "string",
          description: "The new SQL query text"
        }
      },
      required: ["tabId", "query"],
    }
  },

  getConnectionInfo: {
    name: "getConnectionInfo",
    description: "Get information about the current database connection including type, default database, and read-only status",
    schema: {
      type: "object",
      properties: {},
      required: [],
    }
  },
  
  getTables: {
    name: "getTables",
    description: "Get a list of all tables in the current database",
    schema: {
      type: "object",
      properties: {},
      required: [],
    }
  },
  
  getTableColumns: {
    name: "getTableColumns",
    description: "Get all columns for a specific table including name and data type",
    schema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "The name of the table to get columns for"
        }
      },
      required: ["table"],
    }
  }
};
