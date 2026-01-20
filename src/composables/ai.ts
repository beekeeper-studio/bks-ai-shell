import { Chat } from "@ai-sdk/vue";
import { computed, ComputedRef, ref } from "vue";
import { ChatStatus, isToolUIPart } from "ai";
import { useTabState } from "@/stores/tabState";
import { z } from "zod/v3";
import { createProvider } from "@/providers";
import { safeJSONStringify } from "@/utils";
import { log, runQuery } from "@beekeeperstudio/plugin";
import { UIMessage } from "@/types";
import { lastAssistantMessageIsCompleteWithApprovedResponses } from "@/utils/last-assistant-message-is-complete-with-approved-responses";
import { ChatTransport } from "@/providers/ChatTransport";
import { useChatStore } from "@/stores/chat";
import compactPrompt from "../../instructions/compact.txt?raw";

type AIOptions = {
  initialMessages: UIMessage[];
};

/** A wrapper class of AI SDK's Chat class */
class AIShellChat {
  readonly messages: ComputedRef<UIMessage[]>;
  readonly error: ComputedRef<Error | undefined>;
  readonly status: ComputedRef<ChatStatus>;
  readonly hasPendingApprovals: ComputedRef<boolean>;
  readonly compacting = ref(false);

  /** Force the `status` if not `null` */
  private runningEditedQuery = ref<boolean>();
  private chat: Chat<UIMessage>;
  /** Messages to be sent after compacting */
  private pendingCompactMessages = ref<UIMessage[]>([]);
  private aborted = ref(false);
  private errorDuringCompaction = ref(false);

  constructor(options: AIOptions) {
    this.chat = new Chat<UIMessage>({
      transport: new ChatTransport(),
      messages: options.initialMessages,
      sendAutomaticallyWhen:
        lastAssistantMessageIsCompleteWithApprovedResponses,
      onFinish: () => {
        this.saveMessages();
        this.fillTitle();
      },
      onError: (e) => {
        if (this.chat.lastMessage?.metadata?.compactStatus === "processing") {
          this.errorDuringCompaction.value = true;
        }
      },
    });

    this.messages = computed(() =>
      this.chat.messages.concat(this.pendingCompactMessages.value),
    );
    this.error = computed(() => this.chat.error);
    this.status = computed<ChatStatus>(() => {
      if (this.runningEditedQuery.value) {
        return "streaming";
      }
      return this.chat.status;
    });
    this.hasPendingApprovals = computed(() =>
      this.messages.value.some((message) =>
        message.parts.some(
          (part) => isToolUIPart(part) && part.state === "approval-requested",
        ),
      ),
    );
  }

  // Trigger API request without sending a message
  async triggerRequest() {
    this.aborted.value = false;
    await this.chat.sendMessage();
  }

  async send(text: string) {
    this.aborted.value = false;
    await this.chat.sendMessage({ text });
  }

  async retry() {
    this.aborted.value = false;
    if (this.errorDuringCompaction.value) {
      await this.continueCompacting();
      return;
    }
    await this.chat.regenerate();
  }

  async abort() {
    this.aborted.value = true;
    await this.chat.stop();
  }

  /**
   * Request a compact message and remove all previous messages.
   *
   * @param followUpMessage - The followup message to be sent after the compact message.
   **/
  async compact(followUpMessage?: string) {
    this.aborted.value = false;
    this.errorDuringCompaction.value = false;

    if (followUpMessage) {
      this.pendingCompactMessages.value.push({
        id: this.chat.generateId(),
        role: "user",
        parts: [{ type: "text", text: followUpMessage }],
      });
    }

    // If the last message is an unfinished compact message, remove it
    if (this.chat.lastMessage?.metadata?.compactStatus === "processing") {
      // Two messages to remove:
      // 1. The compact prompt
      // 2. The compact result
      this.chat.messages = this.chat.messages.slice(0, -2);
    }

    this.compacting.value = true;

    await this.chat.sendMessage({
      role: "user",
      parts: [{ type: "text", text: compactPrompt }],
      metadata: { isCompactPrompt: true },
    }).finally(() => {
      this.compacting.value = false;
      if (this.aborted.value) {
        this.errorDuringCompaction.value = true;
      }
    });

    if (this.errorDuringCompaction.value) {
      return;
    }

    await this.finishCompaction();
  }

  /** Call this to continue the compacting process if it fails. */
  private async continueCompacting() {
    this.aborted.value = false;
    this.errorDuringCompaction.value = false;

    this.compacting.value = true;

    await this.chat.regenerate().finally(() => {
      this.compacting.value = false;
      if (this.aborted.value) {
        this.errorDuringCompaction.value = true;
      }
    });

    if (this.errorDuringCompaction.value) {
      return;
    }

    await this.finishCompaction();
  }

  private async finishCompaction() {
    this.chat.messages = [this.chat.messages[this.chat.messages.length - 1]];

    if (this.pendingCompactMessages.value.length === 0) {
      return;
    }

    this.chat.messages = [
      ...this.chat.messages,
      ...this.pendingCompactMessages.value,
    ];

    this.pendingCompactMessages.value = [];

    await this.chat.sendMessage();
  }

  acceptPermission(approvalId: string) {
    this.chat.addToolApprovalResponse({ id: approvalId, approved: true });
  }

  /** After the user rejected the permission, they can provide a follow-up message.
   *
   * @param options.approvalId - The approval ID from the tool part
   * @param options.toolCallId - The tool call ID (for edited query flow)
   * @param options.editedQuery - The edited query / code that the user provided.
   **/
  async rejectPermission(
    options:
      | string
      | {
        approvalId: string;
        toolCallId: string;
        editedQuery: string;
      },
  ) {
    let approvalId = typeof options === "string" ? options : options.approvalId;

    this.chat.addToolApprovalResponse({
      id: approvalId,
      approved: false,
    });

    // Send followup message if the user edited the tool call
    if (typeof options === "object") {
      const assistantMessageId = this.chat.generateId();
      const replacementToolCallId = this.chat.generateId();

      this.runningEditedQuery.value = true;

      this.chat.messages = [
        ...this.chat.messages.slice(0, -1),
        {
          ...this.chat.lastMessage!,
          parts: [
            ...this.chat.lastMessage!.parts,
            {
              type: "data-userEditedToolCall",
              data: { replacementToolCallId },
            },
          ],
        },
        {
          id: this.chat.generateId(),
          role: "user",
          parts: [
            {
              // We use data so it's not shown in the UI
              type: "data-editedQuery",
              data: {
                query: options.editedQuery,
                targetToolCallId: options.toolCallId,
              },
            },
          ],
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
        options.editedQuery,
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
                output: runQueryOutput.output,
              },
            ],
          },
        ];
      }

      this.runningEditedQuery.value = false;

      this.triggerRequest();
    }
  }

  rejectAllPendingApprovals() {
    this.messages.value.forEach((message) => {
      message.parts.forEach((part) => {
        if (
          isToolUIPart(part) &&
          part.state === "approval-requested" &&
          part.approval
        ) {
          this.rejectPermission(part.approval.id);
        }
      });
    });
  }

  private async createRunQueryToolOutput(toolCallId: string, query: string) {
    try {
      return {
        state: "output-available" as const,
        toolCallId,
        tool: "tool-run_query" as const,
        output: safeJSONStringify(await runQuery(query)),
      };
    } catch (e) {
      return {
        state: "output-error" as const,
        toolCallId,
        tool: "tool-run_query" as const,
        errorText: e?.message || e.toString() || "Unknown error",
      };
    }
  }

  private getModelOrThrow() {
    const chat = useChatStore();
    if (!chat.model) {
      throw new Error("No model selected");
    }
    return chat.model;
  }

  private async saveMessages() {
    useTabState().setTabState("messages", this.messages.value);
  }

  private async fillTitle() {
    if (useTabState().conversationTitle) {
      // Skip generation if title is already set
      return;
    }
    const model = this.getModelOrThrow();
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
    const res = await createProvider(model.provider).generateObject({
      modelId: model.id,
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
    acceptPermission: chat.acceptPermission.bind(chat),
    rejectPermission: chat.rejectPermission.bind(chat),
    rejectAllPendingApprovals: chat.rejectAllPendingApprovals.bind(chat),
    hasPendingApprovals: chat.hasPendingApprovals,
    send: chat.send.bind(chat),
    retry: chat.retry.bind(chat),
    abort: chat.abort.bind(chat),
    compact: chat.compact.bind(chat),
    compacting: computed(() => chat.compacting.value),
  };
}
