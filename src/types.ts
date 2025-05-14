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

export interface IChatMessage {
  type: "human" | "ai" | "system";
  content: string;
}

// Model and provider related types
export interface IModelConfig {
  apiKey: string;
  /** If not provided, will use the default model */
  temperature?: number;
  systemPrompt?: string;
  model: IModel;
}

export interface IModel {
  id: string;
  displayName: string;
}

export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  provider?: string;
}
