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
import { Message } from "ai";
import { defineStore } from "pinia";
import { StoredMessage } from "@langchain/core/messages";
import { mapLangChainStoredMessagesToAISdkMessages } from "@/utils/langchainToAISdk";
import _ from "lodash";

type Old_TabState = {
  messages: StoredMessage[];
  conversationTitle: string;
}

type TabState = {
  version: "2"
  messages: Message[];
  conversationTitle: string;
};

function isOldTabState(viewState: any): viewState is Old_TabState {
  return viewState && !("version" in viewState);
}

export const useTabState = defineStore("tabState", {
  state: (): TabState => ({
    version: "2",
    messages: [],
    conversationTitle: "",
  }),

  actions: {
    async sync() {
      const state = await getViewState<TabState>();
      if (state) {
        if (isOldTabState(state)) {
          this.messages = mapLangChainStoredMessagesToAISdkMessages(state.messages);
        } else {
          this.messages = state.messages;
        }
        this.conversationTitle = state.conversationTitle;
      }
    },
    async setTabState(key: keyof TabState, value: TabState[keyof TabState]) {
      this.$patch({ [key]: value });
      setViewState<TabState>({
        version: "2",
        messages: _.cloneDeep(this.messages),
        conversationTitle: this.conversationTitle,
      });
    },
    async setTabTitle(title: string) {
      this.setTabState("conversationTitle", title);
      await setTabTitle(title);
    },
  },
});
