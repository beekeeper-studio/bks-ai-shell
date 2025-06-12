<template>
  <details>
    <summary :class="message.status">
      <template v-if="message.status === 'error'">
        {{ message.text }}
      </template>
      <template v-else>
        <template v-if="message.name === 'get_connection_info'">
          {{ data.connectionType }}
        </template>
        <template v-if="message.name === 'get_tables'">
          {{ data.length }} table{{ data.length > 1 ? "s" : "" }} (
          <code>{{
            truncateAtWord(data.map((t) => t.name).join(", "), 50)
          }}</code>
          )
        </template>
        <template v-if="message.name === 'get_columns'">
          {{ data.length }} column{{ data.length > 1 ? "s" : "" }} (
          <code>
            {{ truncateAtWord(data.map((c) => c.name).join(", "), 50) }}
          </code>
          )
        </template>
        <template v-else-if="message.name === 'get_all_tabs'">
          {{ data.length }} tab{{ data.length > 1 ? "s" : "" }}
        </template>
        <run-query-message
          v-else-if="message.name === 'run_query'"
          :data="data"
          @result-click="$emit('result-click', $event)"
        />
      </template>
    </summary>
    <message v-if="content" :content="content" />
  </details>
</template>

<script lang="ts">
import Message from "./Message.vue";
import { ToolMessage } from "@langchain/core/messages";
import { PropType } from "vue";
import { safeJSONStringify } from "../utils";
import RunQueryMessage from "./toolMessage/RunQueryMessage.vue";

export default {
  components: { Message, RunQueryMessage },
  props: {
    message: {
      type: Object as PropType<ToolMessage>,
      required: true,
    },
  },
  computed: {
    content() {
      if (this.data) {
        let str = "";

        try {
          str = safeJSONStringify(this.data, null, 2);
        } catch (e) {
          // do nothing
        }

        return "```json\n" + str + "\n```";
      }

      return "";
    },
    data() {
      try {
        return JSON.parse(this.message.text);
      } catch (e) {
        return null;
      }
    },
  },
  methods: {
    truncateAtWord(str, maxLength) {
      if (str.length <= maxLength) return str;
      return str.slice(0, str.lastIndexOf(" ", maxLength)) + "…";
    },
  },
};
</script>
