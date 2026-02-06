<template>
  <div class="tool" :data-tool-name="name" :data-tool-state="toolCall.state" :data-tool-empty-result="isEmptyResult"
    :data-tool-error="!!error">
    <div class="tool-name">
      {{ displayName }}
      <span v-if="message.parts.find((p) => p.type === 'data-toolReplacement')" class="edited-badge"
        title="You edited the AI's suggestion">Edited</span>
    </div>
    <run-query-tool
      v-if="toolCall.type === 'tool-run_query'"
      :state="toolCall.state"
      :input="toolCall.input"
      :output="toolCall.output"
      :errorText="toolCall.errorText"
      :approval="toolCall.approval"
      :disableToolEdit="disableToolEdit"
      @accept="$emit('accept')"
      @reject="$emit('reject', $event)"
    />
    <template v-else>
      <div v-if="toolCall.state === 'approval-requested'" class="tool-permission">
        Do you want to proceed?
        <div class="tool-permission-buttons">
          <button class="btn btn-small btn-flat" @click="$emit('accept')">
            Yes
            <span class="material-symbols-outlined accept-icon"> check </span>
          </button>
          <button class="btn btn-small btn-flat" @click="$emit('reject')">
            No
            <span class="material-symbols-outlined reject-icon"> close </span>
          </button>
        </div>
      </div>
      <div class="tool-error error" v-if="error" v-text="error" />
      <div class="tool-result" v-else-if="toolCall.state === 'output-available'">
        <template v-if="toolCall.type === 'tool-get_tables'">
          {{ data.length }}
          {{ $pluralize("table", data.length) }}
        </template>
        <template v-if="toolCall.type === 'tool-get_columns'">
          {{ data.length }}
          {{ $pluralize("column", data.length) }}
        </template>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import type { PropType } from "vue";
import { safeJSONStringify } from "@/utils";
import { isErrorContent, parseErrorContent } from "@/utils";
import _ from "lodash";
import type { ToolUIPart, UIMessage } from "@/types";
import RunQueryTool from "@/components/messages/tool/RunQueryTool.vue";

export default {
  components: { RunQueryTool },
  props: {
    message: {
      type: Object as PropType<UIMessage>,
      required: true,
    },
    toolCall: {
      type: Object as PropType<ToolUIPart>,
      required: true,
    },
    disableToolEdit: Boolean,
  },
  emits: ["accept", "reject"],
  computed: {
    name() {
      return this.toolCall.type.replace("tool-", "");
    },
    isEmptyResult() {
      if (this.toolCall.state === "output-available") {
        return _.isEmpty(
          this.name === "run_query"
            ? this.data.results?.[0]?.rows
            : this.data,
        );
      }
      return true;
    },
    content() {
      if (this.data) {
        let str = "";

        try {
          str = safeJSONStringify(this.data, null, 2);
        } catch (e) {
          // do nothing
        }

        return "```json\n" + str + "\n```";
      }

      return "";
    },
    data() {
      if (this.toolCall.state !== "output-available") {
        return null;
      }

      try {
        return JSON.parse(this.toolCall.output);
      } catch (e) {
        return null;
      }
    },
    error() {
      if (
        this.toolCall.state === "output-available" &&
        isErrorContent(this.toolCall.output)
      ) {
        const err = parseErrorContent(this.toolCall.output);
        return err.message ?? err;
      } else if (this.toolCall.state === "output-error") {
        return this.toolCall.errorText;
      }
    },
    displayName() {
      if (this.toolCall.type === "tool-get_columns") {
        if (this.toolCall.input?.schema) {
          return `Get Columns (schema: ${this.toolCall.input?.schema}, table: ${this.toolCall.input?.table || "..."})`;
        }
        return `Get Columns (${this.toolCall.input?.table || "..."})`;
      }
      return this.name.split("_").map(_.capitalize).join(" ");
    },
  },
};
</script>

<style scoped>
.tool-error {
  margin-top: 0.5rem;
}

.tool-permission {
  margin-top: 0.5rem;
}

.edited-badge {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.75rem;
  margin-left: 0.25rem;
  padding-inline: 0.25rem;
  padding-block: 0.1rem;
  color: var(--text-light);
  cursor: default;
}
</style>
