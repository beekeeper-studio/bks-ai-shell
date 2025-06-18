<template>
  <div class="human">
    {{ message.text }}
  </div>
</template>

<script lang="ts">
import { PropType } from "vue";
import { HumanMessage } from "@langchain/core/messages";
export default {
  props: {
    message: {
      type: Object as PropType<HumanMessage>,
      required: true,
    },
  },
};
</script>
