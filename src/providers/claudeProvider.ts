import { BaseModelProvider } from "./baseProvider";
import { ChatAnthropic, type AnthropicInput } from "@langchain/anthropic";
import { Anthropic } from "@anthropic-ai/sdk";
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  SystemMessage,
  AIMessageChunk,
} from "@langchain/core/messages";
import {
  getConnectionInfoTool,
  getTablesTool,
  getTableColumnsTool,
  getActiveTabTool,
  updateQueryTextTool,
} from "../tools";
import { IChatMessage, IModel, IModelConfig } from "../types";

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

  async sendMessage(
    message: string,
    conversationHistory: IChatMessage[],
  ): Promise<string> {
    try {
      // Convert conversation history to LangChain messages and add current message
      const historyWithoutLatest = conversationHistory.slice(0, -1);
      const formattedMessages = historyWithoutLatest.map((msg) =>
        msg.type === "human"
          ? new HumanMessage(msg.content)
          : msg.type === "system"
            ? new SystemMessage(msg.content)
            : new AIMessage(msg.content),
      );
      const messages = [...formattedMessages, new HumanMessage(message)];

      // Process message with potential tool calls recursively
      return this.processMessageWithTools(messages);
    } catch (error) {
      console.error("Error in Claude message:", error);
      throw error;
    }
  }

  async sendStreamMessage(
    message: string,
    conversationHistory: IChatMessage[],
    callbacks: {
      onChunk: (text: string) => Promise<void>;
      onTool: (tool: string) => Promise<void>;
      onEnd: () => void;
    }
  ): Promise<void> {
    try {
      // Convert conversation history to LangChain messages and add current message
      const historyWithoutLatest = conversationHistory.slice(0, -1);
      const formattedMessages = historyWithoutLatest.map((msg) =>
        msg.type === "human"
          ? new HumanMessage(msg.content)
          : msg.type === "system"
            ? new SystemMessage(msg.content)
            : new AIMessage(msg.content),
      );
      const messages = [...formattedMessages, new HumanMessage(message)];

      // Process message with potential tool calls recursively
      this.processStreamMessageWithTools(messages, callbacks);
    } catch (error) {
      console.error("Error in Claude message:", error);
      throw error;
    }
  }

  async processStreamMessageWithTools(
    messages: (HumanMessage | AIMessage | ToolMessage)[],
    callbacks: {
      onChunk: (text: string) => Promise<void>;
      onTool: (tool: string) => Promise<void>;
      onEnd: () => void;
    },
    depth: number = 0,
  ): Promise<void> {
    // Safety check to prevent infinite tool calls (max 7 levels)
    if (depth > 7) {
      console.warn("Max tool call depth reached, stopping recursion");
      const stream = await this.llmWithTools!.stream(messages);
      const aiMessage = (await stream.next()).value as AIMessageChunk;

      for await (const chunk of stream) {
        await callbacks.onChunk(chunk.text);
        aiMessage.concat(chunk);
      }

      callbacks.onEnd();

      return;
    }

    const stream = await this.llmWithTools!.stream(messages);
    let aiMessage: AIMessageChunk = (await stream.next()).value;

    for await (const chunk of stream) {
      await callbacks.onChunk(chunk.text);
      aiMessage = aiMessage.concat(chunk);
    }

    // No tool calls. End stream.
    if (!aiMessage.tool_calls?.length) {
      callbacks.onEnd();
      return;
    }

    const updatedMessages = [...messages, aiMessage];
    const toolMessages: ToolMessage[] = [];

    // Handle each tool call
    for (const toolCall of aiMessage.tool_calls) {
      const toolToUse = tools.find((t) => t.name === toolCall.name);

      try {
        if (!toolToUse) {
          throw new Error(`Unknown tool: ${toolCall.name}`);
        }

        // Execute tool and collect result
        await callbacks.onTool(toolCall.name);
        const toolResult = await toolToUse.invoke(toolCall);
        toolMessages.push(new ToolMessage(toolResult, toolCall.id || ""));
      } catch (error) {
        console.error(`Error with tool ${toolCall.name}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toolMessages.push(
          new ToolMessage(
            JSON.stringify({ error: errorMessage }),
            toolCall.id || "",
          ),
        );
      }
    }

    // Recursively process the messages with tool results
    const finalMessages = [...updatedMessages, ...toolMessages];
    return this.processStreamMessageWithTools(
      finalMessages,
      callbacks,
      depth + 1,
    );
  }

  /**
   * Helper method to process a message with potential tool calls recursively
   * @param messages Current conversation messages
   * @param depth Current recursion depth (to prevent infinite loops)
   * @returns Final message content
   */
  private async processMessageWithTools(
    messages: (HumanMessage | AIMessage | ToolMessage)[],
    depth: number = 0,
  ): Promise<string> {
    // Safety check to prevent infinite tool calls (max 3 levels)
    if (depth > 7) {
      console.warn("Max tool call depth reached, stopping recursion");
      const finalResponse = await this.llmWithTools!.invoke(messages);
      return finalResponse.text;
    }

    // Get response from model
    const aiMessage = await this.llmWithTools!.invoke(messages);

    // If no tool calls were made, return the content directly
    if (!aiMessage.tool_calls?.length) {
      return aiMessage.text;
    }

    // Process tool calls
    const updatedMessages = [...messages, aiMessage];
    const toolMessages: ToolMessage[] = [];

    // Handle each tool call
    for (const toolCall of aiMessage.tool_calls) {
      const toolToUse = tools.find((t) => t.name === toolCall.name);

      try {
        if (!toolToUse) {
          throw new Error(`Unknown tool: ${toolCall.name}`);
        }

        // Execute tool and collect result
        const toolResult = await toolToUse.invoke(toolCall);
        toolMessages.push(new ToolMessage(toolResult, toolCall.id || ""));
      } catch (error) {
        console.error(`Error with tool ${toolCall.name}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toolMessages.push(
          new ToolMessage(
            JSON.stringify({ error: errorMessage }),
            toolCall.id || "",
          ),
        );
      }
    }

    // Recursively process the messages with tool results
    const finalMessages = [...updatedMessages, ...toolMessages];
    return this.processMessageWithTools(finalMessages, depth + 1);
  }

  async disconnect(): Promise<void> {
    // do nothing
  }
}
