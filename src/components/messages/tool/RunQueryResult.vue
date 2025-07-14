<template>
  <div class="run-query-result">
    <span>
      Query returned {{ rows.length }} {{ $pluralize('row', rows.length) }}
    </span>
    <div class="preview-table-container" v-if="rows.length > 0">
      <table class="preview-table">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column">
              {{ column }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in limitedRows" :key="index">
            <td
              v-for="column in columns"
              :key="column"
              :class="{
                'null-cell': row[column] === null,
                'empty-cell': row[column] === '',
              }"
            >
              <template v-if="row[column] === ''">(EMPTY)</template>
              <template v-else-if="row[column] === null">(NULL)</template>
              <template v-else>{{ row[column] }}</template>
            </td>
          </tr>
          <tr v-if="remainingRows > 0" class="remaining-rows">
            <td :colspan="columns.length">
              ... {{ remainingRows }} more {{ $pluralize('row', remainingRows) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <button
      class="btn view-more-btn"
      @click.prevent="handleViewMoreClick"
    >
      <div class="label">View more</div>
      <span class="material-symbols-outlined open-icon">
        keyboard_double_arrow_down
      </span>
    </button>
  </div>
</template>

<script lang="ts">
import { PropType } from "vue";
import { RunQueryResponse } from "@beekeeperstudio/plugin";

const TABLE_MAX_ROWS = 5;

export default {
  props: {
    data: {
      type: Object as PropType<RunQueryResponse['result']>,
      required: true,
    },
  },
  computed: {
    columns() {
      return this.data.results[0].fields.map((field) => field.name);
    },
    rows() {
      return this.data.results[0].rows;
    },
    limitedRows() {
      return this.rows.slice(0, TABLE_MAX_ROWS);
    },
    remainingRows() {
      return Math.max(0, this.rows.length - TABLE_MAX_ROWS);
    },
  },

  methods: {
    handleViewMoreClick() {
      this.trigger("showResultTable", this.data.results)
    },
  },
};
</script>
