/**
 * Data that is specific to a tab instance. Anything in here are recovarable.
 * Example: If you close the AI Shell Tab, and then re-open it with ctrl+shift+t
 * the messages and all data in here are restored. Thanks to getViewState!
 *
 * Usage:
 *
 * 1. Call `sync()` if it hasn't been called yet.
 * 2. Read the state by accessing it normally.
 * 3. Use `setTabState()` to update the state.
 *
 **/

import { getViewState, setTabTitle, setViewState } from "@beekeeperstudio/plugin";
import type { UIMessage } from "@/types";
import { defineStore } from "pinia";
import type { StoredMessage } from "@/vendor/langchain";
import { mapLangChainStoredMessagesToAISdkMessages } from "@/utils/langchainToAISdk";
import _ from "lodash";
import { mapV4MessagesToV5Messages, type MessageV4 } from "@/utils/aiSdkV5Migration";

type Old_TabState = {
  messages: StoredMessage[];
  conversationTitle: string;
}

type TabState = {
  /**
   * Version 2 = AI SDK v4
   * Version 3 = AI SDK v5
   */
  version: "2" | "3";
  messages: UIMessage[];
  conversationTitle: string;
  /**
   * Set once the task this tab was opened with (see `utils/hostTask`) has been
   * sent.
   *
   * The host persists a tab's params and re-delivers them every time the view
   * mounts, so without this a restart would re-run the task and re-bill the
   * user's tokens. It lives in the tab state rather than being cleared host-side
   * so a task survives first-time setup: it stays pending until it is genuinely
   * sent.
   */
  taskConsumed?: boolean;
};

const currentTabVersion = "3";

function isV1TabState(viewState: any): viewState is Old_TabState {
  return !("version" in viewState);
}

export const useTabState = defineStore("tabState", {
  state: (): TabState => ({
    version: currentTabVersion,
    messages: [],
    conversationTitle: "",
    taskConsumed: false,
  }),

  actions: {
    async sync() {
      const state = await getViewState<TabState>();
      if (state) {
        if (isV1TabState(state)) {
          const v4Messages = mapLangChainStoredMessagesToAISdkMessages(state.messages);
          this.messages = mapV4MessagesToV5Messages(v4Messages) as UIMessage[];
        } else if (state.version === "2"){
          this.messages = mapV4MessagesToV5Messages(state.messages as MessageV4[]) as UIMessage[];
        } else {
          this.messages = state.messages;
        }
        this.conversationTitle = state.conversationTitle;
        this.taskConsumed = !!state.taskConsumed;
      }
    },
    async setTabState(key: keyof TabState, value: TabState[keyof TabState]) {
      this.$patch({ [key]: value });
      setViewState<TabState>({
        version: currentTabVersion,
        messages: _.cloneDeep(this.messages),
        conversationTitle: this.conversationTitle,
        taskConsumed: this.taskConsumed,
      });
    },
    /** Record that this tab's host task has been sent. Do this before sending,
     * so a failure can't turn into a loop of retries on every remount. */
    async markTaskConsumed() {
      await this.setTabState("taskConsumed", true);
    },
    async setTabTitle(title: string) {
      this.setTabState("conversationTitle", title);
      await setTabTitle(title);
    },
  },
});
