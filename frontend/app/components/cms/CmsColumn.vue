<script setup>
defineProps({
  column: Object
})
</script>

<template>
  <div class="cms-column">
    <CmsBlock
      v-for="(block, i) in column.blocks"
      :key="i"
      :block="block"
    />
  </div>
</template>
