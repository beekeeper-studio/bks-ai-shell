<template>
  <div class="run-query-args">
    <div class="header">
      <span class="hint">sql</span>
      <button class="btn copy-btn">
        <span class="material-symbols-outlined">content_copy</span>
        <span class="copy-label">Copy</span>
        <span class="copied-label">Copied</span>
      </button>
    </div>
    <bks-sql-text-editor
      :class="{ 'read-only': !askingPermission }"
      :value="args.query"
      :readOnly="!askingPermission"
      @bks-value-change="handleValueChange"
    />
  </div>
</template>

<script lang="ts">
import { PropType } from "vue";
import type { RunQueryParams } from "@/tools";
import type { TextEditorValueChangeEvent } from "@beekeeperstudio/ui-kit";

export default {
  props: {
    args: {
      type: Object as PropType<RunQueryParams>,
      required: true,
    },
    askingPermission: Boolean,
  },

  emits: ["change"],

  methods: {
    handleValueChange(event: TextEditorValueChangeEvent) {
      const value = event.detail.value;
      const args: RunQueryParams = {
        ...this.args,
        query: value,
      };
      this.$emit("change", args);
    },
  },
};
</script>
