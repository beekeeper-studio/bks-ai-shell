<template>
  <div class="tool" :data-tool-state="tool.state">
    <div>{{ displayName }}</div>
    <markdown v-if="name === 'run_query'" :content="'```sql\n' +
      (tool.input?.query ||
        (tool.state === 'output-available' ? '(empty)' : '-- Generating')) +
      '\n```'
      " />
    <div v-if="askingPermission">
      {{
        name === "run_query"
          ? "Do you want to run this query?"
          : "Do you want to proceed?"
      }}
      <div class="tool-permission-buttons">
        <button class="accept-btn" @click="$emit('accept')">
          Yes
          <span class="material-symbols-outlined accept-icon"> check </span>
        </button>
        <button class="reject-btn" @click="$emit('reject')">
          No
          <span class="material-symbols-outlined reject-icon"> close </span>
        </button>
      </div>
    </div>
    <div :class="{ error }">
      <template v-if="error">{{ error }}</template>
      <template v-else-if="data">
        <template v-if="name === 'get_connection_info'">
          {{ data.connectionType }}
        </template>
        <template v-if="name === 'get_tables'">
          {{ data.length }}
          {{ $pluralize("table", data.length) }}
          (<code v-text="truncateAtWord(data.map((t) => t.name).join(', '))" />)
        </template>
        <template v-if="name === 'get_columns'">
          {{ data.length }}
          {{ $pluralize("column", data.length) }}
          (<code v-if="data.length < 5" v-text="data.map((c) => c.name).join(', ')" />)
        </template>
        <run-query-result v-else-if="name === 'run_query' && data" :data="data" />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import Markdown from "@/components/messages/Markdown.vue";
import { PropType } from "vue";
import { safeJSONStringify } from "@/utils";
import RunQueryResult from "@/components/messages/tool/RunQueryResult.vue";
import { isErrorContent, parseErrorContent } from "@/utils";
import _ from "lodash";
import { ToolUIPart } from "ai";

export default {
  components: { Markdown, RunQueryResult },
  props: {
    askingPermission: Boolean,
    tool: {
      type: Object as PropType<ToolUIPart>,
      required: true,
    },
    args: null,
  },
  emits: ["accept", "reject"],
  computed: {
    name() {
      return this.tool.type.replace("tool-", "");
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
      if (this.tool.state !== "output-available") {
        return null;
      }

      try {
        return JSON.parse(this.tool.output);
      } catch (e) {
        return null;
      }
    },
    error() {
      if (
        this.tool.state === "output-available" &&
        isErrorContent(this.tool.output)
      ) {
        const err = parseErrorContent(this.tool.output);
        return err.message ?? err;
      } else if (this.tool.state === "output-error") {
        return this.tool.errorText;
      }
    },
    displayName() {
      if (this.name === "get_columns") {
        if (this.tool.input?.schema) {
          return `Get Columns (schema: ${this.tool.input?.schema}, table: ${this.tool.input?.table || "..."})`;
        }
        return `Get Columns (table: ${this.tool.input?.table || "..."})`;
      }
      return this.name.split("_").map(_.capitalize).join(" ");
    },
  },
  methods: {
    truncateAtWord(str, maxLength) {
      if (str.length <= maxLength) return str;
      return str.slice(0, str.lastIndexOf(" ", maxLength)) + "…";
    },
  },
};
</script>
