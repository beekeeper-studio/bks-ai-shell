import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { IChatMessage, IModel, IModelConfig } from "../types";

export interface Callbacks {
  onStart?: () => Promise<void>;
  onStreamChunk: (message: AIMessage) => Promise<void>;
  onComplete?: () => Promise<void>;
  onBeforeToolCall?: (message: ToolMessage) => Promise<void>;
  onAfterToolCall?: (message: ToolMessage) => Promise<void>;
  onFinalized: (conversationHistory: BaseMessage[]) => void;
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
    conversationHistory: BaseMessage[],
  ): Promise<AIMessage>;
  abstract sendStreamMessage(
    message: string,
    conversationHistory: BaseMessage[],
    callbacks: Callbacks,
  ): Promise<void>;

  abstract disconnect(): Promise<void>;
}
