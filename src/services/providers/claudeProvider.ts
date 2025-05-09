import { BaseModelProvider } from "./baseProvider";
import { ChatAnthropic, type AnthropicInput } from "@langchain/anthropic";
import { Anthropic } from "@anthropic-ai/sdk";
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  MessageContent,
} from "@langchain/core/messages";
import {
  generateDatabaseSchemaInfo,
  getConnectionInfoTool,
  getTablesTool,
  getTableColumnsTool,
} from "../../tools/databaseTools";
import { getActiveTabTool, updateQueryTextTool } from "../../tools/modelTools";
import { IConversationMessage, IModel } from "../../types";

export class ClaudeProvider extends BaseModelProvider {
  public static displayName = "Claude";

  private anthropicClient: Anthropic | null = null;
  private langChainModel: ChatAnthropic | null = null;
  private llmWithTools: ReturnType<ChatAnthropic["bindTools"]> | null = null;

  getProviderName(): string {
    return "Claude";
  }

  async initialize(): Promise<void> {
    try {
      this.validateConfig();

      // Initialize the Anthropic client for API interactions
      this.anthropicClient = new Anthropic({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });

      // Initialize LangChain's ChatAnthropic for the chat interface
      // Create config with proper type that includes dangerouslyAllowBrowser
      const chatConfig: AnthropicInput & { dangerouslyAllowBrowser?: boolean } =
        {
          apiKey: this.apiKey,
          model: (await this.getDefaultModel()).id,
          temperature: this.temperature,
          anthropicApiKey: this.apiKey, // For backward compatibility
          dangerouslyAllowBrowser: true,
        };
      this.langChainModel = new ChatAnthropic(chatConfig);

      // Set up tool calling with LangChain - bind all available tools
      const tools = [
        getActiveTabTool,
        updateQueryTextTool,
        getConnectionInfoTool,
        getTablesTool,
        getTableColumnsTool,
      ];
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
      }))
    } catch (error) {
      console.error("Error fetching Claude models:", error);
      throw error;
    }
  }

  // async getDefaultModel(): Promise<IModel> {
  //   const models = await this.getAvailableModels();
  //   return models[0];
  // }

  // FIXME: we dont need this
  formatModelName(modelId: string): string {
    let displayName = modelId;

    // Extract model family and version for better display
    if (modelId.includes("-opus-")) {
      displayName = `Claude 3 Opus (${modelId.split("-").pop()})`;
    } else if (modelId.includes("-sonnet-")) {
      displayName = `Claude 3 Sonnet (${modelId.split("-").pop()})`;
    } else if (modelId.includes("-haiku-")) {
      displayName = `Claude 3 Haiku (${modelId.split("-").pop()})`;
    } else if (modelId.includes("-3-5-")) {
      displayName = `Claude 3.5 (${modelId.split("-").pop()})`;
    } else if (modelId === "claude-3") {
      displayName = "Claude 3 (Latest)";
    } else if (modelId === "claude-2.1") {
      displayName = "Claude 2.1";
    } else if (modelId === "claude-2.0") {
      displayName = "Claude 2.0";
    } else if (modelId.includes("instant")) {
      displayName = `Claude Instant (${modelId.split("-").pop()})`;
    }

    return displayName;
  }

  async sendMessage(
    message: string,
    conversationHistory: IConversationMessage[],
  ): Promise<MessageContent> {
    try {
      // Convert conversation history to LangChain messages and add current message
      const historyWithoutLatest = conversationHistory.slice(0, -1);
      const formattedMessages = historyWithoutLatest.map((msg) =>
        msg.type === "human"
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content),
      );
      const messages = [...formattedMessages, new HumanMessage(message)];

      // Defined available tools
      const tools = [
        getActiveTabTool,
        updateQueryTextTool,
        getConnectionInfoTool,
        getTablesTool,
        getTableColumnsTool,
      ];

      // Process message with potential tool calls recursively
      return this.processMessageWithTools(messages, tools);
    } catch (error) {
      console.error("Error in Claude message:", error);
      throw error;
    }
  }

  /**
   * Helper method to process a message with potential tool calls recursively
   * @param messages Current conversation messages
   * @param tools Available tools
   * @param depth Current recursion depth (to prevent infinite loops)
   * @returns Final message content
   */
  private async processMessageWithTools(
    messages: (HumanMessage | AIMessage | ToolMessage)[],
    tools: any[],
    depth: number = 0,
  ): Promise<MessageContent> {
    // Safety check to prevent infinite tool calls (max 3 levels)
    if (depth > 7) {
      console.warn("Max tool call depth reached, stopping recursion");
      const finalResponse = await this.llmWithTools!.invoke(messages);
      return finalResponse.content;
    }

    // Get response from model
    const aiMessage = await this.llmWithTools!.invoke(messages);

    // If no tool calls were made, return the content directly
    if (!aiMessage.tool_calls?.length) {
      return aiMessage.content;
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
    return this.processMessageWithTools(finalMessages, tools, depth + 1);
  }
}
