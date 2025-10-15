<template>
  <div class="base-input" :class="[className, type]">
    <label :for="id" v-if="$slots['label']">
      <slot name="label"></slot>
    </label>
    <div class="input-wrapper" :data-value="type === 'textarea' ? modelValue : ''">
      <textarea v-if="type === 'textarea'" v-bind="$attrs" :id="id" :disabled="disabled" :placeholder="placeholder"
        :value="modelValue" @input="emitInput" @change="emitChange" />
      <button v-else-if="type === 'switch'" type="button" v-bind="$attrs" :id="id" :disabled="disabled" role="switch"
        :aria-checked="modelValue" @click="handleClick">
        <span class="slider round"></span>
      </button>
      <input v-else :type="type" v-bind="$attrs" :id="id" :disabled="disabled" :placeholder="placeholder"
        :value="modelValue" @input="emitInput" @change="emitChange" />
    </div>
    <div class="helper" v-if="$slots['helper']">
      <slot name="helper"></slot>
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
    type: String as PropType<HTMLInputElement["type"]> | "textarea" | "switch",
    placeholder: String,
    /** We add this to support v-model */
    modelValue: [String, Number, Boolean],
    disabled: Boolean,
  },

  emits: ["update:modelValue", "input", "change", "click"],

  methods: {
    validate(event: Event) {
      if (this.type === "number") {
        const target = event.target as HTMLInputElement;
        if (target.min) {
          target.value = Math.max(
            Number(target.min),
            Number(target.value),
          ).toString();
        }
      }
    },
    emitInput(event: Event) {
      this.validate(event);
      this.$emit("input", event);
      this.$emit("update:modelValue", (event.target as HTMLInputElement).value);
    },
    emitChange(event: Event) {
      this.$emit("change", event);
    },
    handleClick(event: MouseEvent) {
      this.$emit("click", event);
    },
  },
};
</script>
