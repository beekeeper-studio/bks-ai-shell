<template>
  <div class="form-group" :class="[className, type]">
    <label :for="id" v-if="$slots['label']">
      <slot name="label"></slot>
    </label>
    <p
      class="helper"
      data-position="before-input"
      v-if="$slots['helper'] && helperPosition === 'before-input'"
    >
      <slot name="helper"></slot>
    </p>
    <div class="input-wrapper">
      <textarea
        v-if="type === 'textarea'"
        v-bind="$attrs"
        :id="id"
        :disabled="disabled"
        :placeholder="placeholder"
        :value="modelValue"
        @input="emitInput"
        @change="emitChange"
        ref="focusable"
      />
      <button
        v-else-if="type === 'switch'"
        type="button"
        v-bind="$attrs"
        :id="id"
        :disabled="disabled"
        role="switch"
        :aria-checked="modelValue"
        @click="handleClick"
        ref="focusable"
      >
        <span class="slider round"></span>
      </button>
      <input
        v-else
        :type="type"
        v-bind="$attrs"
        :id="id"
        :disabled="disabled"
        :placeholder="placeholder"
        :value="modelValue"
        @input="emitInput"
        @change="emitChange"
        ref="focusable"
      />
    </div>
    <p
      class="helper"
      data-position="after-input"
      v-if="$slots['helper'] && helperPosition === 'after-input'"
    >
      <slot name="helper"></slot>
    </p>
    <div class="actions" v-if="showActions">
      <button class="btn btn-small btn-flat" @click="$emit('discard')">
        Discard
      </button>
      <button class="btn btn-small btn-primary" @click="$emit('save')">
        Save
      </button>
    </div>
  </div>
</template>

<script lang="ts">
/** A generic input/textarea component. Autoresize is enabled by default
for textarea. */
import { PropType } from "vue";
import _ from "lodash";

export default {
  name: "BaseInput",

  props: {
    className: {
      type: String,
      default: "",
    },
    id: {
      type: String,
      default: () => _.uniqueId("input-"),
    },
    type: String as PropType<HTMLInputElement["type"] | "textarea" | "switch">,
    placeholder: String,
    /** We add this to support v-model */
    modelValue: [String, Boolean],
    disabled: Boolean,
    helperPosition: {
      type: String as PropType<"before-input" | "after-input">,
      default: "after-input",
    },
    /** If `showActions`, we'll show save and discard buttons. */
    showActions: Boolean,
  },

  emits: ["update:modelValue", "input", "change", "click", "save", "discard"],

  // FIXME: Strip this out for now cause vue-tsc isn't happy
  // See https://github.com/vuejs/language-tools/issues/5069
  // expose: ["focus"],

  methods: {
    emitInput(event: Event) {
      this.$emit("input", event);
      this.$emit("update:modelValue", (event.target as HTMLInputElement).value);
    },
    emitChange(event: Event) {
      this.$emit("change", event);
    },
    handleClick(event: MouseEvent) {
      this.$emit("click", event);
    },
    focus() {
      if (this.$refs.focusable) {
        (this.$refs.focusable as HTMLElement).focus();
      }
    },
  },
};
</script>

<style scoped>
[data-position="before-input"] {
  margin-bottom: 0.5rem;
}

.form-group:not(.switch) [data-position="after-input"] {
  margin-top: 0.35rem;
}

.actions {
  display: flex;
  align-items: center;
  padding-top: 0.5rem;
  gap: 0.5rem;
}

label :deep(.material-symbols-outlined) {
  padding-left: 0.25em;
  font-size: 1em;
}

.input-wrapper {
  position: relative;
}
</style>
