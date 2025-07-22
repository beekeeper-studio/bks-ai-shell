<template>
  <div class="tool">
    <div>{{ displayName }}</div>
    <run-query-args
      v-if="toolResult.toolName === 'run_query'"
      :args="toolResult.args"
      :asking-permission="askingPermission"
      @change="handleChangeArgs"
    />
    <div v-if="askingPermission">
      {{
        toolResult.toolName === "run_query"
          ? "Do you want to run this query?"
          : "Do you want to proceed?"
      }}
      <div class="tool-permission-buttons">
        <button
          class="btn btn-flat"
          @click="handlePermissionButton('accepted')"
        >
          Yes
        </button>
        <button
          class="btn btn-flat"
          @click="handlePermissionButton('rejected')"
        >
          No
        </button>
        <button
          class="btn btn-flat"
          @click="handleEdit"
        >
          Edit query
        </button>
      </div>
    </div>
    <div :class="{ error }">
      <template v-if="error">{{ error }}</template>
      <template v-else-if="data">
        <template v-if="toolResult.toolName === 'get_connection_info'">
          {{ data.connectionType }}
        </template>
        <template v-if="toolResult.toolName === 'get_tables'">
          {{ data.length }}
          {{ $pluralize("table", data.length) }}
          (<code v-text="truncateAtWord(data.map((t) => t.name).join(', '))" />)
        </template>
        <template v-if="toolResult.toolName === 'get_columns'">
          {{ data.length }}
          {{ $pluralize("column", data.length) }}
          (<code
            v-if="data.length < 5"
            v-text="data.map((c) => c.name).join(', ')"
          />)
        </template>
        <run-query-result
          v-else-if="toolResult.toolName === 'run_query' && data"
          :data="data"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import Markdown from "@/components/messages/Markdown.vue";
import { PropType, computed } from "vue";
import { safeJSONStringify } from "@/utils";
import RunQueryArgs from "@/components/messages/tool/RunQueryArgs.vue";
import RunQueryResult from "@/components/messages/tool/RunQueryResult.vue";
import { isErrorContent, parseErrorContent } from "@/utils";
import _ from "lodash";
import type { MappedToolResult } from "@/tools";
import { mapState } from "pinia";
import { useTabState } from "@/stores/tabState";

export default {
  components: {
    Markdown,
    RunQueryResult,
    RunQueryArgs,
  },

  props: {
    toolResult: {
      type: Object as PropType<MappedToolResult>,
      required: true,
    },
  },

  data() {
    return {
      userChangedArgs: false,
      newArgs: {} as MappedToolResult["args"],
    };
  },

  computed: {
    ...mapState(useTabState, ["toolPermissions"]),
    askingPermission() {
      return (
        this.toolPermissions[this.toolResult.toolCallId]?.status === "pending"
      );
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
        return JSON.parse(this.toolResult.result);
      } catch (e) {
        return null;
      }
    },
    error() {
      if (isErrorContent(this.toolResult.result)) {
        const err = parseErrorContent(this.toolResult.result);
        return err.message ?? err;
      }
    },
    displayName() {
      if (this.toolResult.toolName === "get_columns") {
        if (this.toolResult.args.schema) {
          return `Get Columns (schema: ${this.toolResult.args.schema}, table: ${this.toolResult.args.table})`;
        }
        return `Get Columns (table: ${this.toolResult.args.table})`;
      }
      return this.toolResult.toolName.split("_").map(_.capitalize).join(" ");
    },
  },
  methods: {
    truncateAtWord(str, maxLength) {
      if (str.length <= maxLength) return str;
      return str.slice(0, str.lastIndexOf(" ", maxLength)) + "…";
    },

    handleChangeArgs(args: MappedToolResult["args"]) {
      this.userChangedArgs = true;
      this.newArgs = args;
    },

    handleEdit() {
      this.trigger("editToolArgs", {
        toolName: this.toolResult.toolName,
        args: this.toolResult.args,
      });
    },

    handlePermissionButton(status: "accepted" | "rejected") {
      this.trigger("resolvePermission", {
        toolCallId: this.toolResult.toolCallId,
        status,
      });
    },
  },
};
</script>
