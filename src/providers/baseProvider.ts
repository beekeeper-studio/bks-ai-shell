import { AIMessage, AIMessageChunk, BaseMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { IModel, IModelConfig } from "../types";
import { ToolCall } from "@langchain/core/dist/messages/tool";
import { tools } from "../tools";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface Callbacks extends ToolCallbacks {
  onStart?: () => Promise<void>;
  onStreamChunk: (message: AIMessage) => Promise<void>;
  onComplete?: () => Promise<void>;
  onFinalized: (conversationHistory: BaseMessage[]) => void;
  onError?: (error: unknown) => void;
}

export interface ToolCallbacks {
  onBeforeToolCall?: (name: string, args: any) => Promise<void>;
  onToolMessage?: (message: ToolMessage) => Promise<void>;
  onRequestToolPermission?: (toolName: string, toolArgs: any) => Promise<boolean>;
}

export abstract class BaseModelProvider {
  public static id: string;
  public static displayName: string;

  protected config: IModelConfig;
  protected abortController: AbortController;
  protected llm: BaseChatModel | null = null;

  constructor(config: IModelConfig) {
    this.config = config;
    this.abortController = new AbortController();
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
  sendStreamMessage(
    message: string,
    conversationHistory: BaseMessage[],
    callbacks: Callbacks,
  ): void {
    this.abortController = new AbortController();
    this.processStreamMessage([
      ...conversationHistory,
      new HumanMessage(message),
    ], callbacks);
  }

  protected async processStreamMessage(
    messages: BaseMessage[],
    callbacks: Callbacks,
    depth: number = 0,
  ): Promise<void> {
    try {
      this.abortController.signal.throwIfAborted();

      // Safety check to prevent infinite tool calls (max 10 levels)
      if (depth > 10) {
        console.warn("Max tool call depth reached, stopping recursion");
        const stream = await this.llm!.bindTools(tools).stream(messages);
        let aiMessage = (await stream.next()).value as AIMessageChunk;

        for await (const chunk of stream) {
          this.abortController.signal.throwIfAborted();
          aiMessage = aiMessage.concat(chunk);
          await callbacks.onStreamChunk(aiMessage);
        }

        callbacks.onFinalized(messages);
        return;
      }

      const stream = await this.llm!.bindTools(tools).stream(messages, {
        signal: this.abortController.signal,
      });
      let aiMessage: AIMessageChunk = (await stream.next()).value;

      await callbacks.onStart?.();

      for await (const chunk of stream) {
        this.abortController.signal.throwIfAborted();
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

      const toolMessages = await this.processToolCalls(aiMessage.tool_calls, callbacks);

      const finalMessages = [...updatedMessages, ...toolMessages];

      return this.processStreamMessage(
        finalMessages,
        callbacks,
        depth + 1,
      );
    } catch (error) {
      callbacks.onError?.(error);
    }
  }

  protected async processToolCalls(toolCalls: ToolCall[], callbacks: ToolCallbacks): Promise<ToolMessage[]> {
    const toolMessages: ToolMessage[] = [];
    for (const toolCall of toolCalls) {
      this.abortController.signal.throwIfAborted();

      const toolToUse = tools.find((t) => t.name === toolCall.name);
      const name = toolCall.name;
      const id = toolCall.id || "";
      let result: any;

      if (!toolToUse) {
        toolMessages.push(new ToolMessage("Unknown tool", id, name));
        continue;
      }

      await callbacks.onBeforeToolCall?.(name, toolCall.args);

      if (toolToUse.tags && toolToUse.tags.includes("write")) {
        const granted = await callbacks.onRequestToolPermission?.(name, toolCall.args);
        if (!granted) {
          const toolMessage = new ToolMessage("User rejected permission to use this tool.", id, name);
          toolMessages.push(toolMessage);
          await callbacks.onToolMessage?.(toolMessage);
          continue;
        }
      }

      let toolMessage: ToolMessage;

      try {
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
      await callbacks.onToolMessage?.(toolMessage);
    }

    return toolMessages;
  }

  abortStreamMessage(): void {
    this.abortController.abort();
  }

  abstract disconnect(): Promise<void>;
}
