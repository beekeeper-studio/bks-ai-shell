import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { IModel, IModelConfig } from "../types";
import { ToolCall } from "@langchain/core/dist/messages/tool";
import { tools } from "../tools";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { z } from "zod";
import { buildErrorContent, tryJSONParse } from "../utils";

export interface Callbacks extends ToolCallbacks {
  onStart?: () => Promise<void>;
  onStreamChunk: (message: AIMessage) => Promise<void>;
  onComplete?: () => Promise<void>;
  onFinalized: (conversationHistory: BaseMessage[]) => Promise<void>;
  onError?: (error: unknown) => void;
}

type InputToolContext = {
  name: string;
  args: Record<string, unknown>;
}

type SuccessOutputToolContext = {
  name: string
  args: Record<string, unknown>;
  status: "success";
  result: unknown;
}

type ErrorOutputToolContext = {
  name: string;
  args: Record<string, unknown>;
  status: "error";
  error: unknown;
}

type OutputToolContext = SuccessOutputToolContext | ErrorOutputToolContext;

export interface ToolCallbacks {
  onBeforeToolCall?: (message: ToolMessage, context: InputToolContext) => void | Promise<void>;
  onToolMessage?: (message: ToolMessage, context: OutputToolContext) => void | Promise<void>;
  onRequestToolPermission?: (
    message: ToolMessage,
    context: InputToolContext
  ) => boolean | Promise<boolean>;
}

export abstract class BaseProvider {
  public static id: string;
  public static displayName: string;

  public models: IModel[] = [];

  public abstract initialize(apiKey: string): Promise<void>;
  public abstract createModel(config: IModelConfig): BaseModelProvider;
}

export class BaseModelProvider {
  private abortController: AbortController = new AbortController();
  private sendingMessage = false;

  constructor(
    public readonly id: string,
    public readonly displayName: string,
    private readonly llm: BaseChatModel,
  ) { }

  get isSendingMessage(): boolean {
    return this.sendingMessage;
  }

  /**
   * Send a message to the model and get a response
   */
  sendStreamMessage(
    message: string,
    conversationHistory: BaseMessage[],
    callbacks: Callbacks,
  ): void {
    if (this.sendingMessage) {
      throw new Error(
        "A message is already being sent. Please wait or stop the current message.",
      );
    }

    this.sendingMessage = true;
    this.abortController = new AbortController();
    this.processStreamMessage(
      [...conversationHistory, new HumanMessage(message)],
      {
        ...callbacks,
        onFinalized: async (...args) => {
          this.sendingMessage = false;
          await callbacks.onFinalized(...args);
        },
        onError: (...args) => {
          this.sendingMessage = false;
          callbacks.onError?.(...args);
        },
      },
    );
  }

  async generateConversationTitle(messages: BaseMessage[]): Promise<string> {
    const response = await this.llm
      .withStructuredOutput(
        z.object({
          title: z.string().describe("The title of the conversation"),
        }),
      )
      .invoke([
        ...messages.slice(1), // exclude system message
        new HumanMessage(
          "Generate a concise title for this conversation — ideally under 30 characters and preferably two words.",
        ),
      ]);
    return response.title;
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

        await callbacks.onFinalized(messages);
        return;
      }

      const stream = await this.llm.bindTools!(tools).stream(messages, {
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
        await callbacks.onFinalized(updatedMessages);
        return;
      }

      const toolMessages = await this.processToolCalls(
        aiMessage.tool_calls,
        callbacks,
      );

      const finalMessages = [...updatedMessages, ...toolMessages];

      return this.processStreamMessage(finalMessages, callbacks, depth + 1);
    } catch (error) {
      callbacks.onError?.(error);
    }
  }

  protected async processToolCalls(
    toolCalls: ToolCall[],
    callbacks: ToolCallbacks,
  ): Promise<ToolMessage[]> {
    const toolMessages: ToolMessage[] = [];
    for (const toolCall of toolCalls) {
      this.abortController.signal.throwIfAborted();

      let toolMessage: ToolMessage = new ToolMessage({
        tool_call_id: toolCall.id!,
        content: "Running tool...",
      });

      const toolToUse = tools.find((t) => t.name === toolCall.name);

      if (!toolToUse) {
        toolMessage.status = "error";
        toolMessage.content = buildErrorContent(
          new Error("Unknown tool - tell the AI what to do differently."),
        );
        toolMessages.push(toolMessage);
        continue;
      }

      const inputToolContext: InputToolContext = {
        name: toolCall.name,
        args: toolCall.args,
      };

      await callbacks.onBeforeToolCall?.(toolMessage, inputToolContext);

      if (toolToUse.tags && toolToUse.tags.includes("write")) {
        const granted = await callbacks.onRequestToolPermission?.(
          toolMessage,
          inputToolContext
        );
        if (!granted) {
          const error = new Error("No - tell the AI what to do differently.");

          toolMessage.status = "error";
          toolMessage.content = buildErrorContent(error);

          toolMessages.push(toolMessage);

          const outputToolContext: ErrorOutputToolContext = {
            name: toolCall.name,
            args: toolCall.args,
            status: "error",
            error,
          }
          await callbacks.onToolMessage?.(toolMessage, outputToolContext);
          continue;
        }
      }

      let outputToolContext: OutputToolContext;

      try {
        const result = await toolToUse.invoke(toolCall);
        toolMessage = result;
        outputToolContext = {
          name: toolCall.name,
          args: toolCall.args,
          status: "success",
          result: tryJSONParse(toolMessage.content as string),
        }
      } catch (error) {
        console.error(`Error invoking tool - ${toolCall.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : error;
        const newError = new Error(
          `Error invoking tool ${toolCall.name} - ${errorMessage}`,
          { cause: error }
        );
        toolMessage.status = "error";
        toolMessage.content = buildErrorContent(newError);
        outputToolContext = {
          name: toolCall.name,
          args: toolCall.args,
          status: "error",
          error: newError,
        }
      }

      toolMessages.push(toolMessage);
      await callbacks.onToolMessage?.(toolMessage, outputToolContext);
    }

    return toolMessages;
  }

  abortStreamMessage(reason?: any): void {
    this.abortController.abort(reason);
  }
}
