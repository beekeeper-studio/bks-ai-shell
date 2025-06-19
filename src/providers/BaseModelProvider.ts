import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  isAIMessage,
  isSystemMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { IModel, IModelConfig } from "../types";
import { ToolCall } from "@langchain/core/dist/messages/tool";
import { tools } from "../tools";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { z } from "zod";
import { buildErrorContent, tryJSONParse } from "../utils";
import { getDefaultInstructions } from "../config";

export interface SendStreamMessageCallbacks extends ToolCallbacks {
  /** When a new message stream is created. */
  onCreatedStream?: () => Promise<void>;
  /** When a new chunk of the message stream is received. */
  onStreamChunk: (message: AIMessage) => Promise<void>;
  /** When an error occurs. */
  onError?: (error: unknown) => void;
}

type InputToolContext = {
  name: string;
  args: Record<string, unknown>;
};

type SuccessOutputToolContext = {
  name: string;
  args: Record<string, unknown>;
  status: "success";
  result: unknown;
};

type ErrorOutputToolContext = {
  name: string;
  args: Record<string, unknown>;
  status: "error";
  error: unknown;
};

type OutputToolContext = SuccessOutputToolContext | ErrorOutputToolContext;

export interface ToolCallbacks {
  onBeforeToolCall?: (
    message: ToolMessage,
    context: InputToolContext,
  ) => void | Promise<void>;
  onToolMessage?: (
    message: ToolMessage,
    context: OutputToolContext,
  ) => void | Promise<void>;
  onRequestToolPermission?: (
    message: ToolMessage,
    context: InputToolContext,
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
   * Send a message to the model and get the response recursively.
   */
  async sendStreamMessage(
    message: string,
    conversationHistory: BaseMessage[],
    callbacks: SendStreamMessageCallbacks,
  ): Promise<BaseMessage[]> {
    if (this.sendingMessage) {
      throw new Error(
        "A message is already being sent. Please wait or stop the current message.",
      );
    }

    this.sendingMessage = true;
    this.abortController = new AbortController();

    const input = [...conversationHistory, new HumanMessage(message)];

    if (!isSystemMessage(input[0])) {
      input.unshift(new SystemMessage(await getDefaultInstructions()));
    }

    const output = await this.processStreamMessage(input, callbacks);

    this.sendingMessage = false;

    return output;
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
    callbacks: SendStreamMessageCallbacks,
    depth: number = 0,
  ): Promise<BaseMessage[]> {
    const fullMessages = [...messages];
    let streaming = false;

    try {
      this.abortController.signal.throwIfAborted();

      // Safety check to prevent infinite tool calls (max 10 levels)
      // TODO: make this configurable
      if (depth > 10) {
        console.warn("Max tool call depth reached, stopping recursion");
        const stream = await this.llm!.bindTools(tools).stream(messages);
        let aiMessage = (await stream.next()).value as AIMessageChunk;

        for await (const chunk of stream) {
          this.abortController.signal.throwIfAborted();
          aiMessage = aiMessage.concat(chunk);
          await callbacks.onStreamChunk(aiMessage);
        }

        fullMessages.push(aiMessage);
        return fullMessages;
      }

      const stream = await this.llm.bindTools!(tools).stream(messages, {
        signal: this.abortController.signal,
      });
      let aiMessage: AIMessageChunk = (await stream.next()).value;
      fullMessages.push(aiMessage);

      streaming = true;

      await callbacks.onCreatedStream?.();

      for await (const chunk of stream) {
        this.abortController.signal.throwIfAborted();
        aiMessage = aiMessage.concat(chunk);
        fullMessages[fullMessages.length - 1] = aiMessage;
        await callbacks.onStreamChunk(aiMessage);
      }

      streaming = false;

      if (aiMessage.tool_calls?.length) {
        const toolMessages = await this.processToolCalls(
          aiMessage.tool_calls,
          callbacks,
        );

        fullMessages.push(...toolMessages);

        const updatedMessages = await this.processStreamMessage(
          fullMessages,
          callbacks,
          depth + 1,
        );

        fullMessages.push(...updatedMessages);
      }
    } catch (error) {
      if (streaming) {
        // When error occurs and the last message has called , it means
        // that the tools have not resolved. We should tell the AI that the
        // tool call failed unless Claude won't like it.
        const lastAIMessage = fullMessages.findLast((m) => isAIMessage(m))!;
        if (lastAIMessage.tool_calls?.length) {
          const messages = lastAIMessage.tool_calls.map((toolCall) =>
            this.buildErrorToolMessage(toolCall, error),
          );
          fullMessages.push(...messages);
        }
      }

      callbacks.onError?.(error);
    }

    return fullMessages;
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
          inputToolContext,
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
          };
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
        };
      } catch (error) {
        console.error(`Error invoking tool - ${toolCall.name}:`, error);
        toolMessage = this.buildErrorToolMessage(toolCall, error);
        outputToolContext = {
          name: toolCall.name,
          args: toolCall.args,
          status: "error",
          error,
        };
      }

      toolMessages.push(toolMessage);
      await callbacks.onToolMessage?.(toolMessage, outputToolContext);
    }

    return toolMessages;
  }

  private buildErrorToolMessage(
    toolCall: ToolCall,
    error: unknown,
  ): ToolMessage {
    const errorMessage = error instanceof Error ? error.message : error;
    const newError = new Error(
      `Error invoking tool ${toolCall.name} - ${errorMessage}`,
      { cause: error },
    );
    return new ToolMessage({
      tool_call_id: toolCall.id!,
      content: buildErrorContent(newError),
      status: "error",
    });
  }

  abortStreamMessage(reason?: any): void {
    this.abortController.abort(reason);
  }
}
