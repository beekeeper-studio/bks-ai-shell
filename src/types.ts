import { UIMessage as AIUIMessage, InferUITools } from "ai";
import { tools } from "./tools";

export type UIDataTypes = {
  /** Marks the original tool call that was edited by the user.
   * The UI should show this tool call as replaced/superseded. */
  userEditedToolCall: {
    /** The ID of the new tool call that replaces this one. */
    replacementToolCallId: string;
  };

  /**
   * The query or code that the user provided. If defined, AI Shell should run
   * the `query` and give the result to the AI.
   *
   * This data is used by user messages.
   **/
  editedQuery: {
    query: string;
    /** The tool call that the user rejected. */
    targetToolCallId: string;
  };

  /**
   * If defined, AI Shell should replace the UI of `targetToolCallId` with
   * this tool or message.
   *
   * This data is used by assistant messages.
   **/
  toolReplacement: {
    /** The ID of the original tool call that this replaces. */
    targetToolCallId: string;
  };
}

export type UIMessage = AIUIMessage<unknown, UIDataTypes, InferUITools<typeof tools>>;

