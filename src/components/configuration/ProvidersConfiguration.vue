<template>
  <h2>API Keys</h2>
  <ApiInfo />
  <api-key-form />
</template>

<script lang="ts">
import ApiKeyForm from "@/components/ApiKeyForm.vue";
import ApiInfo from "@/components/configuration/ApiInfo.vue";

export default {
  name: "ProvidersConfiguration",

  components: {
    ApiKeyForm,
    ApiInfo,
  },
};
</script>
