<template>
  <div class="key-value-row">
    <BaseInput :model-value="keyInput" @update:modelValue="(val) => $emit('update:keyInput', val)">
      <template #label>Key</template>
    </BaseInput>
    <BaseInput :model-value="valueInput" @update:modelValue="(val) => $emit('update:valueInput', val)">
      <template #label>Value</template>
    </BaseInput>
  </div>
</template>

<script lang="ts">
import BaseInput from "./BaseInput.vue";

export default {
  name: "KeyValueRow",

  components: {
    BaseInput,
  },

  props: {
    keyInput: {
      type: String,
      required: true,
    },
    valueInput: {
      type: String,
      required: true,
    },
  },

  emits: ["update:keyInput", "update:valueInput"],
};
</script>
