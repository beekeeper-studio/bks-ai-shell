<template>
  <div class="tool" :data-tool-name="toolCall.toolName" :data-tool-state="toolCall.state"
    :data-tool-empty-result="isEmptyResult">
    <div class="tool-name">{{ displayName }}</div>
    <markdown v-if="toolCall.toolName === 'run_query'" :content="'```sql\n' + toolCall.args.query + '\n```'" />
    <div v-if="askingPermission">
      {{
        toolCall.toolName === "run_query"
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
    <div :class="{ 'error tool-error': error }">
      <template v-if="error">{{ error }}</template>
      <template v-else-if="data">
        <template v-if="toolCall.toolName === 'get_connection_info'">
          {{ data.connectionType }}
        </template>
        <template v-if="toolCall.toolName === 'get_tables'">
          {{ data.length }}
          {{ $pluralize("table", data.length) }}
          (<code v-text="truncateAtWord(data.map((t) => t.name).join(', '))" />)
        </template>
        <template v-if="toolCall.toolName === 'get_columns'">
          {{ data.length }}
          {{ $pluralize("column", data.length) }}
          (<code v-if="data.length < 5" v-text="data.map((c) => c.name).join(', ')" />)
        </template>
        <run-query-result v-else-if="toolCall.toolName === 'run_query' && data" :data="data" />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import Markdown from "@/components/messages/Markdown.vue";
import { ToolInvocation } from "ai";
import { PropType } from "vue";
import { safeJSONStringify } from "@/utils";
import RunQueryResult from "@/components/messages/tool/RunQueryResult.vue";
import { isErrorContent, parseErrorContent } from "@/utils";
import _ from "lodash";

export default {
  components: { Markdown, RunQueryResult },
  props: {
    askingPermission: Boolean,
    toolCall: {
      type: Object as PropType<ToolInvocation>,
      required: true,
    },
  },
  emits: ["accept", "reject"],
  computed: {
    isEmptyResult() {
      if (this.toolCall.state === "result") {
        return _.isEmpty(
          this.toolCall.toolName === "run_query"
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
      try {
        return JSON.parse(this.toolCall.result);
      } catch (e) {
        return null;
      }
    },
    error() {
      if (isErrorContent(this.toolCall.result)) {
        const err = parseErrorContent(this.toolCall.result);
        return err.message ?? err;
      }
    },
    displayName() {
      if (this.toolCall.toolName === "get_columns") {
        if (this.toolCall.args.schema) {
          return `Get Columns (schema: ${this.toolCall.args.schema}, table: ${this.toolCall.args.table})`;
        }
        return `Get Columns (table: ${this.toolCall.args.table})`;
      }
      return this.toolCall.toolName.split("_").map(_.capitalize).join(" ");
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
