import { BaseModelProvider, Callbacks } from "./baseProvider";
import { ChatAnthropic, type AnthropicInput } from "@langchain/anthropic";
import { Anthropic } from "@anthropic-ai/sdk";
import { tools } from "../tools";
import { IModel, IModelConfig } from "../types";

interface ClaudeProviderConfig {
  anthropicClient: Anthropic;
}

export class ClaudeProvider extends BaseModelProvider {
  public static id = "claude" as const;
  public static displayName = "Claude" as const;

  private anthropicClient: Anthropic;

  static async create(apiKey: string) {
    const anthropicClient = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
    const models = await anthropicClient.models.list();
    const defaultModel = models.data[0];
    return new ClaudeProvider(
      {
        apiKey,
        model: {
          id: defaultModel.id,
          displayName: defaultModel.display_name,
        },
      },
      {
        anthropicClient,
      },
    );
  }

  constructor(config: IModelConfig, claudeConfig: ClaudeProviderConfig) {
    super(config);
    this.anthropicClient = claudeConfig.anthropicClient;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize LangChain's ChatAnthropic for the chat interface
      // Create config with proper type that includes dangerouslyAllowBrowser
      const chatConfig: AnthropicInput & { dangerouslyAllowBrowser?: boolean } =
      {
        apiKey: this.config.apiKey,
        model: this.config.model.id,
        temperature: this.config.temperature,
        anthropicApiKey: this.config.apiKey, // For backward compatibility
        dangerouslyAllowBrowser: true,
      };
      this.llm = new ChatAnthropic(chatConfig);
    } catch (error) {
      console.error("Error initializing Claude provider:", error);
      throw error;
    }
  }

  async getAvailableModels(): Promise<IModel[]> {
    try {
      const response = await this.anthropicClient!.models.list();
      return response.data.map((model) => ({
        id: model.id,
        displayName: model.display_name,
      }));
    } catch (error) {
      console.error("Error fetching Claude models:", error);
      throw error;
    }
  }

  getModel(): IModel {
    return this.config.model;
  }

  switchModelById(modelId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async disconnect(): Promise<void> {
    // do nothing
  }
}
