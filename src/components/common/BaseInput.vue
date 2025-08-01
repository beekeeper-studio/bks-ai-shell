<template>
  <div class="base-input" :class="class">
    <label :for="id" v-if="$slots['label']">
      <slot name="label"></slot>
    </label>
    <div class="input-wrapper">
      <input :type="type" :id="id" :placeholder="placeholder" :value="modelValue" @input="emitInput" />
      <div class="helper" v-if="$slots['helper']">
        <slot name="helper"></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { PropType } from "vue";
import _ from "lodash";

export default {
  name: "BaseInput",

  props: {
    class: {
      type: String,
      default: "",
    },
    id: {
      type: String,
      default: () => _.uniqueId("input-"),
    },
    type: String as PropType<HTMLInputElement["type"]>,
    placeholder: String,
    /** We add this to support v-model */
    modelValue: String,
  },

  emits: ["update:modelValue", "input"],

  methods: {
    emitInput(event: Event) {
      this.$emit("input", event);
      this.$emit("update:modelValue", (event.target as HTMLInputElement).value);
    },
  },
};
</script>
