import { UIMessage as AIUIMessage, InferUITools } from "ai";
import { tools } from "./tools";

export type UIDataTypes = {
  /** The code that the user provided. If defined, it will run the `code` and
   * give the result to the AI.*/
  userEditedCode: {
    code: string;
  };
}

export type UIMessage = AIUIMessage<unknown, UIDataTypes, InferUITools<typeof tools>>;

