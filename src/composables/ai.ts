import {
  generateObject,
} from "ai";
import { useChat } from "@ai-sdk/vue";
import { computed, ref, watch } from "vue";
import {
  AvailableProviders,
  AvailableModels,
} from "@/config";
import { getTools } from "@/tools";
import { Message } from "ai";
import { useTabState } from "@/stores/tabState";
import { notify } from "@beekeeperstudio/plugin";
import { z } from "zod";
import { createProvider } from "@/providers";

type AIOptions = {
  initialMessages: Message[];
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

  let permitted = false;

  const { messages, input, append, error, status, addToolResult, stop, reload } =
    useChat({
      fetch: async (url, fetchOptions) => {
        const m = JSON.parse(fetchOptions.body) as any;
        const sendOptions = m.sendOptions as SendOptions;
        const provider = createProvider(sendOptions.providerId);
        return provider.stream({
          modelId: sendOptions.modelId,
          messages: m.messages,
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
      onError: (error) => {
        notify("pluginError", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        if (error.message.includes("User rejected tool call.")) {
          addToolResult({
            toolCallId: error.message.split("toolCallId: ")[1].split(")")[0],
            result: JSON.stringify({
              type: "error",
              message: "No - Tell the AI what to do differently.",
            }),
          });
          saveMessages();
          if (followupAfterRejected.value) {
            append({
              role: "user",
              content: followupAfterRejected.value,
            });
            followupAfterRejected.value = "";
            // fillTitle();
          }
        }
      },
      onFinish: () => {
        saveMessages();
      },
      initialMessages: options.initialMessages,
    });

  function saveMessages() {
    useTabState().setTabState("messages", messages.value);
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
        messages.value.map((m) => `${m.role}: ${m.content}`).join("\n") +
        "\n```",
    })
    await useTabState().setTabTitle(res.object.title);
  }

  /** Send a message to the AI */
  async function send(message: string, options: SendOptions) {
    await append(
      {
        role: "user",
        content: message,
      },
      {
        body: {
          sendOptions: options,
        },
      },
    );
    fillTitle(options);
  }

  async function retry(options: SendOptions) {
    await reload({
      body: {
        sendOptions: options,
      },
    });
  }

  function abort() {
    stop();
    saveMessages();
  }

  return {
    messages,
    input,
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
