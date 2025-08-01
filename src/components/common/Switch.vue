<template>
  <div class="switch">
    <input type="checkbox" v-model="isChecked" @change="handleChange" :id="id" :disabled="disabled" />
    <span class="slider round"></span>
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
 * <label>
 *   Enable notifications
 *   <Switch />
 * </label>
 * ```
 */

import _ from "lodash";

export default {
  name: "Switch",

  data() {
    return {
      isChecked: false,
    };
  },

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

  watch: {
    modelValue: {
      handler(newValue) {
        this.isChecked = newValue;
      },
      immediate: true,
    },
  },

  methods: {
    handleChange() {
      this.$emit("update:modelValue", this.isChecked);
      this.$emit("change", this.isChecked);
    },
  },
};
</script>
