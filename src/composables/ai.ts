import { Chat } from "@ai-sdk/vue";
import { computed, ComputedRef, watch } from "vue";
import { AvailableProviders, AvailableModels } from "@/config";
import { tools } from "@/tools";
import {
  UIMessage,
  DefaultChatTransport,
  convertToModelMessages,
  lastAssistantMessageIsCompleteWithToolCalls,
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

type AIOptions = {
  initialMessages: UIMessage[];
};

type SendOptions = {
  providerId: AvailableProviders;
  modelId: AvailableModels["id"];
  systemPrompt?: string;
};

type ToolCall = {
  toolCallId: string;
  toolName: string;
  input: unknown;
};

/** A wrapper class of AI SDK's Chat class to support tool calls that require user permission. */
class AIShellChat {
  readonly messages: ComputedRef<UIMessage[]>;
  readonly error: ComputedRef<Error | undefined>;
  readonly status: ComputedRef<ChatStatus>;
  readonly pendingToolCalls = reactive<
    (ToolCall & { state: "accepted" | "rejected" | "pending" })[]
  >([]);
  readonly pendingToolCallIds: ComputedRef<string[]>;
  readonly askingPermission: ComputedRef<boolean>;

  private chat: Chat<UIMessage>;

  constructor(options: AIOptions) {
    this.fetch = this.fetch.bind(this);
    this.handleToolCall = this.handleToolCall.bind(this);

    this.chat = new Chat({
      transport: new DefaultChatTransport({ fetch: this.fetch }),
      messages: options.initialMessages,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onToolCall: this.handleToolCall,
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
   * If no toolCallId is provided, all tool calls are rejected.*/
  rejectPermission(toolCallId?: string) {
    if (toolCallId === undefined) {
      this.pendingToolCalls.forEach((t) => {
        t.state = "rejected";
      });
      return;
    }

    const tool = this.pendingToolCalls.find((t) => t.toolCallId === toolCallId);
    if (!tool) {
      throw new Error(`Tool call with id ${toolCallId} not found`);
    }
    tool.state = "rejected";
  }

  private async handleToolCall(
    options: Parameters<
      ChatOnToolCallCallback<
        UIMessage<unknown, UIDataTypes, InferUITools<typeof tools>>
      >
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
        await this.runQueryAndAddToolResult(toolCall);
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
        await this.runQueryAndAddToolResult(toolCall);
      } else {
        this.chat.addToolResult({
          state: "output-error",
          toolCallId: toolCall.toolCallId,
          tool: toolCall.toolName,
          errorText: "User rejected tool call",
        });
      }
    }
  }

  private async runQueryAndAddToolResult(toolCall: ToolCall) {
    try {
      // not using await to avoid blocking the UI
      this.chat.addToolResult({
        state: "output-available",
        toolCallId: toolCall.toolCallId,
        tool: toolCall.toolName,
        output: safeJSONStringify(await runQuery(toolCall.input.query)),
      });
    } catch (e) {
      this.chat.addToolResult({
        state: "output-error",
        toolCallId: toolCall.toolCallId,
        tool: toolCall.toolName,
        errorText: e?.message || e.toString() || "Unknown error",
      });
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
