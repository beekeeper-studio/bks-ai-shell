<template>
  <div class="key-value-list-input">
    <div class="key-value-list-item" v-for="(item, index) in items" :key="index">
      <KeyValueRow v-model:key-input="item.key" v-model:value-input="item.value" />
      <div class="actions">
        <button class="remove" v-if="items.length > 1" @click="removeItem(index)">
          <span class="material-symbols-outlined">remove</span>
        </button>
        <button class="add" @click="addItem" :style="{ visibility: index === 0 ? 'visible' : 'hidden' }">
          <span class="material-symbols-outlined">add</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import KeyValueRow from "@/components/common/KeyValueRow.vue";
import _ from "lodash";
import { PropType } from "vue";

export default {
  name: "KeyValueListInput",

  components: {
    KeyValueRow,
  },

  props: {
    modelValue: {
      type: Array as PropType<{ key: string; value: string }[]>,
      required: true,
    },
  },

  emits: ["update:modelValue"],

  data() {
    return {
      items: this.modelValue,
    };
  },

  watch: {
    items: {
      handler(val) {
        this.$emit("update:modelValue", _.cloneDeep(val));
      },
      deep: true,
    },
  },

  methods: {
    addItem() {
      this.items.push({ key: "", value: "" });
    },
    removeItem(index) {
      this.items.splice(index, 1);
    },
  },
};
</script>
