import {
  InvalidToolArgumentsError,
  NoSuchToolError,
  streamText,
  generateObject,
  ToolExecutionError,
  APICallError,
  NoSuchModelError,
  NoSuchProviderError,
} from "ai";
import { useChat } from "@ai-sdk/vue";
import { computed, ref, watch } from "vue";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import {
  getDefaultInstructions,
  defaultTemperature,
  AvailableProviders,
  AvailableModels,
} from "@/config";
import { getTools, UserRejectedError } from "@/tools";
import { Message } from "ai";
import { useTabState } from "@/stores/tabState";
import { notify } from "@beekeeperstudio/plugin";
import { z } from "zod";
import { useInternalDataStore } from "@/stores/internalData";

type AIOptions = {
  initialMessages: Message[];
  anthropicApiKey?: string;
  openaiApiKey?: string;
  googleApiKey?: string;
};

type SendOptions = {
  providerId: AvailableProviders;
  modelId: AvailableModels["id"];
  apiKey: string;
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
        const model = createProvider(
          sendOptions.providerId,
          sendOptions.apiKey
        ).chat(sendOptions.modelId);
        const result = streamText({
          model,
          messages: m.messages,
          abortSignal: fetchOptions.signal,
          system: await getDefaultInstructions(),
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
          maxSteps: 10,
          temperature: defaultTemperature,
        });
        return result.toDataStreamResponse({
          getErrorMessage: (error) => {
            notify("pluginError", {
              message: error.message,
              name: error.name,
              stack: error.stack
            })

            if (NoSuchToolError.isInstance(error)) {
              return "The model tried to call a unknown tool.";
            } else if (InvalidToolArgumentsError.isInstance(error)) {
              return "The model called a tool with invalid arguments.";
            } else if (ToolExecutionError.isInstance(error)) {
              if (UserRejectedError.isInstance(error.cause)) {
                return `User rejected tool call. (toolCallId: ${error.toolCallId})`;
              } else {
                return "An error occurred during tool execution.";
              }
            } else if (APICallError.isInstance(error)) {
              if (
                error.data?.error?.code === "invalid_api_key" ||
                error.data?.error?.message === "invalid x-api-key" ||
                error.data?.error?.code === 400
              ) {
                return `The API key is invalid.`;
              }
              return "An error occurred during API call.";
            } else if (NoSuchProviderError.isInstance(error)) {
              return `Provider ${error.providerId} does not exist.`;
            } else if (NoSuchModelError.isInstance(error)) {
              return `Model ${error.modelId} does not exist.`;
            }
            return "An unknown error occurred.";
          }
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

  function createProvider(providerId: AvailableProviders, apiKey: string) {
    if (!providerId) {
      throw new Error("No provider selected.");
    }

    if (providerId === "google") {
      return createGoogleGenerativeAI({
        apiKey,
      });
    } else if (providerId === "anthropic") {
      return createAnthropic({
        apiKey,
        headers: { 'anthropic-dangerous-direct-browser-access': 'true' }
      });
    } else if (providerId === "openai") {
      return createOpenAI({
        compatibility: "strict",
        apiKey,
      });
    }

    throw new Error(`Provider ${providerId} does not exist.`);
  }

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
    const model = createProvider(options.providerId, options.apiKey).languageModel(options.modelId);
    const res = await generateObject({
      model,
      schema: z.object({
        title: z.string().describe("The title of the conversation"),
      }),
      prompt:
        "Name this conversation in less than 30 characters.\n```" +
        messages.value.map((m) => `${m.role}: ${m.content}`).join("\n") +
        "\n```",
    });
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
    reload,
  };
}
