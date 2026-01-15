import { defineStore } from "pinia";
import { useChatStore } from "./chat";
import { useTabState } from "./tabState";

type ContextWindowState = {
  reducingContext: boolean;
};

export const useContextWindow = defineStore("contextWindow", {
  state: (): ContextWindowState => ({
    reducingContext: false,
  }),
  getters: {
    mustReduceContext(): boolean {
      return this.contextUsage >= 80;
    },
    /**
     * How many tokens are used relative to the context window (in percentage).
     */
    contextUsage() {
      const model = useChatStore().model;

      if (typeof model?.contextWindow !== "number") {
        return 0;
      }

      const totalTokens = useTabState().messages.findLast(
        (m) =>
          m.role === "assistant" &&
          typeof m.metadata?.usage?.totalTokens === "number",
      )?.metadata?.usage?.totalTokens;

      if (typeof totalTokens !== "number") {
        return 0;
      }

      // Round to 1 decimal (e.g. 12.3%)
      return Math.round((totalTokens / 3400) * 100 * 10) / 10;
      return Math.round((totalTokens / model.contextWindow) * 100 * 10) / 10;
    },
  },

  // actions: {
  //   async reduceContextWhenNeeded(
  //     messages: UIMessage[],
  //   ) {
  //     if (this.reducingContext) {
  //       console.warn("Already reducing context");
  //       return;
  //     }
  //     if (this.contextUsage < 0.8) {
  //       return;
  //     }
  //     this.reducingContext = true;
  //
  //     try {
  //       const ai = useAI({ initialMessages: messages });
  //       await ai.summarize(options);
  //     } catch (e) {
  //       log.error("Error reducing context", e);
  //     } finally {
  //       this.reducingContext = false;
  //     }
  //   },
  // },
});
