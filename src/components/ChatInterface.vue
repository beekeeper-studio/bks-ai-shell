<template>
  <div class="chat-container">
    <div class="chat-messages" ref="chatMessagesRef">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message', message.role]"
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
          :value="model"
          @change="handleModelChange"
          v-if="availableModels.length > 1"
        >
          <option
            v-for="model in availableModels"
            :key="model.value"
            :value="model.value"
          >
            {{ model.label }}
          </option>
        </select>
        <button
          @click="sendMessage"
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
import { UIProviders } from "../configs";
import {
  initializeProvider,
  sendMessage,
  fetchAvailableModels,
  formatModelName,
} from "../services/apiService";
import { mapState, mapWritableState, mapActions } from "pinia";
import { useProviderStore } from "../store";

export default {
  name: "ChatInterface",

  data() {
    return {
      userInput: "",
      isThinking: false,
      messages: [
        {
          role: "system",
          content:
            "Hi there! I'm your AI-powered assistant. How can I help you today?",
        },
      ],
      conversationHistory: [],
      availableModels: [{ value: "", label: "Loading models..." }],
    };
  },

  computed: {
    ...mapWritableState(useProviderStore, ["model"]),
    ...mapState(useProviderStore, ["providerId", "apiKey"]),
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
    await this.loadModelsForProvider();
  },

  methods: {
    ...mapActions(useProviderStore, ["setProvider", "setModel"]),
    // Initialize provider and load models
    async initializeProvider() {
      try {
        await initializeProvider(this.providerId, {
          apiKey: this.apiKey,
          modelName: this.model,
        });
      } catch (error) {
        this.addMessage(
          "system",
          `Error initializing ${this.providerId}: ${error}`,
        );
      }
    },

    // Load models for current provider
    async loadModelsForProvider() {
      // Show loading status
      this.availableModels = [{ value: "", label: "Loading models..." }];

      // Try to fetch available models
      const modelsResult = await fetchAvailableModels();

      if (modelsResult.success) {
        // Populate models
        this.availableModels = modelsResult.data!.models.map((model) => {
          const formattedName = formatModelName(model.id);
          return { value: model.id, label: formattedName };
        });
        if (!this.model) {
          // FIXME if the provider is different, this will not work
          this.model = modelsResult.data!.defaultModel.id;
        } else {
          this.availableModels = [];

          // if (modelsResult.error) {
          //   this.addMessage(
          //     "system",
          //     `Note: Using default models. ${modelsResult.error}`,
          //   );
          // }
        }
      }
    },

    // // Handle provider change
    // async handleProviderChange() {
    //   try {
    //     await storage.saveSelectedProvider(this.providerId);
    //
    //     // Clear conversation when switching providers
    //     this.conversationHistory = [];
    //
    //     // Switch provider
    //     const result = await api.switchProvider(this.providerId, {
    //       apiKey: this.apiKey,
    //       modelName: null, // Let provider choose default initially
    //     });
    //
    //     if (result.success) {
    //       this.addMessage("system", `Switched to ${result.provider} provider`);
    //       await this.loadModelsForProvider();
    //     } else {
    //       this.addMessage(
    //         "system",
    //         `Error switching provider: ${result.error}`,
    //       );
    //     }
    //   } catch (error) {
    //     console.error("Error handling provider change:", error);
    //     this.addMessage(
    //       "system",
    //       `Error saving provider preference: ${error.message}`,
    //     );
    //   }
    // },

    // Handle model change
    async handleModelChange() {
      // Skip if "loading" is selected
      if (this.model === "loading") return;

      try {
        this.setModel(this.model);
        await this.initializeProvider();
        this.addMessage(
          "system",
          `Model switched to ${formatModelName(this.model)}`,
        );
      } catch (error) {
        console.error("Error handling model change:", error);
        this.addMessage(
          "system",
          `Error saving model preference: ${error}`,
        );
      }
    },

    // Add message to UI and scroll to bottom
    addMessage(role: "user" | "assistant" | "system", content) {
      this.messages.push({ role, content });
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
        this.sendMessage();
      }
    },

    // Send message
    async sendMessage() {
      const message = this.userInput.trim();

      // Don't send empty messages
      if (!message || this.isThinking) return;

      // Add the user message to the UI
      this.addMessage("user", message);

      // Clear the input field
      this.userInput = "";

      // Add user message to conversation history
      this.conversationHistory.push({ type: "human", content: message });

      // Show thinking state
      this.isThinking = true;

      try {
        // TODO remove the logs
        console.log("Sending message to API:", message);
        console.log("Conversation history:", this.conversationHistory);

        // Call the API using the current provider
        const result = await sendMessage(message, this.conversationHistory);
        console.log("API response:", result);

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

        // Process the response
        if (result.success) {
          // Add the assistant message to the UI
          this.addMessage("assistant", result.data?.content);
          console.log("Assistant response added to UI");

          // Add assistant response to conversation history
          this.conversationHistory.push({
            type: "ai",
            content: result.data?.content,
          });
          console.log("Conversation history updated");
        } else {
          // Handle error
          const errorMessage = `Error: ${result.error || "Unknown error occurred"}`;
          this.addMessage("system", errorMessage);
          console.error("API error:", result.error);
        }
      } catch (error) {
        console.error("Error communicating with API:", error);
        this.addMessage(
          "system",
          `Error: ${error.message || "Failed to communicate with the API"}`,
        );
      } finally {
        // Clear thinking state
        this.isThinking = false;
        console.log("Thinking state cleared");
      }
    },
  },
};
</script>
