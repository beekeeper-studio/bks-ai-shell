import { BaseModelProvider } from './baseProvider';
import { ChatAnthropic, type AnthropicInput } from '@langchain/anthropic';
import { Anthropic } from '@anthropic-ai/sdk';
import { HumanMessage, AIMessage, ToolMessage, MessageContent } from "@langchain/core/messages";
import {
  generateDatabaseSchemaInfo,
  getConnectionInfoTool,
  getTablesTool,
  getTableColumnsTool
} from '../../tools/databaseTools';
import { getActiveTabTool, updateQueryTextTool } from '../../tools/modelTools';
import { IConversationMessage, IModel } from '../../types';

export class ClaudeProvider extends BaseModelProvider {
  public static displayName = 'Claude';

  private anthropicClient: Anthropic | null = null;
  private langChainModel: ChatAnthropic | null = null;
  private llmWithTools: ReturnType<ChatAnthropic['bindTools']> | null = null;

  getProviderName(): string {
    return 'Claude';
  }

  async initialize(): Promise<boolean> {
    try {
      this.validateConfig();

      // Initialize the Anthropic client for API interactions
      this.anthropicClient = new Anthropic({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true
      });

      // Initialize LangChain's ChatAnthropic for the chat interface
      // Create config with proper type that includes dangerouslyAllowBrowser
      const chatConfig: AnthropicInput & {dangerouslyAllowBrowser?: boolean} = {
        apiKey: this.apiKey,
        model: this.model,
        temperature: this.temperature,
        anthropicApiKey: this.apiKey, // For backward compatibility
        dangerouslyAllowBrowser: true
      };
      this.langChainModel = new ChatAnthropic(chatConfig);

      // Set up tool calling with LangChain - bind all available tools
      const tools = [
        getActiveTabTool,
        updateQueryTextTool,
        getConnectionInfoTool,
        getTablesTool,
        getTableColumnsTool
      ];
      this.llmWithTools = this.langChainModel.bindTools(tools);

      // Get database schema information for the system prompt
      try {
        const schemaInfo = await generateDatabaseSchemaInfo();

        // Enhanced system prompt with database schema
        this.systemPrompt = `${this.systemPrompt}

${schemaInfo}

You can help the user query and understand this database.

You have the following special tools available:

1. getActiveTab - Get information about the user's currently active tab.
   - This returns an object with: { type: "query" | "table" | "settings", data?: { title: string; query: string; } }
   - Use this when you need context about what the user is currently working on.
   - For example, if the user asks "What's wrong with my query?", you should call this tool to see their current query.

2. updateQueryText - Update the SQL query text in a specific tab.
   - This takes a tabId (number) and a query (string) as input.
   - Use this when you need to modify the user's SQL query, such as when implementing suggestions or fixes.
   - Always confirm with the user before modifying their query.

3. getConnectionInfo - Get information about the current database connection.
   - This returns information about the connection type, default database, and read-only status.
   - Use this when you need to understand what database system the user is working with.

4. getTables - Get a list of all tables in the current database.
   - This returns an array of table names available in the database.
   - Use this when the user asks about available tables or database structure.

5. getTableColumns - Get all columns for a specific table.
   - This takes a table (string) as input and returns column details including name and data type.
   - Use this when the user asks about table structure or needs help constructing queries for a specific table.`;
      } catch (schemaError) {
        console.error("Error fetching database schema:", schemaError);
        // Continue with original system prompt if there's an error
      }

      return true;
    } catch (error) {
      console.error("Error initializing Claude provider:", error);
      throw error;
    }
  }

  async getAvailableModels(): Promise<IModel[]> {
    try {
      if (!this.apiKey) {
        throw new Error('API key not provided');
      }

      // Initialize the client if not already done
      if (!this.anthropicClient) {
        this.anthropicClient = new Anthropic({
          apiKey: this.apiKey,
          dangerouslyAllowBrowser: true
        });
      }

      // Get available models
      const response = await this.anthropicClient.models.list();

      // Filter for Claude models and sort by most recent/capable
      const claudeModels = response.data
        .filter(model => model.id.startsWith('claude'))
        .sort((a, b) => {
          // Sort Opus models first, then Sonnet, then Haiku
          if (a.id.includes('opus') && !b.id.includes('opus')) return -1;
          if (!a.id.includes('opus') && b.id.includes('opus')) return 1;
          if (a.id.includes('sonnet') && !b.id.includes('sonnet')) return -1;
          if (!a.id.includes('sonnet') && b.id.includes('sonnet')) return 1;

          // For models of the same tier, sort by date (convert string timestamps to numbers)
          const aTimestamp = typeof a.created_at === 'string' ? Date.parse(a.created_at) : (a.created_at || 0);
          const bTimestamp = typeof b.created_at === 'string' ? Date.parse(b.created_at) : (b.created_at || 0);
          return bTimestamp - aTimestamp;
        });

      return claudeModels;
    } catch (error) {
      console.error('Error fetching Claude models:', error);
      throw error;
    }
  }

  formatModelName(modelId: string): string {
    let displayName = modelId;

    // Extract model family and version for better display
    if (modelId.includes('-opus-')) {
      displayName = `Claude 3 Opus (${modelId.split('-').pop()})`;
    } else if (modelId.includes('-sonnet-')) {
      displayName = `Claude 3 Sonnet (${modelId.split('-').pop()})`;
    } else if (modelId.includes('-haiku-')) {
      displayName = `Claude 3 Haiku (${modelId.split('-').pop()})`;
    } else if (modelId.includes('-3-5-')) {
      displayName = `Claude 3.5 (${modelId.split('-').pop()})`;
    } else if (modelId === 'claude-3') {
      displayName = 'Claude 3 (Latest)';
    } else if (modelId === 'claude-2.1') {
      displayName = 'Claude 2.1';
    } else if (modelId === 'claude-2.0') {
      displayName = 'Claude 2.0';
    } else if (modelId.includes('instant')) {
      displayName = `Claude Instant (${modelId.split('-').pop()})`;
    }

    return displayName;
  }

  async sendMessage(message: string, conversationHistory: IConversationMessage[]): Promise<MessageContent> {
    try {
      if (!this.llmWithTools) {
        await this.initialize();
      }

      // Convert conversation history to LangChain messages and add current message
      const historyWithoutLatest = conversationHistory.slice(0, -1);
      const formattedMessages = historyWithoutLatest.map(msg =>
        msg.type === "human" ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      );
      const messages = [...formattedMessages, new HumanMessage(message)];

      // Defined available tools
      const tools = [
        getActiveTabTool,
        updateQueryTextTool,
        getConnectionInfoTool,
        getTablesTool,
        getTableColumnsTool
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
    depth: number = 0
  ): Promise<MessageContent> {
    // Safety check to prevent infinite tool calls (max 3 levels)
    if (depth > 7) {
      console.warn("Max tool call depth reached, stopping recursion");
      const finalResponse = await this.llmWithTools!.invoke(messages);
      return finalResponse.content;
    }

    // Get response from model
    const aiMessage = await this.llmWithTools!.invoke(messages);
    console.log(`Tool call depth ${depth} - AI response:`, JSON.stringify(aiMessage, null, 2));

    // If no tool calls were made, return the content directly
    if (!aiMessage.tool_calls?.length) {
      return aiMessage.content;
    }

    // Process tool calls
    console.log(`Tool calls at depth ${depth}:`, aiMessage.tool_calls);
    const updatedMessages = [...messages, aiMessage];
    const toolMessages: ToolMessage[] = [];

    // Handle each tool call
    for (const toolCall of aiMessage.tool_calls) {
      const toolToUse = tools.find(t => t.name === toolCall.name);

      try {
        if (!toolToUse) {
          throw new Error(`Unknown tool: ${toolCall.name}`);
        }

        // Execute tool and collect result
        const toolResult = await toolToUse.invoke(toolCall);
        toolMessages.push(new ToolMessage(toolResult, toolCall.id || ""));
      } catch (error) {
        console.error(`Error with tool ${toolCall.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        toolMessages.push(new ToolMessage(
          JSON.stringify({ error: errorMessage }),
          toolCall.id || ""
        ));
      }
    }

    // Recursively process the messages with tool results
    const finalMessages = [...updatedMessages, ...toolMessages];
    return this.processMessageWithTools(finalMessages, tools, depth + 1);
  }

  // Set a custom system prompt
  setSystemPrompt(prompt: string): Promise<boolean> {
    this.systemPrompt = prompt;
    // Reinitialize with the new prompt
    this.llmWithTools = null;
    return this.initialize();
  }

  // Set temperature
  setTemperature(temperature: number): Promise<boolean> {
    this.temperature = temperature;
    // Reinitialize with the new temperature
    this.llmWithTools = null;
    return this.initialize();
  }
}
