import { IChatMessage, IModel, IModelConfig } from "../types";

export interface Callbacks {
  onStart?: () => Promise<void>;
  onStreamChunk: (text: string) => Promise<void>;
  onComplete?: () => Promise<void>;
  onToolCall?: (tool: string) => Promise<void>;
  onFinalized: () => void;
}

export abstract class BaseModelProvider {
  public static id: string;
  public static displayName: string;

  protected config: IModelConfig;

  constructor(config: IModelConfig) {
    this.config = config;
  }

  static async create(apiKey: string): Promise<BaseModelProvider> {
    throw new Error("Not implemented");
  }

  abstract initialize(): Promise<void>;

  abstract getModel(): IModel;
  abstract getAvailableModels(): Promise<IModel[]>;
  abstract switchModelById(modelId: string): Promise<void>;
  async getDefaultModel(): Promise<IModel> {
    const models = await this.getAvailableModels();
    return models[0];
  }

  /**
   * Send a message to the model and get a response
   */
  abstract sendMessage(
    message: string,
    conversationHistory: IChatMessage[],
  ): Promise<string>;
  abstract sendStreamMessage(
    message: string,
    conversationHistory: IChatMessage[],
    callbacks: Callbacks,
  ): Promise<void>;

  abstract disconnect(): Promise<void>;
}
