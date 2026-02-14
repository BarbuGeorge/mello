<template>
  <div :class="col.customClass || 'column'">
    <ParsedContentItem
      v-for="childBlock in col.Content"
      :key="childBlock.id"
      :block="childBlock"
    />
  </div>
</template>
<script setup lang="ts">
defineProps<{ col: any }>()
</script>