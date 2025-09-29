<template>
  <div class="switch">
    <label :for="id" v-if="$slots['label']">
      <slot name="label"></slot>
    </label>
    <button type="button" :id="id" :disabled="disabled" class="switch-control" role="switch" :aria-checked="modelValue"
      @click="handleClick">
      <span class="slider round"></span>
    </button>
  </div>
</template>

<script lang="ts">
/**
 * Example:
 *
 * ```html
 * <Switch />
 * <Switch v-model="modelValue" />
 * <Switch @change="handleSwitchChange" />
 * <Switch>
 *   <template #label>Put label here</template>
 * </Switch>
 * ```
 */

import _ from "lodash";

export default {
  name: "Switch",

  props: {
    id: {
      type: String,
      default: () => {
        return _.uniqueId("switch-");
      },
    },
    modelValue: {
      type: Boolean,
      default: false,
    },
    disabled: Boolean,
  },

  emits: ["update:modelValue", "change"],

  methods: {
    handleClick() {
      this.$emit("update:modelValue", !this.modelValue);
      this.$emit("change", !this.modelValue);
    },
  },
};
</script>
