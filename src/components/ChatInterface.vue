<template>
  <div class="chat-container">
    <div class="chat-messages" ref="chatMessagesRef">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message', message.type]"
      >
        <div class="message-content">
          {{ message.content }}
        </div>
      </div>
      <div v-if="isThinking" class="thinking">
        <div v-for="i in 3" :key="i" class="thinking-dot"></div>
      </div>
    </div>

    <div class="chat-input-container">
      <textarea
        v-model="userInput"
        @keydown.enter="handleEnterKey"
        placeholder="Type your message here..."
        :disabled="isThinking"
        rows="1"
      ></textarea>
      <div class="actions">
        <select
          id="model-selector"
          aria-label="Model"
          :value="isThinking ? 'loading' : model?.id"
          @change="handleModelChange"
        >
          <option v-if="isThinking" value="loading">Loading models...</option>
          <option
            v-else
            v-for="model in models"
            :key="model.id"
            :value="model.id"
          >
            {{ model.displayName }}
          </option>
        </select>
        <button
          @click="send"
          class="submit-btn"
          :disabled="isThinking || !userInput.trim()"
        >
          <span class="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Providers as UIProviders } from "../providers";
import { mapState, mapActions } from "pinia";
import { useProviderStore } from "../store";

export default {
  name: "ChatInterface",

  data() {
    return {
      userInput: "",
    };
  },

  computed: {
    ...mapState(useProviderStore, [
      "providerId",
      "apiKey",
      "models",
      "messages",
      "isThinking",
      "model",
    ]),
    providers() {
      return UIProviders;
    },
  },

  watch: {
    messages: {
      handler() {
        this.$nextTick(() => {
          if (this.$refs.chatMessagesRef) {
            this.$refs.chatMessagesRef.scrollTop =
              this.$refs.chatMessagesRef.scrollHeight;
          }
        });
      },
      deep: true,
    },
  },

  async mounted() {
    await this.initializeProvider();
  },

  methods: {
    ...mapActions(useProviderStore, [
      "switchModelById",
      "initializeProvider",
      "sendMessage",
      "sendStreamMessage",
    ]),

    handleModelChange(event: Event) {
      this.switchModelById((event.target as HTMLSelectElement).value);
    },

    // Handle enter key (send on Enter, new line on Shift+Enter)
    handleEnterKey(e) {
      if (e.shiftKey) {
        // Allow default behavior (new line) when Shift+Enter is pressed
        return;
      }

      if (!this.isThinking) {
        e.preventDefault();
        e.stopPropagation();
        this.send();
      }
    },

    // Send message
    async send() {
      const message = this.userInput.trim();

      // Don't send empty messages
      if (!message || this.isThinking) return;

      // Clear the input field
      this.userInput = "";

      try {
        await this.sendStreamMessage(message);

        // this.isThinking = false;
        // const stream = streamMessage({
        //   onMessage: (message) => {
        //     this.addMessage("assistant", message);
        //   },
        //   onTool: async (tool, arg0) => {
        //     let message = tool;
        //     if (arg0) {
        //       message += `(${arg0})`;
        //     }
        //     this.addMessage("system", message);
        //     return await this.askPermission(tool) // "yes" or "no"
        //   },
        //   onComplete: () => {
        //     this.isThinking = false
        //   },
        // })
        //
        // // TODO add cancel
        // // stream.cancel()
        //
        // this.stream = stream

        // // Process the response
        // if (result.success) {
        //   // Add the assistant message to the UI
        //   this.addMessage("assistant", result.data?.content);
        //
        //   // Add assistant response to conversation history
        //   this.conversationHistory.push({
        //     type: "ai",
        //     content: result.data?.content,
        //   });
        // } else {
        //   // Handle error
        //   const errorMessage = `Error: ${result.error || "Unknown error occurred"}`;
        //   this.addMessage("system", errorMessage);
        //   console.error("API error:", result.error);
        // }
      } catch (error) {
        console.error("Error communicating with API:", error);
        // this.addMessage(
        //   "system",
        //   `Error: ${error.message || "Failed to communicate with the API"}`,
        // );
      } finally {
        // Clear thinking state
      }
    },

    // // Send message
    // async send() {
    //   const message = this.userInput.trim();
    //
    //   // Don't send empty messages
    //   if (!message || this.isThinking) return;
    //
    //   // Clear the input field
    //   this.userInput = "";
    //
    //   try {
    //     await this.sendMessage(message);
    //
    //     // this.isThinking = false;
    //     // const stream = streamMessage({
    //     //   onMessage: (message) => {
    //     //     this.addMessage("assistant", message);
    //     //   },
    //     //   onTool: async (tool, arg0) => {
    //     //     let message = tool;
    //     //     if (arg0) {
    //     //       message += `(${arg0})`;
    //     //     }
    //     //     this.addMessage("system", message);
    //     //     return await this.askPermission(tool) // "yes" or "no"
    //     //   },
    //     //   onComplete: () => {
    //     //     this.isThinking = false
    //     //   },
    //     // })
    //     //
    //     // // TODO add cancel
    //     // // stream.cancel()
    //     //
    //     // this.stream = stream
    //
    //     // // Process the response
    //     // if (result.success) {
    //     //   // Add the assistant message to the UI
    //     //   this.addMessage("assistant", result.data?.content);
    //     //
    //     //   // Add assistant response to conversation history
    //     //   this.conversationHistory.push({
    //     //     type: "ai",
    //     //     content: result.data?.content,
    //     //   });
    //     // } else {
    //     //   // Handle error
    //     //   const errorMessage = `Error: ${result.error || "Unknown error occurred"}`;
    //     //   this.addMessage("system", errorMessage);
    //     //   console.error("API error:", result.error);
    //     // }
    //   } catch (error) {
    //     console.error("Error communicating with API:", error);
    //     // this.addMessage(
    //     //   "system",
    //     //   `Error: ${error.message || "Failed to communicate with the API"}`,
    //     // );
    //   } finally {
    //     // Clear thinking state
    //   }
    // },
  },
};
</script>
