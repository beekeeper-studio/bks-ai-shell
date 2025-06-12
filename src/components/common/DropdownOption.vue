<template>
  <button
    class="dropdown-option"
    :class="{ selected, disabled }"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot>{{ text }}</slot>
  </button>
</template>

<script lang="ts">
export default {
  name: "DropdownOption",
  props: {
    value: {
      type: [String, Number, Object],
      default: null,
    },
    text: {
      type: String,
      default: "",
    },
    selected: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    handleClick() {
      if (!this.disabled) {
        this.$emit('select', this.value);
      }
    },
  },
};
</script>

