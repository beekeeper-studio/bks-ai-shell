// Model and provider related types
export interface IModelConfig {
  /** If not provided, will use the default model */
  temperature?: number;
  systemPrompt?: string;
  modelId: string;
}

export interface IModel {
  id: string;
  displayName: string;
}
