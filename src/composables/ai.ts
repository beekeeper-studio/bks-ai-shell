import { Chat } from "@ai-sdk/vue";
import { computed, ref } from "vue";
import {
  AvailableProviders,
  AvailableModels,
} from "@/config";
import { tools } from "@/tools";
import { UIMessage, DefaultChatTransport, convertToModelMessages } from "ai";
import { useTabState } from "@/stores/tabState";
import { z } from "zod/v3";
import { createProvider } from "@/providers";
import { safeJSONStringify } from "@/utils";
import { runQuery } from "@beekeeperstudio/plugin";

type AIOptions = {
  initialMessages: UIMessage[];
  anthropicApiKey?: string;
  openaiApiKey?: string;
  googleApiKey?: string;
}

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

export function useAI(options: AIOptions) {
  const pendingToolCalls = ref<ToolCall[]>([]);
  const pendingToolCallIds = computed(() =>
    pendingToolCalls.value.map((t) => t.toolCallId),
  );
  const askingPermission = computed(() => pendingToolCallIds.value.length > 0);
  const followupAfterRejected = ref("");

  const messages = ref<UIMessage[]>(options.initialMessages);

  const chat = new Chat({
    // FIXME create a custom chat transport
    transport: new DefaultChatTransport({
      fetch: async (url, fetchOptions) => {
        const m = JSON.parse(fetchOptions.body) as any;
        const sendOptions = m.sendOptions as SendOptions;
        const provider = createProvider(sendOptions.providerId);
        return provider.stream({
          modelId: sendOptions.modelId,
          messages: convertToModelMessages(m.messages),
          signal: fetchOptions.signal,
          tools,
          systemPrompt: sendOptions.systemPrompt,
        });
      },
    }),
    onToolCall({ toolCall }) {
      if (toolCall.toolName === "run_query") {
        pendingToolCalls.value.push(toolCall);
      }
    },
    messages: options.initialMessages,
  });

  const messageList = computed(() => chat.messages);
  const error = computed(() => chat.error);
  const status = computed(() => chat.status);

  function saveMessages() {
    useTabState().setTabState("messages", chat.messages);
  }

  async function runAndAddToolResult(toolCall: ToolCall) {
    if (toolCall.toolName === "run_query") {
      let output: unknown;
      try {
        output = safeJSONStringify(await runQuery(toolCall.input!.query));
      } catch (e) {
        output = safeJSONStringify({ type: "error", message: e?.message });
      }
      chat.addToolResult({
        toolCallId: toolCall.toolCallId,
        tool: toolCall.toolName,
        output,
      });
    } else {
      chat.addToolResult({
        toolCallId: toolCall.toolCallId,
        tool: toolCall.toolName,
        output: safeJSONStringify({
          type: "error",
          message: "Tool not supported",
        }),
      });
    }
  }

  /**
   * Accept and run tool calls that are pending. If toolCallId is not provided,
   * all tool calls are accepted.
   **/
  async function acceptPermission(toolCallId?: string) {
    let toolCalls = pendingToolCalls.value;

    if (toolCallId) {
      const toolCall = pendingToolCalls.value.find(
        (t) => t.toolCallId === toolCallId,
      );
      if (!toolCall) {
        throw new Error("Tool call not found");
      }
      toolCalls = [toolCall];
    }

    for (const toolCall of toolCalls) {
      await runAndAddToolResult(toolCall);
      pendingToolCalls.value = pendingToolCalls.value.filter(
        (pt) => pt.toolCallId !== toolCall.toolCallId,
      );
    }
  }

  /** After the user rejected the permission, they can provide a follow-up message.
   * If no toolCallId is provided, all tool calls are rejected.*/
  function rejectPermission(toolCallId?: string, userFollowup?: string) {
    if (userFollowup) {
      followupAfterRejected.value = userFollowup;
    }
    if (toolCallId === undefined) {
      pendingToolCallIds.value = [];
    } else {
      pendingToolCallIds.value = pendingToolCallIds.value.filter(
        (id) => id !== toolCallId
      );
    }
  }

  async function fillTitle(options: SendOptions) {
    if (useTabState().conversationTitle) {
      // Skip generation if title is already set
      return;
    }
    const res = await createProvider(options.providerId).generateObject({
      modelId: options.modelId,
      schema: z.object({
        title: z.string().describe("The title of the conversation"),
      }),
      prompt:
        "Name this conversation in less than 30 characters or 6 words.\n```" +
        // FIXME
        chat.messages.map((m) => `${m.role}: ${m.parts.join(" ")}`).join("\n") +
        "\n```",
    });
    await useTabState().setTabTitle(res.object.title);
  }

  /** Send a message to the AI */
  async function send(message: string, options: SendOptions) {
    await chat.sendMessage(
      {
        text: message,
      },
      {
        body: {
          sendOptions: options,
        },
      },
    );
    saveMessages();
    fillTitle(options);
  }

  async function retry(options: SendOptions) {
    await chat.regenerate({
      body: {
        sendOptions: options,
      },
    });
  }

  async function abort() {
    await chat.stop();
    saveMessages();
  }

  return {
    messages: messageList,
    error,
    status,
    pendingToolCallIds,
    askingPermission,
    acceptPermission,
    rejectPermission,
    send,
    abort,
    retry,
  };
}
