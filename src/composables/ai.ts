import { Chat } from "@ai-sdk/vue";
import { computed, ComputedRef, ref, Ref, watch } from "vue";
import { AvailableProviders, AvailableModels } from "@/config";
import { tools, userRejectedToolCall } from "@/tools";
import {
  DefaultChatTransport,
  convertToModelMessages,
  ChatStatus,
  ChatOnToolCallCallback,
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
import { UIMessage } from "@/types";

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
};

type ResolvedToolCall = ToolCall & { state: "accepted" | "rejected" }

/** A wrapper class of AI SDK's Chat class to support tool calls that require user permission. */
class AIShellChat {
  readonly messages: ComputedRef<UIMessage[]>;
  readonly error: ComputedRef<Error | undefined>;
  readonly status: ComputedRef<ChatStatus>;
  readonly pendingToolCalls = reactive<(PromisedToolCall | ResolvedToolCall)[]>([]);
  readonly pendingToolCallIds: ComputedRef<string[]>;
  readonly askingPermission: ComputedRef<boolean>;

  /** Force the `status` if not `null` */
  private forceStatus = ref<ChatStatus | null>();
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
    this.status = computed(() => this.forceStatus.value ?? this.chat.status);
    this.pendingToolCallIds = computed(() =>
      this.pendingToolCalls.map((t) => t.toolCallId),
    );
    this.askingPermission = computed(
      () => this.pendingToolCallIds.value.length > 0,
    );
  }

  /** Pass `undefined` to trigger the API without sending the message */
  async send(message: string | undefined, options: SendOptions) {
    await this.chat.sendMessage(message
      ? { text: message }
      : undefined,
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
   * It's required to provide `sendOptions` as well if the user edited the tool call.
   **/
  rejectPermission(options?:
    { toolCallId: string; }
    | { toolCallId: string; editedQuery: string; sendOptions: SendOptions }
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

    if ('editedQuery' in options) {
      const sendFollowupMessage = async () => {
        this.emitter.off("finish", sendFollowupMessage);

        const assistantMessageId = this.chat.generateId();
        const replacementToolCallId = this.chat.generateId();

        this.forceStatus.value = "streaming";

        this.chat.messages = [
          ...this.chat.messages.slice(0, -1),
          {
            ...this.chat.lastMessage!,
            parts: [
              ...this.chat.lastMessage!.parts,
              {
                type: "data-userEditedToolCall",
                data: { replacementToolCallId },
              }
            ],
          },
          {
            id: this.chat.generateId(),
            role: "user",
            parts: [{
              // We use data so it's not shown in the UI
              type: "data-editedQuery",
              data: {
                query: options.editedQuery,
                targetToolCallId: options.toolCallId,
              },
            }],
          },
          {
            id: assistantMessageId,
            role: "assistant",
            parts: [
              { type: "step-start" },
              {
                type: "data-toolReplacement",
                data: { targetToolCallId: options.toolCallId },
              },
              {
                type: "tool-run_query",
                state: "input-available",
                toolCallId: replacementToolCallId,
                input: { query: options.editedQuery },
              },
            ],
          },
        ];

        const runQueryOutput = await this.createRunQueryToolOutput(
          replacementToolCallId,
          options.editedQuery
        );

        if (runQueryOutput.state === "output-error") {
          this.chat.messages = [
            ...this.chat.messages.slice(0, -1),
            {
              id: assistantMessageId,
              role: "assistant",
              parts: [
                { type: "step-start" },
                {
                  type: "data-toolReplacement",
                  data: { targetToolCallId: options.toolCallId },
                },
                {
                  type: "tool-run_query",
                  state: "output-error",
                  toolCallId: replacementToolCallId,
                  input: { query: options.editedQuery },
                  errorText: runQueryOutput.errorText,
                },
              ],
            },
          ];
        } else {
          this.chat.messages = [
            ...this.chat.messages.slice(0, -1),
            {
              id: assistantMessageId,
              role: "assistant",
              parts: [
                { type: "step-start" },
                {
                  type: "data-toolReplacement",
                  data: { targetToolCallId: options.toolCallId },
                },
                {
                  type: "tool-run_query",
                  state: "output-available",
                  toolCallId: replacementToolCallId,
                  input: { query: options.editedQuery },
                  // @ts-expect-error ts doesnt like this because the execute()
                  // method for run_query (see tools/index.ts) is not defined.
                  // It can be fixed:
                  //   1. Upgrading to AI SDK v6
                  //   2. Use the new API for user permission check
                  //   3. define execute() method
                  output: runQueryOutput.output,
                },
              ],
            },
          ];
        }

        this.forceStatus.value = null;

        this.send(undefined, options.sendOptions);
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
      messages: await convertToModelMessages<UIMessage>(m.messages, {
        convertDataPart(part) {
          if (part.type === "data-editedQuery") {
            return {
              type: "text",
              text: "Please run the following code instead:\n```\n"
                + part.data.query
                + "\n```",
            };
          }
        },
      }),
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
