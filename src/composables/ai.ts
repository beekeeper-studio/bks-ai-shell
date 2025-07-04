import {
  InvalidToolArgumentsError,
  LanguageModelV1,
  NoSuchToolError,
  streamText,
  ToolExecutionError,
} from "ai";
import { useChat } from "@ai-sdk/vue";
import { ref, watch } from "vue";
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

type AIOptions = {
  initialMessages: Message[];
  anthropicApiKey?: string;
  openaiApiKey?: string;
  googleApiKey?: string;
};

export function useAI(options: AIOptions) {
  const providerId = ref<AvailableProviders | undefined>();
  const modelId = ref<AvailableModels["id"] | undefined>();
  const askingPermission = ref(false);
  const followupAfterRejected = ref("");

  let permitted = false;

  const { messages, input, append, error, status, addToolResult, stop } =
    useChat({
      fetch: async (url, fetchOptions) => {
        if (!providerId.value || !modelId.value) {
          throw new Error("No provider or model selected.");
        }
        const m = JSON.parse(fetchOptions.body) as any;
        let provider: ReturnType<
          | typeof createOpenAI
          | typeof createAnthropic
          | typeof createGoogleGenerativeAI
        >;
        let model: LanguageModelV1;
        if (providerId.value === "google") {
          provider = createGoogleGenerativeAI({
            apiKey: options.googleApiKey,
          });
        } else if (providerId.value === "anthropic") {
          provider = createAnthropic({
            apiKey: options.anthropicApiKey,
          });
        } else if (providerId.value === "openai") {
          provider = createOpenAI({
            compatibility: "strict",
            apiKey: options.openaiApiKey,
          });
        } else {
          throw new Error("Unknown provider");
        }
        model = provider!.chat(modelId.value);
        const result = streamText({
          model,
          messages: m.messages,
          abortSignal: fetchOptions.signal,
          system: await getDefaultInstructions(),
          tools: getTools(async (name, params) => {
            askingPermission.value = true;
            await new Promise<void>((resolve) => {
              const unwatch = watch(askingPermission, () => {
                if (!askingPermission.value) {
                  unwatch();
                  resolve();
                }
              });
            });
            askingPermission.value = false;
            return permitted;
          }),
          maxSteps: 10,
          temperature: defaultTemperature,
        });
        return result.toDataStreamResponse({
          getErrorMessage: (error) => {
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
            } else {
              return "An unknown error occurred.";
            }
          },
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

  function setModel<T extends AvailableProviders>(
    provider: T,
    model: AvailableModels<T>["id"],
  ) {
    providerId.value = provider;
    modelId.value = model;
  }

  function acceptPermission() {
    permitted = true;
    askingPermission.value = false;
  }

  /** After the user rejected the permission, they can provide a follow-up message */
  function rejectPermission(userFollowup?: string) {
    if (userFollowup) {
      followupAfterRejected.value = userFollowup;
    }
    permitted = false;
    askingPermission.value = false;
  }

  /** Send a message to the AI */
  function send(message: string) {
    append({
      role: "user",
      content: message,
    });
  }

  function abort() {
    stop();
    saveMessages();
  }

  return {
    messages,
    provider: providerId,
    input,
    error,
    status,
    setModel,
    askingPermission,
    acceptPermission,
    rejectPermission,
    send,
    abort,
  };
}
