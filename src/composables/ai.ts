import { Chat } from "@ai-sdk/vue";
import { computed, ref } from "vue";
import { AvailableProviders, AvailableModels } from "@/config";
import { run_query, tools } from "@/tools";
import { UIMessage, DefaultChatTransport, convertToModelMessages } from "ai";
import { useTabState } from "@/stores/tabState";
import { z } from "zod/v3";
import { createProvider } from "@/providers";
import { safeJSONStringify } from "@/utils";
import { runQuery } from "@beekeeperstudio/plugin";
import { FetchFunction, InferToolInput } from "@ai-sdk/provider-utils";
import { useConfigurationStore } from "@/stores/configuration";
import { isReadQuery } from "@/utils";

type AIOptions = {
  initialMessages: UIMessage[];
  anthropicApiKey?: string;
  openaiApiKey?: string;
  googleApiKey?: string;
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

class AIShellChatTransport extends DefaultChatTransport<UIMessage> {
  fetch: FetchFunction = async (
    url: Parameters<FetchFunction>[0],
    fetchOptions: Parameters<FetchFunction>[1],
  ) => {
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
  };
}

export function useAI(options: AIOptions) {
  const pendingToolCalls = ref<ToolCall[]>([]);
  const pendingToolCallIds = computed(() =>
    pendingToolCalls.value.map((t) => t.toolCallId),
  );
  const askingPermission = computed(() => pendingToolCallIds.value.length > 0);
  const followupAfterRejected = ref("");

  const chat = new Chat({
    transport: new AIShellChatTransport(),
    onToolCall({ toolCall }) {
      if (toolCall.toolName === "run_query") {
        const input = toolCall.input as InferToolInput<typeof run_query>;

        if (
          useConfigurationStore().allowExecutionOfReadOnlyQueries &&
          input.query &&
          isReadQuery(input.query)
        ) {
          runAndAddToolResult(toolCall);
        } else {
          pendingToolCalls.value.push(toolCall);
        }
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
        (id) => id !== toolCallId,
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
