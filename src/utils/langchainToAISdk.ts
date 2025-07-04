import {
  AIMessage,
  HumanMessage,
  isAIMessage,
  isHumanMessage,
  isToolMessage,
  mapStoredMessagesToChatMessages,
  StoredMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { CreateMessage, Message, ToolResult } from "ai";
import _ from "lodash";

/**
 * View State v1 contains messages from LangChain with the following versions:
 * "@langchain/anthropic": "^0.3.21"
 * "@langchain/core": "^0.3.48"
 * "langchain": "^0.3.19"
 *
 * In this version, LangChain messages look like:
 * ```js
 * [
 *   {
 *     "type": "system" | "human" | "ai" | "tool",
 *     "data": {
 *       "content": string | object | array,
 *       "additional_kwargs": object,
 *       "response_metadata": object
 *     }
 *   }
 * ]
 * ```
 *
 * This function maps LangChain stored messages to the AI SDK message format:
 * ```js
 * [
 *   {
 *     "role": "system" | "user" | "assistant" | "tool",
 *     "content": string,
 *     "id": string,
 *     "createdAt": string,
 *     "parts": [
 *       {
 *         "type": "text" | "tool-use" | "tool-invocation",
 *         "text"?: string,
 *         "toolInvocation"?: object
 *       }
 *     ]
 *   }
 * ]
 * ```
 *
 * @param langChainMessages - LangChain-style stored messages
 * @returns AI SDK compatible messages
 */
export function mapLangChainStoredMessagesToAISdkMessages(
  messages: StoredMessage[],
): Message[] {
  const ret: Message[] = [];
  const langchainMessages = mapStoredMessagesToChatMessages(messages);
  console.log('converting langchain -> ai', langchainMessages)
  for (const langchainMessage of langchainMessages) {
    if (isHumanMessage(langchainMessage)) {
      const message: HumanMessage = langchainMessage;
      ret.push({
        id: message.id || _.uniqueId(),
        role: "user",
        content: message.text,
      });
    } else if (isAIMessage(langchainMessage)) {
      const message: AIMessage = langchainMessage;
      const retMessage: Message = {
        id: message.id || _.uniqueId(),
        role: "assistant",
        content: message.text,
        parts: [{ type: "text", text: message.text }],
      };

      if (typeof message.content !== "string") {
        const parts: CreateMessage["parts"] = [];
        for (const complex of message.content) {
          if (complex.type === "text") {
            parts.push({ type: "text", text: complex.text });
          } else if (complex.type === "tool_use") {
            const toolCall = message.tool_calls?.find(
              (t) => t.id === complex.id,
            );
            if (!toolCall) {
              console.warn("Tool call not found", complex, message);
              continue;
            }
            parts.push({ type: "step-start" });
            parts.push({
              type: "tool-invocation",
              toolInvocation: {
                toolName: toolCall.name,
                toolCallId: toolCall.id!,
                args: toolCall.args,
                result: "The result is lost due to data migration.",
                state: "result",
              },
            });
          }
        }
        retMessage.parts = parts;
      }

      ret.push(retMessage);
    } else if (isToolMessage(langchainMessage)) {
      const message: ToolMessage = langchainMessage;
      const assistantMessage = ret[ret.length - 1];
      if (assistantMessage.role !== "assistant") {
        console.warn(
          "Can't add tool message. Tool message must be after assistant message",
          langchainMessage,
        );
        continue;
      }
      if (!assistantMessage.parts) {
        console.warn("Can't add tool message. Assistant message has no parts");
        continue;
      }

      let toolResult: ToolResult<string, any, any> | undefined = undefined;
      for (const part of assistantMessage.parts) {
        if (
          part.type === "tool-invocation" &&
          part.toolInvocation.toolCallId === message.tool_call_id
        ) {
          toolResult = part.toolInvocation as ToolResult<string, any, any>;
          break;
        }
      }
      if (!toolResult) {
        console.log(assistantMessage.parts)
        console.warn(
          "Can't add tool message. Tool message not found in assistant message",
          langchainMessage,
        );
        continue;
      }

      toolResult.result = message.content;
    }
  }
  return ret;
}
