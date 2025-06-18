<template>
  <div class="ai">
    <div
      class="tool-call"
      :class="{
        active: toolExtras[tool_call.id]?.permission?.response === 'pending',
      }"
      v-for="tool_call in message.tool_calls"
      :key="tool_call.id"
    >
      <div class="tool-call-name">
        {{ getDisplayNameOfTool(tool_call) }}
        <span
          v-if="toolExtras[tool_call.id]?.permission?.response === 'reject'"
          class="material-symbols-outlined reject-icon"
        >
          close
        </span>
        <span
          v-if="toolExtras[tool_call.id]?.permission?.response === 'accept'"
          class="material-symbols-outlined accept-icon"
        >
          check
        </span>
      </div>
      <Message
        v-if="tool_call.name === 'run_query'"
        :content="'```sql\n' + (tool_call.args.query || '') + '\n```'"
      />
      <div v-if="toolExtras[tool_call.id]?.permission?.response === 'pending'">
        <template v-if="tool_call.name === 'run_query'">
          Do you want to run this query?
        </template>
        <template v-else>Do you want to proceed?</template>
        <div class="tool-permission-buttons">
          <button class="accept-btn" @click="acceptTool(tool_call.id)">
            Yes
            <span class="material-symbols-outlined accept-icon"> check </span>
          </button>
          <button class="reject-btn" @click="rejectTool(tool_call.id)">
            No
            <span class="material-symbols-outlined reject-icon"> close </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { AIMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { PropType } from "vue";
import { mapState, mapActions } from "pinia";
import { useProviderStore } from "../store";

export default {
  props: {
    message: {
      type: Object as PropType<AIMessage>,
      required: true,
    },
  },

  computed: {
    ...mapState(useProviderStore, [
      "providerId",
      "provider",
      "model",
      "pendingModelId",
      "apiKey",
      "models",
      "messages",
      "tools",
      "error",
      "isProcessing",
      "toolExtras",
      "isWaitingPermission",
    ]),
  },

  methods: {
    ...mapActions(useProviderStore, ["acceptTool", "rejectTool"]),
    getDisplayNameOfTool(tool: ToolCall) {
      if (tool.name === "get_columns") {
        if (tool.args.schema) {
          return `Get Columns (schema: ${tool.args.schema}, table: ${tool.args.table})`;
        }
        return `Get Columns (table: ${tool.args.table})`;
      }
      return tool.name.split("_").map(_.capitalize).join(" ");
    },
  },
};
</script>
