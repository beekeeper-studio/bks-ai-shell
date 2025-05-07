/**
 * Common types used throughout the application
 */

// Database and query related types
export interface IConnectionInfo {
  connectionType: string;
  defaultDatabase: string | null;
  readOnlyMode: boolean;
}

export interface ITableColumn {
  name: string;
  type: string;
}

export interface IActiveTab {
  type: "query" | "table" | "settings";
  data?: {
    title: string;
    query: string;
  };
}

// Chat message related types
export interface IChatMessage {
  role: string;
  content: string;
}

export interface IConversationMessage {
  type: "human" | "ai" | "system";
  content: string;
}

// Model and provider related types
export interface IModelConfig {
  apiKey: string;
  modelName?: string;
  temperature?: number;
  systemPrompt?: string;
}

export interface IModel {
  id: string;
  created_at?: number | string;
}

export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  provider?: string;
}