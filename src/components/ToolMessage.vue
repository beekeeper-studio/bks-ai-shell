<template>
  <details>
    <summary>
      <template v-if="data.error"> Error encountered </template>
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
        <template v-else-if="message.name === 'run_query'">
          Query returned {{ data.results.length }} result{{
            data.results.length > 1 ? "s" : ""
          }}
          <button
            class="btn"
            v-for="(result, index) in data.results"
            :key="index"
            @click="$emit('result-click', result)"
          >
            <div class="label">
              Result{{ data.results.length > 1 ? ` ${index + 1}` : `` }}
            </div>
            <span class="material-symbols-outlined open-icon">
              keyboard_double_arrow_down
            </span>
          </button>
        </template>
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

export default {
  components: { Message },
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
