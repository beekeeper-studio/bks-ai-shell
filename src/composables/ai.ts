import { Chat } from "@ai-sdk/vue";
import { computed, ComputedRef, watch } from "vue";
import { AvailableProviders, AvailableModels } from "@/config";
import { tools, userRejectedToolCall } from "@/tools";
import {
  UIMessage as AIUIMessage,
  DefaultChatTransport,
  convertToModelMessages,
  ChatStatus,
  ChatOnToolCallCallback,
  UIDataTypes,
  InferUITools,
} from "ai";
import { useTabState } from "@/stores/tabState";
import { z } from "zod/v3";
import { createProvider } from "@/providers";
import { FetchFunction } from "@ai-sdk/provider-utils";
import { reactive } from "vue";
import { useConfigurationStore } from "@/stores/configuration";
import { isReadQuery, safeJSONStringify } from "@/utils";
import { runQuery } from "@beekeeperstudio/plugin";
import { lastAssistantMessageIsCompleteWithToolCalls } from "@/utils/lastAssistantMessageIsCompleteWithToolCalls";
import mitt from "mitt";

type UIMessage = AIUIMessage<unknown, UIDataTypes, InferUITools<typeof tools>>;

type AIOptions = {
  initialMessages: UIMessage[];
};

export type SendOptions = {
  providerId: AvailableProviders;
  modelId: AvailableModels["id"];
  systemPrompt?: string;
};

type ToolCall = {
  toolCallId: string;
  toolName: string;
  input: unknown;
};

type PromisedToolCall = ToolCall & {
  /** Awaiting user permission */
  state: "pending";
}

type ResolvedToolCall = ToolCall & ({
  state: "accepted";
} | {
  state: "rejected";
} | {
  state: "rejected";
  userEdittedCode: string;
  sendOptions: SendOptions;
})

/** A wrapper class of AI SDK's Chat class to support tool calls that require user permission. */
class AIShellChat {
  readonly messages: ComputedRef<UIMessage[]>;
  readonly error: ComputedRef<Error | undefined>;
  readonly status: ComputedRef<ChatStatus>;
  readonly pendingToolCalls = reactive<(PromisedToolCall | ResolvedToolCall)[]>([]);
  readonly pendingToolCallIds: ComputedRef<string[]>;
  readonly askingPermission: ComputedRef<boolean>;

  private chat: Chat<UIMessage>;
  private emitter = mitt<{
    finish: void;
  }>();

  constructor(options: AIOptions) {
    this.fetch = this.fetch.bind(this);
    this.handleToolCall = this.handleToolCall.bind(this);

    this.chat = new Chat<UIMessage>({
      transport: new DefaultChatTransport({ fetch: this.fetch }),
      messages: options.initialMessages,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onToolCall: this.handleToolCall,
      onFinish: () => this.emitter.emit("finish"),
    });

    this.messages = computed(() => this.chat.messages);
    this.error = computed(() => this.chat.error);
    this.status = computed(() => this.chat.status);
    this.pendingToolCallIds = computed(() =>
      this.pendingToolCalls.map((t) => t.toolCallId),
    );
    this.askingPermission = computed(
      () => this.pendingToolCallIds.value.length > 0,
    );
  }

  async send(message: string, options: SendOptions) {
    await this.chat.sendMessage(
      {
        text: message,
      },
      {
        body: {
          sendOptions: options,
        },
      },
    );
    this.saveMessages();
    this.fillTitle(options);
  }

  async retry(options: SendOptions) {
    await this.chat.regenerate({
      body: {
        sendOptions: options,
      },
    });
  }

  async abort() {
    await this.chat.stop();
    this.saveMessages();
  }

  acceptPermission(toolCallId: string) {
    const tool = this.pendingToolCalls.find((t) => t.toolCallId === toolCallId);
    if (!tool) {
      throw new Error(`Tool call with id ${toolCallId} not found`);
    }
    tool.state = "accepted";
  }

  /** After the user rejected the permission, they can provide a follow-up message.
   * If no options is provided, all tool calls are rejected.
   *
   * @param options.edittedCode - The edited query / code that the user provided.
   **/
  rejectPermission(options?:
    { toolCallId: string; }
    | { toolCallId: string; userEdittedCode: string; sendOptions: SendOptions }
  ) {
    if (!options) {
      this.pendingToolCalls.forEach((t) => {
        t.state = "rejected";
      });
      return;
    }

    const tool = this.pendingToolCalls.find((t) => t.toolCallId === options.toolCallId);
    if (!tool) {
      throw new Error(`Tool call with id ${options.toolCallId} not found`);
    }
    if ('userEdittedCode' in options) {
      const sendFollowupMessage = async () => {
        this.emitter.off("finish", sendFollowupMessage);
        const toolCallId = this.chat.generateId();
        const toolOutput = await this.createRunQueryToolOutput(
          toolCallId,
          options.userEdittedCode,
        );
        this.chat.messages = [
          ...this.chat.messages,
          {
            id: this.chat.generateId(),
            role: "user",
            parts: [{
              type: "text",
              text: "Run this instead ```\n" + options.userEdittedCode + "\n```",
            }],
          },
          {
            id: this.chat.generateId(),
            role: "assistant",
            parts: [
              { type: "step-start" },
              {
                type: "tool-run_query",
                toolCallId,
                input: {
                  query: options.userEdittedCode,
                },
                state: toolOutput.state,
                ...(toolOutput.state === "output-error"
                  ? { errorText: toolOutput.errorText }
                  : { output: toolOutput.output }),
              },
            ],
          },
        ];

        this.chat.sendMessage(undefined, {
          body: {
            sendOptions: options.sendOptions,
          },
        });
      };
      this.emitter.on("finish", sendFollowupMessage);
    }
    tool.state = "rejected";
  }

  private async handleToolCall(
    options: Parameters<
      ChatOnToolCallCallback<UIMessage>
    >[0],
  ) {
    const toolCall = options.toolCall;

    if (toolCall.dynamic) {
      return safeJSONStringify({
        type: "error",
        message: "Dynamic tool calls are not supported",
      });
    }

    if (toolCall.toolName === "run_query") {
      // Skip permission check for read-only queries
      if (
        useConfigurationStore().allowExecutionOfReadOnlyQueries &&
        toolCall.input.query &&
        isReadQuery(toolCall.input.query)
      ) {
        this.chat.addToolOutput(
          await this.createRunQueryToolOutput(
            toolCall.toolCallId,
            toolCall.input.query,
          )
        );
        return;
      }

      this.pendingToolCalls.push({
        ...toolCall,
        state: "pending",
      });

      const state: "accepted" | "rejected" = await new Promise((resolve) => {
        watch(this.pendingToolCalls, () => {
          const tool = this.pendingToolCalls.find(
            (t) => t.toolCallId === toolCall.toolCallId,
          );
          if (tool && tool.state !== "pending") {
            resolve(tool.state);
          }
        });
      });

      this.pendingToolCalls.splice(
        this.pendingToolCalls.findIndex(
          (t) => t.toolCallId === toolCall.toolCallId,
        ),
        1,
      );

      if (state === "accepted") {
        this.chat.addToolOutput(
          await this.createRunQueryToolOutput(
            toolCall.toolCallId,
            toolCall.input.query,
          )
        );
      } else {
        this.chat.addToolOutput({
          state: "output-error",
          toolCallId: toolCall.toolCallId,
          tool: toolCall.toolName,
          errorText: userRejectedToolCall,
        });
      }
    }
  }

  private async createRunQueryToolOutput(toolCallId: string, query: string) {
    try {
      return {
        state: "output-available" as const,
        toolCallId,
        tool: 'tool-run_query' as const,
        output: safeJSONStringify(await runQuery(query)),
      };
    } catch (e) {
      return {
        state: "output-error" as const,
        toolCallId,
        tool: 'tool-run_query' as const,
        errorText: e?.message || e.toString() || "Unknown error",
      };
    }
  }

  /** Custom fetch function */
  private async fetch(
    url: Parameters<FetchFunction>[0],
    fetchOptions: Parameters<FetchFunction>[1],
  ) {
    if (!fetchOptions) {
      throw new Error("Fetch options are missing");
    }

    if (!fetchOptions.body) {
      throw new Error("Fetch does not have a body");
    }

    const m = JSON.parse(fetchOptions.body as string) as any;
    const sendOptions = m.sendOptions as SendOptions;
    const provider = createProvider(sendOptions.providerId);
    return provider.stream({
      modelId: sendOptions.modelId,
      messages: convertToModelMessages(m.messages),
      signal: fetchOptions.signal,
      tools,
      systemPrompt: sendOptions.systemPrompt,
    });
  }

  private async saveMessages() {
    useTabState().setTabState("messages", this.messages.value);
  }

  private async fillTitle(options: SendOptions) {
    if (useTabState().conversationTitle) {
      // Skip generation if title is already set
      return;
    }
    let prompt =
      "Name this conversation in less than 30 characters or 6 words.\n```";
    this.messages.value.forEach((m) => {
      m.parts.forEach((p) => {
        if (p.type === "text") {
          prompt += " " + p.text;
        }
      });
    });
    prompt += "\n```";
    const res = await createProvider(options.providerId).generateObject({
      modelId: options.modelId,
      schema: z.object({
        title: z.string().describe("The title of the conversation"),
      }),
      prompt,
    });
    await useTabState().setTabTitle(res.object.title);
  }
}

export function useAI(options: AIOptions) {
  const chat = new AIShellChat({
    initialMessages: options.initialMessages,
  });

  return {
    messages: chat.messages,
    error: chat.error,
    status: chat.status,
    pendingToolCallIds: chat.pendingToolCallIds,
    askingPermission: chat.askingPermission,
    acceptPermission: chat.acceptPermission.bind(chat),
    rejectPermission: chat.rejectPermission.bind(chat),
    send: chat.send.bind(chat),
    retry: chat.retry.bind(chat),
    abort: chat.abort.bind(chat),
  };
}
