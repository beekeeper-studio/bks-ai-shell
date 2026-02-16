<template>
  <div class="run-query-tool" :data-tool-state="state">
    <div class="tool-input-container" :data-editing="editing">
      <div class="code-block">
        <div class="lang">{{ sqlOrCode }}</div>
        <div class="actions">
          <div class="group">
            <button class="btn btn-flat-2" :disabled="!supportOpenInQueryEditor" @click="openInQueryTab"
              :title="`Open in query editor` + (supportOpenInQueryEditor ? '' : ' (requires Beekeeper Studio 5.4+)')">
              <span class="material-symbols-outlined">open_in_new</span>
            </button>
            <button class="btn btn-flat-2" :class="{ copied }" @click="copy">
              <span class="material-symbols-outlined copy-icon">content_copy</span>
              <span class="material-symbols-outlined copied-icon">check</span>
              <span>
                <template v-if="!copied">Copy {{ queryOrCode }}</template>
                <template v-else>Copied</template>
              </span>
            </button>
          </div>
        </div>
        <div class="tool-input" :class="{ 'query-editor-focused': isQueryEditorFocused }">
          <div v-if="state === 'input-streaming'" class="generating-label">
            Generating<span class="dots"></span>
          </div>
          <bks-sql-text-editor ref="queryEditor" v-else-if="editing" :value="initialQueryEditorValue"
            @bks-initialized="handleQueryEditorInitialized" @bks-focus="isQueryEditorFocused = true"
            :entities="entities" :columnsGetter="columnsGetter" @bks-blur="isQueryEditorFocused = false"
            @bks-value-change="queryEditorValue = $event.detail.value" />
          <pre v-else><code class="hljs hljs-sql" data-lang="sql" v-html="queryHtml" /></pre>
        </div>
      </div>
    </div>
    <div v-if="editing" class="tool-input-edit-actions">
      <button class="btn btn-primary" @click="saveEdit"
        :disabled="queryEditorValue.trim().length === 0 || queryEditorValue === initialQueryEditorValue">
        Save & run
      </button>
      <button class="btn btn-flat" @click="cancelEdit">Cancel</button>
    </div>
    <div v-if="state === 'approval-requested' && !editing" class="tool-permission">
      Do you want to run this query?
      <div class="tool-permission-buttons">
        <button class="btn btn-flat" @click="$emit('accept')">
          Yes
          <span class="material-symbols-outlined accept-icon"> check </span>
        </button>
        <button class="btn btn-flat" @click="$emit('reject')">
          No
          <span class="material-symbols-outlined reject-icon"> close </span>
        </button>
        <button
          class="btn btn-flat"
          @click="edit"
          :disabled="disableToolEdit"
          :title="disableToolEdit ? 'Editing disabled for multiple Run Query calls.' : ''"
        >
          Edit
          <span class="material-symbols-outlined reject-icon">
            edit_square
          </span>
        </button>
      </div>
    </div>
    <div class="tool-error error" v-if="error && error !== 'User rejected'" v-text="error" />
    <div class="tool-error error" v-else-if="(state === 'approval-responded' || state === 'output-error') && approval && !approval.approved">
      User rejected tool call
    </div>
    <div class="tool-result" v-else-if="state === 'output-available'">
      <run-query-result v-if="data" :data="data" />
    </div>
  </div>
</template>

<script lang="ts">
import type { PropType } from "vue";
import hljs from "highlight.js";
import { mapGetters } from "pinia";
import { useChatStore } from "@/stores/chat";
import RunQueryResult from "@/components/messages/tool/RunQueryResult.vue";
import { isErrorContent, parseErrorContent } from "@/utils";
import { clipboard, getColumns, openTab } from "@beekeeperstudio/plugin";
import type { ToolUIPart } from "@/types";

type RunQueryPart = Extract<ToolUIPart, { type: "tool-run_query" }>;

export default {
  name: "RunQueryTool",
  components: { RunQueryResult },
  props: {
    input: Object as PropType<RunQueryPart['input']>,
    state: {
      type: String as PropType<RunQueryPart["state"]>,
      required: true,
    },
    output: String as PropType<RunQueryPart['output']>,
    errorText: String as PropType<RunQueryPart['errorText']>,
    approval: Object as PropType<ToolUIPart["approval"]>,
    disableToolEdit: Boolean,
  },
  emits: ["accept", "reject"],
  data() {
    return {
      editing: false,
      initialQueryEditorValue: "",
      isQueryEditorFocused: false,
      queryEditorValue: "",
      copied: false,
      copyTimeout: null as NodeJS.Timeout | null,
    };
  },
  computed: {
    ...mapGetters(useChatStore, [
      "entities",
      "sqlOrCode",
      "queryOrCode",
      "connectionInfo",
      "supportOpenInQueryEditor",
    ]),
    queryHtml() {
      return hljs.highlight(this.input?.query ?? "", {
        language:
          this.connectionInfo.databaseType === "mongodb"
            ? "javascript"
            : "sql",
      }).value;
    },
    data() {
      if (this.state !== "output-available") {
        return null;
      }

      try {
        return JSON.parse(this.output ?? "");
      } catch (e) {
        return null;
      }
    },
    error() {
      if (
        this.state === "output-available" &&
        isErrorContent(this.output)
      ) {
        const err = parseErrorContent(this.output);
        return err.message ?? err;
      } else if (this.state === "output-error") {
        return this.errorText;
      }
    },
  },
  methods: {
    edit() {
      if (this.initialQueryEditorValue === "") {
        this.initialQueryEditorValue = this.input?.query ?? "";
      }
      this.queryEditorValue = this.initialQueryEditorValue;
      this.isQueryEditorFocused = true;
      this.editing = true;
    },
    saveEdit() {
      this.editing = false;
      this.$emit("reject", { editedQuery: this.queryEditorValue });
      this.initialQueryEditorValue = this.queryEditorValue;
    },
    cancelEdit() {
      this.editing = false;
      this.initialQueryEditorValue = this.queryEditorValue;
    },
    openInQueryTab() {
      openTab("query", { query: this.input?.query || "" });
    },
    copy() {
      clipboard.writeText(this.input?.query || "");
      this.copied = true;
      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
      }
      this.copyTimeout = setTimeout(
        () => this.copied = false,
        1000,
      );
    },
    handleQueryEditorInitialized(event: CustomEvent<{ editor: { view: any; focus: () => void } }>) {
      this.$nextTick(() => {
        event.detail.editor.view.dispatch({
          selection: {
            // Sets the cursor to the end
            anchor: event.detail.editor.view.state.doc.length,
          },
        });
        event.detail.editor.focus();
      });
    },
    async columnsGetter(entityName: string) {
      const info = entityName.split(".");
      let table = info[0] ?? "";
      let schema: string | undefined = undefined;
      if (info.length === 2) {
        schema = info[0];
        table = info[1] ?? "";
      }
      return getColumns(table, schema)
        .then((columns) => columns.map((c) => c.name));
    },
  },
};
</script>

<style scoped>
.tool-input-edit-actions {
  display: flex;
  gap: 1rem;
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
}

bks-sql-text-editor {
  display: block;
  padding-top: 0.25rem;
  padding-bottom: 0.5rem;
}

.tool-permission {
  margin-top: 0.5rem;
}

.tool-error {
  margin-top: 0.5rem;
}

.run-query-tool:not([state="output-available"]) .tool-input {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.tool-input .query-editor-focused {
  outline: 1px solid var(--focus-visible-outline-color);
}

.generating-label {
  padding-block: 0.25rem;
  padding-inline: 0.5rem;
  font-family: var(--font-family-mono, monospace);
  font-style: italic;
  color: var(--text-light);
  user-select: none;

  .dots::after {
    content: "..";
    animation: twoDots 1s steps(2, end) infinite;
  }
}

@keyframes twoDots {
  0% {
    content: "..";
  }

  50% {
    content: "...";
  }

  100% {
    content: "..";
  }
}
</style>
