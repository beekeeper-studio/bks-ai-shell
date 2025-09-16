import { Chat } from "@ai-sdk/vue";
import { computed, ref, watch } from "vue";
import {
  AvailableProviders,
  AvailableModels,
} from "@/config";
import { getTools } from "@/tools";
import { UIMessage, DefaultChatTransport, convertToModelMessages } from "ai";
import { useTabState } from "@/stores/tabState";
import { z } from 'zod/v3';
import { createProvider } from "@/providers";

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
}

export function useAI(options: AIOptions) {
  const pendingToolCallIds = ref<string[]>([]);
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
          tools: getTools(async (name, toolCallId) => {
            pendingToolCallIds.value.push(toolCallId);
            await new Promise<void>((resolve) => {
              const unwatch = watch(pendingToolCallIds, () => {
                if (!pendingToolCallIds.value.includes(toolCallId)) {
                  unwatch();
                  resolve();
                }
              });
            });
            pendingToolCallIds.value = pendingToolCallIds.value.filter(
              (id) => id !== toolCallId
            );
            return permitted;
          }),
          systemPrompt: sendOptions.systemPrompt,
        });
      },
    }),
    messages: messages.value,
  })

  const messageList = computed(() => chat.messages);
  const error = computed(() => chat.error);
  const status = computed(() => chat.status);

  let permitted = false;

  async function saveMessages() {
    await useTabState().setTabState("messages", chat.messages);
  }

  /** If toolCallId is not provided, all tool calls are accepted */
  function acceptPermission(toolCallId?: string) {
    permitted = true;
    if (toolCallId === undefined) {
      pendingToolCallIds.value = [];
    } else {
      pendingToolCallIds.value = pendingToolCallIds.value.filter(
        (id) => id !== toolCallId
      );
    }
  }

  /** After the user rejected the permission, they can provide a follow-up message.
   * If no toolCallId is provided, all tool calls are rejected.*/
  function rejectPermission(toolCallId?: string, userFollowup?: string) {
    if (userFollowup) {
      followupAfterRejected.value = userFollowup;
    }
    permitted = false;
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
        "Name this conversation in less than 30 characters.\n```" +
        // FIXME
        chat.messages.map((m) => `${m.role}: ${m.parts.join(" ")}`).join("\n") +
        "\n```",
    })
    await useTabState().setTabTitle(res.object.title);
  }

  /** Send a message to the AI */
  async function send(message: string, options: SendOptions) {
    await chat.sendMessage(
      { text: message },
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
