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
