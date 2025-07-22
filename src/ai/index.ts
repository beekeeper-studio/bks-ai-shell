import { ToolInvocation, Message, ToolCall } from "ai";
import { generateId, ToolInvocationUIPart } from "@ai-sdk/ui-utils";
import { useChat } from "@ai-sdk/vue";
import { ref, computed } from "vue";
import { AvailableProviders, AvailableModels } from "@/config";
import { useTabState } from "@/stores/tabState";
import { notify, runQuery, setViewState } from "@beekeeperstudio/plugin";
import { PermissionResponse } from "@/plugins/appEvent";
import { chatFetch, generateTitle } from "./generation";
import { useConfigurationStore } from "@/stores/configuration";
import { safeJSONStringify } from "@/utils";
import _ from "lodash";
import type { tools } from "@/tools";
import { z } from "zod";

type AIOptions = {
  initialMessages: Message[];
};

export function useAI(options: AIOptions) {
  const configurationStore = useConfigurationStore();
  const tabState = useTabState();
  const providerId = ref<AvailableProviders | undefined>();
  const modelId = ref<AvailableModels["id"] | undefined>();
  const apiKey = ref<string | undefined>();
  const askingPermission = computed(() =>
    Object.keys(tabState.toolPermissions).some(
      (toolCallId) => tabState.toolPermissions[toolCallId].status === "pending",
    ),
  );

  const { messages, input, append, error, status, stop, addToolResult } =
    useChat({
      /** @ts-expect-error fetchInit should always be defined I think? */
      fetch: chatFetch,
      experimental_prepareRequestBody: (options) => {
        return {
          ...options,
          data: {
            providerId: providerId.value,
            modelId: modelId.value,
            apiKey: apiKey.value,
          },
        };
      },
      onError: (error) => {
        notify("pluginError", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      },
      onFinish: () => {
        saveMessages();
        fillTitle();

        const lastMessage = messages.value[messages.value.length - 1];

        if (lastMessage.role === "assistant") {
          // These are tools that were not handled by the backend
          // We must explicitly handle them here
          lastMessage.parts.forEach((part) => {
            if (
              part.type === "tool-invocation" &&
              part.toolInvocation.state === "call"
            ) {
              tabState.setTabState("toolPermissions", (toolPermissions) => ({
                ...toolPermissions,
                [part.toolInvocation.toolCallId]: {
                  status: "pending",
                },
              }));
            }
          });
        }
      },
      initialMessages: options.initialMessages,
    });

  function saveMessages() {
    tabState.setTabState("messages", messages.value);
  }

  function setModel<T extends AvailableProviders>(
    provider: T,
    model: AvailableModels<T>["id"],
  ) {
    providerId.value = provider;
    modelId.value = model;
    apiKey.value = configurationStore[`providers.${provider}.apiKey`];
  }

  async function resolvePermission(response: PermissionResponse) {
    // if (!toolInvocation.value) {
    //   throw new Error("No tool invocation");
    //   return
    // }

    // const args = response.changedArgs
    //   ? response.changedArgs
    //   : toolInvocation.value.args;

    // Generate result
    let result: string;
    if (response.status === "accepted") {
      try {
        switch (toolInvocation.value.toolName) {
          case "run_query":
            result = safeJSONStringify(await runQuery(args.query));
            break;
          default:
            result = JSON.stringify({
              type: "error",
              message: "Unknown tool",
            });
        }
      } catch (e) {
        result = JSON.stringify({
          type: "error",
          message: e.message,
        });
      }
    } else {
      result = JSON.stringify({
        type: "error",
        message: "User rejected tool call.",
      });
    }

    // Modify the tool invocation part
    const toolInvocationPart = messages.value[
      messages.value.length - 1
    ].parts.find(
      (part) =>
        part.type === "tool-invocation" &&
        part.toolInvocation.toolCallId === toolInvocation.value!.toolCallId,
    ) as ToolInvocationUIPart;

    if (response.status === "accepted") {
      // This will trigger a reload
      addToolResult({
        toolCallId: toolInvocationPart.toolInvocation.toolCallId,
        result,
      });
    } else {
      toolInvocationPart.toolInvocation = {
        ...toolInvocationPart.toolInvocation,
        state: "result",
        result,
      };
      messages.value[messages.value.length - 1].parts.push({
        type: "step-start",
      });
    }

    // clean up
    toolInvocation.value = null;
  }

  async function addEditableTool<T extends keyof typeof tools>(
    toolName: T,
    args: z.infer<(typeof tools)[T]["parameters"]>,
  ) {
    await resolvePermission({
      status: "rejected",
      message: "User rejected tool call. Run the tool below instead.",
    });

    const toolPart: ToolInvocationUIPart = {
      type: "tool-invocation",
      toolInvocation: {
        state: "call",
        toolName,
        args,
        toolCallId: generateId(),
      },
    };

    messages.value[messages.value.length - 1].parts.push(toolPart);

    toolInvocation.value = toolPart.toolInvocation;
  }

  async function fillTitle() {
    if (!modelId.value || !providerId.value) {
      throw new Error("No provider or model selected.");
    }
    if (useTabState().conversationTitle) {
      // Skip generation if title is already set
      return;
    }
    const title = await generateTitle({
      providerId: providerId.value,
      modelId: modelId.value,
      apiKey: apiKey.value,
      messages: messages.value,
    });
    await useTabState().setTabTitle(title);
  }

  /** Send a message to the AI */
  async function send(message: string) {
    if (!modelId.value) {
      throw new Error("No provider or model selected.");
    }

    if (askingPermission.value) {
      await resolvePermission({
        status: "rejected",
      });
    }

    await append({
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
    resolvePermission,
    addEditableTool,
    send,
    abort,
  };
}
