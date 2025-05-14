import { IChatMessage, IModel, IModelConfig } from "../types";

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
    callbacks: {
      onChunk: (text: string) => Promise<void>;
      onTool: (tool: string) => Promise<void>;
      onEnd: () => void;
    },
  ): Promise<void>;

  abstract disconnect(): Promise<void>;
}
