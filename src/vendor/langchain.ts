/**
 * Vendored types from @langchain/core/messages
 * Used for backward compatibility with V1 view state migration
 */

// ============================================================================
// StoredMessage types (serialized format)
// ============================================================================

export interface StoredMessage {
  type: string;
  data: StoredMessageData;
}

export interface StoredMessageData {
  content: string | MessageContentComplex[];
  role?: string;
  name?: string;
  tool_call_id?: string;
  additional_kwargs?: AdditionalKwargs;
  response_metadata?: Record<string, any>;
  id?: string;
}

// ============================================================================
// Message content types
// ============================================================================

export interface MessageContentText {
  type: "text";
  text: string;
}

export interface MessageContentToolUse {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, any>;
}

export type MessageContentComplex = MessageContentText | MessageContentToolUse | Record<string, any>;

// ============================================================================
// Tool call types
// ============================================================================

export interface ToolCall {
  name: string;
  args: Record<string, any>;
  id?: string;
  type?: "tool_call";
}

export interface AdditionalKwargs {
  tool_calls?: ToolCall[];
  [key: string]: any;
}

// ============================================================================
// Base message class (simplified)
// ============================================================================

export interface BaseMessage {
  content: string | MessageContentComplex[];
  name?: string;
  additional_kwargs: AdditionalKwargs;
  response_metadata?: Record<string, any>;
  id?: string;
}

// ============================================================================
// Concrete message types
// ============================================================================

export interface HumanMessage extends BaseMessage {
  _getType(): "human";
  /** Helper to get text content */
  text: string;
}

export interface AIMessage extends BaseMessage {
  _getType(): "ai";
  /** Helper to get text content */
  text: string;
  tool_calls?: ToolCall[];
}

export interface ToolMessage extends BaseMessage {
  _getType(): "tool";
  tool_call_id: string;
}

export interface SystemMessage extends BaseMessage {
  _getType(): "system";
}

export type ChatMessage = HumanMessage | AIMessage | ToolMessage | SystemMessage;

// ============================================================================
// Type guards
// ============================================================================

export function isHumanMessage(message: BaseMessage): message is HumanMessage {
  return (message as any)._getType?.() === "human";
}

export function isAIMessage(message: BaseMessage): message is AIMessage {
  return (message as any)._getType?.() === "ai";
}

export function isToolMessage(message: BaseMessage): message is ToolMessage {
  return (message as any)._getType?.() === "tool";
}

export function isSystemMessage(message: BaseMessage): message is SystemMessage {
  return (message as any)._getType?.() === "system";
}

// ============================================================================
// Message class implementations (for mapStoredMessagesToChatMessages)
// ============================================================================

class HumanMessageImpl implements HumanMessage {
  content: string | MessageContentComplex[];
  name?: string;
  additional_kwargs: AdditionalKwargs;
  response_metadata?: Record<string, any>;
  id?: string;

  constructor(data: StoredMessageData) {
    this.content = data.content;
    this.name = data.name;
    this.additional_kwargs = data.additional_kwargs || {};
    this.response_metadata = data.response_metadata;
    this.id = data.id;
  }

  _getType(): "human" {
    return "human";
  }

  get text(): string {
    if (typeof this.content === "string") {
      return this.content;
    }
    return this.content
      .filter((c): c is MessageContentText => c.type === "text")
      .map((c) => c.text)
      .join("");
  }
}

class AIMessageImpl implements AIMessage {
  content: string | MessageContentComplex[];
  name?: string;
  additional_kwargs: AdditionalKwargs;
  response_metadata?: Record<string, any>;
  id?: string;
  tool_calls?: ToolCall[];

  constructor(data: StoredMessageData) {
    this.content = data.content;
    this.name = data.name;
    this.additional_kwargs = data.additional_kwargs || {};
    this.response_metadata = data.response_metadata;
    this.id = data.id;
    // Extract tool_calls from additional_kwargs if present
    this.tool_calls = this.additional_kwargs.tool_calls;
  }

  _getType(): "ai" {
    return "ai";
  }

  get text(): string {
    if (typeof this.content === "string") {
      return this.content;
    }
    return this.content
      .filter((c): c is MessageContentText => c.type === "text")
      .map((c) => c.text)
      .join("");
  }
}

class ToolMessageImpl implements ToolMessage {
  content: string | MessageContentComplex[];
  name?: string;
  additional_kwargs: AdditionalKwargs;
  response_metadata?: Record<string, any>;
  id?: string;
  tool_call_id: string;

  constructor(data: StoredMessageData) {
    this.content = data.content;
    this.name = data.name;
    this.additional_kwargs = data.additional_kwargs || {};
    this.response_metadata = data.response_metadata;
    this.id = data.id;
    this.tool_call_id = data.tool_call_id || "";
  }

  _getType(): "tool" {
    return "tool";
  }
}

class SystemMessageImpl implements SystemMessage {
  content: string | MessageContentComplex[];
  name?: string;
  additional_kwargs: AdditionalKwargs;
  response_metadata?: Record<string, any>;
  id?: string;

  constructor(data: StoredMessageData) {
    this.content = data.content;
    this.name = data.name;
    this.additional_kwargs = data.additional_kwargs || {};
    this.response_metadata = data.response_metadata;
    this.id = data.id;
  }

  _getType(): "system" {
    return "system";
  }
}

// ============================================================================
// mapStoredMessagesToChatMessages implementation
// ============================================================================

/**
 * Converts stored messages (serialized format) to chat message objects.
 * This replicates the behavior of @langchain/core's mapStoredMessagesToChatMessages.
 */
export function mapStoredMessagesToChatMessages(
  messages: StoredMessage[]
): ChatMessage[] {
  return messages.map((msg) => {
    switch (msg.type) {
      case "human":
        return new HumanMessageImpl(msg.data);
      case "ai":
        return new AIMessageImpl(msg.data);
      case "tool":
        return new ToolMessageImpl(msg.data);
      case "system":
        return new SystemMessageImpl(msg.data);
      default:
        // Fallback: treat unknown types as human messages
        console.warn(`Unknown message type: ${msg.type}, treating as human message`);
        return new HumanMessageImpl(msg.data);
    }
  });
}
