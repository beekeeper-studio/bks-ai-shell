<template>
  <div class="tool" :data-tool-name="name" :data-tool-state="toolCall.state" :data-tool-empty-result="isEmptyResult"
    :data-tool-error="!!error">
    <div class="tool-name">
      {{ displayName }}
      <span
        v-if="message.parts.find((p) => p.type === 'data-toolReplacement')"
        class="edited-badge"
        title="You edited the AI's suggestion"
      >Edited</span>
    </div>
    <div class="tool-input-container" :style="{ opacity: editing ? 0.5 : 1 }">
      <markdown v-if="name === 'run_query'" :content="'```sql\n' +
        (toolCall.input?.query ||
          (toolCall.state === 'output-available' ? '(empty)' : '-- Generating')) +
        '\n```'
        " />
    </div>
    <div v-if="editing" class="tool-input-edit">
      <bks-sql-text-editor ref="queryEditor" :class="{ 'query-editor-focused': isQueryEditorFocused }"
        :value="initialQueryEditorValue" :isFocused="isQueryEditorFocused" @bks-focus="isQueryEditorFocused = true"
        @bks-blur="isQueryEditorFocused = false" @bks-value-change="queryEditorValue = $event.detail.value" />
      <div class="actions">
        <button class="btn btn-primary" @click="saveEdit"
          :disabled="queryEditorValue.trim().length === 0 || queryEditorValue === initialQueryEditorValue">
          Save & run
        </button>
        <button class="btn btn-flat" @click="cancelEdit">Cancel</button>
      </div>
    </div>
    <div v-if="askingPermission && !editing" class="tool-permission">
      {{
        name === "run_query"
          ? "Do you want to run this query?"
          : "Do you want to proceed?"
      }}
      <div class="tool-permission-buttons">
        <button class="btn btn-flat" @click="$emit('accept')">
          Yes
          <span class="material-symbols-outlined accept-icon"> check </span>
        </button>
        <button class="btn btn-flat" @click="$emit('reject')">
          No
          <span class="material-symbols-outlined reject-icon"> close </span>
        </button>
        <button class="btn btn-flat" @click="edit">
          Edit
          <span class="material-symbols-outlined reject-icon"> edit_square </span>
        </button>
      </div>
    </div>
    <div class="tool-error error" v-if="error" v-text="error" />
    <div class="tool-result" v-else-if="data">
      <template v-if="name === 'get_connection_info'">
        {{ data.connectionType }}
      </template>
      <template v-if="name === 'get_tables'">
        {{ data.length }}
        {{ $pluralize("table", data.length) }}
      </template>
      <template v-if="name === 'get_columns'">
        {{ data.length }}
        {{ $pluralize("column", data.length) }}
      </template>
      <run-query-result v-else-if="name === 'run_query' && data" :data="data" />
    </div>
  </div>
</template>

<script lang="ts">
import Markdown from "@/components/messages/Markdown.vue";
import { type ToolUIPart } from "ai";
import { PropType } from "vue";
import { safeJSONStringify } from "@/utils";
import RunQueryResult from "@/components/messages/tool/RunQueryResult.vue";
import { isErrorContent, parseErrorContent } from "@/utils";
import _ from "lodash";
import { UIMessage } from "@/types";

export default {
  components: { Markdown, RunQueryResult },
  props: {
    askingPermission: Boolean,
    message: {
      type: Object as PropType<UIMessage>,
      required: true,
    },
    toolCall: {
      type: Object as PropType<ToolUIPart>,
      required: true,
    },
    args: null,
  },
  emits: ["accept", "reject"],
  data() {
    return {
      editing: false,
      initialQueryEditorValue: "",
      isQueryEditorFocused: false,
      queryEditorValue: "",
    };
  },
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
      if (this.name === "get_columns") {
        if (this.toolCall.input?.schema) {
          return `Get Columns (schema: ${this.toolCall.input?.schema}, table: ${this.toolCall.input?.table || "..."})`;
        }
        return `Get Columns (${this.toolCall.input?.table || "..."})`;
      }
      return this.name.split("_").map(_.capitalize).join(" ");
    },
  },
  methods: {
    truncateAtWord(str, maxLength) {
      if (str.length <= maxLength) return str;
      return str.slice(0, str.lastIndexOf(" ", maxLength)) + "…";
    },
    edit() {
      if (this.initialQueryEditorValue === "") {
        this.initialQueryEditorValue = this.toolCall.input?.query ?? "";
      }
      this.queryEditorValue = this.initialQueryEditorValue;
      this.isQueryEditorFocused = true;
      this.editing = true;
    },
    saveEdit() {
      this.editing = false;
      this.$emit("reject", { editedQuery: this.queryEditorValue })
      this.initialQueryEditorValue = this.queryEditorValue;
    },
    cancelEdit() {
      this.editing = false;
      this.initialQueryEditorValue = this.queryEditorValue;
    },
  },
};
</script>

<style scoped>
.tool-error {
  margin-top: 0.5rem;
}

.tool-input-edit {
  border-top: 1px solid var(--border-color);
  margin-top: 1rem;

  bks-sql-text-editor {
    display: block;
    margin-top: 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    overflow: auto;

    &.query-editor-focused {
      outline: var(--focus-visible-outline);
    }
  }

  .actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
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
