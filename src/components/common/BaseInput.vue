<template>
  <div class="base-input" :class="[className, type]">
    <label :for="id" v-if="$slots['label']">
      <slot name="label"></slot>
    </label>
    <div class="input-wrapper" :data-value="modelValue">
      <textarea v-if="type === 'textarea'" v-bind="$attrs" :id="id" :placeholder="placeholder" :value="modelValue" @input="emitInput"
        @change="emitChange" />
      <input v-else :type="type" v-bind="$attrs" :id="id" :placeholder="placeholder" :value="modelValue" @input="emitInput"
        @change="emitChange" />
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
    className: {
      type: String,
      default: "",
    },
    id: {
      type: String,
      default: () => _.uniqueId("input-"),
    },
    type: String as PropType<HTMLInputElement["type"]> | "textarea",
    placeholder: String,
    /** We add this to support v-model */
    modelValue: String,
  },

  emits: ["update:modelValue", "input", "change"],

  methods: {
    emitInput(event: Event) {
      this.$emit("input", event);
      this.$emit("update:modelValue", (event.target as HTMLInputElement).value);
    },
    emitChange(event: Event) {
      this.$emit("change", event);
    },
  },
};
</script>
