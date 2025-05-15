import { BaseModelProvider, Callbacks } from "./baseProvider";
import { ChatAnthropic, type AnthropicInput } from "@langchain/anthropic";
import { Anthropic } from "@anthropic-ai/sdk";
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  SystemMessage,
  AIMessageChunk,
  BaseMessage,
} from "@langchain/core/messages";
import {
  getConnectionInfoTool,
  getTablesTool,
  getTableColumnsTool,
  getActiveTabTool,
  updateQueryTextTool,
} from "../tools";
import { IModel, IModelConfig } from "../types";

interface ClaudeProviderConfig {
  anthropicClient: Anthropic;
}

const tools = [
  getActiveTabTool,
  updateQueryTextTool,
  getConnectionInfoTool,
  getTablesTool,
  getTableColumnsTool,
];

export class ClaudeProvider extends BaseModelProvider {
  public static id = "claude" as const;
  public static displayName = "Claude" as const;

  private anthropicClient: Anthropic;
  private langChainModel: ChatAnthropic | null = null;
  private llmWithTools: ReturnType<ChatAnthropic["bindTools"]> | null = null;

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
      this.langChainModel = new ChatAnthropic(chatConfig);

      this.llmWithTools = this.langChainModel.bindTools(tools);
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

  async sendStreamMessage(
    message: string,
    conversationHistory: BaseMessage[],
    callbacks: Callbacks,
  ): Promise<void> {
    try {
      const messages = [...conversationHistory, new HumanMessage(message)];

      // Process message with potential tool calls recursively
      this.processStreamMessageWithTools(messages, callbacks);
    } catch (error) {
      console.error("Error in Claude message:", error);
      throw error;
    }
  }

  async processStreamMessageWithTools(
    messages: BaseMessage[],
    callbacks: Callbacks,
    depth: number = 0,
  ): Promise<void> {
    // Safety check to prevent infinite tool calls (max 10 levels)
    if (depth > 10) {
      console.warn("Max tool call depth reached, stopping recursion");
      const stream = await this.llmWithTools!.stream(messages);
      const aiMessage = (await stream.next()).value as AIMessageChunk;

      for await (const chunk of stream) {
        aiMessage.concat(chunk);
        await callbacks.onStreamChunk(aiMessage);
      }

      callbacks.onFinalized(messages);

      return;
    }

    const stream = await this.llmWithTools!.stream(messages);
    let aiMessage: AIMessageChunk = (await stream.next()).value;

    await callbacks.onStart?.();

    for await (const chunk of stream) {
      aiMessage = aiMessage.concat(chunk);
      await callbacks.onStreamChunk(aiMessage);
    }

    await callbacks.onComplete?.();

    const updatedMessages = [...messages, aiMessage];

    // No tool calls. End stream.
    if (!aiMessage.tool_calls?.length) {
      callbacks.onFinalized(updatedMessages);
      return;
    }

    const toolMessages: ToolMessage[] = [];

    // Handle each tool call
    for (const toolCall of aiMessage.tool_calls) {
      const toolToUse = tools.find((t) => t.name === toolCall.name);
      const name = toolCall.name;
      const id = toolCall.id || "";
      let result: any;
      let toolMessage = new ToolMessage("", id, name);

      // Execute tool and collect result
      await callbacks.onBeforeToolCall?.(toolMessage);

      try {
        if (!toolToUse) {
          throw new Error(`Unknown tool: ${toolCall.name}`);
        }

        const toolResult = await toolToUse.invoke(toolCall);
        result = toolResult.text;
        toolMessage = new ToolMessage(toolResult, id, name);
      } catch (error) {
        console.error(`Error with tool ${toolCall.name}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        result = JSON.stringify({ error: errorMessage });
        toolMessage = new ToolMessage(result, id, name);
      }

      toolMessages.push(toolMessage);

      // Execute tool and collect result
      await callbacks.onAfterToolCall?.(toolMessage);
    }

    // Recursively process the messages with tool results
    const finalMessages = [...updatedMessages, ...toolMessages];
    return this.processStreamMessageWithTools(
      finalMessages,
      callbacks,
      depth + 1,
    );
  }

  async disconnect(): Promise<void> {
    // do nothing
  }
}
